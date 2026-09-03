using FirebaseAdmin.Messaging;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class UserInfoService : Repository<ApplicationUser>, IUserInfoService
    {
        public UserInfoService(SatguruDBContext context) : base(context)
        { }
        private SatguruDBContext _db => (SatguruDBContext)_context;

        public async Task<UserInfoViewModel> AddUserInfoAsync(UserInfoViewModel userInfo)
        {
            if (userInfo == null || string.IsNullOrWhiteSpace(userInfo.UserId))
            {
                return userInfo;
            }

            var gender = await _db.Genders.Where(x => x.Name == userInfo.Gender || x.Id == userInfo.GenderId).FirstOrDefaultAsync();
            if (gender == null && !string.IsNullOrEmpty(userInfo.Gender))
            {
                gender = new Gender();
                gender.Name = userInfo.Gender;
                gender.IsDeleted = false;
                _db.Genders.Add(gender);
                await _db.SaveChangesAsync();
            }
            if (gender != null)
            {
                userInfo.GenderId = gender.Id;
            }

            var usrInfo = await _db.UserInformations.FirstOrDefaultAsync(x =>
                (userInfo.Id.HasValue && userInfo.Id != Guid.Empty && x.Id == userInfo.Id.Value) ||
                x.UserId == userInfo.UserId ||
                (!string.IsNullOrWhiteSpace(userInfo.Email) && x.Email.ToLower() == userInfo.Email.ToLower()) ||
                (!string.IsNullOrWhiteSpace(userInfo.PhoneNumber) && x.PhoneNumber == userInfo.PhoneNumber) ||
                (userInfo.Mobile.HasValue && x.Mobile == userInfo.Mobile.Value));

            if (usrInfo != null)
            {
                userInfo.Message = "User Exists already!, please check carefully";
                return userInfo;
            }

            var isNewRecord = usrInfo == null;
            var target = usrInfo ?? new UserInformation
            {
                Id = (userInfo.Id.HasValue && userInfo.Id.Value != Guid.Empty) ? userInfo.Id.Value : Guid.NewGuid(),
                UserId = userInfo.UserId,
                CreatedDate = DateTime.UtcNow
            };

            target.FirstName = userInfo.FirstName ?? target.FirstName;
            target.LastName = userInfo.LastName ?? target.LastName;
            target.Email = userInfo.Email ?? target.Email;
            target.MiddleName = userInfo.MiddleName ?? target.MiddleName ?? string.Empty;
            target.Mobile = userInfo.Mobile ?? target.Mobile;
            target.PhoneNumber = userInfo.PhoneNumber ?? target.PhoneNumber;
            target.FacebookLink = userInfo.FacebookLink ?? target.FacebookLink;
            target.InstagramLink = userInfo.InstagramLink ?? target.InstagramLink;
            target.WhatsAppLink = userInfo.WhatsAppLink ?? target.WhatsAppLink;
            target.AccountTypeId = userInfo.AccountTypeId ?? target.AccountTypeId;
            target.Company = userInfo.Company ?? target.Company;
            target.DOB = userInfo.DOB ?? target.DOB;
            target.GenderId = userInfo.GenderId ?? target.GenderId;
            target.Description = userInfo.Description ?? target.Description;
            target.ProfilePic = userInfo.ProfilePic ?? target.ProfilePic;
            if (!string.IsNullOrEmpty(userInfo.Address))
            {
                target.WhatsAppLink = userInfo.Address;
            }
            target.IsDeleted = false;
            target.UpdatedDate = DateTime.UtcNow;

            if (isNewRecord)
            {
                _db.UserInformations.Add(target);
            }

            await _db.SaveChangesAsync();
            userInfo.Id = target.Id;
            return userInfo;
        }

        public async Task<UserInfoViewModel> SaveAsync(UserInfoViewModel userInfo)
        {
            if (userInfo == null || string.IsNullOrWhiteSpace(userInfo.UserId))
            {
                return userInfo;
            }

            var gender = await _db.Genders.Where(x => x.Name == userInfo.Gender || x.Id == userInfo.GenderId).FirstOrDefaultAsync();
            if (gender == null && !string.IsNullOrEmpty(userInfo.Gender))
            {
                gender = new Gender();
                gender.Name = userInfo.Gender;
                gender.IsDeleted = false;
                _db.Genders.Add(gender);
                await _db.SaveChangesAsync();
            }
            if (gender != null)
            {
                userInfo.GenderId = gender.Id;
            }

            var usrInfo = await _db.UserInformations.FirstOrDefaultAsync(x =>
                (userInfo.Id.HasValue && userInfo.Id != Guid.Empty && x.Id == userInfo.Id.Value) ||
                x.UserId == userInfo.UserId ||
                (!string.IsNullOrWhiteSpace(userInfo.Email) && x.Email.ToLower() == userInfo.Email.ToLower()) ||
                (!string.IsNullOrWhiteSpace(userInfo.PhoneNumber) && x.PhoneNumber == userInfo.PhoneNumber) ||
                (userInfo.Mobile.HasValue && x.Mobile == userInfo.Mobile.Value));

            var isNewRecord = usrInfo == null;
            var target = usrInfo ?? new UserInformation
            {
                Id = (userInfo.Id.HasValue && userInfo.Id.Value != Guid.Empty) ? userInfo.Id.Value : Guid.NewGuid(),
                UserId = userInfo.UserId,
                CreatedDate = DateTime.UtcNow
            };

            target.FirstName = userInfo.FirstName ?? target.FirstName;
            target.LastName = userInfo.LastName ?? target.LastName;
            target.Email = userInfo.Email ?? target.Email;
            target.MiddleName = userInfo.MiddleName ?? target.MiddleName ?? string.Empty;
            target.Mobile = userInfo.Mobile ?? target.Mobile;
            target.PhoneNumber = userInfo.PhoneNumber ?? target.PhoneNumber;
            target.FacebookLink = userInfo.FacebookLink ?? target.FacebookLink;
            target.InstagramLink = userInfo.InstagramLink ?? target.InstagramLink;
            target.WhatsAppLink = userInfo.WhatsAppLink ?? target.WhatsAppLink;
            target.AccountTypeId = userInfo.AccountTypeId ?? target.AccountTypeId;
            target.Company = userInfo.Company ?? target.Company;
            target.DOB = userInfo.DOB ?? target.DOB;
            target.GenderId = userInfo.GenderId ?? target.GenderId;
            target.Description = userInfo.Description ?? target.Description;
            target.ProfilePic = userInfo.ProfilePic ?? target.ProfilePic;
            if (!string.IsNullOrEmpty(userInfo.Address))
            {
                target.WhatsAppLink = userInfo.Address;
            }
            target.IsDeleted = false;
            target.UpdatedDate = DateTime.UtcNow;

            if (isNewRecord)
            {
                _db.UserInformations.Add(target);
            }

            await _db.SaveChangesAsync();
            userInfo.Id = target.Id;
            return userInfo;
        }

        public async Task<int> UpdateProfilePic(string userId, string profilePic)
        {
            var userInfo = await _db.UserInformations.Where(x => x.UserId == userId).FirstOrDefaultAsync();
            if (userInfo != null)
            {
                userInfo.ProfilePic = profilePic;
                return await _db.SaveChangesAsync();
            }
            return 0;
        }

        public async Task<UserInfoViewModel> GetUserDetailbyId(string userId)
        {
            try
            {
                return await (from user in _db.UserInformations
                              join accountType in _db.AccountTypes on user.AccountTypeId equals accountType.Id into accountTypes
                              from accountType in accountTypes.DefaultIfEmpty()
                              join gender in _db.Genders on user.GenderId equals gender.Id into genders
                              from gender in genders.DefaultIfEmpty()
                              where user.UserId == userId && (user.IsDeleted == null || user.IsDeleted == false)
                              select new UserInfoViewModel
                              {
                                  Id = user.Id,
                                  FirstName = user.FirstName,
                                  LastName = user.LastName,
                                  Name = user.FirstName + (!string.IsNullOrEmpty(user.LastName) ? (" " + user.LastName) : ""),
                                  MiddleName = user.MiddleName,
                                  Email = user.Email,
                                  PhoneNumber = user.PhoneNumber,
                                  Mobile = user.Mobile,
                                  AccountTypeId = user.AccountTypeId,
                                  UserId = user.UserId,
                                  DOB = user.DOB,
                                  IsDeleted = user.IsDeleted,
                                  CreatedDate = user.CreatedDate,
                                  UpdatedDate = user.UpdatedDate,
                                  WhatsAppLink = user.WhatsAppLink,
                                  TwiterLink = user.TwiterLink,
                                  FacebookLink = user.FacebookLink,
                                  InstagramLink = user.InstagramLink,
                                  WebsiteLink = user.WebsiteLink,
                                  Company = user.Company,
                                  GenderId = user.GenderId,
                                  Gender = gender.Name,
                                  AccountTypeName = accountType.Name,
                                  Address = user.WhatsAppLink,
                                  ProfilePic = user.ProfilePic,
                                  Description = user.Description,
                                  IsOnline = user.IsOnline
                              }).FirstOrDefaultAsync();

            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<List<UserInfoViewModel>> GetUserList(UserSearchViewModel userSearch)
        {
            var query = from user in _db.UserInformations
                        join accountType in _db.AccountTypes on user.AccountTypeId equals accountType.Id into accountTypes
                        from accountType in accountTypes.DefaultIfEmpty()
                        join gender in _db.Genders on user.GenderId equals gender.Id into genders
                        from gender in genders.DefaultIfEmpty()
                        where (user.IsDeleted == false || user.IsDeleted == null)
                        select new { user, accountType, gender };

            // Apply filters
            if (!string.IsNullOrEmpty(userSearch.RoleName))
            {
                query = query.Where(x => x.accountType.Name == userSearch.RoleName);
            }

            if (!string.IsNullOrEmpty(userSearch.TransporterUserId))
            {
                // To filter drivers for a specific transporter
                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userSearch.TransporterUserId);
                if (transporter != null)
                {
                    var driverUserIds = await _db.Drivers.Where(d => d.TransporterId == transporter.Id).Select(d => d.UserId).ToListAsync();
                    query = query.Where(x => driverUserIds.Contains(x.user.UserId));
                }
            }

            if (userSearch.Mobile != null) query = query.Where(x => x.user.Mobile == userSearch.Mobile);
            if (!string.IsNullOrEmpty(userSearch.Email)) query = query.Where(x => x.user.Email.ToLower() == userSearch.Email.ToLower());
            if (!string.IsNullOrEmpty(userSearch.Name)) query = query.Where(x => (x.user.FirstName + " " + x.user.LastName).ToLower().Contains(userSearch.Name.ToLower()));
            if (!string.IsNullOrEmpty(userSearch.Search)) query = query.Where(x => (x.user.FirstName + " " + x.user.LastName).ToLower().Contains(userSearch.Search.ToLower()) || x.user.Email.ToLower().Contains(userSearch.Search.ToLower()));

            return await query.Select(x => new UserInfoViewModel
            {
                FirstName = x.user.FirstName,
                LastName = x.user.LastName,
                Name = x.user.FirstName + (!string.IsNullOrEmpty(x.user.LastName) ? (" " + x.user.LastName) : ""),
                MiddleName = x.user.MiddleName,
                Email = x.user.Email,
                PhoneNumber = x.user.PhoneNumber,
                Mobile = x.user.Mobile,
                AccountTypeId = x.user.AccountTypeId,
                UserId = x.user.UserId,
                DOB = x.user.DOB,
                IsDeleted = x.user.IsDeleted,
                CreatedDate = x.user.CreatedDate,
                UpdatedDate = x.user.UpdatedDate,
                WhatsAppLink = x.user.WhatsAppLink,
                TwiterLink = x.user.TwiterLink,
                FacebookLink = x.user.FacebookLink,
                InstagramLink = x.user.InstagramLink,
                WebsiteLink = x.user.WebsiteLink,
                Company = x.user.Company,
                GenderId = x.user.GenderId,
                Gender = x.gender.Name,
                AccountTypeName = x.accountType.Name,
                Address = x.user.WhatsAppLink,
                ProfilePic = x.user.ProfilePic,
                Description = x.user.Description,
                IsOnline = x.user.IsOnline
            }).ToListAsync();
        }

        public async Task<List<UserInfoViewModel>> GetUserDetailList(UserSearchViewModel userSearch)
        {
            return await (from user in _db.Users
                          join userInfo in _db.UserInformations on user.Id equals userInfo.UserId
                          join accountType in _db.AccountTypes on userInfo.AccountTypeId equals accountType.Id into accountTypes
                          from accountType in accountTypes.DefaultIfEmpty()
                          join gender in _db.Genders on userInfo.GenderId equals gender.Id into genders
                          from gender in genders.DefaultIfEmpty()
                          where ///accountType.Name.ToUpper() == "WRITER" &&
                         (string.IsNullOrEmpty(userSearch.Search) || (userInfo.PhoneNumber.Contains(userSearch.Search) ||
                         userInfo.FirstName.ToLower().Contains(userSearch.Search.ToLower()) || userInfo.LastName.ToLower().Contains(userSearch.Search.ToLower()))
                           || userInfo.Email.ToLower().Contains(userSearch.Search.ToLower())
                      && (userInfo.IsDeleted == false || userInfo.IsDeleted == null))
                          select new UserInfoViewModel
                          {
                              FirstName = userInfo.FirstName,
                              LastName = userInfo.LastName,
                              Name = userInfo.FirstName + (!string.IsNullOrEmpty(userInfo.LastName) ? (" " + userInfo.LastName) : ""),
                              MiddleName = userInfo.MiddleName,
                              Email = user.Email,
                              PhoneNumber = user.PhoneNumber,
                              Mobile = userInfo.Mobile,
                              AccountTypeId = userInfo.AccountTypeId,
                              UserId = userInfo.UserId,
                              DOB = userInfo.DOB,
                              IsDeleted = userInfo.IsDeleted,
                              CreatedDate = userInfo.CreatedDate,
                              UpdatedDate = userInfo.UpdatedDate,
                              WhatsAppLink = userInfo.WhatsAppLink,
                              TwiterLink = userInfo.TwiterLink,
                              FacebookLink = userInfo.FacebookLink,
                              InstagramLink = userInfo.InstagramLink,
                              WebsiteLink = userInfo.WebsiteLink,
                              Company = userInfo.Company,
                              GenderId = userInfo.GenderId,
                              Gender = gender.Name,
                              Description = userInfo.Description,
                              ProfilePic = userInfo.ProfilePic,
                              Address = userInfo.WhatsAppLink,
                              AccountTypeName = accountType.Name,
                              IsOnline = userInfo.IsOnline
                          }).ToListAsync();
        }

        public async Task<UserInfoViewModel> GetUserDetail(string userId)
        {
            var userDeail = await (from user in _db.Users
                                   join userInfo in _db.UserInformations on user.Id equals userInfo.UserId into userInfos
                                   from userInfo in userInfos.DefaultIfEmpty()
                                   join accountType in _db.AccountTypes on (userInfo != null ? userInfo.AccountTypeId : 0) equals accountType.Id into accountTypes
                                   from accountType in accountTypes.DefaultIfEmpty()
                                   join gender in _db.Genders on (userInfo != null ? userInfo.GenderId : 0) equals gender.Id into genders
                                   from gender in genders.DefaultIfEmpty()
                                   where (userInfo == null || userInfo.IsDeleted == false || userInfo.IsDeleted == null) && user.Id == userId
                                   select new UserInfoViewModel
                                   {
                                       FirstName = userInfo != null ? userInfo.FirstName : user.FirstName,
                                       LastName = userInfo != null ? userInfo.LastName : user.LastName,
                                       Name = (userInfo != null ? userInfo.FirstName : user.FirstName) + (!string.IsNullOrEmpty(userInfo != null ? userInfo.LastName : user.LastName) ? (" " + (userInfo != null ? userInfo.LastName : user.LastName)) : ""),
                                       MiddleName = userInfo != null ? userInfo.MiddleName : "",
                                       Email = user.Email,
                                       PhoneNumber = user.PhoneNumber,
                                       Mobile = userInfo != null ? userInfo.Mobile : null,
                                       AccountTypeId = userInfo != null ? userInfo.AccountTypeId : null,
                                       UserId = user.Id,
                                       DOB = userInfo != null ? userInfo.DOB : null,
                                       IsDeleted = userInfo != null ? userInfo.IsDeleted : false,
                                       CreatedDate = userInfo != null ? userInfo.CreatedDate : null,
                                       UpdatedDate = userInfo != null ? userInfo.UpdatedDate : null,
                                       WhatsAppLink = userInfo != null ? userInfo.WhatsAppLink : "",
                                       TwiterLink = userInfo != null ? userInfo.TwiterLink : "",
                                       FacebookLink = userInfo != null ? userInfo.FacebookLink : "",
                                       InstagramLink = userInfo != null ? userInfo.InstagramLink : "",
                                       WebsiteLink = userInfo != null ? userInfo.WebsiteLink : "",
                                       Company = userInfo != null ? userInfo.Company : "",
                                       GenderId = userInfo != null ? userInfo.GenderId : null,
                                       Gender = gender != null ? gender.Name : "",
                                       AccountTypeName = accountType != null ? accountType.Name : "",
                                       Description = userInfo != null ? userInfo.Description : "",
                                       ProfilePic = userInfo != null ? userInfo.ProfilePic : "",
                                       Address = userInfo != null ? userInfo.WhatsAppLink : "",
                                       IsOnline = userInfo.IsOnline ?? false
                                   }).FirstOrDefaultAsync();

            return userDeail;
        }
    }
}
