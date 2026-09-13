import React, { useState, useEffect } from 'react';
import { X, Truck, Loader2, CheckCircle2, Layout, Database } from 'lucide-react';
import apiClient from '../api/apiClient';
import { fetchVehicleCommonTypes, type VehicleCommonTypesCache } from '../services/vehicleCommonTypes';

interface VehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
    initialVehicleData?: any | null;
}

const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, onSuccess, userId, initialVehicleData }) => {
    const isEditMode = Boolean(initialVehicleData && (initialVehicleData.id || initialVehicleData.vehicleId));
    const [vehicleName, setVehicleName] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [capacityTons, setCapacityTons] = useState<number | ''>('');
    const [ctVehicleType, setCtVehicleType] = useState<number | ''>('');
    const [ctBodyType, setCtBodyType] = useState<number | ''>('');
    const [ctTyreType, setCtTyreType] = useState<number | ''>('');
    const [rcNumber, setRcNumber] = useState('');
    const [insuranceExpiry, setInsuranceExpiry] = useState('');
    const [permitExpiry, setPermitExpiry] = useState('');
    const [rcDocument, setRcDocument] = useState<File | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [bodyTypes, setBodyTypes] = useState<any[]>([]);
    const [tyreTypes, setTyreTypes] = useState<any[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialVehicleData) {
                setVehicleName(initialVehicleData.vehicleName || initialVehicleData.VehicleName || '');
                setVehicleNumber(initialVehicleData.vehicleNumber || initialVehicleData.VehicleNumber || '');
                setCapacityTons(initialVehicleData.capacityTons ?? initialVehicleData.CapacityTons ?? '');
                setCtVehicleType(initialVehicleData.ctVehicleType ?? initialVehicleData.Ct_VehicleType ?? initialVehicleData.CT_VehicleType ?? '');
                setCtBodyType(initialVehicleData.ctBodyType ?? initialVehicleData.CtBodyType ?? initialVehicleData.CTBodyType ?? '');
                setCtTyreType(initialVehicleData.ctTyreType ?? initialVehicleData.CtTyreType ?? initialVehicleData.CTTyreType ?? '');
                setRcNumber(initialVehicleData.rcNumber || initialVehicleData.RCNumber || '');
                setInsuranceExpiry(initialVehicleData.insuranceExpiry ? String(initialVehicleData.insuranceExpiry).split('T')[0] : '');
                setPermitExpiry(initialVehicleData.permitExpiry ? String(initialVehicleData.permitExpiry).split('T')[0] : '');
            } else {
                setVehicleName('');
                setVehicleNumber('');
                setCapacityTons('');
                setCtVehicleType('');
                setCtBodyType('');
                setCtTyreType('');
                setRcNumber('');
                setInsuranceExpiry('');
                setPermitExpiry('');
            }
            setRcDocument(null);
            setError('');
            setSuccess(false);

            const fetchMasterData = async () => {
                try {
                    const cachedDataString = localStorage.getItem('navgatixMasterData');
                    const now = Date.now();

                    if (cachedDataString) {
                        try {
                            const parsed: VehicleCommonTypesCache = JSON.parse(cachedDataString);
                            if (now - parsed.timestamp < 1000 * 60 * 30) {
                                setVehicleTypes(parsed.vehicleTypes || []);
                                setBodyTypes(parsed.bodyTypes || []);
                                setTyreTypes(parsed.tyreTypes || []);
                                return;
                            }
                        } catch {
                            // invalid cache, continue to refresh
                        }
                    }

                    const masterData = await fetchVehicleCommonTypes();
                    setVehicleTypes(masterData.vehicleTypes);
                    setBodyTypes(masterData.bodyTypes);
                    setTyreTypes(masterData.tyreTypes);
                    localStorage.setItem('navgatixMasterData', JSON.stringify({ ...masterData, timestamp: now }));
                } catch (err) {
                    console.error('Failed to fetch master data:', err);
                }
            };
            fetchMasterData();
        }
    }, [isOpen, initialVehicleData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!vehicleName.trim() || !vehicleNumber.trim()) {
            setError('Vehicle name and number are mandatory.');
            return;
        }

        setIsSubmitting(true);
        try {
            let docs = [];
            if (rcDocument) {
                const docForm = new FormData();
                docForm.append('UploadFile', rcDocument);
                docForm.append('DocumentName', 'Vehicle_RC');
                const vId = initialVehicleData?.id || initialVehicleData?.vehicleId;
                if (vId) {
                    docForm.append('VehicleId', String(vId));
                }
                try {
                    const docRes = await apiClient.post('/Document/upload', docForm, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (docRes.data) {
                        docs.push(docRes.data);
                    }
                } catch (e) {
                    console.error('Document upload failed:', e);
                }
            }

            const payload: any = {
                Id: initialVehicleData?.id || initialVehicleData?.vehicleId || undefined,
                VehicleName: vehicleName.trim(),
                VehicleNumber: vehicleNumber.trim().toUpperCase(),
                Ct_VehicleType: ctVehicleType ? Number(ctVehicleType) : null,
                CtBodyType: ctBodyType ? Number(ctBodyType) : null,
                CtTyreType: ctTyreType ? Number(ctTyreType) : null,
                CapacityTons: capacityTons !== '' ? Number(capacityTons) : null,
                RCNumber: rcNumber.trim(),
                InsuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry).toISOString() : null,
                PermitExpiry: permitExpiry ? new Date(permitExpiry).toISOString() : null,
                Documents: docs,
                UserId: userId || localStorage.getItem('userId')
            };

            await apiClient.post('/Vehicle/vehicleRegistration', payload);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.response?.data?.Message || 'Failed to save vehicle.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
            >
                <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Truck className="text-white h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Vehicle Profile & Documents' : 'Add New Vehicle'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Vehicle Saved!</h3>
                            <p className="text-slate-500">Your vehicle details and documents have been successfully updated.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={vehicleName}
                                        onChange={(e) => setVehicleName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                        placeholder="e.g. TATA Prima 40 Tons"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={vehicleNumber}
                                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all uppercase"
                                        placeholder="e.g. MH-12-AB-1234"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-primary-600" /> Vehicle Type
                                    </label>
                                    <select
                                        value={ctVehicleType}
                                        onChange={(e) => setCtVehicleType(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all bg-white"
                                    >
                                        <option value="">Select Type</option>
                                        {vehicleTypes.map((vt) => (
                                            <option key={vt.id} value={vt.id}>{vt.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-primary-600" /> Body Type
                                    </label>
                                    <select
                                        value={ctBodyType}
                                        onChange={(e) => setCtBodyType(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all bg-white"
                                    >
                                        <option value="">Select Body Type</option>
                                        {bodyTypes.map((bt) => (
                                            <option key={bt.id} value={bt.id}>{bt.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Database className="h-4 w-4 text-primary-600" /> Tyre Configuration
                                    </label>
                                    <select
                                        value={ctTyreType}
                                        onChange={(e) => setCtTyreType(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all bg-white"
                                    >
                                        <option value="">Select Tyre Count</option>
                                        {tyreTypes.map((tt) => (
                                            <option key={tt.id} value={tt.id}>{tt.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Capacity (Load Size in Tons)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={capacityTons}
                                        onChange={(e) => setCapacityTons(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all"
                                        placeholder="e.g. 10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">RC Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="text"
                                        value={rcNumber}
                                        onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none uppercase transition-all"
                                        placeholder="e.g. MH12AB1234"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Insurance Expiry <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="date"
                                        value={insuranceExpiry}
                                        onChange={(e) => setInsuranceExpiry(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Permit Expiry <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="date"
                                        value={permitExpiry}
                                        onChange={(e) => setPermitExpiry(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all bg-white"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Upload RC / Vehicle Document <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                                        <input
                                            type="file"
                                            id="rcUpload"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setRcDocument(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        <label htmlFor="rcUpload" className="cursor-pointer flex flex-col items-center">
                                            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-3">
                                                <Database className="h-6 w-6" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-900">
                                                {rcDocument ? rcDocument.name : 'Click to select RC / Vehicle Document'}
                                            </span>
                                            <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-extrabold py-4 rounded-2xl text-lg shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        Saving Vehicle...
                                    </>
                                ) : (
                                    isEditMode ? 'Save & Update Vehicle' : 'Register Vehicle'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleModal;
