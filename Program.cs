using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using satguruApp.DLL.Models;
using System;


namespace navgatix
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = CreateWebHostBuilder(args).Build();
            using (var host = builder.Services.CreateScope())
            {
                var services = host.ServiceProvider;
                try
                {
                    var context = services.GetRequiredService<SatguruDBContext>();
                }   
                catch (Exception ex)
                {

                }
            }
            builder.Run();
            //// Add services to the container.
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) => WebHost.CreateDefaultBuilder(args).UseStartup<Startup>();
    }
}
