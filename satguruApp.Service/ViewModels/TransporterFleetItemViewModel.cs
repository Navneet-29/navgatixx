using System;

namespace satguruApp.Service.ViewModels
{
    public class TransporterFleetItemViewModel
    {
        public Guid VehicleId { get; set; }
        public string VehicleNumber { get; set; }
        public string VehicleName { get; set; }
        public string VehicleTypeName { get; set; }

        public Guid? DriverId { get; set; }
        public string DriverName { get; set; }
        public string DriverPhone { get; set; }
        public string DriverUserId { get; set; }

        public string RideStatus { get; set; }
        public string RouteSummary { get; set; }
        public long? ActiveBookingId { get; set; }

        public int VehicleCompletedRides { get; set; }
        public decimal VehicleEarnings { get; set; }
        public int DriverCompletedRides { get; set; }
        public decimal DriverEarnings { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public DateTime? LiveUpdatedAt { get; set; }
        public string LiveStatus { get; set; }

        public decimal? EstimatedFare { get; set; }
        public decimal? FinalFare { get; set; }
        public string PickupAddress { get; set; }
        public string DropAddress { get; set; }
        public string GoodsType { get; set; }
        public decimal DailyEarnings { get; set; }
        public double DriverTodayKm { get; set; }
    }
}
