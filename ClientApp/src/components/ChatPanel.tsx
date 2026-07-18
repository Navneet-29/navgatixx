import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { buildChatConnection } from '../services/chatService';
import type { HubConnection } from '@microsoft/signalr';

interface Message {
    sender: string;
    text: string;
    time: string;
    isOwn: boolean;
}

interface ChatPanelProps {
    bookingId?: number;
    roomName?: string;
    currentUserName: string;
    onClose: () => void;
}

const ChatPanel = ({ bookingId, roomName, currentUserName, onClose }: ChatPanelProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const connectionRef = useRef<HubConnection | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);


    // Build and start the SignalR connection
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const conn = buildChatConnection();
        connectionRef.current = conn;

        conn.on('ReceiveMessage', (sender: string, text: string, time: string) => {
            const isOwn = sender === currentUserName;
            setMessages(prev => [
                ...prev,
                { sender, text, time, isOwn },
            ]);

            if (!isOwn) {
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                    audio.volume = 0.6;
                    audio.play().catch(() => {});
                } catch (e) {
                    console.error('Failed to play sound:', e);
                }

                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new window.Notification(`New Message from ${sender}`, {
                        body: text,
                    });
                }
            }
        });

        conn.start()
            .then(async () => {
                if (roomName) {
                    await conn.invoke('JoinGroupChat', roomName);
                } else if (bookingId) {
                    await conn.invoke('JoinBookingChat', bookingId);
                }
                setStatus('connected');
            })
            .catch(err => {
                console.error('[ChatPanel] connection failed:', err);
                setStatus('disconnected');
            });

        conn.onclose(() => setStatus('disconnected'));
        conn.onreconnecting(() => setStatus('connecting'));
        conn.onreconnected(() => setStatus('connected'));

        return () => {
            if (roomName) {
                conn.invoke('LeaveGroupChat', roomName).finally(() => conn.stop());
            } else if (bookingId) {
                conn.invoke('LeaveBookingChat', bookingId).finally(() => conn.stop());
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingId, roomName]);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const text = inputText.trim();
        if (!text || status !== 'connected') return;
        try {
            const userStr = localStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;
            const senderUserId = currentUser?.userId || currentUser?.id || currentUser?.UserId || '';

            if (roomName) {
                await connectionRef.current?.invoke('SendGroupMessage', roomName, currentUserName, text, senderUserId);
            } else if (bookingId) {
                await connectionRef.current?.invoke('SendMessage', bookingId, currentUserName, text, senderUserId);
            }
            setInputText('');
        } catch (err) {
            console.error('[ChatPanel] send failed:', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') sendMessage();
    };

    const statusColor =
        status === 'connected' ? 'bg-emerald-500' :
        status === 'connecting' ? 'bg-amber-400 animate-pulse' :
        'bg-red-500';

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    return (
        /* Slide-in overlay panel */
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 flex flex-col w-full sm:w-[400px] h-[520px] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5 text-primary-400" />
                        <div>
                            <p className="font-bold text-sm">Live Chat</p>
                            <p className="text-xs text-slate-400">Ride #{bookingId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Connection status dot */}
                        <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`} />
                            <span className="text-xs text-slate-400 capitalize">{status}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
                            <MessageCircle className="h-10 w-10 text-slate-300" />
                            <p>No messages yet. Say hi! 👋</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                            <p className="text-[10px] text-slate-400 mb-1 px-1">
                                {msg.isOwn ? 'You' : msg.sender} · {formatTime(msg.time)}
                            </p>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                    msg.isOwn
                                        ? 'bg-slate-900 text-white rounded-br-sm'
                                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                                }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 bg-white">
                    <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={status !== 'connected'}
                        placeholder={status === 'connected' ? 'Type a message…' : 'Connecting…'}
                        className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400 transition"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={status !== 'connected' || !inputText.trim()}
                        className="flex-shrink-0 rounded-xl bg-slate-900 text-white p-2.5 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                        aria-label="Send message"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
