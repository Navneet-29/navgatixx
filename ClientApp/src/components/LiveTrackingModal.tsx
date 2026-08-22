import React, { useState, useEffect } from 'react';
import { Send, MapPin, Navigation, Truck, User } from 'lucide-react';

interface LiveTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: 'driver' | 'customer' | 'transporter';
    shipmentId: string;
}

const MOCK_CHAT = [
    { sender: 'customer', text: 'Hi, are you on the way to the pickup?', time: '10:42 AM' },
    { sender: 'driver', text: 'Yes, just 5 mins away. Traffic is clear.', time: '10:45 AM' },
    { sender: 'customer', text: 'Great, the warehouse gate is number 4.', time: '10:46 AM' }
];

const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({ isOpen, onClose, userRole, shipmentId }) => {
    const [messages, setMessages] = useState(MOCK_CHAT);
    const [newMessage, setNewMessage] = useState('');
    const [progress, setProgress] = useState(35); // 35% on the way

    useEffect(() => {
        if (!isOpen) return;
        // Simulate truck moving on the map
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setMessages([...messages, {
            sender: userRole === 'driver' ? 'driver' : 'customer',
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setNewMessage('');
    };

    if (!isOpen) return null;

    return (
        <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px] animate-in zoom-in-95 duration-200">

                {/* Map Section */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-200">
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/streets/256/0/0/0.png')] bg-repeat opacity-20 grayscale"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(248,250,252,0.8)_100%)]"></div>

                    <div className="relative z-10 p-6 flex justify-between items-start">
                        <div className="bg-white/90 backdrop-blur shadow-sm p-4 rounded-2xl">
                            <h3 className="font-black text-slate-900 flex items-center gap-2">
                                <Navigation className="h-5 w-5 text-primary-600 animate-pulse" />
                                Live Tracking
                            </h3>
                            <p className="text-sm font-semibold text-slate-500 mt-1">Shipment {shipmentId}</p>
                        </div>
                        <button onClick={onClose} className="bg-white hover:bg-slate-100 text-slate-900 h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors">
                            ✕
                        </button>
                    </div>

                    {/* Simulated Route Line */}
                    <div className="absolute top-1/2 left-1/4 right-1/4 h-2 bg-slate-200 rounded-full overflow-hidden transform -translate-y-1/2 shadow-inner">
                        <div
                            className="h-full bg-primary-500 transition-all duration-1000 ease-linear rounded-full relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border-2 border-primary-500 rounded-full shadow-lg flex items-center justify-center">
                                <Truck className="h-4 w-4 text-primary-600" />
                            </div>
                        </div>
                    </div>

                    {/* Markers */}
                    <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 -translate-x-1/2 -mt-8 text-center">
                        <MapPin className="h-8 w-8 text-blue-600 mx-auto drop-shadow-md" />
                        <span className="text-xs font-bold text-slate-700 mt-1 block bg-white px-2 py-0.5 rounded-full shadow-sm">Pickup</span>
                    </div>
                    <div className="absolute top-1/2 right-1/4 transform -translate-y-1/2 translate-x-1/2 -mt-8 text-center">
                        <MapPin className="h-8 w-8 text-emerald-600 mx-auto drop-shadow-md" />
                        <span className="text-xs font-bold text-slate-700 mt-1 block bg-white px-2 py-0.5 rounded-full shadow-sm">Dropoff</span>
                    </div>
                </div>

                {/* Chat Section */}
                <div className="w-full md:w-[400px] bg-white flex flex-col h-1/2 md:h-full">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            {userRole === 'driver' ? <User className="h-5 w-5 text-primary-700" /> : <Truck className="h-5 w-5 text-primary-700" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">{userRole === 'driver' ? 'Customer Head' : 'Driver (Rajesh K.)'}</h4>
                            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse block"></span>
                                Online
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, i) => {
                            const isMe = (userRole === 'driver' && msg.sender === 'driver') ||
                                (userRole !== 'driver' && msg.sender === 'customer');
                            return (
                                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                            ? 'bg-primary-600 text-white rounded-tr-sm'
                                            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                                        }`}>
                                        <p>{msg.text}</p>
                                        <span className={`text-[10px] block mt-1 font-medium ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>
                                            {msg.time}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50">
                        <div className="relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-shadow"
                            />
                            <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-colors">
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LiveTrackingModal;
