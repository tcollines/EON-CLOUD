using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace EonDesktop.Core
{
    public class LruCacheManager
    {
        private readonly string _cacheDirectory;
        private readonly string _dbPath;
        private readonly long _maxCacheSizeBytes;

        public LruCacheManager(string cacheDirectory, long maxCacheSizeBytes = 50L * 1024 * 1024 * 1024) // Default 50GB
        {
            _cacheDirectory = cacheDirectory;
            _maxCacheSizeBytes = maxCacheSizeBytes;
            _dbPath = Path.Combine(_cacheDirectory, "cache.db");

            if (!Directory.Exists(_cacheDirectory))
            {
                Directory.CreateDirectory(_cacheDirectory);
                
                // Hide the directory on Windows
                var di = new DirectoryInfo(_cacheDirectory);
                di.Attributes |= FileAttributes.Hidden;
            }

            InitializeDatabase();
        }

        private void InitializeDatabase()
        {
            using var connection = new SqliteConnection($"Data Source={_dbPath}");
            connection.Open();

            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS chunks (
                    hash TEXT PRIMARY KEY,
                    size INTEGER NOT NULL,
                    last_accessed DATETIME NOT NULL
                );
            ";
            command.ExecuteNonQuery();
        }

        public async Task<byte[]> GetChunkAsync(string hash)
        {
            var chunkPath = Path.Combine(_cacheDirectory, hash);
            if (!File.Exists(chunkPath)) return null;

            // Update last accessed time
            using var connection = new SqliteConnection($"Data Source={_dbPath}");
            await connection.OpenAsync();

            var command = connection.CreateCommand();
            command.CommandText = "UPDATE chunks SET last_accessed = @time WHERE hash = @hash";
            command.Parameters.AddWithValue("@time", DateTime.UtcNow);
            command.Parameters.AddWithValue("@hash", hash);
            await command.ExecuteNonQueryAsync();

            return await File.ReadAllBytesAsync(chunkPath);
        }

        public async Task PutChunkAsync(string hash, byte[] data)
        {
            var chunkPath = Path.Combine(_cacheDirectory, hash);
            await File.WriteAllBytesAsync(chunkPath, data);

            using var connection = new SqliteConnection($"Data Source={_dbPath}");
            await connection.OpenAsync();

            var command = connection.CreateCommand();
            command.CommandText = @"
                INSERT INTO chunks (hash, size, last_accessed) 
                VALUES (@hash, @size, @time)
                ON CONFLICT(hash) DO UPDATE SET last_accessed = @time;
            ";
            command.Parameters.AddWithValue("@hash", hash);
            command.Parameters.AddWithValue("@size", data.Length);
            command.Parameters.AddWithValue("@time", DateTime.UtcNow);
            await command.ExecuteNonQueryAsync();

            await EvictIfNeededAsync();
        }

        private async Task EvictIfNeededAsync()
        {
            using var connection = new SqliteConnection($"Data Source={_dbPath}");
            await connection.OpenAsync();

            // Check total size
            var sizeCmd = connection.CreateCommand();
            sizeCmd.CommandText = "SELECT SUM(size) FROM chunks";
            var result = await sizeCmd.ExecuteScalarAsync();
            
            long totalSize = result != DBNull.Value ? Convert.ToInt64(result) : 0;

            if (totalSize <= _maxCacheSizeBytes) return;

            // Need to evict
            Console.WriteLine($"[Cache] Total size {totalSize} exceeds limit {_maxCacheSizeBytes}. Evicting...");

            var evictCmd = connection.CreateCommand();
            // Get oldest chunks
            evictCmd.CommandText = "SELECT hash, size FROM chunks ORDER BY last_accessed ASC";
            
            using var reader = await evictCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync() && totalSize > _maxCacheSizeBytes)
            {
                var hash = reader.GetString(0);
                var size = reader.GetInt64(1);

                // Delete file
                var chunkPath = Path.Combine(_cacheDirectory, hash);
                if (File.Exists(chunkPath))
                {
                    File.Delete(chunkPath);
                }

                // Remove from DB (using a separate connection to avoid locking issues)
                using var delConnection = new SqliteConnection($"Data Source={_dbPath}");
                await delConnection.OpenAsync();
                var delCmd = delConnection.CreateCommand();
                delCmd.CommandText = "DELETE FROM chunks WHERE hash = @hash";
                delCmd.Parameters.AddWithValue("@hash", hash);
                await delCmd.ExecuteNonQueryAsync();

                totalSize -= size;
                Console.WriteLine($"[Cache] Evicted chunk {hash} ({size} bytes)");
            }
        }
    }
}
