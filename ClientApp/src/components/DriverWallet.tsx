import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, History, ArrowUpCircle, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/apiClient';

interface DriverWalletProps {
    userId: string;
}

const DriverWallet: React.FC<DriverWalletProps> = ({ userId }) => {
    const [summary, setSummary] = useState<any>(null);
    const [statement, setStatement] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchData = useCallback(async () => {
        try {
            const [summaryRes, statementRes] = await Promise.all([
                apiClient.get('/DriverFinance/summary', { params: { driverUserId: userId } }),
                apiClient.get('/DriverFinance/statement', { params: { driverUserId: userId } })
            ]);
            setSummary(summaryRes.data);
            setStatement(statementRes.data);
        } catch (err) {
            console.error('Error fetching driver finance data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid amount.' });
            return;
        }

        if (amount > (summary?.currentBalance || 0)) {
            setMessage({ type: 'error', text: 'Insufficient balance.' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await apiClient.post('/DriverFinance/withdrawal/request', {
                driverUserId: userId,
                amount: amount,
                note: 'Driver withdrawal request'
            });

            if (res.data.success) {
                setMessage({ type: 'success', text: 'Withdrawal request submitted successfully!' });
                setWithdrawAmount('');
                fetchData();
            } else {
                setMessage({ type: 'error', text: res.data.message || 'Request failed' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error submitting request' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

    if (isLoading) return <div className="p-12 text-center text-slate-400">Loading wallet...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
            {/* Left Column: Stats & Withdraw */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-indigo-50 uppercase tracking-wider text-xs">Available Balance</p>
                    </div>
                    <h2 className="text-4xl font-black mb-2">{formatCurrency(summary?.currentBalance || 0)}</h2>
                    <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" />
                        <span>+{formatCurrency(summary?.totalEarnings || 0)} All-time</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Withdraw Funds</h3>
                    <form onSubmit={handleWithdraw} className="space-y-4">
                        {message.text && (
                            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                {message.text}
                            </div>
                        )}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Amount"
                                className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-900"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <ArrowUpCircle className="h-5 w-5" />
                            Request Payout
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column: Statement */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-full">
                    <div className="p-8 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                            <History className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-900">Transaction History</h3>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        {statement?.transactions?.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {statement.transactions.map((t: any, i: number) => (
                                    <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'Credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {t.type === 'Credit' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{t.description}</p>
                                                <p className="text-xs text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black ${t.type === 'Credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {t.type === 'Credit' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </p>
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center text-slate-400 italic">No transactions yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverWallet;
