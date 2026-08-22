using System;
using System.Collections.Generic;

namespace satguruApp.DLL.Models;

public partial class Driver
{
    public Guid Id { get; set; }

    public string Name { get; set; }

    public string Phone { get; set; }

    public string LicenseNumber { get; set; }

    public DateTime? LicenseExpiry { get; set; }

    public string PhotoUrl { get; set; }

    public bool? IsDeleted { get; set; }

    public string UserId { get; set; }

    public long? TransporterId { get; set; }
    public string ProfileStatus { get; set; }
    public string? TransactionPIN { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual TransporterDetail Transporter { get; set; }
}
