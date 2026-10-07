using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DokanNet;

namespace EonDesktop.Vfs
{
    public interface IVirtualFileSystem
    {
        Task MountDriveAsync(string preferredDriveLetter);
        Task UnmountDriveAsync();
    }

    public class EonVirtualFileSystem : IVirtualFileSystem
    {
        private readonly ApiClient _api;
        private readonly Core.SyncManager _syncManager;
        private Thread _dokanThread;
        private string _mountPoint;
        private bool _isMounted;
        private DokanInstance _dokanInstance;

        public EonVirtualFileSystem(ApiClient api, Core.SyncManager syncManager)
        {
            _api = api;
            _syncManager = syncManager;
        }

        public Task MountDriveAsync(string preferredDriveLetter)
        {
            if (_isMounted) return Task.CompletedTask;
            
            string driveLetter = preferredDriveLetter.TrimEnd('\\');
            
            // If the preferred drive is taken, find the first available letter from E to Z
            if (System.IO.DriveInfo.GetDrives().Any(d => d.Name.StartsWith(driveLetter, StringComparison.OrdinalIgnoreCase)))
            {
                for (char c = 'E'; c <= 'Z'; c++)
                {
                    if (!System.IO.DriveInfo.GetDrives().Any(d => d.Name.StartsWith(c.ToString(), StringComparison.OrdinalIgnoreCase)))
                    {
                        driveLetter = c.ToString() + ":";
                        break;
                    }
                }
            }

            _mountPoint = driveLetter + "\\";

            System.Windows.Application.Current.Dispatcher.Invoke(() => 
            {
                if (System.Windows.Application.Current.MainWindow is MainWindow mw)
                {
                    mw.DriveNameText.Text = $"Eon Drive ({driveLetter}\\)";
                }
            });

            _dokanThread = new Thread(() =>
            {
                var operations = new EonDokanOperations(_api, _syncManager);
                try
                {
                    var dokan = new Dokan(null);
                    var builder = new DokanInstanceBuilder(dokan)
                        .ConfigureOptions(options =>
                        {
                            options.MountPoint = _mountPoint;
                            options.Options = DokanOptions.RemovableDrive;
                        });

                    _dokanInstance = builder.Build(operations);
                    _isMounted = true;
                    Console.WriteLine($"[VFS] Drive mounted at {_mountPoint}");
                }
                catch (DllNotFoundException)
                {
                    System.Windows.Application.Current.Dispatcher.Invoke(() => 
                    {
                        System.Windows.MessageBox.Show("Dokan driver is not installed! Please install DokanSetup.exe from dokan-dev/dokany releases to enable the Virtual Drive.", "Missing Driver", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Error);
                    });
                }
                catch (Exception ex)
                {
                    System.Windows.Application.Current.Dispatcher.Invoke(() => 
                    {
                        System.Windows.MessageBox.Show($"Dokan Mount Error: {ex.Message}\n\nStack Trace:\n{ex.StackTrace}", "Mount Error", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Error);
                    });
                    Console.WriteLine($"[VFS] Dokan Mount Error: {ex.Message}");
                }
            });

            _dokanThread.IsBackground = true;
            _dokanThread.Start();
            return Task.CompletedTask;
        }

        public Task UnmountDriveAsync()
        {
            if (!_isMounted) return Task.CompletedTask;

            _dokanInstance?.Dispose();
            _dokanThread?.Join(TimeSpan.FromSeconds(5));
            _isMounted = false;
            
            Console.WriteLine("[VFS] Drive unmounted");
            return Task.CompletedTask;
        }
    }
}
