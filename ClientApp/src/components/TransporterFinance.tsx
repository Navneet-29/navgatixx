import React, { useState, useEffect } from 'react';
import { DollarSign, PieChart, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import apiClient from '../api/apiClient';

interface TransporterFinanceProps {
    userId: string;
}

const TransporterFinance: React.FC<TransporterFinanceProps> = ({ userId }) => {
    const [financeData, setFinanceData] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Assuming endpoints exist or can be simulated with driver finance service
                const [summaryRes, statementRes] = await Promise.all([
                    apiClient.get('/DriverFinance/summary', { params: { driverUserId: userId } }),
                    apiClient.get('/DriverFinance/statement', { params: { driverUserId: userId } })
                ]);
                setFinanceData(summaryRes.data);
                setTransactions(statementRes.data?.transactions || []);
            } catch (err) {
                console.error('Error fetching finance data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

    if (isLoading) return <div className="p-12 text-center text-slate-400 italic">Loading financial data...</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="premium-card p-6 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-3xl shadow-xl shadow-indigo-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-2xl">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-1 rounded-full">Total Revenue</span>
                    </div>
                    <h3 className="text-3xl font-black mb-1">{formatCurrency(financeData?.totalEarnings || 0)}</h3>
                    <p className="text-indigo-100 text-xs font-medium">Accumulated from all successful rides</p>
                </div>

                <div className="premium-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <PieChart className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase bg-amber-50 text-amber-700 px-2 py-1 rounded-full">Commission</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-1">{formatCurrency((financeData?.totalEarnings || 0) * 0.1)}</h3>
                    <p className="text-slate-500 text-xs font-medium">Estimated 10% platform fee</p>
                </div>

                <div className="premium-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">Settlement</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-1">{formatCurrency(financeData?.currentBalance || 0)}</h3>
                    <p className="text-slate-500 text-xs font-medium">Available for withdrawal</p>
                </div>
            </div>

            <div className="premium-card bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Recent Settlements & Payments</h3>
                    <button className="text-indigo-600 text-sm font-bold hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.length > 0 ? transactions.map((t, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${t.type === 'Credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {t.type === 'Credit' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{t.description}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-medium">{t.reference?.split('|')[0]}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                                            t.status === 'paid' || t.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            t.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                        {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black ${t.type === 'Credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {t.type === 'Credit' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No transactions found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransporterFinance;
