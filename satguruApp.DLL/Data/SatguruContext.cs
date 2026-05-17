using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;

namespace satguruApp.DLL.Data;

public partial class SatguruContext : DbContext
{
    public SatguruContext(DbContextOptions<SatguruContext> options)
        : base(options)
    {
    }

        public virtual DbSet<AccountType> AccountTypes { get; set; }

    public virtual DbSet<Address> Addresses { get; set; }

    public virtual DbSet<Booking> Bookings { get; set; }

    public virtual DbSet<BookingBenefitsLog> BookingBenefitsLogs { get; set; }

    public virtual DbSet<BookingRate> BookingRates { get; set; }

    public virtual DbSet<CandicateQualification> CandicateQualifications { get; set; }

    public virtual DbSet<Candidate> Candidates { get; set; }

    public virtual DbSet<CandidateCompany> CandidateCompanies { get; set; }

    public virtual DbSet<CandidateEducation> CandidateEducations { get; set; }

    public virtual DbSet<CandidateSkill> CandidateSkills { get; set; }

    public virtual DbSet<CandidateSpecification> CandidateSpecifications { get; set; }

    public virtual DbSet<City> Cities { get; set; }

    public virtual DbSet<CommonType> CommonTypes { get; set; }

    public virtual DbSet<Company> Companies { get; set; }

    public virtual DbSet<CompanyCode> CompanyCodes { get; set; }

    public virtual DbSet<CompanyCodeDetail> CompanyCodeDetails { get; set; }

    public virtual DbSet<CompanyName> CompanyNames { get; set; }

    public virtual DbSet<CompensationPackage> CompensationPackages { get; set; }

    public virtual DbSet<Complaint> Complaints { get; set; }

    public virtual DbSet<ContactU> ContactUs { get; set; }

    public virtual DbSet<Country> Countries { get; set; }

    public virtual DbSet<Course> Courses { get; set; }

    public virtual DbSet<CourseSubject> CourseSubjects { get; set; }

    public virtual DbSet<CustomerDetail> CustomerDetails { get; set; }

    public virtual DbSet<Department> Departments { get; set; }

    public virtual DbSet<DivisionPayrollCycle> DivisionPayrollCycles { get; set; }

    public virtual DbSet<Document> Documents { get; set; }

    public virtual DbSet<Driver> Drivers { get; set; }

    public virtual DbSet<Education> Educations { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<EmployeeEthinicity> EmployeeEthinicities { get; set; }

    public virtual DbSet<EmployeePayrate> EmployeePayrates { get; set; }

    public virtual DbSet<EmployeePayrateHoursCode> EmployeePayrateHoursCodes { get; set; }

    public virtual DbSet<EmployeePolicyClassfication> EmployeePolicyClassfications { get; set; }

    public virtual DbSet<EmployeeTimeOff> EmployeeTimeOffs { get; set; }

    public virtual DbSet<EmployeeVeteranStatu> EmployeeVeteranStatus { get; set; }

    public virtual DbSet<FAAccountType> FAAccountTypes { get; set; }

    public virtual DbSet<FAHoursCode> FAHoursCodes { get; set; }

    public virtual DbSet<FAPayCategory> FAPayCategories { get; set; }

    public virtual DbSet<FAPayCategoryDetail> FAPayCategoryDetails { get; set; }

    public virtual DbSet<FaAccountTypeCost> FaAccountTypeCosts { get; set; }

    public virtual DbSet<Gender> Genders { get; set; }

    public virtual DbSet<HRPayCycle> HRPayCycles { get; set; }

    public virtual DbSet<HRPayPeriod> HRPayPeriods { get; set; }

    public virtual DbSet<HRPosition> HRPositions { get; set; }

    public virtual DbSet<HoursCode> HoursCodes { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<JobSkill> JobSkills { get; set; }

    public virtual DbSet<LiveVehicleTracking> LiveVehicleTrackings { get; set; }
    public virtual DbSet<LiveVehicleTrackingHistory> LiveVehicleTrackingHistories { get; set; }

    public virtual DbSet<NavLink> NavLinks { get; set; }

    public virtual DbSet<NavLinkAudit> NavLinkAudits { get; set; }

    public virtual DbSet<NavLinkRole> NavLinkRoles { get; set; }

    public virtual DbSet<NavLinkRolesAudit> NavLinkRolesAudits { get; set; }

    public virtual DbSet<NavPosition> NavPositions { get; set; }

    public virtual DbSet<NavPositionsAudit> NavPositionsAudits { get; set; }

    public virtual DbSet<NavTree> NavTrees { get; set; }

    public virtual DbSet<NavTreeAudit> NavTreeAudits { get; set; }

    public virtual DbSet<NgxTableColumn> NgxTableColumns { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<PromoCode> PromoCodes { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Skill> Skills { get; set; }

    public virtual DbSet<State> States { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<SystemConfiguration> SystemConfigurations { get; set; }

    public virtual DbSet<TransporterDetail> TransporterDetails { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserCourse> UserCourses { get; set; }

    public virtual DbSet<UserInformation> UserInformations { get; set; }

    public virtual DbSet<UserLogin> UserLogins { get; set; }

    public virtual DbSet<UserRating> UserRatings { get; set; }

    public virtual DbSet<UserRole> UserRoles { get; set; }

    public virtual DbSet<UsersInRole> UsersInRoles { get; set; }

    public virtual DbSet<Vehicle> Vehicles { get; set; }

    public virtual DbSet<Wallet> Wallets { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AccountType>(entity =>
        {
            entity.ToTable("AccountType");

            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_AccountType_CreatedDate")
                .HasColumnType("datetime");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_AccountType_IsDeleted");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDate).HasColumnType("datetime");
        });

        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Address__3214EC07350DA90E");

            entity.ToTable("Address");

            entity.Property(e => e.Address1)
                .HasMaxLength(500)
                .HasColumnName("Address");
            entity.Property(e => e.Location_Code).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Zip_Code).HasMaxLength(50);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Bookings__Create__7B264821")
                .HasColumnType("datetime");
            entity.Property(e => e.CustomerId)
                .HasMaxLength(450)
                .IsUnicode(false);
            entity.Property(e => e.CustomerName)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.DropAddress).HasMaxLength(255);
            entity.Property(e => e.DropLat).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.DropLng).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.EstimatedFare).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FinalFare).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.GoodsType).HasMaxLength(100);
            entity.Property(e => e.GoodsWeight).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.IsAvailable).HasDefaultValue(true);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.PickupAddress).HasMaxLength(255);
            entity.Property(e => e.PickupLat).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.PickupLng).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.ScheduledTime).HasColumnType("datetime");

            entity.HasOne(d => d.Customer).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK__Bookings__Custom__2BC97F7C");

            entity.HasOne(d => d.Driver).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.DriverId)
                .HasConstraintName("FK__Bookings__Driver__2CBDA3B5");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.VehicleId)
                .HasConstraintName("FK__Bookings__Vehicl__5BAD9CC8");
        });

        modelBuilder.Entity<BookingBenefitsLog>(entity =>
        {
            entity.ToTable("BookingBenefitsLog");

            entity.Property(e => e.CashbackAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.DiscountAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.PromoCode)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WalletCredited).HasDefaultValue(false);
        });

        modelBuilder.Entity<BookingRate>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__BookingR__3214EC078D2A8DF2");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.BaseRatePerKm).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.EffectiveFrom).HasColumnType("datetime");
            entity.Property(e => e.ExtraWeightChargePerTon).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.MaxDistanceKm).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MinDistanceKm).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.VehicleType)
                .HasMaxLength(30)
                .IsUnicode(false);
        });

        modelBuilder.Entity<CandicateQualification>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("CandicateQualification");

            entity.Property(e => e.Id).ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<Candidate>(entity =>
        {
            entity.ToTable("Candidate");

            entity.Property(e => e.AlternateNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Birthdate).HasColumnType("date");
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.CurrentDesignation)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.CurrentEmployer)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.CurrentLocation)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.EmailId)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.EmailId2)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Experience).HasColumnType("numeric(18, 0)");
            entity.Property(e => e.FisrtName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.LastName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.MiddleName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Mobile)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.OptedOut)
                .HasMaxLength(10)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.OptedOutDate).HasColumnType("datetime");
            entity.Property(e => e.PAProcessedDate).HasColumnType("datetime");
            entity.Property(e => e.PGCourse)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.PreferredLocation)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.ResumePath)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.ResumeTitle)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.ResumeUpdatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.SalaryType)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Salutation)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Skills)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.StatusDatetime).HasColumnType("datetime");
            entity.Property(e => e.UGCourse)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(500)
                .IsUnicode(false);
        });

        modelBuilder.Entity<CandidateCompany>(entity =>
        {
            entity.ToTable("CandidateCompany");
        });

        modelBuilder.Entity<CandidateEducation>(entity =>
        {
            entity.ToTable("CandidateEducation");
        });

        modelBuilder.Entity<CandidateSkill>(entity =>
        {
            entity.ToTable("CandidateSkill");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<CandidateSpecification>(entity =>
        {
            entity.ToTable("CandidateSpecification");
        });

        modelBuilder.Entity<City>(entity =>
        {
            entity.ToTable("City");

            entity.Property(e => e.CityName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<CommonType>(entity =>
        {
            entity.ToTable("CommonType");

            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Keys)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Name)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Source)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.ValueDT).HasColumnType("datetime");
            entity.Property(e => e.ValueDesc)
                .HasMaxLength(520)
                .IsUnicode(false);
            entity.Property(e => e.ValueStr)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("Company");

            entity.Property(e => e.AccountManagerEmailAddress).HasMaxLength(100);
            entity.Property(e => e.AccountingName).HasMaxLength(100);
            entity.Property(e => e.CINNo).HasMaxLength(21);
            entity.Property(e => e.Cage)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDateTime).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.EINFederalID).HasMaxLength(30);
            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Email2)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.IsAllowHrsOneTaskPerDay).HasDefaultValue(false);
            entity.Property(e => e.IsApproverOTComment).HasDefaultValue(false);
            entity.Property(e => e.IsHolidayWorkingComment).HasDefaultValue(false);
            entity.Property(e => e.IsNWHoursComment).HasDefaultValue(false);
            entity.Property(e => e.IsNotSubmitPrevTS).HasDefaultValue(false);
            entity.Property(e => e.IsWeekendHourComment).HasDefaultValue(false);
            entity.Property(e => e.IsZeroTimesheetApprove).HasDefaultValue(false);
            entity.Property(e => e.MaxHoursInWeek)
                .HasDefaultValue(0m)
                .HasColumnType("numeric(18, 2)");
            entity.Property(e => e.Name)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.PanNumber).HasMaxLength(12);
            entity.Property(e => e.PhoneCell).HasMaxLength(15);
            entity.Property(e => e.PhoneCell2).HasMaxLength(15);
            entity.Property(e => e.PhoneHome).HasMaxLength(50);
            entity.Property(e => e.PhoneHome2).HasMaxLength(15);
            entity.Property(e => e.PhoneOther).HasMaxLength(50);
            entity.Property(e => e.PhoneOther2).HasMaxLength(50);
            entity.Property(e => e.PhoneWork).HasMaxLength(15);
            entity.Property(e => e.PhoneWork2).HasMaxLength(15);
            entity.Property(e => e.Phone_Main).HasMaxLength(15);
            entity.Property(e => e.ShortName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.StatusReportEmail).HasMaxLength(200);
            entity.Property(e => e.StatusReportName).HasMaxLength(200);
            entity.Property(e => e.TIN).HasMaxLength(20);
            entity.Property(e => e.UEI).HasMaxLength(12);
            entity.Property(e => e.UpdatedBy).HasDefaultValue(0);
            entity.Property(e => e.UpdatedDateTime).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.WebsiteUrl).HasMaxLength(100);

            entity.HasOne(d => d.CTCategory).WithMany(p => p.CompanyCTCategories)
                .HasForeignKey(d => d.CTCategoryID)
                .HasConstraintName("FK_Company_CommonType4");

            entity.HasOne(d => d.CTClientType).WithMany(p => p.CompanyCTClientTypes)
                .HasForeignKey(d => d.CTClientTypeID)
                .HasConstraintName("FK_Company_CommonType2");

            entity.HasOne(d => d.CTIncorporationType).WithMany(p => p.CompanyCTIncorporationTypes)
                .HasForeignKey(d => d.CTIncorporationTypeID)
                .HasConstraintName("FK_Company_CommonType3");

            entity.HasOne(d => d.CTIndustry).WithMany(p => p.CompanyCTIndustries)
                .HasForeignKey(d => d.CTIndustryID)
                .HasConstraintName("FK_Company_CommonType");

            entity.HasOne(d => d.CTType).WithMany(p => p.CompanyCTTypes)
                .HasForeignKey(d => d.CTTypeID)
                .HasConstraintName("FK_Company_CommonType1");

            entity.HasOne(d => d.ParentCompany).WithMany(p => p.InverseParentCompany)
                .HasForeignKey(d => d.ParentCompanyID)
                .HasConstraintName("FK_Company_Company");
        });

        modelBuilder.Entity<CompanyCode>(entity =>
        {
            entity.ToTable("CompanyCode");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<CompanyCodeDetail>(entity =>
        {
            entity.ToTable("CompanyCodeDetail");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<CompanyName>(entity =>
        {
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Name)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<CompensationPackage>(entity =>
        {
            entity.ToTable("CompensationPackage");

            entity.Property(e => e.CompensationName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Complaint>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Complain__3214EC07984061EC");

            entity.ToTable("Complaint");

            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description)
                .HasMaxLength(1000)
                .IsUnicode(false);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Issue_Type)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Resolution)
                .HasMaxLength(1000)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedBy).HasDefaultValueSql("(NULL)");
        });

        modelBuilder.Entity<ContactU>(entity =>
        {
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.EmailId)
                .HasMaxLength(550)
                .IsUnicode(false);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(550)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Country>(entity =>
        {
            entity.ToTable("Country");

            entity.Property(e => e.CountryCodeThree)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CountryCodeTwo)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.CurrencySymbols)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.RegionName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.ToTable("Course");

            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Name)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDate).HasColumnType("datetime");
        });

        modelBuilder.Entity<CourseSubject>(entity =>
        {
            entity.ToTable("CourseSubject");

            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedDate).HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(500)
                .IsUnicode(false);

            entity.HasOne(d => d.Course).WithMany(p => p.CourseSubjects)
                .HasForeignKey(d => d.CourseId)
                .HasConstraintName("FK_CourseSubject_Course");

            entity.HasOne(d => d.Subject).WithMany(p => p.CourseSubjects)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("FK_CourseSubject_Subject");
        });

        modelBuilder.Entity<CustomerDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Customer__3214EC0792DF9830");

            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.City)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CompanyName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.GSTNumber)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Pincode)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.State)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.UserId)
                .HasMaxLength(450)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany(p => p.CustomerDetails)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__CustomerD__UserI__308E3499");
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<DivisionPayrollCycle>(entity =>
        {
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.Property(e => e.Comment).IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.DocType)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.DocumentExt)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.DocumentIssueDate).HasColumnType("date");
            entity.Property(e => e.DocumentName)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.DocumentPath)
                .HasMaxLength(1500)
                .IsUnicode(false);
            entity.Property(e => e.DocumentPathKey)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.DocumentUrl)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.EffectiveDate).HasColumnType("date");
            entity.Property(e => e.ExpiryDate).HasColumnType("date");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.UpdateDatetime).HasColumnType("datetime");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.Documents)
                .HasForeignKey(d => d.VehicleId)
                .HasConstraintName("FK__VehicleDo__Vehic__3587F3E0");
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Drivers__3214EC07745C346D");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.LicenseExpiry).HasColumnType("date");
            entity.Property(e => e.LicenseNumber)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.PhotoUrl)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.UserId).HasMaxLength(450);

            entity.HasOne(d => d.Transporter).WithMany(p => p.Drivers)
                .HasForeignKey(d => d.TransporterId)
                .HasConstraintName("FK_Drivers_TransporterDetails");
        });

        modelBuilder.Entity<Education>(entity =>
        {
            entity.ToTable("Education");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("Employee");

            entity.Property(e => e.AdditionWithHolding).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.AdditionalTaxAmount).HasColumnType("numeric(18, 0)");
            entity.Property(e => e.AlternateNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.BirthDate).HasColumnType("date");
            entity.Property(e => e.BranchOfServiceIfDiffer)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.DutyStation)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Email2)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.EmpNumber).HasColumnType("numeric(18, 0)");
            entity.Property(e => e.EmpType)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Exemptions)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.HomeDepartment)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.JobTitle)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.JoiningDate).HasColumnType("date");
            entity.Property(e => e.LName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.LeavingDate).HasColumnType("date");
            entity.Property(e => e.MName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.MilitaryDependant)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Mobile)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.OtherIncome)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.OtherInfoReason)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.PhoneHome)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Salutation)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.SpouseContactInfo)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.SpouseContactPhoneInfo)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.StateExemption)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.StateWithHolding).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.SuijunctionCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TerminationComment)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.TotalAllowances).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(450)
                .IsUnicode(false);
        });

        modelBuilder.Entity<EmployeeEthinicity>(entity =>
        {
            entity.ToTable("EmployeeEthinicity");

            entity.Property(e => e.CreaatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<EmployeePayrate>(entity =>
        {
            entity.ToTable("EmployeePayrate");

            entity.Property(e => e.Amount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.EffectiveDate).HasColumnType("date");
            entity.Property(e => e.EndDate).HasColumnType("date");
            entity.Property(e => e.MaxCapHours).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<EmployeePayrateHoursCode>(entity =>
        {
            entity.ToTable("EmployeePayrateHoursCode");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<EmployeePolicyClassfication>(entity =>
        {
            entity.ToTable("EmployeePolicyClassfication");

            entity.Property(e => e.Comment)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.EndDate).HasColumnType("date");
            entity.Property(e => e.StartDate).HasColumnType("date");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<EmployeeTimeOff>(entity =>
        {
            entity.ToTable("EmployeeTimeOff");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.HoursEarnedTotal).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.MaxUsageHours).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.NegativeCapHours).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.TimeOffEndDate).HasColumnType("date");
            entity.Property(e => e.TimeOffStartdate).HasColumnType("date");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<EmployeeVeteranStatu>(entity =>
        {
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<FAAccountType>(entity =>
        {
            entity.ToTable("FAAccountType");

            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Description)
                .HasMaxLength(5000)
                .IsUnicode(false);
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetine).HasColumnType("datetime");
        });

        modelBuilder.Entity<FAHoursCode>(entity =>
        {
            entity.ToTable("FAHoursCode");

            entity.Property(e => e.AlwaysAvailableinTSOnBasisOfPayCategory).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_AlwaysAvailableinTSOnBasisOfPayCategory");
            entity.Property(e => e.ApplyTimeOffHrsToAccrual).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_ApplyTimeOffHrsToAccrual");
            entity.Property(e => e.ColorCode).HasMaxLength(30);
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.EnableManualTimeOffAdjustment).HasAnnotation("Relational:DefaultConstraintName", "DF_Table_1_IsManualTimeOffAdjustment");
            entity.Property(e => e.HolidaysNotesMandatory).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_HolidaysNotesMandatory");
            entity.Property(e => e.IsAvailableBillRates).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_IsAvailableBillRates");
            entity.Property(e => e.IsAvailablePayRates).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_IsAvailablePayRates");
            entity.Property(e => e.Label)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.MaxPayoutHrs).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.NotAllowSubmitHrsFutureDates).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_NotAllowSubmitHrsFutureDates");
            entity.Property(e => e.NotConsiderOTPayRateForADPReport).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_NotConsiderOTPayRateForADPReport");
            entity.Property(e => e.NotesMandatoryLevel1Approval).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_NotesMandatoryLevel1Approval");
            entity.Property(e => e.RateCode)
                .IsRequired()
                .HasMaxLength(4)
                .IsUnicode(false);
            entity.Property(e => e.WeekendDaysNotesMandatory).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_WeekendDaysNotesMandatory");
            entity.Property(e => e.WorkingDaysNotesMandatory).HasAnnotation("Relational:DefaultConstraintName", "DF_FAHoursCode_WorkingDaysNotesMandatory");

            entity.HasOne(d => d.Division).WithMany(p => p.FAHoursCodes)
                .HasForeignKey(d => d.DivisionID)
                .HasConstraintName("FK_FAHoursCode_Company");
        });

        modelBuilder.Entity<FAPayCategory>(entity =>
        {
            entity.ToTable("FAPayCategory");

            entity.Property(e => e.ID).ValueGeneratedNever();
            entity.Property(e => e.Code).HasMaxLength(20);
            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategory_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategory_CreatedDateTime");
            entity.Property(e => e.IsActive).HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategory_IsActive");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategory_IsDeleted");
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategory_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategory_UpdatedDateTime");

            entity.HasOne(d => d.Division).WithMany(p => p.FAPayCategories)
                .HasForeignKey(d => d.DivisionID)
                .HasConstraintName("FK_FAPayCategory_Company");
        });

        modelBuilder.Entity<FAPayCategoryDetail>(entity =>
        {
            entity.ToTable("FAPayCategoryDetail");

            entity.Property(e => e.ID).ValueGeneratedNever();
            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategoryDetail_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategoryDetail_CreatedDateTime");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategoryDetail_IsDeleted");
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategoryDetail_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_FAPayCategoryDetail_UpdatedDateTime");

            entity.HasOne(d => d.CTParentType).WithMany(p => p.FAPayCategoryDetailCTParentTypes)
                .HasForeignKey(d => d.CTParentTypeID)
                .HasConstraintName("FK_FAPayCategoryDetail_CommonType");

            entity.HasOne(d => d.CTPayCategoryTypes).WithMany(p => p.FAPayCategoryDetailCTPayCategoryTypes)
                .HasForeignKey(d => d.CTPayCategoryTypesID)
                .HasConstraintName("FK_FAPayCategoryDetail_CommonType1");

            entity.HasOne(d => d.FAHourCode).WithMany(p => p.FAPayCategoryDetails)
                .HasForeignKey(d => d.FAHourCodeID)
                .HasConstraintName("FK_FAPayCategoryDetail_FAHoursCode");

            entity.HasOne(d => d.FAPayCategory).WithMany(p => p.FAPayCategoryDetails)
                .HasForeignKey(d => d.FAPayCategoryID)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FAPayCategoryDetail_FAPayCategoryDetail");
        });

        modelBuilder.Entity<FaAccountTypeCost>(entity =>
        {
            entity.ToTable("FaAccountTypeCost");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.EffectiveDate).HasColumnType("date");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Gender>(entity =>
        {
            entity.ToTable("Gender");

            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_Gender_IsDeleted");
            entity.Property(e => e.Name)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<HRPayCycle>(entity =>
        {
            entity.ToTable("HRPayCycle");

            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayCycle_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayCycle_CreatedDateTime");
            entity.Property(e => e.ExcludedDays)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.HoursPerPayPeriod).HasColumnType("numeric(8, 2)");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayCycle_IsDeleted");
            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(e => e.TotalPayPeriods).HasColumnType("numeric(8, 2)");
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayCycle_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayCycle_UpdatedDateTime");
        });

        modelBuilder.Entity<HRPayPeriod>(entity =>
        {
            entity.HasKey(e => e.ID).HasName("PK_HRPayPeriod_1");

            entity.ToTable("HRPayPeriod");

            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayPeriod_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayPeriod_CreatedDateTime");
            entity.Property(e => e.EndDate).HasColumnType("date");
            entity.Property(e => e.HRTimeOffCalcDate).HasColumnType("datetime");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayPeriod_IsDeleted");
            entity.Property(e => e.IsPayRollStatus).HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayPeriod_IsPayRollStatus");
            entity.Property(e => e.PayDate).HasColumnType("date");
            entity.Property(e => e.PayRollDate).HasColumnType("date");
            entity.Property(e => e.StartDate).HasColumnType("date");
            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayPeriod_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_HRPayPeriod_UpdatedDateTime");
        });

        modelBuilder.Entity<HRPosition>(entity =>
        {
            entity.ToTable("HRPosition");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Title)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<HoursCode>(entity =>
        {
            entity.ToTable("HoursCode");

            entity.Property(e => e.ColorCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Label)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.MaxPayoutHrs).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.RateCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Jobs__3214EC07561314FE");

            entity.Property(e => e.Closed_Date).HasColumnType("date");
            entity.Property(e => e.Created_Datetime)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Is_Deleted).HasDefaultValue(false);
            entity.Property(e => e.Job_Title).HasMaxLength(255);
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.Posted_Date).HasColumnType("date");
            entity.Property(e => e.Required_Training_Url).HasMaxLength(255);
            entity.Property(e => e.Salary).HasMaxLength(255);
            entity.Property(e => e.Schedule_Job).HasMaxLength(255);
            entity.Property(e => e.Updated_Datetime).HasColumnType("datetime");

            entity.HasOne(d => d.Company).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.Company_Id)
                .HasConstraintName("FK_Jobs_Company");

            entity.HasOne(d => d.LocationNavigation).WithMany(p => p.InverseLocationNavigation)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("FK_Jobs_Jobs");
        });

        modelBuilder.Entity<JobSkill>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__JobSkill__689C99DA6844690C");

            entity.ToTable("JobSkill");

            entity.HasOne(d => d.Skill).WithMany(p => p.JobSkills)
                .HasForeignKey(d => d.SkillId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__JobSkill__SkillI__36470DEF");
        });

        modelBuilder.Entity<LiveVehicleTracking>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__LiveVehi__3214EC07CF519ECF");

            entity.ToTable("LiveVehicleTracking");

            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.LastLatitude).HasColumnType("decimal(9, 9)");
            entity.Property(e => e.LastLongitude).HasColumnType("decimal(9, 9)");
            entity.Property(e => e.LastUpdated).HasColumnType("datetime");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.LiveVehicleTrackings)
                .HasForeignKey(d => d.VehicleId)
                .HasConstraintName("FK__LiveVehic__Vehic__46B27FE2");
        });
        modelBuilder.Entity<LiveVehicleTrackingHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__LiveVehiHistory__3214EC0753434023");

            entity.ToTable("LiveVehicleTrackingHistory");

            entity.Property(e => e.DeviceId)
                .HasMaxLength(550)
                .IsUnicode(false);
            entity.Property(e => e.Heading).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.IsDeleted)
                .HasDefaultValue(false)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__LiveVehicHistory__IsDel__5D95E53A");
            entity.Property(e => e.LastLatitude).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.LastLongitude).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.LastUpdated).HasColumnType("datetime");
            entity.Property(e => e.RecordedAt)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_LiveVehicleTrackingHistory_RecordedAt")
                .HasColumnType("datetime");
            entity.Property(e => e.Speed).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.UserId)
                .HasMaxLength(450)
                .IsUnicode(false);
        });

        modelBuilder.Entity<NavLink>(entity =>
        {
            entity.ToTable("NavLink");

            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_NavLink_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavLink_CreatedDateTime");
            entity.Property(e => e.IconClass).HasMaxLength(150);
            entity.Property(e => e.IconUrl).HasMaxLength(150);
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_NavLink_IsDeleted");
            entity.Property(e => e.LinkJson).IsUnicode(false);
            entity.Property(e => e.LinkText).HasMaxLength(150);
            entity.Property(e => e.Source)
                .HasMaxLength(3)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(150);
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavLink_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavLink_UpdatedDateTime");
            entity.Property(e => e.Url).HasMaxLength(150);
        });

        modelBuilder.Entity<NavLinkAudit>(entity =>
        {
            entity.ToTable("NavLinkAudit");

            entity.Property(e => e.AuditedDateTime).HasColumnType("datetime");
            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkAu__Creat__34749F6D");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkAu__Creat__3568C3A6");
            entity.Property(e => e.IconClass).HasMaxLength(150);
            entity.Property(e => e.IconUrl).HasMaxLength(150);
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkAu__IsDel__38453051");
            entity.Property(e => e.LinkJson).IsUnicode(false);
            entity.Property(e => e.LinkText).HasMaxLength(150);
            entity.Property(e => e.Source)
                .HasMaxLength(3)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(150);
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkAu__Updat__365CE7DF");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkAu__Updat__37510C18");
            entity.Property(e => e.Url).HasMaxLength(150);
        });

        modelBuilder.Entity<NavLinkRole>(entity =>
        {
            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_NavLinkRoles_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavLinkRoles_CreatedDateTime");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_NavLinkRoles_IsDeleted");
            entity.Property(e => e.RoleId).HasMaxLength(150);
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavLinkRoles_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavLinkRoles_UpdatedDateTime");
        });

        modelBuilder.Entity<NavLinkRolesAudit>(entity =>
        {
            entity.HasKey(e => e.NavLinkRoleAuditId).HasName("PK_NavLinkRolesAudit_1");

            entity.ToTable("NavLinkRolesAudit");

            entity.Property(e => e.AuditedDateTime).HasColumnType("datetime");
            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkRo__Creat__3B219CFC");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkRo__Creat__3C15C135");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkRo__IsDel__3EF22DE0");
            entity.Property(e => e.RoleId).HasMaxLength(150);
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkRo__Updat__3D09E56E");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__NavLinkRo__Updat__3DFE09A7");
        });

        modelBuilder.Entity<NavPosition>(entity =>
        {
            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_NavPositions_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavPositions_CreatedDateTime");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_NavPositions_IsDeleted");
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavPositions_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavPositions_UpdatedDateTime");
        });

        modelBuilder.Entity<NavPositionsAudit>(entity =>
        {
            entity.HasKey(e => e.NavPositionId);

            entity.ToTable("NavPositionsAudit");

            entity.Property(e => e.NavPositionId).ValueGeneratedNever();
            entity.Property(e => e.AuditedDateTime).HasColumnType("datetime");
            entity.Property(e => e.CreatedDateTime).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.NavPositionAuditId).ValueGeneratedOnAdd();
            entity.Property(e => e.UpdatedBy).HasDefaultValue(0);
            entity.Property(e => e.UpdatedDateTime).HasDefaultValueSql("(getdate())");
        });

        modelBuilder.Entity<NavTree>(entity =>
        {
            entity.ToTable("NavTree");

            entity.Property(e => e.CreatedBy).HasAnnotation("Relational:DefaultConstraintName", "DF_NavTree_CreatedBy");
            entity.Property(e => e.CreatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavTree_CreatedDateTime");
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_NavTree_IsDeleted");
            entity.Property(e => e.UpdatedBy)
                .HasDefaultValue(0)
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavTree_UpdatedBy");
            entity.Property(e => e.UpdatedDateTime)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_NavTree_UpdatedDateTime");
        });

        modelBuilder.Entity<NavTreeAudit>(entity =>
        {
            entity.HasKey(e => e.NavTreeId);

            entity.ToTable("NavTreeAudit");

            entity.Property(e => e.NavTreeId).ValueGeneratedNever();
            entity.Property(e => e.AuditedDateTime).HasColumnType("datetime");
            entity.Property(e => e.CreatedDateTime).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.NavTreeAuditId).ValueGeneratedOnAdd();
            entity.Property(e => e.UpdatedBy).HasDefaultValue(0);
            entity.Property(e => e.UpdatedDateTime).HasDefaultValueSql("(getdate())");
        });

        modelBuilder.Entity<NgxTableColumn>(entity =>
        {
            entity.ToTable("NgxTableColumn");

            entity.Property(e => e.ID).ValueGeneratedNever();
            entity.Property(e => e.Columns).IsRequired();
            entity.Property(e => e.IsDeleted).HasAnnotation("Relational:DefaultConstraintName", "DF_NgxTableColumn_IsDeleted");
            entity.Property(e => e.ScreenName)
                .IsRequired()
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.UserEmail)
                .IsRequired()
                .HasMaxLength(100);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Notifica__3214EC07EF9D2761");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Notification__Id__0B5CAFEA");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Notificat__Creat__0D44F85C")
                .HasColumnType("datetime");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Notificat__IsRea__0C50D423");
            entity.Property(e => e.Message)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Title)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.UserId)
                .HasMaxLength(450)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Notificat__UserI__382F5661");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Payments__3214EC07743DF8CE");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Amount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.PaidAt).HasColumnType("datetime");
            entity.Property(e => e.PaymentMode).HasMaxLength(20);
            entity.Property(e => e.PaymentStatus).HasMaxLength(20);
            entity.Property(e => e.TransactionReference).HasMaxLength(100);
        });

        modelBuilder.Entity<PromoCode>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PromoCod__3214EC07E02097BA");

            entity.HasIndex(e => e.Code, "UQ__PromoCod__A25C5AA70221B948").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Code)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.MaxDiscountAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MinBookingAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ValidFrom).HasColumnType("datetime");
            entity.Property(e => e.ValidTill).HasColumnType("datetime");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId)
                .HasName("PK__Roles__8AFACE1BD6AF1BCA")
                .IsClustered(false);

            entity.Property(e => e.RoleId).HasDefaultValueSql("(newid())");
            entity.Property(e => e.AspNetUserId)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Description).HasMaxLength(256);
            entity.Property(e => e.LoweredRoleName)
                .IsRequired()
                .HasMaxLength(256);
            entity.Property(e => e.RoleName)
                .IsRequired()
                .HasMaxLength(256);
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Skill__3214EC07A4811809");

            entity.ToTable("Skill");

            entity.HasIndex(e => e.Name, "UQ__Skill__737584F64E97CF4C").IsUnique();

            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<State>(entity =>
        {
            entity.ToTable("State");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.StateCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.ToTable("Subject");

            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF_Subject_CreatedDate")
                .HasColumnType("datetime");
            entity.Property(e => e.Name)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDate).HasColumnType("datetime");
        });

        modelBuilder.Entity<SystemConfiguration>(entity =>
        {
            entity.ToTable("SystemConfiguration");

            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.Field)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FieldText)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.UpdateDatetime).HasColumnType("datetime");
            entity.Property(e => e.Value).IsUnicode(false);
        });

        modelBuilder.Entity<TransporterDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Transpor__3214EC07F49918E2");

            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.BankAccountNumber)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.City)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CompanyName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.GSTNumber)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.IFSCCode)
                .HasMaxLength(15)
                .IsUnicode(false);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.PANNumber)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Pincode)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.ProfileVerified).HasDefaultValue(false);
            entity.Property(e => e.State)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.UserId)
                .HasMaxLength(450)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany(p => p.TransporterDetails)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Transport__UserI__3B0BC30C");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_AspNetUsers");

            entity.Property(e => e.Id)
                .HasMaxLength(450)
                .IsUnicode(false)
                .HasDefaultValueSql("(newid())");
            entity.Property(e => e.AppUserId).ValueGeneratedOnAdd();
            entity.Property(e => e.Configuration)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDateTime).HasColumnType("datetime");
            entity.Property(e => e.DOB).HasColumnType("datetime");
            entity.Property(e => e.Discriminator)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.FirstName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FullName)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.JobTitle)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.LastName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.LockoutEndDateUtc).HasColumnType("datetime");
            entity.Property(e => e.LoginName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.NormalizedEmail).HasMaxLength(256);
            entity.Property(e => e.NormalizedUserName).HasMaxLength(256);
            entity.Property(e => e.OtpSecret)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Pin)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UserName).HasMaxLength(256);
            entity.Property(e => e.UserType)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<UserCourse>(entity =>
        {
            entity.ToTable("UserCourse");

            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedDate).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasMaxLength(450);

            entity.HasOne(d => d.Course).WithMany(p => p.UserCourses)
                .HasForeignKey(d => d.CourseId)
                .HasConstraintName("FK_UserCourse_Course");

            entity.HasOne(d => d.Subject).WithMany(p => p.UserCourses)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("FK_UserCourse_Subject");
        });

        modelBuilder.Entity<UserInformation>(entity =>
        {
            entity.ToTable("UserInformation");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Company)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.DOB).HasColumnType("datetime");
            entity.Property(e => e.Description)
                .HasMaxLength(5000)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.FacebookLink)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.FirstName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.InstagramLink)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.LastName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.MiddleName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.ProfilePic).IsUnicode(false);
            entity.Property(e => e.TwiterLink)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedDate).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasMaxLength(450);
            entity.Property(e => e.WebsiteLink)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.WhatsAppLink)
                .HasMaxLength(150)
                .IsUnicode(false);
        });

        modelBuilder.Entity<UserLogin>(entity =>
        {
            entity.HasKey(e => new { e.LoginProvider, e.ProviderKey }).HasName("PK_AspNetUserLogins");

            entity.Property(e => e.UserId)
                .IsRequired()
                .HasMaxLength(450)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany(p => p.UserLogins)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AspNetUserLogins_AspNetUsers_UserId");
        });

        modelBuilder.Entity<UserRating>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserRati__3214EC07F770FF30");

            entity.ToTable("UserRating");

            entity.Property(e => e.Comment)
                .HasMaxLength(1000)
                .IsUnicode(false);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Score).HasColumnType("decimal(18, 2)");
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasNoKey();

            entity.Property(e => e.ApplicationRoleId)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.RoleId)
                .IsRequired()
                .HasMaxLength(450);
            entity.Property(e => e.UserId)
                .IsRequired()
                .HasMaxLength(450)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AspNetUserRoles_AspNetUsers_UserId");
        });

        modelBuilder.Entity<UsersInRole>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UsersInR__AF2760AD951780CB");

            entity.HasOne(d => d.Role).WithMany(p => p.UsersInRoles)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__UsersInRo__RoleI__40C49C62");
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Vehicles__3214EC075FA80DE5");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Vehicles__Id__2EDAF651");
            entity.Property(e => e.CapacityTons).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.CurrentLatitude).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.CurrentLongitude).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.InsuranceExpiry).HasColumnType("date");
            entity.Property(e => e.IsAvailable)
                .HasDefaultValue(true)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Vehicles__IsAvai__30C33EC3");
            entity.Property(e => e.IsDeleted)
                .HasDefaultValue(false)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Vehicles__IsDele__31B762FC");
            entity.Property(e => e.PermitExpiry).HasColumnType("date");
            entity.Property(e => e.RCNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.RoadTaxExpiry).HasColumnType("date");
            entity.Property(e => e.SizeCubicMeters).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.UpdatedDatetime).HasColumnType("datetime");
            entity.Property(e => e.UploadPhoneUrl).IsUnicode(false);
            entity.Property(e => e.VehicleName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.VehicleNumber)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.Transporter).WithMany(p => p.Vehicles)
                .HasForeignKey(d => d.TransporterId)
                .HasConstraintName("FK__Vehicles__Transp__2FCF1A8A");
        });

        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Wallets__3214EC078B072CF8");

            entity.Property(e => e.Balance)
                .HasDefaultValue(0m)
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Wallets__Balance__1F63A897")
                .HasColumnType("decimal(10, 2)");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasAnnotation("Relational:DefaultConstraintName", "DF__Wallets__Updated__2057CCD0")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(450)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany(p => p.Wallets)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Wallets__UserId__43A1090D");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
