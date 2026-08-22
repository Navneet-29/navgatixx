using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.OpenApi.Models;
using navgatix.Hubs;
using navgatix.Services;
using navgatix.SeedData;
using satguruApp.DLL.Models;
using satguruApp.Service;
using satguruApp.Service.Services;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using Swashbuckle.AspNetCore;
using Swashbuckle.AspNetCore.SwaggerGen;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Security.Claims;


namespace navgatix
{
    public class Startup
    {
        private IConfiguration Configuration;
        private IWebHostEnvironment _env;
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
        }
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddDbContext<SatguruDBContext>(options =>
                   options.UseSqlServer(
                       Configuration.GetConnectionString("DefaultConnection"),
                       b =>
                       {
                           b.MigrationsAssembly(typeof(SatguruDBContext).Assembly.FullName); //ApplicationDbContext
                       }));

            services.AddIdentity<ApplicationUser, ApplicationRole>().AddEntityFrameworkStores<SatguruDBContext>().AddDefaultTokenProviders();
            services.Configure<JWT>(Configuration.GetSection("JWT"));
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IUserInfoService, UserInfoService>();
            services.AddScoped<IVehicleService, VehicleService>();
            services.AddScoped<IAccountTypeService, AccountTypeService>();
            services.AddScoped<IAppCustormer, AppCustomer>();
            services.AddScoped<IBookingService, BookingService>();
            //services.AddScoped<IRepository, Repository>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<ICommonTypeService, CommonTypeService>();
            services.AddScoped<ITransportService, TransportService>();
            services.AddScoped<IDocumentService, DocumentService>();
            services.AddScoped<ICountryService, CountryService>();
            services.AddScoped<IStateService, StateService>();
            services.AddScoped<ICityService, CityService>();
            services.AddScoped<ISystemConfigurationService, SystemConfigurationService>();
            services.AddScoped<IDriverFinanceService, DriverFinanceService>();
            services.AddScoped<IDisputeService, DisputeService>();
            services.AddScoped<IFirebasePushService, FirebasePushService>();
            services.AddScoped<ILocationService, LocationService>();
            services.AddScoped<ITrackingNotificationService, TrackingNotificationService>();
            services.AddSignalR();


            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })

            .AddJwtBearer(o =>
            {
                o.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async ctx =>
                    {
                        Configuration.Bind("AzureAd", o);
                        o.TokenValidationParameters.NameClaimType = "name";
                        string userId = ctx.Principal.FindFirstValue("name");

                        //Get EF context
                        var _db = ctx.HttpContext.RequestServices.GetRequiredService<SatguruDBContext>();

                        //Check if this app can read confidential items
                        var user = await _db.Users.FirstOrDefaultAsync(a => a.UserName == userId || a.Email == userId);
                        var claims = new List<Claim>();
                        claims.Add(new Claim("UserName", user?.UserName.ToString() ?? ""));
                        var appIdentity = new ClaimsIdentity(claims);
                        ctx.Principal.AddIdentity(appIdentity);
                    }
                };

                o.RequireHttpsMetadata = false;
                o.SaveToken = true;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                };

            });
            
            // Allow local frontend dev servers and mobile apps to access the API
            services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                {
                    policy.WithOrigins(
                        "http://localhost:5006", 
                        "http://localhost:5173", 
                        "http://localhost:3000",
                        "capacitor://localhost",
                        "http://localhost",
                        "https://localhost:7048"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
                });
            });

            // Configure unlimited file upload limits and form options
            services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
            {
                options.ValueLengthLimit = int.MaxValue;
                options.MultipartBodyLengthLimit = long.MaxValue; // Unlimited upload size
                options.MultipartHeadersLengthLimit = int.MaxValue;
                options.MemoryBufferThreshold = int.MaxValue;
            });

            services.Configure<Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions>(options =>
            {
                options.Limits.MaxRequestBodySize = null; // Unlimited request body size
            });

            services.AddControllers();
            services.AddControllersWithViews();
            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "ClientApp/clientApp/dist/client-app/browser";
            });
            services.AddEndpointsApiExplorer();
            // ✅ Add Swagger
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
            });

        }
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }

            app.UseDefaultFiles();
            app.UseStaticFiles();
            
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
                c.RoutePrefix = "swagger";
            });

            app.UseHttpsRedirection();
            app.UseRouting();

            app.UseCors("AllowReactApp");

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
                endpoints.MapControllers();
                endpoints.MapHub<LocationHub>("/hubs/location");
                endpoints.MapHub<ChatHub>("/hubs/chat");
                
                // Fallback to index.html for SPA
                endpoints.MapFallbackToFile("index.html");
            });

            CommonTypeSeeder.Seed(app.ApplicationServices);

        }
    }
}
