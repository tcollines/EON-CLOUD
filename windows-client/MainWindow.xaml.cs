using System;
using System.Windows;

namespace EonDesktop
{
    public partial class MainWindow : Window
    {
        private readonly ApiClient _api;
        private readonly Core.LruCacheManager _cacheManager;
        private readonly Core.SyncManager _syncManager;
        private readonly Vfs.IVirtualFileSystem _vfs;

        public MainWindow()
        {
            InitializeComponent();
            // Assuming local backend is running on 8080.
            _api = new ApiClient("http://localhost:8080/api/v1/");
            
            // Initialize the cache manager (in AppData)
            string cachePath = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "EonCloud", "Cache");
            _cacheManager = new Core.LruCacheManager(cachePath);
            
            // Initialize the SyncManager for background syncing
            _syncManager = new Core.SyncManager("ws://localhost:8080/ws", "http://localhost:8080/api/v1/", "", _cacheManager);
            
            // Initialize the VFS layer, passing in the SyncManager
            _vfs = new Vfs.EonVirtualFileSystem(_api, _syncManager);
            
            this.Loaded += MainWindow_Loaded;
            this.Closing += MainWindow_Closing;
            SetupTrayIcon();
        }

        private System.Windows.Forms.NotifyIcon _notifyIcon;

        private void SetupTrayIcon()
        {
            _notifyIcon = new System.Windows.Forms.NotifyIcon();
            _notifyIcon.Icon = System.Drawing.SystemIcons.Application;
            _notifyIcon.Visible = true;
            _notifyIcon.Text = "Eon Cloud";
            _notifyIcon.DoubleClick += (s, e) =>
            {
                this.Show();
                this.WindowState = WindowState.Normal;
            };

            var contextMenu = new System.Windows.Forms.ContextMenuStrip();
            contextMenu.Items.Add("Open Dashboard", null, (s, e) => { this.Show(); this.WindowState = WindowState.Normal; });
            contextMenu.Items.Add("Quit Eon Cloud", null, async (s, e) => await QuitApplication());
            _notifyIcon.ContextMenuStrip = contextMenu;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            if (_api.IsLoggedIn)
            {
                LoginPanel.Visibility = Visibility.Collapsed;
                MainPanel.Visibility = Visibility.Visible;
                _syncManager.UpdateToken(_api.Token);
                await _syncManager.StartAsync();
                await _vfs.MountDriveAsync("E:\\");
                await LoadFiles();
            }
        }

        private void MainWindow_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            e.Cancel = true;
            this.Hide();
            _notifyIcon.ShowBalloonTip(2000, "Eon Cloud", "Running in the background. The E: drive is still mounted and syncing.", System.Windows.Forms.ToolTipIcon.Info);
        }

        private async System.Threading.Tasks.Task QuitApplication()
        {
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
            await _syncManager.StopAsync();
            await _vfs.UnmountDriveAsync();
            System.Windows.Application.Current.Shutdown();
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                ErrorText.Text = "Connecting...";
                string token = TokenBox.Text.Trim();
                if (string.IsNullOrEmpty(token)) {
                    ErrorText.Text = "Please enter a valid token.";
                    return;
                }

                await _api.SetTokenAsync(token);
                
                LoginPanel.Visibility = Visibility.Collapsed;
                MainPanel.Visibility = Visibility.Visible;
                
                _syncManager.UpdateToken(_api.Token);
                await _syncManager.StartAsync();
                await _vfs.MountDriveAsync("E:\\");
                await LoadFiles();
            }
            catch (Exception ex)
            {
                ErrorText.Text = ex.Message;
            }
        }

        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            await LoadFiles();
        }

        private void UploadButton_Click(object sender, RoutedEventArgs e)
        {
            System.Windows.MessageBox.Show("File upload will be heavily integrated with the Virtual Filesystem (ProjFS) in the next phase.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private async void LogoutButton_Click(object sender, RoutedEventArgs e)
        {
            _api.Logout();
            await _vfs.UnmountDriveAsync();
            MainPanel.Visibility = Visibility.Collapsed;
            LoginPanel.Visibility = Visibility.Visible;
            FileListView.ItemsSource = null;
        }

        private async System.Threading.Tasks.Task LoadFiles()
        {
            try
            {
                var files = await _api.GetFilesAsync();
                FileListView.ItemsSource = files;
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(ex.Message, "Error loading files");
            }
        }
    }
}