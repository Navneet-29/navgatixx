using System;

namespace satguruApp.Service.ViewModels
{
    public class DriverSummaryCardViewModel
    {
        public Guid DriverId { get; set; }
        public string DriverUserId { get; set; } = string.Empty;
        public string DriverName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string ProfileStatus { get; set; } = string.Empty;
        public double AverageRating { get; set; } = 5.0;
        public string AssignedVehicleName { get; set; } = string.Empty;
        public string AssignedVehicleNumber { get; set; } = string.Empty;
        public string DutyStatus { get; set; } = "Available"; // "On Ride" or "Available"
        public bool IsOnRide { get; set; } = false;
        public string CurrentAddress { get; set; } = string.Empty;
        public double? CurrentLat { get; set; }
        public double? CurrentLng { get; set; }

        // Active Ride info if On Ride
        public long? ActiveBookingId { get; set; }
        public string? PickupAddress { get; set; }
        public string? DropAddress { get; set; }
        public decimal? EstimatedFare { get; set; }
        public string? RideStatusName { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public double TodaysTotalKm { get; set; }
    }
}
