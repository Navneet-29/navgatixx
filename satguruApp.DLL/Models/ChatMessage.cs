using System;

namespace satguruApp.DLL.Models;

public partial class ChatMessage
{
    public Guid Id { get; set; }

    public string RoomName { get; set; } = null!;

    public string SenderUserId { get; set; } = null!;

    public string? SenderName { get; set; }

    public string? ReceiverUserId { get; set; }

    public string Message { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool IsRead { get; set; }
}
