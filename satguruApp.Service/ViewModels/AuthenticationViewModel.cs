using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.ViewModels
{
    public class AuthenticationViewModel
    {
        public string? Message { get; set; }
        public bool IsAuthenticated { get; set; }
        public string? UserName { get; set; }
        public string? TransporterName { get; set; }
        public string? CustomerName { get; set; }
        public string? DriverName { get; set; }

        public string? UserId { get; set; }
        public int? AppUserId { get; set; }
        public string? TransporterId { get; set; }
        public Guid? UserInfoId { get; set; }
        public Guid? DriverId { get; set; }
        public long? CustomerId { get; set; }
        public string? Email { get; set; }
        public List<string> Roles { get; set; }
        public string? Token { get; set; }
        public string? LastName { get; set; }
        public string? FirstName { get; set; }
        public bool EmailVerified { get; set; }
        public bool IsNewUser { get; set; }
        public string? RoleName { get; set; }
        public string? ProfilePic { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
