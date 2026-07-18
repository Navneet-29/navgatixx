import React, { useState, useEffect } from 'react';
import { Bell, Volume2, Vibrate, MessageSquare, Truck, Package } from 'lucide-react';

interface NotificationSettingsProps {
    role: 'transporter' | 'driver' | 'customer';
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ role }) => {
    const [settings, setSettings] = useState({
        orderAlerts: true,
        driverAlerts: true,
        newOrderSound: true,
        vibration: true,
        emailNotifications: false,
        smsAlerts: true
    });

    useEffect(() => {
        const saved = localStorage.getItem(`notif_settings_${role}`);
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }, [role]);

    const handleToggle = (key: keyof typeof settings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        localStorage.setItem(`notif_settings_${role}`, JSON.stringify(newSettings));
    };

    const Toggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full transition-all relative ${active ? 'bg-indigo-600' : 'bg-slate-200'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
        </button>
    );

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <Bell className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Notification Settings</h2>
                    <p className="text-sm text-slate-500">Configure how you want to be alerted.</p>
                </div>
            </div>

            <div className="space-y-4">
                {role === 'transporter' && (
                    <>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">Order Alerts</p>
                                    <p className="text-xs text-slate-500">Get notified when new orders are available.</p>
                                </div>
                            </div>
                            <Toggle active={settings.orderAlerts} onToggle={() => handleToggle('orderAlerts')} />
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">Driver Alerts</p>
                                    <p className="text-xs text-slate-500">Notifications about driver activity and status.</p>
                                </div>
                            </div>
                            <Toggle active={settings.driverAlerts} onToggle={() => handleToggle('driverAlerts')} />
                        </div>
                    </>
                )}

                {role === 'driver' && (
                    <>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                    <Volume2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">New Order Sound</p>
                                    <p className="text-xs text-slate-500">Play a sound when a new trip is assigned.</p>
                                </div>
                            </div>
                            <Toggle active={settings.newOrderSound} onToggle={() => handleToggle('newOrderSound')} />
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                                    <Vibrate className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">Vibration</p>
                                    <p className="text-xs text-slate-500">Vibrate on important alerts.</p>
                                </div>
                            </div>
                            <Toggle active={settings.vibration} onToggle={() => handleToggle('vibration')} />
                        </div>
                    </>
                )}

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">SMS Alerts</p>
                            <p className="text-xs text-slate-500">Critical updates via text message.</p>
                        </div>
                    </div>
                    <Toggle active={settings.smsAlerts} onToggle={() => handleToggle('smsAlerts')} />
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
