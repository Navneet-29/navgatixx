using satguruApp.DLL.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.Service.ViewModels
{
    public partial class BookingViewModel
    {
        public static Expression<Func<Booking, BookingViewModel>> ModelMapFrom = (model) => new BookingViewModel
        {
            Id = model.Id,
            CustomerId = model.CustomerId,
            CustomerName = !string.IsNullOrEmpty(model.CustomerName) ? model.CustomerName : (model.Customer != null ? (model.Customer.FirstName + (!string.IsNullOrEmpty(model.Customer.LastName) ? model.Customer.LastName : string.Empty)) : string.Empty),
            VehicleId = model.VehicleId,
            VehicleNumber = model.Vehicle != null ? model.Vehicle.VehicleNumber : string.Empty,
            VehicleName = model.Vehicle != null ? model.Vehicle.VehicleName : string.Empty,
            DriverId = model.DriverId,
            DriverName = model.Driver != null ? model.Driver.Name : string.Empty,
            DriverPhone = model.Driver != null ? model.Driver.Phone : string.Empty,
            DriverUserId = model.Driver != null ? model.Driver.UserId : string.Empty,
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
            RideStatus = global::satguruApp.Service.ViewModels.RideStatus.ToName(model.CT_BookingStatus),
            ScheduledTime = model.ScheduledTime,
            CreatedAt = model.CreatedAt,
            IsAvailable = model.IsAvailable,
            IsPaid = false,
            DeptStateId = model.DeptStateId,
            DeptCityId = model.DeptCityId,
            ArrivalStateId = model.ArrivalStateId,
            ArrivalCityId = model.ArrivalCityId,
            CT_VehicleType = model.CT_VehicleType,
            CTBodyType = model.CTBodyType,
            CTTyreType = model.CTTyreType,
        };

        public void ModelMapTo(Booking model)
        {
            model.Id = Id;
            model.CustomerId = CustomerId;
            model.VehicleId = VehicleId;
            model.DriverId = DriverId;
            model.PickupAddress = PickupAddress;
            model.PickupLat = PickupLat;
            model.PickupLng = PickupLng;
            model.DropAddress = DropAddress;
            model.DropLat = DropLat;
            model.DropLng = DropLng;
            model.GoodsType = GoodsType;

            model.GoodsWeight = GoodsWeight;
            model.EstimatedFare = EstimatedFare;
            model.FinalFare = FinalFare;
            model.CT_BookingStatus = CT_BookingStatus;
            model.ScheduledTime = ScheduledTime;
            model.CreatedAt = CreatedAt;
            model.IsAvailable = IsAvailable;
            model.DeptStateId = DeptStateId;
            model.DeptCityId = DeptCityId;
            model.ArrivalStateId = ArrivalStateId;
            model.ArrivalCityId = ArrivalCityId;
            model.CustomerName = CustomerName;
            model.CT_VehicleType = CT_VehicleType;
            model.CTBodyType = CTBodyType;
            model.CTTyreType = CTTyreType;
        }

        public long Id { get; set; }
        public string? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public Guid? VehicleId { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleName { get; set; }
        public Guid? DriverId { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public string? DriverUserId { get; set; }
        public string? PickupAddress { get; set; }
        public string? DropAddress { get; set; }
        public decimal? PickupLat { get; set; }
        public decimal? PickupLng { get; set; }
        public decimal? DropLat { get; set; }
        public decimal? DropLng { get; set; }
        public string? GoodsType { get; set; }
        public decimal? GoodsWeight { get; set; }
        public decimal? EstimatedFare { get; set; }
        public decimal? FinalFare { get; set; }
        public int? CT_BookingStatus { get; set; }
        public string? RideStatus { get; set; }
        
        public DateTime? ScheduledTime { get; set; }
        public DateTime? CreatedAt { get; set; }
        public bool? IsAvailable { get; set; }
        public bool? IsDeleted { get; set; }
        public bool IsPaid { get; set; }
        public int? DeptStateId { get; set; }
        public int? DeptCityId { get; set; }
        public int? ArrivalStateId { get; set; }
        public int? ArrivalCityId { get; set; }
        public int? CT_VehicleType { get; set; }
        public int? CTBodyType { get; set; }
        public int? CTTyreType { get; set; }
        public string? Message { get; set; }

        public virtual ICollection<Payment>? Payments { get; set; } = new List<Payment>();
        public virtual VehicleViewModel? Vehicle { get; set; }
    }
}
