using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace EonDesktop.Core
{
    public static class AuthManager
    {
        private static readonly string TokenFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "EonCloud",
            "token.dat");

        public static void SaveToken(string token)
        {
            var dir = Path.GetDirectoryName(TokenFilePath);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var encryptedData = ProtectedData.Protect(
                Encoding.UTF8.GetBytes(token),
                null,
                DataProtectionScope.CurrentUser);

            File.WriteAllBytes(TokenFilePath, encryptedData);
        }

        public static string LoadToken()
        {
            if (!File.Exists(TokenFilePath)) return null;

            try
            {
                var encryptedData = File.ReadAllBytes(TokenFilePath);
                var decryptedData = ProtectedData.Unprotect(
                    encryptedData,
                    null,
                    DataProtectionScope.CurrentUser);

                return Encoding.UTF8.GetString(decryptedData);
            }
            catch (CryptographicException)
            {
                // Token couldn't be decrypted or was corrupted
                return null;
            }
        }

        public static void ClearToken()
        {
            if (File.Exists(TokenFilePath))
            {
                File.Delete(TokenFilePath);
            }
        }
    }
}
