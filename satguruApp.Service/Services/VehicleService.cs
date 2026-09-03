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
                    vehicleVM.PermitExpiry = vehicleView.PermitExpiry;
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
                    vehicleVM.PermitExpiry = vehicleView.PermitExpiry;
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
            var vehicle = await _db.Vehicles.Where(x => x.Id == model.VehicleId && x.IsDeleted != true).FirstOrDefaultAsync();
            if (vehicle != null)
            {
                Guid? resolvedDriverId = model.DriverId;
                if (resolvedDriverId.HasValue)
                {
                    var driverExists = await _db.Drivers.AnyAsync(d => d.Id == resolvedDriverId.Value && d.IsDeleted != true);
                    if (!driverExists)
                    {
                        var driverByUser = await _db.Drivers.FirstOrDefaultAsync(d => d.UserId == resolvedDriverId.Value.ToString() && d.IsDeleted != true);
                        if (driverByUser != null)
                        {
                            resolvedDriverId = driverByUser.Id;
                        }
                    }
                }

                if (resolvedDriverId.HasValue && model.VehicleId.HasValue && model.CustomerId == null)
                {
                    // Cancel any existing standing assignment for this driver on other vehicles
                    var previousDriverAssignments = await _db.Bookings
                        .Where(b => b.DriverId == resolvedDriverId.Value 
                                    && b.CustomerId == null 
                                    && b.VehicleId != model.VehicleId.Value
                                    && b.CT_BookingStatus != RideStatus.Cancelled)
                        .ToListAsync();
                    foreach (var prev in previousDriverAssignments)
                    {
                        prev.CT_BookingStatus = RideStatus.Cancelled;
                        _db.Bookings.Update(prev);
                    }

                    // Cancel any existing standing assignment on this vehicle for other drivers
                    var previousVehicleAssignments = await _db.Bookings
                        .Where(b => b.VehicleId == model.VehicleId.Value 
                                    && b.CustomerId == null 
                                    && b.DriverId != resolvedDriverId.Value
                                    && b.CT_BookingStatus != RideStatus.Cancelled)
                        .ToListAsync();
                    foreach (var prev in previousVehicleAssignments)
                    {
                        prev.CT_BookingStatus = RideStatus.Cancelled;
                        _db.Bookings.Update(prev);
                    }
                }

                vehicle.IsAvailable = false;
                _db.Vehicles.Update(vehicle);
                var bookingExists = await _db.Bookings.FirstOrDefaultAsync(x =>
                    x.VehicleId == model.VehicleId &&
                    x.DriverId == resolvedDriverId &&
                    x.CustomerId == model.CustomerId &&
                    x.CT_BookingStatus != RideStatus.RideCompleted &&
                    x.CT_BookingStatus != RideStatus.Cancelled);
                if (bookingExists == null)
                {
                    bookingExists = new Booking
                    {
                        VehicleId = model.VehicleId,
                        CustomerId = model.CustomerId,
                        DriverId = resolvedDriverId,
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
            var booking = await _db.Bookings.Where(x => x.Id == model.Id && x.VehicleId == model.VehicleId && x.DriverId == model.DriverId && x.CustomerId == model.CustomerId).FirstOrDefaultAsync();
            if (booking != null)
            {
                booking.CT_BookingStatus = RideStatus.Cancelled;
                booking.IsAvailable = true;
                _db.Bookings.Update(booking);
                var vehicle = await _db.Vehicles.Where(x => x.Id == booking.VehicleId).FirstOrDefaultAsync();
                if (vehicle != null)
                {
                    vehicle.IsAvailable = true;
                    _db.Vehicles.Update(vehicle);
                }
                await _db.SaveChangesAsync();
                model.Message = "Your Booking has been cancelled.";
            }
            else
            {
                model.Message = "Booking not found or already cancelled.";
            }
            return model;
        }
        public async Task<List<BookingViewModel>> BookingVehicleRides(string userId)
        {
            var bookings = await (from book in _db.Bookings
                                  join dvr in _db.Drivers on book.DriverId equals dvr.Id into dvrGroup
                                  from dvr in dvrGroup.DefaultIfEmpty()
                                  join dvrInfo in _db.UserInformations on (dvr != null ? dvr.UserId : null) equals dvrInfo.UserId into dvrInfoGroup
                                  from dvrInfo in dvrInfoGroup.DefaultIfEmpty()
                                  join custInfo in _db.UserInformations on book.CustomerId equals custInfo.UserId into custInfoGroup
                                  from custInfo in custInfoGroup.DefaultIfEmpty()
                                  join veh in _db.Vehicles on book.VehicleId equals veh.Id into vehGroup
                                  from veh in vehGroup.DefaultIfEmpty()
                                  where book.CustomerId == userId && book.CT_BookingStatus != RideStatus.Cancelled
                                  orderby book.Id descending
                                  select new BookingViewModel
                                  {
                                      Id = book.Id,
                                      CustomerId = book.CustomerId,
                                      CustomerProfilePic = custInfo != null ? custInfo.ProfilePic : null,
                                      DriverId = book.DriverId,
                                      DriverName = dvr != null ? dvr.Name : string.Empty,
                                      DriverPhone = dvr != null ? dvr.Phone : string.Empty,
                                      DriverUserId = dvr != null ? dvr.UserId : string.Empty,
                                      DriverProfilePic = dvr != null ? (dvr.PhotoUrl ?? (dvrInfo != null ? dvrInfo.ProfilePic : string.Empty)) : string.Empty,
                                      VehicleId = book.VehicleId,
                                      VehicleName = veh != null ? veh.VehicleName : string.Empty,
                                      VehicleNumber = veh != null ? veh.VehicleNumber : string.Empty,
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

            var pendingBookingNotifications = await _db.Notifications
                .Where(x => x.UserId == driverUserId && (x.Title == "New Ride Request" || x.Title == "New Shipment Assignment" || x.Title == "New Order Request Received") && x.IsRead != true)
                .Select(x => x.Message)
                .ToListAsync();

            var bookingIds = pendingBookingNotifications
                .Select(ParseBookingIdFromNotification)
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (!bookingIds.Any())
            {
                return new List<BookingViewModel>();
            }

            var bookings = await (from book in _db.Bookings
                                  join custInfo in _db.UserInformations on book.CustomerId equals custInfo.UserId into custInfoGroup
                                  from custInfo in custInfoGroup.DefaultIfEmpty()
                                  where bookingIds.Contains(book.Id)
                                      && book.IsDeleted != true
                                      && (book.CT_BookingStatus == RideStatus.RequestForRide || (book.CT_BookingStatus == RideStatus.DriverAssigned && book.DriverId == null))
                                      && !book.DriverId.HasValue
                                  orderby book.CreatedAt descending
                                  select new BookingViewModel
                                  {
                                      Id = book.Id,
                                      CustomerId = book.CustomerId,
                                      CustomerName = book.CustomerName,
                                      CustomerProfilePic = custInfo != null ? custInfo.ProfilePic : null,
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
                                  }).ToListAsync();

            // Match notification metadata for each booking
            foreach (var b in bookings)
            {
                var assignNotif = pendingBookingNotifications.FirstOrDefault(msg => msg != null && msg.StartsWith($"ASSIGN_SHIPMENT|{b.Id}|"));
                if (assignNotif != null)
                {
                    b.AssignedByTransporter = true;
                    var parts = assignNotif.Split('|');
                    if (parts.Length > 3)
                    {
                        b.TransporterName = parts[3];
                    }
                }
            }

            return bookings;
        }

        public async Task<List<BookingViewModel>> GetTransporterRideRequestsAsync(string transporterUserId)
        {
            if (string.IsNullOrWhiteSpace(transporterUserId))
            {
                return new List<BookingViewModel> { new BookingViewModel { Message = "Transporter user id is required." } };
            }

            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(x => x.UserId == transporterUserId && x.IsDeleted != true);
            if (transporter == null)
            {
                return new List<BookingViewModel> { new BookingViewModel { Message = "Transporter not found." } };
            }

            var driverUserIds = await _db.Drivers
                .Where(d => d.TransporterId == transporter.Id && d.IsDeleted != true && d.UserId != null)
                .Select(d => d.UserId)
                .ToListAsync();

            var pendingBookingIds = await _db.Notifications
                .Where(x => (x.UserId == transporterUserId || driverUserIds.Contains(x.UserId)) 
                            && (x.Title == "New Ride Request" || x.Title == "New Order Request Received" || x.Title == "New Shipment Assignment") 
                            && x.IsRead != true)
                .Select(x => x.Message)
                .ToListAsync();

            var bookingIds = pendingBookingIds
                .Select(ParseBookingIdFromNotification)
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (!bookingIds.Any()) return new List<BookingViewModel>();

            return await (from book in _db.Bookings
                          join custInfo in _db.UserInformations on book.CustomerId equals custInfo.UserId into custInfoGroup
                          from custInfo in custInfoGroup.DefaultIfEmpty()
                          where bookingIds.Contains(book.Id)
                              && book.IsDeleted != true
                              && book.CT_BookingStatus == RideStatus.RequestForRide
                              && !book.DriverId.HasValue
                          orderby book.CreatedAt descending
                          select new BookingViewModel
                          {
                              Id = book.Id,
                              CustomerId = book.CustomerId,
                              CustomerName = book.CustomerName,
                              CustomerProfilePic = custInfo != null ? custInfo.ProfilePic : null,
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
                          }).ToListAsync();
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

            var bookings = await (from book in _db.Bookings
                                  join custInfo in _db.UserInformations on book.CustomerId equals custInfo.UserId into custInfoGroup
                                  from custInfo in custInfoGroup.DefaultIfEmpty()
                                  join veh in _db.Vehicles on book.VehicleId equals veh.Id into vehGroup
                                  from veh in vehGroup.DefaultIfEmpty()
                                  where book.DriverId == driver.Id && book.IsDeleted != true && book.CustomerId != null
                                  orderby book.CreatedAt descending
                                  select new BookingViewModel
                                  {
                                      Id = book.Id,
                                      CustomerId = book.CustomerId,
                                      CustomerName = book.CustomerName,
                                      CustomerProfilePic = custInfo != null ? custInfo.ProfilePic : null,
                                      VehicleId = book.VehicleId,
                                      VehicleName = veh != null ? veh.VehicleName : string.Empty,
                                      VehicleNumber = veh != null ? veh.VehicleNumber : string.Empty,
                                      DriverId = book.DriverId,
                                      DriverName = driver.Name,
                                      DriverPhone = driver.Phone,
                                      DriverUserId = driver.UserId,
                                      DriverProfilePic = driver.PhotoUrl,
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
                                      IsPaid = _db.Payments.Any(p => p.TransactionReference != null 
                                          && (p.TransactionReference.Contains("RIDE:" + book.Id) 
                                              || p.TransactionReference.Contains("DirectWalletRecord-" + book.Id) 
                                              || p.TransactionReference.Contains("CASH_COMMISSION|RIDE:" + book.Id)
                                              || p.TransactionReference.Contains("Ride_" + book.Id)) 
                                          && p.PaymentStatus == "paid" 
                                          && p.IsDeleted != true),
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

            var driverUserIds = driversList.Select(d => d.UserId).Where(u => !string.IsNullOrEmpty(u)).ToList();
            var onlineUserInfos = await _db.UserInformations
                .Where(u => driverUserIds.Contains(u.UserId) && u.IsOnline == true)
                .Select(u => u.UserId)
                .ToListAsync();
            var onlineUserSet = new HashSet<string>(onlineUserInfos, StringComparer.OrdinalIgnoreCase);

            var vehicleCommonTypes = await _db.CommonTypes
                .Where(c => c.Keys == "VEHTYP" && c.IsDeleted != true)
                .ToListAsync();
            var vehicleTypeLookup = vehicleCommonTypes.ToDictionary(c => c.Id, c => c.Name);

            string requestedCategory = string.Empty;
            if (model.CT_VehicleType.HasValue && model.CT_VehicleType != 0)
            {
                vehicleTypeLookup.TryGetValue(model.CT_VehicleType.Value, out var reqName);
                requestedCategory = GetVehicleCategory(model.CT_VehicleType.Value, reqName);
            }

            var candidates = new List<DriverCandidate>();
            foreach (var driver in driversList)
            {
                // Driver must be online to receive ride request notifications
                if (string.IsNullOrEmpty(driver.UserId) || !onlineUserSet.Contains(driver.UserId))
                {
                    continue;
                }

                var assignment = activeAssignments.FirstOrDefault(a => a.DriverId == driver.Id);
                var vehicle = assignment != null ? vehicles.FirstOrDefault(v => v.Id == assignment.VehicleId) : null;

                // Strictly match exclusively across the 3 categories: 2_wheeler, 3_wheeler, truck
                if (!string.IsNullOrEmpty(requestedCategory))
                {
                    if (vehicle != null && vehicle.CT_VehicleType.HasValue)
                    {
                        vehicleTypeLookup.TryGetValue(vehicle.CT_VehicleType.Value, out var driverVehName);
                        var driverCategory = GetVehicleCategory(vehicle.CT_VehicleType.Value, driverVehName);

                        if (driverCategory != requestedCategory)
                        {
                            continue;
                        }
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

            var customerUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == model.CustomerId || u.Email == model.CustomerId || u.UserName == model.CustomerId);
            var customerDetail = await _db.CustomerDetails.FirstOrDefaultAsync(c => c.UserId == model.CustomerId || c.Id.ToString() == model.CustomerId);
            string validCustomerId = customerUser?.Id ?? customerDetail?.UserId ?? (await _db.Users.Select(u => u.Id).FirstOrDefaultAsync()) ?? model.CustomerId;

            var booking = new Booking
            {
                CustomerId = validCustomerId,
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

            var booking = new Booking
            {
                CustomerId = model.CustomerId,
                CustomerName = model.CustomerName,
                VehicleId = model.VehicleId,
                DriverId = model.DriverId,
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
                            50.0 // 50 km radius
                        );

                        if (!isClose) continue;
                    }
                    else
                    {
                        continue; // Skip drivers without known coordinates
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

        public async Task<BookingViewModel> UpdateRideStatusAsync(long bookingId, string status, Guid? driverId = null)
        {
            if (!RideStatus.TryParse(status, out var nextStatus))
            {
                return new BookingViewModel
                {
                    Id = bookingId,
                    Message = "Invalid status. Use: request_for_ride, driver_assigned, driver_arriving, ride_started, ride_completed, cancelled.",
                };
            }

            var booking = await _db.Bookings.FirstOrDefaultAsync(x => x.Id == bookingId && x.IsDeleted != true);
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
                booking.DriverId = driverId;
            }

            booking.CT_BookingStatus = nextStatus;

            if (nextStatus == RideStatus.DriverAssigned || booking.DriverId.HasValue)
            {
                var pendingBookingNotifs = await _db.Notifications
                    .Where(n => (n.Title == "New Ride Request" || n.Title == "New Shipment Assignment")
                                && n.IsRead != true
                                && n.Message != null
                                && (n.Message.Contains($"Ride #{booking.Id}")
                                    || n.Message.StartsWith($"CLAIM|{booking.Id}|")
                                    || n.Message.StartsWith($"ASSIGN_SHIPMENT|{booking.Id}|")))
                    .ToListAsync();

                foreach (var n in pendingBookingNotifs)
                {
                    n.IsRead = true;
                    _db.Notifications.Update(n);
                }
            }

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
                var notifBody = nextStatus == RideStatus.Cancelled 
                    ? $"RIDE_CANCELLED|{booking.Id}|{customerMessage.body}" 
                    : (nextStatus == RideStatus.DriverAssigned 
                        ? $"RIDE_ASSIGNED|{booking.Id}|{customerMessage.body}" 
                        : customerMessage.body);

                await CreateNotificationAsync(booking.CustomerId, customerMessage.title, notifBody);
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
                // 1. If a driver is assigned or mapped, notify the driver
                Driver? driver = null;
                if (booking.DriverId.HasValue)
                {
                    driver = await _db.Drivers
                        .Include(d => d.Transporter)
                        .FirstOrDefaultAsync(x => x.Id == booking.DriverId.Value);

                    if (driver != null && !string.IsNullOrWhiteSpace(driver.UserId))
                    {
                        await CreateNotificationAsync(driver.UserId, "Ride Cancelled", $"RIDE_CANCELLED|{booking.Id}|Ride #{booking.Id} has been cancelled.");
                        await SafePushToUserAsync(
                            driver.UserId,
                            new PushNotificationPayload
                            {
                                Title = "Ride Cancelled",
                                Body = $"Ride #{booking.Id} has been cancelled.",
                                Data = CreatePushData(booking.Id, "ride_status", RideStatus.ToName(nextStatus)),
                            });
                    }
                }

                // 2. Identify Transporter (via driver, vehicle, or prior claim) and notify
                TransporterDetail? transporterDetail = driver?.Transporter;
                if (transporterDetail == null && driver?.TransporterId.HasValue == true)
                {
                    transporterDetail = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value);
                }

                if (transporterDetail == null && booking.VehicleId.HasValue)
                {
                    var veh = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == booking.VehicleId.Value);
                    if (veh != null && veh.TransporterId.HasValue)
                    {
                        transporterDetail = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == veh.TransporterId.Value);
                    }
                }

                if (transporterDetail == null)
                {
                    var claimNotif = await _db.Notifications
                        .Where(n => n.Message != null && n.Message.StartsWith($"CLAIM|{booking.Id}|"))
                        .OrderByDescending(n => n.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (claimNotif != null)
                    {
                        var parts = claimNotif.Message.Split('|');
                        if (parts.Length > 2 && long.TryParse(parts[2], out var tId))
                        {
                            transporterDetail = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == tId);
                        }
                    }
                }

                if (transporterDetail != null && !string.IsNullOrWhiteSpace(transporterDetail.UserId))
                {
                    var transporterUserId = transporterDetail.UserId;
                    var driverLabel = driver?.Name != null ? $" (Assigned to {driver.Name})" : "";
                    await CreateNotificationAsync(transporterUserId, "Ride Cancelled", $"RIDE_CANCELLED|{booking.Id}|Ride #{booking.Id}{driverLabel} has been cancelled.");
                    await SafePushToUserAsync(
                        transporterUserId,
                        new PushNotificationPayload
                        {
                            Title = "Ride Cancelled",
                            Body = $"Ride #{booking.Id}{driverLabel} has been cancelled.",
                            Data = CreatePushData(booking.Id, "ride_status", RideStatus.ToName(nextStatus)),
                        });
                }
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
            var targetUserIds = new List<string>(driverUserIds) { transporterUserId };

            var notifications = await _db.Notifications
                .Where(x => targetUserIds.Contains(x.UserId) && x.IsRead != true && x.Message != null && (x.Message.Contains($"Ride #{bookingId}") || x.Message.Contains($"|{bookingId}|")))
                .ToListAsync();

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

            var driverNotification = await _db.Notifications
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(x =>
                    x.UserId == driverUserId &&
                    x.Title == "New Ride Request" &&
                    x.IsRead != true &&
                    x.Message != null &&
                    x.Message.Contains($"Ride #{bookingId}"));

            if (driverNotification == null)
            {
                return new BookingViewModel { Id = bookingId, Message = "Pending ride request not found for this driver." };
            }

            driverNotification.IsRead = true;
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
                await SafePushToUserAsync(
                    booking.CustomerId,
                    new PushNotificationPayload
                    {
                        Title = title,
                        Body = body,
                        Data = CreatePushData(booking.Id, "ride_request_update", RideStatus.ToName(RideStatus.RequestForRide)),
                    });
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
                DriverUserId = booking.Driver?.UserId,
                DriverProfilePic = booking.Driver?.PhotoUrl,
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
                CT_VehicleType = booking.CT_VehicleType,
                CTBodyType = booking.CTBodyType,
                CTTyreType = booking.CTTyreType,
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

            if (message.StartsWith("ASSIGN_SHIPMENT|", StringComparison.OrdinalIgnoreCase) ||
                message.StartsWith("CLAIM|", StringComparison.OrdinalIgnoreCase) ||
                message.StartsWith("DRIVER_ACCEPT_ORDER|", StringComparison.OrdinalIgnoreCase) ||
                message.StartsWith("DRIVER_ASSIGNED|", StringComparison.OrdinalIgnoreCase) ||
                message.StartsWith("NEW_ORDER_REQUEST|", StringComparison.OrdinalIgnoreCase))
            {
                var parts = message.Split('|');
                if (parts.Length > 1 && long.TryParse(parts[1], out var bid))
                {
                    return bid;
                }
            }

            const string marker = "Ride #";
            var markerIndex = message.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex >= 0)
            {
                var start = markerIndex + marker.Length;
                var digits = new string(message.Skip(start).TakeWhile(char.IsDigit).ToArray());
                if (long.TryParse(digits, out var bookingId)) return bookingId;
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

        private static string GetVehicleCategory(int? typeId, string? typeName)
        {
            var name = (typeName ?? string.Empty).Trim().ToLowerInvariant();
            if (name.Contains("2-wheeler") || name.Contains("2 wheeler") || name.Contains("bike") || name.Contains("scooter") || name.Contains("two wheeler"))
            {
                return "2_wheeler";
            }
            if (name.Contains("3-wheeler") || name.Contains("3 wheeler") || name.Contains("auto") || name.Contains("three wheeler") || name.Contains("rickshaw"))
            {
                return "3_wheeler";
            }
            // All other freight / transport vehicles are treated as truck category (Mini Truck, LCV, Tata Ace, Container, 14Ft, Multi Axle, etc.)
            return "truck";
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

