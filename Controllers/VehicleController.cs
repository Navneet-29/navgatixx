using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;

namespace navgatix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleController : ControllerBase
    {
        private readonly IVehicleService _vehicleService;
        private readonly IBookingService _bookingService;
        public VehicleController(IVehicleService vehicleService, IBookingService bookingService)
        {
            _vehicleService = vehicleService;
            _bookingService = bookingService;
        }
        [AllowAnonymous]
        [HttpPost("vehicleRegistration")]
        public async Task<IActionResult> VehicleRegistration([FromBody] VehicleViewModel model)
        {
            await _vehicleService.SaveVehicleAsync(model);
            return Ok(model);
        }
        [AllowAnonymous]
        [HttpGet("getVehicle/{vehicleId}")]
        public async Task<IActionResult> GetVehicle(Guid vehicleId)
        {
            return Ok(await _vehicleService.GetVehicleDetails(vehicleId));
        }
        [AllowAnonymous]
        [HttpPost("getVehicleList")]
        public async Task<IActionResult> getVehicleList([FromBody] VehicleViewModel vehicleView)
        {
            return Ok(await _vehicleService.GetVehicleList(vehicleView));
        }
        [AllowAnonymous]
        [HttpGet("deletevehicle/{vehicleId}/{status}")]
        public async Task<IActionResult> Deletevehicle(Guid vehicleId, bool status=false)
        {
            return Ok(await _vehicleService.Delete(vehicleId, status));
        }
        [HttpPost("bookVehicle")]
        [AllowAnonymous]
        public async Task<IActionResult> BookOfVehicle([FromBody] BookingViewModel model)
        {
            return Ok(await _vehicleService.BookingVehicle(model));
        }
        [HttpPost("matchDriversAndRequestRide")]
        [AllowAnonymous]
        public async Task<IActionResult> MatchDriversAndRequestRide([FromBody] RideMatchingRequestViewModel model)
        {
            return Ok(await _vehicleService.MatchDriversAndSendRideRequestAsync(model));
        }
        [HttpPost("requestRide")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestRide([FromBody] BookingViewModel model)
        {
            return Ok(await _vehicleService.RequestRideAsync(model));
        }
        [HttpPatch("{bookingId}/rideStatus")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateRideStatus(long bookingId, [FromQuery] string status, [FromQuery] Guid? driverId = null)
        {
            return Ok(await _vehicleService.UpdateRideStatusAsync(bookingId, status, driverId));
        }
        [HttpPatch("{bookingId}/rideRequest/reject")]
        [AllowAnonymous]
        public async Task<IActionResult> RejectRideRequest(long bookingId, [FromQuery] string driverUserId)
        {
            return Ok(await _vehicleService.RejectRideRequestAsync(bookingId, driverUserId));
        }
        [HttpPatch("{bookingId}/transporterRideRequest/reject")]
        [AllowAnonymous]
        public async Task<IActionResult> RejectRideRequestByTransporter(long bookingId, [FromQuery] string transporterUserId)
        {
            return Ok(await _vehicleService.RejectRideRequestByTransporterAsync(bookingId, transporterUserId));
        }
        [HttpGet("ride/{bookingId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRide(long bookingId)
        {
            return Ok(await _vehicleService.GetRideAsync(bookingId));
        }
        [HttpPost("cancelbookingVehicleride")]
        [AllowAnonymous]
        public async Task<IActionResult> CancelBookingVehicle([FromBody] BookingViewModel model)
        {
            return Ok(await _vehicleService.CancelBookingVehicleRide(model));
        }
        [HttpPost("bookingVehiclerides")]
        [AllowAnonymous]
        public async Task<IActionResult> BookingVehiclerides(string userId)
        {
            return Ok(await _vehicleService.BookingVehicleRides(userId));
        }
        [HttpGet("driverRides/{driverUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDriverRides(string driverUserId)
        {
            return Ok(await _vehicleService.GetDriverRidesAsync(driverUserId));
        }
        [HttpGet("driverRideRequests/{driverUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDriverRideRequests(string driverUserId)
        {
            return Ok(await _vehicleService.GetDriverRideRequestsAsync(driverUserId));
        }
        [HttpGet("transporterRideRequests/{transporterUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTransporterRideRequests(string transporterUserId)
        {
            return Ok(await _vehicleService.GetTransporterRideRequestsAsync(transporterUserId));
        }
        [HttpPost("saveLiveVehicleTracking")]
        [AllowAnonymous]
        public async Task<IActionResult> SaveLiveVehicleTracking([FromBody] LiveVehicleTrackingViewModel liveVehicle)
        {
            return Ok(await _vehicleService.SaveLiveVehicleTrackings(liveVehicle));
        }
        [HttpPost("getLiveVehicleTracking")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLiveVehicleTracking([FromQuery] Guid vehicleId, [FromQuery] long? bookingId)
        {
            return Ok(await _vehicleService.GetLiveVehicleTrackings(vehicleId, bookingId));
        }
        [HttpPost("getRouteVehicleTracking")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRouteVehicleTracking([FromQuery] Guid vehicleId, [FromQuery] long? bookingId)
        {
            return Ok(await _vehicleService.GetRouteVehicleTrackings(vehicleId, bookingId));
        }

        [HttpGet("tracking/{bookingId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTrackingSnapshot(long bookingId)
        {
            return Ok(await _vehicleService.GetTrackingSnapshotAsync(bookingId));
        }
    }
}
