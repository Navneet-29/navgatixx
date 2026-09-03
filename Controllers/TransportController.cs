using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System.Threading.Tasks;
using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;

namespace navgatix.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [RequestSizeLimit(long.MaxValue)]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue, ValueLengthLimit = int.MaxValue)]
    public class TransportController : ControllerBase
    {
        private readonly ITransportService _transportService;
        private readonly SatguruDBContext _db;

        public TransportController(ITransportService transportService, SatguruDBContext db)
        {
            _transportService = transportService;
            _db = db;
        }

        [HttpGet("getDashboardSummary")]
        [HttpGet("getDashboardSummary/{userId}")]
        public async Task<IActionResult> GetDashboardSummary(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            return Ok(await _transportService.GetDashboardSummary(userId));
        }

        [HttpGet("getFleetOverview")]
        [HttpGet("getFleetOverview/{userId}")]
        public async Task<IActionResult> GetFleetOverview(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            return Ok(await _transportService.GetFleetOverview(userId));
        }

        [HttpGet("getTransporterAnalytics")]
        [HttpGet("getTransporterAnalytics/{userId}")]
        public async Task<IActionResult> GetTransporterAnalytics(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            return Ok(await _transportService.GetTransporterAnalytics(userId));
        }
        
        [HttpPost("getTransporterDetails")]
        public async Task<IActionResult> GetTransporterDetails([FromBody] UserSearchViewModel model)
        {
            return Ok(await _transportService.GetTransporterDetails(model.Id));
        }

        [HttpPost("saveTransporterDetails")]
        public async Task<IActionResult> SaveTransporterDetails([FromBody] TransporterViewModel model)
        {
            return Ok(await _transportService.SaveTransporterAsync(model));
        }

        [HttpGet("getDriversList")]
        [HttpGet("getDriversList/{userId}")]
        public async Task<IActionResult> GetDriversList(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            return Ok(await _transportService.GetDriversList(userId));
        }

        [HttpGet("getVehiclesList")]
        [HttpGet("getVehiclesList/{userId}")]
        public async Task<IActionResult> GetVehiclesList(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            return Ok(await _transportService.GetVehiclesList(userId));
        }

        [HttpGet("getTransporterEarnings")]
        [HttpGet("getTransporterEarnings/{userId}")]
        public async Task<IActionResult> GetTransporterEarnings(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            return Ok(await _transportService.GetTransporterEarningsAsync(userId));
        }

        [HttpPost("sendJoinRequest")]
        public async Task<IActionResult> SendJoinRequest([FromQuery] string driverUserId, [FromQuery] string transporterEmail)
        {
            if (string.IsNullOrEmpty(driverUserId) || string.IsNullOrEmpty(transporterEmail))
                return BadRequest("driverUserId and transporterEmail are required.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUserId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver profile not found.");

            if (driver.TransporterId.HasValue)
                return BadRequest("Driver is already linked to a transporter.");

            var transporterUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == transporterEmail);
            if (transporterUser == null) return NotFound("Transporter not found with this email.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUser.Id);
            if (transporter == null) return NotFound("Transporter details not found.");

            var payload = $"JOIN|{driver.Id}|{transporterUser.Email}|{driver.Name}";
            var exists = await _db.Notifications.AnyAsync(n => n.UserId == transporterUser.Id && n.Message == payload && n.IsRead != true);
            if (exists) return BadRequest("A pending join request is already sent to this transporter.");

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = transporterUser.Id,
                Title = $"Join Request: {driver.Name}",
                Message = payload,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Join request sent successfully." });
        }

        [HttpPost("sendInvitation")]
        public async Task<IActionResult> SendInvitation([FromQuery] string transporterUserId, [FromQuery] string driverEmail)
        {
            if (string.IsNullOrEmpty(transporterUserId) || string.IsNullOrEmpty(driverEmail))
                return BadRequest("transporterUserId and driverEmail are required.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUserId);
            if (transporter == null) return NotFound("Transporter profile not found.");

            var driverUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == driverEmail);
            if (driverUser == null) return NotFound("Driver not found with this email.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUser.Id && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver details not found.");

            if (driver.TransporterId.HasValue)
                return BadRequest("Driver is already linked to a transporter.");

            var transporterName = transporter.CompanyName ?? "Transporter";
            var payload = $"INVITE|{transporter.Id}|{driverUser.Email}|{transporterName}";

            var exists = await _db.Notifications.AnyAsync(n => n.UserId == driverUser.Id && n.Message == payload && n.IsRead != true);
            if (exists) return BadRequest("An invitation has already been sent to this driver.");

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = driverUser.Id,
                Title = $"Invitation: {transporterName}",
                Message = payload,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Invitation sent successfully." });
        }

        [HttpPost("sendLeaveRequest")]
        public async Task<IActionResult> SendLeaveRequest([FromQuery] string driverUserId)
        {
            if (string.IsNullOrEmpty(driverUserId)) return BadRequest("driverUserId is required.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUserId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver details not found.");

            if (!driver.TransporterId.HasValue) return BadRequest("Driver is not linked to any transporter.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value);
            if (transporter == null) return NotFound("Transporter not found.");

            var payload = $"LEAVE|{driver.Id}|{driver.Phone}|{driver.Name}";

            var exists = await _db.Notifications.AnyAsync(n => n.UserId == transporter.UserId && n.Message == payload && n.IsRead != true);
            if (exists) return BadRequest("Leave request is already pending approval.");

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = transporter.UserId,
                Title = $"Leave Request: {driver.Name}",
                Message = payload,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Leave request sent to transporter successfully." });
        }

        [HttpPost("acceptRequest")]
        public async Task<IActionResult> AcceptRequest([FromQuery] Guid notificationId)
        {
            var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
            if (notification == null) return NotFound("Request notification not found.");

            var parts = notification.Message.Split('|');
            if (parts.Length < 4) return BadRequest("Invalid request message payload.");

            var type = parts[0];
            if (type == "JOIN")
            {
                var driverId = Guid.Parse(parts[1]);
                var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == driverId);
                if (driver == null) return NotFound("Driver not found.");

                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == notification.UserId);
                if (transporter == null) return NotFound("Transporter not found.");

                driver.TransporterId = transporter.Id;
                _db.Drivers.Update(driver);

                var successNotification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = driver.UserId,
                    Title = "Join Request Accepted",
                    Message = $"Your join request to {transporter.CompanyName} was accepted.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(successNotification);
            }
            else if (type == "INVITE")
            {
                var transporterId = long.Parse(parts[1]);
                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == transporterId);
                if (transporter == null) return NotFound("Transporter not found.");

                var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == notification.UserId);
                if (driver == null) return NotFound("Driver not found.");

                driver.TransporterId = transporter.Id;
                _db.Drivers.Update(driver);

                var successNotification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = transporter.UserId,
                    Title = "Invitation Accepted",
                    Message = $"Driver {driver.Name} accepted your invitation.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(successNotification);
            }

            notification.IsRead = true;
            _db.Notifications.Update(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Request accepted successfully." });
        }

        [HttpPost("rejectRequest")]
        public async Task<IActionResult> RejectRequest([FromQuery] Guid notificationId)
        {
            var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
            if (notification == null) return NotFound("Request notification not found.");

            var parts = notification.Message.Split('|');
            if (parts.Length >= 4)
            {
                var type = parts[0];
                if (type == "JOIN")
                {
                    var driverId = Guid.Parse(parts[1]);
                    var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == driverId);
                    if (driver != null)
                    {
                        var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == notification.UserId);
                        var transporterName = transporter?.CompanyName ?? "Transporter";
                        var rejectNotification = new Notification
                        {
                            Id = Guid.NewGuid(),
                            UserId = driver.UserId,
                            Title = "Join Request Declined",
                            Message = $"Your join request to {transporterName} was declined.",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        };
                        _db.Notifications.Add(rejectNotification);
                    }
                }
                else if (type == "INVITE")
                {
                    var transporterId = long.Parse(parts[1]);
                    var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == transporterId);
                    if (transporter != null)
                    {
                        var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == notification.UserId);
                        var driverName = driver?.Name ?? "A driver";
                        var rejectNotification = new Notification
                        {
                            Id = Guid.NewGuid(),
                            UserId = transporter.UserId,
                            Title = "Invitation Declined",
                            Message = $"{driverName} declined your invitation.",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        };
                        _db.Notifications.Add(rejectNotification);
                    }
                }
            }

            notification.IsRead = true;
            _db.Notifications.Update(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Request declined successfully." });
        }

        [HttpPost("approveLeaveRequest")]
        public async Task<IActionResult> ApproveLeaveRequest([FromQuery] Guid notificationId)
        {
            var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
            if (notification == null) return NotFound("Leave request not found.");

            var parts = notification.Message.Split('|');
            if (parts.Length < 4 || parts[0] != "LEAVE") return BadRequest("Invalid request message payload.");

            var driverId = Guid.Parse(parts[1]);
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == driverId);
            if (driver == null) return NotFound("Driver not found.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == notification.UserId);
            var transporterName = transporter?.CompanyName ?? "Transporter";

            driver.TransporterId = null;
            _db.Drivers.Update(driver);

            // Unassign any fleet vehicles currently linked to this driver
            var standingBookings = await _db.Bookings
                .Where(b => b.DriverId == driver.Id 
                            && b.VehicleId.HasValue 
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RideCompleted 
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.Cancelled)
                .ToListAsync();

            foreach (var b in standingBookings)
            {
                b.CT_BookingStatus = satguruApp.Service.ViewModels.RideStatus.Cancelled;
                b.IsAvailable = true;
                if (b.VehicleId.HasValue)
                {
                    var veh = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == b.VehicleId.Value);
                    if (veh != null) veh.IsAvailable = true;
                }
            }

            var releaseNotification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = driver.UserId,
                Title = "Released from Fleet",
                Message = $"VEHICLE_UNASSIGN|You have been released from {transporterName}'s fleet and are now working independently.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(releaseNotification);

            notification.IsRead = true;
            _db.Notifications.Update(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Leave request approved. Driver has been released and vehicle unassigned." });
        }

        [HttpPost("markNotificationRead")]
        public async Task<IActionResult> MarkNotificationRead([FromQuery] Guid notificationId)
        {
            var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
            if (notification != null)
            {
                notification.IsRead = true;
                _db.Notifications.Update(notification);
                await _db.SaveChangesAsync();
            }
            return Ok();
        }

        [HttpPost("removeDriver")]
        public async Task<IActionResult> RemoveDriver([FromQuery] string transporterUserId, [FromQuery] string driverId)
        {
            if (string.IsNullOrEmpty(transporterUserId) || string.IsNullOrEmpty(driverId))
                return BadRequest("transporterUserId and driverId are required.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUserId);
            if (transporter == null) return NotFound("Transporter profile not found.");

            var driverGuid = Guid.Parse(driverId);
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == driverGuid && d.TransporterId == transporter.Id);
            if (driver == null) return NotFound("Driver not found in your fleet.");

            driver.TransporterId = null;
            _db.Drivers.Update(driver);

            // Cancel any active bookings and unassign all linked vehicles
            var standingBookings = await _db.Bookings
                .Where(b => b.DriverId == driverGuid 
                            && b.VehicleId.HasValue 
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RideCompleted 
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.Cancelled)
                .ToListAsync();

            foreach (var b in standingBookings)
            {
                b.CT_BookingStatus = satguruApp.Service.ViewModels.RideStatus.Cancelled;
                b.IsAvailable = true;
                if (b.VehicleId.HasValue)
                {
                    var veh = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == b.VehicleId.Value);
                    if (veh != null) veh.IsAvailable = true;
                }
            }

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = driver.UserId,
                Title = "Removed from Fleet",
                Message = $"VEHICLE_UNASSIGN|{transporter.CompanyName ?? "Your transporter"} has removed you from their fleet.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Driver removed and vehicle unassigned successfully." });
        }

        [HttpPost("unassignDriver")]
        public async Task<IActionResult> UnassignDriver([FromQuery] string transporterUserId, [FromQuery] string driverId)
        {
            if (string.IsNullOrEmpty(transporterUserId) || string.IsNullOrEmpty(driverId))
                return BadRequest("transporterUserId and driverId are required.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUserId);
            if (transporter == null) return NotFound("Transporter profile not found.");

            var driverGuid = Guid.Parse(driverId);
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == driverGuid && d.TransporterId == transporter.Id);
            if (driver == null) return NotFound("Driver not found in your fleet.");

            // Cancel all active standing or assigned bookings for this driver
            var activeAssignments = await _db.Bookings
                .Where(b => b.DriverId == driverGuid 
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RideCompleted 
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.Cancelled)
                .ToListAsync();

            foreach (var b in activeAssignments)
            {
                b.CT_BookingStatus = satguruApp.Service.ViewModels.RideStatus.Cancelled;
                b.IsAvailable = true;
                if (b.VehicleId.HasValue)
                {
                    var veh = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == b.VehicleId.Value);
                    if (veh != null)
                    {
                        veh.IsAvailable = true;
                    }
                }
            }

            if (!string.IsNullOrEmpty(driver.UserId))
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = driver.UserId,
                    Title = "Vehicle Unassigned",
                    Message = "VEHICLE_UNASSIGN|Vehicle assignment has been removed by your transporter.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(notification);
            }

            await _db.SaveChangesAsync();

            return Ok(new { message = "Driver unassigned successfully." });
        }

        [HttpGet("getRelationshipNotifications")]
        public async Task<IActionResult> GetRelationshipNotifications([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");

            var validUserIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { userId };
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId || t.Id.ToString() == userId);
            if (transporter != null)
            {
                if (!string.IsNullOrEmpty(transporter.UserId)) validUserIds.Add(transporter.UserId);
                validUserIds.Add(transporter.Id.ToString());
            }

            var notifications = await _db.Notifications
                .Where(n => validUserIds.Contains(n.UserId) && n.IsRead != true)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var relationshipNotifications = notifications.Where(n =>
                n.Message != null && (
                n.Message.StartsWith("JOIN|") ||
                n.Message.StartsWith("INVITE|") ||
                n.Message.StartsWith("LEAVE|") ||
                n.Message.StartsWith("SOS|") ||
                n.Message.StartsWith("DRIVER_ACCEPT_ORDER|") ||
                n.Message.StartsWith("DRIVER_REJECT_ORDER|") ||
                n.Message.StartsWith("RIDE_CANCELLED_BY_DRIVER|") ||
                n.Message.StartsWith("RIDE_CANCELLED_BY_CUSTOMER|") ||
                n.Message.StartsWith("RIDE_CANCELLED_BY_TRANSPORTER|") ||
                n.Message.StartsWith("VEHICLE_ASSIGN|") ||
                n.Message.StartsWith("ASSIGN_SHIPMENT|") ||
                n.Message.StartsWith("CHAT_MESSAGE|") ||
                n.Message.StartsWith("CHAT_MESSAGE_DIRECT|")
            )).ToList();

            return Ok(relationshipNotifications);
        }

        [HttpGet("getDriverActiveTransporter")]
        public async Task<IActionResult> GetDriverActiveTransporter([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == userId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver not found.");

            if (!driver.TransporterId.HasValue) return Ok(new { isIndependent = true });

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value);
            if (transporter == null) return Ok(new { isIndependent = true });

            var transporterUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == transporter.UserId);

            return Ok(new {
                isIndependent = false,
                transporterId = transporter.Id,
                transporterUserId = transporter.UserId,
                companyName = transporter.CompanyName,
                email = transporterUser?.Email,
                phone = transporterUser?.PhoneNumber
            });
        }

        [HttpGet("getDriverActiveVehicle")]
        public async Task<IActionResult> GetDriverActiveVehicle([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == userId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver not found.");

            var assignment = await _db.Bookings
                .Where(b => b.DriverId == driver.Id 
                            && b.VehicleId.HasValue 
                            && b.CustomerId == null
                            && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.Cancelled)
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();

            if (assignment == null || !assignment.VehicleId.HasValue)
            {
                // Fallback to in-progress customer trip
                assignment = await _db.Bookings
                    .Where(b => b.DriverId == driver.Id 
                                && b.VehicleId.HasValue 
                                && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RideCompleted
                                && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.Cancelled)
                    .OrderByDescending(b => b.CreatedAt)
                    .FirstOrDefaultAsync();
            }

            if (assignment == null || !assignment.VehicleId.HasValue) return Ok(new { vehicleId = (Guid?)null });

            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == assignment.VehicleId.Value && v.IsDeleted != true);
            if (vehicle == null) return Ok(new { vehicleId = (Guid?)null });

            // If driver is independent, they should only see vehicles they personally registered, not previous transporter fleet vehicles
            if (!driver.TransporterId.HasValue && vehicle.TransporterId.HasValue)
            {
                return Ok(new { vehicleId = (Guid?)null });
            }

            return Ok(new { 
                vehicleId = vehicle.Id,
                vehicleName = vehicle.VehicleName,
                vehicleNumber = vehicle.VehicleNumber,
                capacityTons = vehicle.CapacityTons,
                rcNumber = vehicle.RCNumber,
                ctBodyType = vehicle.CTBodyType,
                ctTyreType = vehicle.CTTyreType,
                ctVehicleType = vehicle.CT_VehicleType,
                assignedAt = assignment.CreatedAt
            });
        }

        [HttpGet("debugSystemState")]
        public async Task<IActionResult> DebugSystemState()
        {
            var drivers = await _db.Drivers.Select(d => new { d.Id, d.Name, d.UserId, d.TransporterId, d.IsDeleted }).ToListAsync();
            var vehicles = await _db.Vehicles.Select(v => new { v.Id, v.VehicleNumber, v.VehicleName, v.TransporterId, v.IsAvailable, v.IsDeleted, v.CurrentLatitude, v.CurrentLongitude }).ToListAsync();
            var trackings = await _db.LiveVehicleTrackings.Select(t => new { t.VehicleId, t.LastLatitude, t.LastLongitude, t.LastUpdated }).ToListAsync();
            var users = await _db.Users.Select(u => new { u.Id, u.UserName, u.Email }).ToListAsync();
            var notifications = await _db.Notifications.OrderByDescending(n => n.CreatedAt).Take(20).Select(n => new { n.UserId, n.Title, n.Message, n.CreatedAt }).ToListAsync();
            var bookings = await _db.Bookings.OrderByDescending(b => b.CreatedAt).Take(10).Select(b => new { b.Id, b.CustomerName, b.DriverId, b.VehicleId, b.CT_BookingStatus, b.PickupAddress }).ToListAsync();

            return Ok(new { drivers, vehicles, trackings, users, notifications, bookings });
        }

        [HttpGet("getTransporterOutboundInvitations")]
        public async Task<IActionResult> GetTransporterOutboundInvitations([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return NotFound("Transporter not found.");

            var prefix = $"INVITE|{transporter.Id}|";
            var notifications = await _db.Notifications
                .Where(n => n.Message.StartsWith(prefix) && n.IsRead != true)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notifications);
        }

        [HttpGet("getDriverOutboundJoinRequests")]
        public async Task<IActionResult> GetDriverOutboundJoinRequests([FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == userId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver not found.");

            var prefix = $"JOIN|{driver.Id}|";
            var notifications = await _db.Notifications
                .Where(n => n.Message.StartsWith(prefix) && n.IsRead != true)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notifications);
        }

        [HttpPost("acceptShipmentAsTransporter")]
        public async Task<IActionResult> AcceptShipmentAsTransporter([FromQuery] string transporterUserId, [FromQuery] long bookingId)
        {
            if (string.IsNullOrEmpty(transporterUserId)) return BadRequest("transporterUserId is required.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUserId);
            if (transporter == null) return NotFound("Transporter not found.");

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.IsDeleted != true);
            if (booking == null) return NotFound("Booking not found.");

            if (booking.DriverId.HasValue || booking.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RequestForRide)
            {
                return BadRequest("Shipment is already assigned.");
            }

            var existingClaim = await _db.Notifications
                .Where(n => n.Message.StartsWith($"CLAIM|{bookingId}|") && n.IsRead != true)
                .OrderByDescending(n => n.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingClaim != null)
            {
                if (existingClaim.Message.StartsWith($"CLAIM|{bookingId}|{transporter.Id}"))
                {
                    // Already claimed by this same transporter, return success
                    return Ok(new { message = "Shipment already claimed by you. Assign a driver to proceed." });
                }
                return BadRequest(new { message = "Shipment already claimed by another transporter." });
            }

            var claimMessage = $"CLAIM|{bookingId}|{transporter.Id}";
            var notification = new satguruApp.DLL.Models.Notification
            {
                UserId = transporterUserId,
                Message = claimMessage,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                Title = "Shipment Claimed"
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Shipment successfully claimed by you. Now assign a driver to complete." });
        }

        [HttpPost("assignTransporterBookingToDriver")]
        public async Task<IActionResult> AssignTransporterBookingToDriver([FromQuery] string transporterUserId, [FromQuery] long bookingId, [FromQuery] Guid driverId)
        {
            if (string.IsNullOrEmpty(transporterUserId)) return BadRequest("transporterUserId is required.");

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUserId);
            if (transporter == null) return NotFound("Transporter not found.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == driverId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver not found.");

            if (driver.TransporterId != transporter.Id)
            {
                return BadRequest("Driver does not belong to your transporter fleet.");
            }

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.IsDeleted != true);
            if (booking == null) return NotFound("Booking not found.");

            if (booking.DriverId.HasValue)
            {
                return BadRequest("Shipment already assigned.");
            }

            var claimPrefix = $"CLAIM|{bookingId}|{transporter.Id}";
            var claimed = await _db.Notifications.AnyAsync(n => n.Message.StartsWith(claimPrefix));
            if (!claimed)
            {
                return BadRequest("You must accept/claim the shipment first before assigning a driver.");
            }

            if (string.IsNullOrEmpty(driver.UserId))
            {
                return BadRequest("Driver does not have a user account mapped.");
            }

            var assignMessage = $"ASSIGN_SHIPMENT|{bookingId}|{transporter.Id}|{transporter.CompanyName}";
            var notification = new satguruApp.DLL.Models.Notification
            {
                UserId = driver.UserId,
                Message = assignMessage,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                Title = "New Shipment Assignment"
            };

            _db.Notifications.Add(notification);

            if (!string.IsNullOrEmpty(booking.CustomerId))
            {
                var cNotif = new satguruApp.DLL.Models.Notification
                {
                    UserId = booking.CustomerId,
                    Message = $"DRIVER_ASSIGNED|{bookingId}|{driver.Name}|{driver.Phone}|{booking.PickupAddress} ➔ {booking.DropAddress}",
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false,
                    Title = "Driver Assigned to Your Order"
                };
                _db.Notifications.Add(cNotif);
            }

            await _db.SaveChangesAsync();

            return Ok(new { message = "Shipment assigned to driver successfully. Awaiting driver acceptance." });
        }

        [HttpPost("rejectTransporterBooking")]
        public async Task<IActionResult> RejectTransporterBooking([FromQuery] string transporterUserId, [FromQuery] long bookingId)
        {
            if (string.IsNullOrEmpty(transporterUserId)) return BadRequest("transporterUserId is required.");

            var claimNotifs = await _db.Notifications
                .Where(n => n.Message != null && n.Message.StartsWith($"CLAIM|{bookingId}|"))
                .ToListAsync();

            foreach (var n in claimNotifs)
            {
                n.IsRead = true;
            }

            var assignNotifs = await _db.Notifications
                .Where(n => n.Message != null && n.Message.StartsWith($"ASSIGN_SHIPMENT|{bookingId}|"))
                .ToListAsync();

            foreach (var n in assignNotifs)
            {
                n.IsRead = true;
            }

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.IsDeleted != true);
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == transporterUserId || t.Id.ToString() == transporterUserId);
            if (booking != null)
            {
                string tName = transporter?.CompanyName ?? "Transporter";
                if (!string.IsNullOrWhiteSpace(booking.CustomerId))
                {
                    _db.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = booking.CustomerId,
                        Title = "Ride Cancelled by Transporter",
                        Message = $"RIDE_CANCELLED_BY_TRANSPORTER|{bookingId}|{tName}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (booking.DriverId.HasValue)
                {
                    var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == booking.DriverId.Value);
                    if (driver != null && !string.IsNullOrWhiteSpace(driver.UserId))
                    {
                        _db.Notifications.Add(new Notification
                        {
                            Id = Guid.NewGuid(),
                            UserId = driver.UserId,
                            Title = "Ride Cancelled by Transporter",
                            Message = $"RIDE_CANCELLED_BY_TRANSPORTER|{bookingId}|{tName}",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                await _db.SaveChangesAsync();
            }

            return Ok(new { message = "Transporter claim released successfully." });
        }

        [HttpPost("acceptShipmentAsDriver")]
        public async Task<IActionResult> AcceptShipmentAsDriver([FromQuery] string driverUserId, [FromQuery] long bookingId)
        {
            if (string.IsNullOrEmpty(driverUserId)) return BadRequest("driverUserId is required.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUserId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver not found.");

            using (var transaction = await _db.Database.BeginTransactionAsync())
            {
                try
                {
                    var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.IsDeleted != true);
                    if (booking == null)
                    {
                        return NotFound("Booking not found.");
                    }

                    if (booking.DriverId.HasValue || booking.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RequestForRide)
                    {
                        return BadRequest("Shipment already assigned.");
                    }

                    var claimPrefix = $"CLAIM|{bookingId}|";
                    var claimNotif = await _db.Notifications.FirstOrDefaultAsync(n => n.Message.StartsWith(claimPrefix) && n.IsRead != true);
                    if (claimNotif != null)
                    {
                        var parts = claimNotif.Message.Split('|');
                        var transporterId = long.Parse(parts[2]);

                        if (driver.TransporterId.HasValue && driver.TransporterId.Value != transporterId)
                        {
                            return BadRequest("Shipment claimed by another transporter and not assigned to your fleet.");
                        }
                    }

                    booking.DriverId = driver.Id;
                    booking.CT_BookingStatus = satguruApp.Service.ViewModels.RideStatus.DriverAssigned;
                    booking.IsAvailable = false;

                    // Mark assignment or ride request notifications as read for this driver
                    var driverNotifs = await _db.Notifications
                        .Where(n => n.UserId == driverUserId 
                                 && (n.Message.StartsWith($"ASSIGN_SHIPMENT|{bookingId}|") 
                                     || n.Message.StartsWith($"RIDE_REQUEST|{bookingId}") 
                                     || n.Message.Contains($"|{bookingId}|") 
                                     || n.Message.Contains($"|{bookingId}"))
                                 && n.IsRead != true)
                        .ToListAsync();
                    foreach (var n in driverNotifs)
                    {
                        n.IsRead = true;
                    }

                    var driverVehicleBooking = await _db.Bookings
                        .Where(b => b.DriverId == driver.Id 
                                    && b.VehicleId.HasValue 
                                    && b.CustomerId == null 
                                    && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.RideCompleted 
                                    && b.CT_BookingStatus != satguruApp.Service.ViewModels.RideStatus.Cancelled)
                        .OrderByDescending(b => b.CreatedAt)
                        .FirstOrDefaultAsync();
                    if (driverVehicleBooking != null)
                    {
                        booking.VehicleId = driverVehicleBooking.VehicleId;
                    }

                    // 1. Mark all pending notifications for this booking as read so popup immediately disappears from all other drivers and transporters
                    var pendingBookingNotifs = await _db.Notifications
                        .Where(n => (n.Title == "New Ride Request" || n.Title == "New Shipment Assignment" || n.Title == "New Order Request Received")
                                    && n.IsRead != true
                                    && n.Message != null
                                    && (n.Message.Contains($"Ride #{booking.Id}") 
                                        || n.Message.StartsWith($"CLAIM|{booking.Id}|") 
                                        || n.Message.StartsWith($"ASSIGN_SHIPMENT|{booking.Id}|")
                                        || n.Message.StartsWith($"NEW_ORDER_REQUEST|{booking.Id}|")))
                        .ToListAsync();

                    foreach (var n in pendingBookingNotifs)
                    {
                        n.IsRead = true;
                        _db.Notifications.Update(n);
                    }

                    // 2. Notify Transporter that driver accepted the assignment
                    if (driver.TransporterId.HasValue)
                    {
                        var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value);
                        if (transporter != null)
                        {
                            var tNotif = new satguruApp.DLL.Models.Notification
                            {
                                Id = Guid.NewGuid(),
                                UserId = transporter.UserId,
                                Message = $"DRIVER_ACCEPT_ORDER|{booking.Id}|{driver.Name}|{booking.PickupAddress} ➔ {booking.DropAddress}|{booking.EstimatedFare}",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false,
                                Title = "Driver Accepted Order"
                            };
                            _db.Notifications.Add(tNotif);
                        }
                    }

                    // 3. Notify Customer that driver is assigned
                    if (!string.IsNullOrEmpty(booking.CustomerId))
                    {
                        var cNotif = new satguruApp.DLL.Models.Notification
                        {
                            Id = Guid.NewGuid(),
                            UserId = booking.CustomerId,
                            Message = $"DRIVER_ASSIGNED|{booking.Id}|{driver.Name}|{driver.Phone}|{booking.PickupAddress} ➔ {booking.DropAddress}",
                            CreatedAt = DateTime.UtcNow,
                            IsRead = false,
                            Title = "Driver Assigned to Your Order"
                        };
                        _db.Notifications.Add(cNotif);
                    }

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { message = "Shipment successfully assigned to you!" });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, "Error locking the shipment assignment.");
                }
            }
        }

        [HttpPost("sendNotification")]
        public async Task<IActionResult> SendNotification([FromQuery] string userId, [FromQuery] string message, [FromQuery] string title)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("userId is required.");
            var notification = new satguruApp.DLL.Models.Notification
            {
                UserId = userId,
                Message = message,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                Title = title
            };
            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpPost("toggleDriverOnlineStatus")]
        public async Task<IActionResult> ToggleDriverOnlineStatus([FromQuery] Guid? vehicleId, [FromQuery] bool isOnline, [FromQuery] string? driverUserId)
        {
            if (!string.IsNullOrEmpty(driverUserId))
            {
                var userInfo = await _db.UserInformations.FirstOrDefaultAsync(x => x.UserId != null && x.UserId.ToLower() == driverUserId.ToLower());
                if (userInfo != null)
                {
                    userInfo.IsOnline = isOnline;
                    _db.UserInformations.Update(userInfo);
                }
            }

            if (vehicleId.HasValue && vehicleId.Value != Guid.Empty)
            {
                var tracking = await _db.LiveVehicleTrackings.FirstOrDefaultAsync(x => x.VehicleId == vehicleId.Value && x.IsDeleted != true);
                if (tracking != null)
                {
                    if (isOnline)
                    {
                        tracking.LastUpdated = DateTime.UtcNow;
                    }
                    else
                    {
                        tracking.LastUpdated = DateTime.UtcNow.AddMinutes(-30);
                    }
                    _db.LiveVehicleTrackings.Update(tracking);
                }
                else
                {
                    var newTracking = new satguruApp.DLL.Models.LiveVehicleTracking
                    {
                        VehicleId = vehicleId.Value,
                        LastUpdated = isOnline ? DateTime.UtcNow : DateTime.UtcNow.AddMinutes(-30),
                        LastLatitude = 0,
                        LastLongitude = 0,
                        IsDeleted = false
                    };
                    _db.LiveVehicleTrackings.Add(newTracking);
                }
            }

            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("getDriverAssignedVehicle/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDriverAssignedVehicle(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("userId is required.");

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == userId && d.IsDeleted != true);
            if (driver == null) return NotFound("Driver not found.");

            // Find most recent active vehicle assignment from Bookings
            var assignedBooking = await _db.Bookings
                .Where(b => b.DriverId == driver.Id && b.VehicleId != null && b.IsDeleted != true && b.CT_BookingStatus != 6) // Exclude cancelled (6 = RideStatus.Cancelled)
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();

            Vehicle vehicle = null;
            if (assignedBooking != null && assignedBooking.VehicleId.HasValue)
            {
                vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == assignedBooking.VehicleId.Value && v.IsDeleted != true);
            }

            if (vehicle == null && !string.IsNullOrEmpty(userId))
            {
                vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => (v.TransporterId == null || v.TransporterId == 0) && v.CreatedBy != null && v.CreatedBy.ToString() == userId && v.IsDeleted != true);
            }

            if (vehicle == null)
            {
                return Ok(new { isAssigned = false, vehicle = (object)null });
            }

            var vehType = await _db.CommonTypes.FirstOrDefaultAsync(ct => ct.Id == vehicle.CT_VehicleType);
            var bodyType = await _db.CommonTypes.FirstOrDefaultAsync(ct => ct.Id == vehicle.CTBodyType);
            var tyreType = await _db.CommonTypes.FirstOrDefaultAsync(ct => ct.Id == vehicle.CTTyreType);

            return Ok(new
            {
                isAssigned = true,
                vehicle = new
                {
                    id = vehicle.Id,
                    vehicleName = vehicle.VehicleName ?? "Assigned Fleet Vehicle",
                    registrationNumber = vehicle.VehicleNumber,
                    vehicleType = vehType?.Name ?? "Truck",
                    bodyType = bodyType?.Name,
                    tyreType = tyreType?.Name,
                    capacity = vehicle.CapacityTons,
                    assignedAt = assignedBooking.CreatedAt
                }
            });
        }

        [HttpPost("toggleDriverOnlineStatus")]
        public async Task<IActionResult> ToggleDriverOnlineStatus([FromQuery] string vehicleId, [FromQuery] bool isOnline, [FromQuery] string driverUserId)
        {
            if (!isOnline && !string.IsNullOrWhiteSpace(driverUserId))
            {
                var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUserId && d.IsDeleted != true);
                if (driver != null)
                {
                    var activeDeliveryStatuses = new[]
                    {
                        (int)satguruApp.Service.ViewModels.RideStatus.DriverAssigned,
                        (int)satguruApp.Service.ViewModels.RideStatus.DriverArriving,
                        (int)satguruApp.Service.ViewModels.RideStatus.RideStarted
                    };

                    var hasActiveRide = await _db.Bookings.AnyAsync(b => b.DriverId == driver.Id && b.CT_BookingStatus.HasValue && activeDeliveryStatuses.Contains(b.CT_BookingStatus.Value) && b.IsDeleted != true);
                    if (hasActiveRide)
                    {
                        return BadRequest(new { message = "Location tracking cannot be turned off while delivering an active shipment." });
                    }
                }
            }

            return Ok(new { success = true, isOnline = isOnline });
        }

        [HttpGet("getPendingVerifications")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPendingVerifications()
        {
            var pendingDrivers = await (from d in _db.Drivers
                                        join u in _db.Users on d.UserId equals u.Id
                                        where (d.ProfileStatus == "PENDING" || d.ProfileStatus == "SUBMITTED") && d.IsDeleted != true
                                        select new
                                        {
                                            id = d.Id.ToString(),
                                            userId = d.UserId,
                                            name = (u.FirstName + " " + u.LastName).Trim(),
                                            email = u.Email,
                                            phone = u.PhoneNumber,
                                            role = "Driver",
                                            profileStatus = d.ProfileStatus ?? "PENDING"
                                        }).ToListAsync();

            var pendingTransporters = await (from t in _db.TransporterDetails
                                              join u in _db.Users on t.UserId equals u.Id
                                              where (t.ProfileVerified == false || t.ProfileVerified == null) && t.IsDeleted != true
                                              select new
                                              {
                                                  id = t.Id.ToString(),
                                                  userId = t.UserId,
                                                  name = t.CompanyName ?? (u.FirstName + " " + u.LastName).Trim(),
                                                  email = u.Email,
                                                  phone = u.PhoneNumber,
                                                  role = "Transporter",
                                                  profileStatus = "PENDING"
                                              }).ToListAsync();

            return Ok(new
            {
                drivers = pendingDrivers,
                transporters = pendingTransporters
            });
        }

        [HttpPost("approveProfile")]
        [AllowAnonymous]
        public async Task<IActionResult> ApproveProfile([FromQuery] string userId, [FromQuery] string role, [FromQuery] string action)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("userId is required.");
            var isApprove = string.Equals(action, "approve", StringComparison.OrdinalIgnoreCase);

            if (string.Equals(role, "Driver", StringComparison.OrdinalIgnoreCase))
            {
                var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == userId && d.IsDeleted != true);
                if (driver != null)
                {
                    driver.ProfileStatus = isApprove ? "APPROVED" : "REJECTED";
                    _db.Drivers.Update(driver);
                }
            }
            else if (string.Equals(role, "Transporter", StringComparison.OrdinalIgnoreCase))
            {
                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId && t.IsDeleted != true);
                if (transporter != null)
                {
                    transporter.ProfileVerified = isApprove;
                    _db.TransporterDetails.Update(transporter);
                }
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = isApprove ? "Profile approved successfully!" : "Profile request rejected." });
        }
    }
}
