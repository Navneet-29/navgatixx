using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using System;
using System.Linq;

namespace navgatix.Hubs
{
    /// <summary>
    /// Real-time chat hub scoped to a booking/ride ID.
    /// Each booking gets its own SignalR group so messages are isolated.
    /// </summary>
    public class ChatHub : Hub
    {
        private readonly SatguruDBContext _db;

        public ChatHub(SatguruDBContext db)
        {
            _db = db;
        }

        /// <summary>Joins the caller to the chat room for a given booking.</summary>
        public async Task JoinBookingChat(long bookingId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Chat_{bookingId}");
        }

        /// <summary>Removes the caller from the chat room for a given booking.</summary>
        public async Task LeaveBookingChat(long bookingId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Chat_{bookingId}");
        }

        /// <summary>
        /// Broadcasts a chat message to everyone in the booking's room
        /// (both the driver and the customer).
        /// </summary>
        public async Task SendMessage(long bookingId, string senderName, string message, string senderUserId)
        {
            await Clients.Group($"Chat_{bookingId}").SendAsync(
                "ReceiveMessage",
                senderName,
                message,
                System.DateTime.UtcNow.ToString("o")
            );

            try
            {
                var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
                if (booking != null)
                {
                    // Find recipient. If driver sent it, notify customer. If customer sent it, notify driver.
                    string? recipientUserId = null;
                    if (booking.DriverId.HasValue)
                    {
                        var driver = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == booking.DriverId.Value);
                        if (driver != null)
                        {
                            if (!string.IsNullOrEmpty(senderUserId) && !string.IsNullOrEmpty(driver.UserId) && senderUserId.Equals(driver.UserId, StringComparison.OrdinalIgnoreCase))
                            {
                                recipientUserId = booking.CustomerId;
                            }
                            else
                            {
                                recipientUserId = driver.UserId;
                            }
                        }
                    }
                    else
                    {
                        recipientUserId = booking.CustomerId;
                    }

                    if (!string.IsNullOrEmpty(recipientUserId))
                    {
                        var notification = new Notification
                        {
                            UserId = recipientUserId,
                            Message = $"CHAT_MESSAGE|{bookingId}|{senderName}: {message}",
                            CreatedAt = DateTime.UtcNow,
                            IsRead = false
                        };
                        _db.Notifications.Add(notification);
                        await _db.SaveChangesAsync();
                    }
                }
            }
            catch (Exception)
            {
                // Fail silently to prevent chat breakdown if DB fails
            }
        }

        public async Task JoinGroupChat(string roomName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
        }

        public async Task LeaveGroupChat(string roomName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        }

        public async Task SendGroupMessage(string roomName, string senderName, string message, string senderUserId)
        {
            await Clients.Group(roomName).SendAsync(
                "ReceiveMessage",
                senderName,
                message,
                System.DateTime.UtcNow.ToString("o")
            );

            try
            {
                // Room Name pattern: TransporterDriver_{transporterUserId}_{driverUserId}
                var parts = roomName.Split('_');
                if (parts.Length >= 3)
                {
                    string transporterUserId = parts[1];
                    string driverUserId = parts[2];

                    // If sender is Transporter, recipient is Driver. Otherwise recipient is Transporter.
                    bool isTransporterSender = !string.IsNullOrEmpty(senderUserId) && senderUserId.Equals(transporterUserId, StringComparison.OrdinalIgnoreCase);
                    string recipientUserId = isTransporterSender ? driverUserId : transporterUserId;

                    if (!string.IsNullOrEmpty(recipientUserId))
                    {
                        var notification = new Notification
                        {
                            UserId = recipientUserId,
                            Message = $"CHAT_MESSAGE_DIRECT|{roomName}|{senderName}: {message}",
                            CreatedAt = DateTime.UtcNow,
                            IsRead = false
                        };
                        _db.Notifications.Add(notification);
                        await _db.SaveChangesAsync();
                    }
                }
            }
            catch (Exception)
            {
                // Fail silently
            }
        }
    }
}
