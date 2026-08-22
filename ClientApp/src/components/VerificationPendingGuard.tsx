import React from 'react';
import { Clock, ShieldAlert, CheckCircle2, PhoneCall, RefreshCw } from 'lucide-react';

interface VerificationPendingGuardProps {
    roleName: string;
    userName?: string;
    onRefreshStatus?: () => void;
}

export const VerificationPendingGuard: React.FC<VerificationPendingGuardProps> = ({
    roleName,
    userName,
    onRefreshStatus
}) => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-in fade-in duration-300">
                <div className="mx-auto w-20 h-20 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
                    <Clock className="w-10 h-10 animate-pulse" />
                </div>

                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" /> Account Verification Under Review
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Welcome, {userName || roleName}!
                    </h1>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                        Your <span className="text-amber-400 font-semibold">{roleName}</span> profile and documents have been submitted and are currently awaiting Admin verification.
                    </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-700/60 pb-2">
                        <span>Expected Turnaround:</span>
                        <span className="font-bold text-amber-400">Within 24 Hours</span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-300 pt-1">
                        <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Identity and document validation in progress</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Fleet registration review</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Dashboard features will automatically unlock upon approval</span>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {onRefreshStatus && (
                        <button
                            type="button"
                            onClick={onRefreshStatus}
                            className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                        >
                            <RefreshCw className="w-4 h-4" /> Check Status
                        </button>
                    )}
                    <a
                        href="tel:+919876543210"
                        className="w-full sm:w-auto px-5 py-3 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-100 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                    >
                        <PhoneCall className="w-4 h-4 text-amber-400" /> Support Desk
                    </a>
                </div>
            </div>
        </div>
    );
};
