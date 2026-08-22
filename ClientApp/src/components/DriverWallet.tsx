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
                apiClient.get(`/DriverFinance/wallet/${userId}`),
                apiClient.get(`/DriverFinance/statement/${userId}`)
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

    const [showPinModal, setShowPinModal] = useState(false);
    const [pinMode, setPinMode] = useState<'create' | 'confirm' | 'verify'>('verify');
    const [enteredPin, setEnteredPin] = useState('');
    const [tempPin, setTempPin] = useState('');
    const [pinError, setPinError] = useState('');

    const handleWithdraw = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid amount.' });
            return;
        }

        if (amount > (summary?.currentBalance || 0)) {
            setMessage({ type: 'error', text: 'Insufficient balance.' });
            return;
        }

        setMessage({ type: '', text: '' });

        // If driver doesn't have a PIN, prompt to create one
        if (!summary?.hasTransactionPIN) {
            setPinMode('create');
            setEnteredPin('');
            setTempPin('');
            setPinError('');
            setShowPinModal(true);
            return;
        }

        // Show verification keypad modal
        setPinMode('verify');
        setEnteredPin('');
        setPinError('');
        setShowPinModal(true);
    };

    const submitWithdrawalRequest = async (pinCode: string) => {
        setIsSubmitting(true);
        try {
            const amount = parseFloat(withdrawAmount);
            const res = await apiClient.post('/DriverFinance/withdrawal/request', {
                driverUserId: userId,
                amount: amount,
                note: 'Driver withdrawal request',
                transactionPIN: pinCode
            });

            if (res.data.success) {
                setMessage({ type: 'success', text: 'Withdrawal request submitted successfully!' });
                setWithdrawAmount('');
                setShowPinModal(false);
                fetchData();
            } else {
                setPinError(res.data.message || 'Verification failed. Try again.');
                setEnteredPin('');
            }
        } catch (err: any) {
            setPinError(err.response?.data?.message || 'Error verifying PIN. Try again.');
            setEnteredPin('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeypadPress = async (num: string) => {
        setPinError('');
        if (enteredPin.length >= 6) return;
        const newPin = enteredPin + num;
        setEnteredPin(newPin);

        if (newPin.length === 6) {
            if (pinMode === 'create') {
                setTempPin(newPin);
                setEnteredPin('');
                setPinMode('confirm');
            } else if (pinMode === 'confirm') {
                if (newPin === tempPin) {
                    // Save PIN to backend
                    try {
                        setIsSubmitting(true);
                        const res = await apiClient.post('/DriverFinance/wallet/setPin', {
                            driverUserId: userId,
                            pin: newPin
                        });
                        if (res.data.success) {
                            // Update summary state locally
                            setSummary((prev: any) => ({ ...prev, hasTransactionPIN: true }));
                            // Automatically proceed to verification/withdrawal
                            await submitWithdrawalRequest(newPin);
                        } else {
                            setPinError(res.data.message || 'Failed to save PIN.');
                            setPinMode('create');
                            setEnteredPin('');
                        }
                    } catch (err) {
                        setPinError('Error saving PIN.');
                        setPinMode('create');
                        setEnteredPin('');
                    } finally {
                        setIsSubmitting(false);
                    }
                } else {
                    setPinError('PINs do not match. Try again.');
                    setPinMode('create');
                    setEnteredPin('');
                    setTempPin('');
                }
            } else {
                // Verify mode: submit withdrawal request with PIN code
                await submitWithdrawalRequest(newPin);
            }
        }
    };

    const handleBackspace = () => {
        if (enteredPin.length > 0) {
            setEnteredPin(enteredPin.slice(0, -1));
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

            {/* Google Pay Style Secure PIN Modal */}
            {showPinModal && (
                <div onClick={() => setShowPinModal(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col items-center">
                        
                        {/* Header Details */}
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-1">
                            {pinMode === 'create' && 'Create Security PIN'}
                            {pinMode === 'confirm' && 'Confirm Security PIN'}
                            {pinMode === 'verify' && 'Enter Security PIN'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mb-6 text-center max-w-[280px]">
                            {pinMode === 'create' && 'Set a 6-digit transaction PIN for secure withdrawals.'}
                            {pinMode === 'confirm' && 'Re-enter your 6-digit transaction PIN to confirm.'}
                            {pinMode === 'verify' && 'Provide your 6-digit transaction PIN to request withdrawal.'}
                        </p>

                        {/* PIN dots display */}
                        <div className="flex gap-4 mb-4 justify-center">
                            {[...Array(6)].map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                                        idx < enteredPin.length
                                            ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-sm shadow-indigo-200'
                                            : 'border-slate-300 bg-transparent'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Error Message */}
                        <div className="h-6 mb-4">
                            {pinError && (
                                <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {pinError}
                                </p>
                            )}
                        </div>

                        {/* Numeric Keypad Grid */}
                        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mb-6">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleKeypadPress(num)}
                                    className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-bold flex items-center justify-center transition-colors mx-auto cursor-pointer"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPinModal(false);
                                    setEnteredPin('');
                                    setTempPin('');
                                    setPinError('');
                                }}
                                className="w-16 h-16 text-slate-500 text-xs font-bold hover:text-slate-700 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadPress('0')}
                                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-bold flex items-center justify-center transition-colors mx-auto cursor-pointer"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={handleBackspace}
                                className="w-16 h-16 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverWallet;
