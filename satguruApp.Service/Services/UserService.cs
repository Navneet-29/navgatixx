using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;
using Razorpay.Api;
using satguruApp.DLL.Models;
using satguruApp.Service.Authorization;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IUserClaimsPrincipalFactory<ApplicationUser> _userClaimFactory;
        private readonly SatguruDBContext _db;
        private readonly JWT _jwt;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UserService> _logger;
        private static readonly object FirebaseAppLock = new();
        private static FirebaseAdmin.FirebaseApp? _firebaseApp;

        public UserService(SatguruDBContext context, UserManager<ApplicationUser> userManager,
            IOptions<JWT> jwt,
            IConfiguration configuration,
            RoleManager<ApplicationRole> roleManager,
            SignInManager<ApplicationUser> signInManager,
            IUserClaimsPrincipalFactory<ApplicationUser> userClaimFactory,
            ILogger<UserService> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _signInManager = signInManager;
            _jwt = jwt.Value;
            _db = context;
            _userClaimFactory = userClaimFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> UserRegisterAsync(UserViewModel model)
        {
            var userWithSameEmail = await _userManager.FindByEmailAsync(model.Email);
            if (userWithSameEmail != null)
            {
                return $"Email {model.Email} is already registered.";
            }

            if (!string.IsNullOrEmpty(model.PhoneNumber))
            {
                var userWithSamePhone = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == model.PhoneNumber);
                if (userWithSamePhone != null)
                {
                    return $"Phone number {model.PhoneNumber} is already registered.";
                }
            }

            var user = new ApplicationUser
            {
                UserName = model.UserName,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                PhoneNumber = model.PhoneNumber,
                NormalizedEmail = model.Email.ToUpper(),
                NormalizedUserName = model.UserName.ToUpper(),
                IsActive = true,
            };

            try
            {
                var result = await _userManager.CreateAsync(user, model.Password);
                if (result.Succeeded)
                {
                    return $"User Registered with username {user.UserName}";
                }
                else
                {
                    return string.Join(", ", result.Errors.Select(e => e.Description));
                }
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        public async Task<AuthenticationViewModel> FirebaseRegisterAsync(FirebaseAuthRequestViewModel model)
        {
            var firebaseUser = await VerifyFirebaseTokenAsync(model.FirebaseIdToken);
            if (firebaseUser == null)
            {
                return new AuthenticationViewModel { IsAuthenticated = false, Message = "Invalid Firebase token." };
            }

            if (!string.IsNullOrEmpty(model.PhoneNumber))
            {
                var userWithSamePhone = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == model.PhoneNumber);
                if (userWithSamePhone != null && userWithSamePhone.Email != firebaseUser.Email)
                {
                    return new AuthenticationViewModel { IsAuthenticated = false, Message = $"Phone number {model.PhoneNumber} is already registered." };
                }
            }

            var localUser = await EnsureFirebaseLocalUserAsync(firebaseUser, model, allowUnverifiedEmail: true);
            if (localUser == null)
            {
                return new AuthenticationViewModel { IsAuthenticated = false, Message = "Unable to create local account." };
            }

            if (!string.IsNullOrWhiteSpace(model.RoleName))
            {
                await EnsureRoleAsync(localUser, model.RoleName);
            }

            var authModel = await BuildAuthenticationViewModelAsync(localUser);
            authModel.EmailVerified = firebaseUser.EmailVerified;
            authModel.IsAuthenticated = firebaseUser.EmailVerified;
            authModel.Message = firebaseUser.EmailVerified
                ? "Account registered successfully."
                : "Account created. Please verify your email before logging in.";
            return authModel;
        }

        public async Task<AuthenticationViewModel> FirebaseLoginAsync(FirebaseAuthRequestViewModel model)
        {
            var firebaseUser = await VerifyFirebaseTokenAsync(model.FirebaseIdToken);
            if (firebaseUser == null)
            {
                return new AuthenticationViewModel
                {
                    IsAuthenticated = false,
                    Message = "Invalid Firebase token. Please ensure your session is fresh and your project configuration is correct."
                };
            }

            if (!firebaseUser.EmailVerified)
            {
                return new AuthenticationViewModel
                {
                    IsAuthenticated = false,
                    Email = firebaseUser.Email,
                    EmailVerified = false,
                    Message = "Please verify your email before logging in."
                };
            }

            var localUser = await FindByEmailAsync(firebaseUser.Email);
            if (localUser == null)
            {
                return new AuthenticationViewModel
                {
                    IsAuthenticated = false,
                    Email = firebaseUser.Email,
                    EmailVerified = true,
                    Message = "No local account found for this Firebase user. Please sign up first."
                };
            }

            localUser.FirstName = string.IsNullOrWhiteSpace(model.FirstName) ? firebaseUser.FirstName : model.FirstName;
            localUser.LastName = string.IsNullOrWhiteSpace(model.LastName) ? firebaseUser.LastName : model.LastName;
            localUser.EmailConfirmed = firebaseUser.EmailVerified;
            await _userManager.UpdateAsync(localUser);

            var authModel = await BuildAuthenticationViewModelAsync(localUser);
            authModel.EmailVerified = firebaseUser.EmailVerified;
            authModel.Message = "Success";
            return authModel;
        }

        public async Task<AuthenticationViewModel> GetTokenAsync(TokenRequestViewModel model)
        {
            var authenticationModel = new AuthenticationViewModel();
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) { user = await _userManager.FindByEmailAsync(model.UserName); }
            if (user == null)
            {
                authenticationModel.IsAuthenticated = false;
                authenticationModel.Message = $"No Accounts Registered with {model.Email}.";
                return authenticationModel;
            }

            if (await _userManager.CheckPasswordAsync(user, model.Password))
            {
                return await BuildAuthenticationViewModelAsync(user);
            }

            authenticationModel.IsAuthenticated = false;
            authenticationModel.Message = $"Incorrect Credentials for user {user.Email}.";
            return authenticationModel;
        }

        private async Task<JwtSecurityToken> CreateJwtToken(ApplicationUser user)
        {
            try
            {
                var userClaims = await _userManager.GetClaimsAsync(user);
                var roles = await _userManager.GetRolesAsync(user);
                var roleClaims = roles.Select(r => new Claim("roles", r));
                
                var claims = new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, user.UserName),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(JwtRegisteredClaimNames.Email, user.Email),
                    new Claim("uid", user.Id)
                }.Union(userClaims).Union(roleClaims);

                var symmetricSecurityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
                var signingCredentials = new SigningCredentials(symmetricSecurityKey, SecurityAlgorithms.HmacSha256);
                
                return new JwtSecurityToken(
                    issuer: _jwt.Issuer,
                    audience: _jwt.Audience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(_jwt.DurationInMinutes),
                    signingCredentials: signingCredentials);
            }
            catch (Exception) { return null; }
        }

        public async Task<string> UpdateUserRoleAsync(RoleViewModel model)
        {
            var user = await FindByEmailAsync(model.Email) ?? await FindUserByUserName(model.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                await EnsureRoleAsync(user, model.Name);
                return $"Added {model.Name} to user {model.Email}.";
            }
            return $"Incorrect Credentials or user not found.";
        }

        // Back-compat with older controller/service usage. Currently identical to UpdateUserRoleAsync.
        public Task<string> UpdateUserRolesAsync(RoleViewModel model) => UpdateUserRoleAsync(model);

        public async Task<string> CreateRoles(string roleName)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new ApplicationRole { Name = roleName });
            }
            return "Success";
        }

        public async Task<ApplicationRole> GetRoleAsync(string roleName) => await _roleManager.FindByNameAsync(roleName);
        public async Task<List<ApplicationRole>> GetRolesAsync(string roleName = "") => 
            await _roleManager.Roles.Where(x => string.IsNullOrEmpty(roleName) || x.Name.ToLower().Contains(roleName.ToLower())).ToListAsync();

        public async Task<AuthenticationViewModel> Login(LoginViewModel model)
        {
            var user = await _userManager.FindByNameAsync(model.UserName) ?? await _userManager.FindByEmailAsync(model.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                return await GetTokenAsync(new TokenRequestViewModel { Email = user.Email, Password = model.Password });
            }
            return new AuthenticationViewModel();
        }

        public async Task<ApplicationUser> FindUserByUserName(string userName) => await _userManager.FindByNameAsync(userName);
        public async Task<ApplicationUser> FindUserByUserId(string userId) => await _userManager.FindByIdAsync(userId);
        public async Task<ApplicationUser> FindByEmailAsync(string email) => await _userManager.FindByEmailAsync(email);

        public async Task<string> UpdateUser(UserViewModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return "Failed";
            
            user.FirstName = model.FirstName;
            user.LastName = model.LastName;
            user.PhoneNumber = model.PhoneNumber;
            
            var updateResult = await _userManager.UpdateAsync(user);
            return updateResult.Succeeded ? "Success" : "Failed";
        }

        public async Task<string> ChangePassword(UserViewModel model)
        {
            var user = (!string.IsNullOrEmpty(model.UserId) ? await _userManager.FindByIdAsync(model.UserId) : null)
                ?? (!string.IsNullOrEmpty(model.Email) ? await FindByEmailAsync(model.Email) : null) 
                ?? (!string.IsNullOrEmpty(model.UserName) ? await FindUserByUserName(model.UserName) : null);
            if (user == null) return "User not found";
            var updateResult = await _userManager.ChangePasswordAsync(user, model.Password, model.NewPassword);
            if (updateResult.Succeeded) return "Success";
            return string.Join("; ", updateResult.Errors.Select(e => e.Description));
        }

        public async Task<string> LogoutAllDevices(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return "User not found";
            var result = await _userManager.UpdateSecurityStampAsync(user);
            return result.Succeeded ? "Success" : "Failed";
        }

        public async Task<string> DeleteAccount(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return "Failed";

            user.IsActive = false;
            user.IsEnabled = false;
            user.LockoutEnabled = true;
            user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) return "Failed";

            await _userManager.UpdateSecurityStampAsync(user);
            return "Success";
        }

        public async Task<ClaimsPrincipal> CreateAsync(ApplicationUser user)
        {
            var principal = await _userClaimFactory.CreateAsync(user);
            var claims = principal.Claims.ToList();

            if (user.Id != null) claims.Add(new Claim(PropertyConstants.UserId, user.Id));
            if (user.FirstName != null) claims.Add(new Claim(PropertyConstants.FullName, user.FirstName));
            if (user.AppUserId > 0) claims.Add(new Claim(PropertyConstants.AppUserId, user.AppUserId.ToString()));
            if (!string.IsNullOrEmpty(user.UserName)) claims.Add(new Claim(PropertyConstants.UserName, user.UserName));
            if (user.PhoneNumber != null) claims.Add(new Claim(PropertyConstants.PhoneNumber, user.PhoneNumber));
            if (user.Email != null) claims.Add(new Claim(PropertyConstants.Email, user.Email));

            var roles = await _userManager.GetRolesAsync(user);
            foreach (var role in roles) claims.Add(new Claim("role", role));
            
            return principal;
        }

        private async Task EnsureRoleAsync(ApplicationUser user, string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return;
            var normalizedRole = roleName.Trim();
            if (!await _roleManager.RoleExistsAsync(normalizedRole)) await CreateRoles(normalizedRole);
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (!currentRoles.Any(x => x.Equals(normalizedRole, StringComparison.OrdinalIgnoreCase)))
                await _userManager.AddToRoleAsync(user, normalizedRole);
        }

        private async Task<ApplicationUser?> EnsureFirebaseLocalUserAsync(FirebaseVerifiedUser firebaseUser, FirebaseAuthRequestViewModel model, bool allowUnverifiedEmail)
        {
            if (!allowUnverifiedEmail && !firebaseUser.EmailVerified) return null;
            var user = await FindByEmailAsync(firebaseUser.Email);
            if (user == null)
            {
                var userName = string.IsNullOrWhiteSpace(model.UserName) ? firebaseUser.Email : model.UserName.Trim().ToLowerInvariant();
                if (!string.IsNullOrEmpty(model.PhoneNumber))
                {
                    var existingUserWithPhone = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == model.PhoneNumber);
                    if (existingUserWithPhone != null) return null;
                }

                user = new ApplicationUser
                {
                    UserName = userName,
                    Email = firebaseUser.Email,
                    FirstName = string.IsNullOrWhiteSpace(model.FirstName) ? firebaseUser.FirstName : model.FirstName,
                    LastName = string.IsNullOrWhiteSpace(model.LastName) ? firebaseUser.LastName : model.LastName,
                    PhoneNumber = model.PhoneNumber,
                    NormalizedEmail = firebaseUser.Email.ToUpperInvariant(),
                    NormalizedUserName = userName.ToUpperInvariant(),
                    IsActive = true,
                    EmailConfirmed = firebaseUser.EmailVerified,
                };
                var createResult = await _userManager.CreateAsync(user, GenerateInternalPassword());
                if (!createResult.Succeeded) return null;
            }
            else
            {
                user.FirstName = string.IsNullOrWhiteSpace(model.FirstName) ? firebaseUser.FirstName : model.FirstName;
                user.LastName = string.IsNullOrWhiteSpace(model.LastName) ? firebaseUser.LastName : model.LastName;
                user.PhoneNumber = model.PhoneNumber ?? user.PhoneNumber;
                user.EmailConfirmed = firebaseUser.EmailVerified;
                await _userManager.UpdateAsync(user);
            }
            return user;
        }

        private async Task<AuthenticationViewModel> BuildAuthenticationViewModelAsync(ApplicationUser user)
        {
            var userInfo = await _db.UserInformations.FirstOrDefaultAsync(x => x.UserId == user.Id);
            var customerDetail = await _db.CustomerDetails.FirstOrDefaultAsync(x => x.UserId == user.Id);
            var driverDetail = await _db.Drivers.FirstOrDefaultAsync(x => x.UserId == user.Id);
            var transporterDetail = await _db.TransporterDetails.FirstOrDefaultAsync(x => x.UserId == user.Id);

            var rolesList = await _userManager.GetRolesAsync(user).ConfigureAwait(false);

            string resolvedRole = null;
            if (userInfo?.AccountTypeId != null)
            {
                var accountType = await _db.AccountTypes.FirstOrDefaultAsync(a => a.Id == userInfo.AccountTypeId.Value);
                if (accountType != null) resolvedRole = accountType.Name;
            }

            if (string.IsNullOrWhiteSpace(resolvedRole)) resolvedRole = rolesList.FirstOrDefault();

            // SAFETY OVERRIDE: If the user has a Transporter record, prioritize that role for routing
            if (transporterDetail != null) resolvedRole = "Transporter";

            var authenticationModel = new AuthenticationViewModel
            {
                UserInfoId = userInfo?.Id,
                CustomerId = customerDetail?.Id,
                DriverId = driverDetail?.Id,
                TransporterId = transporterDetail?.Id.ToString(),
                TransporterName = transporterDetail?.CompanyName,
                DriverName = driverDetail?.Name,
                FirstName = user.FirstName,
                LastName = user.LastName,
                PhoneNumber = user.PhoneNumber ?? userInfo?.PhoneNumber ?? (userInfo?.Mobile.HasValue == true ? userInfo.Mobile.Value.ToString() : null),
                ProfilePic = userInfo?.ProfilePic ?? driverDetail?.PhotoUrl,
                Address = transporterDetail?.Address ?? customerDetail?.Address,
                UserId = user.Id,
                AppUserId = user.AppUserId,
                IsAuthenticated = true,
                Email = user.Email,
                UserName = user.UserName,
                EmailVerified = user.EmailConfirmed,
                RoleName = resolvedRole,
                Roles = rolesList.ToList()
            };

            JwtSecurityToken jwtSecurityToken = await CreateJwtToken(user);
            if (jwtSecurityToken != null)
                authenticationModel.Token = new JwtSecurityTokenHandler().WriteToken(jwtSecurityToken);
                
            return authenticationModel;
        }

        private async Task<FirebaseVerifiedUser?> VerifyFirebaseTokenAsync(string firebaseIdToken)
        {
            if (string.IsNullOrWhiteSpace(firebaseIdToken))
            {
                return null;
            }

            var firebaseAuth = GetFirebaseAdminAuth();
            if (firebaseAuth == null)
            {
                return null;
            }

            try
            {
                var decodedToken = await firebaseAuth.VerifyIdTokenAsync(firebaseIdToken);
                if (!decodedToken.Claims.TryGetValue("email", out var emailClaim) ||
                    string.IsNullOrWhiteSpace(emailClaim?.ToString()))
                {
                    return null;
                }

                var fullName = decodedToken.Claims.TryGetValue("name", out var nameClaim)
                    ? nameClaim?.ToString() ?? string.Empty
                    : string.Empty;
                var names = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);

                return new FirebaseVerifiedUser
                {
                    FirebaseUid = decodedToken.Uid,
                    Email = emailClaim!.ToString()!,
                    EmailVerified = decodedToken.Claims.TryGetValue("email_verified", out var verifiedClaim)
                        && bool.TryParse(verifiedClaim?.ToString(), out var verified)
                        && verified,
                    FirstName = names.Length > 0 ? names[0] : string.Empty,
                    LastName = names.Length > 1 ? names[1] : string.Empty,
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Firebase ID token verification failed. ProjectId: {ProjectId}. Current Server UTC Time: {CurrentTime}",
                    _configuration["Firebase:ProjectId"],
                    DateTime.UtcNow
                );
                return null;
            }
        }

        private FirebaseAdmin.Auth.FirebaseAuth? GetFirebaseAdminAuth()
        {
            var serviceAccountPath = FirebaseConfigurationHelper.ResolveServiceAccountPath(_configuration);
            if (string.IsNullOrWhiteSpace(serviceAccountPath))
            {
                _logger.LogWarning(
                    "Firebase Admin not configured: service account file not found. Configure Firebase:ServiceAccountPath (or FIREBASE_SERVICE_ACCOUNT_PATH). CurrentDirectory={CurrentDirectory} BaseDirectory={BaseDirectory}",
                    Directory.GetCurrentDirectory(),
                    AppContext.BaseDirectory
                );
                return null;
            }

            var projectId = _configuration["Firebase:ProjectId"];
            if (string.IsNullOrWhiteSpace(projectId))
            {
                _logger.LogWarning(
                    "Firebase Admin not configured: missing Firebase:ProjectId. ServiceAccountPath={ServiceAccountPath}",
                    serviceAccountPath
                );
                return null;
            }

            lock (FirebaseAppLock)
            {
                if (_firebaseApp == null)
                {
                    try
                    {
                        _firebaseApp = FirebaseAdmin.FirebaseApp.GetInstance("navgatix-auth");
                    }
                    catch
                    {
                        _firebaseApp = null;
                    }
                }

                if (_firebaseApp == null)
                {
                    _firebaseApp = FirebaseAdmin.FirebaseApp.Create(new FirebaseAdmin.AppOptions
                    {
                        Credential = Google.Apis.Auth.OAuth2.GoogleCredential.FromFile(serviceAccountPath),
                        ProjectId = projectId,
                    }, "navgatix-auth");
                }
            }
            return FirebaseAdmin.Auth.FirebaseAuth.GetAuth(_firebaseApp);
        }

        private static string GenerateInternalPassword()
        {
            var bytes = RandomNumberGenerator.GetBytes(24);
            return $"Ngx!{Convert.ToBase64String(bytes).Replace("/", "A").Replace("+", "B").Substring(0, 20)}1";
        }

        private sealed class FirebaseVerifiedUser
        {
            public string FirebaseUid { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public bool EmailVerified { get; set; }
            public string FirstName { get; set; } = string.Empty;
            public string LastName { get; set; } = string.Empty;
        }

        public async Task<int> SaveContactUsSupport(ContactUsViewModel contactUs)
        {
            var contactusEntity = new ContactU
            {
                UserId = contactUs.UserId ?? string.Empty,
                PhoneNumber = contactUs.PhoneNumber ?? string.Empty,
                EmailId = contactUs.EmailId ?? string.Empty,
                Description = contactUs.Description ?? string.Empty,
                IsDeleted = contactUs.IsDeleted ?? false,
                CreatedBy = contactUs.CreatedBy,
                CreatedDatetime = contactUs.CreatedDatetime ?? DateTime.UtcNow,
                UpdatedBy = contactUs.UpdatedBy,
                UpdatedDatetime = contactUs.UpdatedDatetime,
            };

            _db.ContactUs.Add(contactusEntity);
            await _db.SaveChangesAsync();
            return contactusEntity.Id;
        }
    }
}
