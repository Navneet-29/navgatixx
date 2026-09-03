using FirebaseAdmin.Auth;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography.Xml;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class TransportService : Repository<Driver>, ITransportService
    {
        public TransportService(SatguruDBContext context) : base(context)
        { }
        private SatguruDBContext _db => (SatguruDBContext)_context;

        public async Task<int> SaveDriverAsync(DriverViewModel driverInfo)
        {
            var gender = await _db.Genders.Where(x => x.Name == driverInfo.Gender && !string.IsNullOrEmpty( driverInfo.Gender) || (x.Id == driverInfo.GenderId)).FirstOrDefaultAsync();
            if (gender == null && !string.IsNullOrEmpty(driverInfo.Gender))
            {
                gender = new Gender();
                gender.Name = driverInfo.Gender;
                gender.IsDeleted = false;
                _db.Genders.Add(gender);
                await _db.SaveChangesAsync();
            }
            if (driverInfo.UserId != null)
            {
                if (driverInfo.Id == null || driverInfo.Id == Guid.Empty)
                {
                    var driver = new Driver();
                    driver.Id = Guid.NewGuid();
                    driver.TransporterId = driverInfo.TransporterId;

                    // Resolve TransporterId from TransporterUserId if not provided
                    if ((driver.TransporterId == null || driver.TransporterId == 0) && !string.IsNullOrEmpty(driverInfo.TransporterUserId))
                    {
                        var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == driverInfo.TransporterUserId);
                        if (transporter != null)
                        {
                            driver.TransporterId = transporter.Id;
                        }
                    }

                    driver.UserId = driverInfo.UserId;
                    driver.Name = driverInfo.FirstName + " " + driverInfo.LastName;
                    driver.Phone = Convert.ToString(driverInfo.Mobile);
                    driver.LicenseNumber = driverInfo.LicenseNumber;
                    driver.LicenseExpiry = driverInfo.LicenseExpiry;
                    driver.PhotoUrl = driverInfo.ProfilePic;
                    driver.IsDeleted = false;
                    _db.Drivers.Add(driver);
                }
                else
                {
                    Driver driver = await _db.Drivers.Where(x => x.Id == driverInfo.Id).FirstOrDefaultAsync();
                    driver.Name = driverInfo.FirstName + " " + driverInfo.LastName;
                    driver.Phone = Convert.ToString(driverInfo.Mobile);
                    driver.LicenseNumber = driverInfo.LicenseNumber;
                    driver.LicenseExpiry = driverInfo.LicenseExpiry;
                    driver.PhotoUrl = driverInfo.ProfilePic;
                    driver.IsDeleted = false;
                }
                return await _db.SaveChangesAsync();
            }
            return 0;
        }
        public async Task<long> SaveTransporterAsync(TransporterViewModel transportInfo)
        {
            var gender = await _db.Genders.Where(x => x.Name == transportInfo.Gender || x.Id == transportInfo.GenderId).FirstOrDefaultAsync();
            if (gender == null && !string.IsNullOrEmpty(transportInfo.Gender))
            {
                gender = new Gender();
                gender.Name = transportInfo.Gender;
                gender.IsDeleted = false;
                _db.Genders.Add(gender);
                await _db.SaveChangesAsync();
            }
            if (transportInfo.UserId != null)
            {
                var transporter = new TransporterDetail();
                if (transportInfo.CustTransId == null || transportInfo.CustTransId == 0)
                {
                    
                    transporter.CompanyName = transportInfo.FirstName + " " + transportInfo.LastName;
                    transporter.BankAccountNumber = transportInfo.BankAccountNumber;
                    transporter.GSTNumber = transportInfo.GSTNumber;
                    transporter.IFSCCode = transportInfo.IFSCCode;
                    transporter.ProfileVerified = transportInfo.ProfileVerified;
                    transporter.IsDeleted = false;
                    transporter.UserId = transportInfo.UserId;
                    _db.TransporterDetails.Add(transporter);
                }
                else
                {
                     transporter = await _db.TransporterDetails.Where(x => x.Id == transportInfo.CustTransId).FirstOrDefaultAsync();
                    if (transporter != null)
                    {
                        transporter.CompanyName = transportInfo.FirstName + " " + transportInfo.LastName;
                        transporter.BankAccountNumber = transportInfo.BankAccountNumber;
                        transporter.GSTNumber = transportInfo.GSTNumber;
                        transporter.IFSCCode = transportInfo.IFSCCode;
                        transporter.UserId = transportInfo.UserId;
                        transporter.ProfileVerified = transportInfo.ProfileVerified;
                        transporter.IsDeleted = false;
                    }
                }
                 await _db.SaveChangesAsync();
                return transporter.Id;
            }
            return 0;

        }

        public async Task<DriverViewModel> GetDriverDetails(string userId)
        {
            return await (from drv in _db.Drivers
                          join trans in _db.TransporterDetails on drv.TransporterId equals trans.Id
                          join userInfo in _db.UserInformations on drv.UserId equals userInfo.UserId
                          where drv.IsDeleted != true && drv.UserId == userId
                          select new DriverViewModel
                          {
                              Id = drv.Id,
                              Name = drv.Name,
                              TransporterId = drv.TransporterId,
                              UserId = drv.UserId,
                              LicenseExpiry = drv.LicenseExpiry,
                              LicenseNumber = drv.LicenseNumber,
                              IsDeleted = drv.IsDeleted
                          }).FirstOrDefaultAsync();
        }
        public async Task<TransporterViewModel> GetTransporterDetails(string userId) {
            return await (from transport in _db.TransporterDetails
                          join userInfo in _db.UserInformations on transport.UserId equals userInfo.UserId
                          where transport.IsDeleted != true && transport.UserId == userId
                          select new TransporterViewModel
                          {
                              CustTransId = transport.Id,
                              Name = transport.CompanyName,
                              UserId = transport.UserId,
                              BankAccountNumber = !string.IsNullOrEmpty(transport.BankAccountNumber) && transport.BankAccountNumber.Length >= 4 
                                  ? transport.BankAccountNumber.Substring(transport.BankAccountNumber.Length - 4) 
                                  : (transport.BankAccountNumber ?? ""),
                              IFSCCode = transport.IFSCCode,
                              IsDeleted= transport.IsDeleted,
                              GSTNumber = transport.GSTNumber,
                              ProfileVerified = transport.ProfileVerified
                          }).FirstOrDefaultAsync();
        }

        public async Task<int> SaveDriverKYCAsync(DriverKYCViewModel kycInfo)
        {
            var kyc = await _db.DriverKYCs.FirstOrDefaultAsync(x => x.DriverId == kycInfo.DriverId && x.DocumentType == kycInfo.DocumentType);
            if (kyc == null)
            {
                kyc = new DriverKYC
                {
                    Id = Guid.NewGuid(),
                    DriverId = kycInfo.DriverId,
                    CreatedAt = DateTime.UtcNow
                };
                _db.DriverKYCs.Add(kyc);
            }

            kyc.DocumentType = kycInfo.DocumentType;
            kyc.DocumentUrl = kycInfo.DocumentUrl;
            kyc.VerifiedStatus = "Pending";

            return await _db.SaveChangesAsync();
        }

        public async Task<List<DriverKYCViewModel>> GetDriverKYCAsync(Guid driverId)
        {
            return await _db.DriverKYCs
                .Where(x => x.DriverId == driverId)
                .Select(x => new DriverKYCViewModel
                {
                    Id = x.Id,
                    DriverId = x.DriverId,
                    DocumentType = x.DocumentType,
                    DocumentUrl = x.DocumentUrl,
                    VerifiedStatus = x.VerifiedStatus,
                    CreatedAt = x.CreatedAt
                }).ToListAsync();
        }

        public async Task<int> UpdateProfileStatusAsync(Guid driverId, string status)
        {
            var driver = await _db.Drivers.FirstOrDefaultAsync(x => x.Id == driverId);
            if (driver != null)
            {
                driver.ProfileStatus = status;
                return await _db.SaveChangesAsync();
            }
            return 0;
        }

        public async Task<TransporterDashboardSummaryViewModel> GetDashboardSummary(string userId)
        {
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return new TransporterDashboardSummaryViewModel();

            var fleetCount = await _db.Vehicles.CountAsync(v => v.TransporterId == transporter.Id && v.IsDeleted != true);
            var driverListEntities = await _db.Drivers.Where(d => d.TransporterId == transporter.Id && d.IsDeleted != true).ToListAsync();
            var driverCount = driverListEntities.Count;
            var driverGuidIds = driverListEntities.Select(d => d.Id).ToList();
            var vehicleGuidIds = await _db.Vehicles.Where(v => v.TransporterId == transporter.Id && v.IsDeleted != true).Select(v => v.Id).ToListAsync();
            
            var todayUtc = DateTime.UtcNow.Date;

            // Online / Offline drivers counts
            var driversList = await (from d in _db.Drivers
                                     join u in _db.UserInformations on d.UserId equals u.UserId into uj
                                     from u in uj.DefaultIfEmpty()
                                     where d.TransporterId == transporter.Id && d.IsDeleted != true
                                     select new { d, isOnline = u != null && u.IsOnline == true }).ToListAsync();

            var onlineDriversCount = driversList.Count(x => x.isOnline);
            var offlineDriversCount = driversList.Count(x => !x.isOnline);

            // All bookings linked to this transporter's vehicles or drivers
            var allFleetBookings = await _db.Bookings
                .Where(b => b.IsDeleted != true && 
                           ((b.VehicleId.HasValue && vehicleGuidIds.Contains(b.VehicleId.Value)) ||
                            (b.DriverId.HasValue && driverGuidIds.Contains(b.DriverId.Value))))
                .ToListAsync();

            // Today's Shipments (customer trips created today)
            var todaysShipmentsCount = allFleetBookings
                .Count(b => b.CustomerId != null && b.CreatedAt.HasValue && b.CreatedAt.Value.Date == todayUtc);

            // Active Shipments (customer trips currently active / on route - NOT standing assignments)
            var activeShipmentsCount = allFleetBookings
                .Count(b => b.CustomerId != null && 
                           (b.CT_BookingStatus == RideStatus.DriverAssigned 
                            || b.CT_BookingStatus == RideStatus.DriverArriving 
                            || b.CT_BookingStatus == RideStatus.RideStarted));

            // Today's Earnings (addition of today's net earnings of each driver/completed booking & recorded payments today)
            var driverUserIds = driverListEntities.Where(d => !string.IsNullOrEmpty(d.UserId)).Select(d => d.UserId!).ToList();
            var todaysDriverPayments = await _db.Payments
                .Where(p => p.IsDeleted != true
                            && p.PaymentStatus == "paid"
                            && p.PaidAt >= todayUtc
                            && p.TransactionReference != null)
                .ToListAsync();

            decimal todaysPaymentsFaresSum = 0;
            var paidRideIds = new HashSet<long>();

            foreach (var p in todaysDriverPayments)
            {
                var isDriverLinked = driverUserIds.Any(uId => p.TransactionReference!.Contains($"DRIVER_USER:{uId}"));
                if (!isDriverLinked) continue;

                if (p.PaymentMode == "cash_commission")
                {
                    // Commission = 10%, Gross fare = commission / 0.10
                    todaysPaymentsFaresSum += (p.Amount ?? 0) * 10m;
                    var match = System.Text.RegularExpressions.Regex.Match(p.TransactionReference!, @"RIDE:(\d+)");
                    if (match.Success && long.TryParse(match.Groups[1].Value, out var rId))
                    {
                        paidRideIds.Add(rId);
                    }
                }
                else if (p.PaymentMode == "ride_payment")
                {
                    // Net = 90%, Gross fare = Net / 0.90
                    todaysPaymentsFaresSum += (p.Amount ?? 0) / 0.90m;
                    var match = System.Text.RegularExpressions.Regex.Match(p.TransactionReference!, @"RIDE:(\d+)");
                    if (match.Success && long.TryParse(match.Groups[1].Value, out var rId))
                    {
                        paidRideIds.Add(rId);
                    }
                }
            }

            var unrecordedCompletedFares = allFleetBookings
                .Where(b => b.CT_BookingStatus == RideStatus.RideCompleted && 
                            b.CreatedAt.HasValue && b.CreatedAt.Value.Date == todayUtc &&
                            !paidRideIds.Contains(b.Id))
                .Sum(b => b.FinalFare ?? b.EstimatedFare ?? 0);

            var todaysFaresSum = todaysPaymentsFaresSum + unrecordedCompletedFares;

            // Pending Driver Relationship requests
            var pendingDriverRequestsCount = await _db.Notifications
                .CountAsync(n => n.UserId == userId 
                              && n.IsRead != true 
                              && (n.Message.StartsWith("JOIN|") 
                                  || n.Message.StartsWith("INVITE|") 
                                  || n.Message.StartsWith("LEAVE|")));

            // Maintain legacy properties alongside requested ones for safety
            return new TransporterDashboardSummaryViewModel
            {
                TotalFleet = fleetCount,
                ActiveDrivers = driverCount,
                OngoingTrips = activeShipmentsCount,
                TotalRides = todaysShipmentsCount,
                TotalEarnings = todaysFaresSum,
                PendingApprovals = pendingDriverRequestsCount,

                TodaysEarnings = todaysFaresSum,
                TodaysShipments = todaysShipmentsCount,
                ActiveShipments = activeShipmentsCount,
                OnlineDrivers = onlineDriversCount,
                OfflineDrivers = offlineDriversCount,
                PendingDriverRequests = pendingDriverRequestsCount
            };
        }

        public async Task<TransporterAnalyticsViewModel> GetTransporterAnalytics(string userId)
        {
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return new TransporterAnalyticsViewModel();

            var vehicles = await _db.Vehicles.Where(v => v.TransporterId == transporter.Id && v.IsDeleted != true).Select(v => v.Id).ToListAsync();
            var driverGuidIds = await _db.Drivers.Where(d => d.TransporterId == transporter.Id && d.IsDeleted != true).Select(d => d.Id).ToListAsync();
            
            var allBookings = await _db.Bookings
                .Where(b => b.IsDeleted != true && 
                           ((b.VehicleId.HasValue && vehicles.Contains(b.VehicleId.Value)) ||
                            (b.DriverId.HasValue && driverGuidIds.Contains(b.DriverId.Value))))
                .ToListAsync();

            var completedBookings = allBookings.Where(b => b.CT_BookingStatus == RideStatus.RideCompleted).ToList();
            var cancelledBookings = allBookings.Where(b => b.CT_BookingStatus == RideStatus.Cancelled).ToList();

            var today = DateTime.UtcNow.Date;
            var dailyBookings = completedBookings.Where(b => b.CreatedAt.HasValue && b.CreatedAt.Value.Date == today).ToList();

            var activeBookings = allBookings.Where(b => b.CustomerId != null && 
                (b.CT_BookingStatus == RideStatus.DriverAssigned || 
                 b.CT_BookingStatus == RideStatus.DriverArriving || 
                 b.CT_BookingStatus == RideStatus.RideStarted)).ToList();

            decimal totalDist = 0;
            decimal dailyDist = 0;

            foreach (var b in completedBookings)
            {
                var dist = (decimal)CalculateDistanceKm(b.PickupLat, b.PickupLng, b.DropLat, b.DropLng);
                // Sanity check: valid trip distance within reasonable range (< 5000 km)
                if (dist > 0 && dist < 5000)
                {
                    totalDist += dist;
                    if (b.CreatedAt.HasValue && b.CreatedAt.Value.Date == today)
                    {
                        dailyDist += dist;
                    }
                }
            }

            // Include live distance accumulated in currently active trips (with valid customers)
            foreach (var b in activeBookings.Where(b => b.CustomerId != null && b.PickupLat.HasValue && b.PickupLng.HasValue && b.DropLat.HasValue && b.DropLng.HasValue))
            {
                var routeDist = (decimal)CalculateDistanceKm(b.PickupLat, b.PickupLng, b.DropLat, b.DropLng);
                if (routeDist <= 0 || routeDist > 5000) continue;

                if (b.CT_BookingStatus == RideStatus.RideStarted)
                {
                    var liveTrack = await _db.LiveVehicleTrackings.FirstOrDefaultAsync(t => t.BookingId == b.Id || (b.VehicleId.HasValue && t.VehicleId == b.VehicleId.Value));
                    if (liveTrack != null && liveTrack.LastLatitude.HasValue && liveTrack.LastLongitude.HasValue)
                    {
                        var remaining = (decimal)CalculateDistanceKm(liveTrack.LastLatitude, liveTrack.LastLongitude, b.DropLat, b.DropLng);
                        var progressedDist = Math.Max(0, Math.Min(routeDist, routeDist - remaining));
                        totalDist += progressedDist;
                        dailyDist += progressedDist;
                    }
                }
            }

            decimal performance = 100m;
            int closedRides = completedBookings.Count + cancelledBookings.Count;
            if (closedRides > 0)
            {
                performance = Math.Round((decimal)completedBookings.Count / closedRides * 100m, 1);
            }

            return new TransporterAnalyticsViewModel
            {
                DailyTrips = dailyBookings.Count,
                TotalTrips = completedBookings.Count,
                TotalDistanceKm = Math.Round(totalDist, 2),
                DailyDistanceKm = Math.Round(dailyDist, 2),
                EstimatedFuelLiters = Math.Round(totalDist / 4m, 2), // Rough estimate: 4km per liter for heavy fleet
                DailyEarnings = dailyBookings.Sum(b => b.FinalFare ?? 0),
                TotalEarnings = completedBookings.Sum(b => b.FinalFare ?? 0),
                PerformanceScore = performance
            };
        }

        private double CalculateDistanceKm(decimal? lat1, decimal? lon1, decimal? lat2, decimal? lon2)
        {
            if (!lat1.HasValue || !lon1.HasValue || !lat2.HasValue || !lon2.HasValue) return 0;
            var R = 6371; // Earth radius km
            var dLat = ToRadians((double)(lat2.Value - lat1.Value));
            var dLon = ToRadians((double)(lon2.Value - lon1.Value));
            
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians((double)lat1.Value)) * Math.Cos(ToRadians((double)lat2.Value)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private double ToRadians(double angle) => angle * Math.PI / 180.0;

        public async Task<List<TransporterFleetItemViewModel>> GetFleetOverview(string userId)
        {
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return new List<TransporterFleetItemViewModel>();

            var vehicles = await _db.Vehicles
                .Where(v => v.TransporterId == transporter.Id && v.IsDeleted != true)
                .OrderBy(v => v.VehicleNumber)
                .ToListAsync();

            if (!vehicles.Any()) return new List<TransporterFleetItemViewModel>();

            var vehicleIds = vehicles.Select(v => v.Id).ToList();
            var bookings = await _db.Bookings
                .Where(b => b.VehicleId.HasValue && vehicleIds.Contains(b.VehicleId.Value) && b.IsDeleted != true)
                .ToListAsync();

            var driverIds = bookings.Where(b => b.DriverId.HasValue).Select(b => b.DriverId.Value).Distinct().ToList();
            var drivers = await _db.Drivers.Where(d => driverIds.Contains(d.Id) && d.IsDeleted != true).ToListAsync();
            var driverLookup = drivers.ToDictionary(d => d.Id, d => d);

            var bookingsByVehicle = bookings
                .Where(b => b.VehicleId.HasValue)
                .GroupBy(b => b.VehicleId.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var bookingsByDriver = bookings
                .Where(b => b.DriverId.HasValue)
                .GroupBy(b => b.DriverId.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var liveTrackings = await _db.LiveVehicleTrackings
                .Where(x => x.VehicleId.HasValue && vehicleIds.Contains(x.VehicleId.Value) && x.IsDeleted != true)
                .ToListAsync();

            var latestTracking = liveTrackings
                .GroupBy(x => x.VehicleId.Value)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.LastUpdated).First());

            var typeIds = vehicles.Where(v => v.CT_VehicleType.HasValue).Select(v => v.CT_VehicleType.Value).Distinct().ToList();
            var commonTypeNames = await _db.CommonTypes
                .Where(ct => typeIds.Contains(ct.Id))
                .ToDictionaryAsync(ct => ct.Id, ct => ct.Name);

            var nowUtc = DateTime.UtcNow;
            var threshold = TimeSpan.FromMinutes(10);

            var fleet = new List<TransporterFleetItemViewModel>();

            foreach (var vehicle in vehicles)
            {
                bookingsByVehicle.TryGetValue(vehicle.Id, out var vehicleBookings);
                var vehicleBookingList = vehicleBookings ?? new List<Booking>();
                var completedVehicleBookings = vehicleBookingList.Where(b => b.CustomerId != null && b.CT_BookingStatus == RideStatus.RideCompleted).ToList();
                var activeBooking = vehicleBookingList
                    .Where(b => b.CustomerId != null 
                                && b.CT_BookingStatus != RideStatus.RideCompleted 
                                && b.CT_BookingStatus != RideStatus.Cancelled
                                && b.CT_BookingStatus != RideStatus.RequestForRide)
                    .OrderByDescending(b => b.CreatedAt ?? DateTime.MinValue)
                    .FirstOrDefault();

                var standingAssignment = vehicleBookingList
                    .Where(b => b.DriverId.HasValue && b.CustomerId == null && b.CT_BookingStatus != RideStatus.Cancelled)
                    .OrderByDescending(b => b.CreatedAt ?? DateTime.MinValue)
                    .FirstOrDefault();

                var resolvedDriverBooking = activeBooking ?? standingAssignment;
                Guid? driverId = resolvedDriverBooking?.DriverId;
                var driver = driverId.HasValue && driverLookup.TryGetValue(driverId.Value, out var driverDetail) ? driverDetail : null;
                List<Booking> driverBookings = null;
                if (driverId.HasValue)
                {
                    bookingsByDriver.TryGetValue(driverId.Value, out driverBookings);
                }
                var driverCompletedBookings = (driverBookings ?? new List<Booking>())
                    .Where(b => b.CT_BookingStatus == RideStatus.RideCompleted)
                    .ToList();

                var driverCompletedRides = driverCompletedBookings.Count;
                var driverEarnings = driverCompletedBookings.Sum(b => b.FinalFare ?? 0);
                
                var today = DateTime.UtcNow.Date;
                var driverDailyEarnings = driverCompletedBookings
                    .Where(b => b.CreatedAt.HasValue && b.CreatedAt.Value.Date == today)
                    .Sum(b => b.FinalFare ?? 0);

                var vehicleCompletedRides = completedVehicleBookings.Count;
                var vehicleEarnings = completedVehicleBookings.Sum(b => b.FinalFare ?? 0);

                latestTracking.TryGetValue(vehicle.Id, out var liveEntry);
                var latitude = liveEntry?.LastLatitude ?? vehicle.CurrentLatitude;
                var longitude = liveEntry?.LastLongitude ?? vehicle.CurrentLongitude;
                var liveStatus = "No Signal";
                if (liveEntry != null)
                {
                    if (liveEntry.LastUpdated.HasValue && (nowUtc - liveEntry.LastUpdated.Value) <= threshold)
                    {
                        liveStatus = "Live";
                    }
                    else
                    {
                        liveStatus = "Stale";
                    }
                }

                var routeSummary = activeBooking != null
                    ? $"{(string.IsNullOrWhiteSpace(activeBooking.PickupAddress) ? "Pickup" : activeBooking.PickupAddress)} -> {(string.IsNullOrWhiteSpace(activeBooking.DropAddress) ? "Drop" : activeBooking.DropAddress)}"
                    : "Idle";

                var rawStatus = activeBooking != null
                    ? RideStatus.ToName(activeBooking.CT_BookingStatus)
                    : null;
                var friendlyStatus = FormatFriendlyStatus(rawStatus);

                var vehicleTypeName = vehicle.CT_VehicleType.HasValue && commonTypeNames.TryGetValue(vehicle.CT_VehicleType.Value, out var typeName)
                    ? typeName
                    : string.Empty;

                fleet.Add(new TransporterFleetItemViewModel
                {
                    VehicleId = vehicle.Id,
                    VehicleNumber = vehicle.VehicleNumber,
                    VehicleName = string.IsNullOrWhiteSpace(vehicle.VehicleName) ? vehicle.VehicleNumber : vehicle.VehicleName,
                    VehicleTypeName = vehicleTypeName,
                    DriverId = driver?.Id,
                    DriverName = driver?.Name ?? "Unassigned",
                    DriverPhone = driver?.Phone,
                    DriverUserId = driver?.UserId,
                    ActiveBookingId = activeBooking?.Id,
                    RideStatus = friendlyStatus,
                    RouteSummary = activeBooking != null ? routeSummary : "Idle",
                    VehicleCompletedRides = vehicleCompletedRides,
                    VehicleEarnings = vehicleEarnings,
                    DriverCompletedRides = driverCompletedRides,
                    DriverEarnings = driverEarnings,
                    Latitude = latitude,
                    Longitude = longitude,
                    LiveUpdatedAt = liveEntry?.LastUpdated,
                    LiveStatus = liveStatus,
                    EstimatedFare = activeBooking?.EstimatedFare,
                    DropAddress = activeBooking?.DropAddress,
                    GoodsType = activeBooking?.GoodsType,
                    DailyEarnings = driverDailyEarnings,
                });
            }

            return fleet;
        }

        private static string FormatFriendlyStatus(string rawStatus)
        {
            if (string.IsNullOrWhiteSpace(rawStatus))
            {
                return "Available";
            }

            return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(rawStatus.Replace('_', ' '));
        }

        public async Task<List<DriverViewModel>> GetDriversList(string userId)
        {
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return new List<DriverViewModel>();

            var drivers = await (from dvr in _db.Drivers
                                 join userInfo in _db.UserInformations on dvr.UserId equals userInfo.UserId
                                 where dvr.TransporterId == transporter.Id && dvr.IsDeleted != true
                                 select new { dvr, userInfo }).ToListAsync();

            var driverGuidIds = drivers.Select(x => x.dvr.Id).ToList();

            // Fetch average ratings for all target users
            var ratingsList = await _db.UserRatings
                .Where(r => r.Target_User_Id != null && r.IsDeleted != true)
                .GroupBy(r => r.Target_User_Id)
                .Select(g => new { UserId = g.Key, AvgScore = g.Average(r => r.Score ?? 0) })
                .ToDictionaryAsync(x => x.UserId, x => x.AvgScore);

            // Fetch all bookings for these drivers to calculate active route and earnings
            var driverBookings = await _db.Bookings
                .Where(b => b.DriverId != null && driverGuidIds.Contains(b.DriverId.Value) && b.IsDeleted != true)
                .OrderByDescending(b => b.CreatedAt ?? DateTime.MinValue)
                .ToListAsync();

            var bookingsByDriver = driverBookings.GroupBy(b => b.DriverId.Value).ToDictionary(g => g.Key, g => g.ToList());

            var vehicleIds = driverBookings.Where(b => b.VehicleId.HasValue).Select(b => b.VehicleId.Value).Distinct().ToList();
            var vehicleLookup = await _db.Vehicles
                .Where(v => vehicleIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, v => v);

            var trackings = await _db.LiveVehicleTrackings
                .Where(t => t.IsDeleted != true)
                .ToListAsync();

            var trackingsByVehicle = trackings
                .Where(t => t.VehicleId.HasValue)
                .GroupBy(t => t.VehicleId.Value)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(t => t.LastUpdated).First());

            var trackingsByUser = trackings
                .Where(t => !string.IsNullOrEmpty(t.UserId))
                .GroupBy(t => t.UserId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(t => t.LastUpdated).First());

            var today = DateTime.UtcNow.Date;

            return drivers.Select(x => {
                var rating = 5.0; // Default
                if (Guid.TryParse(x.dvr.UserId, out var driverUserGuid))
                {
                    if (ratingsList.TryGetValue(driverUserGuid, out var avg))
                    {
                        rating = (double)avg;
                    }
                }

                bookingsByDriver.TryGetValue(x.dvr.Id, out var bList);
                var allDriverBookings = bList ?? new List<Booking>();

                // A real customer ride has a CustomerId, valid status (accepted, arriving, started), and is not completed/cancelled
                var activeBooking = allDriverBookings
                    .FirstOrDefault(b => b.CustomerId != null 
                                         && b.CT_BookingStatus != RideStatus.RideCompleted 
                                         && b.CT_BookingStatus != RideStatus.Cancelled
                                         && b.CT_BookingStatus != RideStatus.RequestForRide);

                var standingAssignment = allDriverBookings
                    .Where(b => b.VehicleId.HasValue && b.CustomerId == null && b.CT_BookingStatus != RideStatus.Cancelled)
                    .OrderByDescending(b => b.CreatedAt ?? DateTime.MinValue)
                    .FirstOrDefault();

                var completedBookings = allDriverBookings
                    .Where(b => b.CustomerId != null && b.CT_BookingStatus == RideStatus.RideCompleted)
                    .ToList();

                var todaysEarnings = completedBookings
                    .Where(b => b.CreatedAt.HasValue && b.CreatedAt.Value.Date == today)
                    .Sum(b => b.FinalFare ?? b.EstimatedFare ?? 0);

                var totalEarnings = completedBookings
                    .Sum(b => b.FinalFare ?? b.EstimatedFare ?? 0);

                var hasActiveRide = activeBooking != null;
                var resolvedVehicleBooking = activeBooking ?? standingAssignment;
                var activeVehicle = resolvedVehicleBooking?.VehicleId.HasValue == true && vehicleLookup.TryGetValue(resolvedVehicleBooking.VehicleId.Value, out var veh) ? veh : null;

                var rideStatusStr = "Offline";
                if (x.userInfo.IsOnline == true)
                {
                    rideStatusStr = hasActiveRide ? "On Ride" : "Available";
                }

                // Resolve location from active vehicle tracking or direct user tracking
                decimal? lat = null;
                decimal? lng = null;
                if (activeVehicle != null && trackingsByVehicle.TryGetValue(activeVehicle.Id, out var vTrack))
                {
                    lat = vTrack.LastLatitude;
                    lng = vTrack.LastLongitude;
                }
                if ((lat == null || lng == null) && !string.IsNullOrEmpty(x.dvr.UserId) && trackingsByUser.TryGetValue(x.dvr.UserId, out var uTrack))
                {
                    lat = uTrack.LastLatitude;
                    lng = uTrack.LastLongitude;
                }
                if ((lat == null || lng == null) && activeVehicle != null)
                {
                    lat = activeVehicle.CurrentLatitude;
                    lng = activeVehicle.CurrentLongitude;
                }

                return new DriverViewModel
                {
                    Id = x.dvr.Id,
                    Name = x.dvr.Name,
                    Phone = x.dvr.Phone,
                    Mobile = !string.IsNullOrEmpty(x.dvr.Phone) ? long.Parse(new string(x.dvr.Phone.Where(char.IsDigit).Take(15).ToArray()) == "" ? "0" : new string(x.dvr.Phone.Where(char.IsDigit).Take(15).ToArray())) : 0,
                    LicenseNumber = x.dvr.LicenseNumber,
                    LicenseExpiry = x.dvr.LicenseExpiry,
                    ProfilePic = x.dvr.PhotoUrl,
                    ProfileStatus = x.dvr.ProfileStatus,
                    UserId = x.dvr.UserId,
                    IsOnline = x.userInfo.IsOnline,
                    VehicleName = activeVehicle?.VehicleName,
                    VehicleNumber = activeVehicle?.VehicleNumber,
                    CT_VehicleType = activeVehicle?.CT_VehicleType,
                    CTBodyType = activeVehicle?.CTBodyType,
                    CTTyreType = activeVehicle?.CTTyreType,
                    DriverRating = Math.Round(rating, 1),
                    RideStatus = rideStatusStr,
                    ActiveBookingId = resolvedVehicleBooking?.Id,
                    PickupAddress = activeBooking?.PickupAddress,
                    DropAddress = activeBooking?.DropAddress,
                    EstimatedFare = activeBooking?.EstimatedFare,
                    FinalFare = activeBooking?.FinalFare,
                    TodaysEarnings = todaysEarnings,
                    TotalEarnings = totalEarnings,
                    TotalTrips = completedBookings.Count,
                    CurrentLatitude = lat,
                    CurrentLongitude = lng
                };
            }).ToList();
        }

        public async Task<List<VehicleViewModel>> GetVehiclesList(string userId)
        {
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return new List<VehicleViewModel>();

            var vehicles = await _db.Vehicles
                .Where(v => v.TransporterId == transporter.Id && v.IsDeleted != true)
                .ToListAsync();

            var allTypeIds = vehicles
                .SelectMany(v => new[] { v.CT_VehicleType, v.CTBodyType, v.CTTyreType })
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            var commonTypeNames = await _db.CommonTypes
                .Where(ct => allTypeIds.Contains(ct.Id))
                .ToDictionaryAsync(ct => ct.Id, ct => ct.Name);

            return vehicles.Select(v => new VehicleViewModel
            {
                Id = v.Id,
                VehicleNumber = v.VehicleNumber,
                VehicleName = v.VehicleName,
                CapacityTons = v.CapacityTons,
                RCNumber = v.RCNumber,
                InsuranceExpiry = v.InsuranceExpiry,
                PermitExpiry = v.PermitExpiry,
                RoadTaxExpiry = v.RoadTaxExpiry,
                UploadPhoneUrl = v.UploadPhoneUrl,
                CTBodyType = v.CTBodyType,
                BodyTypeName = v.CTBodyType.HasValue && commonTypeNames.TryGetValue(v.CTBodyType.Value, out var btName) ? btName : null,
                CTTyreType = v.CTTyreType,
                TyreTypeName = v.CTTyreType.HasValue && commonTypeNames.TryGetValue(v.CTTyreType.Value, out var ttName) ? ttName : null,
                IsAvailable = v.IsAvailable,
                CT_VehicleType = v.CT_VehicleType,
                VehicleTypeName = v.CT_VehicleType.HasValue && commonTypeNames.TryGetValue(v.CT_VehicleType.Value, out var name) ? name : "Unknown",
                CurrentLatitude = v.CurrentLatitude,
                CurrentLongitude = v.CurrentLongitude,
                IsDeleted = v.IsDeleted
            }).ToList();
        }

        public async Task<TransporterEarningsViewModel> GetTransporterEarningsAsync(string userId)
        {
            var transporter = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.UserId == userId);
            if (transporter == null) return new TransporterEarningsViewModel();

            var vehicles = await _db.Vehicles.Where(v => v.TransporterId == transporter.Id && v.IsDeleted != true).Select(v => v.Id).ToListAsync();
            
            var completedBookings = await _db.Bookings
                .Where(b => b.VehicleId.HasValue && vehicles.Contains(b.VehicleId.Value) && b.CT_BookingStatus == RideStatus.RideCompleted)
                .ToListAsync();

            var totalRevenue = completedBookings.Sum(b => b.FinalFare ?? b.EstimatedFare ?? 0);
            
            // Assuming 10% commission if not specified in booking
            var commission = completedBookings.Sum(b => (b.FinalFare ?? b.EstimatedFare ?? 0) * 0.10m);

            var result = new TransporterEarningsViewModel
            {
                TotalRevenue = totalRevenue,
                CommissionPaid = commission,
                NetEarnings = totalRevenue - commission
            };

            // Fetch payments (settlements) to the transporter
            // Using a similar marker pattern as drivers but for transporters
            var marker = $"TRANSPORTER_USER:{userId}";
            var payments = await _db.Payments
                .Where(x => x.IsDeleted != true && x.TransactionReference != null && x.TransactionReference.Contains(marker))
                .OrderByDescending(x => x.PaidAt)
                .ToListAsync();

            foreach (var p in payments)
            {
                result.Settlements.Add(new TransporterSettlementViewModel
                {
                    Id = p.Id,
                    Date = p.PaidAt ?? DateTime.MinValue,
                    Amount = p.Amount ?? 0,
                    Status = p.PaymentStatus,
                    Reference = p.TransactionReference
                });
            }

            return result;
        }
    }
}

