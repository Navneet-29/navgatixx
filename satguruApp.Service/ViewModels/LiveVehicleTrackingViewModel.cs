using satguruApp.DLL.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.ViewModels
{
    public class LiveVehicleTrackingViewModel
    {
        public long Id { get; set; }

        public bool? IsDeleted { get; set; }

        public Guid? VehicleId { get; set; }
        public string? VehicleNumber { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        public DateTime? LastUpdated { get; set; }
        public string? Message   { get; set; }
        public string? DeviceId { get; set; }
        public long? BookingId { get; set; }
        public string UserId { get; set; }
        public double? DistanceRemainingKm { get; set; }
        public int? EstimatedArrivalMinutes { get; set; }
        public decimal? Speed { get; set; }
        public decimal? Heading { get; set; }

    }
}
