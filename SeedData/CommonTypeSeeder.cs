using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using satguruApp.DLL.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace navgatix.SeedData
{
    public static class CommonTypeSeeder
    {
        private static readonly ParentSeed[] ParentSeeds = new[]
        {
            new ParentSeed("Vehicle Type", "VEHTYP", "vehicle_type", 1, "Parent category for vehicle types"),
            new ParentSeed("Body Type", "BDTYP", "body_type", 2, "Parent category for vehicle body types"),
            new ParentSeed("Vehicle Tyre", "VEHTYR", "tyre_type", 3, "Parent category for vehicle tyre configurations"),
            new ParentSeed("Product Type", "PRODTYP", "product_type", 4, "Parent category for common cargo/product types")
        };

        private static readonly ChildSeed[] VehicleTypeChildren = new[]
        {
            new ChildSeed("VEHTYP", "2-Wheeler", "VEH001", 1),
            new ChildSeed("VEHTYP", "3-Wheeler / Auto Cargo", "VEH002", 2),
            new ChildSeed("VEHTYP", "Mini Truck (Tata Ace)", "VEH003", 3),
            new ChildSeed("VEHTYP", "Pickup Truck (LCV)", "VEH004", 4),
            new ChildSeed("VEHTYP", "14 Ft Truck", "VEH005", 5),
            new ChildSeed("VEHTYP", "17 Ft Truck", "VEH006", 6),
            new ChildSeed("VEHTYP", "20 Ft Truck", "VEH007", 7),
            new ChildSeed("VEHTYP", "24 Ft Truck", "VEH008", 8),
            new ChildSeed("VEHTYP", "32 Ft Truck", "VEH009", 9),
            new ChildSeed("VEHTYP", "Container Truck", "VEH010", 10),
            // Commented out vehicle types (kept for future use):
            // new ChildSeed("VEHTYP", "Tata Ace/Chhota Hathi", "VEH011", 11),
            // new ChildSeed("VEHTYP", "Mahindra Bolero Pickup", "VEH012", 12),
            // new ChildSeed("VEHTYP", "Single Axle Truck", "VEH013", 13),
            // new ChildSeed("VEHTYP", "Multi Axle Truck", "VEH014", 14),
        };

        private static readonly ChildSeed[] BodyTypeChildren = new[]
        {
            new ChildSeed("BDTYP", "Open Body", "BDY001", 1),
            new ChildSeed("BDTYP", "Closed / Box", "BDY002", 2),
            new ChildSeed("BDTYP", "Flat Bed", "BDY003", 3),
            new ChildSeed("BDTYP", "Refrigerated", "BDY004", 4),
            new ChildSeed("BDTYP", "Tipper", "BDY005", 5),
            new ChildSeed("BDTYP", "Tanker", "BDY006", 6),
            new ChildSeed("BDTYP", "Car Carrier", "BDY007", 7)
        };

        private static readonly ChildSeed[] TyreTypeChildren = new[]
        {
            new ChildSeed("VEHTYR", "4 Tyre", "TYR001", 1),
            new ChildSeed("VEHTYR", "6 Tyre", "TYR002", 2),
            new ChildSeed("VEHTYR", "10 Tyre", "TYR003", 3),
            new ChildSeed("VEHTYR", "12 Tyre", "TYR004", 4),
            // Commented out uncommon tyre types (kept for future use):
            // new ChildSeed("VEHTYR", "14 Tyre", "TYR005", 5),
            new ChildSeed("VEHTYR", "16 Tyre", "TYR006", 6),
            // new ChildSeed("VEHTYR", "18 Tyre", "TYR007", 7),
            new ChildSeed("VEHTYR", "22 Tyre", "TYR008", 8)
        };

        private static readonly ChildSeed[] ProductTypeChildren = new[]
        {
            new ChildSeed("PRODTYP", "Electronics", "PRD001", 1),
            new ChildSeed("PRODTYP", "Furniture", "PRD002", 2),
            new ChildSeed("PRODTYP", "Groceries", "PRD003", 3),
            new ChildSeed("PRODTYP", "Machinery", "PRD004", 4),
            new ChildSeed("PRODTYP", "Raw Materials", "PRD005", 5),
            new ChildSeed("PRODTYP", "Pharmaceuticals", "PRD006", 6),
            new ChildSeed("PRODTYP", "Textiles / Clothing", "PRD007", 7),
            new ChildSeed("PRODTYP", "Others", "PRD008", 8)
        };

        public static void Seed(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SatguruDBContext>();
            try
            {
                EnsureVehicleCommonTypesAsync(db).GetAwaiter().GetResult();
            }
            catch (Exception)
            {
            }
        }

        private static async Task EnsureVehicleCommonTypesAsync(SatguruDBContext db)
        {
            var parentLookup = new Dictionary<string, CommonType>(StringComparer.OrdinalIgnoreCase);
            foreach (var parentSeed in ParentSeeds)
            {
                var parent = await db.CommonTypes
                    .FirstOrDefaultAsync(ct => ct.Code == parentSeed.Code && !(ct.IsDeleted ?? false));

                if (parent == null)
                {
                    parent = new CommonType
                    {
                        Name = parentSeed.Name,
                        Code = parentSeed.Code,
                        Keys = parentSeed.Keys,
                        OrderBy = parentSeed.Order,
                        ValueDesc = parentSeed.Description,
                        Source = "SYSTEM",
                        IsDeleted = false,
                        IsSystem = true,
                        CreatedDatetime = DateTime.UtcNow
                    };
                    db.CommonTypes.Add(parent);
                    await db.SaveChangesAsync();
                }

                parentLookup[parentSeed.Code] = parent;
            }

            var activeVehicleCodes = VehicleTypeChildren.Select(c => c.Code).ToHashSet();
            var activeTyreCodes = TyreTypeChildren.Select(c => c.Code).ToHashSet();

            // Soft-delete deprecated or duplicate vehicle types in DB that are not in activeVehicleCodes
            if (parentLookup.TryGetValue("VEHTYP", out var vehParent))
            {
                var existingVehTypes = await db.CommonTypes
                    .Where(ct => ct.CTID == vehParent.Id && !(ct.IsDeleted ?? false))
                    .ToListAsync();

                foreach (var existing in existingVehTypes)
                {
                    var matchingSeed = VehicleTypeChildren.FirstOrDefault(c => c.Code == existing.Code || c.Name.EndsWith(existing.Name) || existing.Name.Contains(c.Name.Replace("🏍 ", "").Replace("🛺 ", "").Replace("🚚 ", "").Replace("🛻 ", "").Replace("🚛 ", "").Replace("🚢 ", "")));
                    if (matchingSeed.Code != null)
                    {
                        existing.Name = matchingSeed.Name;
                        existing.ValueDesc = matchingSeed.Name;
                        existing.ValueStr = matchingSeed.Name;
                        existing.OrderBy = matchingSeed.Order;
                        db.CommonTypes.Update(existing);
                    }
                    else if (!activeVehicleCodes.Contains(existing.Code))
                    {
                        existing.IsDeleted = true;
                        db.CommonTypes.Update(existing);
                    }
                }
                await db.SaveChangesAsync();
            }

            // Soft-delete commented out tyre types in DB
            if (parentLookup.TryGetValue("VEHTYR", out var tyrParent))
            {
                var existingTyreTypes = await db.CommonTypes
                    .Where(ct => ct.CTID == tyrParent.Id && !(ct.IsDeleted ?? false))
                    .ToListAsync();

                foreach (var existing in existingTyreTypes)
                {
                    if (!activeTyreCodes.Contains(existing.Code))
                    {
                        existing.IsDeleted = true;
                        db.CommonTypes.Update(existing);
                    }
                }
                await db.SaveChangesAsync();
            }

            var children = VehicleTypeChildren
                .Concat(BodyTypeChildren)
                .Concat(TyreTypeChildren)
                .Concat(ProductTypeChildren)
                .ToList();

            var now = DateTime.UtcNow;
            var newChildren = new List<CommonType>();

            foreach (var childSeed in children)
            {
                if (!parentLookup.TryGetValue(childSeed.ParentCode, out var parent))
                {
                    continue;
                }

                var existingChild = await db.CommonTypes.FirstOrDefaultAsync(ct => ct.Code == childSeed.Code && !(ct.IsDeleted ?? false));
                if (existingChild != null)
                {
                    existingChild.Name = childSeed.Name;
                    existingChild.ValueDesc = childSeed.Name;
                    existingChild.ValueStr = childSeed.Name;
                    existingChild.OrderBy = childSeed.Order;
                    if (existingChild.CTID != parent.Id)
                    {
                        existingChild.CTID = parent.Id;
                    }
                    db.CommonTypes.Update(existingChild);
                    continue;
                }

                newChildren.Add(new CommonType
                {
                    Name = childSeed.Name,
                    Code = childSeed.Code,
                    CTID = parent.Id,
                    Keys = parent.Keys,
                    OrderBy = childSeed.Order,
                    ValueDesc = childSeed.Name,
                    ValueStr = childSeed.Name,
                    Source = "SYSTEM",
                    IsDeleted = false,
                    IsSystem = true,
                    CreatedDatetime = now
                });
            }

            if (newChildren.Count > 0)
            {
                db.CommonTypes.AddRange(newChildren);
            }
            await db.SaveChangesAsync();
        }

        public readonly record struct ParentSeed(string Name, string Code, string Keys, int Order, string Description);
        public readonly record struct ChildSeed(string ParentCode, string Name, string Code, int Order);
    }
}
