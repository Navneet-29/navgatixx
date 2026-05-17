using System;
using System.Collections.Generic;

namespace satguruApp.DLL.Models;

public partial class LiveVehicleTrackingHistory
{
    public long Id { get; set; }

    public long? LiveVehicleTrackingId { get; set; }

    public bool? IsDeleted { get; set; }

    public Guid? VehicleId { get; set; }

    public decimal? LastLatitude { get; set; }

    public decimal? LastLongitude { get; set; }

    public DateTime? LastUpdated { get; set; }

    public string DeviceId { get; set; }

    public string UserId { get; set; }

    public long? BookingId { get; set; }

    public decimal? Speed { get; set; }

    public decimal? Heading { get; set; }

    public DateTime? RecordedAt { get; set; }
}
