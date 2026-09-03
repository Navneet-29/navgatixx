using satguruApp.DLL.Models;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.Services.Interfaces
{
    public interface IVehicleService : IRepository<Vehicle>
    {
        public Task<VehicleViewModel> SaveVehicleAsync(VehicleViewModel driverInfo);
        public Task<VehicleViewModel> GetVehicleDetails(Guid vehicleId);
        public Task<int> Delete(Guid Id, bool isDeleted);
        Task<RideMatchingResultViewModel> MatchDriversAndSendRideRequestAsync(RideMatchingRequestViewModel model);
        public Task<BookingViewModel> BookingVehicle(BookingViewModel model);
        public Task<BookingViewModel> CancelBookingVehicleRide(BookingViewModel model);
        Task<BookingViewModel> RequestRideAsync(BookingViewModel model);
        Task<BookingViewModel> UpdateRideStatusAsync(long bookingId, string status, Guid? driverId = null);
        Task<BookingViewModel> RejectRideRequestAsync(long bookingId, string driverUserId);
        Task<BookingViewModel> RejectRideRequestByTransporterAsync(long bookingId, string transporterUserId);
        Task<BookingViewModel> GetRideAsync(long bookingId);
        Task<List<BookingViewModel>> BookingVehicleRides(string userId);
        Task<List<BookingViewModel>> GetDriverRideRequestsAsync(string driverUserId);
        Task<List<BookingViewModel>> GetTransporterRideRequestsAsync(string transporterUserId);
        Task<List<BookingViewModel>> GetDriverRidesAsync(string driverUserId);
        Task<LiveVehicleTrackingViewModel> SaveLiveVehicleTrackings(LiveVehicleTrackingViewModel liveVehicle);
        Task<List<LiveVehicleTrackingViewModel>> GetLiveVehicleTrackings(Guid vehicleId, long? bookingId);
        Task<RideTrackingSnapshotViewModel> GetTrackingSnapshotAsync(long bookingId);
        Task<List<VehicleViewModel>> GetVehicleList(VehicleViewModel vehicleView);
        Task<List<LiveVehicleTrackingHistoryViewModel>> GetRouteVehicleTrackings(Guid vehicleId, long? bookingId);
        Task<DriverSummaryCardViewModel> GetDriverSummaryCardAsync(string driverUserId);
    }
}
