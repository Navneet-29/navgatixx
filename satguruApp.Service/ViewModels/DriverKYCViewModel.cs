using System;
using Microsoft.AspNetCore.Http;

namespace satguruApp.Service.ViewModels;

public class DriverKYCViewModel
{
    public Guid? Id { get; set; }
    public Guid DriverId { get; set; }
    public string DocumentType { get; set; }
    public string DocumentUrl { get; set; }
    public string VerifiedStatus { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DriverKYCUploadRequest
{
    public Guid DriverId { get; set; }
    public string DocumentType { get; set; }
    public IFormFile File { get; set; }
}

