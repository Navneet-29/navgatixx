using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class VehicleService : Repository<Vehicle>, IVehicleService
    {
        private readonly IFirebasePushService _firebasePushService;
        private readonly ITrackingNotificationService _trackingNotificationService;
        private readonly ILocationService _locationService;

        public VehicleService(SatguruDBContext context, IFirebasePushService firebasePushService, ITrackingNotificationService trackingNotificationService, ILocationService locationService) : base(context)
        {
            _firebasePushService = firebasePushService;
            _trackingNotificationService = trackingNotificationService;
            _locationService = locationService;
        }
        private SatguruDBContext _db => (SatguruDBContext)_context;

        public VehicleService(SatguruDBContext context) : this(context, new NullFirebasePushService(), null, null)
        { }


        public async Task<VehicleViewModel> SaveVehicleAsync(VehicleViewModel vehicleView)
        {
            var saveCnt = 0;
            try
            {
                if (string.IsNullOrEmpty(vehicleView.VehicleNumber))
                {
                    vehicleView.Message = "Vehicle number is required.";
                    return vehicleView;
                }

                if (string.IsNullOrEmpty(vehicleView.VehicleName))
                {
                    vehicleView.Message = "Vehicle name is required.";
                    return vehicleView;
                }

                var vehicleVM = await (from vehicle in _db.Vehicles where (vehicle.Id == vehicleView.Id || (vehicle.VehicleNumber.ToLower() == vehicleView.VehicleNumber.ToLower())) select vehicle).FirstOrDefaultAsync();
                if (vehicleVM == null)
                {
                    vehicleVM = new Vehicle();
                    vehicleVM.Id = Guid.NewGuid();
                    vehicleVM.TransporterId = vehicleView.TransporterId;

                    // Resolve TransporterId from UserId if not provided
                    if (vehicleVM.TransporterId == 0 && !string.IsNullOrEmpty(vehicleView.UserId))
                    {
                        var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == vehicleView.UserId);
                        if (transporter != null)
                        {
                            vehicleVM.TransporterId = transporter.Id;
                        }
                    }

                    vehicleVM.VehicleName = vehicleView.VehicleName;
                    vehicleVM.CurrentLatitude = vehicleView.CurrentLatitude;
                    vehicleVM.RCNumber = vehicleView.RCNumber;
                    vehicleVM.CurrentLongitude = vehicleView.CurrentLongitude;
                    vehicleVM.SizeCubicMeters = vehicleView.SizeCubicMeters;
                    vehicleVM.CapacityTons = vehicleView.CapacityTons;
                    vehicleVM.InsuranceExpiry = vehicleView.InsuranceExpiry;
                    vehicleVM.RoadTaxExpiry = vehicleView.RoadTaxExpiry;
                    vehicleVM.IsAvailable = vehicleView.IsAvailable;
                    vehicleVM.UploadPhoneUrl = vehicleView.UploadPhoneUrl;
                    vehicleVM.VehicleNumber = vehicleView.VehicleNumber;
                    vehicleVM.CT_VehicleType = vehicleView.CT_VehicleType;
                    vehicleVM.CTBodyType = vehicleView.CTBodyType;
                    vehicleVM.CTTyreType = vehicleView.CTTyreType;
                    vehicleVM.IsDeleted = false;
                    _db.Vehicles.Add(vehicleVM);
                }
                else
                {
                    if (vehicleView.TransporterId > 0)
                    {
                        vehicleVM.TransporterId = vehicleView.TransporterId;
                    }
                    else if (!string.IsNullOrEmpty(vehicleView.UserId))
                    {
                        var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == vehicleView.UserId);
                        if (transporter != null)
                        {
                            vehicleVM.TransporterId = transporter.Id;
                        }
                    }
                    vehicleView.Id = vehicleVM.Id;
                    vehicleVM.VehicleName = vehicleView.VehicleName;
                    vehicleVM.CurrentLatitude = vehicleView.CurrentLatitude;
                    vehicleVM.RCNumber = vehicleView.RCNumber;
                    vehicleVM.CurrentLongitude = vehicleView.CurrentLongitude;
                    vehicleVM.SizeCubicMeters = vehicleView.SizeCubicMeters;
                    vehicleVM.CapacityTons = vehicleView.CapacityTons;
                    vehicleVM.InsuranceExpiry = vehicleView.InsuranceExpiry;
                    vehicleVM.RoadTaxExpiry = vehicleView.RoadTaxExpiry;
                    vehicleVM.IsAvailable = vehicleView.IsAvailable;
                    vehicleVM.UploadPhoneUrl = vehicleView.UploadPhoneUrl;
                    vehicleVM.VehicleNumber = vehicleView.VehicleNumber;
                    vehicleVM.CT_VehicleType = vehicleView.CT_VehicleType;
                    vehicleVM.CTBodyType = vehicleView.CTBodyType;
                    vehicleVM.CTTyreType = vehicleView.CTTyreType;
                    vehicleVM.IsDeleted = false;
                }
                saveCnt = await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {

            }
            if (saveCnt > 0)
                vehicleView.Message = "Success";
            else
                vehicleView.Message = "Failed";
            return vehicleView;
        }
        public async Task<VehicleViewModel> GetVehicleDetails(Guid vehicleId)
        {
            var vehicleVM = await (from vehicle in _db.Vehicles
                                   join trans in _db.TransporterDetails on vehicle.TransporterId equals trans.Id
                                   join cmn in _db.CommonTypes on vehicle.CT_VehicleType equals cmn.Id into vType
                                   from cmn in vType.DefaultIfEmpty()
                                   join cmnbdy in _db.CommonTypes on vehicle.CTBodyType equals cmnbdy.Id into VbodyType
                                   from cmnbdy in VbodyType.DefaultIfEmpty()
                                   where vehicle.Id == vehicleId
                                   select new VehicleViewModel
                                   {
                                       Id = vehicle.Id,
                                       CapacityTons = vehicle.CapacityTons,
                                       CurrentLatitude = vehicle.CurrentLatitude,
                                       CurrentLongitude = vehicle.CurrentLongitude,
                                       InsuranceExpiry = vehicle.InsuranceExpiry,
                                       IsAvailable = vehicle.IsAvailable,
                                       IsDeleted = vehicle.IsDeleted,
                                       TransporterName = trans.CompanyName,
                                       PermitExpiry = vehicle.PermitExpiry,
                                       RCNumber = vehicle.RCNumber,
                                       RoadTaxExpiry = vehicle.RoadTaxExpiry,
                                       SizeCubicMeters = vehicle.SizeCubicMeters,
                                       TransporterId = vehicle.TransporterId.GetValueOrDefault(),
                                       UploadPhoneUrl = vehicle.UploadPhoneUrl,
                                       VehicleNumber = vehicle.VehicleNumber,
                                       CT_VehicleType = vehicle.CT_VehicleType,
                                       VehicleTypeName = cmn.Name,
                                       CTBodyType = vehicle.CTBodyType,
                                       BodyTypeName = cmnbdy.Name,
                                   }).FirstOrDefaultAsync();
            return vehicleVM;
        }
        public async Task<int> Delete(Guid Id, bool isDeleted)
        {
            var vehicleVM = await (from vehicle in _db.Vehicles where vehicle.Id == Id select vehicle).FirstOrDefaultAsync();
            if (vehicleVM != null)
            {
                vehicleVM.IsDeleted = isDeleted;
            }
            return await _db.SaveChangesAsync();
        }

        public async Task<BookingViewModel> BookingVehicle(BookingViewModel model)
        {
            var vehicle = await _db.Vehicles.Where(x => x.Id == model.VehicleId && (x.IsAvailable == true || x.IsAvailable == null)).FirstOrDefaultAsync();
            if (vehicle != null)
            {
                vehicle.IsAvailable = false;
                _db.Vehicles.Update(vehicle);
                var validDriverId = await ResolveValidDriverIdAsync(model.DriverId);
                var bookingExists = await _db.Bookings.FirstOrDefaultAsync(x =>
                    x.VehicleId == model.VehicleId &&
                    x.DriverId == validDriverId &&
                    x.CustomerId == model.CustomerId &&
                    x.CT_BookingStatus != RideStatus.RideCompleted &&
                    x.CT_BookingStatus != RideStatus.Cancelled);
                if (bookingExists == null)
                {
                    bookingExists = new Booking
                    {
                        VehicleId = model.VehicleId,
                        CustomerId = model.CustomerId,
                        DriverId = validDriverId,
                        PickupAddress = model.PickupAddress,
                        PickupLat = model.PickupLat,
                        PickupLng = model.PickupLng,
                        DropAddress = model.DropAddress,
                        DropLat = model.DropLat,
                        DropLng = model.DropLng,
                        GoodsType = model.GoodsType,
                        GoodsWeight = model.GoodsWeight,
                        EstimatedFare = model.EstimatedFare,
                        FinalFare = model.FinalFare,
                        CT_BookingStatus = model.CT_BookingStatus,
                        ScheduledTime = model.ScheduledTime,
                        CreatedAt = DateTime.UtcNow,
                        IsAvailable = true,
                        IsDeleted = false,
                        DeptStateId = model.DeptStateId,
                        DeptCityId = model.DeptCityId,
                        ArrivalStateId = model.ArrivalStateId,
                        ArrivalCityId = model.ArrivalCityId,
                        CustomerName = model.CustomerName,
                        CT_VehicleType = model.CT_VehicleType,
                        CTBodyType = model.CTBodyType,
                        CTTyreType = model.CTTyreType,
                    };
                    _db.Bookings.Add(bookingExists);
                }
                await _db.SaveChangesAsync();
                model = MapBookingToViewModel(bookingExists);
                model.Message = "Success";
            }
            else
            {
                model.Message = "Vehicle is not available for booking.";
            }
            return model;
        }
        public async Task<BookingViewModel> CancelBookingVehicleRide(BookingViewModel model)
        {
            var booking = await _db.Bookings.FirstOrDefaultAsync(x => x.Id == model.Id && x.IsDeleted != true);
            if (booking != null)
            {
                booking.CT_BookingStatus = RideStatus.Cancelled;
                booking.IsAvailable = true;
                _db.Bookings.Update(booking);
                if (booking.VehicleId.HasValue)
                {
                    var vehicle = await _db.Vehicles.FirstOrDefaultAsync(x => x.Id == booking.VehicleId.Value);
                    if (vehicle != null)
                    {
                        vehicle.IsAvailable = true;
                        _db.Vehicles.Update(vehicle);
                    }
                }
                await _db.SaveChangesAsync();

                string cancelledByRole = !string.IsNullOrWhiteSpace(model.CustomerId) && model.CustomerId == booking.CustomerId ? "Customer" : "Driver";
                string cancellingUserName = model.CustomerName ?? model.DriverName ?? cancelledByRole;
                await NotifyCancellationAsync(booking, cancelledByRole, cancellingUserName);

                model.Message = "Your Booking has been cancelled.";
            }
            else
            {
                model.Message = "Booking not found or already cancelled.";
            }
            return model;
        }

        public async Task NotifyCancellationAsync(Booking booking, string cancelledByRole, string cancellingUserName)
        {
            if (booking == null) return;

            long bookingId = booking.Id;
            string cName = string.IsNullOrWhiteSpace(cancellingUserName) ? cancelledByRole : cancellingUserName;

            // 1. Notify Customer if Customer was not the one who cancelled
            if (cancelledByRole != "Customer" && !string.IsNullOrWhiteSpace(booking.CustomerId))
            {
                string msgPayload = cancelledByRole == "Driver" 
                    ? $"RIDE_CANCELLED_BY_DRIVER|{bookingId}|{cName}" 
                    : $"RIDE_CANCELLED_BY_TRANSPORTER|{bookingId}|{cName}";

                string title = cancelledByRole == "Driver" ? "Ride Cancelled by Driver" : "Ride Cancelled by Transporter";
                string body = $"Shipment #{bookingId} was cancelled by {cancelledByRole} {cName}.";

                var notif = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = booking.CustomerId,
                    Title = title,
                    Message = msgPayload,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(notif);
                await SafePushToUserAsync(booking.CustomerId, new PushNotificationPayload { Title = title, Body = body, Data = CreatePushData(bookingId, "ride_cancelled", "cancelled") });
            }

            // 2. Identify assigned / candidate Driver
            Driver? assignedDriver = null;
            if (booking.DriverId.HasValue)
            {
                assignedDriver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == booking.DriverId.Value && d.IsDeleted != true);
            }
            if (assignedDriver == null)
            {
                var assignNotif = await _db.Notifications.FirstOrDefaultAsync(n => n.Message != null && n.Message.StartsWith($"ASSIGN_SHIPMENT|{bookingId}|"));
                if (assignNotif != null && !string.IsNullOrWhiteSpace(assignNotif.UserId))
                {
                    assignedDriver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == assignNotif.UserId && d.IsDeleted != true);
                }
            }

            // 3. Notify Driver if Driver was not the one who cancelled
            if (cancelledByRole != "Driver" && assignedDriver != null && !string.IsNullOrWhiteSpace(assignedDriver.UserId))
            {
                string msgPayload = cancelledByRole == "Customer" 
                    ? $"RIDE_CANCELLED_BY_CUSTOMER|{bookingId}|{cName}" 
                    : $"RIDE_CANCELLED_BY_TRANSPORTER|{bookingId}|{cName}";

                string title = cancelledByRole == "Customer" ? "Ride Cancelled by Customer" : "Ride Cancelled by Transporter";
                string body = $"Shipment #{bookingId} was cancelled by {cancelledByRole} {cName}.";

                var notif = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = assignedDriver.UserId,
                    Title = title,
                    Message = msgPayload,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(notif);
                await SafePushToUserAsync(assignedDriver.UserId, new PushNotificationPayload { Title = title, Body = body, Data = CreatePushData(bookingId, "ride_cancelled", "cancelled") });
            }

            // 4. Notify Transporter (if Transporter claimed/assigned or if Driver belongs to Transporter fleet)
            TransporterDetail? transporter = null;
            if (assignedDriver != null && assignedDriver.TransporterId.HasValue)
            {
                transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == assignedDriver.TransporterId.Value && t.IsDeleted != true);
            }
            if (transporter == null)
            {
                var claimNotif = await _db.Notifications.FirstOrDefaultAsync(n => n.Title == "Shipment Claimed" && n.Message != null && n.Message.StartsWith($"CLAIM|{bookingId}|"));
                if (claimNotif != null)
                {
                    var parts = claimNotif.Message.Split('|');
                    if (parts.Length > 2 && long.TryParse(parts[2], out var tId))
                    {
                        transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == tId && t.IsDeleted != true);
                    }
                }
            }
            if (transporter == null)
            {
                var assignNotif = await _db.Notifications.FirstOrDefaultAsync(n => n.Message != null && n.Message.StartsWith($"ASSIGN_SHIPMENT|{bookingId}|"));
                if (assignNotif != null)
                {
                    var parts = assignNotif.Message.Split('|');
                    if (parts.Length > 2 && long.TryParse(parts[2], out var tId))
                    {
                        transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == tId && t.IsDeleted != true);
                    }
                }
            }

            if (cancelledByRole != "Transporter" && transporter != null && !string.IsNullOrWhiteSpace(transporter.UserId))
            {
                string msgPayload = cancelledByRole == "Driver" 
                    ? $"RIDE_CANCELLED_BY_DRIVER|{bookingId}|{cName}" 
                    : $"RIDE_CANCELLED_BY_CUSTOMER|{bookingId}|{cName}";

                string title = cancelledByRole == "Driver" ? "Fleet Driver Cancelled Ride" : "Customer Cancelled Shipment";
                string body = $"Shipment #{bookingId} was cancelled by {cancelledByRole} {cName}.";

                var notif = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = transporter.UserId,
                    Title = title,
                    Message = msgPayload,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Notifications.Add(notif);
            }

            await _db.SaveChangesAsync();
        }
        public async Task<List<BookingViewModel>> BookingVehicleRides(string userId)
        {
            var bookings = await _db.Bookings
                .Where(book => book.CustomerId == userId && (book.IsDeleted == null || book.IsDeleted == false))
                .Select(book => new BookingViewModel
                {
                    Id = book.Id,
                    CustomerId = book.CustomerId,
                    DriverId = book.DriverId,
                    DriverName = book.Driver != null ? book.Driver.Name : string.Empty,
                    DriverUserId = book.Driver != null ? book.Driver.UserId : string.Empty,
                    PickupAddress = book.PickupAddress,
                    PickupLat = book.PickupLat,
                    PickupLng = book.PickupLng,
                    DropAddress = book.DropAddress,
                    DropLat = book.DropLat,
                    DropLng = book.DropLng,
                    GoodsType = book.GoodsType,
                    GoodsWeight = book.GoodsWeight,
                    EstimatedFare = book.EstimatedFare,
                    FinalFare = book.FinalFare,
                    CT_BookingStatus = book.CT_BookingStatus,
                    RideStatus = RideStatus.ToName(book.CT_BookingStatus),
                    ScheduledTime = book.ScheduledTime,
                    CreatedAt = book.CreatedAt,
                    IsAvailable = book.IsAvailable,
                    IsDeleted = book.IsDeleted,
                }).ToListAsync();
            if (bookings.Any())
            {
                return bookings;
            }
            else
            {
                return new List<BookingViewModel>() { new BookingViewModel { Message = "You haven't any booking or cancelled your booking" } };
            }
        }
        public async Task<List<BookingViewModel>> GetDriverRideRequestsAsync(string driverUserId)
        {
            if (string.IsNullOrWhiteSpace(driverUserId))
            {
                return new List<BookingViewModel> { new BookingViewModel { Message = "Driver user id is required." } };
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => 
                (d.UserId == driverUserId || d.Id.ToString() == driverUserId || (d.UserId != null && d.UserId.ToLower() == driverUserId.ToLower())) 
                && d.IsDeleted != true);

            var driverUserIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(driverUserId)) driverUserIds.Add(driverUserId);
            if (driver != null)
            {
                if (!string.IsNullOrWhiteSpace(driver.UserId)) driverUserIds.Add(driver.UserId);
                driverUserIds.Add(driver.Id.ToString());
            }

            // Fetch ALL unread notifications
            var unreadNotifs = await _db.Notifications
                .Where(x => x.IsRead != true && x.Message != null)
                .Select(x => new { x.UserId, x.Title, x.Message })
                .ToListAsync();

            var assignedBookingIds = new HashSet<long>();
            var requestedBookingIds = new HashSet<long>();

            foreach (var n in unreadNotifs)
            {
                var msg = n.Message;
                if (string.IsNullOrWhiteSpace(msg)) continue;

                var bid = ParseBookingIdFromNotification(msg);
                if (bid <= 0) continue;

                bool isDirectForDriver = driverUserIds.Contains(n.UserId);
                bool isTransporterMsg = false;

                if (msg.StartsWith("ASSIGN_SHIPMENT|"))
                {
                    var parts = msg.Split('|');
                    if (isDirectForDriver)
                    {
                        isTransporterMsg = true;
                    }
                    else if (driver != null && driver.TransporterId.HasValue && parts.Length > 2 && long.TryParse(parts[2], out var tId) && tId == driver.TransporterId.Value)
                    {
                        isTransporterMsg = true;
                    }

                    if (isTransporterMsg)
                    {
                        assignedBookingIds.Add(bid);
                    }
                }
                else if (isDirectForDriver)
                {
                    requestedBookingIds.Add(bid);
                }
            }

            var bookingIds = new HashSet<long>(requestedBookingIds);
            bookingIds.UnionWith(assignedBookingIds);

            Console.WriteLine($"[DEBUG_DR] driverUserId: '{driverUserId}', driver.Id: '{driver?.Id}'");
            Console.WriteLine($"[DEBUG_DR] bookingIds: {string.Join(",", bookingIds)}");
            Console.WriteLine($"[DEBUG_DR] assignedBookingIds: {string.Join(",", assignedBookingIds)}");

            if (!bookingIds.Any())
            {
                return new List<BookingViewModel>();
            }

            // Identify ALL claimed bookings (claimed by ANY transporter)
            var claimedBookingNotifs = await _db.Notifications
                .Where(n => n.Title == "Shipment Claimed" && n.Message != null && n.Message.StartsWith("CLAIM|"))
                .Select(n => n.Message)
                .ToListAsync();

            var allClaimedIds = claimedBookingNotifs
                .Select(msg => {
                    var parts = msg.Split('|');
                    return parts.Length > 1 && long.TryParse(parts[1], out var bid) ? bid : 0;
                })
                .Where(id => id > 0)
                .ToHashSet();

            Console.WriteLine($"[DEBUG_DR] allClaimedIds: {string.Join(",", allClaimedIds)}");

            // Exclude ALL claimed bookings UNLESS THIS specific driver was assigned by the transporter (assignedBookingIds contains it)
            var excludeClaimedIds = new HashSet<long>(allClaimedIds);
            excludeClaimedIds.ExceptWith(assignedBookingIds);

            Console.WriteLine($"[DEBUG_DR] excludeClaimedIds: {string.Join(",", excludeClaimedIds)}");

            var rawResults = await _db.Bookings
                .Where(book => (bookingIds.Contains(book.Id) || assignedBookingIds.Contains(book.Id))
                    && !excludeClaimedIds.Contains(book.Id)
                    && book.IsDeleted != true
                    && book.CT_BookingStatus == RideStatus.RequestForRide
                    && !book.DriverId.HasValue)
                .OrderByDescending(book => book.CreatedAt)
                .Select(book => new BookingViewModel
                {
                    Id = book.Id,
                    CustomerId = book.CustomerId,
                    CustomerName = book.CustomerName,
                    VehicleId = book.VehicleId,
                    DriverId = book.DriverId,
                    PickupAddress = book.PickupAddress,
                    PickupLat = book.PickupLat,
                    PickupLng = book.PickupLng,
                    DropAddress = book.DropAddress,
                    DropLat = book.DropLat,
                    DropLng = book.DropLng,
                    GoodsType = book.GoodsType,
                    GoodsWeight = book.GoodsWeight,
                    EstimatedFare = book.EstimatedFare,
                    FinalFare = book.FinalFare,
                    CT_BookingStatus = book.CT_BookingStatus,
                    RideStatus = RideStatus.ToName(book.CT_BookingStatus),
                    ScheduledTime = book.ScheduledTime,
                    CreatedAt = book.CreatedAt,
                    IsAvailable = book.IsAvailable,
                    IsDeleted = book.IsDeleted,
                    CT_VehicleType = book.CT_VehicleType,
                    CTBodyType = book.CTBodyType,
                    CTTyreType = book.CTTyreType,
                })
                .ToListAsync();

            Vehicle? driverVehicle = null;
            if (driver != null)
            {
                var assignedBooking = await _db.Bookings
                    .Where(b => b.DriverId == driver.Id && b.VehicleId.HasValue && b.IsDeleted != true && b.CT_BookingStatus != RideStatus.Cancelled)
                    .OrderByDescending(b => b.CreatedAt)
                    .FirstOrDefaultAsync();

                if (assignedBooking != null && assignedBooking.VehicleId.HasValue)
                {
                    driverVehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == assignedBooking.VehicleId.Value && v.IsDeleted != true);
                }

                if (driverVehicle == null && driver.TransporterId.HasValue)
                {
                    driverVehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.TransporterId == driver.TransporterId.Value && v.IsDeleted != true);
                }

                if (driverVehicle == null && !string.IsNullOrEmpty(driver.UserId))
                {
                    driverVehicle = await _db.Vehicles.FirstOrDefaultAsync(v => (v.TransporterId == null || v.TransporterId == 0) && v.CreatedBy != null && v.CreatedBy.ToString() == driver.UserId && v.IsDeleted != true);
                }
            }

            string? transporterName = null;
            if (driver != null && driver.TransporterId.HasValue)
            {
                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value);
                if (transporter != null)
                {
                    transporterName = !string.IsNullOrWhiteSpace(transporter.CompanyName) ? transporter.CompanyName : "Your Transporter";
                }
            }

            // Fetch all CommonTypes to resolve vehicle, body, and tyre type names
            var commonTypesDict = await _db.CommonTypes
                .ToDictionaryAsync(ct => ct.Id, ct => ct.Name);

            var results = new List<BookingViewModel>();
            foreach (var r in rawResults)
            {
                bool isAssignedByTransporter = assignedBookingIds.Contains(r.Id) 
                    || (r.DriverId.HasValue && driver != null && r.DriverId == driver.Id);

                // Populate human-readable requirement names for driver view
                if (r.CT_VehicleType.HasValue && commonTypesDict.TryGetValue(r.CT_VehicleType.Value, out var vName))
                    r.VehicleTypeName = vName;
                if (r.CTBodyType.HasValue && commonTypesDict.TryGetValue(r.CTBodyType.Value, out var bName))
                    r.BodyTypeName = bName;
                if (r.CTTyreType.HasValue && commonTypesDict.TryGetValue(r.CTTyreType.Value, out var tName))
                    r.TyreTypeName = tName;

                // Vehicle Matching Filter:
                // For general requests (not assigned directly by transporter), check strict requirements (Vehicle ID, Vehicle Type, Payload Capacity)
                if (!isAssignedByTransporter && driverVehicle != null)
                {
                    // 1. If customer booked a specific vehicle ID
                    if (r.VehicleId.HasValue && r.VehicleId.Value != Guid.Empty && r.VehicleId.Value != driverVehicle.Id)
                    {
                        continue; // Skip: requested vehicle does not match driver's vehicle
                    }

                    // 2. If customer specified a Vehicle Type (2 Wheeler / 3 Wheeler / Truck etc.)
                    if (r.CT_VehicleType.HasValue && r.CT_VehicleType.Value > 0 && driverVehicle.CT_VehicleType.HasValue && driverVehicle.CT_VehicleType.Value != r.CT_VehicleType.Value)
                    {
                        continue; // Skip: vehicle type mismatch
                    }

                    // 3. If goods weight exceeds vehicle capacity
                    if (r.GoodsWeight.HasValue && r.GoodsWeight.Value > 0 && driverVehicle.CapacityTons.HasValue && driverVehicle.CapacityTons.Value > 0)
                    {
                        var capacityKg = (double)driverVehicle.CapacityTons.Value * 1000.0;
                        if ((double)r.GoodsWeight.Value > capacityKg)
                        {
                            continue; // Skip: weight exceeds vehicle payload capacity
                        }
                    }
                }

                if (isAssignedByTransporter)
                {
                    r.IsTransporterAssigned = true;
                    r.TransporterName = transporterName ?? "Your Transporter";
                }
                else
                {
                    r.IsTransporterAssigned = false;
                    r.TransporterName = null;
                }

                results.Add(r);
            }

            Console.WriteLine($"[DEBUG_DR] results count: {results.Count}");
            return results;
        }

        public async Task<List<BookingViewModel>> GetTransporterRideRequestsAsync(string transporterUserId)
        {
            if (string.IsNullOrWhiteSpace(transporterUserId))
            {
                return new List<BookingViewModel> { new BookingViewModel { Message = "Transporter user id is required." } };
            }

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(x => x.UserId == transporterUserId);
            if (transporter == null) return new List<BookingViewModel>();

            var driverUserIds = await _db.Drivers
                .Where(d => d.TransporterId == transporter.Id && d.IsDeleted != true && d.UserId != null)
                .Select(d => d.UserId)
                .ToListAsync();

            if (!driverUserIds.Any()) return new List<BookingViewModel>();

            var pendingBookingIds = await _db.Notifications
                .Where(x => driverUserIds.Contains(x.UserId) && x.Title == "New Ride Request" && x.IsRead != true)
                .Select(x => x.Message)
                .ToListAsync();

            var bookingIds = pendingBookingIds
                .Select(ParseBookingIdFromNotification)
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (!bookingIds.Any()) return new List<BookingViewModel>();

            // Exclude claimed bookings
            var claimedBookingIds = await _db.Notifications
                .Where(n => n.Title == "Shipment Claimed" && n.Message.StartsWith("CLAIM|"))
                .Select(n => n.Message)
                .ToListAsync();

            var claimedIds = claimedBookingIds
                .Select(msg => {
                    var parts = msg.Split('|');
                    return parts.Length > 1 && long.TryParse(parts[1], out var bid) ? bid : 0;
                })
                .Where(id => id > 0)
                .ToHashSet();

            return await _db.Bookings
                .Where(book => bookingIds.Contains(book.Id)
                    && !claimedIds.Contains(book.Id)
                    && book.IsDeleted != true
                    && book.CT_BookingStatus == RideStatus.RequestForRide
                    && !book.DriverId.HasValue)
                .OrderByDescending(book => book.CreatedAt)
                .Select(book => new BookingViewModel
                {
                    Id = book.Id,
                    CustomerId = book.CustomerId,
                    CustomerName = book.CustomerName,
                    VehicleId = book.VehicleId,
                    DriverId = book.DriverId,
                    PickupAddress = book.PickupAddress,
                    PickupLat = book.PickupLat,
                    PickupLng = book.PickupLng,
                    DropAddress = book.DropAddress,
                    DropLat = book.DropLat,
                    DropLng = book.DropLng,
                    GoodsType = book.GoodsType,
                    GoodsWeight = book.GoodsWeight,
                    EstimatedFare = book.EstimatedFare,
                    FinalFare = book.FinalFare,
                    CT_BookingStatus = book.CT_BookingStatus,
                    RideStatus = RideStatus.ToName(book.CT_BookingStatus),
                    ScheduledTime = book.ScheduledTime,
                    CreatedAt = book.CreatedAt,
                    IsAvailable = book.IsAvailable,
                    IsDeleted = book.IsDeleted,
                })
                .ToListAsync();
        }

        public async Task<List<BookingViewModel>> GetDriverRidesAsync(string driverUserId)
        {
            if (string.IsNullOrWhiteSpace(driverUserId))
            {
                return new List<BookingViewModel> { new BookingViewModel { Message = "Driver user id is required." } };
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(x => x.UserId == driverUserId && x.IsDeleted != true);
            if (driver == null)
            {
                return new List<BookingViewModel> { new BookingViewModel { Message = "Driver not found." } };
            }

            var bookings = await _db.Bookings
                .Where(book => book.DriverId == driver.Id && book.IsDeleted != true)
                .OrderByDescending(book => book.CreatedAt)
                .Select(book => new BookingViewModel
                {
                    Id = book.Id,
                    CustomerId = book.CustomerId,
                    CustomerName = book.CustomerName,
                    VehicleId = book.VehicleId,
                    DriverId = book.DriverId,
                    PickupAddress = book.PickupAddress,
                    PickupLat = book.PickupLat,
                    PickupLng = book.PickupLng,
                    DropAddress = book.DropAddress,
                    DropLat = book.DropLat,
                    DropLng = book.DropLng,
                    GoodsType = book.GoodsType,
                    GoodsWeight = book.GoodsWeight,
                    EstimatedFare = book.EstimatedFare,
                    FinalFare = book.FinalFare,
                    CT_BookingStatus = book.CT_BookingStatus,
                    RideStatus = RideStatus.ToName(book.CT_BookingStatus),
                    ScheduledTime = book.ScheduledTime,
                    CreatedAt = book.CreatedAt,
                    IsAvailable = book.IsAvailable,
                    IsDeleted = book.IsDeleted,
                    IsPaid = _db.Payments.Any(p => p.TransactionReference != null && (p.TransactionReference.Contains("RIDE:" + book.Id) || p.TransactionReference.Contains("DirectWalletRecord-" + book.Id)) && p.PaymentStatus == "paid" && p.IsDeleted != true),
                }).ToListAsync();

            if (bookings.Any())
            {
                return bookings;
            }

            return new List<BookingViewModel> { new BookingViewModel { Message = "No rides found for this driver." } };
        }
        public async Task<LiveVehicleTrackingViewModel> SaveLiveVehicleTrackings(LiveVehicleTrackingViewModel liveVehicle)
        {
            if (!liveVehicle.VehicleId.HasValue)
            {
                return new LiveVehicleTrackingViewModel { Message = "VehicleId is required." };
            }

            if (_locationService == null || !_locationService.AreValidCoordinates(liveVehicle.Latitude, liveVehicle.Longitude))
            {
                return new LiveVehicleTrackingViewModel { Message = "Latitude or longitude is invalid." };
            }

            var vehicle = await _db.Vehicles
                .Where(x => x.Id == liveVehicle.VehicleId.Value && x.IsDeleted != true)
                .FirstOrDefaultAsync();

            if (vehicle == null)
            {
                return new LiveVehicleTrackingViewModel { Message = "Vehicle not available now" };
            }

            vehicle.CurrentLatitude = liveVehicle.Latitude;
            vehicle.CurrentLongitude = liveVehicle.Longitude;
            vehicle.UpdatedDatetime = DateTime.UtcNow;
            _db.Vehicles.Update(vehicle);

            LiveVehicleTracking existingTracking = await _db.LiveVehicleTrackings.Where(x => x.VehicleId == liveVehicle.VehicleId.Value && (x.BookingId == liveVehicle.BookingId || liveVehicle.BookingId == null) && x.IsDeleted == false).OrderByDescending(x => x.LastUpdated).FirstOrDefaultAsync();

            if (existingTracking == null)
            {
                existingTracking = new LiveVehicleTracking
                {
                    VehicleId = vehicle.Id,
                    DeviceId = liveVehicle.DeviceId,
                    UserId = liveVehicle.UserId,
                    BookingId = liveVehicle.BookingId,
                    IsDeleted = false,
                };
                _db.LiveVehicleTrackings.Add(existingTracking);
            }

            existingTracking.LastLatitude = liveVehicle.Latitude;
            existingTracking.LastLongitude = liveVehicle.Longitude;
            existingTracking.Speed = liveVehicle.Speed;
            existingTracking.Heading = liveVehicle.Heading;
            existingTracking.LastUpdated = DateTime.UtcNow;

            Booking? booking = null;
            if (liveVehicle.BookingId.HasValue && liveVehicle.BookingId.Value > 0)
            {
                booking = await _db.Bookings.FirstOrDefaultAsync(x => x.Id == liveVehicle.BookingId.Value && x.IsDeleted == false);
                if (booking != null)
                {
                    booking.VehicleId = vehicle.Id;
                }
            }
            else
            {
                booking = await _db.Bookings
                    .Where(x => x.VehicleId == vehicle.Id
                        && x.IsDeleted != true
                        && x.CT_BookingStatus != RideStatus.RideCompleted
                        && x.CT_BookingStatus != RideStatus.Cancelled)
                    .OrderByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync();
            }

            await _db.SaveChangesAsync();

            var existingRouteTracking = new LiveVehicleTrackingHistory
            {
                VehicleId = vehicle.Id,
                LiveVehicleTrackingId = existingTracking.Id,
                DeviceId = liveVehicle.DeviceId,
                UserId = liveVehicle.UserId,
                BookingId = liveVehicle.BookingId,
                IsDeleted = false,
                LastLatitude = liveVehicle.Latitude,
                LastLongitude = liveVehicle.Longitude,
                Speed = liveVehicle.Speed,
                Heading = liveVehicle.Heading,
                LastUpdated = DateTime.UtcNow,
            };
            _db.LiveVehicleTrackingHistories.Add(existingRouteTracking);

            liveVehicle.Id = existingTracking.Id;
            liveVehicle.LastUpdated = existingTracking.LastUpdated;
            liveVehicle.DistanceRemainingKm = null;
            liveVehicle.EstimatedArrivalMinutes = null;

            if (booking != null && _trackingNotificationService != null)
            {
                var trackingSnapshot = await BuildTrackingSnapshotAsync(booking);
                liveVehicle.DistanceRemainingKm = trackingSnapshot.DistanceRemainingKm;
                liveVehicle.EstimatedArrivalMinutes = trackingSnapshot.EstimatedArrivalMinutes;
                await _trackingNotificationService.NotifyDriverLocationUpdatedAsync(trackingSnapshot);
            }

            if (_trackingNotificationService != null && vehicle.TransporterId.HasValue && vehicle.TransporterId.Value > 0)
            {
                var transporterObj = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == vehicle.TransporterId.Value);
                if (transporterObj != null && !string.IsNullOrEmpty(transporterObj.UserId))
                {
                    await _trackingNotificationService.NotifyFleetLocationUpdatedAsync(transporterObj.UserId, liveVehicle);
                }
            }
            await _db.SaveChangesAsync();

            return liveVehicle;
        }
        public async Task<List<LiveVehicleTrackingViewModel>> GetLiveVehicleTrackings(Guid vehicleId, long? bookingId)
        {
            var query = _db.LiveVehicleTrackings
                .Where(x => x.VehicleId == vehicleId && x.IsDeleted != true);

            if (bookingId.HasValue && bookingId.Value > 0)
            {
                query = query.Where(x => x.BookingId == bookingId);
            }

            var liveVehicleTrack = await query.Select(x => new LiveVehicleTrackingViewModel
            {
                Id = x.Id,
                VehicleId = x.VehicleId,
                DeviceId = x.DeviceId,
                UserId = x.UserId,
                Latitude = x.LastLatitude,
                Longitude = x.LastLongitude,
                LastUpdated = x.LastUpdated,
                BookingId = x.BookingId,
                Speed = x.Speed,
                Heading = x.Heading,
            }).ToListAsync();
            if (liveVehicleTrack.Any())
            {
                return liveVehicleTrack;
            }
            else
            {
                return new List<LiveVehicleTrackingViewModel> { new LiveVehicleTrackingViewModel { Message = "Live tracking data not found for the specified vehicle." } };
            }
        }
        public async Task<List<LiveVehicleTrackingHistoryViewModel>> GetRouteVehicleTrackings(Guid vehicleId, long? bookingId)
        {
            var query = _db.LiveVehicleTrackingHistories
                .Where(x => x.VehicleId == vehicleId && x.IsDeleted != true);

            if (bookingId.HasValue && bookingId.Value > 0)
            {
                query = query.Where(x => x.BookingId == bookingId);
            }

            var liveVehicleTrack = await query.Select(x => new LiveVehicleTrackingHistoryViewModel
            {
                Id = x.Id,
                LiveVehicleTrackingId = x.LiveVehicleTrackingId,
                VehicleId = x.VehicleId,
                DeviceId = x.DeviceId,
                UserId = x.UserId,
                Latitude = x.LastLatitude,
                Longitude = x.LastLongitude,
                LastUpdated = x.LastUpdated,
                BookingId = x.BookingId,
                Speed = x.Speed,
                Heading = x.Heading,
            }).ToListAsync();
            if (liveVehicleTrack.Any())
            {
                return liveVehicleTrack;
            }
            else
            {
                return new List<LiveVehicleTrackingHistoryViewModel> { new LiveVehicleTrackingHistoryViewModel { Message = "Live tracking data not found for the specified vehicle." } };
            }
        }

        public async Task<RideMatchingResultViewModel> MatchDriversAndSendRideRequestAsync(RideMatchingRequestViewModel model)
        {
            var result = new RideMatchingResultViewModel
            {
                RadiusKm = model.RadiusKm <= 0 ? 50 : model.RadiusKm,
            };

            if (string.IsNullOrWhiteSpace(model.CustomerId))
            {
                result.Message = "CustomerId is required.";
                return result;
            }

            if (!model.PickupLat.HasValue || !model.PickupLng.HasValue)
            {
                result.Message = "Pickup latitude and longitude are required.";
                return result;
            }

            if (_locationService == null || !_locationService.AreValidCoordinates(model.PickupLat, model.PickupLng))
            {
                result.Message = "Pickup coordinates are invalid.";
                return result;
            }

            if ((model.DropLat.HasValue || model.DropLng.HasValue) && (_locationService == null || !_locationService.AreValidCoordinates(model.DropLat, model.DropLng)))
            {
                result.Message = "Destination coordinates are invalid.";
                return result;
            }

            var driversList = await _db.Drivers
                .Where(d => d.IsDeleted != true && d.UserId != null)
                .ToListAsync();

            var activeAssignments = await _db.Bookings
                .Where(b => b.VehicleId.HasValue 
                            && b.DriverId.HasValue 
                            && b.CustomerId == null 
                            && b.CT_BookingStatus != RideStatus.RideCompleted 
                            && b.CT_BookingStatus != RideStatus.Cancelled)
                .ToListAsync();

            var vehicles = await _db.Vehicles
                .Where(v => v.IsDeleted != true)
                .ToListAsync();

            var trackings = await _db.LiveVehicleTrackings
                .Where(t => t.IsDeleted != true)
                .ToListAsync();

            var candidates = new List<DriverCandidate>();
            foreach (var driver in driversList)
            {
                var assignment = activeAssignments.FirstOrDefault(a => a.DriverId == driver.Id);
                var vehicle = assignment != null ? vehicles.FirstOrDefault(v => v.Id == assignment.VehicleId) : null;

                if (vehicle == null && driver.UserId != null)
                {
                    vehicle = vehicles.FirstOrDefault(v => (v.TransporterId == null || v.TransporterId == 0) && (v.CreatedBy != null && v.CreatedBy.ToString() == driver.UserId));
                }

                // Match STRICTLY by requested CT_VehicleType (Vehicle Category), excluding Body & Tyre types as requested
                if (model.CT_VehicleType.HasValue && model.CT_VehicleType != 0)
                {
                    if (vehicle == null || vehicle.CT_VehicleType != model.CT_VehicleType)
                    {
                        continue;
                    }
                }

                double lat = 28.6139;
                double lng = 77.2090;

                if (vehicle != null)
                {
                    if (vehicle.CurrentLatitude.HasValue && vehicle.CurrentLongitude.HasValue)
                    {
                        lat = Convert.ToDouble(vehicle.CurrentLatitude.Value);
                        lng = Convert.ToDouble(vehicle.CurrentLongitude.Value);
                    }
                    else
                    {
                        var tracking = trackings.FirstOrDefault(t => t.VehicleId == vehicle.Id);
                        if (tracking != null && tracking.LastLatitude.HasValue && tracking.LastLongitude.HasValue)
                        {
                            lat = Convert.ToDouble(tracking.LastLatitude.Value);
                            lng = Convert.ToDouble(tracking.LastLongitude.Value);
                        }
                    }
                }

                candidates.Add(new DriverCandidate
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    DriverUserId = driver.UserId,
                    VehicleId = vehicle?.Id ?? Guid.Empty,
                    VehicleNumber = vehicle?.VehicleNumber ?? "None",
                    Latitude = lat,
                    Longitude = lng,
                    TransporterId = driver.TransporterId
                });
            }

            if (!candidates.Any())
            {
                foreach (var driver in driversList)
                {
                    candidates.Add(new DriverCandidate
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        DriverUserId = driver.UserId,
                        VehicleId = Guid.Empty,
                        VehicleNumber = "TEST-9999",
                        Latitude = 28.6139,
                        Longitude = 77.2090,
                        TransporterId = null
                    });
                }
            }

            var pickupLat = Convert.ToDouble(model.PickupLat.Value);
            var pickupLng = Convert.ToDouble(model.PickupLng.Value);

            var matched = candidates
                .Select(c => new MatchedDriverViewModel
                {
                    DriverId = c.DriverId,
                    DriverName = c.DriverName,
                    DriverUserId = c.DriverUserId,
                    VehicleId = c.VehicleId,
                    VehicleNumber = c.VehicleNumber,
                    DistanceKm = _locationService?.CalculateDistance(pickupLat, pickupLng, c.Latitude, c.Longitude) ?? 0,
                    TransporterId = c.TransporterId
                })
                .Where(x => x.DistanceKm <= result.RadiusKm)
                .OrderBy(x => x.DistanceKm)
                .ToList();

            // Fallback for testing: if no drivers are found within the 50km radius, match all candidates regardless of distance!
            if (!matched.Any())
            {
                matched = candidates
                    .Select(c => new MatchedDriverViewModel
                    {
                        DriverId = c.DriverId,
                        DriverName = c.DriverName,
                        DriverUserId = c.DriverUserId,
                        VehicleId = c.VehicleId,
                        VehicleNumber = c.VehicleNumber,
                        DistanceKm = _locationService?.CalculateDistance(pickupLat, pickupLng, c.Latitude, c.Longitude) ?? 0,
                        TransporterId = c.TransporterId
                    })
                    .OrderBy(x => x.DistanceKm)
                    .ToList();
            }

            if (!matched.Any())
            {
                result.Message = "No available drivers found.";
                return result;
            }

            var booking = new Booking
            {
                CustomerId = model.CustomerId,
                CustomerName = model.CustomerName,
                PickupAddress = model.PickupAddress,
                DropAddress = model.DropAddress,
                PickupLat = model.PickupLat,
                PickupLng = model.PickupLng,
                DropLat = model.DropLat,
                DropLng = model.DropLng,
                GoodsType = model.GoodsType,
                GoodsWeight = model.GoodsWeight,
                EstimatedFare = model.EstimatedFare,
                ScheduledTime = model.ScheduledTime,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false,
                CT_BookingStatus = RideStatus.RequestForRide,
                CT_VehicleType = model.CT_VehicleType,
                CTBodyType = model.CTBodyType,
                CTTyreType = model.CTTyreType,
            };
            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync();

            foreach (var item in matched)
            {
                _db.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = item.DriverUserId,
                    Title = "New Ride Request",
                    Message = $"Ride #{booking.Id} is {Math.Round(item.DistanceKm, 2)} km away from pickup.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            var transporterIds = matched.Where(x => x.TransporterId.HasValue).Select(x => x.TransporterId!.Value).Distinct().ToList();
            if (transporterIds.Any())
            {
                var transporters = await _db.TransporterDetails
                    .Where(t => transporterIds.Contains(t.Id) && t.UserId != null)
                    .ToListAsync();

                foreach (var transporter in transporters)
                {
                    _db.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = transporter.UserId,
                        Title = "New Ride Request",
                        Message = $"CLAIM|{booking.Id}|{transporter.Id}|New ride request nearby! Pickup: {booking.PickupAddress}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            await _db.SaveChangesAsync();

            // Push notifications to matched drivers
            await SafePushToUsersAsync(
                matched.Select(x => x.DriverUserId),
                new PushNotificationPayload
                {
                    Title = "New Ride Request",
                    Body = $"{model.GoodsType ?? "Goods"} from {model.PickupAddress ?? "pickup"} is waiting for your response.",
                    Data = CreatePushData(booking.Id, "ride_request", RideStatus.ToName(RideStatus.RequestForRide)),
                });

            result.BookingId = booking.Id;
            result.MatchedDrivers = matched;
            result.MatchedCount = matched.Count;
            result.Message = $"Ride request sent to {matched.Count} driver(s).";
            result.IsSuccess = true;
            return result;
        }

        public async Task<BookingViewModel> RequestRideAsync(BookingViewModel model)
        {
            if (_locationService == null || !_locationService.AreValidCoordinates(model.PickupLat, model.PickupLng))
            {
                return new BookingViewModel { Message = "Pickup coordinates are invalid." };
            }

            if ((model.DropLat.HasValue || model.DropLng.HasValue) && (_locationService == null || !_locationService.AreValidCoordinates(model.DropLat, model.DropLng)))
            {
                return new BookingViewModel { Message = "Destination coordinates are invalid." };
            }

            var validDriverId = await ResolveValidDriverIdAsync(model.DriverId);
            var booking = new Booking
            {
                CustomerId = model.CustomerId,
                CustomerName = model.CustomerName,
                VehicleId = model.VehicleId,
                DriverId = validDriverId,
                PickupAddress = model.PickupAddress,
                PickupLat = model.PickupLat,
                PickupLng = model.PickupLng,
                DropAddress = model.DropAddress,
                DropLat = model.DropLat,
                DropLng = model.DropLng,
                GoodsType = model.GoodsType,
                GoodsWeight = model.GoodsWeight,
                EstimatedFare = model.EstimatedFare,
                FinalFare = model.FinalFare,
                ScheduledTime = model.ScheduledTime,
                CreatedAt = DateTime.UtcNow,
                IsAvailable = true,
                IsDeleted = false,
                DeptStateId = model.DeptStateId,
                DeptCityId = model.DeptCityId,
                ArrivalStateId = model.ArrivalStateId,
                ArrivalCityId = model.ArrivalCityId,
                CT_BookingStatus = RideStatus.RequestForRide,
                CT_VehicleType = model.CT_VehicleType,
                CTBodyType = model.CTBodyType,
                CTTyreType = model.CTTyreType,
            };

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync();

            // Notify transporters and independent drivers about the new request
            try
            {
                var transporters = await _db.TransporterDetails.Where(x => x.IsDeleted != true).ToListAsync();
                foreach (var t in transporters)
                {
                    if (!string.IsNullOrEmpty(t.UserId))
                    {
                        var n = new satguruApp.DLL.Models.Notification
                        {
                            UserId = t.UserId,
                            Message = $"NEW_ORDER_REQUEST|{booking.Id}|{booking.PickupAddress} ➔ {booking.DropAddress}|Fare: {booking.EstimatedFare}",
                            CreatedAt = DateTime.UtcNow,
                            IsRead = false,
                            Title = "New Order Request Received"
                        };
                        _db.Notifications.Add(n);
                    }
                }

                var indDrivers = await _db.Drivers.Where(d => d.TransporterId == null && d.IsDeleted != true).ToListAsync();
                foreach (var d in indDrivers)
                {
                    if (string.IsNullOrEmpty(d.UserId)) continue;

                    var driverBooking = await _db.Bookings
                        .Where(b => b.DriverId == d.Id && b.VehicleId.HasValue && b.CT_BookingStatus != RideStatus.Cancelled)
                        .OrderByDescending(b => b.CreatedAt)
                        .FirstOrDefaultAsync();

                    decimal? dLat = null;
                    decimal? dLng = null;

                    if (driverBooking != null && driverBooking.VehicleId.HasValue)
                    {
                        var tracking = await _db.LiveVehicleTrackings
                            .Where(t => t.VehicleId == driverBooking.VehicleId.Value && t.IsDeleted != true)
                            .OrderByDescending(t => t.LastUpdated)
                            .FirstOrDefaultAsync();

                        if (tracking != null)
                        {
                            dLat = tracking.LastLatitude;
                            dLng = tracking.LastLongitude;
                        }
                    }

                    if (dLat.HasValue && dLng.HasValue && booking.PickupLat.HasValue && booking.PickupLng.HasValue)
                    {
                        bool isClose = _locationService.IsWithinRadius(
                            (double)booking.PickupLat.Value,
                            (double)booking.PickupLng.Value,
                            (double)dLat.Value,
                            (double)dLng.Value,
                            50.0 // 50 km radius restriction
                        );

                        if (!isClose) continue;
                    }

                    var n = new satguruApp.DLL.Models.Notification
                    {
                        UserId = d.UserId,
                        Message = $"NEW_ORDER_REQUEST|{booking.Id}|{booking.PickupAddress} ➔ {booking.DropAddress}|Fare: {booking.EstimatedFare}",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false,
                        Title = "New Order Request Received"
                    };
                    _db.Notifications.Add(n);
                }
                await _db.SaveChangesAsync();
            }
            catch (Exception)
            {
                // ignore
            }

            var vm = MapBookingToViewModel(booking);
            vm.Message = "Ride request created.";
            return vm;
        }

        public async Task<BookingViewModel> UpdateRideStatusAsync(long bookingId, string status, Guid? driverId = null, string? cancelledBy = null)
        {
            if (!RideStatus.TryParse(status, out var nextStatus))
            {
                return new BookingViewModel
                {
                    Id = bookingId,
                    Message = "Invalid status. Use: request_for_ride, driver_assigned, driver_arriving, ride_started, ride_completed, cancelled.",
                };
            }

            var booking = await _db.Bookings
                .Include(x => x.Driver)
                .FirstOrDefaultAsync(x => x.Id == bookingId && x.IsDeleted != true);
            if (booking == null)
            {
                return new BookingViewModel { Id = bookingId, Message = "Ride not found." };
            }

            if (!RideStatus.CanTransition(booking.CT_BookingStatus, nextStatus))
            {
                return new BookingViewModel
                {
                    Id = bookingId,
                    CT_BookingStatus = booking.CT_BookingStatus,
                    RideStatus = RideStatus.ToName(booking.CT_BookingStatus),
                    Message = $"Invalid status transition from '{RideStatus.ToName(booking.CT_BookingStatus)}' to '{status}'.",
                };
            }

            if (nextStatus == RideStatus.DriverAssigned && !driverId.HasValue && !booking.DriverId.HasValue)
            {
                return new BookingViewModel
                {
                    Id = bookingId,
                    Message = "driverId is required when status is driver_assigned.",
                };
            }

            if (driverId.HasValue)
            {
                booking.DriverId = await ResolveValidDriverIdAsync(driverId);
            }

            booking.CT_BookingStatus = nextStatus;

            if (nextStatus == RideStatus.RideCompleted || nextStatus == RideStatus.Cancelled)
            {
                booking.IsAvailable = true;
                if (booking.VehicleId.HasValue)
                {
                    var vehicle = await _db.Vehicles.FirstOrDefaultAsync(x => x.Id == booking.VehicleId.Value);
                    if (vehicle != null)
                    {
                        vehicle.IsAvailable = true;
                        _db.Vehicles.Update(vehicle);
                    }
                }
            }

            await _db.SaveChangesAsync();

            var trackingSnapshot = await BuildTrackingSnapshotAsync(booking);

            if (_trackingNotificationService != null)
            {
                if (nextStatus == RideStatus.DriverAssigned)
                {
                    await _trackingNotificationService.NotifyRideAssignedAsync(trackingSnapshot);
                }

                await _trackingNotificationService.NotifyRideStatusChangedAsync(trackingSnapshot);
            }

            if (!string.IsNullOrWhiteSpace(booking.CustomerId))
            {
                var customerMessage = GetCustomerStatusMessage(nextStatus, booking.Id);
                await CreateNotificationAsync(booking.CustomerId, customerMessage.title, customerMessage.body);
                await SafePushToUserAsync(
                    booking.CustomerId,
                    new PushNotificationPayload
                    {
                        Title = customerMessage.title,
                        Body = customerMessage.body,
                        Data = CreatePushData(booking.Id, "ride_status", RideStatus.ToName(nextStatus)),
                    });
            }

            if (nextStatus == RideStatus.Cancelled)
            {
                string role = string.Equals(cancelledBy, "Customer", StringComparison.OrdinalIgnoreCase) ? "Customer" : "Driver";
                string cName = role == "Customer" ? (booking.CustomerName ?? "Customer") : (booking.Driver?.Name ?? "Driver");
                await NotifyCancellationAsync(booking, role, cName);
            }

            var vm = MapBookingToViewModel(booking);
            vm.Message = "Ride status updated.";
            return vm;
        }

        public async Task<BookingViewModel> RejectRideRequestByTransporterAsync(long bookingId, string transporterUserId)
        {
            if (string.IsNullOrWhiteSpace(transporterUserId)) return new BookingViewModel { Id = bookingId, Message = "transporterUserId is required." };

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(x => x.UserId == transporterUserId);
            if (transporter == null) return new BookingViewModel { Id = bookingId, Message = "Transporter not found." };

            var driverUserIds = await _db.Drivers.Where(d => d.TransporterId == transporter.Id && d.UserId != null).Select(d => d.UserId).ToListAsync();
            if (!driverUserIds.Any()) return new BookingViewModel { Id = bookingId, Message = "No drivers found." };

            var notifications = await _db.Notifications
                .Where(x => driverUserIds.Contains(x.UserId) && x.Title == "New Ride Request" && x.IsRead != true && x.Message != null && x.Message.Contains($"Ride #{bookingId}"))
                .ToListAsync();

            if (!notifications.Any()) return new BookingViewModel { Id = bookingId, Message = "Pending ride request not found." };

            foreach (var n in notifications)
            {
                n.IsRead = true;
                _db.Notifications.Update(n);
            }

            await _db.SaveChangesAsync();

            return new BookingViewModel { Id = bookingId, Message = "Ride request rejected." };
        }

        public async Task<BookingViewModel> RejectRideRequestAsync(long bookingId, string driverUserId)
        {
            if (string.IsNullOrWhiteSpace(driverUserId))
            {
                return new BookingViewModel { Id = bookingId, Message = "driverUserId is required." };
            }

            var booking = await _db.Bookings.FirstOrDefaultAsync(x => x.Id == bookingId && x.IsDeleted != true);
            if (booking == null)
            {
                return new BookingViewModel { Id = bookingId, Message = "Ride not found." };
            }

            if (booking.CT_BookingStatus != RideStatus.RequestForRide || booking.DriverId.HasValue)
            {
                return new BookingViewModel
                {
                    Id = bookingId,
                    CT_BookingStatus = booking.CT_BookingStatus,
                    RideStatus = RideStatus.ToName(booking.CT_BookingStatus),
                    Message = "This ride request is no longer pending.",
                };
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => 
                (d.UserId == driverUserId || d.Id.ToString() == driverUserId || (d.UserId != null && d.UserId.ToLower() == driverUserId.ToLower())) 
                && d.IsDeleted != true);

            var driverUserIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(driverUserId)) driverUserIds.Add(driverUserId);
            if (driver != null)
            {
                if (!string.IsNullOrWhiteSpace(driver.UserId)) driverUserIds.Add(driver.UserId);
                driverUserIds.Add(driver.Id.ToString());
            }

            var driverNotifications = await _db.Notifications
                .Where(x => driverUserIds.Contains(x.UserId) && x.IsRead != true)
                .ToListAsync();

            var matchingNotif = driverNotifications
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefault(x =>
                    x.Message != null &&
                    ((x.Title == "New Ride Request" && x.Message.Contains($"Ride #{bookingId}")) ||
                     (x.Title == "New Shipment Assignment" && (x.Message.StartsWith($"ASSIGN_SHIPMENT|{bookingId}|") || x.Message.Contains($"|{bookingId}|")))));

            if (matchingNotif != null)
            {
                matchingNotif.IsRead = true;
                _db.Notifications.Update(matchingNotif);
            }

            // Notify Transporter if this driver belongs to a Transporter fleet
            if (driver != null && driver.TransporterId.HasValue)
            {
                var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value);
                if (transporter != null && !string.IsNullOrEmpty(transporter.UserId))
                {
                    var driverName = !string.IsNullOrWhiteSpace(driver.Name) ? driver.Name : "Driver";
                    var rejectNotif = new satguruApp.DLL.Models.Notification
                    {
                        UserId = transporter.UserId,
                        Message = $"DRIVER_REJECT_ORDER|{bookingId}|{driverName}",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false,
                        Title = "Driver Rejected Assignment"
                    };
                    _db.Notifications.Add(rejectNotif);
                }
            }

            await _db.SaveChangesAsync();

            var hasPendingDrivers = await _db.Notifications.AnyAsync(x =>
                x.Title == "New Ride Request" &&
                x.IsRead != true &&
                x.Message != null &&
                x.Message.Contains($"Ride #{bookingId}"));

            if (!hasPendingDrivers && !string.IsNullOrWhiteSpace(booking.CustomerId))
            {
                const string title = "Ride Request Update";
                var body = $"No driver accepted ride #{booking.Id} yet. We are waiting for another driver response.";
                await CreateNotificationAsync(booking.CustomerId, title, body);
            }

            var vm = MapBookingToViewModel(booking);
            vm.Message = "Ride request rejected for this driver.";
            return vm;
        }

        public async Task<BookingViewModel> GetRideAsync(long bookingId)
        {
            var booking = await _db.Bookings
                .Include(x => x.Driver)
                .Include(x => x.Vehicle)
                .FirstOrDefaultAsync(x => x.Id == bookingId && x.IsDeleted != true);
            if (booking == null)
            {
                return new BookingViewModel { Id = bookingId, Message = "Ride not found." };
            }

            return MapBookingToViewModel(booking);
        }

        public async Task<RideTrackingSnapshotViewModel> GetTrackingSnapshotAsync(long bookingId)
        {
            var booking = await _db.Bookings.FirstOrDefaultAsync(x => x.Id == bookingId && x.IsDeleted != true);
            if (booking == null)
            {
                return new RideTrackingSnapshotViewModel
                {
                    BookingId = bookingId,
                    RideStatus = "not_found",
                };
            }

            return await BuildTrackingSnapshotAsync(booking);
        }

        private static BookingViewModel MapBookingToViewModel(Booking booking)
        {
            return new BookingViewModel
            {
                Id = booking.Id,
                CustomerId = booking.CustomerId,
                CustomerName = booking.CustomerName,
                VehicleId = booking.VehicleId,
                VehicleNumber = booking.Vehicle?.VehicleNumber,
                VehicleName = booking.Vehicle?.VehicleName,
                DriverId = booking.DriverId,
                DriverName = booking.Driver?.Name,
                DriverPhone = booking.Driver?.Phone,
                PickupAddress = booking.PickupAddress,
                PickupLat = booking.PickupLat,
                PickupLng = booking.PickupLng,
                DropAddress = booking.DropAddress,
                DropLat = booking.DropLat,
                DropLng = booking.DropLng,
                GoodsType = booking.GoodsType,
                GoodsWeight = booking.GoodsWeight,
                EstimatedFare = booking.EstimatedFare,
                FinalFare = booking.FinalFare,
                CT_BookingStatus = booking.CT_BookingStatus,
                RideStatus = RideStatus.ToName(booking.CT_BookingStatus),
                ScheduledTime = booking.ScheduledTime,
                CreatedAt = booking.CreatedAt,
                IsAvailable = booking.IsAvailable,
                IsDeleted = booking.IsDeleted,
                DeptStateId = booking.DeptStateId,
                DeptCityId = booking.DeptCityId,
                ArrivalStateId = booking.ArrivalStateId,
                ArrivalCityId = booking.ArrivalCityId,
            };
        }

        private async Task<RideTrackingSnapshotViewModel> BuildTrackingSnapshotAsync(Booking booking)
        {
            LiveVehicleTracking? latestTracking = null;
            Vehicle? vehicle = null;

            if (booking.VehicleId.HasValue)
            {
                latestTracking = await _db.LiveVehicleTrackings
                    .Where(x => x.VehicleId == booking.VehicleId.Value && x.IsDeleted != true)
                    .OrderByDescending(x => x.LastUpdated)
                    .FirstOrDefaultAsync();

                vehicle = await _db.Vehicles.FirstOrDefaultAsync(x => x.Id == booking.VehicleId.Value);
            }

            var driverLatitude = latestTracking?.LastLatitude ?? vehicle?.CurrentLatitude;
            var driverLongitude = latestTracking?.LastLongitude ?? vehicle?.CurrentLongitude;
            var targetLatitude = booking.CT_BookingStatus == RideStatus.RideStarted ? booking.DropLat : booking.PickupLat;
            var targetLongitude = booking.CT_BookingStatus == RideStatus.RideStarted ? booking.DropLng : booking.PickupLng;

            double? distanceRemainingKm = null;
            int? estimatedArrivalMinutes = null;

            if (_locationService != null &&
                _locationService.AreValidCoordinates(driverLatitude, driverLongitude) &&
                _locationService.AreValidCoordinates(targetLatitude, targetLongitude))
            {
                distanceRemainingKm = _locationService.CalculateDistance(
                    Convert.ToDouble(driverLatitude!.Value),
                    Convert.ToDouble(driverLongitude!.Value),
                    Convert.ToDouble(targetLatitude!.Value),
                    Convert.ToDouble(targetLongitude!.Value));

                estimatedArrivalMinutes = (int)Math.Ceiling(distanceRemainingKm.Value / 30d * 60d);
            }

            return new RideTrackingSnapshotViewModel
            {
                BookingId = booking.Id,
                CustomerId = booking.CustomerId,
                DriverId = booking.DriverId,
                VehicleId = booking.VehicleId,
                RideStatus = RideStatus.ToName(booking.CT_BookingStatus),
                PickupAddress = booking.PickupAddress,
                DropAddress = booking.DropAddress,
                PickupLat = booking.PickupLat,
                PickupLng = booking.PickupLng,
                DropLat = booking.DropLat,
                DropLng = booking.DropLng,
                DriverLatitude = driverLatitude,
                DriverLongitude = driverLongitude,
                LastUpdatedUtc = latestTracking?.LastUpdated ?? vehicle?.UpdatedDatetime ?? booking.CreatedAt,
                DistanceRemainingKm = distanceRemainingKm,
                EstimatedArrivalMinutes = estimatedArrivalMinutes,
            };
        }

        public async Task<List<VehicleViewModel>> GetVehicleList(VehicleViewModel vehicleView)
        {
            var vehicleVM = await (from vehicle in _db.Vehicles
                                   join trans in _db.TransporterDetails on vehicle.TransporterId equals trans.Id
                                   join cmn in _db.CommonTypes on vehicle.CT_VehicleType equals cmn.Id into vType
                                   from cmn in vType.DefaultIfEmpty()
                                   join cmnbdy in _db.CommonTypes on vehicle.CTBodyType equals cmnbdy.Id into VbodyType
                                   from cmnbdy in VbodyType.DefaultIfEmpty()
                                   where vehicleView.VehicleNumber == null || vehicle.VehicleNumber.ToLower().Contains(vehicleView.VehicleNumber.ToLower()) &&
                                   vehicleView.RCNumber == null || vehicle.RCNumber.ToLower().Contains(vehicleView.RCNumber.ToLower()) &&
                                   ((vehicle.CTBodyType == vehicleView.CTBodyType) || (vehicle.CTBodyType == null || vehicleView.CTBodyType == null || vehicle.CTBodyType == 0
                                   || vehicleView.CTBodyType == 0)) &&
                                   ((vehicle.CT_VehicleType == vehicleView.CT_VehicleType) || (vehicle.CT_VehicleType == null || vehicleView.CT_VehicleType == 0 || vehicleView.CT_VehicleType == null)) &&
                                   ((vehicle.CapacityTons == vehicleView.CapacityTons) || (vehicle.CapacityTons == null || vehicleView.CapacityTons == null || vehicle.CapacityTons == 0 || vehicleView.CapacityTons == 0)) &&
                                   ((vehicle.SizeCubicMeters == vehicleView.SizeCubicMeters) || (vehicle.SizeCubicMeters == null || vehicleView.SizeCubicMeters == null || vehicle.SizeCubicMeters == 0 || vehicleView.SizeCubicMeters == 0))
                                   select new VehicleViewModel
                                   {
                                       Id = vehicle.Id,
                                       CapacityTons = vehicle.CapacityTons,
                                       CurrentLatitude = vehicle.CurrentLatitude,
                                       CurrentLongitude = vehicle.CurrentLongitude,
                                       InsuranceExpiry = vehicle.InsuranceExpiry,
                                       IsAvailable = vehicle.IsAvailable,
                                       IsDeleted = vehicle.IsDeleted,
                                       TransporterName = trans.CompanyName,
                                       PermitExpiry = vehicle.PermitExpiry,
                                       RCNumber = vehicle.RCNumber,
                                       RoadTaxExpiry = vehicle.RoadTaxExpiry,
                                       SizeCubicMeters = vehicle.SizeCubicMeters,
                                       TransporterId = vehicle.TransporterId.GetValueOrDefault(),
                                       UploadPhoneUrl = vehicle.UploadPhoneUrl,
                                       VehicleNumber = vehicle.VehicleNumber,
                                       CT_VehicleType = vehicle.CT_VehicleType,
                                       VehicleTypeName = cmn.Name,
                                       CTBodyType = vehicle.CTBodyType,
                                       BodyTypeName = cmnbdy.Name,
                                   }).ToListAsync();
            return vehicleVM;
        }

        private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
        {
            const double earthRadiusKm = 6371.0;
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusKm * c;
        }

        private static double ToRadians(double value)
        {
            return value * (Math.PI / 180.0);
        }

        private static long ParseBookingIdFromNotification(string? message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                return 0;
            }

            if (message.Contains("|"))
            {
                var parts = message.Split('|');
                if (parts.Length > 1 && long.TryParse(parts[1], out var pipeBid) && pipeBid > 0)
                {
                    return pipeBid;
                }
            }

            string[] markers = new[] { "Ride #", "Shipment #", "Booking #", "#" };
            foreach (var marker in markers)
            {
                var markerIndex = message.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
                if (markerIndex >= 0)
                {
                    var start = markerIndex + marker.Length;
                    var digits = new string(message.Skip(start).TakeWhile(char.IsDigit).ToArray());
                    if (long.TryParse(digits, out var bookingId) && bookingId > 0)
                    {
                        return bookingId;
                    }
                }
            }

            return 0;
        }

        private async Task CreateNotificationAsync(string userId, string title, string message)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return;
            }

            _db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                Message = message,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync();
        }

        private async Task SafePushToUserAsync(string? userId, PushNotificationPayload payload)
        {
            try
            {
                await _firebasePushService.SendToUserAsync(userId, payload);
            }
            catch
            {
            }
        }

        private async Task SafePushToUsersAsync(IEnumerable<string?> userIds, PushNotificationPayload payload)
        {
            try
            {
                await _firebasePushService.SendToUsersAsync(userIds, payload);
            }
            catch
            {
            }
        }

        private static Dictionary<string, string> CreatePushData(long bookingId, string type, string status)
        {
            return new Dictionary<string, string>
            {
                ["bookingId"] = bookingId.ToString(),
                ["type"] = type,
                ["status"] = status,
            };
        }

        private static (string title, string body) GetCustomerStatusMessage(int? nextStatus, long bookingId)
        {
            return nextStatus switch
            {
                RideStatus.DriverAssigned => ("Ride Accepted", $"Driver accepted ride #{bookingId}."),
                RideStatus.DriverArriving => ("Driver Is Arriving", $"Driver is on the way for ride #{bookingId}."),
                RideStatus.RideStarted => ("Ride Started", $"Ride #{bookingId} has started."),
                RideStatus.RideCompleted => ("Ride Completed", $"Ride #{bookingId} has been completed."),
                RideStatus.Cancelled => ("Ride Cancelled", $"Ride #{bookingId} has been cancelled."),
                _ => ("Ride Status Updated", $"Ride #{bookingId} status changed to {RideStatus.ToName(nextStatus)}."),
            };
        }

        public async Task<DriverSummaryCardViewModel> GetDriverSummaryCardAsync(string driverUserId)
        {
            var result = new DriverSummaryCardViewModel { DriverUserId = driverUserId };
            if (string.IsNullOrWhiteSpace(driverUserId)) return result;

            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUserId && d.IsDeleted != true);
            if (driver == null) return result;

            result.DriverId = driver.Id;
            result.DriverName = driver.Name ?? string.Empty;
            result.Phone = driver.Phone ?? string.Empty;
            result.ProfileStatus = driver.ProfileStatus ?? "Approved";

            if (Guid.TryParse(driverUserId, out var parsedDriverGuid))
            {
                var ratings = await _db.UserRatings.Where(r => r.Target_User_Id == parsedDriverGuid && r.IsDeleted != true).ToListAsync();
                if (ratings.Any())
                {
                    result.AverageRating = Math.Round((double)ratings.Average(r => r.Score ?? 5.0m), 1);
                }
            }

            // Find active booking for this driver
            var activeBooking = await _db.Bookings
                .Where(b => b.DriverId == driver.Id && b.IsDeleted != true &&
                       (b.CT_BookingStatus == RideStatus.DriverAssigned ||
                        b.CT_BookingStatus == RideStatus.DriverArriving ||
                        b.CT_BookingStatus == RideStatus.RideStarted))
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();

            Vehicle? assignedVehicle = null;

            if (activeBooking != null)
            {
                if (activeBooking.VehicleId.HasValue)
                {
                    assignedVehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == activeBooking.VehicleId.Value && v.IsDeleted != true);
                }

                result.IsOnRide = true;
                result.DutyStatus = "On Ride";
                result.ActiveBookingId = activeBooking.Id;
                result.PickupAddress = activeBooking.PickupAddress;
                result.DropAddress = activeBooking.DropAddress;
                result.EstimatedFare = activeBooking.EstimatedFare;
                result.CustomerName = activeBooking.CustomerName;

                if (!string.IsNullOrWhiteSpace(activeBooking.CustomerId))
                {
                    var customerUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == activeBooking.CustomerId || u.UserName == activeBooking.CustomerId);
                    if (customerUser != null)
                    {
                        result.CustomerPhone = customerUser.PhoneNumber ?? string.Empty;
                    }
                }

                result.RideStatusName = activeBooking.CT_BookingStatus switch
                {
                    RideStatus.DriverAssigned => "Driver Assigned",
                    RideStatus.DriverArriving => "Driver Arriving at Pickup",
                    RideStatus.RideStarted => "Journey in Progress",
                    _ => "On Ride"
                };

                if (assignedVehicle != null)
                {
                    var liveTracking = await _db.LiveVehicleTrackings
                        .Where(t => t.VehicleId == assignedVehicle.Id)
                        .OrderByDescending(t => t.LastUpdated)
                        .FirstOrDefaultAsync();

                    if (liveTracking != null && liveTracking.LastLatitude.HasValue && liveTracking.LastLongitude.HasValue)
                    {
                        result.CurrentLat = (double)liveTracking.LastLatitude.Value;
                        result.CurrentLng = (double)liveTracking.LastLongitude.Value;
                        result.CurrentAddress = $"{result.CurrentLat:F4}, {result.CurrentLng:F4}";
                    }
                }

                if (string.IsNullOrWhiteSpace(result.CurrentAddress))
                {
                    result.CurrentAddress = activeBooking.PickupAddress ?? "En route";
                }
            }
            else
            {
                result.IsOnRide = false;
                result.DutyStatus = "Available";
            }

            if (assignedVehicle == null && driver.TransporterId.HasValue)
            {
                assignedVehicle = await _db.Vehicles
                    .FirstOrDefaultAsync(v => v.TransporterId == driver.TransporterId.Value && v.IsDeleted != true);
            }

            if (assignedVehicle != null)
            {
                result.AssignedVehicleName = assignedVehicle.VehicleName ?? string.Empty;
                result.AssignedVehicleNumber = assignedVehicle.VehicleNumber ?? string.Empty;

                if (string.IsNullOrWhiteSpace(result.CurrentAddress))
                {
                    var latestTracking = await _db.LiveVehicleTrackings
                        .Where(t => t.VehicleId == assignedVehicle.Id)
                        .OrderByDescending(t => t.LastUpdated)
                        .FirstOrDefaultAsync();

                    if (latestTracking != null && latestTracking.LastLatitude.HasValue && latestTracking.LastLongitude.HasValue)
                    {
                        result.CurrentLat = (double)latestTracking.LastLatitude.Value;
                        result.CurrentLng = (double)latestTracking.LastLongitude.Value;
                        result.CurrentAddress = $"{result.CurrentLat:F4}, {result.CurrentLng:F4}";
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(result.CurrentAddress))
            {
                result.CurrentAddress = "Available at depot / location";
            }

            var todayDate = DateTime.UtcNow.Date;
            var todayBookings = await _db.Bookings
                .Where(b => b.DriverId == driver.Id 
                            && b.IsDeleted != true 
                            && b.CreatedAt != null 
                            && b.CreatedAt.Value.Date == todayDate 
                            && b.CT_BookingStatus != RideStatus.Cancelled)
                .ToListAsync();

            result.TodaysTotalKm = Math.Round(todayBookings.Sum(b => 
            {
                if (!b.PickupLat.HasValue || !b.PickupLng.HasValue || !b.DropLat.HasValue || !b.DropLng.HasValue) return 0.0;
                double r = 6371;
                double dLat = (double)(b.DropLat.Value - b.PickupLat.Value) * Math.PI / 180.0;
                double dLon = (double)(b.DropLng.Value - b.PickupLng.Value) * Math.PI / 180.0;
                double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                           Math.Cos((double)b.PickupLat.Value * Math.PI / 180.0) * Math.Cos((double)b.DropLat.Value * Math.PI / 180.0) *
                           Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
                return r * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            }), 1);

            return result;
        }

        private async Task<Guid?> ResolveValidDriverIdAsync(Guid? candidateId)
        {
            if (!candidateId.HasValue || candidateId.Value == Guid.Empty) return null;

            var candidateStr = candidateId.Value.ToString();
            var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == candidateId.Value || (d.UserId != null && d.UserId == candidateStr));
            if (driver != null)
            {
                return driver.Id;
            }

            return null;
        }

        private sealed class DriverCandidate
        {
            public Guid DriverId { get; set; }
            public string? DriverName { get; set; }
            public string? DriverUserId { get; set; }
            public Guid VehicleId { get; set; }
            public string? VehicleNumber { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
            public long? TransporterId { get; set; }
        }

        private sealed class NullFirebasePushService : IFirebasePushService
        {
            public Task<string> RegisterDeviceTokenAsync(PushDeviceTokenRegistrationViewModel model) => Task.FromResult("Firebase push service is not configured.");
            public Task<string> RemoveDeviceTokenAsync(PushDeviceTokenRemovalViewModel model) => Task.FromResult("Firebase push service is not configured.");
            public Task<string> SendTestAsync(TestPushNotificationRequest model) => Task.FromResult("Firebase push service is not configured.");
            public Task SendToUserAsync(string? userId, PushNotificationPayload payload) => Task.CompletedTask;
            public Task SendToUsersAsync(IEnumerable<string?> userIds, PushNotificationPayload payload) => Task.CompletedTask;
        }
    }
}

