using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.AccessControl;
using DokanNet;

namespace EonDesktop.Vfs
{
    public class EonDokanOperations : IDokanOperations
    {
        private readonly ApiClient _api;
        private readonly Core.SyncManager _syncManager;
        private List<FileItem> _cachedFiles = new List<FileItem>();
        private DateTime _lastCacheUpdate = DateTime.MinValue;
        private readonly object _cacheLock = new object();
        private Dictionary<string, string> _uploadingLocalPaths = new Dictionary<string, string>();

        public EonDokanOperations(ApiClient api, Core.SyncManager syncManager)
        {
            _api = api;
            _syncManager = syncManager;
        }

        private void RefreshCacheIfNeeded()
        {
            if ((DateTime.Now - _lastCacheUpdate).TotalSeconds > 10)
            {
                try
                {
                    _cachedFiles = _api.GetFilesAsync().GetAwaiter().GetResult();
                    _lastCacheUpdate = DateTime.Now;
                }
                catch
                {
                    // Ignore cache refresh failures
                }
            }
        }

        public class UploadContext
        {
            public string TempPath { get; set; }
            public FileStream Stream { get; set; }
            public string FileName { get; set; }
            public long TotalBytes { get; set; }
            public bool IsFinished { get; set; }
            public bool IsDeleted { get; set; }
        }

        public class DownloadContext
        {
            public string TempPath { get; set; }
            public FileStream Stream { get; set; }
            public bool IsDeleted { get; set; }
        }

        public NtStatus CreateFile(string fileName, DokanNet.FileAccess access, FileShare share, FileMode mode, FileOptions options, FileAttributes attributes, IDokanFileInfo info)
        {
            RefreshCacheIfNeeded();
            
            if (fileName == "\\")
            {
                info.IsDirectory = true;
                return DokanResult.Success;
            }

            var relativeName = fileName.TrimStart('\\').Replace('\\', '/');
            
            // Ignore Alternate Data Streams (prevents duplicate files like Zone.Identifier)
            if (relativeName.Contains(":"))
            {
                info.IsDirectory = false;
                info.Context = new object(); // Dummy context
                return DokanResult.Success;
            }

            var file = _cachedFiles.FirstOrDefault(f => f.Name == relativeName);

            if (file != null)
            {
                if (mode == FileMode.CreateNew) return DokanResult.FileExists;
                info.IsDirectory = false;

                if (mode == FileMode.Create || mode == FileMode.Truncate)
                {
                    var tempPath = Path.GetTempFileName();
                    var stream = new FileStream(tempPath, FileMode.Create, System.IO.FileAccess.ReadWrite, FileShare.ReadWrite);
                    info.Context = new UploadContext
                    {
                        TempPath = tempPath,
                        Stream = stream,
                        FileName = relativeName,
                        TotalBytes = 0,
                        IsFinished = false,
                        IsDeleted = false
                    };
                    return DokanResult.Success;
                }
                
                if (mode == FileMode.Open || mode == FileMode.OpenOrCreate)
                {
                    var cacheDir = Path.Combine(Path.GetTempPath(), "EonCache");
                    Directory.CreateDirectory(cacheDir);
                    var tempPath = Path.Combine(cacheDir, file.Id + ".tmp");
                    
                    try
                    {
                        if (!File.Exists(tempPath))
                        {
                            if (file.Status == "UPLOADING" || file.Status == "SYNCING")
                            {
                                if (_uploadingLocalPaths.TryGetValue(file.Name, out string localPath) && File.Exists(localPath))
                                {
                                    tempPath = localPath; // Use local copy while syncing
                                }
                                else
                                {
                                    return DokanResult.AccessDenied; // File not available yet
                                }
                            }
                            else
                            {
                                Console.WriteLine($"[VFS] Downloading {file.Name}...");
                                _api.DownloadFileAsync(file.Id, tempPath).GetAwaiter().GetResult();
                            }
                        }
                        
                        bool writeRequested = (access & DokanNet.FileAccess.WriteData) != 0 || 
                                              (access & DokanNet.FileAccess.AppendData) != 0 || 
                                              (access & DokanNet.FileAccess.GenericWrite) != 0;

                        if (writeRequested)
                        {
                            // We need to copy the cached file to a new temp file so we don't permanently corrupt the cache if it fails
                            var newTempPath = Path.GetTempFileName();
                            File.Copy(tempPath, newTempPath, true);
                            
                            var stream = new FileStream(newTempPath, FileMode.Open, System.IO.FileAccess.ReadWrite, FileShare.ReadWrite);
                            info.Context = new UploadContext 
                            { 
                                TempPath = newTempPath, 
                                Stream = stream, 
                                FileName = relativeName,
                                TotalBytes = new FileInfo(newTempPath).Length,
                                IsFinished = false,
                                IsDeleted = false
                            };
                        }
                        else
                        {
                            var stream = new FileStream(tempPath, FileMode.Open, System.IO.FileAccess.Read, FileShare.ReadWrite);
                            info.Context = new DownloadContext { TempPath = tempPath, Stream = stream, IsDeleted = false };
                        }
                    }
                    catch (Exception)
                    {
                        return DokanResult.AccessDenied;
                    }
                }
                
                return DokanResult.Success;
            }

            if (!info.IsDirectory && mode == FileMode.Open)
            {
                if (_virtualFolders.Any(vf => vf.Equals(relativeName, StringComparison.OrdinalIgnoreCase) || vf.StartsWith(relativeName + "/", StringComparison.OrdinalIgnoreCase)) ||
                    _cachedFiles.Any(f => f.Name.StartsWith(relativeName + "/", StringComparison.OrdinalIgnoreCase)))
                {
                    info.IsDirectory = true;
                    return DokanResult.Success;
                }
            }

            if (info.IsDirectory)
            {
                if (mode == FileMode.CreateNew || mode == FileMode.Create || mode == FileMode.OpenOrCreate)
                {
                    _virtualFolders.Add(relativeName);
                    
                    // Create a hidden .eonkeep file to persist the directory
                    System.Threading.Tasks.Task.Run(async () => {
                        try {
                            var tempKeepPath = Path.GetTempFileName();
                            System.IO.File.WriteAllBytes(tempKeepPath, new byte[0]);
                            string keepName = relativeName + "/.eonkeep";
                            await _syncManager.QueueFileForUploadAsync(tempKeepPath, keepName);
                        } catch { }
                    });

                    return DokanResult.Success;
                }
                if (mode == FileMode.Open)
                {
                    if (_virtualFolders.Any(vf => vf.Equals(relativeName, StringComparison.OrdinalIgnoreCase) || vf.StartsWith(relativeName + "/", StringComparison.OrdinalIgnoreCase)) ||
                        _cachedFiles.Any(f => f.Name.StartsWith(relativeName + "/", StringComparison.OrdinalIgnoreCase)))
                    {
                        return DokanResult.Success;
                    }
                    return DokanResult.FileNotFound;
                }
                return DokanResult.AccessDenied;
            }

            if (mode == FileMode.Open)
                return DokanResult.FileNotFound;

            if (mode == FileMode.CreateNew || mode == FileMode.Create || mode == FileMode.OpenOrCreate)
            {
                var tempPath = Path.GetTempFileName();
                var stream = new FileStream(tempPath, FileMode.Create, System.IO.FileAccess.ReadWrite, FileShare.ReadWrite);
                
                info.Context = new UploadContext
                {
                    TempPath = tempPath,
                    Stream = stream,
                    FileName = relativeName,
                    TotalBytes = 0,
                    IsFinished = false,
                    IsDeleted = false
                };
                
                return DokanResult.Success;
            }

            return DokanResult.AccessDenied;
        }

        private HashSet<string> _virtualFolders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public NtStatus GetFileInformation(string fileName, out FileInformation fileInfo, IDokanFileInfo info)
        {
            fileInfo = new FileInformation();
            
            if (info.Context is UploadContext ctx)
            {
                fileInfo.Attributes = FileAttributes.Normal;
                fileInfo.Length = ctx.TotalBytes;
                fileInfo.CreationTime = DateTime.Now;
                fileInfo.LastAccessTime = DateTime.Now;
                fileInfo.LastWriteTime = DateTime.Now;
                return DokanResult.Success;
            }

            if (fileName == "\\")
            {
                fileInfo.Attributes = FileAttributes.Directory;
                fileInfo.CreationTime = DateTime.Now;
                fileInfo.LastAccessTime = DateTime.Now;
                fileInfo.LastWriteTime = DateTime.Now;
                return DokanResult.Success;
            }

            var relativeName = fileName.TrimStart('\\').Replace('\\', '/');
            var file = _cachedFiles.FirstOrDefault(f => f.Name == relativeName);

            if (file != null)
            {
                fileInfo.Attributes = FileAttributes.Normal;
                fileInfo.Length = file.Size;
                fileInfo.CreationTime = DateTime.Parse(file.CreatedAt);
                fileInfo.LastAccessTime = fileInfo.CreationTime;
                fileInfo.LastWriteTime = fileInfo.CreationTime;
                return DokanResult.Success;
            }
            
            // Check if it is a directory
            if (_virtualFolders.Any(vf => vf.Equals(relativeName, StringComparison.OrdinalIgnoreCase) || vf.StartsWith(relativeName + "/", StringComparison.OrdinalIgnoreCase)) ||
                _cachedFiles.Any(f => f.Name.StartsWith(relativeName + "/", StringComparison.OrdinalIgnoreCase)))
            {
                fileInfo.Attributes = FileAttributes.Directory;
                fileInfo.CreationTime = DateTime.Now;
                fileInfo.LastAccessTime = DateTime.Now;
                fileInfo.LastWriteTime = DateTime.Now;
                return DokanResult.Success;
            }

            return DokanResult.FileNotFound;
        }

        public NtStatus FindFiles(string fileName, out IList<FileInformation> files, IDokanFileInfo info)
        {
            files = new List<FileInformation>();
            
            var relativePath = fileName == "\\" ? "" : fileName.TrimStart('\\').Replace('\\', '/') + "/";
            RefreshCacheIfNeeded();
            
            var addedItems = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            
            // Add files and derived directories
            foreach (var f in _cachedFiles)
            {
                if (string.IsNullOrEmpty(relativePath) || f.Name.StartsWith(relativePath, StringComparison.OrdinalIgnoreCase))
                {
                    string remainder = string.IsNullOrEmpty(relativePath) ? f.Name : f.Name.Substring(relativePath.Length);
                    int slashIndex = remainder.IndexOf('/');
                    if (slashIndex > 0)
                    {
                        string dirName = remainder.Substring(0, slashIndex);
                        if (addedItems.Add(dirName))
                        {
                            files.Add(new FileInformation { FileName = dirName, Attributes = FileAttributes.Directory, CreationTime = DateTime.Now, LastAccessTime = DateTime.Now, LastWriteTime = DateTime.Now });
                        }
                    }
                    else if (slashIndex == -1)
                    {
                        if (remainder.Equals(".eonkeep", StringComparison.OrdinalIgnoreCase)) continue;
                        
                        if (addedItems.Add(remainder))
                        {
                            files.Add(new FileInformation { FileName = remainder, Attributes = FileAttributes.Normal, Length = f.Size, CreationTime = DateTime.Parse(f.CreatedAt), LastAccessTime = DateTime.Parse(f.CreatedAt), LastWriteTime = DateTime.Parse(f.CreatedAt) });
                        }
                    }
                }
            }
            
            // Add virtual empty folders
            foreach (var vf in _virtualFolders)
            {
                if (string.IsNullOrEmpty(relativePath) || vf.StartsWith(relativePath, StringComparison.OrdinalIgnoreCase))
                {
                    string remainder = string.IsNullOrEmpty(relativePath) ? vf : vf.Substring(relativePath.Length);
                    if (string.IsNullOrEmpty(remainder)) continue;
                    int slashIndex = remainder.IndexOf('/');
                    string dirName = slashIndex > 0 ? remainder.Substring(0, slashIndex) : remainder;
                    if (addedItems.Add(dirName))
                    {
                        files.Add(new FileInformation { FileName = dirName, Attributes = FileAttributes.Directory, CreationTime = DateTime.Now, LastAccessTime = DateTime.Now, LastWriteTime = DateTime.Now });
                    }
                }
            }

            return DokanResult.Success;
        }

        public NtStatus FindFilesWithPattern(string fileName, string searchPattern, out IList<FileInformation> files, IDokanFileInfo info)
        {
            files = new List<FileInformation>();
            return DokanResult.NotImplemented;
        }

        public NtStatus ReadFile(string fileName, byte[] buffer, out int bytesRead, long offset, IDokanFileInfo info)
        {
            bytesRead = 0;
            if (info.Context is DownloadContext ctx && ctx.Stream != null)
            {
                ctx.Stream.Position = offset;
                bytesRead = ctx.Stream.Read(buffer, 0, buffer.Length);
                return DokanResult.Success;
            }
            return DokanResult.AccessDenied;
        }
        
        public void Cleanup(string fileName, IDokanFileInfo info)
        {
            if (info.Context is UploadContext upCtx)
            {
                upCtx.Stream?.Dispose();
                upCtx.Stream = null;
                if (upCtx.IsDeleted || info.DeletePending)
                {
                    try { File.Delete(upCtx.TempPath); } catch { }
                }
            }
            else if (info.Context is DownloadContext downCtx)
            {
                downCtx.Stream?.Dispose();
                downCtx.Stream = null;
                
                if (downCtx.IsDeleted || info.DeletePending)
                {
                    try { File.Delete(downCtx.TempPath); } catch { }
                    
                    var relativeName = fileName.TrimStart('\\').Replace('\\', '/');
                    var file = _cachedFiles.FirstOrDefault(f => f.Name == relativeName);
                    if (file != null)
                    {
                        try 
                        {
                            Console.WriteLine($"[VFS] Actual Deletion of {file.Name} via Cleanup...");
                            _api.DeleteFileAsync(file.Id).GetAwaiter().GetResult();
                            _cachedFiles.Remove(file); // Immediately remove from UI and folder
                        } 
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[VFS] Delete failed in Cleanup: {ex.Message}");
                        }
                    }
                }
            }
            if (info.IsDirectory && info.DeletePending)
            {
                var relativeName = fileName.TrimStart('\\').Replace('\\', '/');
                _virtualFolders.Remove(relativeName);

                var keepFile = _cachedFiles.FirstOrDefault(f => f.Name == relativeName + "/.eonkeep");
                if (keepFile != null)
                {
                    try {
                        _api.DeleteFileAsync(keepFile.Id).GetAwaiter().GetResult();
                        _cachedFiles.Remove(keepFile);
                    } catch { }
                }
            }
        }

        public void CloseFile(string fileName, IDokanFileInfo info)
        {
            if (info.Context is UploadContext ctx)
            {
                if (!ctx.IsDeleted && !ctx.IsFinished && ctx.TotalBytes >= 0)
                {
                    ctx.IsFinished = true;
                    
                    // Immediately inject into cache to prevent duplicates on rapid refresh
                    var placeholderId = Guid.NewGuid().ToString();
                    var placeholderItem = new FileItem {
                        Id = placeholderId,
                        Name = ctx.FileName,
                        Size = ctx.TotalBytes,
                        Status = "UPLOADING",
                        CreatedAt = DateTime.Now.ToString("o")
                    };
                    _cachedFiles.RemoveAll(f => f.Name == ctx.FileName); // Remove existing if overwriting
                    _cachedFiles.Add(placeholderItem);

                    // Cache locally using the placeholder ID so it can be opened instantly
                    var cacheDir = Path.Combine(Path.GetTempPath(), "EonCache");
                    Directory.CreateDirectory(cacheDir);
                    var fakeCachePath = Path.Combine(cacheDir, placeholderId + ".tmp");
                    try { File.Copy(ctx.TempPath, fakeCachePath, true); } catch { }
                    
                    _uploadingLocalPaths[ctx.FileName] = fakeCachePath;

                    // Kick off upload
                    System.Threading.Tasks.Task.Run(async () => {
                        try
                        {
                            string realFileId = await _syncManager.QueueFileForUploadAsync(ctx.TempPath, ctx.FileName);
                            
                            // Update placeholder with real ID
                            placeholderItem.Id = realFileId;
                            
                            // Copy to real ID path
                            var cachedDownloadPath = Path.Combine(cacheDir, realFileId + ".tmp");
                            try { File.Copy(ctx.TempPath, cachedDownloadPath, true); } catch { }
                            
                            _lastCacheUpdate = DateTime.MinValue; // Force refresh
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[VFS] Upload failed for {ctx.FileName}: {ex.Message}");
                        }
                        finally
                        {
                            try { File.Delete(ctx.TempPath); } catch { }
                            try { File.Delete(fakeCachePath); } catch { }
                        }
                    });
                }
            }
        }

        public NtStatus FlushFileBuffers(string fileName, IDokanFileInfo info)
        {
            if (info.Context is UploadContext ctx && ctx.Stream != null)
            {
                ctx.Stream.Flush();
            }
            return DokanResult.Success;
        }

        public NtStatus SetFileAttributes(string fileName, FileAttributes attributes, IDokanFileInfo info) => DokanResult.Success;
        public NtStatus SetFileTime(string fileName, DateTime? creationTime, DateTime? lastAccessTime, DateTime? lastWriteTime, IDokanFileInfo info) => DokanResult.Success;
        
        public NtStatus DeleteFile(string fileName, IDokanFileInfo info)
        {
            var relativeName = fileName.TrimStart('\\').Replace('\\', '/');
            if (relativeName.Contains(":")) return DokanResult.Success; // ADS delete

            if (info.Context is UploadContext ctx)
            {
                ctx.IsDeleted = true;
            }
            else if (info.Context is DownloadContext dctx)
            {
                dctx.IsDeleted = true;
            }

            var file = _cachedFiles.FirstOrDefault(f => f.Name == relativeName);
            if (file != null)
            {
                return DokanResult.Success; // Validates the file can be deleted
            }

            if (info.Context is UploadContext || info.Context is DownloadContext)
            {
                return DokanResult.Success;
            }

            return DokanResult.FileNotFound;
        }
        public NtStatus DeleteDirectory(string fileName, IDokanFileInfo info)
        {
            return DokanResult.Success;
        }
        public NtStatus MoveFile(string oldName, string newName, bool replace, IDokanFileInfo info)
        {
            var oldRelativeName = oldName.TrimStart('\\').Replace('\\', '/');
            var newRelativeName = newName.TrimStart('\\').Replace('\\', '/');

            if (info.Context is UploadContext ctx)
            {
                ctx.FileName = newRelativeName;
                return DokanResult.Success;
            }

            if (info.IsDirectory || _virtualFolders.Contains(oldRelativeName))
            {
                _virtualFolders.Remove(oldRelativeName);
                _virtualFolders.Add(newRelativeName);
                return DokanResult.Success;
            }

            var file = _cachedFiles.FirstOrDefault(f => f.Name == oldRelativeName);
            if (file != null)
            {
                file.Name = newRelativeName;
                
                if (file.Status == "UPLOADING" || file.Status == "SYNCING")
                {
                    System.Threading.Tasks.Task.Run(async () => {
                        while (file.Status == "UPLOADING" || file.Status == "SYNCING") {
                            await System.Threading.Tasks.Task.Delay(1000);
                        }
                        try { await _api.RenameFileAsync(file.Id, newRelativeName); } catch { }
                    });
                }
                else
                {
                    try { _api.RenameFileAsync(file.Id, newRelativeName).GetAwaiter().GetResult(); } 
                    catch { return DokanResult.AccessDenied; }
                }
                
                return DokanResult.Success;
            }

            return DokanResult.AccessDenied;
        }
        public NtStatus SetEndOfFile(string fileName, long length, IDokanFileInfo info)
        {
            if (info.Context is UploadContext ctx && ctx.Stream != null)
            {
                ctx.Stream.SetLength(length);
                ctx.TotalBytes = length;
                return DokanResult.Success;
            }
            return DokanResult.AccessDenied;
        }
        public NtStatus SetAllocationSize(string fileName, long length, IDokanFileInfo info)
        {
            if (info.Context is UploadContext ctx && ctx.Stream != null)
            {
                ctx.Stream.SetLength(length);
                ctx.TotalBytes = length;
                return DokanResult.Success;
            }
            return DokanResult.AccessDenied;
        }
        public NtStatus LockFile(string fileName, long offset, long length, IDokanFileInfo info) => DokanResult.Success;
        public NtStatus UnlockFile(string fileName, long offset, long length, IDokanFileInfo info) => DokanResult.Success;
        public NtStatus GetDiskFreeSpace(out long freeBytesAvailable, out long totalNumberOfBytes, out long totalNumberOfFreeBytes, IDokanFileInfo info)
        {
            long usedBytes = 0;
            if (_cachedFiles != null)
            {
                lock (_cacheLock)
                {
                    usedBytes = _cachedFiles.Sum(f => f.Size);
                }
            }
            long totalBytes = 2L * 1024 * 1024 * 1024 * 1024; // 2TB
            long freeBytes = totalBytes - usedBytes;
            
            freeBytesAvailable = freeBytes;
            totalNumberOfBytes = totalBytes;
            totalNumberOfFreeBytes = freeBytes;
            return DokanResult.Success;
        }
        public NtStatus GetVolumeInformation(out string volumeLabel, out FileSystemFeatures features, out string fileSystemName, out uint maximumComponentLength, IDokanFileInfo info)
        {
            volumeLabel = "Eon Drive";
            fileSystemName = "NTFS";
            maximumComponentLength = 256;
            // Removed ReadOnlyVolume to allow Windows Explorer to start copying files
            features = FileSystemFeatures.CasePreservedNames | FileSystemFeatures.CaseSensitiveSearch | FileSystemFeatures.SupportsRemoteStorage | FileSystemFeatures.UnicodeOnDisk;
            return DokanResult.Success;
        }
        public NtStatus GetFileSecurity(string fileName, out FileSystemSecurity security, AccessControlSections sections, IDokanFileInfo info) 
        { 
            try
            {
                if (info.IsDirectory || fileName == "\\")
                {
                    security = new System.Security.AccessControl.DirectorySecurity();
                }
                else
                {
                    security = new System.Security.AccessControl.FileSecurity();
                }
                
                var everyoneSid = new System.Security.Principal.SecurityIdentifier(System.Security.Principal.WellKnownSidType.WorldSid, null);
                var rule = new System.Security.AccessControl.FileSystemAccessRule(
                    everyoneSid,
                    System.Security.AccessControl.FileSystemRights.FullControl,
                    System.Security.AccessControl.AccessControlType.Allow);

                if (info.IsDirectory || fileName == "\\")
                {
                    ((System.Security.AccessControl.DirectorySecurity)security).AddAccessRule(rule);
                }
                else
                {
                    ((System.Security.AccessControl.FileSecurity)security).AddAccessRule(rule);
                }
                
                return DokanResult.Success;
            }
            catch
            {
                security = null;
                return DokanResult.NotImplemented;
            }
        }
        public NtStatus SetFileSecurity(string fileName, FileSystemSecurity security, AccessControlSections sections, IDokanFileInfo info) => DokanResult.NotImplemented;
        public NtStatus Mounted(string mountPoint, IDokanFileInfo info) => DokanResult.Success;
        public NtStatus Unmounted(IDokanFileInfo info) => DokanResult.Success;
        public NtStatus FindStreams(string fileName, out IList<FileInformation> streams, IDokanFileInfo info) { streams = new List<FileInformation>(); return DokanResult.NotImplemented; }
        public NtStatus WriteFile(string fileName, byte[] buffer, out int bytesWritten, long offset, IDokanFileInfo info)
        {
            bytesWritten = 0;
            if (info.Context is UploadContext ctx && ctx.Stream != null)
            {
                ctx.Stream.Position = offset;
                ctx.Stream.Write(buffer, 0, buffer.Length);
                bytesWritten = buffer.Length;
                ctx.TotalBytes = Math.Max(ctx.TotalBytes, offset + bytesWritten);
                return DokanResult.Success;
            }
            return DokanResult.AccessDenied;
        }
    }
}
