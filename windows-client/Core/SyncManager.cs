using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace EonDesktop.Core
{
    public class SyncEvent
    {
        public string EventType { get; set; }
        public string EntityId { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class SyncManager
    {
        private readonly string _wsUrl;
        private string _token;
        private readonly LruCacheManager _cacheManager;
        private readonly HttpClient _httpClient;
        
        private ClientWebSocket _webSocket;
        private CancellationTokenSource _cts;
        private readonly ConcurrentQueue<UploadTask> _uploadQueue;

        public event Action<SyncEvent> OnSyncEventReceived;
        
        private const int ChunkSize = 4 * 1024 * 1024; // 4MB

        public SyncManager(string wsUrl, string apiUrl, string token, LruCacheManager cacheManager)
        {
            _wsUrl = wsUrl;
            _token = token;
            _cacheManager = cacheManager;
            _uploadQueue = new ConcurrentQueue<UploadTask>();
            
            _httpClient = new HttpClient { BaseAddress = new Uri(apiUrl) };
            if (!string.IsNullOrEmpty(token))
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }
        }

        public void UpdateToken(string token)
        {
            _token = token;
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task StartAsync()
        {
            _cts = new CancellationTokenSource();
            _webSocket = new ClientWebSocket();
            
            // Start the background chunk uploader (SeaweedFS style async flush)
            _ = Task.Run(() => ProcessUploadQueueAsync(_cts.Token));
            
            // Connect to WebSocket with token
            var uri = new Uri($"{_wsUrl}?token={_token}");
            try 
            {
                await _webSocket.ConnectAsync(uri, _cts.Token);
                Console.WriteLine("[SyncManager] Connected to Real-time Sync Server");
                _ = ReceiveLoopAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncManager] Failed to connect WebSocket: {ex.Message}");
            }
        }

        public async Task StopAsync()
        {
            if (_cts != null)
            {
                _cts.Cancel();
            }
            if (_webSocket != null && _webSocket.State == WebSocketState.Open)
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client shutting down", CancellationToken.None);
            }
        }

        // --- BACKGROUND CHUNK SYNC LOGIC ---

        public async Task<string> QueueFileForUploadAsync(string localFilePath, string targetFileName)
        {
            Console.WriteLine($"[Sync] Queuing {targetFileName} for upload...");
            
            var fileInfo = new FileInfo(localFilePath);
            
            // 1. Create upload session via API
            var sessionData = new { name = targetFileName, size = fileInfo.Length };
            var content = new StringContent(JsonSerializer.Serialize(sessionData), Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync("files", content);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception("Failed to create file session");
            }
            
            var resultString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(resultString);
            var sessionId = doc.RootElement.GetProperty("session_id").GetString();
            var fileId = doc.RootElement.GetProperty("file_id").GetString();
            
            // 2. Chunk, Hash, Cache locally, and Queue
            using var fs = new FileStream(localFilePath, FileMode.Open, FileAccess.Read);
            byte[] buffer = new byte[ChunkSize];
            int chunkIndex = 0;
            int bytesRead;

            using var sha256 = SHA256.Create();

            while ((bytesRead = await fs.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                byte[] chunkData = new byte[bytesRead];
                Array.Copy(buffer, chunkData, bytesRead);
                
                byte[] hashBytes = sha256.ComputeHash(chunkData);
                string chunkHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
                
                // Cache locally immediately (instant local completion)
                await _cacheManager.PutChunkAsync(chunkHash, chunkData);
                
                // Queue for upload
                _uploadQueue.Enqueue(new UploadTask 
                {
                    SessionId = sessionId,
                    ChunkIndex = chunkIndex,
                    ChunkHash = chunkHash,
                    Data = chunkData
                });
                
                chunkIndex++;
            }
            
            // Queue commit task
            _uploadQueue.Enqueue(new UploadTask 
            {
                SessionId = sessionId,
                IsCommit = true
            });
            
            Console.WriteLine($"[Sync] File {targetFileName} chunked and queued.");
            return fileId;
        }

        private async Task ProcessUploadQueueAsync(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                if (_uploadQueue.TryDequeue(out var task))
                {
                    try
                    {
                        if (task.IsCommit)
                        {
                            var response = await _httpClient.PostAsync($"uploads/{task.SessionId}/commit", null, token);
                            response.EnsureSuccessStatusCode();
                            Console.WriteLine($"[Sync] Committed upload session {task.SessionId}");
                        }
                        else
                        {
                            var content = new ByteArrayContent(task.Data);
                            content.Headers.Add("X-Chunk-Hash", task.ChunkHash);
                            
                            var response = await _httpClient.PostAsync($"uploads/{task.SessionId}/chunks/{task.ChunkIndex}", content, token);
                            response.EnsureSuccessStatusCode();
                            Console.WriteLine($"[Sync] Uploaded chunk {task.ChunkIndex} for session {task.SessionId}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Sync] Upload failed: {ex.Message}. Re-queuing...");
                        _uploadQueue.Enqueue(task); // Simple retry
                        await Task.Delay(2000, token);
                    }
                }
                else
                {
                    await Task.Delay(100, token); // Wait for new tasks
                }
            }
        }

        // --- WEBSOCKET LISTENER LOGIC ---

        private async Task ReceiveLoopAsync()
        {
            var buffer = new byte[1024 * 4];

            try
            {
                while (_webSocket.State == WebSocketState.Open && !_cts.Token.IsCancellationRequested)
                {
                    var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, string.Empty, CancellationToken.None);
                        Console.WriteLine("[SyncManager] Connection closed by server");
                        break;
                    }

                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    
                    try 
                    {
                        var syncEvent = JsonSerializer.Deserialize<SyncEvent>(message, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (syncEvent != null)
                        {
                            OnSyncEventReceived?.Invoke(syncEvent);
                        }
                    }
                    catch (JsonException)
                    {
                        Console.WriteLine($"[SyncManager] Invalid message received: {message}");
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncManager] Error in receive loop: {ex.Message}");
            }
        }

        private class UploadTask
        {
            public string SessionId { get; set; }
            public int ChunkIndex { get; set; }
            public string ChunkHash { get; set; }
            public byte[] Data { get; set; }
            public bool IsCommit { get; set; }
        }
    }
}
