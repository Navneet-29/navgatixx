import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import apiClient from '../api/apiClient';

interface DriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transporterId?: string;
    transporterUserId?: string;
}

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSuccess, transporterId, transporterUserId }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setVehicleName('');
        setVehicleNumber('');
        setError('');
        setSuccess(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        if (!firstName.trim() || !lastName.trim()) {
            setError('Driver name is required.');
            return;
        }
        if (!email.trim()) {
            setError('Email is required.');
            return;
        }
        if (!password || password !== confirmPassword) {
            setError('Passwords must match.');
            return;
        }

        const sanitizedPhone = phone.replace(/\D/g, '');
        const transporterIdValue = transporterId ? Number(transporterId) : null;

        const payload: any = {
            FirstName: firstName.trim(),
            LastName: lastName.trim(),
            Email: email.trim().toLowerCase(),
            UserName: email.trim().toLowerCase(),
            Password: password.trim(),
            RoleName: 'Driver',
            AccountTypeName: 'Driver',
            TransporterUserId: transporterUserId,
            VehicleName: vehicleName.trim() || null,
            VehicleNumber: vehicleNumber.trim().toUpperCase() || null,
            Name: `${firstName.trim()} ${lastName.trim()}`,
        };

        if (transporterIdValue && !Number.isNaN(transporterIdValue)) {
            payload.TransporterId = transporterIdValue;
        }

        if (sanitizedPhone) {
            payload.Mobile = Number(sanitizedPhone);
            payload.PhoneNumber = sanitizedPhone;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post('/User/AddDriver', payload);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1600);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.response?.data?.Message || 'Unable to save driver.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md overflow-y-auto"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-auto border border-slate-100"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/90">
                    <h2 className="text-xl font-bold text-slate-900">Add Driver</h2>
                    <button 
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="p-2.5 text-slate-700 hover:text-slate-950 bg-slate-200/80 hover:bg-slate-300 rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center"
                    >
                        <X className="h-5 w-5 stroke-[2.5]" />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    {success ? (
                        <div className="py-10 flex flex-col items-center gap-3">
                            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                            </div>
                            <p className="text-lg font-bold text-slate-900">Driver added successfully!</p>
                            <p className="text-sm text-slate-500 text-center">The driver will receive an invitation via email.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="px-4 py-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="text-sm font-semibold text-slate-700">
                                    First Name
                                    <input
                                        value={firstName}
                                        onChange={(event) => setFirstName(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        placeholder="John"
                                        required
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Last Name
                                    <input
                                        value={lastName}
                                        onChange={(event) => setLastName(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        placeholder="Doe"
                                        required
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="text-sm font-semibold text-slate-700">
                                    Email
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        placeholder="name@company.com"
                                        required
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Phone
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        placeholder="+91 98765 43210"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="text-sm font-semibold text-slate-700">
                                    Password
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        required
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Confirm Password
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        required
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="text-sm font-semibold text-slate-700">
                                    Vehicle Name
                                    <input
                                        value={vehicleName}
                                        onChange={(event) => setVehicleName(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        placeholder="Tata Prima 40T"
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Vehicle Number
                                    <input
                                        value={vehicleNumber}
                                        onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                                        placeholder="MH-12-AB-1234"
                                    />
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                            >
                                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                                {isSubmitting ? 'Creating Driver...' : 'Create Driver'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverModal;
