using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace EonDesktop
{
    public class LoginRequest
    {
        [JsonPropertyName("email")] public string Email { get; set; }
        [JsonPropertyName("password")] public string Password { get; set; }
        [JsonPropertyName("device")] public string Device { get; set; }
        [JsonPropertyName("os_type")] public string OsType { get; set; }
    }

    public class LoginResponse
    {
        [JsonPropertyName("token")] public string Token { get; set; }
        [JsonPropertyName("user_id")] public string UserId { get; set; }
        [JsonPropertyName("device_id")] public string DeviceId { get; set; }
    }

    public class FileItem
    {
        [JsonPropertyName("id")] public string Id { get; set; }
        [JsonPropertyName("name")] public string Name { get; set; }
        [JsonPropertyName("size")] public long Size { get; set; }
        [JsonPropertyName("status")] public string Status { get; set; }
        [JsonPropertyName("created_at")] public string CreatedAt { get; set; }
        
        [JsonIgnore] public string LocalPath { get; set; }
    }

    public class FileListResponse
    {
        [JsonPropertyName("files")] public List<FileItem> Files { get; set; }
    }

    public class ApiClient
    {
        private readonly HttpClient _http;
        private string _token;

        public ApiClient(string baseUrl)
        {
            _http = new HttpClient { BaseAddress = new Uri(baseUrl) };
            _token = Core.AuthManager.LoadToken();
        }

        public bool IsLoggedIn => !string.IsNullOrEmpty(_token);
        public string Token => _token;

        public async Task<string> SetTokenAsync(string token)
        {
            var oldToken = _token;
            _token = token;
            
            try 
            {
                // Validate token by fetching files
                await GetFilesAsync();
                Core.AuthManager.SaveToken(_token);
                return _token;
            } 
            catch (Exception) 
            {
                _token = oldToken; // rollback
                throw new UnauthorizedAccessException("Invalid token.");
            }
        }

        public void Logout()
        {
            _token = null;
            Core.AuthManager.ClearToken();
        }

        public async Task<List<FileItem>> GetFilesAsync()
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");
            
            var request = new HttpRequestMessage(HttpMethod.Get, "files");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonString = await response.Content.ReadAsStringAsync();
            var res = JsonSerializer.Deserialize<FileListResponse>(jsonString);
            return res.Files ?? new List<FileItem>();
        }

        public class CreateSessionRequest
        {
            [JsonPropertyName("name")] public string Name { get; set; }
            [JsonPropertyName("size")] public long Size { get; set; }
            [JsonPropertyName("checksum")] public string Checksum { get; set; }
        }

        public class CreateSessionResponse
        {
            [JsonPropertyName("session_id")] public string SessionId { get; set; }
        }

        public async Task<string> CreateFileSessionAsync(string name, long size)
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");

            var req = new CreateSessionRequest { Name = name, Size = size, Checksum = "" };
            var content = new StringContent(JsonSerializer.Serialize(req), Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "files") { Content = content };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonString = await response.Content.ReadAsStringAsync();
            var res = JsonSerializer.Deserialize<CreateSessionResponse>(jsonString);
            return res.SessionId;
        }

        public async Task UploadChunkAsync(string sessionId, int chunkIndex, byte[] data)
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");

            var content = new ByteArrayContent(data);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

            var request = new HttpRequestMessage(HttpMethod.Post, $"uploads/{sessionId}/chunks/{chunkIndex}") { Content = content };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
        }

        public async Task CommitSessionAsync(string sessionId)
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");

            var request = new HttpRequestMessage(HttpMethod.Post, $"uploads/{sessionId}/commit");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
        }

        public async Task DeleteFileAsync(string fileId)
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");

            var request = new HttpRequestMessage(HttpMethod.Delete, $"files/{fileId}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
        }

        public async Task DownloadFileAsync(string fileId, string destinationPath)
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");

            var request = new HttpRequestMessage(HttpMethod.Get, $"files/{fileId}/download");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            using var stream = await response.Content.ReadAsStreamAsync();
            using var fileStream = new System.IO.FileStream(destinationPath, System.IO.FileMode.Create, System.IO.FileAccess.Write, System.IO.FileShare.None);
            await stream.CopyToAsync(fileStream);
        }
        public async Task RenameFileAsync(string fileId, string newName)
        {
            if (string.IsNullOrEmpty(_token)) throw new UnauthorizedAccessException("Not logged in");

            var request = new HttpRequestMessage(HttpMethod.Put, $"files/{fileId}/rename");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            
            var payload = new { name = newName };
            request.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();
        }
    }
}
