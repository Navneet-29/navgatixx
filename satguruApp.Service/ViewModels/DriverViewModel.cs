using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.ViewModels
{
    public class DriverViewModel
    {
        public Guid? Id { get; set; }
        public long? CustTransId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }

        public int? AppUserId { get; set; }
        public string? MiddleName { get; set; }
        public string? UserName { get; set; }
        public string? Password { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public long? Mobile { get; set; }
        public int? AccountTypeId { get; set; }
        public string? AccountTypeName { get; set; }
        public int? CourseId { get; set; }
        public string? UserId { get; set; }
        public DateTime? DOB { get; set; }
        public bool? IsDeleted { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string? WhatsAppLink { get; set; }
        public string? TwiterLink { get; set; }
        public string? FacebookLink { get; set; }
        public string? InstagramLink { get; set; }
        public string? WebsiteLink { get; set; }
        public string? Company { get; set; }
        public int? GenderId { get; set; }
        public string? Gender { get; set; }
        public string RoleName { get; set; }
        public string? Status { get; set; }
        public string? NewPassword { get; set; }
        public string? Description { get; set; }
        public string? ProfilePic { get; set; }
        public long? TransporterId { get; set; }
        public string? TransporterUserId { get; set; }
        public string? LicenseNumber { get; set; }
        public DateTime? LicenseExpiry { get; set; }
        public string? VehicleName { get; set; }
        public string? VehicleNumber { get; set; }
        public int? CT_VehicleType { get; set; }
        public int? CTBodyType { get; set; }
        public int? CTTyreType { get; set; }
        public string? PANCardUrl { get; set; }
        public string? ProfileStatus { get; set; }
        public bool? IsOnline { get; set; }
        public string? Address { get; set; }
        public string? Pincode { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? IFSCCode { get; set; }
        public double? DriverRating { get; set; }
        public string? RideStatus { get; set; }
        public long? ActiveBookingId { get; set; }
    }
    public class TransporterViewModel : DriverViewModel
    {
        public string? CompanyName { get; set; }
        public string? GSTNumber { get; set; }
        public string? Address { get; set; }
        public string? Pincode { get; set; }
        public string? BankAccountNumber { get; set; }
        public bool? ProfileVerified { get; set; }
    }
}
