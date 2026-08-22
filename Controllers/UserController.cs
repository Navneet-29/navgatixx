using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using static Google.Apis.Auth.OAuth2.Web.AuthorizationCodeWebApp;
using Microsoft.EntityFrameworkCore;


namespace navgatix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [RequestSizeLimit(long.MaxValue)]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue, ValueLengthLimit = int.MaxValue)]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IAccountTypeService _accountTypeService;
        private readonly IUserInfoService _userInfoService;
        private readonly ITransportService _transportService;
        private readonly IAppCustormer _appCustormer;
        private readonly IVehicleService _vehicleService;
        private readonly SatguruDBContext _db;
        private string subPath = @"wwwroot/uploads/profiles/";
        private static readonly string[] Summaries = new[]
      {
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    };
        public UserController(IUserService userService, IAccountTypeService accountTypeService, IUserInfoService userInfoService, ITransportService transportService, IAppCustormer appCustormer, IVehicleService vehicleService, SatguruDBContext db)
        {
            _userService = userService;
            _accountTypeService = accountTypeService;
            _userInfoService = userInfoService;
            _transportService = transportService;
            _appCustormer = appCustormer;
            _vehicleService = vehicleService;
            _db = db;
        }
        // GET: UserController
        [HttpPost]
        [AllowAnonymous]
        [HttpPost("Registration")]
        public async Task<IActionResult> UserRegisterAsync([FromBody] UserInfoViewModel model)
        {
            UserViewModel userModel = new UserViewModel
            {
                UserName = model.UserName,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                PhoneNumber = model.PhoneNumber,
                DOB = model.DOB,
                Password = model.Password,
            };

            var result = await _userService.UserRegisterAsync(userModel);
            if (!result.StartsWith("User Registered"))
            {
                return BadRequest(result);
            }
            //FileUpload fileUpload=Request.;
            AccountTypeViewModel accountTypeView = new AccountTypeViewModel { Name = model.RoleName };

            var roles = await _accountTypeService.SaveChangeAsync(accountTypeView);

            var accountType = await _accountTypeService.GetById(0, model.RoleName);

            model.AccountTypeId = accountType.Id;
            var user = await _userService.FindByEmailAsync(model.Email);
            if (user == null)
            { user = await _userService.FindUserByUserName(model.UserName); }
            model.UserId = user.Id;
            var userRoleVM = new RoleViewModel { Name = model.RoleName, Email = model.Email, Password = model.Password };
            var userRoles = await _userService.UpdateUserRoleAsync(userRoleVM);

            //Helpers.FileUploadExtension.SaveAs(fileUpload, subPath, true, fileUpload);
            var userResult = await _userInfoService.AddUserInfoAsync(model);
            if (!string.IsNullOrEmpty(userResult.Message))
            {
                model.Message = userResult.Message;
                return Ok(model);
            }
            switch (model.RoleName.ToLower())
            {
                case "driver":
                    if (model.TransporterId == 0 || !model.TransporterId.HasValue)
                    {
                        model.TransporterId = await _transportService.SaveTransporterAsync(new TransporterViewModel { UserId = model.UserId, FirstName = model.FirstName, MiddleName = model.MiddleName, LastName = model.LastName, Mobile = model.Mobile, DOB = model.DOB, Gender = model.Gender, LicenseExpiry = model.LicenseExpiry, LicenseNumber = model.LicenseNumber, ProfilePic = model.ProfilePic, GSTNumber = model.GSTNumber, BankAccountNumber = model.BankAccountNumber, IFSCCode = model.IFSCCode, ProfileVerified = model.ProfileVerified });
                    }
                    await _transportService.SaveDriverAsync(new DriverViewModel { UserId = model.UserId, FirstName = model.FirstName, MiddleName = model.MiddleName, LastName = model.LastName, Mobile = model.Mobile, TransporterId = model.TransporterId, DOB = model.DOB, Gender = model.Gender, LicenseExpiry = model.LicenseExpiry, LicenseNumber = model.LicenseNumber, ProfilePic = model.ProfilePic }); break;
                case "transporter": await _transportService.SaveTransporterAsync(new TransporterViewModel { UserId = model.UserId, FirstName = model.FirstName, MiddleName = model.MiddleName, LastName = model.LastName, Mobile = model.Mobile, DOB = model.DOB, Gender = model.Gender, LicenseExpiry = model.LicenseExpiry, LicenseNumber = model.LicenseNumber, ProfilePic = model.ProfilePic, GSTNumber = model.GSTNumber, BankAccountNumber = model.BankAccountNumber, IFSCCode = model.IFSCCode, ProfileVerified = model.ProfileVerified }); break;
                case "customer":
                    await _appCustormer.SaveChangeAsync(new CustomerDetailViewModel { UserId = model.UserId, GSTNumber = model.GSTNumber, CompanyName = !string.IsNullOrEmpty(model.Company) ? model.Company : model.FirstName + " " + model.LastName, City = model.City, State = model.State, Pincode = model.Pincode, Address = model.Address });
                    break;
                default:
                    break;
            }
            model.ProfilePic = userResult.ProfilePic;
            return Ok(model);
        }

        [HttpPost("uploadProfile")]
        [AllowAnonymous]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> UploadProfilePic([FromForm] UserProfilePicViewModel userProfile)
        {
            var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), subPath);

            if (!Directory.Exists(uploadFolder))
                Directory.CreateDirectory(uploadFolder);

            var uniqueFileName = $"{userProfile.UserId}_{DateTime.Now.Ticks}_{userProfile.File.FileName}";
            var filePath = Path.Combine(uploadFolder, uniqueFileName);

            var relativePath = $"/uploads/profiles/{uniqueFileName}";

            var userResult = await _userInfoService.UpdateProfilePic(userProfile.UserId.ToString(), relativePath);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await userProfile.File.CopyToAsync(stream);
            }
            userProfile.ProfilePic = relativePath;
            return Ok(userProfile);

        }


        [HttpPost("AddDriver")]
        [AllowAnonymous]
        public async Task<IActionResult> SaveDriverDetail([FromBody] DriverViewModel model)
        {
            var userModel = new UserViewModel
            {
                UserName = model.UserName,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                PhoneNumber = model.PhoneNumber,
                DOB = model.DOB,
                Password = model.Password,
            };

            var userStatus = await _userService.UserRegisterAsync(userModel);
            if (!userStatus.StartsWith("User Registered"))
            {
                return BadRequest(userStatus);
            }
            var accountTypeView = new AccountTypeViewModel { Name = model.RoleName };

            var roles = await _accountTypeService.SaveChangeAsync(accountTypeView);

            var accountType = await _accountTypeService.GetById(0, model.RoleName);

            model.AccountTypeId = accountType.Id;
            var user = await _userService.FindByEmailAsync(model.Email);
            if (user == null)
            { user = await _userService.FindUserByUserName(model.UserName); }
            model.UserId = user.Id;
            var userRoleVM = new RoleViewModel { Name = model.RoleName, Email = model.Email, Password = model.Password };
            var userRoles = await _userService.UpdateUserRoleAsync(userRoleVM);
            string subPath = @"~/uploaddocs/";

            var originalTransporterId = model.TransporterId;
            model.TransporterId = null;

            var userResult = await _userInfoService.SaveAsync(new UserInfoViewModel { TransporterId = null, UserId = model.UserId, FirstName = model.FirstName, AccountTypeId = model.AccountTypeId, AppUserId = model.AppUserId.GetValueOrDefault(), AccountTypeName = model.AccountTypeName, Company = model.Company, DOB = model.DOB, Email = model.Email, GenderId = model.GenderId, FacebookLink = model.FacebookLink, PhoneNumber = model.PhoneNumber, LastName = model.LastName, LicenseExpiry = model.LicenseExpiry, LicenseNumber = model.LicenseNumber, MiddleName = model.MiddleName, Mobile = model.Mobile, Name = model.Name });
            model.ProfileStatus = "PENDING";
            var result = await _transportService.SaveDriverAsync(model);

            if (originalTransporterId.HasValue && originalTransporterId.Value > 0)
            {
                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == originalTransporterId.Value);
                if (transporter != null)
                {
                    var transporterUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == transporter.UserId);
                    var transporterName = transporter.CompanyName ?? "Transporter";
                    var message = $"INVITE|{transporter.Id}|{model.Email}|{transporterName}";
                    var notification = new satguruApp.DLL.Models.Notification
                    {
                        UserId = model.UserId,
                        Message = message,
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };
                    _db.Notifications.Add(notification);
                    await _db.SaveChangesAsync();
                }
            }

            return Ok(result);
        }

        [HttpPost("updateDriverDetail")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateDriveDetail([FromBody] DriverViewModel model)
        {
            var user = await _userService.FindUserByUserId(model.UserId);
            if (user == null) return NotFound("User not found");

            // Update Identity User basic details
            await _userService.UpdateUser(new UserViewModel
            {
                UserName = user.UserName,
                Email = user.Email,
                FirstName = model.FirstName ?? user.FirstName,
                LastName = model.LastName ?? user.LastName,
                PhoneNumber = model.PhoneNumber ?? user.PhoneNumber,
                DOB = model.DOB
            });

            // Update UserInformation (Personal Profile)
            var userInfo = new UserInfoViewModel
            {
                UserId = model.UserId,
                FirstName = model.FirstName,
                LastName = model.LastName,
                PhoneNumber = model.PhoneNumber,
                Mobile = model.Mobile,
                DOB = model.DOB,
                ProfilePic = model.ProfilePic,
                GenderId = model.GenderId,
                Address = model.WhatsAppLink, // Using WhatsAppLink as placeholder for address
                Description = model.PANCardUrl != null ? $"PAN_URL:{model.PANCardUrl}" : null,
                IsOnline = model.IsOnline
            };
            await _userInfoService.SaveAsync(userInfo);

            // Update Driver Detail
            var result = await _transportService.SaveDriverAsync(model);
            var driverDetails = await _transportService.GetDriverDetails(model.UserId);
            var driverId = driverDetails?.Id ?? Guid.Empty;

            // Handle Vehicle Details
            if (!string.IsNullOrEmpty(model.VehicleNumber) && !string.IsNullOrEmpty(model.VehicleName))
            {
                var vehicleVM = new VehicleViewModel
                {
                    TransporterId = model.TransporterId.GetValueOrDefault(),
                    VehicleName = model.VehicleName,
                    VehicleNumber = model.VehicleNumber.ToUpper(),
                    CT_VehicleType = model.CT_VehicleType,
                    CTBodyType = model.CTBodyType,
                    CTTyreType = model.CTTyreType,
                    IsAvailable = true
                };
                await _vehicleService.SaveVehicleAsync(vehicleVM);
            }

            // Mandatory Field Validation for Profile Completion
            bool isLicensePresent = !string.IsNullOrEmpty(model.LicenseNumber);
            bool isVehiclePresent = !string.IsNullOrEmpty(model.VehicleNumber) && !string.IsNullOrEmpty(model.VehicleName);

            var kycRecords = await _transportService.GetDriverKYCAsync(driverId);
            bool isAadhaarDone = kycRecords.Any(x => x.DocumentType == "Aadhaar");

            if (isLicensePresent && isVehiclePresent && isAadhaarDone)
            {
                await _transportService.UpdateProfileStatusAsync(driverId, "Completed");
            }
            else
            {
                await _transportService.UpdateProfileStatusAsync(driverId, "Incomplete");

                // If this was an explicit finalize attempt, return errors
                if (model.Status == "Finalizing")
                {
                    var missing = new List<string>();
                    if (!isLicensePresent) missing.Add("Driving licence number");
                    if (!isVehiclePresent) missing.Add("Vehicle details");
                    if (!isAadhaarDone) missing.Add("Aadhaar document upload");
                    return BadRequest($"Mandatory fields missing: {string.Join(", ", missing)}");
                }
            }

            return Ok(result);
        }

        [HttpPost("updateCustomerDetail")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateCustomerDetail([FromBody] CustomerDetailViewModel model)
        {
            var user = await _userService.FindUserByUserId(model.UserId);
            if (user == null) return NotFound("User not found");

            // Update Identity User basic details
            var names = model.Name?.Split(' ');
            var firstName = names?.Length > 0 ? names[0] : user.FirstName;
            var lastName = names?.Length > 1 ? string.Join(" ", names.Skip(1)) : user.LastName;

            await _userService.UpdateUser(new UserViewModel
            {
                UserName = user.UserName,
                Email = user.Email,
                FirstName = firstName,
                LastName = lastName,
                PhoneNumber = model.Phone ?? user.PhoneNumber
            });

            // Update UserInformation
            await _userInfoService.SaveAsync(new UserInfoViewModel
            {
                UserId = model.UserId,
                FirstName = firstName,
                LastName = lastName,
                PhoneNumber = model.Phone,
                ProfilePic = model.ProfilePic,
                Address = model.Address,
                City = model.City,
                State = model.State,
                Pincode = model.Pincode,
                IsOnline = model.IsOnline
            });

            // Update Customer Detail record (simplifies internal state)
            model.CompanyName = null; // Remove company info for simple customers
            model.GSTNumber = null;
            var result = await _appCustormer.SaveChangeAsync(model);
            return Ok(result);
        }



        [HttpPost("updateTransporterDetail")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateTransporterDetail([FromBody] TransporterViewModel model)
        {
            var user = await _userService.FindUserByUserId(model.UserId);
            if (user == null) return NotFound("User not found");

            await _userService.UpdateUser(new UserViewModel
            {
                UserName = user.UserName,
                Email = user.Email,
                FirstName = model.FirstName ?? user.FirstName,
                LastName = model.LastName ?? user.LastName,
                PhoneNumber = model.PhoneNumber ?? user.PhoneNumber,
                DOB = model.DOB
            });

            var result = await _transportService.SaveTransporterAsync(model);
            return Ok(result);
        }

        [HttpPost("uploadDriverKYC")]
        [AllowAnonymous]
        public async Task<IActionResult> UploadDriverKYC([FromForm] Guid driverId, [FromForm] string documentType, [FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty");

            var ext = Path.GetExtension(file.FileName).ToLower();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx" };
            if (!allowedExtensions.Contains(ext)) return BadRequest("Invalid file format");

            var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/kyc");
            if (!Directory.Exists(uploadFolder)) Directory.CreateDirectory(uploadFolder);

            var fileName = $"{driverId}_{documentType}_{DateTime.Now.Ticks}{ext}";
            var filePath = Path.Combine(uploadFolder, fileName);
            var relativePath = $"/uploads/kyc/{fileName}";

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var kycResult = await _transportService.SaveDriverKYCAsync(new DriverKYCViewModel
            {
                DriverId = driverId,
                DocumentType = documentType,
                DocumentUrl = relativePath
            });

            return Ok(new { DocumentUrl = relativePath });
        }

        [HttpPost("createToken")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTokenAsync([FromBody] TokenRequestViewModel model)
        {
            var result = await _userService.GetTokenAsync(model);
            return Ok(result);
        }
        [HttpPost("addUserRole")]
        [AllowAnonymous]
        public async Task<IActionResult> AddUserRole([FromBody] RoleViewModel model)
        {
            var result = "";// await _userService.UpdateUserRoleAsync(model);
            return Ok(result);
        }
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model)
        {
            var result = await _userService.Login(model);
            return Ok(result);
        }
        [HttpPost("firebaseRegister")]
        [AllowAnonymous]
        public async Task<IActionResult> FirebaseRegister([FromBody] FirebaseAuthRequestViewModel model)
        {
            model.RoleName = model.RoleName.ToLower() == "logistics" ? "customer" : model.RoleName;
            var result = await _userService.FirebaseRegisterAsync(model);

            if (!result.IsAuthenticated && !string.IsNullOrEmpty(result.Message) && result.Message.Contains("already registered"))
            {
                return BadRequest(result.Message);
            }

            if (string.IsNullOrWhiteSpace(result.UserId) || string.IsNullOrWhiteSpace(model.RoleName))
            {
                return Ok(result);
            }

            var accountType = await _accountTypeService.GetById(0, model.RoleName);
            var userInfoModel = new UserInfoViewModel
            {
                UserId = result.UserId,
                RoleName = model.RoleName,
                AccountTypeId = accountType?.Id,
                FirstName = model.FirstName,
                LastName = model.LastName,
                Email = result.Email ?? model.Email,
                UserName = result.UserName ?? model.UserName ?? model.Email,
                PhoneNumber = model.PhoneNumber,
                Company = model.Company,
                GSTNumber = model.GSTNumber,
                DOB = model.DOB,
                AppUserId = result.AppUserId ?? 0,
                IsOnline = model.IsOnline
            };
           
            var userResult = await _userInfoService.AddUserInfoAsync(userInfoModel);
            if (!string.IsNullOrEmpty(userResult.Message))
            {
                model.Message = userResult.Message;
                return Ok(model);
            }

            if (!result.IsAuthenticated && !result.EmailVerified)
            {
                await SyncFirebaseProfileAsync(model, result);
                return Ok(result);
            }

            await SyncFirebaseProfileAsync(model, result);
            return Ok(result);
        }
        [HttpPost("firebaseLogin")]
        [AllowAnonymous]
        public async Task<IActionResult> FirebaseLogin([FromBody] FirebaseAuthRequestViewModel model)
        {
            var result = await _userService.FirebaseLoginAsync(model);
            return Ok(result);
        }
        [HttpGet("getRole")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRole(string roleName)
        {
            var result = await _userService.GetRoleAsync(roleName);
            return Ok(result);
        }
        [HttpGet("getRoles")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRoles(string roleName = "")
        {
            var result = await _userService.GetRolesAsync(roleName);
            return Ok(result);
        }
        [HttpGet("createRoles")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateRole(string roleName)
        {
            var result = await _userService.CreateRoles(roleName);
            return Ok(result);
        }

        [HttpGet]
        public IEnumerable<WeatherForecast> Get()
        {
            return Enumerable.Range(1, 5).Select(index => new WeatherForecast
            {
                Date = DateTime.Now.AddDays(index),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = Summaries[Random.Shared.Next(Summaries.Length)]
            })
            .ToArray();
        }
        [HttpPost("updateUser")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateUser([FromBody] UserInfoViewModel model)
        {
            UserViewModel userModel = new UserViewModel
            {
                UserName = model.UserName,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                PhoneNumber = model.PhoneNumber,
                DOB = model.DOB,
            };
            var result = await _userService.UpdateUser(userModel);
            if (result == "Success")
            {
                var userResult = await _userInfoService.SaveAsync(model);
                if (userResult.Id != null && userResult.Id != Guid.Empty)
                { model.Status = result; }
            }
            return Ok(model);
        }
        [HttpGet("getUserbyId")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserbyId(string userId)
        {
            var result = await _userService.FindUserByUserId(userId);
            var model = await _userInfoService.GetUserDetailbyId(userId);
            model.UserName = result.UserName;
            model.Email = result.Email;
            return Ok(model);
        }
        [HttpPost("getUserList")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserList([FromBody] UserSearchViewModel userSearch = null)
        {
            var model = await _userInfoService.GetUserList(userSearch);
            return Ok(model);
        }




        [HttpPost("getUserDetailList")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserDetailList([FromBody] UserSearchViewModel userSearch = null)
        {
            var model = await _userInfoService.GetUserDetailList(userSearch);
            return Ok(model);
        }
        [HttpGet("getUserDetail/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserDetail(string userId)
        {
            var model = await _userInfoService.GetUserDetail(userId);
            if (model == null)
            {
                return NotFound(new { message = "User not found in the SQL Database." });
            }
            switch (model.AccountTypeName)
            {
                case "Driver":
                    var driverdetail = await _transportService.GetDriverDetails(userId);
                    if (driverdetail != null)
                    {
                        model.LicenseNumber = driverdetail.LicenseNumber;
                        model.LicenseExpiry = driverdetail.LicenseExpiry;
                        model.BankAccountNumber = driverdetail.BankAccountNumber;
                        model.IFSCCode = driverdetail.IFSCCode;
                    }
                    break;
                case "Transporter":
                    var transportDetail = await _transportService.GetTransporterDetails(userId);
                    if (transportDetail != null)
                    {
                        model.BankAccountNumber = transportDetail.BankAccountNumber;
                        model.IFSCCode = transportDetail.IFSCCode;
                        model.GSTNumber = transportDetail.GSTNumber;
                        model.ProfileVerified = transportDetail.ProfileVerified;
                    }
                    break;
                case "Customer": break;
                default:
                    break;
            }

            return Ok(model);
        }
        [HttpPost("changePassword")]
        [AllowAnonymous]
        public async Task<IActionResult> ChangePassword([FromBody] UserInfoViewModel userInfoView)
        {
            UserViewModel userModel = new UserViewModel
            {
                UserName = userInfoView.UserName,
                Email = userInfoView.Email,
                FirstName = userInfoView.FirstName,
                LastName = userInfoView.LastName,
                PhoneNumber = userInfoView.PhoneNumber,
                DOB = userInfoView.DOB,
                Password = userInfoView.Password,
                NewPassword = userInfoView.NewPassword,
            };
            var result = await _userService.ChangePassword(userModel);
            return Ok(new { success = result == "Success", message = result });
        }
        [HttpPost("logoutAllDevices")]
        public async Task<IActionResult> LogoutAllDevices([FromBody] string userId)
        {
            var result = await _userService.LogoutAllDevices(userId);
            return Ok(new { success = result == "Success", message = result });
        }
        [HttpPost("deleteAccount")]
        public async Task<IActionResult> DeleteAccount([FromBody] string userId)
        {
            var result = await _userService.DeleteAccount(userId);
            return Ok(new { success = result == "Success", message = result });
        }
        [HttpPost("contactSupport")]
        [AllowAnonymous]
        public async Task<IActionResult> ContactSupport([FromBody] ContactUsViewModel contactUsView)
        {
            var result = await _userService.FindByEmailAsync(contactUsView.EmailId);
            contactUsView.UserId = result.Id;
            var model = await _userService.SaveContactUsSupport(contactUsView);
            return Ok(model);
        }

        private async Task SyncFirebaseProfileAsync(FirebaseAuthRequestViewModel model, AuthenticationViewModel authResult)
        {
            switch (model.RoleName.ToLower())
            {
                case "driver":
                    if (model.TransporterId == 0)
                    {
                        model.TransporterId = await _transportService.SaveTransporterAsync(new TransporterViewModel { UserId = authResult.UserId, FirstName = model.FirstName,  LastName = model.LastName,  DOB = model.DOB, GSTNumber = model.GSTNumber });
                    }
                    await _transportService.SaveDriverAsync(new DriverViewModel
                    {
                        UserId = authResult.UserId,
                        FirstName = model.FirstName,
                        LastName = model.LastName,
                        PhoneNumber = model.PhoneNumber,
                    });
                    break;
                case "transporter":
                    await _transportService.SaveTransporterAsync(new TransporterViewModel
                    {
                        UserId = authResult.UserId,
                        FirstName = model.FirstName,
                        LastName = model.LastName,
                        PhoneNumber = model.PhoneNumber,
                        GSTNumber = model.GSTNumber,
                        CompanyName = model.Company,
                    });
                    break;
                case "logistics":
                case "customer":
                    await _appCustormer.SaveChangeAsync(new CustomerDetailViewModel
                    {
                        UserId = authResult.UserId,
                        GSTNumber = model.GSTNumber,
                        CompanyName = string.IsNullOrWhiteSpace(model.Company)
                            ? $"{model.FirstName} {model.LastName}".Trim()
                            : model.Company,
                    });
                    break;
            }
        }


    }
}
