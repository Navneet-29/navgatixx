import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, Search, RefreshCw, User, Building2 } from 'lucide-react';
import apiClient from '../../api/apiClient';

interface VerificationItem {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
    role: 'Driver' | 'Transporter';
    profileStatus: string;
    createdAt?: string;
}

export const AdminVerificationsPage: React.FC = () => {
    const [drivers, setDrivers] = useState<VerificationItem[]>([]);
    const [transporters, setTransporters] = useState<VerificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeRoleFilter, setActiveRoleFilter] = useState<'All' | 'Driver' | 'Transporter'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionMsg, setActionMsg] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

    const loadPendingVerifications = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/Transport/getPendingVerifications');
            setDrivers(res.data?.drivers || []);
            setTransporters(res.data?.transporters || []);
        } catch (err) {
            console.error('Failed to load pending verifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPendingVerifications();
    }, []);

    const handleAction = async (item: VerificationItem, action: 'approve' | 'reject') => {
        try {
            await apiClient.post(`/Transport/approveProfile?userId=${item.userId}&role=${item.role}&action=${action}`);
            setActionMsg({
                id: item.userId,
                text: `${item.role} ${item.name} ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`,
                type: action === 'approve' ? 'success' : 'error'
            });
            loadPendingVerifications();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to update status');
        }
    };

    const allItems = [...drivers, ...transporters];
    const filteredItems = allItems.filter(item => {
        if (activeRoleFilter !== 'All' && item.role !== activeRoleFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (item.name || '').toLowerCase().includes(q) ||
            (item.email || '').toLowerCase().includes(q) ||
            (item.phone || '').includes(q)
        );
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
                        <ShieldCheck className="h-7 w-7 text-primary-600" /> Account Verification Requests
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Review and approve new Driver & Transporter 24-hour verification applications.
                    </p>
                </div>
                <button
                    onClick={loadPendingVerifications}
                    disabled={loading}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Requests
                </button>
            </div>

            {actionMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${actionMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    {actionMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
                    {(['All', 'Driver', 'Transporter'] as const).map(role => (
                        <button
                            key={role}
                            onClick={() => setActiveRoleFilter(role)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeRoleFilter === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {role} ({role === 'All' ? allItems.length : role === 'Driver' ? drivers.length : transporters.length})
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search name, email, phone..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-primary-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                            <tr>
                                <th className="p-4">User Details</th>
                                <th className="p-4">Account Role</th>
                                <th className="p-4">Verification Status</th>
                                <th className="p-4 text-right">Admin Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 font-semibold">
                                        No pending verification requests found.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.userId} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4">
                                            <div className="font-extrabold text-slate-900 text-sm">{item.name}</div>
                                            <div className="text-slate-400 font-medium text-xs">{item.email} • {item.phone || 'No phone'}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide ${item.role === 'Driver' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                                {item.role === 'Driver' ? <User className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                                {item.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px] uppercase">
                                                <Clock className="h-3 w-3" /> Pending Review
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleAction(item, 'approve')}
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-lg transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(item, 'reject')}
                                                className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-all cursor-pointer"
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
