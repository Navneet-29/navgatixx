using System;
using System.Collections.Generic;

namespace satguruApp.Service.ViewModels
{
    public class RideMatchingRequestViewModel
    {
        public string? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? PickupAddress { get; set; }
        public string? DropAddress { get; set; }
        public decimal? PickupLat { get; set; }
        public decimal? PickupLng { get; set; }
        public decimal? DropLat { get; set; }
        public decimal? DropLng { get; set; }
        public decimal? GoodsWeight { get; set; }
        public string? GoodsType { get; set; }
        public decimal? EstimatedFare { get; set; }
        public DateTime? ScheduledTime { get; set; }
        public int? CT_VehicleType { get; set; }
        public int? CTBodyType { get; set; }
        public int? CTTyreType { get; set; }
        public int RadiusKm { get; set; } = 50;
    }

    public class MatchedDriverViewModel
    {
        public Guid DriverId { get; set; }
        public string? DriverName { get; set; }
        public string? DriverUserId { get; set; }
        public Guid VehicleId { get; set; }
        public string? VehicleNumber { get; set; }
        public double DistanceKm { get; set; }
        public long? TransporterId { get; set; }
    }

    public class RideMatchingResultViewModel
    {
        public long BookingId { get; set; }
        public int RadiusKm { get; set; }
        public int MatchedCount { get; set; }
        public string? Message { get; set; }
        public bool IsSuccess { get; set; }
        public List<MatchedDriverViewModel> MatchedDrivers { get; set; } = new();
    }
}
