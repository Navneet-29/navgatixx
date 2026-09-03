using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class DisputeService : IDisputeService
    {
        private readonly SatguruDBContext _db;

        public DisputeService(SatguruDBContext db)
        {
            _db = db;
        }

        public Task<DisputeResultViewModel> ReportComplaintAsync(ComplaintReportViewModel model)
        {
            var payload = new ComplaintReportViewModel
            {
                RideId = model.RideId,
                IssueType = string.IsNullOrWhiteSpace(model.IssueType) ? "complaint" : model.IssueType,
                Description = model.Description,
                CreatedBy = model.CreatedBy,
            };
            return SaveComplaintAsync(payload);
        }

        public Task<DisputeResultViewModel> ReportRideIssueAsync(ComplaintReportViewModel model)
        {
            var payload = new ComplaintReportViewModel
            {
                RideId = model.RideId,
                IssueType = "ride_issue",
                Description = model.Description,
                CreatedBy = model.CreatedBy,
            };
            return SaveComplaintAsync(payload);
        }

        public async Task<List<DisputeItemViewModel>> GetByRideAsync(long rideId)
        {
            return await _db.Complaints
                .Where(x => x.Booking_Id == rideId && x.IsDeleted != true)
                .OrderByDescending(x => x.CreatedDateTime)
                .Select(x => new DisputeItemViewModel
                {
                    Id = x.Id,
                    RideId = x.Booking_Id,
                    IssueType = x.Issue_Type,
                    Description = x.Description,
                    Status = x.Status,
                    Resolution = x.Resolution,
                    CreatedDateTime = x.CreatedDateTime,
                })
                .ToListAsync();
        }

        private async Task<DisputeResultViewModel> SaveComplaintAsync(ComplaintReportViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Description))
            {
                return new DisputeResultViewModel { Success = false, Message = "Description is required." };
            }

            var complaint = new Complaint
            {
                Booking_Id = model.RideId,
                Issue_Type = string.IsNullOrWhiteSpace(model.IssueType) ? "complaint" : model.IssueType,
                Description = model.Description,
                Status = 0, // open
                Resolution = string.Empty,
                IsDeleted = false,
                CreatedBy = model.CreatedBy,
                CreatedDateTime = DateTime.UtcNow,
            };

            _db.Complaints.Add(complaint);
            await _db.SaveChangesAsync();

            // Notify Transporter if the ride was driven by a driver attached to a Transporter
            if (model.RideId.HasValue && model.RideId.Value > 0)
            {
                try
                {
                    var ride = await _db.Bookings
                        .Include(b => b.Driver)
                        .Include(b => b.Vehicle)
                        .FirstOrDefaultAsync(b => b.Id == model.RideId.Value);

                    if (ride != null && ride.Driver != null)
                    {
                        var driver = ride.Driver;
                        var driverName = driver.Name ?? "Driver";
                        var vehicleNo = ride.Vehicle?.VehicleNumber ?? "N/A";
                        var issueTypeTitle = complaint.Issue_Type == "ride_issue" ? "Ride Issue" : "Customer Complaint";

                        // 1. If driver belongs to a Transporter, notify Transporter
                        if (driver.TransporterId.HasValue)
                        {
                            var transporter = await _db.TransporterDetails
                                .FirstOrDefaultAsync(t => t.Id == driver.TransporterId.Value && t.IsDeleted != true);

                            if (transporter != null && !string.IsNullOrEmpty(transporter.UserId))
                            {
                                var transporterNotif = new Notification
                                {
                                    Id = Guid.NewGuid(),
                                    UserId = transporter.UserId,
                                    Title = $"⚠️ {issueTypeTitle} Reported: Ride #{ride.Id}",
                                    Message = $"DISPUTE_ALERT|Ride #{ride.Id}|Driver: {driverName} ({vehicleNo})|Issue: {complaint.Issue_Type}|Details: {complaint.Description}",
                                    CreatedAt = DateTime.UtcNow,
                                    IsRead = false,
                                };
                                _db.Notifications.Add(transporterNotif);
                            }
                        }

                        // 2. Also notify the Driver directly
                        if (!string.IsNullOrEmpty(driver.UserId))
                        {
                            var driverNotif = new Notification
                            {
                                Id = Guid.NewGuid(),
                                UserId = driver.UserId,
                                Title = $"⚠️ Customer {issueTypeTitle}: Ride #{ride.Id}",
                                Message = $"DISPUTE_ALERT|Ride #{ride.Id}|Customer reported an issue: \"{complaint.Description}\"",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false,
                            };
                            _db.Notifications.Add(driverNotif);
                        }

                        await _db.SaveChangesAsync();
                    }
                }
                catch (Exception)
                {
                    // Fail silently so complaint is never blocked
                }
            }

            return new DisputeResultViewModel
            {
                Success = true,
                Message = "Dispute reported successfully. Both admin and transporter have been notified.",
                ComplaintId = complaint.Id,
            };
        }
    }
}

