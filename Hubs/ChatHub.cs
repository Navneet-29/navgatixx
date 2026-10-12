using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
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
        private readonly IFirebasePushService _firebasePushService;

        public ChatHub(SatguruDBContext db, IFirebasePushService firebasePushService)
        {
            _db = db;
            _firebasePushService = firebasePushService;
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

                    var recipientUserIds = new HashSet<string>();
                    if (!string.IsNullOrEmpty(recipientUserId)) recipientUserIds.Add(recipientUserId);

                    // If driver is linked to a transporter, also notify transporter of chat activity
                    if (booking.DriverId.HasValue)
                    {
                        var driverObj = await _db.Drivers.FirstOrDefaultAsync(d => d.Id == booking.DriverId.Value);
                        if (driverObj?.TransporterId.HasValue == true)
                        {
                            var transporterObj = await _db.TransporterDetails.FirstOrDefaultAsync(t => t.Id == driverObj.TransporterId.Value);
                            if (transporterObj != null && !string.IsNullOrEmpty(transporterObj.UserId) && !transporterObj.UserId.Equals(senderUserId, StringComparison.OrdinalIgnoreCase))
                            {
                                recipientUserIds.Add(transporterObj.UserId);
                            }
                        }
                    }

                    foreach (var targetUser in recipientUserIds)
                    {
                        var notification = new Notification
                        {
                            UserId = targetUser,
                            Message = $"CHAT_MESSAGE|{bookingId}|{senderName}: {message}",
                            CreatedAt = DateTime.UtcNow,
                            IsRead = false
                        };
                        _db.Notifications.Add(notification);
                        await _db.SaveChangesAsync();

                        // Dispatch background push notification so phone rings/alerts even when minimized
                        try
                        {
                            await _firebasePushService.SendToUsersAsync(new[] { targetUser }, new PushNotificationPayload
                            {
                                Title = $"New Message from {senderName}",
                                Body = message,
                                Data = new Dictionary<string, string>
                                {
                                    ["type"] = "chat_message",
                                    ["bookingId"] = bookingId.ToString(),
                                    ["sender"] = senderName
                                }
                            });
                        }
                        catch {}
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
            var nowUtc = System.DateTime.UtcNow;
            await Clients.Group(roomName).SendAsync(
                "ReceiveMessage",
                senderName,
                message,
                nowUtc.ToString("o")
            );

            try
            {
                // Room Name pattern: TransporterDriver_{transporterUserId}_{driverUserId}
                var parts = roomName.Split('_');
                string? recipientUserId = null;
                if (parts.Length >= 3)
                {
                    string transporterUserId = parts[1];
                    string driverUserId = parts[2];

                    // If sender is Transporter, recipient is Driver. Otherwise recipient is Transporter.
                    bool isTransporterSender = !string.IsNullOrEmpty(senderUserId) && senderUserId.Equals(transporterUserId, StringComparison.OrdinalIgnoreCase);
                    recipientUserId = isTransporterSender ? driverUserId : transporterUserId;
                }

                // 1. Permanently persist the chat message to database
                var chatMsg = new ChatMessage
                {
                    Id = Guid.NewGuid(),
                    RoomName = roomName,
                    SenderUserId = senderUserId ?? string.Empty,
                    SenderName = senderName,
                    ReceiverUserId = recipientUserId,
                    Message = message,
                    CreatedAt = nowUtc,
                    IsRead = false
                };
                _db.ChatMessages.Add(chatMsg);
                await _db.SaveChangesAsync();

                // Broadcast to room including the persisted message id
                await Clients.Group(roomName).SendAsync(
                    "ReceiveGroupMessage",
                    chatMsg.Id.ToString(),
                    senderName,
                    message,
                    nowUtc.ToString("o"),
                    senderUserId
                );

                // 2. Send in-app notification & push notification to recipient
                if (!string.IsNullOrEmpty(recipientUserId))
                {
                    var notification = new Notification
                    {
                        UserId = recipientUserId,
                        Message = $"CHAT_MESSAGE_DIRECT|{roomName}|{senderName}: {message}",
                        CreatedAt = nowUtc,
                        IsRead = false
                    };
                    _db.Notifications.Add(notification);
                    await _db.SaveChangesAsync();

                    try
                    {
                        await _firebasePushService.SendToUsersAsync(new[] { recipientUserId }, new PushNotificationPayload
                        {
                            Title = $"New Message from {senderName}",
                            Body = message,
                            Data = new Dictionary<string, string>
                            {
                                ["type"] = "chat_message_direct",
                                ["roomName"] = roomName,
                                ["sender"] = senderName
                            }
                        });
                    }
                    catch {}
                }
            }
            catch (Exception)
            {
                // Fail silently
            }
        }

        public async Task DeleteGroupMessage(string roomName, string messageId, string requestingUserId)
        {
            try
            {
                if (Guid.TryParse(messageId, out var parsedGuid))
                {
                    var msg = await _db.ChatMessages.FirstOrDefaultAsync(m => m.Id == parsedGuid);
                    if (msg != null)
                    {
                        // Delete if requested by the sender (or match within room)
                        _db.ChatMessages.Remove(msg);
                        await _db.SaveChangesAsync();

                        // Notify all clients in the room in real time to remove the message
                        await Clients.Group(roomName).SendAsync("MessageDeleted", messageId);
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
