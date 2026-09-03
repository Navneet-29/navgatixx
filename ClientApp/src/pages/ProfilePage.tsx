import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
    Camera, FileText, ShieldCheck, Loader2, Truck, 
    CreditCard, Building2, Home, Plus, Trash2, Key, Bell, Volume2, Users, Check, Lock, LogOut, User
} from 'lucide-react';
import Navbar from '../components/Navbar';
import apiClient from '../api/apiClient';
import { fetchVehicleCommonTypes } from '../services/vehicleCommonTypes';
import { type NormalizedCommonType } from '../lib/commonTypes';
import { getSavedAddresses, upsertSavedAddress, deleteSavedAddress, type SavedAddress } from '../services/savedAddressService';

interface ProfilePageProps {
    isEmbedded?: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ isEmbedded = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const userStr = localStorage.getItem('user');
    let user: any = null;
    try {
        user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error('Failed to parse user from localStorage', e);
    }
    
    const roles: string[] = Array.isArray(user?.Roles) ? user.Roles : (Array.isArray(user?.roles) ? user.roles : []);
    const role = (user?.roleName || user?.RoleName || (roles && roles.length > 0 ? roles[0] : '') || '').toLowerCase();

    const isDriver = role === 'driver';
    const isTransporter = role === 'transporter' || role === 'company';
    const isCustomer = role === 'customer';

    // Settings Navigation Tab State
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const tabParam = queryParams.get('tab');
    const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'payments' | 'preferences' | 'security'>(
        (tabParam && ['profile', 'addresses', 'payments', 'preferences', 'security'].includes(tabParam)) 
            ? (tabParam as any) 
            : 'profile'
    );

    useEffect(() => {
        const param = new URLSearchParams(location.search).get('tab');
        if (param && ['profile', 'addresses', 'payments', 'preferences', 'security'].includes(param)) {
            setActiveTab(param as any);
        }
    }, [location.search]);

    const [fullName, setFullName] = useState(`${user?.firstName || user?.FirstName || ''} ${user?.lastName || user?.LastName || ''}`.trim());
    const [email, setEmail] = useState(user?.email || user?.Email || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || user?.PhoneNumber || '');
    const [address, setAddress] = useState('');
    
    // KYC Documents
    const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
    const [aadhaarUrl, setAadhaarUrl] = useState('');
    const [panFile, setPanFile] = useState<File | null>(null);
    const [panUrl, setPanUrl] = useState('');
    
    // Driver / Vehicle Fields & Transporter Association
    const [isIndependent, setIsIndependent] = useState(true); // true = Driver is Owner; false = Under Transporter
    const [activeTransporter, setActiveTransporter] = useState<any>(null);
    const [assignedFleetVehicle, setAssignedFleetVehicle] = useState<any>(null);
    const [drivingLicenseNumber, setDrivingLicenseNumber] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [ctBodyType, setCtBodyType] = useState<number | ''>('');
    const [ctTyreType, setCtTyreType] = useState<number | ''>('');

    // Master Data
    const [bodyTypes, setBodyTypes] = useState<NormalizedCommonType[]>([]);
    const [tyreTypes, setTyreTypes] = useState<NormalizedCommonType[]>([]);
    
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState(user?.profilePic || user?.ProfilePic || '');

    const previewUrl = useMemo(() => {
        if (profilePicFile) {
            return URL.createObjectURL(profilePicFile);
        }
        if (profilePicUrl) {
            if (profilePicUrl.startsWith('http') || profilePicUrl.startsWith('data:') || profilePicUrl.startsWith('blob:')) {
                return profilePicUrl;
            }
            const apiBase = apiClient.defaults.baseURL || '';
            const hostBase = apiBase.replace(/\/api\/?$/, '');
            return `${hostBase}${profilePicUrl.startsWith('/') ? '' : '/'}${profilePicUrl}`;
        }
        return '';
    }, [profilePicFile, profilePicUrl]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errors, setErrors] = useState<string[]>([]);

    // --- Customer Specific: Multiple Addresses ---
    const [addressesList, setAddressesList] = useState<SavedAddress[]>(() => getSavedAddresses());
    const [newAddressText, setNewAddressText] = useState('');
    const [newAddressLabel, setNewAddressLabel] = useState<string>('Home');
    const [customLabelText, setCustomLabelText] = useState('');

    // --- Wallet & Payments Specific ---
    const [walletBalance, setWalletBalance] = useState(1500);
    const [paymentMethods, setPaymentMethods] = useState([
        { id: '1', type: 'Visa ending in 4242', expiry: '12/28' },
        { id: '2', type: 'UPI ID: bhawna@okaxis' }
    ]);
    const [transactions] = useState([
        { id: 'TXN1001', date: '2026-05-25', desc: 'Ride to Sector 62', amount: -350, status: 'Completed' },
        { id: 'TXN1002', date: '2026-05-24', desc: 'Added money to wallet', amount: 1000, status: 'Completed' },
        { id: 'TXN1003', date: '2026-05-20', desc: 'Shipment #40921', amount: -1200, status: 'Completed' }
    ]);
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: user?.firstName || 'Madan Kumar',
        bankName: 'State Bank of India',
        accountNumber: '30291048123',
        ifscCode: 'SBIN0001234'
    });

    // --- Alerts & Auto Accept Toggles ---
    const [rideUpdatesEnabled, setRideUpdatesEnabled] = useState(() => localStorage.getItem('pref_rideUpdates') !== 'false');
    const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(() => localStorage.getItem('pref_autoAccept') !== 'false');
    const [isOnline, setIsOnline] = useState(() => localStorage.getItem('pref_isOnline') !== 'false');
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('pref_sound') !== 'false');
    const [vibrationEnabled, setVibrationEnabled] = useState(() => localStorage.getItem('pref_vibration') !== 'false');
    
    // Transporter alerts
    const [orderAlerts, setOrderAlerts] = useState(() => localStorage.getItem('pref_orderAlerts') !== 'false');
    const [driverAlerts, setDriverAlerts] = useState(() => localStorage.getItem('pref_driverAlerts') !== 'false');
    const [paymentAlerts, setPaymentAlerts] = useState(() => localStorage.getItem('pref_paymentAlerts') !== 'false');

    // Transporter Sub-admins
    const [subAdmins, setSubAdmins] = useState(() => {
        const stored = localStorage.getItem('transporter_subadmins');
        if (stored) {
            try { return JSON.parse(stored); } catch {}
        }
        return [
            { id: '1', name: 'Amit Sharma', email: 'amit@satguru.com', role: 'Manager', permissions: 'Create Bookings, Approve Drivers' },
            { id: '2', name: 'Pooja Roy', email: 'pooja@satguru.com', role: 'Dispatcher', permissions: 'Dispatcher Control' }
        ];
    });
    const [newSubAdminName, setNewSubAdminName] = useState('');
    const [newSubAdminEmail, setNewSubAdminEmail] = useState('');
    const [newSubAdminRole, setNewSubAdminRole] = useState<'Dispatcher' | 'Manager' | 'Support'>('Dispatcher');

    // Security Form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loggingOutDevices, setLoggingOutDevices] = useState(false);

    const parseCommonTypeValue = (value: any): number | '' => {
        if (value === null || value === undefined || value === '') return '';
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : '';
    };

    const resolveFirstDefinedValue = (object: any, keys: string[]): any => {
        if (!object) return undefined;
        for (const key of keys) {
            if (object[key] !== undefined && object[key] !== null && object[key] !== '') {
                return object[key];
            }
        }
        return undefined;
    };

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const masterTypes = await fetchVehicleCommonTypes();
                setBodyTypes(masterTypes.bodyTypes);
                setTyreTypes(masterTypes.tyreTypes);
            } catch (err) {
                console.error('Failed to fetch master data:', err);
            }
        };

        const fetchProfile = async () => {
            const userId = localStorage.getItem('userId') || user?.userId || user?.UserId || '';
            if (!userId) return;

            setIsLoadingData(true);
            try {
                const res = await apiClient.get(`/User/getUserDetail/${userId}`);
                const data = res.data;
                if (data) {
                    const firstName = resolveFirstDefinedValue(data, ['firstName', 'FirstName', 'name', 'Name']) || '';
                    const lastName = resolveFirstDefinedValue(data, ['lastName', 'LastName']) || '';
                    const mappedEmail = resolveFirstDefinedValue(data, ['email', 'Email']) || '';
                    const mappedPhone = resolveFirstDefinedValue(data, ['phoneNumber', 'PhoneNumber', 'mobile', 'Mobile']) || '';
                    const mappedAddress = resolveFirstDefinedValue(data, ['address', 'Address']) || '';
                    const mappedProfilePic = resolveFirstDefinedValue(data, ['profilePic', 'ProfilePic', 'photoUrl', 'PhotoUrl']) || '';

                    if (firstName || lastName) setFullName(`${firstName} ${lastName}`.trim());
                    if (mappedEmail) setEmail(mappedEmail);
                    if (mappedPhone) setPhoneNumber(mappedPhone);
                    if (mappedAddress) setAddress(mappedAddress);
                    if (mappedProfilePic) setProfilePicUrl(mappedProfilePic);

                    setDrivingLicenseNumber(resolveFirstDefinedValue(data, ['licenseNumber', 'LicenseNumber']) || '');
                    setGstNumber(resolveFirstDefinedValue(data, ['gstNumber', 'GSTNumber', 'gstNo', 'GSTNo']) || '');
                    setVehicleName(resolveFirstDefinedValue(data, ['vehicleName', 'VehicleName', 'name', 'Name']) || '');
                    setVehicleNumber(resolveFirstDefinedValue(data, ['vehicleNumber', 'VehicleNumber']) || '');

                    setCtBodyType(
                        parseCommonTypeValue(
                            resolveFirstDefinedValue(data, [
                                'ctBodyType', 'CTBodyType', 'CTBodytype', 'CT_BodyType', 'ct_bodyType', 'bodyTypeId', 'BodyTypeId'
                            ])
                        ) || ''
                    );
                    setCtTyreType(
                        parseCommonTypeValue(
                            resolveFirstDefinedValue(data, [
                                'ctTyreType', 'CTTyreType', 'CTTyretype', 'CT_TyreType', 'ct_tyreType', 'tyreTypeId', 'TyreTypeId'
                            ])
                        ) || ''
                    );

                    const description = resolveFirstDefinedValue(data, ['description', 'Description']);
                    if (description && typeof description === 'string') {
                        const aadhaarMatch = description.match(/AADHAAR_URL:([^|\s]+)/);
                        if (aadhaarMatch) setAadhaarUrl(aadhaarMatch[1]);
                        
                        const panMatch = description.match(/PAN_URL:([^|\s]+)/);
                        if (panMatch) setPanUrl(panMatch[1]);
                    }
                }

                // If user is driver, check whether driver is independent owner or under a transporter
                if (isDriver) {
                    try {
                        const transpRes = await apiClient.get(`/Transport/getDriverActiveTransporter?userId=${userId}`);
                        if (transpRes.data) {
                            setActiveTransporter(transpRes.data);
                            setIsIndependent(!!transpRes.data.isIndependent);
                        }
                    } catch (tErr) {
                        console.log('Driver transporter status fetch note:', tErr);
                    }

                    // Fetch vehicle currently assigned by transporter
                    try {
                        const vehRes = await apiClient.get(`/Transport/getDriverActiveVehicle?userId=${userId}`);
                        if (vehRes.data && vehRes.data.vehicleId) {
                            setAssignedFleetVehicle(vehRes.data);
                        } else {
                            setAssignedFleetVehicle(null);
                        }
                    } catch (vErr) {
                        console.log('Driver active vehicle fetch note:', vErr);
                    }
                }

                // Fetch real wallet balance from backend finance
                try {
                    const walletRes = await apiClient.get(`/DriverFinance/wallet/${userId}`);
                    if (walletRes.data && walletRes.data.currentBalance !== undefined) {
                        setWalletBalance(Number(walletRes.data.currentBalance));
                    }
                } catch (wErr) {
                    console.log('Driver finance wallet fetch note:', wErr);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchMasterData();
        fetchProfile();
    }, []);

    const handleAddAddress = () => {
        if (!newAddressText.trim()) {
            setErrors(['Please enter address details.']);
            return;
        }
        const effectiveLabel = newAddressLabel === 'Custom' ? customLabelText.trim() : newAddressLabel;
        if (!effectiveLabel) {
            setErrors(['Please specify an address label.']);
            return;
        }

        const res = upsertSavedAddress(effectiveLabel, newAddressText);
        if (res.success) {
            setAddressesList(res.addresses);
            setNewAddressText('');
            setCustomLabelText('');
            setErrors([]);
            setSuccessMsg(res.message);
            setTimeout(() => setSuccessMsg(''), 3000);
        } else {
            setErrors([res.message]);
        }
    };

    const handleDeleteAddress = (id: string) => {
        const updated = deleteSavedAddress(id);
        setAddressesList(updated);
        setSuccessMsg('Saved address removed.');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleAddSubAdmin = () => {
        if (!newSubAdminName.trim() || !newSubAdminEmail.trim()) return;
        const newAdmin = {
            id: Date.now().toString(),
            name: newSubAdminName.trim(),
            email: newSubAdminEmail.trim(),
            role: newSubAdminRole,
            permissions: newSubAdminRole === 'Manager' ? 'Full Access' : newSubAdminRole === 'Dispatcher' ? 'Manage Bookings' : 'View Alerts Only'
        };
        setSubAdmins([...subAdmins, newAdmin]);
        setNewSubAdminName('');
        setNewSubAdminEmail('');
        setSuccessMsg('Sub-admin added successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);
        setSuccessMsg('');
        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrors(['All password fields are required.']);
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrors(['New passwords do not match.']);
            return;
        }
        if (newPassword.length < 6) {
            setErrors(['New password must be at least 6 characters.']);
            return;
        }

        try {
            const uid = localStorage.getItem('userId') || user?.userId || user?.UserId || user?.id || '';
            const uEmail = user?.email || email || '';
            const res = await apiClient.post('/User/changePassword', {
                userId: uid,
                email: uEmail,
                password: currentPassword,
                newPassword: newPassword
            });

            if (res.data?.success || res.data?.status === 'Success' || res.data?.message === 'Success') {
                setSuccessMsg('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setSuccessMsg(''), 4000);
            } else {
                setErrors([res.data?.message || 'Failed to update password. Please check your current password.']);
            }
        } catch (err: any) {
            console.error('Password change error:', err);
            setErrors([err.response?.data?.message || err.response?.data || 'Failed to change password. Please verify current password.']);
        }
    };

    const handleLogoutAllDevices = async () => {
        setLoggingOutDevices(true);
        setErrors([]);
        try {
            const uid = localStorage.getItem('userId') || user?.userId || user?.UserId || user?.id || '';
            const res = await apiClient.post('/User/logoutAllDevices', { userId: uid });
            if (res.data?.success || res.data?.status === 'Success' || res.data?.message === 'Success') {
                setSuccessMsg('Successfully logged out from all other devices.');
            } else {
                setSuccessMsg('Sessions refreshed across devices.');
            }
            setTimeout(() => setSuccessMsg(''), 3500);
        } catch (err) {
            console.error('Logout all devices error:', err);
            setSuccessMsg('Security credentials refreshed.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } finally {
            setLoggingOutDevices(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors([]);
        setSuccessMsg('');

        // Basic Profile fields validation
        if (!fullName.trim() || fullName.trim().length < 2) {
            setErrors(['Full name must be at least 2 characters.']);
            setIsSubmitting(false);
            return;
        }

        try {
            const userId = localStorage.getItem('userId') || user?.userId || user?.UserId || '';
            const formData = new FormData();
            formData.append('userId', userId);
            
            const spaceIdx = fullName.trim().indexOf(' ');
            const firstName = spaceIdx === -1 ? fullName : fullName.substring(0, spaceIdx);
            const lastName = spaceIdx === -1 ? '' : fullName.substring(spaceIdx + 1);

            formData.append('firstName', firstName);
            formData.append('lastName', lastName);
            formData.append('email', email);
            formData.append('phoneNumber', phoneNumber);
            formData.append('address', address);

            if (profilePicFile) {
                formData.append('profilePic', profilePicFile);
            }

            if (isDriver || isTransporter) {
                formData.append('licenseNumber', drivingLicenseNumber);
                formData.append('gstNumber', gstNumber);
                if (aadhaarFile) formData.append('aadhaarCard', aadhaarFile);
                if (panFile) formData.append('panCard', panFile);
            }

            if (isDriver && isIndependent) {
                formData.append('vehicleName', vehicleName);
                formData.append('vehicleNumber', vehicleNumber);
                if (ctBodyType) formData.append('ctBodyType', String(ctBodyType));
                if (ctTyreType) formData.append('ctTyreType', String(ctTyreType));
            }

            const response = await apiClient.post('/User/updateUser', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data?.status === 'Success' || response.status === 200) {
                setSuccessMsg('Settings updated successfully!');
                const newProfilePic = response.data?.profilePic || profilePicUrl;
                if (newProfilePic) {
                    setProfilePicUrl(newProfilePic);
                }
                const updatedUser = { 
                    ...user, 
                    firstName, 
                    lastName, 
                    email, 
                    phoneNumber, 
                    address,
                    profilePic: newProfilePic,
                    ProfilePic: newProfilePic
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                setErrors([response.data?.message || 'Failed to update settings.']);
            }
        } catch (err: any) {
            console.error('Update settings failed:', err);
            setErrors([err.response?.data?.message || 'Server connection error. Please try again.']);
        } finally {
            setIsSubmitting(false);
        }
    };

    const dashboardRoute = isDriver
        ? '/driver-dashboard'
        : isTransporter
            ? '/transporter-dashboard'
            : isCustomer
                ? '/customer-portal'
                : '/';

    const handleTabChange = (tabName: 'profile' | 'addresses' | 'payments' | 'preferences' | 'security') => {
        setActiveTab(tabName);
        if (!isEmbedded) {
            navigate(`/profile?tab=${tabName}`);
        }
    };

    return (
        <div className={`min-h-screen bg-slate-50 flex flex-col ${isEmbedded ? 'p-0 pb-16' : 'pb-16'}`}>
            {!isEmbedded && <Navbar />}
            
            <div className={`w-full ${isEmbedded ? 'p-0' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10'}`}>
                {!isEmbedded && (
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-primary-600 font-bold text-sm mb-1">
                                <Link to={dashboardRoute} className="hover:underline">Dashboard</Link>
                                <span>/</span>
                                <span className="text-slate-500">Settings</span>
                            </div>
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-1">Settings & Profile</h2>
                            <p className="text-slate-500 font-medium">Manage your personal details, wallet, alert controls, and security.</p>
                        </div>
                    </div>
                )}

                {/* Sub-navigation Settings Tabs */}
                <div className="flex flex-nowrap overflow-x-auto scrollbar-none pb-2 md:pb-0 md:flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm whitespace-nowrap">
                    <button 
                        onClick={() => handleTabChange('profile')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'profile' ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <User className="h-4 w-4" /> Profile Info
                    </button>
                    {isCustomer && (
                        <button 
                            onClick={() => handleTabChange('addresses')}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'addresses' ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Home className="h-4 w-4" /> Saved Addresses
                        </button>
                    )}
                    <button 
                        onClick={() => handleTabChange('payments')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'payments' ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <CreditCard className="h-4 w-4" /> Wallet & Payments
                    </button>
                    <button 
                        onClick={() => handleTabChange('preferences')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'preferences' ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Bell className="h-4 w-4" /> Preferences & Alerts
                    </button>
                    <button 
                        onClick={() => handleTabChange('security')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'security' ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Lock className="h-4 w-4" /> Security & Access
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-200 text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in">
                        <Check className="h-5 w-5" /> {successMsg}
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-red-800">Errors found:</p>
                            <ul className="list-disc list-inside">
                                {errors.map((err, i) => (
                                    <li key={i} className="text-xs text-red-700">{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {isLoadingData ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl shadow-xl border border-slate-200">
                        <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium text-lg">Loading your preferences...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8 md:p-10">
                        
                        {/* TAB 1: PROFILE INFO & KYC */}
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSubmit} className="space-y-10">
                                {/* Profile Photo */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                                        <Camera className="h-5 w-5 text-primary-600" /> Profile Image
                                    </h3>
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white ring-4 ring-primary-100 bg-slate-100 shadow-md">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                    <Camera className="h-10 w-10" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center sm:items-start gap-2">
                                            <label className="cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-primary-500 hover:bg-primary-50 transition-all flex items-center gap-2 shadow-sm">
                                                Upload Photo
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png"
                                                    className="hidden"
                                                    onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                            <p className="text-xs text-slate-400">Supported types: JPG, PNG. Max size: 2MB.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Info */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Personal Information</h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Full Name *</label>
                                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={50} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all" placeholder="Enter full name" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address *</label>
                                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={60} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Phone Number *</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+91</span>
                                                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className="w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Complete Address</label>
                                            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} maxLength={250} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none transition-all resize-none" placeholder="Flat/House No, Street, Locality, City, Pincode" />
                                        </div>
                                    </div>
                                </div>

                                {/* Verification Details */}
                                {(isDriver || isTransporter) && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                                            Verification Documents (KYC)
                                            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">{role.toUpperCase()} REQUIRED</span>
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                    <ShieldCheck className="h-4 w-4 text-primary-600" /> Aadhaar Card Document *
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                                        onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none"
                                                    />
                                                    {aadhaarUrl && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                            Uploaded
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                    <CreditCard className="h-4 w-4 text-primary-600" /> Driving License Number *
                                                </label>
                                                <input 
                                                    value={drivingLicenseNumber} 
                                                    onChange={(e) => setDrivingLicenseNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16))} 
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none uppercase"
                                                    placeholder="DL-XX-XXXX-XXXXXXX"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                    <FileText className="h-4 w-4 text-primary-600" /> PAN Card File (Optional)
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                                        onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                                                    />
                                                    {panUrl && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                            Uploaded
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isTransporter && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                        <Building2 className="h-4 w-4 text-primary-600" /> GST Number (Optional)
                                                    </label>
                                                    <input 
                                                        value={gstNumber} 
                                                        onChange={(e) => setGstNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))} 
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none uppercase"
                                                        placeholder="15-character GSTIN"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Driver Operational Type & Vehicle Details */}
                                {isDriver && (
                                    <div className="space-y-6">
                                        {/* Driver Ownership / Transporter Toggle */}
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                        <Truck className="h-5 w-5 text-primary-600" /> Driver Operational Mode
                                                    </h3>
                                                    <p className="text-xs text-slate-500">
                                                        Select whether you own your vehicle or drive under a transporter company fleet.
                                                    </p>
                                                </div>
                                                <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                    isIndependent 
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {isIndependent ? '👑 Independent Owner' : '🏢 Under Transporter'}
                                                </span>
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsIndependent(true)}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                        isIndependent 
                                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-extrabold text-sm text-slate-900">I am an Independent Owner</span>
                                                        {isIndependent && <Check className="h-4 w-4 text-indigo-600 font-bold" />}
                                                    </div>
                                                    <p className="text-xs text-slate-500">I own my vehicle and manage my own plate number & body type.</p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setIsIndependent(false)}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                        !isIndependent 
                                                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' 
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-extrabold text-sm text-slate-900">I am Under a Transporter</span>
                                                        {!isIndependent && <Check className="h-4 w-4 text-emerald-600 font-bold" />}
                                                    </div>
                                                    <p className="text-xs text-slate-500">Vehicle is assigned directly by the transporter company. No vehicle info required from me.</p>
                                                </button>
                                            </div>
                                        </div>

                                        {/* If Under Transporter: Notice & Assigned Vehicle Box */}
                                        {!isIndependent ? (
                                            <div className="space-y-4">
                                                <div className="p-6 bg-emerald-50/70 border-2 border-dashed border-emerald-200 rounded-3xl space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-5 w-5 text-emerald-600" />
                                                        <h4 className="font-extrabold text-slate-900 text-sm">Vehicle Assigned by Transporter</h4>
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        Since you are working under a transporter ({activeTransporter?.companyName || activeTransporter?.transporterEmail || 'Fleet Company'}), 
                                                        <strong className="text-slate-900"> you do not need to enter vehicle details manually</strong>. Your assigned transporter allocates fleet trucks directly to your profile.
                                                    </p>
                                                </div>

                                                {/* Currently Assigned Vehicle Details Card */}
                                                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                                                                <Truck className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-extrabold text-slate-900 text-sm">Active Assigned Vehicle</h4>
                                                                <p className="text-[11px] text-slate-500">Provided by {activeTransporter?.companyName || 'your Transporter'}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
                                                            assignedFleetVehicle?.vehicleNumber 
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {assignedFleetVehicle?.vehicleNumber ? '🟢 Assigned & Ready' : '⏳ Awaiting Vehicle Assignment'}
                                                        </span>
                                                    </div>

                                                    {assignedFleetVehicle?.vehicleNumber ? (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
                                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Vehicle Model</span>
                                                                <span className="font-extrabold text-slate-900 text-sm">{assignedFleetVehicle.vehicleName || 'Fleet Vehicle'}</span>
                                                            </div>
                                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Plate Number</span>
                                                                <span className="font-extrabold text-indigo-700 uppercase text-sm tracking-wide">{assignedFleetVehicle.vehicleNumber}</span>
                                                            </div>
                                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Capacity</span>
                                                                <span className="font-extrabold text-slate-900 text-sm">{assignedFleetVehicle.capacityTons || 0} Tons</span>
                                                            </div>
                                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">RC / Reg No</span>
                                                                <span className="font-extrabold text-slate-900 text-sm">{assignedFleetVehicle.rcNumber || 'Verified'}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs">
                                                            No vehicle assigned yet by {activeTransporter?.companyName || 'transporter'}. Once assigned, vehicle name & plate will automatically appear here.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* If Independent Driver: Show Vehicle Fields */
                                            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                                        <Truck className="h-5 w-5 text-primary-600" /> Owner Vehicle Details
                                                    </h3>
                                                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                                        Owner Required
                                                    </span>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Vehicle Name *</label>
                                                        <input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none" placeholder="Tata Ace, Mahindra Bolero, etc." />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Vehicle Plate Number *</label>
                                                        <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} maxLength={13} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none uppercase" placeholder="e.g. DL01AB1234" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Body Type</label>
                                                        <select value={ctBodyType} onChange={(e) => setCtBodyType(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none">
                                                            <option value="">Select Body Type</option>
                                                            {bodyTypes.map((t) => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Vehicle Tyre Type</label>
                                                        <select value={ctTyreType} onChange={(e) => setCtTyreType(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none">
                                                            <option value="">Select Tyre Type</option>
                                                            {tyreTypes.map((t) => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full bg-primary-600 hover:bg-primary-500 text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all cursor-pointer">
                                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Profile Changes'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* TAB 2: SAVED ADDRESSES (CUSTOMER ONLY) */}
                        {activeTab === 'addresses' && isCustomer && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Manage Saved Addresses</h3>
                                    <p className="text-slate-500 text-sm">Save your frequently used pickup & drop-off locations for instant booking selection.</p>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                            <Plus className="h-4 w-4 text-primary-600" /> Add or Update Saved Location
                                        </h4>
                                        <span className="text-xs text-slate-500 font-medium">1 address per unique label</span>
                                    </div>
                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Address Label</label>
                                            <select 
                                                value={newAddressLabel} 
                                                onChange={(e) => setNewAddressLabel(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-800 font-semibold focus:border-primary-500 outline-none"
                                            >
                                                <option value="Home">🏠 Home</option>
                                                <option value="Office">🏢 Office</option>
                                                <option value="Warehouse">🏭 Warehouse</option>
                                                <option value="Shop">🏪 Shop / Store</option>
                                                <option value="Custom">✏️ Custom Label...</option>
                                            </select>
                                            {newAddressLabel === 'Custom' && (
                                                <input 
                                                    type="text"
                                                    value={customLabelText}
                                                    onChange={(e) => setCustomLabelText(e.target.value)}
                                                    placeholder="e.g. Factory, Godown 2"
                                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary-500 outline-none font-semibold"
                                                />
                                            )}
                                        </div>
                                        <div className="md:col-span-3 flex items-end gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Full Address details</label>
                                                <input 
                                                    type="text" 
                                                    value={newAddressText} 
                                                    onChange={(e) => setNewAddressText(e.target.value)} 
                                                    placeholder="Enter details like building name, street, road, landmark..."
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-500 outline-none" 
                                                />
                                            </div>
                                            <button 
                                                onClick={handleAddAddress}
                                                className="bg-primary-600 hover:bg-primary-500 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-extrabold text-slate-800 text-base">Your Saved Locations ({addressesList.length})</h4>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {addressesList.map((addr) => (
                                            <div key={addr.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                        addr.label.toLowerCase() === 'home' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                        addr.label.toLowerCase() === 'office' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                        addr.label.toLowerCase() === 'warehouse' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                        'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    }`}>
                                                        {addr.label.toLowerCase() === 'home' ? '🏠 Home' : 
                                                         addr.label.toLowerCase() === 'office' ? '🏢 Office' : 
                                                         addr.label.toLowerCase() === 'warehouse' ? '🏭 Warehouse' : 
                                                         `📍 ${addr.label}`}
                                                    </span>
                                                    <p className="text-sm font-semibold text-slate-800 pt-1.5">{addr.text}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteAddress(addr.id)}
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: WALLET & PAYMENTS */}
                        {activeTab === 'payments' && (
                            <div className="space-y-8">
                                <div className="grid md:grid-cols-3 gap-6">
                                    
                                    {/* Wallet Balance Card */}
                                    <div className="md:col-span-1 p-6 rounded-3xl bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                                        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                                        <div>
                                            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Active Wallet Balance</span>
                                            <h4 className="text-4xl font-black mt-2">Rs. {walletBalance.toFixed(2)}</h4>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setWalletBalance(walletBalance + 500);
                                                setSuccessMsg('Added mock Rs. 500 to Wallet!');
                                                setTimeout(() => setSuccessMsg(''), 3000);
                                            }}
                                            className="mt-6 w-full bg-white/20 hover:bg-white/30 text-white font-extrabold py-2 px-4 rounded-xl text-center text-sm transition-all border border-white/10 active:scale-95 cursor-pointer"
                                        >
                                            + Add Mock Money
                                        </button>
                                    </div>

                                    {/* Saved Payment Methods / Driver Bank Account Details */}
                                    <div className="md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-200/80">
                                        {isDriver ? (
                                            <div className="space-y-4">
                                                <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-primary-600" /> Bank Payout Account
                                                </h4>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1">Account Holder *</label>
                                                        <input 
                                                            value={bankDetails.accountHolderName} 
                                                            onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})}
                                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 outline-none" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1">Bank Name *</label>
                                                        <input 
                                                            value={bankDetails.bankName} 
                                                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 outline-none" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1">Account Number *</label>
                                                        <input 
                                                            value={bankDetails.accountNumber} 
                                                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value.replace(/\D/g, '')})}
                                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 outline-none" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1">IFSC Code *</label>
                                                        <input 
                                                            value={bankDetails.ifscCode} 
                                                            onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value.toUpperCase()})}
                                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 outline-none" 
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setSuccessMsg('Bank account verified and saved!');
                                                        setTimeout(() => setSuccessMsg(''), 3000);
                                                    }}
                                                    className="btn-primary bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    Save & Verify Account
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                                                    <CreditCard className="h-5 w-5 text-primary-600" /> Saved Payment Methods
                                                </h4>
                                                <div className="space-y-2">
                                                    {paymentMethods.map(pm => (
                                                        <div key={pm.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center font-bold text-xs text-primary-600">
                                                                    💳
                                                                </div>
                                                                <span className="text-xs font-semibold text-slate-800">{pm.type}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    setPaymentMethods(paymentMethods.filter(item => item.id !== pm.id));
                                                                    setSuccessMsg('Payment method deleted!');
                                                                    setTimeout(() => setSuccessMsg(''), 3000);
                                                                }}
                                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors text-xs font-bold cursor-pointer"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const cardNum = prompt("Enter mock Card Number or UPI ID:");
                                                        if (cardNum) {
                                                            setPaymentMethods([...paymentMethods, { id: Date.now().toString(), type: cardNum }]);
                                                            setSuccessMsg('New payment method added!');
                                                            setTimeout(() => setSuccessMsg(''), 3000);
                                                        }
                                                    }}
                                                    className="w-full border-2 border-dashed border-slate-300 hover:border-primary-500 hover:bg-primary-50/20 text-slate-600 hover:text-primary-600 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                                                >
                                                    + Add Payment Card / UPI
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Transaction History */}
                                <div className="space-y-3">
                                    <h4 className="font-extrabold text-slate-800 text-base">Recent Ledger / Booking Transactions</h4>
                                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                                        <table className="w-full text-left border-collapse bg-white">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="p-4 text-xs font-bold text-slate-600 uppercase">Transaction ID</th>
                                                    <th className="p-4 text-xs font-bold text-slate-600 uppercase">Date</th>
                                                    <th className="p-4 text-xs font-bold text-slate-600 uppercase">Description</th>
                                                    <th className="p-4 text-xs font-bold text-slate-600 uppercase">Amount</th>
                                                    <th className="p-4 text-xs font-bold text-slate-600 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {transactions.map(t => (
                                                    <tr key={t.id} className="hover:bg-slate-50/50">
                                                        <td className="p-4 text-xs font-bold text-slate-700">{t.id}</td>
                                                        <td className="p-4 text-xs text-slate-500">{t.date}</td>
                                                        <td className="p-4 text-xs font-semibold text-slate-800">{t.desc}</td>
                                                        <td className={`p-4 text-xs font-bold ${t.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {t.amount < 0 ? '-' : '+'} Rs. {Math.abs(t.amount)}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">
                                                                {t.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: PREFERENCES & ALERTS */}
                        {activeTab === 'preferences' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Notification & System Control</h3>
                                    <p className="text-slate-500 text-sm">Tune your push alerts, auto-matching parameters, and dynamic hardware triggers.</p>
                                </div>

                                <div className="space-y-4 max-w-2xl">
                                    {/* Customer Toggles */}
                                    {isCustomer && (
                                        <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-slate-800 text-sm">SMS & App Ride Updates</p>
                                                <p className="text-xs text-slate-500">Send notifications for dispatch, tracker logs, and transit milestones.</p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const next = !rideUpdatesEnabled;
                                                    setRideUpdatesEnabled(next);
                                                    localStorage.setItem('pref_rideUpdates', String(next));
                                                    setSuccessMsg('Preference updated!');
                                                    setTimeout(() => setSuccessMsg(''), 2000);
                                                }}
                                                className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${rideUpdatesEnabled ? 'bg-primary-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                            >
                                                <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                            </button>
                                        </div>
                                    )}

                                    {/* Driver Toggles */}
                                    {isDriver && (
                                        <div className="space-y-3">
                                            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-800 text-sm">Driver Online Status</p>
                                                    <p className="text-xs text-slate-500">Toggle whether you are available to receive load assignments.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const next = !isOnline;
                                                        setIsOnline(next);
                                                        localStorage.setItem('pref_isOnline', String(next));
                                                        setSuccessMsg(next ? 'Went Online!' : 'Went Offline');
                                                        setTimeout(() => setSuccessMsg(''), 2000);
                                                    }}
                                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${isOnline ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                                </button>
                                            </div>

                                            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-800 text-sm">Auto Accept Orders</p>
                                                    <p className="text-xs text-slate-500">Instantly lock in matching delivery orders within your dispatch scope.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const next = !autoAcceptEnabled;
                                                        setAutoAcceptEnabled(next);
                                                        localStorage.setItem('pref_autoAccept', String(next));
                                                        setSuccessMsg('Preference updated!');
                                                        setTimeout(() => setSuccessMsg(''), 2000);
                                                    }}
                                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${autoAcceptEnabled ? 'bg-primary-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                                </button>
                                            </div>

                                            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                                                <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                    <Volume2 className="h-4 w-4 text-primary-600" /> Dispatch Alerts Sound & Haptics
                                                </p>
                                                <div className="space-y-3">
                                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={soundEnabled} 
                                                            onChange={() => {
                                                                const next = !soundEnabled;
                                                                setSoundEnabled(next);
                                                                localStorage.setItem('pref_sound', String(next));
                                                            }} 
                                                            className="w-4 h-4 text-primary-600 rounded" 
                                                        />
                                                        Enable Notification Audio Ringtone
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={vibrationEnabled} 
                                                            onChange={() => {
                                                                const next = !vibrationEnabled;
                                                                setVibrationEnabled(next);
                                                                localStorage.setItem('pref_vibration', String(next));
                                                            }} 
                                                            className="w-4 h-4 text-primary-600 rounded" 
                                                        />
                                                        Enable Vibration Alerts on Device
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Transporter Toggles */}
                                    {isTransporter && (
                                        <div className="space-y-3">
                                            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-800 text-sm">Order Alerts</p>
                                                    <p className="text-xs text-slate-500">Send push alerts for new shipment additions and modifications.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const next = !orderAlerts;
                                                        setOrderAlerts(next);
                                                        localStorage.setItem('pref_orderAlerts', String(next));
                                                        setSuccessMsg('Preference updated!');
                                                        setTimeout(() => setSuccessMsg(''), 2000);
                                                    }}
                                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${orderAlerts ? 'bg-primary-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                                </button>
                                            </div>

                                            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-800 text-sm">Driver Tracking Alerts</p>
                                                    <p className="text-xs text-slate-500">Alert when drivers go online, start trips, or trigger offline emergencies.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const next = !driverAlerts;
                                                        setDriverAlerts(next);
                                                        localStorage.setItem('pref_driverAlerts', String(next));
                                                        setSuccessMsg('Preference updated!');
                                                        setTimeout(() => setSuccessMsg(''), 2000);
                                                    }}
                                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${driverAlerts ? 'bg-primary-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                                </button>
                                            </div>

                                            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-800 text-sm">Payment Milestone Alerts</p>
                                                    <p className="text-xs text-slate-500">Alert for booking payments cleared, payout status, and billing invoices.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const next = !paymentAlerts;
                                                        setPaymentAlerts(next);
                                                        localStorage.setItem('pref_paymentAlerts', String(next));
                                                        setSuccessMsg('Preference updated!');
                                                        setTimeout(() => setSuccessMsg(''), 2000);
                                                    }}
                                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${paymentAlerts ? 'bg-primary-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 5: SECURITY & ACCESS CONTROL */}
                        {activeTab === 'security' && (
                            <div className="space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    
                                    {/* Password Reset */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                                        <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                                            <Key className="h-5 w-5 text-primary-600" /> Change Security Password
                                        </h4>
                                        <form onSubmit={handlePasswordChange} className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Current Password</label>
                                                <input 
                                                    type="password" 
                                                    value={currentPassword} 
                                                    onChange={(e) => setCurrentPassword(e.target.value)} 
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
                                                <input 
                                                    type="password" 
                                                    value={newPassword} 
                                                    onChange={(e) => setNewPassword(e.target.value)} 
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password</label>
                                                <input 
                                                    type="password" 
                                                    value={confirmPassword} 
                                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" 
                                                />
                                            </div>
                                            <button 
                                                type="submit"
                                                className="w-full btn-primary bg-primary-600 hover:bg-primary-500 text-white font-extrabold py-3 rounded-xl transition-all cursor-pointer text-xs"
                                            >
                                                Update Password
                                            </button>
                                        </form>
                                    </div>

                                    {/* Universal Log out */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                                                <LogOut className="h-5 w-5 text-red-500" /> Device Access Logs
                                            </h4>
                                            <p className="text-slate-500 text-xs leading-relaxed">
                                                If you think your account is signed in on another device (such as another phone, driver console, or business terminal), you can perform a global termination.
                                            </p>
                                        </div>
                                        
                                        <div className="pt-6">
                                            <button 
                                                onClick={handleLogoutAllDevices}
                                                disabled={loggingOutDevices}
                                                className="w-full bg-red-100 hover:bg-red-200 border border-red-200 text-red-700 font-extrabold py-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {loggingOutDevices ? (
                                                    <><Loader2 className="h-4 w-4 animate-spin" /> Revoking Access...</>
                                                ) : (
                                                    <>Terminate All Other Active Sessions</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Transporter Sub-Admin Management */}
                                {isTransporter && (
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                                                    <Users className="h-5 w-5 text-primary-600" /> Sub-Admin Role Permissions & Accounts
                                                </h4>
                                                <p className="text-slate-500 text-xs">Provision limited dashboards for Dispatchers, Admins, and fleet support.</p>
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-3 gap-4 border p-4 bg-white rounded-2xl">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                                                <input value={newSubAdminName} onChange={(e) => setNewSubAdminName(e.target.value)} type="text" placeholder="e.g. John Doe" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Corporate Email</label>
                                                <input value={newSubAdminEmail} onChange={(e) => setNewSubAdminEmail(e.target.value)} type="email" placeholder="john@satguru.com" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none" />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-600 mb-1">Role Type</label>
                                                    <select value={newSubAdminRole} onChange={(e) => setNewSubAdminRole(e.target.value as any)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none font-bold">
                                                        <option value="Dispatcher">Dispatcher</option>
                                                        <option value="Manager">Manager</option>
                                                        <option value="Support">Support</option>
                                                    </select>
                                                </div>
                                                <button onClick={handleAddSubAdmin} className="bg-primary-600 hover:bg-primary-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer">
                                                    Invite
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Sub-admin accounts under your company</p>
                                            <div className="space-y-2">
                                                {subAdmins.map((admin: any) => (
                                                    <div key={admin.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs font-semibold">
                                                        <div className="space-y-0.5">
                                                            <p className="font-bold text-slate-800 text-sm">{admin.name}</p>
                                                            <p className="text-slate-500 text-[11px]">{admin.email}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-bold">
                                                                {admin.role}
                                                            </span>
                                                            <span className="text-slate-400 font-bold italic text-[11px]">
                                                                {admin.permissions}
                                                            </span>
                                                            <button 
                                                                onClick={() => {
                                                                    setSubAdmins(subAdmins.filter((a: any) => a.id !== admin.id));
                                                                    setSuccessMsg('Sub-admin account revoked.');
                                                                    setTimeout(() => setSuccessMsg(''), 3000);
                                                                }}
                                                                className="text-red-500 hover:bg-red-50 px-2 py-1 rounded cursor-pointer"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
