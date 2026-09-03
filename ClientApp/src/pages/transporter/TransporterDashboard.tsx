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
    Trash2,
    UserCheck,
    UserX,
    X,
    Loader2,
    CheckCircle,
    AlertTriangle,
    User,
    CreditCard,
    Bell,
    Lock,
    Navigation,
    Route,
    Phone
} from 'lucide-react';
import VehicleModal from '../../components/VehicleModal';
import DriverModal from '../../components/DriverModal';
import LiveFleetMap from '../../components/LiveFleetMap';
import TransporterRideRequests from '../../components/TransporterRideRequests';
import TransporterReports from '../../components/TransporterReports';
import TransporterFinance from '../../components/TransporterFinance';
import ProfilePage from '../ProfilePage';
import ChatPanel from '../../components/ChatPanel';
import { useAuth } from '../../hooks/useAuth';
import { disablePushNotifications } from '../../lib/firebaseMessaging';
import { logoutFirebaseAuth } from '../../lib/firebaseAuth';

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
    const [vehicleToEdit, setVehicleToEdit] = useState<any>(null);
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
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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
    const [selectedDriverForDetail, setSelectedDriverForDetail] = useState<any>(null);
    const [sosAlert, setSosAlert] = useState<{ driverName: string, id: number } | null>(null);
    const [driverAcceptAlert, setDriverAcceptAlert] = useState<{ driverName: string, bookingId: number, route: string, fare: number, id: number } | null>(null);
    const [disputeAlert, setDisputeAlert] = useState<{ id: string; title: string; rideId: string; driverInfo: string; issueType: string; details: string } | null>(null);
    const [rideRequests, setRideRequests] = useState<any[]>([]);
    const [relationshipRequests, setRelationshipRequests] = useState<any[]>([]);
    const [outboundInvitations, setOutboundInvitations] = useState<any[]>([]);
    const [dailyDistanceKm, setDailyDistanceKm] = useState<number>(0);
    const [commonTypesMap, setCommonTypesMap] = useState<Record<number, string>>({});

    useEffect(() => {
        apiClient.get('/CommonType/getall').then(res => {
            const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
            const map: Record<number, string> = {};
            list.forEach((item: any) => {
                const id = Number(item.id || item.Id);
                const name = item.name || item.Name || '';
                if (id && name) map[id] = name;
            });
            setCommonTypesMap(map);
        }).catch(() => {});
    }, []);

    const formatCurrency = (value: number = 0) => `₹ ${Number(value).toLocaleString('en-IN')}`;

    useEffect(() => {
        if (!activeRequestModal || modalStage !== 'waiting') return;

        const intervalId = setInterval(async () => {
            try {
                const res = await apiClient.get(`/Vehicle/shipmentDetail/${activeRequestModal.id}`);
                if (res.data?.driverStatus === 'Accepted' || res.data?.rideStatus === 'driver_assigned' || res.data?.rideStatus === 'driver_arriving') {
                    setModalStage('accepted');
                    clearInterval(intervalId);
                }
            } catch (err) {
                console.error("Error polling shipment detail:", err);
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, [activeRequestModal, modalStage]);

    const { user: authUser, logout: authContextLogout } = useAuth();

    useEffect(() => {
        if (authUser) {
            setCurrentUser(authUser);
        } else {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    setCurrentUser(JSON.parse(userStr));
                } catch {
                    navigate('/login', { replace: true });
                }
            } else {
                navigate('/login', { replace: true });
            }
        }
    }, [authUser, navigate]);

    // Fetch latest user details including profile pic
    useEffect(() => {
        const uid = currentUser?.userId || currentUser?.UserId || currentUser?.id;
        if (!uid) return;
        apiClient.get(`/User/getUserDetail/${uid}`).then((res) => {
            if (res.data) {
                setCurrentUser((prev: any) => ({
                    ...prev,
                    ...res.data,
                    profilePic: res.data.profilePic || res.data.ProfilePic || prev?.profilePic || prev?.ProfilePic,
                    company: res.data.company || res.data.Company || prev?.company,
                    firstName: res.data.firstName || res.data.FirstName || prev?.firstName
                }));
            }
        }).catch(() => {});
    }, [currentUser?.userId, currentUser?.UserId]);

    const fetchDashboardData = useCallback(async () => {
        const userId = currentUser?.userId || currentUser?.UserId;
        if (!userId) return;

        try {
            const [summaryRes, fleetRes, requestsRes, analyticsRes] = await Promise.all([
                apiClient.get('/Transport/getDashboardSummary', { params: { userId } }),
                apiClient.get('/Transport/getFleetOverview', { params: { userId } }),
                apiClient.get('/Vehicle/transporterRideRequests/' + userId).catch(() => ({ data: [] })),
                apiClient.get('/Transport/getTransporterAnalytics?userId=' + userId).catch(() => ({ data: null }))
            ]);

            if (analyticsRes.data && typeof analyticsRes.data.dailyDistanceKm === 'number') {
                setDailyDistanceKm(analyticsRes.data.dailyDistanceKm);
            }

            const incoming = Array.isArray(requestsRes.data) ? requestsRes.data : [];
            setRideRequests(incoming);
            
            // If currently open activeRequestModal is no longer in incoming (e.g. cancelled by customer/driver in real-time), dismiss it
            if (activeRequestModal) {
                const stillActive = incoming.some((r: any) => r.id === activeRequestModal.id);
                if (!stillActive && modalStage === 'idle') {
                    setActiveRequestModal(null);
                }
            } else if (incoming.length > 0) {
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

    const handleUnassignDriver = async (driverId: string, activeBookingId?: number, driverUserId?: string) => {
        if (!window.confirm("Are you sure you want to unassign this driver? This will cancel their active assignment.")) {
            return;
        }
        const transporterUserId = currentUser?.userId || currentUser?.UserId || '';
        try {
            if (driverId && transporterUserId) {
                await apiClient.post('/Transport/unassignDriver', null, {
                    params: {
                        transporterUserId,
                        driverId
                    }
                });
            } else if (activeBookingId) {
                await apiClient.patch(`/Vehicle/${activeBookingId}/rideStatus`, null, {
                    params: { status: 'cancelled' }
                });
            }

            if (driverUserId) {
                await apiClient.post(`/Transport/sendNotification?userId=${driverUserId}&title=${encodeURIComponent('Vehicle Unassigned')}&message=${encodeURIComponent('VEHICLE_UNASSIGN|Vehicle assignment has been removed by your transporter.')}`).catch(() => {});
            }

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
                    } else if (n.message && n.message.startsWith('DRIVER_ACCEPT_ORDER|')) {
                        // Driver accepted assignment / order
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                            audio.volume = 0.7;
                            audio.play().catch(() => {});
                        } catch (e) {}

                        const parts = n.message.split('|');
                        const bookingId = Number(parts[1]);
                        const driverName = parts[2] || 'Your Driver';
                        const route = parts[3] || 'Pickup ➔ Drop';
                        const fare = Number(parts[4]) || 0;
                        
                        setDriverAcceptAlert({
                            driverName,
                            bookingId,
                            route,
                            fare,
                            id: n.id
                        });

                        if (activeRequestModal && activeRequestModal.id === bookingId) {
                            setModalStage('accepted');
                            setActiveRequestModal(null);
                        }
                        fetchDashboardData();
                        fetchFleetLists();
                    } else if (n.message && n.message.startsWith('DISPUTE_ALERT|')) {
                        // Customer complaint / ride issue reported against fleet driver
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                            audio.volume = 0.7;
                            audio.play().catch(() => {});
                        } catch (e) {}

                        const parts = n.message.split('|');
                        const rideId = parts[1] || 'Ride';
                        const driverInfo = parts[2] || '';
                        const issueType = parts[3] || 'Complaint';
                        const details = parts.slice(4).join('|') || '';

                        setDisputeAlert({
                            id: n.id,
                            title: n.title || 'Customer Complaint Reported',
                            rideId,
                            driverInfo,
                            issueType,
                            details
                        });
                    } else if (n.message && n.message.startsWith('RIDE_CANCELLED|')) {
                        // Ride cancelled notification
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                            audio.volume = 0.8;
                            audio.play().catch(() => {});
                        } catch (e) {}

                        const parts = n.message.split('|');
                        const info = parts[2] || parts[1] || 'Ride cancelled';
                        setChatToast({
                            id: n.id,
                            senderName: '⚠️ Ride Cancelled',
                            messageText: info
                        });

                        fetchDashboardData();
                        fetchFleetLists();
                    }
                }
            });

            lastSeenNotifIdsRef.current = new Set(newNotifications.map((n: any) => n.id));
            setRelationshipRequests(newNotifications);
            setOutboundInvitations(Array.isArray(outboundRes.data) ? outboundRes.data : []);
        } catch (err) {
            console.error("Failed to fetch relationship notifications:", err);
        }
    }, [currentUser, activeRequestModal, fetchDashboardData, fetchFleetLists]);

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

    // Drivers live map points (1 indicator for each driver in transporter fleet)
    const mapDriverPoints = useMemo(() => {
        return drivers.map((d: any) => {
            const hasValidCoords = typeof d.currentLatitude === 'number' && typeof d.currentLongitude === 'number' && d.currentLatitude !== 0 && d.currentLongitude !== 0;
            return {
                driverId: d.id || d.userId,
                driverName: d.name || (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.userName || 'Driver'),
                driverPhone: d.phone || d.mobile || '',
                vehicleName: d.vehicleName,
                vehicleNumber: d.vehicleNumber,
                rideStatus: d.rideStatus || (d.isOnline ? 'Available' : 'Offline'),
                isOnline: !!d.isOnline,
                latitude: hasValidCoords ? Number(d.currentLatitude) : 28.6139, // Default to New Delhi if pending first GPS ping
                longitude: hasValidCoords ? Number(d.currentLongitude) : 77.2090,
                hasLiveGps: hasValidCoords
            };
        });
    }, [drivers]);

    const liveDriversCount = useMemo(() => drivers.length, [drivers]);

    const handleLogout = async () => {
        try {
            await disablePushNotifications();
            await logoutFirebaseAuth();
        } catch (error) {
            console.error('Logout cleanup failed', error);
        }
        authContextLogout();
        navigate('/login', { replace: true });
    };

    const stats = [
        { label: "Today's Earning", value: formatCurrency(fleetSummary.todaysEarnings), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: "Daily Distance", value: `${dailyDistanceKm} km`, icon: Navigation, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
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

    if (!currentUser) return null;

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
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shrink-0">
                            {currentUser?.profilePic || currentUser?.ProfilePic ? (
                                <img 
                                    src={
                                        (currentUser.profilePic || currentUser.ProfilePic).startsWith('http') || (currentUser.profilePic || currentUser.ProfilePic).startsWith('data:')
                                            ? (currentUser.profilePic || currentUser.ProfilePic)
                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${(currentUser.profilePic || currentUser.ProfilePic).startsWith('/') ? '' : '/'}${currentUser.profilePic || currentUser.ProfilePic}`
                                    } 
                                    alt="Transporter" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <span>{currentUser?.company ? currentUser.company.substring(0, 2).toUpperCase() : (currentUser?.firstName ? currentUser.firstName.substring(0, 2).toUpperCase() : 'TL')}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.company || currentUser?.firstName || 'Transporter Fleet'}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser?.roleName || 'Transporter'}</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 cursor-pointer">
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

                {/* Mobile Header Bar - Clean and Wide */}
                <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-40 shadow-md relative">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                            <Truck className="text-white h-4 w-4" />
                        </div>
                        <span className="font-extrabold tracking-tight text-xl">Navgatix</span>
                    </div>
                    
                    {/* Circle Avatar with Dropdown Toggle */}
                    <div className="relative">
                        <button 
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            title="Account & Settings"
                            className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black border-2 border-white/40 shadow-md active:scale-90 transition-all text-xs cursor-pointer"
                        >
                            {currentUser?.firstName?.charAt(0) || currentUser?.company?.charAt(0) || 'T'}
                        </button>

                        {/* Top-Right Profile Dropdown Menu */}
                        {profileDropdownOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setProfileDropdownOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {currentUser?.firstName || currentUser?.company || 'Satguru Logistics'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {currentUser?.email || 'Transporter Account'}
                                        </p>
                                    </div>

                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setSearchParams({ tab: 'profile' });
                                                setActiveTab('settings');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                        >
                                            <User className="h-4 w-4 text-emerald-600" /> Profile Info
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSearchParams({ tab: 'payments' });
                                                setActiveTab('settings');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                        >
                                            <CreditCard className="h-4 w-4 text-emerald-600" /> Wallet & Payments
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSearchParams({ tab: 'preferences' });
                                                setActiveTab('settings');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                        >
                                            <Bell className="h-4 w-4 text-emerald-600" /> Preferences & Alerts
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSearchParams({ tab: 'security' });
                                                setActiveTab('settings');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                        >
                                            <Lock className="h-4 w-4 text-emerald-600" /> Security & Access
                                        </button>
                                    </div>

                                    <div className="border-t border-slate-100 pt-1">
                                        <button
                                            onClick={() => {
                                                setProfileDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                                        >
                                            <LogOut className="h-4 w-4" /> Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                <div className={`flex-1 overflow-y-auto relative max-w-7xl w-full mx-auto pb-24 md:pb-8 ${activeTab === 'settings' ? 'pt-0 px-2 sm:px-3 md:p-8' : 'px-3 sm:px-4 py-4 md:p-8'}`}>

                    <div className="relative z-10">
                    {activeTab === 'overview' && (
                        <>
                            <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-10 gap-4">
                                <div className="text-white">
                                    <p className="text-indigo-200 font-medium tracking-wide text-xs md:text-sm mb-1 uppercase">{activeTab}</p>
                                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hii, {currentUser?.firstName || currentUser?.company || 'Satguru Logistics'}</h1>
                                </div>
                                <div className="flex gap-2.5 w-full md:w-auto">
                                    <button onClick={() => setIsDriverModalOpen(true)} className="flex-1 md:flex-initial bg-white text-slate-900 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl border border-white/20 font-semibold shadow-lg text-xs md:text-sm flex items-center justify-center gap-2 transition-colors">
                                        <Plus className="h-4 w-4" />
                                        Add Driver
                                    </button>
                                    <button 
                                        onClick={() => setIsVehicleModalOpen(true)}
                                        className="flex-1 md:flex-initial bg-primary-600 hover:bg-primary-500 text-white px-3.5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-600/30 text-xs md:text-sm flex items-center justify-center gap-2 transition-colors border border-primary-500"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New Vehicle
                                    </button>
                                </div>
                            </header>

                            {/* Stats Grid - Responsive layout with full text visibility */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 mb-6 md:mb-8">
                                {stats.map((stat, i) => (
                                    <div key={i} className={`premium-card p-3 sm:p-4 flex flex-col justify-between border-b-4 ${stat.border} bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[115px]`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-xs font-bold text-slate-600 leading-snug break-words flex-1">{stat.label}</p>
                                            <div className={`${stat.bg} ${stat.color} p-1.5 sm:p-2 rounded-xl flex-shrink-0`}>
                                                <stat.icon className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight mt-2 truncate" title={String(stat.value)}>{stat.value}</h3>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'overview' && (
                        <>
                            {/* Map - Full wide width */}
                            <div className="w-full mb-6 md:mb-8">
                                <div className="premium-card p-3.5 sm:p-4 md:p-6 bg-white shadow-sm border border-slate-100 rounded-2xl w-full">
                                    <div className="flex justify-between items-start gap-4 mb-3 md:mb-4">
                                        <div>
                                            <h3 className="text-base md:text-lg font-bold text-slate-900">Live Fleet Map</h3>
                                            <p className="text-xs md:text-sm text-slate-500">Real-time driver & vehicle fleet indicators.</p>
                                        </div>
                                        <span className="text-[11px] md:text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">{liveDriversCount} {liveDriversCount === 1 ? 'Driver' : 'Drivers'}</span>
                                    </div>
                                    <div className="h-[340px] md:h-[450px] w-full rounded-xl overflow-hidden border border-slate-200">
                                        <LiveFleetMap drivers={mapDriverPoints} />
                                    </div>
                                </div>
                            </div>


                            {/* Operations Table */}
                            <div className="premium-card overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 md:mb-8">
                                <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <h2 className="text-base md:text-lg font-bold text-slate-900">Current Fleet Operations</h2>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                        <input type="text" placeholder="Filter fleet..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full sm:w-64" />
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
                                                    <td className="px-6 py-4">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setSelectedDriverForDetail(d)}
                                                            className="flex items-center gap-3 text-left w-full cursor-pointer group bg-transparent border-0 p-0 focus:outline-none"
                                                            title="Click to view Driver Profile details"
                                                        >
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden ring-2 ring-slate-200 group-hover:ring-indigo-500 transition-all shrink-0">
                                                                {d.profilePic ? <img src={d.profilePic} alt="" className="w-full h-full object-cover" /> : <Users className="h-4 w-4 text-slate-400" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-900 font-extrabold group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-sm">
                                                                    {d.name}
                                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">Details ➔</span>
                                                                </span>
                                                                <span className="text-[11px] text-slate-400 font-normal">{d.phone || d.mobile || 'N/A'}</span>
                                                            </div>
                                                        </button>
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
                                                            {d.vehicleNumber || d.vehicleName || d.activeBookingId ? (
                                                                <button
                                                                    onClick={() => handleUnassignDriver(d.id || d.Id, d.activeBookingId, d.userId || d.UserId)}
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
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const fleetItem = fleetRows.find(f => String(f.vehicleId) === String(v.id));
                                                        const hasDriver = fleetItem && fleetItem.driverName && fleetItem.driverName !== 'Unassigned';
                                                        const isOnRide = fleetItem && fleetItem.rideStatus === 'On Ride';
                                                        
                                                        if (isOnRide) {
                                                            return (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black border bg-amber-50 text-amber-700 border-amber-200">
                                                                    On Ride
                                                                </span>
                                                            );
                                                        }
                                                        if (hasDriver) {
                                                            return (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black border bg-emerald-50 text-emerald-700 border-emerald-200" title={`Assigned to ${fleetItem.driverName}`}>
                                                                    Assigned
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black border bg-slate-100 text-slate-600 border-slate-200">
                                                                Unassigned
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                                    <button 
                                                        onClick={() => {
                                                            setVehicleToEdit(v);
                                                            setIsVehicleModalOpen(true);
                                                        }} 
                                                        className="text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg border border-primary-200 text-xs font-bold transition-colors cursor-pointer"
                                                        title="Edit Vehicle & Upload Documents"
                                                     >
                                                        Edit
                                                     </button>
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
                            <ProfilePage isEmbedded={true} />
                        </div>
                    )}
                </div>
            </div>
        </main>

            <DriverModal 
                isOpen={isDriverModalOpen} 
                onClose={() => setIsDriverModalOpen(false)} 
                onSuccess={() => { fetchDashboardData(); fetchFleetLists(); }} 
                transporterUserId={currentUser?.userId || currentUser?.UserId || currentUser?.id || ''} 
            />
            <VehicleModal 
                isOpen={isVehicleModalOpen} 
                onClose={() => { setIsVehicleModalOpen(false); setVehicleToEdit(null); }} 
                onSuccess={() => { fetchDashboardData(); fetchFleetLists(); }} 
                userId={currentUser?.userId || currentUser?.id || ''} 
                initialVehicleData={vehicleToEdit}
            />

            {/* Assign Driver Modal */}
            {isAssignModalOpen && selectedVehicle && (
                <div 
                    onClick={() => { setIsAssignModalOpen(false); setSelectedVehicle(null); }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
                    >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Assign Driver</h3>
                                <p className="text-xs text-slate-500">Vehicle: <span className="font-bold text-primary-600">{selectedVehicle.vehicleNumber}</span></p>
                            </div>
                            <button onClick={() => { setIsAssignModalOpen(false); setSelectedVehicle(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-3">
                            {drivers.length === 0 ? (
                                <p className="text-center text-slate-400 italic text-sm py-8">No drivers registered in your fleet.</p>
                            ) : (
                                drivers.map(drv => {
                                    const driverName = drv.name || (drv.firstName && drv.lastName ? `${drv.firstName} ${drv.lastName}` : drv.userName || drv.email || 'Driver');
                                    const driverPhone = drv.phone || drv.phoneNumber || drv.mobile || drv.email || '';
                                    return (
                                        <button
                                            key={drv.id || drv.userId}
                                            onClick={async () => {
                                                const existingVehStr = drv.vehicleName ? `${drv.vehicleName} (${drv.vehicleNumber || ''})` : (drv.vehicleNumber ? drv.vehicleNumber : '');
                                                let confirmMsg = `Are you sure you want to assign ${driverName} to Vehicle ${selectedVehicle.vehicleNumber}?`;
                                                
                                                if (existingVehStr && existingVehStr !== 'None') {
                                                    confirmMsg = `⚠️ REASSIGNMENT WARNING:\n\nDriver "${driverName}" is currently already assigned to Vehicle "${existingVehStr}".\n\nAssigning to "${selectedVehicle.vehicleNumber}" will automatically unassign "${existingVehStr}" and link this driver to "${selectedVehicle.vehicleNumber}".\n\nDo you want to proceed?`;
                                                }

                                                if (!window.confirm(confirmMsg)) {
                                                    return;
                                                }
                                                setAssigningDriver(true);
                                                try {
                                                    await apiClient.post('/Vehicle/bookVehicle', {
                                                        VehicleId: selectedVehicle.vehicleId || selectedVehicle.id,
                                                        DriverId: drv.id || drv.userId || drv.UserId,
                                                        CT_BookingStatus: 2 // RideStatus.DriverAssigned
                                                    });

                                                    const drvUserId = drv.userId || drv.UserId || drv.id;
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
                                                <p className="text-xs text-slate-500">{driverPhone}</p>
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
                <div 
                    onClick={() => { setIsReverseAssignModalOpen(false); setSelectedDriverForReverseAssign(null); }}
                    className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-205 cursor-default"
                    >
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
                                                const existingVehStr = selectedDriverForReverseAssign.vehicleName 
                                                    ? `${selectedDriverForReverseAssign.vehicleName} (${selectedDriverForReverseAssign.vehicleNumber || ''})` 
                                                    : (selectedDriverForReverseAssign.vehicleNumber ? selectedDriverForReverseAssign.vehicleNumber : '');
                                                
                                                let confirmMsg = `Are you sure you want to assign Vehicle ${veh.vehicleNumber} to ${selectedDriverForReverseAssign.name}?`;
                                                if (existingVehStr && existingVehStr !== 'None') {
                                                    confirmMsg = `⚠️ REASSIGNMENT WARNING:\n\nDriver "${selectedDriverForReverseAssign.name}" is already linked to Vehicle "${existingVehStr}".\n\nAssigning to "${veh.vehicleNumber}" will automatically unassign "${existingVehStr}" and assign "${veh.vehicleNumber}".\n\nDo you want to proceed?`;
                                                }

                                                if (!window.confirm(confirmMsg)) {
                                                    return;
                                                }
                                                setAssigningVehicle(true);
                                                try {
                                                    await apiClient.post('/Vehicle/bookVehicle', {
                                                        VehicleId: veh.id,
                                                        DriverId: selectedDriverForReverseAssign.id || selectedDriverForReverseAssign.userId || selectedDriverForReverseAssign.UserId,
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

            {/* Driver Details Modal Card */}
            {selectedDriverForDetail && (
                <div 
                    onClick={() => setSelectedDriverForDetail(null)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200 cursor-default"
                    >
                        {/* Header Banner */}
                        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                                    {selectedDriverForDetail.profilePic ? (
                                        <img src={selectedDriverForDetail.profilePic} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="h-5 w-5 text-indigo-300" />
                                    )}
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                        DRIVER PROFILE
                                    </span>
                                    <h3 className="text-lg font-black mt-1 tracking-tight text-white flex items-center gap-2">
                                        {selectedDriverForDetail.name || 'Driver Details'}
                                    </h3>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedDriverForDetail(null)} 
                                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Phone & Status banner */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Phone Number</p>
                                    <p className="text-base font-extrabold text-slate-800 tracking-wide">
                                        {selectedDriverForDetail.phone || selectedDriverForDetail.mobile || 'N/A'}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                                    selectedDriverForDetail.rideStatus === 'On Ride'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : selectedDriverForDetail.rideStatus === 'Available'
                                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                                            : 'bg-slate-100 text-slate-650 border-slate-200'
                                }`}>
                                    {selectedDriverForDetail.rideStatus || 'Offline'}
                                </span>
                            </div>

                            {/* Details List */}
                            <div className="space-y-3 text-sm text-slate-600 font-medium">
                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Assigned Vehicle</span>
                                    <span className="font-extrabold text-slate-900">
                                        {selectedDriverForDetail.vehicleName ? `${selectedDriverForDetail.vehicleName} (${selectedDriverForDetail.vehicleNumber || ''})` : 'Unassigned'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Driver Rating</span>
                                    <span className="font-bold text-amber-500">⭐ {selectedDriverForDetail.driverRating ?? '5.0'} / 5.0</span>
                                </div>

                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">License Number</span>
                                    <span className="font-mono font-bold text-slate-800 uppercase">{selectedDriverForDetail.licenseNumber || 'N/A'}</span>
                                </div>

                                {/* Active Route Details */}
                                {selectedDriverForDetail.rideStatus === 'On Ride' && (selectedDriverForDetail.pickupAddress || selectedDriverForDetail.dropAddress) ? (
                                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                                                <Route className="h-3.5 w-3.5 text-indigo-600" /> Active Route & Fare
                                            </span>
                                            {selectedDriverForDetail.estimatedFare || selectedDriverForDetail.finalFare ? (
                                                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                                    ₹ {selectedDriverForDetail.finalFare || selectedDriverForDetail.estimatedFare}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <p className="truncate"><strong className="text-emerald-700">From:</strong> {selectedDriverForDetail.pickupAddress || 'N/A'}</p>
                                            <p className="truncate"><strong className="text-rose-700">To:</strong> {selectedDriverForDetail.dropAddress || 'N/A'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-500">
                                        <span className="font-semibold">Current Ride:</span>
                                        <span className="italic">No active ride in progress</span>
                                    </div>
                                )}

                                {/* Today & Total Earnings */}
                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Today's Earnings</p>
                                        <p className="text-base font-black text-emerald-900">₹ {selectedDriverForDetail.todaysEarnings ?? 0}</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                        <p className="text-[10px] font-bold text-blue-700 uppercase">Total Earnings</p>
                                        <p className="text-base font-black text-blue-900">₹ {selectedDriverForDetail.totalEarnings ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Action Footer */}
                            <div className="pt-2 flex gap-2">
                                {selectedDriverForDetail.phone && (
                                    <a
                                        href={`tel:${selectedDriverForDetail.phone}`}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all text-center text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Phone className="h-3.5 w-3.5" /> Call
                                    </a>
                                )}
                                <button
                                    onClick={() => {
                                        const transporterUserId = currentUser?.userId || currentUser?.UserId || '';
                                        const driverUserId = selectedDriverForDetail.userId || selectedDriverForDetail.UserId || selectedDriverForDetail.id || '';
                                        setSelectedDriverForDetail(null);
                                        setDirectChatRoomName(`TransporterDriver_${transporterUserId}_${driverUserId}`);
                                    }}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all text-center text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    💬 Chat
                                </button>
                                <button
                                    onClick={() => setSelectedDriverForDetail(null)}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center text-xs"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Details Modal Card */}
            {selectedVehicleForDetail && (
                <div 
                    onClick={() => setSelectedVehicleForDetail(null)}
                    className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200 cursor-default"
                    >
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
                                {(() => {
                                    const fleetItem = fleetRows.find(f => String(f.vehicleId) === String(selectedVehicleForDetail.id));
                                    const hasDriver = fleetItem && fleetItem.driverName && fleetItem.driverName !== 'Unassigned';
                                    const isOnRide = fleetItem && fleetItem.rideStatus === 'On Ride';

                                    if (isOnRide) {
                                        return (
                                            <span className="px-3 py-1 rounded-full text-xs font-black border bg-amber-50 text-amber-700 border-amber-200">
                                                On Ride
                                            </span>
                                        );
                                    }
                                    if (hasDriver) {
                                        return (
                                            <span className="px-3 py-1 rounded-full text-xs font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                Assigned
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="px-3 py-1 rounded-full text-xs font-black border bg-slate-100 text-slate-650 border-slate-200">
                                            Unassigned
                                        </span>
                                    );
                                })()}
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
                                    <span className="text-slate-400 font-semibold">Vehicle Type</span>
                                    <span className="font-extrabold text-slate-800">
                                        {selectedVehicleForDetail.vehicleTypeName || selectedVehicleForDetail.VehicleTypeName || 'Standard Truck'}
                                    </span>
                                </div>

                                {(selectedVehicleForDetail.bodyTypeName || selectedVehicleForDetail.BodyTypeName) ? (
                                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                        <span className="text-slate-400 font-semibold">Body Type</span>
                                        <span className="font-extrabold text-slate-800">
                                            {selectedVehicleForDetail.bodyTypeName || selectedVehicleForDetail.BodyTypeName}
                                        </span>
                                    </div>
                                ) : null}

                                {(selectedVehicleForDetail.tyreTypeName || selectedVehicleForDetail.TyreTypeName) ? (
                                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                        <span className="text-slate-400 font-semibold">Tyre Configuration</span>
                                        <span className="font-extrabold text-slate-800">
                                            {selectedVehicleForDetail.tyreTypeName || selectedVehicleForDetail.TyreTypeName}
                                        </span>
                                    </div>
                                ) : null}

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

                            {/* Action Buttons */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={() => {
                                        setVehicleToEdit(selectedVehicleForDetail);
                                        setSelectedVehicleForDetail(null);
                                        setIsVehicleModalOpen(true);
                                    }}
                                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-primary-600/20 transition-all active:scale-[0.98] cursor-pointer text-center text-sm flex items-center justify-center gap-1.5"
                                >
                                    ✏️ Edit & Upload Documents
                                </button>
                                <button
                                    onClick={() => setSelectedVehicleForDetail(null)}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
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
                <div 
                    onClick={() => { setIsActionsModalOpen(false); setSelectedVehicleForActions(null); }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
                    >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Vehicle Actions</h3>
                                <p className="text-xs text-slate-500">Vehicle: <span className="font-bold text-primary-600">{selectedVehicleForActions.vehicleNumber}</span></p>
                            </div>
                            <button onClick={() => { setIsActionsModalOpen(false); setSelectedVehicleForActions(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
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
                <div 
                    onClick={() => { setIsRouteModalOpen(false); setSelectedVehicleForActions(null); }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 cursor-default"
                    >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg">Assign Route Request</h3>
                                <p className="text-xs text-slate-500">Vehicle: <span className="font-bold text-primary-600">{selectedVehicleForActions.vehicleNumber}</span></p>
                            </div>
                            <button onClick={() => { setIsRouteModalOpen(false); setSelectedVehicleForActions(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
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
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-sm uppercase shrink-0 shadow-sm">
                                    {activeRequestModal.customerProfilePic ? (
                                        <img 
                                            src={
                                                activeRequestModal.customerProfilePic.startsWith('http') || activeRequestModal.customerProfilePic.startsWith('data:')
                                                    ? activeRequestModal.customerProfilePic
                                                    : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${activeRequestModal.customerProfilePic.startsWith('/') ? '' : '/'}${activeRequestModal.customerProfilePic}`
                                            }
                                            alt={activeRequestModal.customerName || 'Customer'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <span>{activeRequestModal.customerName?.substring(0, 2) || 'CU'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                        New Booking Request
                                    </span>
                                    {(() => {
                                        const rawGoods = activeRequestModal.goodsType || 'Goods';
                                        const isTons = rawGoods.includes('[Unit: Tons]');
                                        const cleanGoods = rawGoods.replace(/\s*\[Unit:\s*Tons\]/gi, '').trim() || 'Goods';
                                        return (
                                            <h3 className="text-base font-black mt-1 tracking-tight flex items-center gap-1.5">
                                                <span>{activeRequestModal.customerName ? `${activeRequestModal.customerName} (#${activeRequestModal.id})` : `Shipment #${activeRequestModal.id}`}</span>
                                                <span className="text-xs text-slate-400 font-normal">({cleanGoods})</span>
                                            </h3>
                                        );
                                    })()}
                                </div>
                            </div>
                            {modalStage === 'idle' && (
                                <button 
                                    onClick={() => {
                                        setDismissedBookingIds(prev => ({ ...prev, [activeRequestModal.id]: true }));
                                        setActiveRequestModal(null);
                                    }} 
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer self-start"
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
                                    {(() => {
                                        const rawGoods = activeRequestModal.goodsType || '';
                                        const isTons = rawGoods.includes('[Unit: Tons]');
                                        const unit = isTons ? 'Tons' : 'kg';
                                        return (
                                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fare (Price)</p>
                                                    <p className="text-lg font-black text-emerald-600">₹{activeRequestModal.estimatedFare}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Weight</p>
                                                    <p className="text-base font-extrabold text-slate-800">{activeRequestModal.goodsWeight || '0'} {unit}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Distance/Est</p>
                                                    <p className="text-base font-extrabold text-indigo-600">{activeRequestModal.scheduledTime ? 'Scheduled' : 'Live'}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Customer Required Vehicle Specifications */}
                                    {(activeRequestModal.ctVehicleType || activeRequestModal.ct_VehicleType || activeRequestModal.CT_VehicleType || activeRequestModal.ctBodyType || activeRequestModal.CTBodyType || activeRequestModal.ctTyreType || activeRequestModal.CTTyreType) ? (
                                        <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl text-xs space-y-2">
                                            <p className="text-[10px] uppercase font-black text-indigo-700 tracking-wider">Required Vehicle Specifications</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {(activeRequestModal.ctVehicleType || activeRequestModal.ct_VehicleType || activeRequestModal.CT_VehicleType) ? (
                                                    <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Vehicle Type</p>
                                                        <p className="text-xs font-black text-indigo-700 truncate mt-0.5">
                                                            {commonTypesMap[Number(activeRequestModal.ctVehicleType || activeRequestModal.ct_VehicleType || activeRequestModal.CT_VehicleType)] || `Type #${activeRequestModal.ctVehicleType || activeRequestModal.ct_VehicleType || activeRequestModal.CT_VehicleType}`}
                                                        </p>
                                                    </div>
                                                ) : null}
                                                {(activeRequestModal.ctBodyType || activeRequestModal.CTBodyType) ? (
                                                    <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Body Type</p>
                                                        <p className="text-xs font-black text-blue-700 truncate mt-0.5">
                                                            {commonTypesMap[Number(activeRequestModal.ctBodyType || activeRequestModal.CTBodyType)] || `Body #${activeRequestModal.ctBodyType || activeRequestModal.CTBodyType}`}
                                                        </p>
                                                    </div>
                                                ) : null}
                                                {(activeRequestModal.ctTyreType || activeRequestModal.CTTyreType) ? (
                                                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Tyre Type</p>
                                                        <p className="text-xs font-black text-slate-800 truncate mt-0.5">
                                                            {commonTypesMap[Number(activeRequestModal.ctTyreType || activeRequestModal.CTTyreType)] || `Tyre #${activeRequestModal.ctTyreType || activeRequestModal.CTTyreType}`}
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}

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

                                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                        {drivers.filter(d => d.rideStatus === 'Available').length === 0 ? (
                                            <p className="text-center text-xs text-amber-600 font-medium py-6 bg-amber-50 rounded-xl border border-amber-100">
                                                ⚠️ No available drivers online right now. All drivers are offline or on ride.
                                            </p>
                                        ) : (
                                            drivers.filter(d => d.rideStatus === 'Available').map(d => {
                                                const isSelected = selectedDriverForAssign === String(d.id || d.Id || d.userId || d.UserId);
                                                const reqBodyType = Number(activeRequestModal.ctBodyType || activeRequestModal.CTBodyType || 0);
                                                const reqTyreType = Number(activeRequestModal.ctTyreType || activeRequestModal.CTTyreType || 0);
                                                const isMatch = (reqBodyType === 0 || d.ctBodyType === reqBodyType) && (reqTyreType === 0 || d.ctTyreType === reqTyreType);

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
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                                {d.profilePic ? <img src={d.profilePic} alt="" className="w-full h-full object-cover" /> : <Users className="h-4 w-4 text-slate-400" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900 text-xs">{d.name}</p>
                                                                    {isMatch && (reqBodyType > 0 || reqTyreType > 0) && (
                                                                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full">
                                                                            ✓ Spec Match
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-slate-400">{d.vehicleName ? `${d.vehicleName} • ${d.vehicleNumber}` : 'Unassigned vehicle'}</p>
                                                                {(d.ctBodyType || d.ctTyreType) ? (
                                                                    <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                                                        {d.ctBodyType ? commonTypesMap[d.ctBodyType] : ''} {d.ctTyreType ? `• ${commonTypesMap[d.ctTyreType]}` : ''}
                                                                    </p>
                                                                ) : null}
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
            {/* Customer Complaint / Dispute Modal Popup */}
            {disputeAlert && (
                <div 
                    onClick={() => setDisputeAlert(null)}
                    className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-rose-150 animate-in zoom-in-95 duration-200 cursor-default"
                    >
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                                    ⚠️
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-rose-200 bg-rose-900/40 px-2.5 py-0.5 rounded-full">
                                        Customer Dispute Alert
                                    </span>
                                    <h3 className="text-lg font-black mt-0.5 tracking-tight">
                                        {disputeAlert.title || 'New Complaint Reported'}
                                    </h3>
                                </div>
                            </div>
                            <button 
                                onClick={() => setDisputeAlert(null)}
                                className="p-2 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-rose-100 pb-2">
                                    <span>{disputeAlert.rideId}</span>
                                    <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full uppercase text-[10px] font-black">
                                        {disputeAlert.issueType}
                                    </span>
                                </div>
                                {disputeAlert.driverInfo && (
                                    <p className="text-xs font-extrabold text-slate-900">
                                        {disputeAlert.driverInfo}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Customer Description / Complaint:
                                </label>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold whitespace-pre-wrap leading-relaxed shadow-inner">
                                    "{disputeAlert.details.replace(/^Details:\s*/i, '')}"
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-400 text-center font-medium">
                                * This complaint has also been logged with Navgatix Admin for review and dispute mediation.
                            </p>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (disputeAlert.id) {
                                            try {
                                                await apiClient.post(`/Transport/markNotificationRead?notificationId=${disputeAlert.id}`);
                                            } catch (e) {}
                                        }
                                        setDisputeAlert(null);
                                    }}
                                    className="flex-1 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    Acknowledge & Dismiss
                                </button>
                            </div>
                        </div>
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

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-2 px-2 flex items-center justify-around shadow-2xl safe-area-bottom">
                {[
                    { id: 'overview', label: 'Home', icon: LayoutDashboard },
                    { id: 'drivers', label: 'Manage Driver', icon: Users },
                    { id: 'vehicles', label: 'Fleet', icon: Truck },
                    { id: 'finance', label: 'Wallet', icon: DollarSign },
                    { id: 'reports', label: 'Report', icon: FileText },
                ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id as any);
                                setSidebarOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
                                isActive
                                    ? 'text-emerald-600 font-extrabold bg-emerald-50/80 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 font-medium'
                            }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-500'}`} />
                            <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default TransporterDashboard;
