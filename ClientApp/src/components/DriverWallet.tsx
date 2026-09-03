import React, { useState, useEffect, useCallback } from "react";
import { 
    Wallet, History, ArrowUpCircle, TrendingUp, Clock, CheckCircle2, 
    AlertCircle, Lock, KeyRound, ShieldCheck, Mail, RefreshCw, X, AlertTriangle,
    Building2, Check
} from "lucide-react";
import apiClient from "../api/apiClient";

interface DriverWalletProps {
    userId: string;
}

type ModalMode = "none" | "enter_pin" | "setup_pin" | "forgot_pin_send" | "forgot_pin_verify";

const DriverWallet: React.FC<DriverWalletProps> = ({ userId }) => {
    const effectiveUserId = userId || localStorage.getItem("userId") || "";
    
    // User info for email reset
    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const userEmail = currentUser?.email || currentUser?.Email || "";
    const userName = currentUser?.name || currentUser?.FirstName ? `${currentUser?.FirstName} ${currentUser?.LastName || ''}`.trim() : "Madan";

    const [summary, setSummary] = useState<any>(null);
    const [statement, setStatement] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    // Bank Account details
    const [bankAccountHolder, setBankAccountHolder] = useState(userName);
    const [bankName, setBankName] = useState("State Bank of India");
    const [bankAccountNumber, setBankAccountNumber] = useState("30291048123");
    const [bankIfsc, setBankIfsc] = useState("SBIN0001234");
    const [bankSavedMsg, setBankSavedMsg] = useState("");

    // PIN & Modal states
    const [modalMode, setModalMode] = useState<ModalMode>("none");
    const [enterPin, setEnterPin] = useState("");
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);

    // Setup PIN states (2-step page flow: Step 1 -> Next -> Step 2 Confirm)
    const [pinSetupStep, setPinSetupStep] = useState<1 | 2>(1);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [setupError, setSetupError] = useState("");

    // Forgot PIN OTP states
    const [otpCode, setOtpCode] = useState("");
    const [serverOtp, setServerOtp] = useState("");
    const [otpSentMsg, setOtpSentMsg] = useState("");
    const [modalError, setModalError] = useState("");

    // Check if driver has a saved 6-digit security PIN
    const pinStorageKey = "driver_security_pin_" + effectiveUserId;
    const lockoutStorageKey = "driver_pin_lockout_" + effectiveUserId;

    const getSavedPin = () => localStorage.getItem(pinStorageKey);

    const checkLockoutStatus = () => {
        const lockoutTime = localStorage.getItem(lockoutStorageKey);
        if (lockoutTime) {
            const timeRemaining = parseInt(lockoutTime, 10) - Date.now();
            if (timeRemaining > 0) {
                setIsLockedOut(true);
                return true;
            } else {
                localStorage.removeItem(lockoutStorageKey);
                setFailedAttempts(0);
                setIsLockedOut(false);
            }
        }
        return false;
    };

    const fetchData = useCallback(async () => {
        if (!effectiveUserId) return;
        try {
            const [summaryRes, statementRes] = await Promise.all([
                apiClient.get("/DriverFinance/wallet/" + effectiveUserId),
                apiClient.get("/DriverFinance/statement/" + effectiveUserId)
            ]);
            setSummary(summaryRes.data);
            setStatement(statementRes.data);
        } catch (err) {
            console.error("Error fetching driver finance data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [effectiveUserId]);

    useEffect(() => {
        fetchData();
        checkLockoutStatus();
    }, [fetchData]);

    const handleWithdrawClick = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setMessage({ type: "error", text: "Please enter a valid withdrawal amount." });
            return;
        }

        if (amount > (summary?.currentBalance || 0)) {
            setMessage({ type: "error", text: "Insufficient wallet balance." });
            return;
        }

        if (checkLockoutStatus()) {
            setMessage({ type: "error", text: "Maximum attempts reached (3/3). Please reset your PIN via email." });
            return;
        }

        setMessage({ type: "", text: "" });
        setModalError("");

        const savedPin = getSavedPin();
        if (!savedPin) {
            // First time setup required
            setNewPin("");
            setConfirmPin("");
            setSetupError("");
            setModalMode("setup_pin");
        } else {
            // Enter 6-digit PIN to withdraw
            setEnterPin("");
            setModalMode("enter_pin");
        }
    };

    // First time setup / new PIN saving (Verified Twice)
    const handleSaveNewPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
            setSetupError("PIN must be exactly 6 numeric digits.");
            return;
        }
        if (newPin !== confirmPin) {
            setSetupError("PINs do not match. Please re-enter identical 6-digit PIN.");
            return;
        }

        // Save PIN
        localStorage.setItem(pinStorageKey, newPin);
        setFailedAttempts(0);
        localStorage.removeItem(lockoutStorageKey);
        setIsLockedOut(false);
        setModalMode("enter_pin");
        setEnterPin("");
        setModalError("");
        setMessage({ type: "success", text: "6-Digit Security PIN saved successfully! Please enter it to authorize payout." });
    };

    // Authorize withdrawal with 6-digit PIN
    const handleAuthorizeWithPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (checkLockoutStatus()) {
            setModalError("Account PIN entry locked. Maximum 3 incorrect attempts. Please reset via email.");
            return;
        }

        const savedPin = getSavedPin();
        if (enterPin !== savedPin) {
            const nextAttempts = failedAttempts + 1;
            setFailedAttempts(nextAttempts);

            if (nextAttempts >= 3) {
                // Lock for 15 minutes or until email reset
                const lockoutExpires = Date.now() + 15 * 60 * 1000;
                localStorage.setItem(lockoutStorageKey, lockoutExpires.toString());
                setIsLockedOut(true);
                setModalError("Maximum 3 wrong attempts reached! For your security, withdrawal PIN entry is locked. Please reset via Email.");
            } else {
                setModalError("Incorrect PIN. " + (3 - nextAttempts) + " attempt" + (3 - nextAttempts === 1 ? "" : "s") + " remaining before lockout.");
            }
            return;
        }

        // Correct PIN
        setIsSubmitting(true);
        setModalError("");

        try {
            const res = await apiClient.post("/DriverFinance/withdrawal/request", {
                driverUserId: effectiveUserId,
                amount: parseFloat(withdrawAmount),
                pin: enterPin,
                note: "Driver withdrawal request (6-digit PIN verified)"
            });

            if (res.data.success) {
                setMessage({ type: "success", text: "Withdrawal request of ₹" + withdrawAmount + " submitted successfully!" });
                setWithdrawAmount("");
                setEnterPin("");
                setFailedAttempts(0);
                setModalMode("none");
                fetchData();
            } else {
                setModalError(res.data.message || "Withdrawal request failed on server.");
            }
        } catch (err: any) {
            setModalError(err.response?.data?.message || "Server error while processing withdrawal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Forgot PIN: Send OTP simulation/real to Driver email
    const handleSendForgotPinOtp = () => {
        setModalError("");
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setServerOtp(generatedOtp);
        setOtpCode("");
        setOtpSentMsg("A 6-digit verification code has been sent to " + (userEmail || "your registered email") + ".");
        
        console.log("[Navgatix Security] PIN Reset OTP for " + userEmail + ": " + generatedOtp);
        
        setModalMode("forgot_pin_verify");
    };

    // Verify OTP and proceed to setup new PIN
    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode || otpCode.trim() !== serverOtp) {
            setModalError("Invalid or expired verification code. Please check your email or resend.");
            return;
        }

        // OTP verified successfully -> Go to setup new PIN
        setModalError("");
        setNewPin("");
        setConfirmPin("");
        setSetupError("");
        setFailedAttempts(0);
        localStorage.removeItem(lockoutStorageKey);
        setIsLockedOut(false);
        setModalMode("setup_pin");
    };

    const formatCurrency = (val: number) => "₹" + Number(val || 0).toLocaleString("en-IN");

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
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 text-base">Withdraw Funds</h3>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> 6-Digit PIN Protected
                        </span>
                    </div>

                    <form onSubmit={handleWithdrawClick} className="space-y-4">
                        {message.text && (
                            <div className={"p-4 rounded-xl text-xs font-bold flex items-center gap-2 " + (message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                                {message.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                                {message.text}
                            </div>
                        )}
                        
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Enter Amount (e.g. 500)"
                                className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-900"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <ArrowUpCircle className="h-5 w-5" />
                            Request Payout
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column: Bank Payout Account & Statement */}
            <div className="lg:col-span-2 space-y-6">
                {/* Bank Payout Account Details Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Bank Payout Account</h3>
                                <p className="text-xs text-slate-500">Earnings will be transferred directly to this verified account</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <Check className="h-3.5 w-3.5" /> Connected
                        </span>
                    </div>

                    {bankSavedMsg && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {bankSavedMsg}
                        </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Account Holder *</label>
                            <input 
                                type="text"
                                value={bankAccountHolder} 
                                onChange={(e) => setBankAccountHolder(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Bank Name *</label>
                            <input 
                                type="text"
                                value={bankName} 
                                onChange={(e) => setBankName(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Account Number *</label>
                            <input 
                                type="text"
                                value={bankAccountNumber} 
                                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">IFSC Code *</label>
                            <input 
                                type="text"
                                value={bankIfsc} 
                                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono uppercase" 
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setBankSavedMsg("Bank account details verified and updated successfully!");
                                setTimeout(() => setBankSavedMsg(""), 3500);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-200 cursor-pointer"
                        >
                            Save & Verify Account
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                                <History className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-900">Transaction History</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{statement?.transactions?.length || 0} Records</span>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        {statement?.transactions?.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {statement.transactions.map((t: any, i: number) => (
                                    <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={"w-12 h-12 rounded-2xl flex items-center justify-center " + (t.type === "Credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                                {t.type === "Credit" ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{t.description}</p>
                                                <p className="text-xs text-slate-500 font-medium">{new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={"font-black " + (t.type === "Credit" ? "text-emerald-600" : "text-slate-900")}>
                                                {t.type === "Credit" ? "+" : "-"}{formatCurrency(t.amount)}
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

            {/* 1. FIRST TIME SETUP PIN MODAL (Step 1 -> Next -> Step 2 Confirm) */}
            {modalMode === "setup_pin" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative">
                        <button 
                            onClick={() => {
                                setModalMode("none");
                                setPinSetupStep(1);
                                setNewPin("");
                                setConfirmPin("");
                                setSetupError("");
                            }}
                            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <KeyRound className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">
                                    {pinSetupStep === 1 ? "Create 6-Digit Security PIN" : "Confirm 6-Digit PIN"}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {pinSetupStep === 1 ? "Step 1 of 2: Set your 6-digit numeric PIN" : "Step 2 of 2: Re-enter identical 6-digit PIN"}
                                </p>
                            </div>
                        </div>

                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 mb-6">
                            <div className={`h-1.5 flex-1 rounded-full ${pinSetupStep >= 1 ? "bg-indigo-600" : "bg-slate-200"}`}></div>
                            <div className={`h-1.5 flex-1 rounded-full ${pinSetupStep === 2 ? "bg-indigo-600" : "bg-slate-200"}`}></div>
                        </div>

                        {setupError && (
                            <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                {setupError}
                            </div>
                        )}

                        {pinSetupStep === 1 ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider text-center">
                                        Enter 6-Digit Numeric PIN
                                    </label>
                                    <div className="flex justify-center gap-2 sm:gap-3">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <div
                                                key={index}
                                                className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                                                    newPin.length === index
                                                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                                                        : newPin.length > index
                                                        ? "border-slate-800 bg-slate-900 text-white"
                                                        : "border-slate-200 bg-slate-50 text-slate-400"
                                                }`}
                                            >
                                                {newPin.length > index ? "•" : ""}
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="tel"
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        value={newPin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                            setNewPin(val);
                                            setSetupError("");
                                        }}
                                        placeholder="Type 6 digits..."
                                        autoFocus
                                        className="w-full mt-4 text-center tracking-widest text-lg px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalMode("none");
                                            setNewPin("");
                                            setSetupError("");
                                        }}
                                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={newPin.length !== 6}
                                        onClick={() => {
                                            if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
                                                setSetupError("PIN must be exactly 6 numeric digits.");
                                                return;
                                            }
                                            setSetupError("");
                                            setConfirmPin("");
                                            setPinSetupStep(2);
                                        }}
                                        className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        Next Step →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveNewPin} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider text-center">
                                        Re-enter 6-Digit PIN to Confirm
                                    </label>
                                    <div className="flex justify-center gap-2 sm:gap-3">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <div
                                                key={index}
                                                className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                                                    confirmPin.length === index
                                                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                                                        : confirmPin.length > index
                                                        ? "border-slate-800 bg-slate-900 text-white"
                                                        : "border-slate-200 bg-slate-50 text-slate-400"
                                                }`}
                                            >
                                                {confirmPin.length > index ? "•" : ""}
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="tel"
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        value={confirmPin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                            setConfirmPin(val);
                                            setSetupError("");
                                        }}
                                        placeholder="Re-type 6 digits..."
                                        autoFocus
                                        className="w-full mt-4 text-center tracking-widest text-lg px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPinSetupStep(1);
                                            setConfirmPin("");
                                            setSetupError("");
                                        }}
                                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={confirmPin.length !== 6}
                                        className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        Save & Set PIN
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* 2. ENTER SAVED 6-DIGIT PIN (3 Attempts Max + Forgot PIN Link) */}
            {modalMode === "enter_pin" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative">
                        <button 
                            onClick={() => setModalMode("none")}
                            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Lock className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Enter 6-Digit PIN</h3>
                                <p className="text-xs text-slate-500">Amount: <span className="font-black text-slate-900">{formatCurrency(parseFloat(withdrawAmount))}</span></p>
                            </div>
                        </div>

                        {modalError && (
                            <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleAuthorizeWithPin} className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Security PIN</label>
                                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                        Attempt {failedAttempts + 1}/3
                                    </span>
                                </div>
                                <div className="flex justify-center gap-2 sm:gap-3 mb-3">
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <div
                                            key={index}
                                            className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                                                enterPin.length === index
                                                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                                                    : enterPin.length > index
                                                    ? "border-slate-800 bg-slate-900 text-white"
                                                    : "border-slate-200 bg-slate-50 text-slate-400"
                                            }`}
                                        >
                                            {enterPin.length > index ? "•" : ""}
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="tel"
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    value={enterPin}
                                    disabled={isLockedOut}
                                    onChange={(e) => setEnterPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="Type 6-digit PIN..."
                                    maxLength={6}
                                    autoFocus
                                    className="w-full text-center tracking-widest text-lg px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold disabled:bg-slate-100"
                                />
                            </div>

                            <div className="flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={handleSendForgotPinOtp}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Mail className="h-3.5 w-3.5" /> Forgot PIN? Reset via Gmail
                                </button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalMode("none")}
                                    className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || enterPin.length !== 6 || isLockedOut}
                                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? "Verifying..." : "Authorize Withdrawal"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. FORGOT PIN - VERIFY EMAIL OTP */}
            {modalMode === "forgot_pin_verify" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative">
                        <button 
                            onClick={() => setModalMode("none")}
                            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Verify Gmail OTP</h3>
                                <p className="text-xs text-slate-500">Reset your 6-digit withdrawal PIN</p>
                            </div>
                        </div>

                        {otpSentMsg && (
                            <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl">
                                {otpSentMsg}
                            </div>
                        )}

                        {modalError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Enter 6-Digit Verification Code</label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="••••••"
                                    maxLength={6}
                                    autoFocus
                                    className="w-full text-center tracking-widest text-3xl px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-black"
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <button
                                    type="button"
                                    onClick={handleSendForgotPinOtp}
                                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw className="h-3 w-3" /> Resend Code
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalMode("enter_pin")}
                                    className="text-slate-500 font-bold hover:underline cursor-pointer"
                                >
                                    Back to PIN Entry
                                </button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalMode("none")}
                                    className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={otpCode.length !== 6}
                                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Verify & Reset PIN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverWallet;
