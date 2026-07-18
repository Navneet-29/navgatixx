import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/apiClient';

interface SecuritySettingsProps {
    user: any;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ user }) => {
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (passwords.new.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await apiClient.post('/User/changePassword', {
                userId: user?.userId || user?.UserId,
                email: user?.email || user?.Email,
                userName: user?.userName || user?.UserName,
                password: passwords.current,
                newPassword: passwords.new
            });

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                setMessage({ type: 'error', text: response.data.message || 'Failed to change password' });
            }
        } catch (error: any) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'An error occurred while changing password' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Security Settings</h2>
                    <p className="text-sm text-slate-500">Manage your account security and password.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                {message.text && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {message.type === 'success' ? <ShieldCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-slate-400" />
                        Current Password
                    </label>
                    <input
                        type="password"
                        name="current"
                        value={passwords.current}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">New Password</label>
                        <input
                            type="password"
                            name="new"
                            value={passwords.new}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Confirm New Password</label>
                        <input
                            type="password"
                            name="confirm"
                            value={passwords.confirm}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        'Update Password'
                    )}
                </button>
            </form>
        </div>
    );
};

export default SecuritySettings;
