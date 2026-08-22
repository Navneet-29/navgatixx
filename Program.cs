using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using System;
using System.Linq;


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
                    using (var conn = context.Database.GetDbConnection())
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
                                IF NOT EXISTS (
                                    SELECT * FROM sys.columns 
                                    WHERE object_id = OBJECT_ID('Drivers') AND name = 'TransactionPIN'
                                )
                                BEGIN
                                    ALTER TABLE Drivers ADD TransactionPIN VARCHAR(100) NULL;
                                END";
                            cmd.ExecuteNonQuery();
                        }
                    }
                }
                catch (Exception)
                {

                }
            }
            builder.Run();
            //// Add services to the container.
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) => WebHost.CreateDefaultBuilder(args).UseStartup<Startup>();
    }
}
