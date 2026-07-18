import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import {
    Users,
    Truck,
    Plus,
    LayoutDashboard,
    LogOut,
    Search,
    Clock,
    MoreVertical,
    FileText,
    Settings,
    Package,
    DollarSign,
    Menu,
    Trash2,
    UserCheck,
    UserX,
    X,
    Loader2,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import VehicleModal from '../../components/VehicleModal';
import DriverModal from '../../components/DriverModal';
import LiveFleetMap from '../../components/LiveFleetMap';
import TransporterRideRequests from '../../components/TransporterRideRequests';
import TransporterReports from '../../components/TransporterReports';
import TransporterFinance from '../../components/TransporterFinance';
import ProfilePage from '../ProfilePage';
import ChatPanel from '../../components/ChatPanel';

type TransporterSummary = {
    totalFleet: number;
    activeDrivers: number;
    ongoingTrips: number;
    pendingApprovals: number;
    totalRides: number;
    totalEarnings: number;
    todaysEarnings: number;
    todaysShipments: number;
    activeShipments: number;
    onlineDrivers: number;
    offlineDrivers: number;
    pendingDriverRequests: number;
};

const emptySummary: TransporterSummary = {
    totalFleet: 0,
    activeDrivers: 0,
    ongoingTrips: 0,
    pendingApprovals: 0,
    totalRides: 0,
    totalEarnings: 0,
    todaysEarnings: 0,
    todaysShipments: 0,
    activeShipments: 0,
    onlineDrivers: 0,
    offlineDrivers: 0,
    pendingDriverRequests: 0,
};

type FleetRow = {
    vehicleId: string;
    vehicleNumber?: string;
    vehicleName?: string;
    vehicleTypeName?: string;
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
    rideStatus?: string;
    routeSummary?: string;
    vehicleCompletedRides?: number;
    vehicleEarnings?: number;
    driverCompletedRides?: number;
    driverEarnings?: number;
    latitude?: number;
    longitude?: number;
    liveUpdatedAt?: string;
    liveStatus?: string;
    goodsType?: string;
    estimatedFare?: number;
    dailyEarnings?: number;
};

const TransporterDashboard = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'vehicles' | 'requests' | 'reports' | 'finance' | 'settings'>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [fleetSummary, setFleetSummary] = useState<TransporterSummary>(emptySummary);
    const [fleetRows, setFleetRows] = useState<FleetRow[]>([]);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [isLoadingFleet, setIsLoadingFleet] = useState(false);
    const [chatBookingId, setChatBookingId] = useState<number | null>(null);
    const [directChatRoomName, setDirectChatRoomName] = useState<string | null>(null);
    const lastSeenNotifIdsRef = useRef<Set<string>>(new Set());
    const [chatToast, setChatToast] = useState<{
        id: string;
        bookingId?: number;
        roomName?: string;
        senderName: string;
        messageText: string;
    } | null>(null);
    const [activeRequestModal, setActiveRequestModal] = useState<any>(null);
    const [modalStage, setModalStage] = useState<'idle' | 'select_driver' | 'sending' | 'waiting' | 'accepted'>('idle');
    const [selectedDriverForAssign, setSelectedDriverForAssign] = useState<string>('');
    const [dismissedBookingIds, setDismissedBookingIds] = useState<Record<number, boolean>>({});
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [assigningDriver, setAssigningDriver] = useState(false);
    const [isReverseAssignModalOpen, setIsReverseAssignModalOpen] = useState(false);
    const [selectedDriverForReverseAssign, setSelectedDriverForReverseAssign] = useState<any>(null);
    const [assigningVehicle, setAssigningVehicle] = useState(false);
    const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
    const [selectedVehicleForActions, setSelectedVehicleForActions] = useState<any>(null);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<any>(null);
    const [sosAlert, setSosAlert] = useState<{ driverName: string, id: number } | null>(null);
    const [driverAcceptAlert, setDriverAcceptAlert] = useState<{ driverName: string, bookingId: number, route: string, fare: number, id: number } | null>(null);
    const [rideRequests, setRideRequests] = useState<any[]>([]);
    const [relationshipRequests, setRelationshipRequests] = useState<any[]>([]);
    const [outboundInvitations, setOutboundInvitations] = useState<any[]>([]);

    const formatCurrency = (value: number = 0) => `₹ ${Number(value).toLocaleString('en-IN')}`;

    useEffect(() => {
        if (!activeRequestModal || modalStage !== 'waiting') return;

        const intervalId = setInterval(async () => {
            try {
                const res = await apiClient.get(`/Vehicle/shipmentDetail/${activeRequestModal.id}`);
                const booking = res.data ?? {};
                // If cT_BookingStatus is 2 (DriverAssigned), 3 (DriverArriving), 4 (RideStarted) or 5 (RideCompleted)
                const status = booking.cT_BookingStatus ?? booking.CT_BookingStatus;
                if (status >= 2 && status <= 5) {
                    clearInterval(intervalId);
                    setModalStage('accepted');
                }
            } catch (err) {
                console.error("Error polling booking status during assignment waiting:", err);
            }
        }, 2500);

        return () => clearInterval(intervalId);
    }, [activeRequestModal, modalStage]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        const userId = currentUser?.userId || currentUser?.UserId;
        if (!userId) return;

        try {
            const [summaryRes, fleetRes, requestsRes] = await Promise.all([
                apiClient.get('/Transport/getDashboardSummary', { params: { userId } }),
                apiClient.get('/Transport/getFleetOverview', { params: { userId } }),
                apiClient.get('/Vehicle/transporterRideRequests/' + userId).catch(() => ({ data: [] }))
            ]);

            const incoming = Array.isArray(requestsRes.data) ? requestsRes.data : [];
            setRideRequests(incoming);
            if (incoming.length > 0 && !activeRequestModal) {
                const unclaimed = incoming.find((r: any) => !dismissedBookingIds[r.id]);
                if (unclaimed) {
                    setActiveRequestModal(unclaimed);
                    setModalStage('idle');
                }
            }
            const summaryPayload = summaryRes.data ?? {};
            setFleetSummary({
                totalFleet: summaryPayload.TotalFleet ?? summaryPayload.totalFleet ?? 0,
                activeDrivers: summaryPayload.ActiveDrivers ?? summaryPayload.activeDrivers ?? 0,
                ongoingTrips: summaryPayload.OngoingTrips ?? summaryPayload.ongoingTrips ?? 0,
                pendingApprovals: summaryPayload.PendingApprovals ?? summaryPayload.pendingApprovals ?? 0,
                totalRides: summaryPayload.TotalRides ?? summaryPayload.totalRides ?? 0,
                totalEarnings: summaryPayload.TotalEarnings ?? summaryPayload.totalEarnings ?? 0,
                todaysEarnings: summaryPayload.TodaysEarnings ?? summaryPayload.todaysEarnings ?? 0,
                todaysShipments: summaryPayload.TodaysShipments ?? summaryPayload.todaysShipments ?? 0,
                activeShipments: summaryPayload.ActiveShipments ?? summaryPayload.activeShipments ?? 0,
                onlineDrivers: summaryPayload.OnlineDrivers ?? summaryPayload.onlineDrivers ?? 0,
                offlineDrivers: summaryPayload.OfflineDrivers ?? summaryPayload.offlineDrivers ?? 0,
                pendingDriverRequests: summaryPayload.PendingDriverRequests ?? summaryPayload.pendingDriverRequests ?? 0,
            });

            const rawFleet = Array.isArray(fleetRes.data) ? fleetRes.data : [];
            setFleetRows(
                rawFleet.map((item: any) => ({
                    vehicleId: item.vehicleId ?? item.VehicleId ?? '',
                    vehicleNumber: item.vehicleNumber ?? item.VehicleNumber,
                    vehicleName: item.vehicleName ?? item.VehicleName,
                    vehicleTypeName: item.vehicleTypeName ?? item.VehicleTypeName,
                    driverId: item.driverId ?? item.DriverId,
                    driverName: item.driverName ?? item.DriverName,
                    driverPhone: item.driverPhone ?? item.DriverPhone,
                    rideStatus: item.rideStatus ?? item.RideStatus,
                    routeSummary: item.routeSummary ?? item.RouteSummary,
                    activeBookingId: item.activeBookingId ?? item.ActiveBookingId,
                    vehicleCompletedRides: item.vehicleCompletedRides ?? item.VehicleCompletedRides ?? 0,
                    vehicleEarnings: item.vehicleEarnings ?? item.VehicleEarnings ?? 0,
                    driverCompletedRides: item.driverCompletedRides ?? item.DriverCompletedRides ?? 0,
                    driverEarnings: item.driverEarnings ?? item.DriverEarnings ?? 0,
                    latitude: item.latitude ?? item.Latitude,
                    longitude: item.longitude ?? item.Longitude,
                    liveUpdatedAt: item.liveUpdatedAt ?? item.LiveUpdatedAt,
                    liveStatus: item.liveStatus ?? item.LiveStatus,
                    goodsType: item.goodsType ?? item.GoodsType,
                    estimatedFare: item.estimatedFare ?? item.EstimatedFare,
                    dailyEarnings: item.dailyEarnings ?? item.DailyEarnings ?? 0,
                }))
            );
        } catch (err) {
            console.error('Error fetching transporter dashboard data:', err);
        }
    }, [currentUser, activeRequestModal, dismissedBookingIds]);

    const fetchFleetLists = useCallback(async () => {
        const userId = currentUser?.userId || currentUser?.UserId;
        if (!userId) return;

        setIsLoadingFleet(true);
        try {
            const [driversRes, vehiclesRes] = await Promise.all([
                apiClient.get('/Transport/getDriversList', { params: { userId } }),
                apiClient.get('/Transport/getVehiclesList', { params: { userId } }),
            ]);
            setDrivers(Array.isArray(driversRes.data) ? driversRes.data : []);
            setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
        } catch (err) {
            console.error('Error fetching fleet lists:', err);
        } finally {
            setIsLoadingFleet(false);
        }
    }, [currentUser]);

    const handleDeleteDriver = async (driverId: string) => {
        if (!window.confirm("Are you sure you want to remove this driver from your fleet?")) {
            return;
        }
        try {
            await apiClient.post('/User/deleteAccount', JSON.stringify(driverId), {
                headers: { 'Content-Type': 'application/json' }
            });
            fetchFleetLists();
            fetchDashboardData();
        } catch (err) {
            console.error("Failed to delete driver:", err);
            alert("Failed to remove driver. Please try again.");
        }
    };

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!window.confirm("Are you sure you want to delete this vehicle?")) {
            return;
        }
        try {
            await apiClient.get(`/Vehicle/deletevehicle/${vehicleId}/true`);
            fetchFleetLists();
            fetchDashboardData();
        } catch (err) {
            console.error("Failed to delete vehicle:", err);
            alert("Failed to delete vehicle. Please try again.");
        }
    };

    const handleUnassignDriver = async (activeBookingId: number) => {
        if (!window.confirm("Are you sure you want to unassign this driver? This will cancel their active assignment.")) {
            return;
        }
        try {
            await apiClient.patch(`/Vehicle/${activeBookingId}/rideStatus`, null, {
                params: { status: 'cancelled' }
            });
            alert("Driver unassigned successfully!");
            fetchDashboardData();
            fetchFleetLists();
        } catch (err) {
            console.error("Failed to unassign driver:", err);
            alert("Failed to unassign driver. Please try again.");
        }
    };

    const fetchRelationshipNotifications = useCallback(async () => {
        const userId = currentUser?.userId || currentUser?.UserId;
        if (!userId) return;
        try {
            const [inboundRes, outboundRes] = await Promise.all([
                apiClient.get(`/Transport/getRelationshipNotifications?userId=${userId}`),
                apiClient.get(`/Transport/getTransporterOutboundInvitations?userId=${userId}`).catch(() => ({ data: [] }))
            ]);
            
            const newNotifications = Array.isArray(inboundRes.data) ? inboundRes.data : [];
            newNotifications.forEach((n: any) => {
                if (!lastSeenNotifIdsRef.current.has(n.id) && lastSeenNotifIdsRef.current.size > 0) {
                    if (n.message && (n.message.startsWith('CHAT_MESSAGE|') || n.message.startsWith('CHAT_MESSAGE_DIRECT|'))) {
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                            audio.volume = 0.6;
                            audio.play().catch(() => {});
                        } catch (e) {}

                        const parts = n.message.split('|');
                        const senderAndText = parts[2] || '';
                        const msgParts = senderAndText.split(':');
                        const senderName = msgParts[0] || 'User';
                        const messageText = msgParts.slice(1).join(':') || '';

                        if (n.message.startsWith('CHAT_MESSAGE|')) {
                            const bookingId = Number(parts[1]);
                            setChatToast({
                                id: n.id,
                                bookingId,
                                senderName,
                                messageText
                            });
                        } else {
                            const roomName = parts[1];
                            setChatToast({
                                id: n.id,
                                roomName,
                                senderName,
                                messageText
                            });
                        }
                    }
                }
            });

            lastSeenNotifIdsRef.current = new Set(newNotifications.map((n: any) => n.id));
            setRelationshipRequests(newNotifications);
            setOutboundInvitations(Array.isArray(outboundRes.data) ? outboundRes.data : []);
        } catch (err) {
            console.error("Failed to fetch relationship notifications:", err);
        }
    }, [currentUser]);



    const handleAcceptRelationship = async (notifId: string) => {
        try {
            await apiClient.post(`/Transport/acceptRequest?notificationId=${notifId}`);
            alert("Request accepted successfully!");
            fetchRelationshipNotifications();
            fetchFleetLists();
            fetchDashboardData();
        } catch (err: any) {
            alert(err?.response?.data || "Failed to accept request.");
        }
    };

    const handleRejectRelationship = async (notifId: string) => {
        try {
            await apiClient.post(`/Transport/rejectRequest?notificationId=${notifId}`);
            alert("Request declined.");
            fetchRelationshipNotifications();
        } catch (err: any) {
            alert(err?.response?.data || "Failed to reject request.");
        }
    };

    const handleApproveLeave = async (notifId: string) => {
        if (!window.confirm("Are you sure you want to approve this leave request and release the driver?")) {
            return;
        }
        try {
            await apiClient.post(`/Transport/approveLeaveRequest?notificationId=${notifId}`);
            alert("Leave request approved. Driver has been released.");
            fetchRelationshipNotifications();
            fetchFleetLists();
            fetchDashboardData();
        } catch (err: any) {
            alert(err?.response?.data || "Failed to approve release.");
        }
    };

    const handleRemoveDriver = async (driverGuid: string) => {
        if (!window.confirm("Are you sure you want to remove this driver from your fleet relationship?")) {
            return;
        }
        try {
            const userId = currentUser?.userId || currentUser?.UserId;
            await apiClient.post(`/Transport/removeDriver?transporterUserId=${userId}&driverId=${driverGuid}`);
            alert("Driver relationship removed successfully.");
            fetchFleetLists();
            fetchDashboardData();
        } catch (err) {
            console.error("Failed to remove driver:", err);
            alert("Failed to remove driver relationship.");
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchDashboardData();
            fetchFleetLists();
            fetchRelationshipNotifications();
        }
    }, [currentUser, fetchDashboardData, fetchFleetLists, fetchRelationshipNotifications]);

    useEffect(() => {
        const userId = currentUser?.userId || currentUser?.UserId;
        if (!userId) return;

        const connection = new HubConnectionBuilder()
            .withUrl(`${apiClient.defaults.baseURL?.replace('/api', '')}/hubs/location`)
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        connection.start()
            .then(() => {
                console.log('Connected to fleet location hub');
                connection.invoke('JoinTransporter', userId);
            })
            .catch(err => console.error('SignalR Connection Error: ', err));

        connection.on('fleetLocationUpdated', (tracking: any) => {
            setFleetRows(prevRows => prevRows.map(row => 
                row.vehicleId === tracking.vehicleId || row.vehicleId === tracking.VehicleId
                    ? { ...row, latitude: tracking.latitude || tracking.Latitude, longitude: tracking.longitude || tracking.Longitude, liveUpdatedAt: new Date().toISOString() }
                    : row
            ));
        });

        return () => {
            if (connection) {
                connection.invoke('LeaveTransporter', userId).then(() => connection.stop()).catch(() => connection.stop());
            }
        };
    }, [currentUser]);

    useEffect(() => {
        const userId = currentUser?.userId || currentUser?.UserId;
        if (!userId) return;

        fetchRelationshipNotifications();
        fetchFleetLists();
        fetchDashboardData();
        const intervalId = setInterval(() => {
            fetchRelationshipNotifications();
            fetchFleetLists();
            fetchDashboardData();
        }, 5000);
        return () => clearInterval(intervalId);
    }, [currentUser, fetchRelationshipNotifications, fetchFleetLists, fetchDashboardData]);

    useEffect(() => {
        const sosNotif = relationshipRequests.find(n => n.message && n.message.startsWith('SOS|'));
        if (sosNotif) {
            const driverName = sosNotif.message.split('|')[1];
            setSosAlert({ driverName, id: sosNotif.id });
        } else {
            setSosAlert(null);
        }
    }, [relationshipRequests]);

    useEffect(() => {
        const acceptNotif = relationshipRequests.find(n => n.message && n.message.startsWith('DRIVER_ACCEPT_ORDER|'));
        if (acceptNotif) {
            const parts = acceptNotif.message.split('|');
            const bookingId = Number(parts[1]);
            const driverName = parts[2];
            const route = parts[3];
            const fare = Number(parts[4] || 0);
            setDriverAcceptAlert({ driverName, bookingId, route, fare, id: acceptNotif.id });
        } else {
            setDriverAcceptAlert(null);
        }
    }, [relationshipRequests]);

    const liveVehiclesReporting = useMemo(
        () => fleetRows.filter((row) => typeof row.latitude === 'number' && typeof row.longitude === 'number').length,
        [fleetRows]
    );

    const assignedDriversCount = useMemo(
        () => fleetRows.filter((row) => row.driverName && row.driverName !== 'Unassigned').length,
        [fleetRows]
    );

    const latestLivePing = useMemo<Date | null>(() => {
        let latest: Date | null = null;
        fleetRows.forEach((row) => {
            if (!row.liveUpdatedAt) return;
            const parsed = new Date(row.liveUpdatedAt);
            if (isNaN(parsed.getTime())) return;
            if (latest === null || parsed > latest) {
                latest = parsed;
            }
        });
        return latest;
    }, [fleetRows]);

    const lastPingLabel = latestLivePing
        ? latestLivePing.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
        : 'No live ping yet';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const stats = [
        { label: "Today's Earning", value: formatCurrency(fleetSummary.todaysEarnings), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: "Today's Shipment", value: fleetSummary.todaysShipments, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'Active Shipment', value: fleetSummary.activeShipments, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        { label: 'Online Drivers', value: fleetSummary.onlineDrivers, icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
        { label: 'Offline Drivers', value: fleetSummary.offlineDrivers, icon: UserX, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
        { label: 'Pending Driver Requests', value: fleetSummary.pendingDriverRequests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    ];

    const getStatusStyles = (status?: string) => {
        const s = (status || 'Available').toLowerCase();
        if (s.includes('trip') || s.includes('started') || s.includes('arriving') || s.includes('progress')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s.includes('transit') || s.includes('assigned')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (s.includes('maintenance')) return 'bg-orange-50 text-orange-700 border-orange-200';
        if (s.includes('cancel') || s.includes('reject')) return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-slate-100 text-slate-700 border-slate-300';
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div 
                    onClick={() => setSidebarOpen(false)} 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden" 
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:relative inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-100 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <Truck className="text-white h-5 w-5" />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Navgatix</span>
                    </div>
                    {/* Mobile Close Button */}
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Menu</p>
                    <nav className="space-y-2">
                        {[
                            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                            { id: 'drivers', label: 'Manage Drivers', icon: Users },
                            { id: 'vehicles', label: 'Vehicle Fleet', icon: Truck },
                            { id: 'requests', label: 'Ride Requests', icon: Package },
                            { id: 'reports', label: 'Reports', icon: FileText },
                            { id: 'finance', label: 'Finance', icon: DollarSign },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-primary-600' : ''}`} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-100">
                    <nav className="space-y-1 mb-6">
                        <button 
                            onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${activeTab === 'settings' ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Settings className={`h-5 w-5 ${activeTab === 'settings' ? 'text-primary-600' : ''}`} />
                                <span className="text-sm">Settings</span>
                            </div>
                            <span className="text-xs transition-transform duration-200" style={{ transform: settingsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                ▼
                            </span>
                        </button>
                        
                        {settingsDropdownOpen && (
                            <div className="pl-4 pr-2 py-1.5 space-y-1 bg-slate-50 rounded-xl mt-1 transition-all border border-slate-100">
                                {[
                                    { id: 'profile', label: '👤 Profile Info' },
                                    { id: 'payments', label: '💳 Wallet & Payments' },
                                    { id: 'preferences', label: '🔔 Preferences & Alerts' },
                                    { id: 'security', label: '🔒 Security & Access' }
                                ].map((subItem) => (
                                    <button
                                        key={subItem.id}
                                        onClick={() => {
                                            setSearchParams({ tab: subItem.id });
                                            setActiveTab('settings');
                                            setSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-center text-left py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'settings' && searchParams.get('tab') === subItem.id ? 'bg-primary-500 text-white font-bold' : 'text-slate-600 hover:text-primary-600 hover:bg-white'}`}
                                    >
                                        {subItem.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </nav>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                            SL
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.company || currentUser?.firstName || 'Satguru Logistics'}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser?.roleName || 'Admin Account'}</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10 flex flex-col bg-slate-50">
                {activeTab === 'overview' && (
                    <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 text-white z-0">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c159bf?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                    </div>
                )}

                {/* Mobile Header Bar */}
                <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Menu className="h-6 w-6 text-white" />
                    </button>
                    <span className="font-extrabold tracking-tight">Navgatix</span>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 text-sm">
                        SL
                    </div>
                </header>

                <div className={`flex-1 overflow-y-auto relative max-w-7xl w-full mx-auto ${activeTab === 'settings' ? 'pt-0 px-3 pb-8 md:p-8' : 'p-6 md:p-8'}`}>

                    <div className="relative z-10">
                    {activeTab === 'overview' && (
                        <>
                            <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-4">
                                <div className="text-white">
                                    <p className="text-indigo-200 font-medium tracking-wide text-xs md:text-sm mb-1 uppercase">{activeTab}</p>
                                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hii, {currentUser?.firstName || currentUser?.company || 'Satguru Logistics'}</h1>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button onClick={() => setIsDriverModalOpen(true)} className="flex-1 md:flex-initial bg-white text-slate-900 hover:bg-slate-50 px-4 py-2.5 rounded-lg border border-white/20 font-semibold shadow-lg text-sm flex items-center justify-center gap-2 transition-colors">
                                        <Plus className="h-4 w-4" />
                                        Add Driver
                                    </button>
                                    <button 
                                        onClick={() => setIsVehicleModalOpen(true)}
                                        className="flex-1 md:flex-initial bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary-600/30 text-sm flex items-center justify-center gap-2 transition-colors border border-primary-500"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New Vehicle
                                    </button>
                                </div>
                            </header>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
                                {stats.map((stat, i) => (
                                    <div key={i} className={`premium-card p-6 flex items-start justify-between border-b-4 ${stat.border} bg-white rounded-2xl shadow-sm`}>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500 mb-1">{stat.label}</p>
                                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                                        </div>
                                        <div className={`${stat.bg} ${stat.color} p-3.5 rounded-2xl`}>
                                            <stat.icon className="h-6 w-6" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'overview' && (
                        <>
                            {/* Map & Live Signals */}
                            <div className="grid gap-6 lg:grid-cols-[2fr,1fr] mb-8">
                                <div className="premium-card p-6 bg-white shadow-sm border border-slate-100 rounded-2xl">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Live Fleet Map</h3>
                                            <p className="text-sm text-slate-500">Real-time coordinates from active vehicles.</p>
                                        </div>
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider">{liveVehiclesReporting} Live</span>
                                    </div>
                                    <div className="h-[400px] rounded-xl overflow-hidden border border-slate-200">
                                        <LiveFleetMap vehicles={fleetRows} />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="premium-card p-6 bg-white shadow-sm border border-slate-100 rounded-2xl">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-indigo-600" />
                                            Signals
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                <span className="text-sm text-slate-500">Drivers Assigned</span>
                                                <span className="font-bold text-slate-900">{assignedDriversCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl text-emerald-700">
                                                <span className="text-sm">Last Ping</span>
                                                <span className="font-bold">{lastPingLabel}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="premium-card p-6 bg-white shadow-sm border border-slate-100 rounded-2xl">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Financial Summary</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total Earnings</p>
                                                <p className="text-2xl font-black text-slate-900">{formatCurrency(fleetSummary.totalEarnings)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Resolved Rides</p>
                                                <p className="text-2xl font-black text-slate-900">{fleetSummary.totalRides}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Operations Table */}
                            <div className="premium-card overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-slate-900">Current Fleet Operations</h2>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                        <input type="text" placeholder="Filter fleet..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64" />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                                            <tr>
                                                <th className="px-6 py-4">Vehicle</th>
                                                <th className="px-6 py-4">Driver</th>
                                                <th className="px-6 py-4">Route</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Earnings (Today/Total)</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {fleetRows.length > 0 ? fleetRows.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-900">{row.vehicleNumber}</td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{row.driverName || 'Unassigned'}</p>
                                                            {row.driverName !== 'Unassigned' && (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${row.liveStatus === 'Live' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                    <span className={`h-1.5 w-1.5 rounded-full ${row.liveStatus === 'Live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                                    {row.liveStatus === 'Live' ? 'Online' : 'Offline'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                                        {row.routeSummary && row.routeSummary !== 'Idle' ? (
                                                            <div className="space-y-0.5">
                                                                <p className="font-bold text-slate-800">{row.routeSummary}</p>
                                                                {row.goodsType && <p className="text-[11px] text-slate-400">Goods: {row.goodsType}</p>}
                                                                <p className="text-xs font-extrabold text-emerald-600">Fare: Rs. {row.estimatedFare || 0}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="italic text-slate-400 text-xs">No Active Load</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyles(row.rideStatus)}`}>
                                                            {row.rideStatus || 'Available'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                                                        {row.driverName !== 'Unassigned' ? (
                                                            <div>
                                                                <p className="text-emerald-600 font-extrabold text-xs">Rs. {row.dailyEarnings || 0} <span className="text-[9px] text-slate-400 font-normal uppercase">Today</span></p>
                                                                <p className="text-slate-400 text-[10px] font-normal">Total: Rs. {row.driverEarnings || 0}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-normal text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedVehicleForActions(row);
                                                                setIsActionsModalOpen(true);
                                                            }}
                                                            className="text-slate-400 hover:text-primary-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                                                        >
                                                            <MoreVertical className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">No vehicles in fleet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'drivers' && (
                        <div className="space-y-6">
                            {/* Fleet Join & Release Requests Card (Full Width) */}
                            <div className="premium-card p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-base font-bold text-slate-900 mb-2">Fleet Join & Release Requests</h3>
                                <p className="text-xs text-slate-500 mb-4">Respond to drivers wanting to join or release from your transporter fleet.</p>
                                <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                                    {relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|')).length === 0 ? (
                                        <p className="text-center text-slate-400 italic text-xs py-2">No active join or release requests.</p>
                                    ) : (
                                        relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|')).map((req) => {
                                            const parts = req.message.split('|');
                                            const type = parts[0];
                                            const driverName = parts[3] || 'Driver';
                                            const driverEmail = parts[2] || '';

                                            return (
                                                <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <p className="font-bold text-slate-900 truncate">{driverName}</p>
                                                        <p className="text-slate-500 text-[10px] truncate">
                                                            {type === 'JOIN' ? 'wants to join your fleet' : 'wants to leave your fleet'} • {driverEmail}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1.5 flex-shrink-0">
                                                        {type === 'JOIN' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAcceptRelationship(req.id)}
                                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg font-bold cursor-pointer"
                                                                >
                                                                    Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectRelationship(req.id)}
                                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleApproveLeave(req.id)}
                                                                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                                                            >
                                                                Approve Release
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Pending Invitations list if any */}
                            {outboundInvitations.length > 0 && (
                                <div className="premium-card p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="text-base font-bold text-slate-900 mb-2">Pending Onboarding Invitations</h3>
                                    <p className="text-xs text-slate-500 mb-4">Drivers you added via "+ Add Driver" who haven't accepted their invite yet.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {outboundInvitations.map(req => {
                                            const parts = req.message.split('|');
                                            const driverEmail = parts[2];
                                            return (
                                                <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                                                    <span className="font-bold text-slate-800 truncate">{driverEmail}</span>
                                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-extrabold uppercase border border-amber-200">Awaiting Accept</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Main Drivers List Table */}
                            <div className="premium-card overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Manage Drivers</h2>
                                        <p className="text-sm text-slate-500">Onboard and monitor your dedicated driver team.</p>
                                    </div>
                                    <button onClick={() => setIsDriverModalOpen(true)} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                                        <Plus className="h-4 w-4" /> Add Driver
                                    </button>
                                </div>
                                <div className="overflow-x-auto text-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Driver Name</th>
                                                <th className="px-6 py-4">Phone</th>
                                                <th className="px-6 py-4">Rating</th>
                                                <th className="px-6 py-4">Assigned Vehicle</th>
                                                <th className="px-6 py-4">Live Status</th>
                                                <th className="px-6 py-4">Profile Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                                            {drivers.length > 0 ? drivers.map((d) => (
                                                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                                            {d.profilePic ? <img src={d.profilePic} alt="" className="w-full h-full object-cover" /> : <Users className="h-4 w-4 text-slate-400" />}
                                                        </div>
                                                        <span className="text-slate-900 font-bold">{d.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4">{d.phone || d.mobile || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-amber-500 font-bold">⭐ {d.driverRating ?? '5.0'}</td>
                                                    <td className="px-6 py-4 font-semibold text-slate-800">
                                                        {d.vehicleName ? `${d.vehicleName} (${d.vehicleNumber || ''})` : <span className="text-slate-400 italic text-xs">None</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-black border ${
                                                            d.rideStatus === 'On Ride' 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                                : d.rideStatus === 'Available' 
                                                                    ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {d.rideStatus || 'Offline'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black border ${d.profileStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                            {d.profileStatus || 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                                        {d.phone && (
                                                            <a 
                                                                href={`tel:${d.phone}`} 
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                                title="Call Driver"
                                                            >
                                                                📞 Call
                                                            </a>
                                                        )}
                                                        <div className="flex gap-1.5 items-center">
                                                            <button 
                                                                onClick={() => {
                                                                    const transporterUserId = currentUser?.userId || currentUser?.UserId || '';
                                                                    const driverUserId = d.userId || d.UserId || d.id || '';
                                                                    setDirectChatRoomName(`TransporterDriver_${transporterUserId}_${driverUserId}`);
                                                                }} 
                                                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-2 py-1.5 rounded-lg border border-teal-200 text-xs font-bold transition-colors cursor-pointer"
                                                                title="Chat with Driver"
                                                            >
                                                                💬 Chat
                                                            </button>
                                                            {d.activeBookingId ? (
                                                                <button
                                                                    onClick={() => handleUnassignDriver(d.activeBookingId)}
                                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                                                                    title="Unassign Vehicle"
                                                                >
                                                                    Unassign
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedDriverForReverseAssign(d);
                                                                        setIsReverseAssignModalOpen(true);
                                                                    }}
                                                                    className="text-indigo-650 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs font-bold transition-colors cursor-pointer bg-white text-indigo-600"
                                                                    title="Assign Vehicle"
                                                                >
                                                                    Assign Vehicle
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveDriver(d.id || d.Id)} 
                                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                                                            title="Remove from Fleet"
                                                        >
                                                            Remove
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteDriver(d.userId || d.UserId || d.id || d.Id)} 
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                                            title="Delete Driver"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                                        {isLoadingFleet ? 'Loading drivers...' : 'No drivers onboarded yet.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'vehicles' && (
                        <div className="premium-card overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Vehicle Fleet</h2>
                                    <p className="text-sm text-slate-500">Track and maintain your logistics assets.</p>
                                </div>
                                <button onClick={() => setIsVehicleModalOpen(true)} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> New Vehicle
                                </button>
                            </div>
                            <div className="overflow-x-auto text-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Vehicle No.</th>
                                            <th className="px-6 py-4">Model/Name</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Capacity</th>
                                            <th className="px-6 py-4">Availability</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                                        {vehicles.length > 0 ? vehicles.map((v) => (
                                            <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => setSelectedVehicleForDetail(v)}
                                                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left cursor-pointer"
                                                        title="Click to view details"
                                                    >
                                                        {v.vehicleNumber}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">{v.vehicleName}</td>
                                                <td className="px-6 py-4">{v.vehicleTypeName}</td>
                                                <td className="px-6 py-4">{v.capacityTons} Tons</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black border ${v.isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        {v.isAvailable ? 'Available' : 'Busy'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                                    <button 
                                                        onClick={() => setSelectedVehicleForDetail(v)} 
                                                        className="text-indigo-650 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                                                        title="View Vehicle Details"
                                                    >
                                                        Details
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteVehicle(v.id || v.Id)} 
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                                        title="Delete Vehicle"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                                    {isLoadingFleet ? 'Loading vehicles...' : 'No vehicles in fleet.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="premium-card p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 mb-6">Nearby Ride Requests</h2>
                            <TransporterRideRequests userId={currentUser?.userId || currentUser?.UserId} fleetRows={fleetRows} onAssignmentSuccess={() => { fetchDashboardData(); fetchFleetLists(); }} />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="premium-card p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 mb-6">Analytics & Activity Reports</h2>
                            <TransporterReports userId={currentUser?.userId || currentUser?.UserId} />
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="p-2">
                            <TransporterFinance userId={currentUser?.userId || currentUser?.UserId} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="pb-20">
                            <ProfilePage />
                        </div>
                    )}
                </div>
            </div>
        </main>

            <DriverModal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} onSuccess={() => { fetchDashboardData(); fetchFleetLists(); }} transporterId={currentUser?.userId || currentUser?.id || ''} />
            <VehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} onSuccess={() => { fetchDashboardData(); fetchFleetLists(); }} userId={currentUser?.userId || currentUser?.id || ''} />

            {/* Assign Driver Modal */}
            {isAssignModalOpen && selectedVehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Assign Driver</h3>
                                <p className="text-xs text-slate-500">Vehicle: <span className="font-bold text-primary-600">{selectedVehicle.vehicleNumber}</span></p>
                            </div>
                            <button onClick={() => { setIsAssignModalOpen(false); setSelectedVehicle(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-3">
                            {drivers.length === 0 ? (
                                <p className="text-center text-slate-400 italic text-sm py-8">No drivers registered in your fleet.</p>
                            ) : (
                                drivers.map(drv => {
                                    const driverName = drv.firstName && drv.lastName ? `${drv.firstName} ${drv.lastName}` : drv.userName || 'Driver';
                                    return (
                                        <button
                                            key={drv.id}
                                            onClick={async () => {
                                                if (!window.confirm(`Are you sure you want to assign ${driverName} to Vehicle ${selectedVehicle.vehicleNumber}?`)) {
                                                    return;
                                                }
                                                setAssigningDriver(true);
                                                try {
                                                    await apiClient.post('/Vehicle/bookVehicle', {
                                                        VehicleId: selectedVehicle.vehicleId || selectedVehicle.id,
                                                        DriverId: drv.userId || drv.UserId || drv.id,
                                                        CT_BookingStatus: 2 // RideStatus.DriverAssigned
                                                    });

                                                    const drvUserId = drv.userId || drv.UserId;
                                                    if (drvUserId) {
                                                        const vehicleNameStr = selectedVehicle.vehicleNumber ? `${selectedVehicle.vehicleName || ''} (${selectedVehicle.vehicleNumber})` : 'a vehicle';
                                                        await apiClient.post(`/Transport/sendNotification?userId=${drvUserId}&title=${encodeURIComponent('Vehicle Assigned')}&message=${encodeURIComponent(`VEHICLE_ASSIGN|${vehicleNameStr}`)}`).catch(() => {});
                                                    }

                                                    alert("Driver assigned successfully!");
                                                    setIsAssignModalOpen(false);
                                                    setSelectedVehicle(null);
                                                    fetchDashboardData();
                                                    fetchFleetLists();
                                                } catch (err: any) {
                                                    console.error("Failed to assign driver:", err);
                                                    alert(err?.response?.data?.message || err?.response?.data?.Message || "Failed to assign driver.");
                                                } finally {
                                                    setAssigningDriver(false);
                                                }
                                            }}
                                            disabled={assigningDriver}
                                            className="w-full flex items-center justify-between p-3.5 border border-slate-200 hover:border-primary-500 hover:bg-primary-50/20 rounded-xl transition-all cursor-pointer text-left"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{driverName}</p>
                                                <p className="text-xs text-slate-500">{drv.phoneNumber || drv.email}</p>
                                            </div>
                                            <span className="text-xs font-bold text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-lg">Assign</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Driver-First Vehicle Assignment Modal */}
            {isReverseAssignModalOpen && selectedDriverForReverseAssign && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-205">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Assign Vehicle</h3>
                                <p className="text-xs text-slate-500">Driver: <span className="font-bold text-primary-600">{selectedDriverForReverseAssign.name}</span></p>
                            </div>
                            <button 
                                onClick={() => { setIsReverseAssignModalOpen(false); setSelectedDriverForReverseAssign(null); }} 
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-3">
                            {(() => {
                                const assignedVehicleIds = fleetRows
                                    .filter(f => f.driverName && f.driverName !== 'Unassigned')
                                    .map(f => String(f.vehicleId));

                                const availableVehicles = vehicles.filter(v => !assignedVehicleIds.includes(String(v.id)));

                                if (availableVehicles.length === 0) {
                                    return <p className="text-center text-slate-400 italic text-sm py-8">No unassigned vehicles available in your fleet.</p>;
                                }

                                return availableVehicles.map(veh => {
                                    return (
                                        <button
                                            key={veh.id}
                                            onClick={async () => {
                                                if (!window.confirm(`Are you sure you want to assign Vehicle ${veh.vehicleNumber} to ${selectedDriverForReverseAssign.name}?`)) {
                                                    return;
                                                }
                                                setAssigningVehicle(true);
                                                try {
                                                    await apiClient.post('/Vehicle/bookVehicle', {
                                                        VehicleId: veh.id,
                                                        DriverId: selectedDriverForReverseAssign.userId || selectedDriverForReverseAssign.UserId || selectedDriverForReverseAssign.id,
                                                        CT_BookingStatus: 2 // RideStatus.DriverAssigned
                                                    });

                                                    const drvUserId = selectedDriverForReverseAssign.userId || selectedDriverForReverseAssign.UserId;
                                                    if (drvUserId) {
                                                        const vehicleNameStr = veh.vehicleNumber ? `${veh.vehicleName || ''} (${veh.vehicleNumber})` : 'a vehicle';
                                                        await apiClient.post(`/Transport/sendNotification?userId=${drvUserId}&title=${encodeURIComponent('Vehicle Assigned')}&message=${encodeURIComponent(`VEHICLE_ASSIGN|${vehicleNameStr}`)}`).catch(() => {});
                                                    }

                                                    alert("Vehicle assigned successfully!");
                                                    setIsReverseAssignModalOpen(false);
                                                    setSelectedDriverForReverseAssign(null);
                                                    fetchDashboardData();
                                                    fetchFleetLists();
                                                } catch (err: any) {
                                                    console.error("Failed to assign vehicle:", err);
                                                    alert(err?.response?.data?.message || err?.response?.data?.Message || "Failed to assign vehicle.");
                                                } finally {
                                                    setAssigningVehicle(false);
                                                }
                                            }}
                                            disabled={assigningVehicle}
                                            className="w-full flex items-center justify-between p-3.5 border border-slate-200 hover:border-primary-500 hover:bg-primary-50/20 rounded-xl transition-all cursor-pointer text-left bg-white"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{veh.vehicleName || 'Truck'}</p>
                                                <p className="text-xs text-slate-500">{veh.vehicleNumber} • Size: {veh.capacityTons || 0} Tons</p>
                                            </div>
                                            <span className="text-xs font-bold text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-lg">Assign</span>
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Details Modal Card */}
            {selectedVehicleForDetail && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        
                        {/* Header Banner */}
                        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between relative">
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                    Vehicle Profile
                                </span>
                                <h3 className="text-lg font-black mt-1.5 tracking-tight flex items-center gap-1.5">
                                    <span>{selectedVehicleForDetail.vehicleName || 'Vehicle Details'}</span>
                                </h3>
                            </div>
                            <button 
                                onClick={() => setSelectedVehicleForDetail(null)} 
                                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Plate number banner */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">License Plate Number</p>
                                    <p className="text-base font-extrabold text-slate-800 tracking-wide uppercase">{selectedVehicleForDetail.vehicleNumber}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black border ${selectedVehicleForDetail.isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-650 border-slate-200'}`}>
                                    {selectedVehicleForDetail.isAvailable ? 'Available' : 'Busy'}
                                </span>
                            </div>

                            {/* Details List */}
                            <div className="space-y-3.5 text-sm text-slate-600 font-medium">
                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Assigned Driver</span>
                                    <span className="font-extrabold text-slate-900">
                                        {(() => {
                                            const assignment = fleetRows.find(f => String(f.vehicleId) === String(selectedVehicleForDetail.id));
                                            return assignment && assignment.driverName ? assignment.driverName : 'Unassigned';
                                        })()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">RC Number</span>
                                    <span className="font-bold text-slate-800 uppercase">{selectedVehicleForDetail.rcNumber || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">PUCC Status</span>
                                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Active / Verified
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Capacity (Load Size)</span>
                                    <span className="font-extrabold text-slate-900">{selectedVehicleForDetail.capacityTons || 0} Tons</span>
                                </div>

                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Insurance Expiry</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedVehicleForDetail.insuranceExpiry ? new Date(selectedVehicleForDetail.insuranceExpiry).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-semibold">Permit Expiry</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedVehicleForDetail.permitExpiry ? new Date(selectedVehicleForDetail.permitExpiry).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Done Button */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setSelectedVehicleForDetail(null)}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Actions Modal */}
            {isActionsModalOpen && selectedVehicleForActions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Vehicle Actions</h3>
                                <p className="text-xs text-slate-500">Vehicle: <span className="font-bold text-primary-600">{selectedVehicleForActions.vehicleNumber}</span></p>
                            </div>
                            <button onClick={() => { setIsActionsModalOpen(false); setSelectedVehicleForActions(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {/* Option to assign driver (if unassigned) */}
                            {(!selectedVehicleForActions.driverName || selectedVehicleForActions.driverName === 'Unassigned') ? (
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Do you want to assign a driver to Vehicle ${selectedVehicleForActions.vehicleNumber}?`)) {
                                            setSelectedVehicle(selectedVehicleForActions);
                                            setIsActionsModalOpen(false);
                                            setIsAssignModalOpen(true);
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-primary-500 hover:bg-primary-50/20 text-slate-700 font-bold text-sm text-left cursor-pointer"
                                >
                                    👤 Assign Driver
                                </button>
                            ) : (
                                <>
                                    {/* Option to unassign driver */}
                                    <button
                                        onClick={() => {
                                            setIsActionsModalOpen(false);
                                            handleUnassignDriver(selectedVehicleForActions.activeBookingId);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/30 text-red-600 font-bold text-sm text-left cursor-pointer"
                                    >
                                        👤 Unassign Driver
                                    </button>

                                    {/* Option to assign new driver */}
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Do you want to assign a new driver to Vehicle ${selectedVehicleForActions.vehicleNumber}?`)) {
                                                setSelectedVehicle(selectedVehicleForActions);
                                                setIsActionsModalOpen(false);
                                                setIsAssignModalOpen(true);
                                            }
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-primary-500 hover:bg-primary-50/20 text-slate-700 font-bold text-sm text-left cursor-pointer"
                                    >
                                        👤 Assign New Driver
                                    </button>
                                </>
                            )}

                            {/* Option to assign customer request */}
                            {rideRequests.length > 0 && (
                                <button
                                    onClick={() => {
                                        setIsActionsModalOpen(false);
                                        setIsRouteModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-700 font-bold text-sm text-left cursor-pointer"
                                >
                                    🗺️ Assign Customer Request / Route
                                </button>
                            )}

                            {/* Option to delete vehicle */}
                            <button
                                onClick={() => {
                                    setIsActionsModalOpen(false);
                                    handleDeleteVehicle(selectedVehicleForActions.vehicleId);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 hover:bg-red-50 text-red-600 font-bold text-sm text-left cursor-pointer"
                            >
                                🗑️ Delete Vehicle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Route / Customer Request Modal */}
            {isRouteModalOpen && selectedVehicleForActions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Assign Route Request</h3>
                                <p className="text-xs text-slate-500">Vehicle: <span className="font-bold text-primary-600">{selectedVehicleForActions.vehicleNumber}</span></p>
                            </div>
                            <button onClick={() => { setIsRouteModalOpen(false); setSelectedVehicleForActions(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-3">
                            {rideRequests.map(req => {
                                const routeName = `${req.pickupAddress || 'Pickup'} ➔ ${req.dropAddress || 'Drop'}`;
                                return (
                                    <button
                                        key={req.id}
                                        onClick={async () => {
                                            const driverId = selectedVehicleForActions.driverUserId || selectedVehicleForActions.driverId;
                                            if (!driverId || selectedVehicleForActions.driverName === 'Unassigned') {
                                                alert("Please assign a driver to this vehicle first before assigning a route request.");
                                                return;
                                            }
                                            if (!window.confirm(`Are you sure you want to assign Route: ${routeName} to Vehicle ${selectedVehicleForActions.vehicleNumber}?`)) {
                                                return;
                                            }
                                            try {
                                                const transporterUserId = currentUser?.userId || currentUser?.UserId;
                                                // 1. Claim shipment first
                                                await apiClient.post(`/Transport/acceptShipmentAsTransporter?transporterUserId=${transporterUserId}&bookingId=${req.id}`);
                                                // 2. Assign to driver
                                                await apiClient.post(`/Transport/assignTransporterBookingToDriver?transporterUserId=${transporterUserId}&bookingId=${req.id}&driverId=${driverId}`);
                                                alert("Route request assigned successfully!");
                                                setIsRouteModalOpen(false);
                                                setSelectedVehicleForActions(null);
                                                fetchDashboardData();
                                                fetchFleetLists();
                                            } catch (err: any) {
                                                console.error("Failed to assign route request:", err);
                                                alert(err?.response?.data?.message || err?.response?.data?.Message || "Failed to assign route request.");
                                            }
                                        }}
                                        className="w-full text-left p-3.5 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl transition-all cursor-pointer space-y-1 bg-white"
                                    >
                                        <p className="font-bold text-slate-900 text-sm leading-snug">{routeName}</p>
                                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                            <span>Fare: Rs. {req.estimatedFare}</span>
                                            <span className="font-bold text-emerald-600 uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{req.goodsType || 'Goods'}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {chatBookingId !== null && (
                <ChatPanel
                    bookingId={chatBookingId as number}
                    currentUserName={
                        currentUser?.firstName ||
                        currentUser?.name ||
                        currentUser?.company ||
                        currentUser?.UserName ||
                        'Transporter'
                    }
                    onClose={() => setChatBookingId(null)}
                />
            )}

            {directChatRoomName !== null && (
                <ChatPanel
                    roomName={directChatRoomName}
                    currentUserName={
                        currentUser?.firstName ||
                        currentUser?.name ||
                        currentUser?.company ||
                        currentUser?.UserName ||
                        'Transporter'
                    }
                    onClose={() => setDirectChatRoomName(null)}
                />
            )}

            {/* Real-time Incoming Ride Request Pop-Up Modal */}
            {activeRequestModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
                        
                        {/* Header Banner */}
                        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-white/10 relative">
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                    New Booking Request
                                </span>
                                <h3 className="text-lg font-black mt-1.5 tracking-tight flex items-center gap-1.5">
                                    <span>Shipment #{activeRequestModal.id}</span>
                                    <span className="text-xs text-slate-400 font-normal">({activeRequestModal.goodsType || 'Goods'})</span>
                                </h3>
                            </div>
                            {modalStage === 'idle' && (
                                <button 
                                    onClick={() => {
                                        setDismissedBookingIds(prev => ({ ...prev, [activeRequestModal.id]: true }));
                                        setActiveRequestModal(null);
                                    }} 
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Modal Body Stages */}
                        <div className="p-6 flex-1 min-h-[300px] flex flex-col justify-center">

                            {/* Stage 1: IDLE - Review Booking details */}
                            {modalStage === 'idle' && (
                                <div className="space-y-6">
                                    {/* Pickup & Destination Address Card */}
                                    <div className="relative pl-6 space-y-4 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-200">
                                        <div className="relative">
                                            <div className="absolute -left-6 top-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pickup Address</p>
                                            <p className="text-sm font-semibold text-slate-800 leading-snug">{activeRequestModal.pickupAddress || 'Unknown Pickup Address'}</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-6 top-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-50"></div>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Drop Destination</p>
                                            <p className="text-sm font-semibold text-slate-800 leading-snug">{activeRequestModal.dropAddress || 'Unknown Drop Address'}</p>
                                        </div>
                                    </div>

                                    {/* Fare, Weight, Customer Information Cards */}
                                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fare (Price)</p>
                                            <p className="text-lg font-black text-emerald-600">₹{activeRequestModal.estimatedFare}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Weight</p>
                                            <p className="text-base font-extrabold text-slate-800">{activeRequestModal.goodsWeight || '0'} Tons</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Distance/Est</p>
                                            <p className="text-base font-extrabold text-indigo-600">{activeRequestModal.scheduledTime ? 'Scheduled' : 'Live'}</p>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    const transporterUserId = currentUser?.userId || currentUser?.UserId;
                                                    // Accept as transporter (claims booking)
                                                    await apiClient.post(`/Transport/acceptShipmentAsTransporter?transporterUserId=${transporterUserId}&bookingId=${activeRequestModal.id}`);
                                                    // Transition to driver selection stage
                                                    setModalStage('select_driver');
                                                } catch (err: any) {
                                                    alert(err?.response?.data?.message || err?.response?.data?.Message || "Failed to claim shipment.");
                                                }
                                            }}
                                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                                        >
                                            Accept Request
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (!window.confirm("Are you sure you want to reject this ride request?")) return;
                                                try {
                                                    const transporterUserId = currentUser?.userId || currentUser?.UserId;
                                                    await apiClient.patch(`/Vehicle/${activeRequestModal.id}/transporterRideRequest/reject?transporterUserId=${transporterUserId}`);
                                                    setDismissedBookingIds(prev => ({ ...prev, [activeRequestModal.id]: true }));
                                                    setActiveRequestModal(null);
                                                    fetchDashboardData();
                                                } catch (err: any) {
                                                    alert(err?.response?.data?.message || err?.response?.data?.Message || "Failed to reject request.");
                                                }
                                            }}
                                            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-4 rounded-xl border border-rose-100 transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stage 2: SELECT DRIVER - Pick an online driver */}
                            {modalStage === 'select_driver' && (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <h4 className="text-md font-bold text-slate-800">Assign Driver & Vehicle</h4>
                                        <p className="text-xs text-slate-400 mt-1">Select one of your online drivers to complete this shipment.</p>
                                    </div>

                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {drivers.filter(d => d.rideStatus === 'Available').length === 0 ? (
                                            <p className="text-center text-xs text-amber-600 font-medium py-6 bg-amber-50 rounded-xl border border-amber-100">
                                                ⚠️ No available drivers online right now. All drivers are offline or on ride.
                                            </p>
                                        ) : (
                                            drivers.filter(d => d.rideStatus === 'Available').map(d => {
                                                const isSelected = selectedDriverForAssign === String(d.id || d.Id || d.userId || d.UserId);
                                                return (
                                                    <button
                                                        key={d.id}
                                                        onClick={() => setSelectedDriverForAssign(String(d.id || d.Id || d.userId || d.UserId))}
                                                        className={`w-full text-left p-3.5 border rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                                                            isSelected 
                                                                ? 'border-indigo-600 bg-indigo-50/20' 
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                                                {d.profilePic ? <img src={d.profilePic} alt="" className="w-full h-full object-cover" /> : <Users className="h-4 w-4 text-slate-400" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-xs">{d.name}</p>
                                                                <p className="text-[10px] text-slate-400">{d.vehicleName ? `${d.vehicleName} • ${d.vehicleNumber}` : 'Unassigned vehicle'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-bold text-amber-500">⭐ {d.driverRating || '5.0'}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            disabled={!selectedDriverForAssign}
                                            onClick={async () => {
                                                const dUserId = selectedDriverForAssign;
                                                
                                                setModalStage('sending');
                                                try {
                                                    const transporterUserId = currentUser?.userId || currentUser?.UserId;
                                                    await apiClient.post(`/Transport/assignTransporterBookingToDriver?transporterUserId=${transporterUserId}&bookingId=${activeRequestModal.id}&driverId=${dUserId}`);
                                                    
                                                    // Brief delay for premium simulated sending transition
                                                    setTimeout(() => {
                                                        setModalStage('waiting');
                                                    }, 1500);

                                                } catch (err: any) {
                                                    alert(err?.response?.data?.message || err?.response?.data?.Message || "Failed to assign driver.");
                                                    setModalStage('select_driver');
                                                }
                                            }}
                                            className={`flex-1 font-bold py-4 rounded-xl shadow-lg transition-all text-center text-sm ${
                                                selectedDriverForAssign 
                                                    ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-[0.98]' 
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            Assign to Driver
                                        </button>
                                        <button 
                                            onClick={() => setModalStage('idle')}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-4 rounded-xl transition-all cursor-pointer text-sm"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stage 3: SENDING - Sending request animation */}
                            {modalStage === 'sending' && (
                                <div className="space-y-6 flex flex-col items-center justify-center py-8">
                                    <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-white relative shadow-lg">
                                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h4 className="text-base font-black text-slate-900">Sending Request...</h4>
                                        <p className="text-xs text-slate-400">Sending dispatch notification to driver.</p>
                                    </div>
                                </div>
                            )}

                            {/* Stage 4: WAITING - Waiting for acceptance with real-time status check */}
                            {modalStage === 'waiting' && (
                                <div className="space-y-6 flex flex-col items-center justify-center py-8">
                                    <div className="relative flex items-center justify-center h-32 w-32 mb-2">
                                        <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping"></div>
                                        <div className="absolute inset-4 bg-indigo-500/20 rounded-full animate-pulse"></div>
                                        <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                            <Clock className="h-8 w-8 text-white animate-spin" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h4 className="text-base font-black text-slate-900">Waiting for Driver</h4>
                                        <p className="text-xs text-slate-400">Waiting for driver to accept the assignment.</p>
                                    </div>
                                </div>
                            )}

                            {/* Stage 5: ACCEPTED - Success checkmark screen */}
                            {modalStage === 'accepted' && (
                                <div className="space-y-6 flex flex-col items-center justify-center py-8">
                                    <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md">
                                        <CheckCircle className="h-9 w-9 animate-bounce" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h4 className="text-base font-black text-slate-900">Assignment Complete!</h4>
                                        <p className="text-xs text-slate-400">The driver accepted and the shipment is now live.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDismissedBookingIds(prev => ({ ...prev, [activeRequestModal.id]: true }));
                                            setActiveRequestModal(null);
                                            fetchDashboardData();
                                            fetchFleetLists();
                                        }}
                                        className="w-full max-w-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3.5 font-bold text-sm shadow-md transition-all cursor-pointer text-center"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* SOS Emergency Warning Pop-Up Modal */}
            {sosAlert && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-red-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-600 flex flex-col animate-in zoom-in-95 duration-300">
                        {/* Flashing Alert Header */}
                        <div className="bg-red-600 text-white px-6 py-5 flex items-center gap-3 border-b border-red-700 animate-pulse">
                            <AlertTriangle className="h-8 w-8 text-white fill-white animate-bounce" />
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-widest text-red-100 bg-red-700/30 px-2 py-0.5 rounded border border-red-500/30">
                                    Emergency Alert
                                </span>
                                <h3 className="text-lg font-black tracking-tight mt-0.5">SOS SIGNAL RECEIVED</h3>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-md font-extrabold text-slate-900">Driver {sosAlert.driverName} in Distress!</h4>
                                <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                                    🚨 Driver <span className="font-extrabold text-red-600">{sosAlert.driverName}</span> has pressed the SOS button on their mobile dashboard. Immediate assistance, support outreach, or emergency contact dispatch is requested.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-xs text-slate-500 text-left space-y-2">
                                <p className="flex items-center gap-2"><span className="font-bold text-slate-700">Driver Name:</span> {sosAlert.driverName}</p>
                                <p className="flex items-center gap-2"><span className="font-bold text-slate-700">Status:</span> Emergency Broadcast Active</p>
                                <p className="text-red-600 font-bold">⚠️ Please reach out to the driver immediately via their phone details.</p>
                            </div>

                            {/* Dismiss Action Button */}
                            <button
                                onClick={async () => {
                                    try {
                                        await apiClient.post(`/Transport/rejectRequest?notificationId=${sosAlert.id}`);
                                        setSosAlert(null);
                                        fetchRelationshipNotifications();
                                    } catch (err) {
                                        console.error("Failed to dismiss SOS alert:", err);
                                        setSosAlert(null);
                                    }
                                }}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                            >
                                Acknowledge & Dismiss Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Driver Accepted Ride Pop-Up Notification Modal */}
            {driverAcceptAlert && (
                <div className="fixed bottom-6 right-6 z-[3000] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 fill-emerald-500 text-white animate-bounce" />
                            <span className="font-black text-xs uppercase tracking-wider">Driver Accepted Ride</span>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    await apiClient.post(`/Transport/rejectRequest?notificationId=${driverAcceptAlert.id}`);
                                    setDriverAcceptAlert(null);
                                    fetchRelationshipNotifications();
                                    fetchDashboardData();
                                } catch (err) {
                                    console.error("Failed to dismiss accept alert:", err);
                                    setDriverAcceptAlert(null);
                                }
                            }}
                            className="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded transition-colors cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        <p className="text-sm font-bold text-slate-800">
                            Driver <span className="text-emerald-600 font-extrabold">{driverAcceptAlert.driverName}</span> has accepted Shipment #{driverAcceptAlert.bookingId}!
                        </p>
                        <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-slate-650 font-medium"><span className="font-bold text-slate-700 text-slate-800">Route:</span> {driverAcceptAlert.route}</p>
                            <p className="text-slate-650 font-medium"><span className="font-bold text-slate-700 text-slate-800">Fare Price:</span> ₹ {driverAcceptAlert.fare}</p>
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    await apiClient.post(`/Transport/rejectRequest?notificationId=${driverAcceptAlert.id}`);
                                    setDriverAcceptAlert(null);
                                    fetchRelationshipNotifications();
                                    fetchDashboardData();
                                } catch (err) {
                                    console.error("Failed to dismiss accept alert:", err);
                                    setDriverAcceptAlert(null);
                                }
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                            Acknowledge
                        </button>
                    </div>
                </div>
            )}
            {chatToast && (
                <div 
                    onClick={() => {
                        if (chatToast.bookingId) {
                            setChatBookingId(chatToast.bookingId);
                        } else if (chatToast.roomName) {
                            setDirectChatRoomName(chatToast.roomName);
                        }
                        setChatToast(null);
                    }}
                    className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur text-white rounded-2xl p-4 shadow-2xl border border-slate-700/50 flex flex-col gap-3 animate-in slide-in-from-bottom-5 duration-300 cursor-pointer"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                            </span>
                            New Message
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setChatToast(null);
                            }} 
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-sm">{chatToast.senderName}</p>
                        <p className="text-xs text-slate-300 line-clamp-2">{chatToast.messageText}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransporterDashboard;
