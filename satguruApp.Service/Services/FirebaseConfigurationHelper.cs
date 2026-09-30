using Microsoft.Extensions.Configuration;
using System;
using System.IO;

namespace satguruApp.Service.Services
{
    internal static class FirebaseConfigurationHelper
    {
        public static string? ResolveServiceAccountPath(IConfiguration configuration)
        {
            var candidates = new List<string?>
            {
                configuration["Firebase:ServiceAccountPath"],
                configuration["Firebase:CredentialsFilePath"],
                Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_PATH"),
                "firebase-service-account.json",
                "firebase-service-account.json.json",
                "Firebase/navgatix-service-account.json",
                "Firebase\\navgatix-service-account.json",
                "navgatix-service-account.json"
            };

            foreach (var path in candidates)
            {
                if (string.IsNullOrWhiteSpace(path)) continue;

                if (Path.IsPathRooted(path) && File.Exists(path))
                {
                    return path;
                }

                var currentDir = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), path));
                if (File.Exists(currentDir))
                {
                    return currentDir;
                }

                var appBaseDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, path));
                if (File.Exists(appBaseDir))
                {
                    return appBaseDir;
                }
            }

            return null;
        }
    }
}
