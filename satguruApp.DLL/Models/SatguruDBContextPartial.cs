//using Microsoft.AspNet.Identity.EntityFramework;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace satguruApp.DLL.Models
{
    public partial class SatguruDBContext: IdentityDbContext<ApplicationUser, ApplicationRole, string>
    {
        public virtual DbSet<ChatMessage> ChatMessages { get; set; }

        protected void OnModelCreatingPartial(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<ApplicationUser>().HasMany(u => u.Claims).WithOne().HasForeignKey(c => c.UserId).IsRequired().OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ApplicationUser>().HasMany(u => u.Roles).WithOne().HasForeignKey(r => r.UserId).IsRequired().OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ApplicationRole>().HasMany(r => r.Claims).WithOne().HasForeignKey(c => c.RoleId).IsRequired().OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ApplicationRole>().HasMany(r => r.Users).WithOne().HasForeignKey(r => r.RoleId).IsRequired().OnDelete(DeleteBehavior.Cascade);


            modelBuilder.Entity<ApplicationUser>().Property(p => p.LockoutEnd).HasColumnName("LockoutEndDateUtc");
            modelBuilder.Entity<ApplicationUser>().Property(p => p.AppUserId).ValueGeneratedOnAdd();
            modelBuilder.Entity<ApplicationUser>().Property(p => p.AppUserId).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
            modelBuilder.Entity<ApplicationUser>().Ignore(p => p.IsDeleted);


            modelBuilder.Entity<ApplicationUser>().ToTable("Users");
            modelBuilder.Entity<ApplicationRole>().ToTable("AspNetRoles");
            modelBuilder.Entity<IdentityRoleClaim<string>>().ToTable("AspNetRoleClaims");
            modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<string>>().ToTable("UserRoles").ToTable(x => x.HasTrigger("UserRoles_U"));
           // modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<string>>().HasKey(e => new { e.RoleId, e.UserId });
            modelBuilder.Entity<UserRole>().HasKey(e => new { e.RoleId, e.UserId });
            modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<string>>().ToTable("UserLogins");
            modelBuilder.Entity<UserLogin>().HasKey(e => new { e.LoginProvider, e.ProviderKey, e.UserId });
            modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<string>>().ToTable("AspNetUserClaims");
            modelBuilder.Entity<UserRoles>().ToTable("UserRoles");

            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.ToTable("ChatMessages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
                entity.Property(e => e.RoomName).HasMaxLength(256).IsRequired();
                entity.Property(e => e.SenderUserId).HasMaxLength(450).IsRequired();
                entity.Property(e => e.SenderName).HasMaxLength(256);
                entity.Property(e => e.ReceiverUserId).HasMaxLength(450);
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnType("datetime").HasDefaultValueSql("(getutcdate())");
                entity.Property(e => e.IsRead).HasDefaultValue(false);
            });

            modelBuilder.Entity<PushDeviceToken>(entity =>
            {
                entity.ToTable("PushDeviceTokens");

                entity.HasKey(e => e.Id);

                entity.HasIndex(e => e.DeviceToken)
                    .IsUnique();

                entity.Property(e => e.Id)
                    .HasDefaultValueSql("(newid())");
                entity.Property(e => e.UserId)
                    .HasMaxLength(550)
                    .IsUnicode(false);
                entity.Property(e => e.DeviceToken)
                    .HasMaxLength(512)
                    .IsUnicode(false);
                entity.Property(e => e.Platform)
                    .HasMaxLength(20)
                    .IsUnicode(false);
                entity.Property(e => e.DeviceId)
                    .HasMaxLength(128)
                    .IsUnicode(false);
                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);
                entity.Property(e => e.CreatedAt)
                    .HasColumnType("datetime")
                    .HasDefaultValueSql("(getdate())");
                entity.Property(e => e.LastSeenAt)
                    .HasColumnType("datetime")
                    .HasDefaultValueSql("(getdate())");

                entity.HasOne(d => d.User)
                    .WithMany(p => p.PushDeviceTokens)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade)
                    .HasConstraintName("FK_PushDeviceTokens_Users");
            });
        }
    }
}
