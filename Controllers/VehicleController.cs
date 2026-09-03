using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;

namespace navgatix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [RequestSizeLimit(long.MaxValue)]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue, ValueLengthLimit = int.MaxValue)]
    public class VehicleController : ControllerBase
    {
        private readonly IVehicleService _vehicleService;
        private readonly IBookingService _bookingService;
        private readonly SatguruDBContext _db;
        public VehicleController(IVehicleService vehicleService, IBookingService bookingService, SatguruDBContext db)
        {
            _vehicleService = vehicleService;
            _bookingService = bookingService;
            _db = db;
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
        public async Task<IActionResult> UpdateRideStatus(long bookingId, [FromQuery] string status, [FromQuery] Guid? driverId = null, [FromQuery] string? cancelledBy = null)
        {
            return Ok(await _vehicleService.UpdateRideStatusAsync(bookingId, status, driverId, cancelledBy));
        }

        [HttpPost("{bookingId}/processPayment")]
        [AllowAnonymous]
        public async Task<IActionResult> ProcessPayment(long bookingId, [FromQuery] string paymentMethod = "UPI", [FromQuery] string paymentType = "Advance", [FromQuery] string? transactionId = null)
        {
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.IsDeleted != true);
            if (booking == null)
            {
                return NotFound("Booking not found.");
            }

            var statusStr = paymentType == "Advance" ? "Paid (Advance)" : "Paid";
            var txnId = string.IsNullOrWhiteSpace(transactionId) ? $"NAV-UPI-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}" : transactionId;
            var amount = booking.EstimatedFare ?? booking.FinalFare ?? 0;

            if (!string.IsNullOrEmpty(booking.CustomerId))
            {
                _db.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = booking.CustomerId,
                    Title = "Payment Successful",
                    Message = $"PAYMENT_SUCCESS|{bookingId}|Payment of ₹{amount} received via {paymentMethod}!",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (booking.DriverId.HasValue)
            {
                var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == booking.DriverId.Value);
                if (driver != null && !string.IsNullOrEmpty(driver.UserId))
                {
                    _db.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = driver.UserId,
                        Title = "Payment Received",
                        Message = $"PAYMENT_RECEIVED|{bookingId}|{paymentMethod}|{paymentType}|₹{amount}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                isSuccess = true,
                message = "Payment processed successfully.",
                bookingId = booking.Id,
                paymentStatus = statusStr,
                paymentMethod = paymentMethod,
                transactionId = txnId,
                amount = amount
            });
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
        [HttpPatch("{bookingId}/cancelRide")]
        [AllowAnonymous]
        public async Task<IActionResult> CancelRide(long bookingId, [FromQuery] string userId = "")
        {
            return Ok(await _vehicleService.UpdateRideStatusAsync(bookingId, "cancelled", null));
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

        [HttpPost("rateDriver")]
        [AllowAnonymous]
        public async Task<IActionResult> RateDriver([FromQuery] string customerUserId, [FromQuery] string driverUserId, [FromQuery] long bookingId, [FromQuery] decimal score, [FromQuery] string comment)
        {
            if (score < 1 || score > 5)
            {
                return BadRequest("Score must be between 1 and 5.");
            }

            var parsedCustomer = Guid.Parse(customerUserId);
            var parsedDriver = Guid.Parse(driverUserId);

            var existingRating = await _db.UserRatings.FirstOrDefaultAsync(r => r.Booking_Id == bookingId && r.User_Id == parsedCustomer && r.IsDeleted != true);
            if (existingRating != null)
            {
                existingRating.Score = score;
                existingRating.Comment = comment;
                _db.UserRatings.Update(existingRating);
            }
            else
            {
                var newRating = new UserRating
                {
                    User_Id = parsedCustomer,
                    Target_User_Id = parsedDriver,
                    Booking_Id = bookingId,
                    Score = score,
                    Comment = comment,
                    IsDeleted = false
                };
                _db.UserRatings.Add(newRating);
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Rating submitted successfully." });
        }

        [HttpGet("driverAverageRating/{driverUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDriverAverageRating(string driverUserId)
        {
            var parsedDriver = Guid.Parse(driverUserId);
            var ratings = await _db.UserRatings
                .Where(r => r.Target_User_Id == parsedDriver && r.IsDeleted != true)
                .ToListAsync();

            if (!ratings.Any())
            {
                return Ok(new { averageRating = 0.0, totalRatings = 0 });
            }

            var avg = ratings.Average(r => r.Score ?? 0);
            return Ok(new { averageRating = Math.Round(avg, 1), totalRatings = ratings.Count });
        }

        [HttpGet("driverSummaryCard/{driverUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDriverSummaryCard(string driverUserId)
        {
            return Ok(await _vehicleService.GetDriverSummaryCardAsync(driverUserId));
        }
    }
}
