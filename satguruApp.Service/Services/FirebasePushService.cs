using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class FirebasePushService : IFirebasePushService
    {
        private const string MessagingScope = "https://www.googleapis.com/auth/firebase.messaging";
        private static readonly HttpClient HttpClient = new();
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly SatguruDBContext _db;
        private readonly IConfiguration _configuration;
        private readonly ILogger<FirebasePushService> _logger;

        private string? _cachedAccessToken;
        private DateTime _cachedAccessTokenExpiresAtUtc = DateTime.MinValue;

        public FirebasePushService(
            SatguruDBContext db,
            IConfiguration configuration,
            ILogger<FirebasePushService> logger)
        {
            _db = db;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> RegisterDeviceTokenAsync(PushDeviceTokenRegistrationViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.UserId) || string.IsNullOrWhiteSpace(model.DeviceToken))
            {
                return "UserId and device token are required.";
            }

            var userExists = await _db.Users.AnyAsync(x => x.Id == model.UserId);
            if (!userExists)
            {
                return "User not found.";
            }

            var entity = await _db.PushDeviceTokens
                .FirstOrDefaultAsync(x => x.DeviceToken == model.DeviceToken);

            if (entity == null)
            {
                entity = new PushDeviceToken
                {
                    Id = Guid.NewGuid(),
                    UserId = model.UserId,
                    DeviceToken = model.DeviceToken,
                    Platform = string.IsNullOrWhiteSpace(model.Platform) ? "web" : model.Platform.Trim().ToLowerInvariant(),
                    DeviceId = model.DeviceId?.Trim(),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    LastSeenAt = DateTime.UtcNow,
                };
                _db.PushDeviceTokens.Add(entity);
            }
            else
            {
                entity.UserId = model.UserId;
                entity.Platform = string.IsNullOrWhiteSpace(model.Platform) ? entity.Platform : model.Platform.Trim().ToLowerInvariant();
                entity.DeviceId = string.IsNullOrWhiteSpace(model.DeviceId) ? entity.DeviceId : model.DeviceId.Trim();
                entity.IsActive = true;
                entity.LastSeenAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return "Push device token registered.";
        }

        public async Task<string> RemoveDeviceTokenAsync(PushDeviceTokenRemovalViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.DeviceToken))
            {
                return "Device token is required.";
            }

            var entity = await _db.PushDeviceTokens
                .FirstOrDefaultAsync(x =>
                    x.DeviceToken == model.DeviceToken &&
                    (string.IsNullOrWhiteSpace(model.UserId) || x.UserId == model.UserId));

            if (entity == null)
            {
                return "Device token not found.";
            }

            entity.IsActive = false;
            entity.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return "Push device token removed.";
        }

        public async Task<string> SendTestAsync(TestPushNotificationRequest model)
        {
            var firebaseSettings = GetFirebaseSettings();
            if (!firebaseSettings.IsConfigured)
            {
                return "Firebase is not configured.";
            }

            var payload = new PushNotificationPayload
            {
                Title = string.IsNullOrWhiteSpace(model.Title) ? "Test Notification" : model.Title.Trim(),
                Body = string.IsNullOrWhiteSpace(model.Body) ? "Firebase push notification is working." : model.Body.Trim(),
                Data = new Dictionary<string, string>
                {
                    ["type"] = "test_push",
                    ["sentAtUtc"] = DateTime.UtcNow.ToString("O"),
                }
            };

            if (!string.IsNullOrWhiteSpace(model.DeviceToken))
            {
                var accessToken = await GetAccessTokenAsync(firebaseSettings);
                if (string.IsNullOrWhiteSpace(accessToken))
                {
                    return "Unable to get Firebase access token.";
                }

                await SendMessageAsync(firebaseSettings, accessToken, model.DeviceToken.Trim(), payload);
                return "Test push request sent to the provided device token.";
            }

            if (!string.IsNullOrWhiteSpace(model.UserId))
            {
                var hasActiveToken = await _db.PushDeviceTokens.AnyAsync(x => x.UserId == model.UserId && x.IsActive);
                if (!hasActiveToken)
                {
                    return "No active device token found for this user.";
                }

                await SendToUserAsync(model.UserId.Trim(), payload);
                return "Test push request sent to the user's active device tokens.";
            }

            return "UserId or DeviceToken is required.";
        }

        public async Task SendToUserAsync(string? userId, PushNotificationPayload payload)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return;
            }

            await SendToUsersAsync(new[] { userId }, payload);
        }

        public async Task SendToUsersAsync(IEnumerable<string?> userIds, PushNotificationPayload payload)
        {
            var targets = userIds
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!targets.Any())
            {
                return;
            }

            var tokens = await _db.PushDeviceTokens
                .Where(x => x.IsActive && targets.Contains(x.UserId))
                .Select(x => x.DeviceToken)
                .Distinct()
                .ToListAsync();

            if (!tokens.Any())
            {
                return;
            }

            var firebaseSettings = GetFirebaseSettings();
            if (!firebaseSettings.IsConfigured)
            {
                _logger.LogWarning("Firebase push skipped because Firebase settings are incomplete.");
                return;
            }

            var accessToken = await GetAccessTokenAsync(firebaseSettings);
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                return;
            }

            foreach (var token in tokens)
            {
                await SendMessageAsync(firebaseSettings, accessToken, token, payload);
            }
        }

        private async Task SendMessageAsync(FirebaseSettings settings, string accessToken, string deviceToken, PushNotificationPayload payload)
        {
            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"https://fcm.googleapis.com/v1/projects/{settings.ProjectId}/messages:send");

                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var body = new
                {
                    message = new
                    {
                        token = deviceToken,
                        notification = new
                        {
                            title = payload.Title,
                            body = payload.Body,
                        },
                        data = payload.Data,
                        android = new
                        {
                            priority = "high",
                            notification = new
                            {
                                channel_id = "navgatix_alerts",
                                priority = "high",
                                sound = "default",
                                default_sound = true,
                                default_vibrate_timings = true
                            }
                        },
                        webpush = new
                        {
                            notification = new
                            {
                                title = payload.Title,
                                body = payload.Body,
                                icon = "/logo.png",
                            }
                        }
                    }
                };

                request.Content = new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json");

                using var response = await HttpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return;
                }

                _logger.LogWarning("Firebase push failed for a device token. Status: {StatusCode}, Response: {ResponseBody}", response.StatusCode, responseBody);

                if (responseBody.Contains("UNREGISTERED", StringComparison.OrdinalIgnoreCase) ||
                    responseBody.Contains("registration-token-not-registered", StringComparison.OrdinalIgnoreCase))
                {
                    await DeactivateTokenAsync(deviceToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Firebase push send failed.");
            }
        }

        private async Task DeactivateTokenAsync(string deviceToken)
        {
            var entity = await _db.PushDeviceTokens.FirstOrDefaultAsync(x => x.DeviceToken == deviceToken);
            if (entity == null)
            {
                return;
            }

            entity.IsActive = false;
            entity.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        private async Task<string?> GetAccessTokenAsync(FirebaseSettings settings)
        {
            if (!string.IsNullOrWhiteSpace(_cachedAccessToken) &&
                _cachedAccessTokenExpiresAtUtc > DateTime.UtcNow.AddMinutes(1))
            {
                return _cachedAccessToken;
            }

            try
            {
                var jwt = CreateSignedJwt(settings.ServiceAccount);
                using var request = new HttpRequestMessage(HttpMethod.Post, settings.ServiceAccount.TokenUri);
                request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    ["assertion"] = jwt,
                });

                using var response = await HttpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Unable to get Firebase access token. Status: {StatusCode}, Response: {ResponseBody}", response.StatusCode, responseBody);
                    return null;
                }

                var tokenResponse = JsonSerializer.Deserialize<GoogleAccessTokenResponse>(responseBody, JsonOptions);
                if (tokenResponse?.AccessToken == null)
                {
                    return null;
                }

                _cachedAccessToken = tokenResponse.AccessToken;
                _cachedAccessTokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn <= 0 ? 3000 : tokenResponse.ExpiresIn);
                return _cachedAccessToken;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unable to get Firebase access token.");
                return null;
            }
        }

        private string CreateSignedJwt(FirebaseServiceAccount serviceAccount)
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(serviceAccount.PrivateKey.ToCharArray());
            var now = DateTime.UtcNow;
            var header = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new
            {
                alg = "RS256",
                typ = "JWT",
            }));

            var payload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new
            {
                iss = serviceAccount.ClientEmail,
                scope = MessagingScope,
                aud = serviceAccount.TokenUri,
                exp = new DateTimeOffset(now.AddMinutes(55)).ToUnixTimeSeconds(),
                iat = new DateTimeOffset(now).ToUnixTimeSeconds(),
            }));

            var unsignedToken = $"{header}.{payload}";
            var signature = rsa.SignData(Encoding.UTF8.GetBytes(unsignedToken), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            return $"{unsignedToken}.{Base64UrlEncode(signature)}";
        }

        private static string Base64UrlEncode(byte[] value)
        {
            return Convert.ToBase64String(value)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private FirebaseSettings GetFirebaseSettings()
        {
            var configuredProjectId = _configuration["Firebase:ProjectId"];
            var serviceAccountPath = FirebaseConfigurationHelper.ResolveServiceAccountPath(_configuration);

            if (string.IsNullOrWhiteSpace(serviceAccountPath))
            {
                return FirebaseSettings.Empty;
            }

            var json = System.IO.File.ReadAllText(serviceAccountPath);
            var serviceAccount = JsonSerializer.Deserialize<FirebaseServiceAccount>(json, JsonOptions);
            if (serviceAccount == null)
            {
                return FirebaseSettings.Empty;
            }

            return new FirebaseSettings
            {
                ProjectId = string.IsNullOrWhiteSpace(configuredProjectId) ? serviceAccount.ProjectId : configuredProjectId,
                ServiceAccount = serviceAccount,
            };
        }

        private sealed class FirebaseSettings
        {
            public static FirebaseSettings Empty { get; } = new();

            public string? ProjectId { get; init; }
            public FirebaseServiceAccount? ServiceAccount { get; init; }
            public bool IsConfigured => !string.IsNullOrWhiteSpace(ProjectId) && ServiceAccount != null;
        }

        private sealed class FirebaseServiceAccount
        {
            [JsonPropertyName("project_id")]
            public string ProjectId { get; set; } = string.Empty;

            [JsonPropertyName("private_key")]
            public string PrivateKey { get; set; } = string.Empty;

            [JsonPropertyName("client_email")]
            public string ClientEmail { get; set; } = string.Empty;

            [JsonPropertyName("token_uri")]
            public string TokenUri { get; set; } = "https://oauth2.googleapis.com/token";
        }

        private sealed class GoogleAccessTokenResponse
        {
            [JsonPropertyName("access_token")]
            public string? AccessToken { get; set; }

            [JsonPropertyName("expires_in")]
            public int ExpiresIn { get; set; }
        }
    }
}
