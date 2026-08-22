import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { DollarSign, Truck, Clock, Wallet, Send, MapPin, Route, History, MessageCircle, LayoutDashboard, LogOut, Settings, Menu, ChevronDown, CreditCard, Bell, Key, User, Star, Phone, AlertTriangle, X, Home, Package, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import ChatPanel from '../../components/ChatPanel';
import { disablePushNotifications } from '../../lib/firebaseMessaging';
import { logoutFirebaseAuth } from '../../lib/firebaseAuth';
import { useAuth } from '../../hooks/useAuth';
import DriverWallet from '../../components/DriverWallet';
import NotificationSettings from '../../components/NotificationSettings';
import SecuritySettings from '../../components/SecuritySettings';
import TrackingMap from '../../components/TrackingMap';
import { VerificationPendingGuard } from '../../components/VerificationPendingGuard';

type RideStatus = 'request_for_ride' | 'driver_assigned' | 'driver_arriving' | 'ride_started' | 'ride_completed' | 'cancelled';

type RideItem = {
    id: number;
    customerName?: string;
    pickupAddress?: string;
    dropAddress?: string;
    goodsType?: string;
    goodsWeight?: number;
    estimatedFare?: number;
    finalFare?: number;
    rideStatus?: RideStatus;
    createdAt?: string;
    scheduledTime?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    isPaid?: boolean;
    isTransporterAssigned?: boolean;
    transporterName?: string;
    vehicleTypeName?: string;
    bodyTypeName?: string;
    tyreTypeName?: string;
};

const ACTIVE_STATUSES: RideStatus[] = ['driver_assigned', 'driver_arriving', 'ride_started'];

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'shipments' | 'settings'>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [wallet, setWallet] = useState<any>(null);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [rideRequests, setRideRequests] = useState<RideItem[]>([]);
    const [rides, setRides] = useState<RideItem[]>([]);
    const [loadingRides, setLoadingRides] = useState(false);
    const [disputeDrafts, setDisputeDrafts] = useState<Record<number, string>>({});
    const [isTracking, setIsTracking] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [chatBookingId, setChatBookingId] = useState<number | null>(null);
    const [directChatRoomName, setDirectChatRoomName] = useState<string | null>(null);
    const lastSeenNotifIdsRef = useRef<Set<string>>(new Set());
    const handledCancellationNotifIdsRef = useRef<Set<string>>(new Set());
    const [driverSummaryCard, setDriverSummaryCard] = useState<any>(null);
    const [driverMetrics, setDriverMetrics] = useState<{ distanceKm: number; etaMins: number; phase: 'pickup' | 'delivery' } | null>(null);
    const [showPaymentCollectionModal, setShowPaymentCollectionModal] = useState<any>(null);
    const [chatToast, setChatToast] = useState<{
        id: string;
        bookingId?: number;
        roomName?: string;
        senderName: string;
        messageText: string;
    } | null>(null);
    const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
    const [assignedVehicleInfo, setAssignedVehicleInfo] = useState<any>(null);
    const [activeTransporter, setActiveTransporter] = useState<any>({ isIndependent: true });
    const [relationshipRequests, setRelationshipRequests] = useState<any[]>([]);
    const [outboundJoinRequests, setOutboundJoinRequests] = useState<any[]>([]);
    const [transporterEmail, setTransporterEmail] = useState('');
    const [sendingJoin, setSendingJoin] = useState(false);
    const [driverRating, setDriverRating] = useState({ averageRating: 0.0, totalRatings: 0 });
    
    // Journey Animation and SOS Alert states
    const [acceptState, setAcceptState] = useState<'idle' | 'loading_route' | 'ready'>('idle');
    const [isSosOpen, setIsSosOpen] = useState(false);
    const [activeRequestPopup, setActiveRequestPopup] = useState<RideItem | null>(null);
    const [dismissedRequestIds, setDismissedRequestIds] = useState<Record<string | number, boolean>>({});


    const driverUserId = user?.userId || user?.UserId || user?.id || '';
    const driverId = user?.driverId || user?.DriverId || '';
    const appUserId = Number(user?.appUserId || user?.AppUserId || 0);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            navigate('/login');
            return;
        }
        const userData = JSON.parse(userStr);

        // Safety: if a transporter account lands on the driver dashboard due to role ordering/misrouting,
        // send them to the transporter dashboard instead.
        const roles: string[] = userData?.roles ?? userData?.Roles ?? [];
        const normalizedRoles = roles.map((r: any) => String(r || '').trim().toLowerCase());
        const roleName = String(userData?.roleName ?? userData?.RoleName ?? '').trim().toLowerCase();
        const transporterId = userData?.transporterId ?? userData?.TransporterId;
        if (transporterId || roleName === 'transporter' || roleName === 'company' || normalizedRoles.includes('transporter') || normalizedRoles.includes('company')) {
            navigate('/transporter-dashboard', { replace: true });
            return;
        }

        setUser(userData);

        // Profile Completion Guard
        const profileStatus = userData?.profileStatus || userData?.ProfileStatus;
        if (profileStatus === 'Incomplete') {
            console.log('Driver profile is incomplete. Redirecting to profile page.');
            navigate('/profile', { state: { from: 'dashboard', reason: 'incomplete_profile' } });
        }
    }, [navigate]);

    useEffect(() => {
        if (!driverUserId) return;

        const loadWallet = async () => {
            setLoadingWallet(true);
            try {
                const res = await apiClient.get(`/DriverFinance/wallet/${driverUserId}`);
                setWallet(res.data || {});
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingWallet(false);
            }
        };

        const loadRides = async () => {
            setLoadingRides(true);
            try {
                const requestRes = await apiClient.get(`/Vehicle/driverRideRequests/${driverUserId}`);
                const requestData = Array.isArray(requestRes.data) ? requestRes.data : [];
                setRideRequests(
                    requestData
                        .filter((item) => item?.Id || item?.id)
                        .map((item) => ({
                            id: Number(item.id ?? item.Id),
                            customerName: item.customerName ?? item.CustomerName,
                            pickupAddress: item.pickupAddress ?? item.PickupAddress,
                            dropAddress: item.dropAddress ?? item.DropAddress,
                            goodsType: item.goodsType ?? item.GoodsType,
                            goodsWeight: Number(item.goodsWeight ?? item.GoodsWeight ?? 0),
                            estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                            finalFare: Number(item.finalFare ?? item.FinalFare ?? 0),
                            rideStatus: (item.rideStatus ?? item.RideStatus ?? 'request_for_ride') as RideStatus,
                            createdAt: item.createdAt ?? item.CreatedAt,
                            scheduledTime: item.scheduledTime ?? item.ScheduledTime,
                            pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                            pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                            dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                            dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                            isTransporterAssigned: !!(item.isTransporterAssigned ?? item.IsTransporterAssigned),
                            transporterName: item.transporterName ?? item.TransporterName,
                        }))
                );

                const res = await apiClient.get(`/Vehicle/driverRides/${driverUserId}`);
                const data = Array.isArray(res.data) ? res.data : [];
                const normalized = data
                    .filter((item) => item?.Id || item?.id)
                    .map((item) => ({
                        id: Number(item.id ?? item.Id),
                        customerName: item.customerName ?? item.CustomerName,
                        pickupAddress: item.pickupAddress ?? item.PickupAddress,
                        dropAddress: item.dropAddress ?? item.DropAddress,
                        goodsType: item.goodsType ?? item.GoodsType,
                        estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                        finalFare: Number(item.finalFare ?? item.FinalFare ?? 0),
                        rideStatus: (item.rideStatus ?? item.RideStatus ?? 'request_for_ride') as RideStatus,
                        createdAt: item.createdAt ?? item.CreatedAt,
                        pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                        pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                        dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                        dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                        scheduledTime: item.scheduledTime ?? item.ScheduledTime,
                        isPaid: !!(item.isPaid ?? item.IsPaid),
                    }));

                setRides(normalized);

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingRides(false);
            }
        };

        const loadRating = async () => {
            try {
                const res = await apiClient.get(`/Vehicle/driverAverageRating/${driverUserId}`);
                setDriverRating(res.data || { averageRating: 0.0, totalRatings: 0 });
            } catch (err) {
                console.error("Failed to load driver rating:", err);
            }
        };

        const loadActiveVehicleId = async () => {
            try {
                const res = await apiClient.get(`/Transport/getDriverActiveVehicle?userId=${driverUserId}`);
                setActiveVehicleId(res.data?.vehicleId || res.data?.VehicleId || null);

                const assignedRes = await apiClient.get(`/Transport/getDriverAssignedVehicle/${driverUserId}`);
                if (assignedRes.data?.isAssigned && assignedRes.data?.vehicle) {
                    setAssignedVehicleInfo(assignedRes.data.vehicle);
                } else {
                    setAssignedVehicleInfo(null);
                }
            } catch (err) {
                console.error("Failed to load active vehicle ID:", err);
            }
        };

        const loadDriverSummaryCard = async () => {
            try {
                const res = await apiClient.get(`/Vehicle/driverSummaryCard/${driverUserId}`);
                setDriverSummaryCard(res.data);
            } catch (err) {}
        };

        loadWallet();
        loadRides();
        loadRelationshipDetails();
        loadRating();
        loadActiveVehicleId();
        loadDriverSummaryCard();
    }, [driverUserId]);

    const fetchDashboardData = useCallback(async () => {
        if (!driverUserId) return;
        try {
            const [wRes, sRes] = await Promise.all([
                apiClient.get(`/DriverFinance/wallet/${driverUserId}`).catch(() => null),
                apiClient.get(`/Vehicle/driverSummaryCard/${driverUserId}`).catch(() => null)
            ]);
            if (wRes?.data) setWallet(wRes.data);
            if (sRes?.data) setDriverSummaryCard(sRes.data);
            refreshRides();
        } catch (e) {}
    }, [driverUserId]);

    // Poll ride requests and relationship notifications
    useEffect(() => {
        if (!driverUserId) return;

        const intervalId = setInterval(async () => {
            refreshRides();
            loadRelationshipDetails();
            try {
                const res = await apiClient.get(`/Transport/getDriverActiveVehicle?userId=${driverUserId}`);
                setActiveVehicleId(res.data?.vehicleId || res.data?.VehicleId || null);

                const assignedRes = await apiClient.get(`/Transport/getDriverAssignedVehicle/${driverUserId}`);
                if (assignedRes.data?.isAssigned && assignedRes.data?.vehicle) {
                    setAssignedVehicleInfo(assignedRes.data.vehicle);
                } else {
                    setAssignedVehicleInfo(null);
                }
            } catch (err) {
                console.error("Failed to poll active vehicle ID:", err);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }, [driverUserId]);

    // Track incoming requests to trigger pop-up modals
    useEffect(() => {
        if (rideRequests.length > 0) {
            const activeReq = rideRequests.find(r => {
                const dismissKey = r.isTransporterAssigned ? `transporter_${r.id}` : `${r.id}`;
                return !dismissedRequestIds[dismissKey];
            });
            if (activeReq) {
                setActiveRequestPopup(activeReq);
            } else {
                setActiveRequestPopup(null);
            }
        } else {
            setActiveRequestPopup(null);
        }
    }, [rideRequests, dismissedRequestIds]);

    // Background Geolocation Tracking
    useEffect(() => {
        if (!driverUserId || !isTracking) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.error('Geolocation error:', err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [driverUserId, isTracking]);

    // Periodic Backend Ping (every 5 seconds)
    useEffect(() => {
        if (!driverUserId || !isTracking || !currentPosition) return;

        const interval = setInterval(async () => {
            try {
                const vehicleId = activeVehicleId;
                if (!vehicleId) return;

                await apiClient.post('/Vehicle/saveLiveVehicleTracking', {
                    vehicleId: vehicleId,
                    deviceId: 'web-browser',
                    lastLatitude: currentPosition.lat,
                    lastLongitude: currentPosition.lng
                });
            } catch (err) {
                console.error('Location ping failed:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [driverUserId, isTracking, currentPosition, activeVehicleId]);

    const currentRide = useMemo(
        () => rides.find((ride) => ride.rideStatus && ACTIVE_STATUSES.includes(ride.rideStatus)) || null,
        [rides]
    );

    const rideHistory = useMemo(
        () => rides.filter((ride) => !currentRide || ride.id !== currentRide.id),
        [rides, currentRide]
    );

    const toCurrency = (value: any) => `Rs ${Number(value || 0).toLocaleString()}`;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // Distance in km
        return Math.round(d * 10) / 10;
    };

    const getEstimatedTime = (distanceKm: number) => {
        if (distanceKm <= 0) return 'N/A';
        const averageSpeedKmh = 40; // average 40 km/h
        const timeHours = distanceKm / averageSpeedKmh;
        const timeMinutes = Math.ceil(timeHours * 60);
        if (timeMinutes < 60) {
            return `${timeMinutes} mins`;
        }
        const hours = Math.floor(timeMinutes / 60);
        const mins = timeMinutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const refreshRides = async () => {
        if (!driverUserId) return;
        const requestRes = await apiClient.get(`/Vehicle/driverRideRequests/${driverUserId}`);
        const requestData = Array.isArray(requestRes.data) ? requestRes.data : [];
        setRideRequests(
            requestData
                .filter((item) => item?.Id || item?.id)
                .map((item) => ({
                    id: Number(item.id ?? item.Id),
                    customerName: item.customerName ?? item.CustomerName,
                    pickupAddress: item.pickupAddress ?? item.PickupAddress,
                    dropAddress: item.dropAddress ?? item.DropAddress,
                    goodsType: item.goodsType ?? item.GoodsType,
                    goodsWeight: Number(item.goodsWeight ?? item.GoodsWeight ?? 0),
                    estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                    finalFare: Number(item.finalFare ?? item.FinalFare ?? 0),
                    rideStatus: (item.rideStatus ?? item.RideStatus ?? 'request_for_ride') as RideStatus,
                    createdAt: item.createdAt ?? item.CreatedAt,
                    scheduledTime: item.scheduledTime ?? item.ScheduledTime,
                    pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                    pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                    dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                    dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                    vehicleTypeName: item.vehicleTypeName ?? item.VehicleTypeName,
                    bodyTypeName: item.bodyTypeName ?? item.BodyTypeName,
                    tyreTypeName: item.tyreTypeName ?? item.TyreTypeName,
                }))
        );

        const res = await apiClient.get(`/Vehicle/driverRides/${driverUserId}`);
        const data = Array.isArray(res.data) ? res.data : [];
        const normalized = data
            .filter((item) => item?.Id || item?.id)
            .map((item) => ({
                id: Number(item.id ?? item.Id),
                customerName: item.customerName ?? item.CustomerName,
                pickupAddress: item.pickupAddress ?? item.PickupAddress,
                dropAddress: item.dropAddress ?? item.DropAddress,
                goodsType: item.goodsType ?? item.GoodsType,
                estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                finalFare: Number(item.finalFare ?? item.FinalFare ?? 0),
                rideStatus: (item.rideStatus ?? item.RideStatus ?? 'request_for_ride') as RideStatus,
                createdAt: item.createdAt ?? item.CreatedAt,
                pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                scheduledTime: item.scheduledTime ?? item.ScheduledTime,
                isPaid: !!(item.isPaid ?? item.IsPaid),
            }));
        setRides(normalized);
    };

    const loadRelationshipDetails = async () => {
        if (!driverUserId) return;
        try {
            const [transporterRes, notifRes, outboundRes] = await Promise.all([
                apiClient.get(`/Transport/getDriverActiveTransporter?userId=${driverUserId}`),
                apiClient.get(`/Transport/getRelationshipNotifications?userId=${driverUserId}`),
                apiClient.get(`/Transport/getDriverOutboundJoinRequests?userId=${driverUserId}`).catch(() => ({ data: [] }))
            ]);
            setActiveTransporter(transporterRes.data || { isIndependent: true });
            
            const newNotifications = Array.isArray(notifRes.data) ? notifRes.data : [];
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

                    if (n.message && n.message.startsWith('ASSIGN_SHIPMENT|')) {
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                            audio.volume = 0.8;
                            audio.play().catch(() => {});
                        } catch (e) {}
                    }

                }

                if (n.message && (n.message.startsWith('RIDE_CANCELLED_BY_CUSTOMER|') || n.message.startsWith('RIDE_CANCELLED_BY_TRANSPORTER|'))) {
                    if (!handledCancellationNotifIdsRef.current.has(n.id)) {
                        handledCancellationNotifIdsRef.current.add(n.id);
                        apiClient.post(`/Transport/markNotificationRead?notificationId=${n.id}`).catch(() => {});

                        const parts = n.message.split('|');
                        const bId = Number(parts[1]);
                        const cancellerName = parts[2] || 'User';
                        const role = n.message.startsWith('RIDE_CANCELLED_BY_CUSTOMER|') ? 'Customer' : 'Transporter';

                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                            audio.volume = 0.8;
                            audio.play().catch(() => {});
                        } catch (e) {}

                        alert(`Shipment #${bId} was cancelled by ${role} (${cancellerName}).`);
                        
                        setActiveRequestPopup((prev: any) => (prev && Number(prev.id) === bId ? null : prev));
                        refreshRides();
                    }
                }
            });

            lastSeenNotifIdsRef.current = new Set(newNotifications.map((n: any) => n.id));
            setRelationshipRequests(newNotifications);
            setOutboundJoinRequests(Array.isArray(outboundRes.data) ? outboundRes.data : []);
        } catch (err) {
            console.error("Failed to load driver relationship data:", err);
        }
    };

    const handleSendJoinRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transporterEmail.trim()) return;
        setSendingJoin(true);
        try {
            await apiClient.post(`/Transport/sendJoinRequest?driverUserId=${driverUserId}&transporterEmail=${transporterEmail}`);
            alert("Join request sent to transporter successfully!");
            setTransporterEmail('');
            loadRelationshipDetails();
        } catch (err: any) {
            console.error("Failed to send join request:", err);
            alert(err?.response?.data || err?.response?.data?.message || "Failed to send join request.");
        } finally {
            setSendingJoin(false);
        }
    };

    const handleAcceptRelationship = async (notifId: string) => {
        try {
            await apiClient.post(`/Transport/acceptRequest?notificationId=${notifId}`);
            alert("Invitation accepted successfully! You are now linked to this transporter.");
            loadRelationshipDetails();
            refreshRides();
        } catch (err: any) {
            alert(err?.response?.data || "Failed to accept invitation.");
        }
    };

    const handleRejectRelationship = async (notifId: string) => {
        try {
            await apiClient.post(`/Transport/rejectRequest?notificationId=${notifId}`);
            alert("Invitation declined.");
            loadRelationshipDetails();
        } catch (err: any) {
            alert(err?.response?.data || "Failed to decline invitation.");
        }
    };

    const handleSendLeaveRequest = async () => {
        if (!window.confirm("Are you sure you want to request to leave this transporter? Your transporter must approve the release before you become independent.")) {
            return;
        }
        try {
            await apiClient.post(`/Transport/sendLeaveRequest?driverUserId=${driverUserId}`);
            alert("Leave request sent to transporter. Awaiting their release confirmation.");
            loadRelationshipDetails();
        } catch (err: any) {
            console.error("Failed to send leave request:", err);
        }
    };

    const hasActiveDelivery = useMemo(() => {
        return rides.some(r => r.rideStatus && ['driver_assigned', 'driver_arriving', 'ride_started'].includes(r.rideStatus));
    }, [rides]);

    const handleToggleOnline = async () => {
        if (hasActiveDelivery && isTracking) {
            const activeRide = rides.find(r => r.rideStatus && ['driver_assigned', 'driver_arriving', 'ride_started'].includes(r.rideStatus));
            alert(`⚠️ Location tracking cannot be turned off while delivering an active shipment (Ride #${activeRide?.id || ''}). Please complete or cancel your active delivery first.`);
            return;
        }

        const nextState = !isTracking;
        if (!nextState) {
            const confirmed = window.confirm("Are you sure you want to turn off your online status?");
            if (!confirmed) return;
        }
        setIsTracking(nextState);
        const vehicleId = activeVehicleId;
        try {
            const driverUserId = user?.userId || user?.id || user?.UserId || '';
            await apiClient.post(`/Transport/toggleDriverOnlineStatus?vehicleId=${vehicleId || ''}&isOnline=${nextState}&driverUserId=${driverUserId}`);
        } catch (err: any) {
            console.error("Failed to toggle online status on backend:", err);
            if (err?.response?.data?.message) {
                alert(err.response.data.message);
                setIsTracking(true);
            }
        }
    };

    const acceptRide = async (ride: RideItem) => {
        if (!driverUserId) {
            alert('Driver user id is missing for this account.');
            return;
        }

        setAcceptState('loading_route');

        // Simulate 1.5s route loading animation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setAcceptState('ready');

        // Simulate 1.5s navigation ready animation
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
            const res = await apiClient.post(`/Transport/acceptShipmentAsDriver?driverUserId=${driverUserId}&bookingId=${ride.id}`);
            alert(res.data?.message || res.data?.Message || 'Shipment accepted successfully!');
            await refreshRides();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data || 'Unable to accept shipment.');
        } finally {
            setAcceptState('idle');
        }
    };

    const rejectRide = async (ride: RideItem) => {
        if (!driverUserId) {
            alert('Driver user id is missing for this account.');
            return;
        }

        try {
            const res = await apiClient.patch(`/Vehicle/${ride.id}/rideRequest/reject`, null, {
                params: { driverUserId },
            });
            alert(res.data?.message || res.data?.Message || 'Ride rejected.');
            await refreshRides();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Unable to reject ride.');
        }
    };

    const advanceRideStatus = async (ride: RideItem, nextStatus: RideStatus) => {
        try {
            const params: any = { status: nextStatus };
            if (nextStatus === 'driver_assigned' && driverId) {
                params.driverId = driverId;
            }
            if (nextStatus === 'cancelled') {
                params.cancelledBy = 'Driver';
            }

            const res = await apiClient.patch(`/Vehicle/${ride.id}/rideStatus`, null, { params });
            alert(res.data?.message || res.data?.Message || 'Ride status updated.');
            await refreshRides();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Ride status update failed.');
        }
    };

    const reportRideIssue = async (ride: RideItem) => {
        const description = (disputeDrafts[ride.id] || '').trim();
        if (!description) {
            alert('Please write issue details first.');
            return;
        }

        try {
            const payload = {
                rideId: ride.id,
                issueType: 'ride_issue',
                description,
                createdBy: appUserId,
            };
            const res = await apiClient.post('/Dispute/reportRideIssue', payload);
            alert(res.data?.message || res.data?.Message || 'Ride issue reported.');
            setDisputeDrafts((prev) => ({ ...prev, [ride.id]: '' }));
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Unable to report ride issue.');
        }
    };

    const { logout: authContextLogout } = useAuth();

    const handleLogout = async () => {
        try {
            await disablePushNotifications();
            await logoutFirebaseAuth();
        } catch (error) {
            console.error('Logout cleanup failed', error);
        }
        authContextLogout();
        navigate('/login');
    };

    if (!user) return null;

    const isVerificationPending = user?.profileStatus === 'PENDING' || user?.profileStatus === 'SUBMITTED' || user?.ProfileStatus === 'PENDING' || user?.ProfileStatus === 'SUBMITTED';

    if (isVerificationPending) {
        return (
            <VerificationPendingGuard
                roleName="Driver"
                userName={user?.firstName || user?.name}
                onRefreshStatus={() => {
                    window.location.reload();
                }}
            />
        );
    }

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
                        <button
                            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'overview' ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <LayoutDashboard className={`h-5 w-5 ${activeTab === 'overview' ? 'text-primary-600' : ''}`} />
                            Overview
                        </button>
                        <button
                            onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'wallet' ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <Wallet className={`h-5 w-5 ${activeTab === 'wallet' ? 'text-primary-600' : ''}`} />
                            My Wallet
                        </button>
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-100">
                    <nav className="space-y-2 mb-6">
                        <button 
                            onClick={() => setSettingsExpanded(!settingsExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <Settings className="h-5 w-5" />
                                <span>Settings</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${settingsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {settingsExpanded && (
                            <div className="pl-4 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                                <button 
                                    onClick={() => { navigate('/profile?tab=profile'); setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left"
                                >
                                    <User className="h-4 w-4 text-slate-400" />
                                    Profile Info
                                </button>
                                <button 
                                    onClick={() => { navigate('/profile?tab=payments'); setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left"
                                >
                                    <CreditCard className="h-4 w-4 text-slate-400" />
                                    Wallet & Payments
                                </button>
                                <button 
                                    onClick={() => { navigate('/profile?tab=preferences'); setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left"
                                >
                                    <Bell className="h-4 w-4 text-slate-400" />
                                    Preferences & Alerts
                                </button>
                                <button 
                                    onClick={() => { navigate('/profile?tab=security'); setSidebarOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left"
                                >
                                    <Key className="h-4 w-4 text-slate-400" />
                                    Security & Access
                                </button>
                            </div>
                        )}
                    </nav>

                    <div onClick={() => navigate('/profile')} className="bg-slate-50 hover:bg-indigo-50/50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 cursor-pointer transition-all">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                            {(user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'D').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName || user?.name || 'Driver'}</p>
                            <p className="text-xs text-slate-500 truncate">DRIVER</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-slate-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
                {(user?.profileStatus === 'PENDING' || user?.profileStatus === 'SUBMITTED' || user?.profileVerified === false) && (
                    <VerificationPendingGuard 
                        roleName="Driver" 
                        userName={user?.firstName || user?.name || 'Driver'} 
                        onRefreshStatus={() => window.location.reload()} 
                    />
                )}
                {/* Mobile Header Bar */}
                <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Menu className="h-6 w-6 text-white" />
                    </button>
                    <span className="font-extrabold tracking-tight">Navgatix</span>
                    <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 text-sm cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all">
                        {(user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'D').toUpperCase()}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto relative p-6 md:p-8 max-w-7xl w-full mx-auto">
                    <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 text-white z-0">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c159bf?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                    </div>

                    <div className="relative z-10">
                    {(activeTab === 'overview' || activeTab === 'shipments') && (
                        <div className="space-y-8">
                            <header className="flex justify-between items-end mb-10 h-24">
                                <div className="text-white space-y-1">
                                    <p className="text-indigo-200 font-bold tracking-wide text-sm uppercase">Hii, {user?.firstName || user?.name || 'Driver'}</p>
                                    <h1 className="text-3xl font-extrabold tracking-tight">Driver Control Panel</h1>
                                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold bg-white/10 px-3 py-1 rounded-full w-fit backdrop-blur-sm">
                                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                                        <span>Rating: {driverRating.averageRating.toFixed(1)} / 5.0 ({driverRating.totalRatings} reviews)</span>
                                    </div>
                                </div>
                            </header>
                            
                            {relationshipRequests.some(n => n.message && n.message.startsWith('VEHICLE_ASSIGN|')) && (
                                <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 text-white rounded-2xl p-5 mb-8 relative z-10 shadow-lg border border-indigo-700/50 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-1">
                                        <h4 className="font-extrabold text-base flex items-center gap-2">🚛 Vehicle Assigned</h4>
                                        <p className="text-sm text-indigo-100 font-medium">
                                            The company has assigned vehicle: <span className="font-bold text-yellow-300">{relationshipRequests.find(n => n.message && n.message.startsWith('VEHICLE_ASSIGN|'))?.message.split('|')[1]}</span> to you.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const notif = relationshipRequests.find(n => n.message && n.message.startsWith('VEHICLE_ASSIGN|'));
                                            if (notif) {
                                                 await apiClient.post(`/Transport/rejectRequest?notificationId=${notif.id}`); // dismisses notif
                                                 loadRelationshipDetails();
                                            }
                                        }}
                                        className="bg-white/20 hover:bg-white/30 border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            )}

                            <div className="mb-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                                    <p className="text-indigo-200">Current ride controls, ride history, wallet summary, withdrawals, and issue reporting.</p>
                                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 shadow-lg">
                                        <div className="flex flex-col items-end">
                                            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                                                {hasActiveDelivery && <Lock className="w-3 h-3 text-amber-300 fill-amber-300/30" />}
                                                <span>Driver Online Status</span>
                                            </p>
                                            <p className={`text-sm font-bold ${isTracking ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                {isTracking ? 'LIVE & ONLINE' : 'OFFLINE'}
                                                {hasActiveDelivery && <span className="text-[10px] text-amber-300 font-extrabold ml-1 uppercase">(LOCKED ACTIVE)</span>}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={handleToggleOnline}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTracking ? 'bg-emerald-500' : 'bg-white/20'} ${hasActiveDelivery ? 'ring-2 ring-amber-400/50' : ''}`}
                                            title={hasActiveDelivery ? 'Location tracking is locked ON during active shipment delivery' : 'Toggle Online/Offline status'}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isTracking ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                             </div>

                             {/* Wallet Summary Stats Grid */}
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8 relative z-10">
                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                     <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Current Balance</p>
                                     <h3 className="text-xl font-black text-slate-900">{toCurrency(wallet?.currentBalance)}</h3>
                                     <Wallet className="h-5 w-5 text-emerald-600 mt-2" />
                                 </div>
                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                     <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Today's Earnings</p>
                                     <h3 className="text-xl font-black text-slate-900">{toCurrency(wallet?.totalEarnings)}</h3>
                                     <DollarSign className="h-5 w-5 text-blue-600 mt-2" />
                                 </div>
                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-purple-600">
                                     <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Today's KM Driven</p>
                                     <h3 className="text-xl font-black text-purple-700">{(driverSummaryCard?.todaysTotalKm || 0).toFixed(1)} km</h3>
                                     <Route className="h-5 w-5 text-purple-600 mt-2" />
                                 </div>
                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                     <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Ride Payments</p>
                                     <h3 className="text-xl font-black text-slate-900">{toCurrency(wallet?.totalRidePayments)}</h3>
                                     <Truck className="h-5 w-5 text-indigo-600 mt-2" />
                                 </div>
                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                     <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Pending Payouts</p>
                                     <h3 className="text-xl font-black text-slate-900">{wallet?.pendingWithdrawalCount || 0}</h3>
                                     <p className="text-[10px] text-slate-500 mt-0.5">{toCurrency(wallet?.pendingWithdrawalAmount)}</p>
                                     <Clock className="h-5 w-5 text-amber-600 mt-1" />
                                 </div>
                             </div>

                            {/* Transporter Relationship Control Panel */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 relative z-10 space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Transporter Fleet Connection</h3>
                                    <p className="text-slate-500 text-xs mt-0.5">Manage your active transporter link, outbound join requests, and inbound invitations.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    {/* Active Transporter Card */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active Link</p>
                                            {activeTransporter?.isIndependent ? (
                                                <div className="space-y-1">
                                                    <p className="font-extrabold text-slate-900 text-base">Working Independently</p>
                                                    <p className="text-xs text-slate-500 font-medium">You are currently self-employed. Enter a transporter email on the right to send a request.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p className="font-extrabold text-slate-900 text-base">{activeTransporter?.companyName || 'Linked Transporter'}</p>
                                                    <p className="text-xs text-slate-500 font-medium">Email: {activeTransporter?.email}</p>
                                                    <p className="text-xs text-slate-500 font-medium">Phone: {activeTransporter?.phone || 'N/A'}</p>
                                                </div>
                                            )}
                                        </div>

                                        {!activeTransporter?.isIndependent && (
                                            <div className="pt-4 border-t border-slate-200/60 mt-4 flex items-center justify-between">
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                    Linked Active
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const transporterUserId = activeTransporter?.transporterUserId || '';
                                                            const driverUserId = user?.userId || user?.id || user?.UserId || '';
                                                            setDirectChatRoomName(`TransporterDriver_${transporterUserId}_${driverUserId}`);
                                                        }}
                                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        💬 Chat
                                                    </button>
                                                    <button
                                                        onClick={handleSendLeaveRequest}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        Leave Transporter
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Join Request Form / Invites List */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                                        {activeTransporter?.isIndependent ? (
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Request to Join Transporter</p>
                                                {outboundJoinRequests.length > 0 && (
                                                    <div className="space-y-2 mb-4">
                                                        <p className="text-xs text-amber-600 font-bold">⚠️ Pending Transporter Review</p>
                                                        {outboundJoinRequests.map(req => {
                                                            const parts = req.message.split('|');
                                                            const transporterEmail = parts[2];
                                                            return (
                                                                <div key={req.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                                                                    <p className="font-bold text-slate-800 truncate">Transporter: {transporterEmail}</p>
                                                                    <p className="text-slate-500 text-[10px]">Awaiting acceptance from the company.</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <form onSubmit={handleSendJoinRequest} className="space-y-3">
                                                    <input
                                                        type="email"
                                                        required
                                                        value={transporterEmail}
                                                        onChange={(e) => setTransporterEmail(e.target.value)}
                                                        placeholder="transporter@example.com"
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={sendingJoin}
                                                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-primary-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                                                    >
                                                        {sendingJoin ? 'Sending...' : 'Send Join Request'}
                                                    </button>
                                                </form>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Relationship Status</p>
                                                <p className="text-sm font-medium text-slate-700">Currently linked. If you wish to work for another transporter, click leave and await release approval.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Inbound Invitations from Transporters */}
                                {relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|') && !req.message.startsWith('ASSIGN_SHIPMENT|')).length > 0 && (
                                    <div className="border-t border-slate-100 pt-4 space-y-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inbound Invitations</p>
                                        <div className="space-y-2">
                                            {relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|') && !req.message.startsWith('ASSIGN_SHIPMENT|')).map(req => {
                                                const parts = req.message.split('|');
                                                const companyName = parts[3] || 'Transporter';
                                                const email = parts[2] || '';

                                                return (
                                                    <div key={req.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                                                        <div>
                                                            <p className="font-bold text-slate-900">{companyName}</p>
                                                            <p className="text-xs text-slate-500">wants to add you as a fleet driver ({email})</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleAcceptRelationship(req.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectRelationship(req.id)}
                                                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                                            >
                                                                Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(loadingWallet || loadingRides) && <p className="text-sm text-slate-500 mb-6">Loading driver data...</p>}

                             {assignedVehicleInfo && (
                                 <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
                                     <div className="flex items-center gap-4">
                                         <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                                             🚚
                                         </div>
                                         <div className="space-y-1">
                                             <div className="flex items-center gap-2">
                                                 <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-3 py-0.5 rounded-full border border-indigo-500/40">
                                                     Assigned Fleet Vehicle
                                                 </span>
                                             </div>
                                             <h3 className="text-xl font-black text-white">
                                                 {assignedVehicleInfo.vehicleName} <span className="text-indigo-400 font-mono">({assignedVehicleInfo.registrationNumber})</span>
                                             </h3>
                                             <p className="text-xs text-slate-300 font-medium">
                                                 Type: <span className="font-bold text-white">{assignedVehicleInfo.vehicleType || 'Truck'}</span>
                                                 {assignedVehicleInfo.bodyType ? ` • Body: ${assignedVehicleInfo.bodyType}` : ''}
                                                 {assignedVehicleInfo.tyreType ? ` • Tyres: ${assignedVehicleInfo.tyreType}` : ''}
                                                 {assignedVehicleInfo.capacity ? ` • Capacity: ${assignedVehicleInfo.capacity} Tons` : ''}
                                             </p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2 shrink-0">
                                         <span className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                                             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                             Active Vehicle Ready
                                         </span>
                                     </div>
                                 </div>
                             )}

                                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                                 <h3 className="text-lg font-bold text-slate-900 mb-4">Pending Ride Requests</h3>
                                {rideRequests.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                                        No pending ride requests for you right now.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {rideRequests.map((ride) => (
                                            <div key={ride.id} className="rounded-2xl border border-slate-200 p-5">
                                                 {/* Transporter Assignment vs Direct Customer Request Badge */}
                                                 {ride.isTransporterAssigned ? (
                                                     <div className="w-full bg-purple-50 border border-purple-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-purple-950 font-bold mb-3 shadow-sm">
                                                         <div className="flex items-center gap-2">
                                                             <span className="bg-purple-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                                 🏢 Assigned by Transporter
                                                             </span>
                                                             <span>Request by Customer ({ride.customerName || 'Customer'}) and assigned by your Transporter {ride.transporterName ? `(${ride.transporterName})` : ''}</span>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <div className="w-full bg-sky-50 border border-sky-200/80 rounded-xl p-2.5 flex items-center gap-2 text-xs text-sky-950 font-semibold mb-3">
                                                         <span className="bg-sky-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                             👤 Direct Customer Request
                                                         </span>
                                                         <span>Requested directly by Customer: {ride.customerName || 'Customer'}</span>
                                                     </div>
                                                 )}

                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <p className="text-base font-bold text-slate-900">Ride #{ride.id}</p>
                                                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                                                                Pending acceptance
                                                            </span>
                                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                                                                Fare: {toCurrency(ride.estimatedFare)}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-slate-600 space-y-1">
                                                            <p><span className="font-semibold text-slate-800">Pickup:</span> {ride.pickupAddress || 'N/A'}</p>
                                                            <p><span className="font-semibold text-slate-800">Drop:</span> {ride.dropAddress || 'N/A'}</p>
                                                            {currentPosition && ride.pickupLat && ride.pickupLng ? (
                                                                <p><span className="font-semibold text-indigo-600">Distance to Pickup:</span> {calculateDistance(currentPosition.lat, currentPosition.lng, ride.pickupLat, ride.pickupLng)} km</p>
                                                            ) : null}
                                                            {ride.pickupLat && ride.pickupLng && ride.dropLat && ride.dropLng ? (
                                                                <>
                                                                    <p><span className="font-semibold text-indigo-600">Distance to Destination:</span> {calculateDistance(ride.pickupLat, ride.pickupLng, ride.dropLat, ride.dropLng)} km</p>
                                                                    <p><span className="font-semibold text-indigo-600">Estimated Duration:</span> {getEstimatedTime(calculateDistance(ride.pickupLat, ride.pickupLng, ride.dropLat, ride.dropLng))}</p>
                                                                </>
                                                            ) : null}
                                                            <p><span className="font-semibold text-slate-800">Goods:</span> {ride.goodsType || 'N/A'}</p>
                                                            {ride.goodsWeight && ride.goodsWeight > 0 ? (
                                                                <p><span className="font-semibold text-slate-800">Weight:</span> {ride.goodsWeight} kg</p>
                                                            ) : null}
                                                            <p><span className="font-semibold text-slate-800">Estimated Fare:</span> {toCurrency(ride.estimatedFare)}</p>
                                                            {(ride.vehicleTypeName || ride.bodyTypeName || ride.tyreTypeName) && (
                                                                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                                                    <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">📋 Customer Vehicle Requirements:</p>
                                                                    {ride.vehicleTypeName && <p><span className="font-medium text-slate-600">Vehicle Type:</span> <span className="font-bold text-slate-900">{ride.vehicleTypeName}</span></p>}
                                                                    {ride.bodyTypeName && <p><span className="font-medium text-slate-600">Body Type:</span> <span className="font-bold text-slate-900">{ride.bodyTypeName}</span></p>}
                                                                    {ride.tyreTypeName && <p><span className="font-medium text-slate-600">Tyre Type:</span> <span className="font-bold text-slate-900">{ride.tyreTypeName}</span></p>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-3 sm:flex-row">
                                                        <button
                                                            onClick={() => acceptRide(ride)}
                                                            className="rounded-xl bg-emerald-600 text-white font-semibold px-6 py-3"
                                                        >
                                                            Accept Ride
                                                        </button>
                                                        <button
                                                            onClick={() => rejectRide(ride)}
                                                            className="rounded-xl border border-red-300 text-red-700 font-semibold px-6 py-3"
                                                        >
                                                            Reject Ride
                                                        </button>
                                                        <button
                                                            onClick={() => setChatBookingId(ride.id)}
                                                            className="rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold px-5 py-3 flex items-center gap-2 hover:bg-slate-50 transition-colors"
                                                        >
                                                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                                                            Chat
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mb-8">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Current Ride Status</h3>
                                    {currentRide ? (
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">Ride #{currentRide.id}</p>
                                                        <p className="text-xs text-slate-500 mt-1">Current status: {currentRide.rideStatus}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-700 border border-primary-200">
                                                            {currentRide.customerName || 'Assigned Customer'}
                                                        </span>
                                                        <button
                                                            onClick={() => setChatBookingId(currentRide.id)}
                                                            className="flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-bold hover:bg-emerald-500 transition-colors"
                                                        >
                                                            <MessageCircle className="h-3 w-3" /> Chat
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-2 text-sm text-slate-600">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="h-4 w-4 text-emerald-600 mt-0.5" />
                                                        <span>{currentRide.pickupAddress || 'Pickup location not available'}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                         <Route className="h-4 w-4 text-rose-600 mt-0.5" />
                                                         <span>{currentRide.dropAddress || 'Drop location not available'}</span>
                                                     </div>
                                                 </div>

                                             {/* Live Driver Navigation Map Card */}
                                             <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-4">
                                                 <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
                                                     <div className="flex items-center gap-2">
                                                         <span className="text-lg">{currentRide.rideStatus === 'ride_started' ? '🚩' : '📍'}</span>
                                                         <div>
                                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                 {currentRide.rideStatus === 'ride_started' ? 'Navigation to Drop Destination' : 'Navigation to Customer Pickup'}
                                                             </p>
                                                             {driverMetrics && (
                                                                 <p className="text-xs font-extrabold text-emerald-400">
                                                                     {driverMetrics.distanceKm} km • ~{driverMetrics.etaMins} mins
                                                                 </p>
                                                             )}
                                                         </div>
                                                     </div>
                                                     <button 
                                                         onClick={() => {
                                                             const targetLat = currentRide.rideStatus === 'ride_started' ? (currentRide.dropLat || 19.076) : (currentRide.pickupLat || 28.6139);
                                                             const targetLng = currentRide.rideStatus === 'ride_started' ? (currentRide.dropLng || 72.8777) : (currentRide.pickupLng || 77.209);
                                                             window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`, '_blank');
                                                         }}
                                                         className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1"
                                                     >
                                                         🗺️ Google Maps
                                                     </button>
                                                 </div>
                                                 <TrackingMap 
                                                     bookingId={currentRide.id}
                                                     pickupLat={currentRide.pickupLat || 28.6139}
                                                     pickupLng={currentRide.pickupLng || 77.2090}
                                                     dropLat={currentRide.dropLat || 19.0760}
                                                     dropLng={currentRide.dropLng || 72.8777}
                                                     rideStatus={currentRide.rideStatus}
                                                     onMetricsUpdate={(m: any) => setDriverMetrics(m)}
                                                 />
                                             </div>
                                            </div>

                                            {/* Navigation Quick Actions */}
                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    onClick={() => window.open('tel:+919999988888')}
                                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 transition-colors text-sm cursor-pointer"
                                                >
                                                    <Phone className="h-4 w-4" /> Call
                                                </button>
                                                <button
                                                    onClick={() => setChatBookingId(currentRide.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 transition-colors text-sm cursor-pointer"
                                                >
                                                    <MessageCircle className="h-4 w-4" /> Chat
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        setIsSosOpen(true);
                                                        if (activeTransporter && activeTransporter.transporterUserId) {
                                                            try {
                                                                const driverName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.userName || user?.name || 'Driver';
                                                                await apiClient.post(`/Transport/sendNotification?userId=${activeTransporter.transporterUserId}&title=${encodeURIComponent('SOS EMERGENCY')}&message=${encodeURIComponent(`SOS|${driverName}`)}`);
                                                            } catch (err) {
                                                                console.error("Failed to send SOS notification to transporter:", err);
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-3 transition-colors text-sm cursor-pointer"
                                                >
                                                    <AlertTriangle className="h-4 w-4 fill-white" /> SOS
                                                </button>
                                            </div>

                                            {/* Tactile Stepper display */}
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Journey Progress</p>
                                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 relative">
                                                    <span className={`px-2 py-0.5 rounded-full ${currentRide.rideStatus === 'driver_assigned' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Accepted</span>
                                                    <span className="text-slate-300">➔</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${currentRide.rideStatus === 'driver_arriving' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Loaded</span>
                                                    <span className="text-slate-300">➔</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${currentRide.rideStatus === 'ride_started' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Journey</span>
                                                    <span className="text-slate-300">➔</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${currentRide.rideStatus === 'ride_completed' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Delivered</span>
                                                </div>

                                                {/* Action Control Button */}
                                                {currentRide.rideStatus === 'driver_assigned' && (
                                                    <button
                                                        onClick={() => advanceRideStatus(currentRide, 'driver_arriving')}
                                                        className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 text-base tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer mb-2"
                                                    >
                                                        📦 Goods Loaded successfully
                                                    </button>
                                                )}

                                                {currentRide.rideStatus === 'driver_arriving' && (
                                                    <button
                                                        onClick={() => advanceRideStatus(currentRide, 'ride_started')}
                                                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 text-base tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer mb-2"
                                                    >
                                                        🚚 Start Journey
                                                    </button>
                                                )}

                                                {/* Driver Payment Collection Button (Advance & Post-Ride) */}
                                                {currentRide.rideStatus !== 'ride_completed' && (
                                                    <button
                                                        onClick={() => setShowPaymentCollectionModal(currentRide)}
                                                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 text-sm tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer mb-2 flex items-center justify-center gap-2"
                                                    >
                                                        💰 Collect Payment (Cash / UPI QR)
                                                    </button>
                                                )}

                                                {(currentRide.rideStatus === 'driver_assigned' || currentRide.rideStatus === 'driver_arriving') && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Are you sure you want to cancel this ride?")) {
                                                                await advanceRideStatus(currentRide, 'cancelled');
                                                            }
                                                        }}
                                                        className="w-full mt-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-3 text-sm tracking-wide transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                                                    >
                                                        🚫 Cancel Ride
                                                    </button>
                                                )}
                                            </div>

                                            {currentRide.rideStatus !== 'driver_assigned' && 
                                             currentRide.rideStatus !== 'driver_arriving' && 
                                             currentRide.rideStatus !== 'ride_started' && (
                                                <div className="text-center p-3 bg-slate-100 rounded-xl text-sm font-semibold text-slate-500">
                                                    Status: {currentRide.rideStatus}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                                            Accept a pending ride request first. After acceptance, the current ride and its status controls will appear here automatically.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <History className="h-5 w-5 text-slate-700" /> Ride History & Issue Reporting
                                </h3>

                                {rideHistory.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                                        No previous rides found for this driver yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {rideHistory.map((ride) => (
                                            <div key={ride.id} className="rounded-2xl border border-slate-200 p-5">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <p className="text-base font-bold text-slate-900">Ride #{ride.id}</p>
                                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                                {ride.rideStatus}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {ride.customerName || 'Customer not available'}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-slate-600 space-y-1">
                                                            <p><span className="font-semibold text-slate-800">Pickup:</span> {ride.pickupAddress || 'N/A'}</p>
                                                            <p><span className="font-semibold text-slate-800">Drop:</span> {ride.dropAddress || 'N/A'}</p>
                                                            <p><span className="font-semibold text-slate-800">Goods:</span> {ride.goodsType || 'N/A'}</p>
                                                            <p><span className="font-semibold text-slate-800">Fare:</span> {toCurrency(ride.finalFare || ride.estimatedFare)}</p>
                                                            {ride.rideStatus === 'ride_completed' && (
                                                                <div className="mt-2">
                                                                    {ride.isPaid ? (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-inset ring-emerald-600/25">
                                                                            ✓ Paid (Wallet Credited)
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const fareAmount = ride.finalFare || ride.estimatedFare || 0;
                                                                                    await apiClient.post('/DriverFinance/ridePayment', {
                                                                                        rideId: ride.id,
                                                                                        amount: fareAmount,
                                                                                        paymentMode: 'Cash/Wallet',
                                                                                        transactionReference: `DirectWalletRecord-${ride.id}`
                                                                                    });
                                                                                    alert(`Payment recorded successfully! Rs. ${(fareAmount * 0.9).toFixed(2)} has been credited to your wallet (after 10% fee deduction).`);
                                                                                    await refreshRides();
                                                                                } catch (err: any) {
                                                                                    alert(err?.response?.data?.message || err?.response?.data?.Message || 'Payment recording failed.');
                                                                                }
                                                                            }}
                                                                            className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-1 animate-pulse"
                                                                        >
                                                                            💵 Proceed to Payment
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="w-full lg:w-[420px] space-y-3">
                                                        <textarea
                                                            value={disputeDrafts[ride.id] || ''}
                                                            onChange={(e) => setDisputeDrafts((prev) => ({ ...prev, [ride.id]: e.target.value }))}
                                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 min-h-[96px] resize-none"
                                                            placeholder="Report issue for this ride"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setChatBookingId(ride.id)}
                                                                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                                            >
                                                                <MessageCircle className="h-4 w-4" /> Chat
                                                            </button>
                                                            <button
                                                                onClick={() => reportRideIssue(ride)}
                                                                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                                            >
                                                                <Send className="h-4 w-4" /> Report Issue
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'wallet' && (
                        <div className="p-2">
                            <header className="flex justify-between items-end mb-10 h-24">
                                <div className="text-white">
                                    <p className="text-indigo-200 font-medium tracking-wide text-sm mb-1 uppercase">MY WALLET</p>
                                    <h1 className="text-3xl font-extrabold tracking-tight">Earnings & Finance</h1>
                                </div>
                            </header>
                            <DriverWallet userId={driverUserId} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-12 pb-20">
                            <header className="flex justify-between items-end mb-10 h-24">
                                <div className="text-white">
                                    <p className="text-indigo-200 font-medium tracking-wide text-sm mb-1 uppercase">SETTINGS</p>
                                    <h1 className="text-3xl font-extrabold tracking-tight">App Settings</h1>
                                </div>
                            </header>
                            <NotificationSettings role="driver" />
                            <div className="border-t border-slate-200 pt-12">
                                <SecuritySettings user={user} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>

            {/* Live Chat Panel */}
            {chatBookingId !== null && (
                <ChatPanel
                    bookingId={chatBookingId as number}
                    currentUserName={
                        user?.firstName ||
                        user?.name ||
                        user?.UserName ||
                        user?.userName ||
                        'Driver'
                    }
                    onClose={() => setChatBookingId(null)}
                />
            )}

            {directChatRoomName !== null && (
                <ChatPanel
                    roomName={directChatRoomName}
                    currentUserName={
                        user?.firstName ||
                        user?.name ||
                        user?.UserName ||
                        user?.userName ||
                        'Driver'
                    }
                    onClose={() => setDirectChatRoomName(null)}
                />
            )}

            {/* Route & Navigation Animation Overlay */}
            {acceptState !== 'idle' && (
                <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-slate-900/90 text-white p-6 animate-in fade-in duration-300">
                    <div className="relative flex items-center justify-center h-40 w-40 mb-6">
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping"></div>
                        <div className="absolute inset-4 bg-indigo-500/20 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 border-4 border-dashed border-indigo-400 rounded-full animate-spin [animation-duration:8s]"></div>
                        
                        <div className="relative z-10 w-20 h-20 bg-slate-800 rounded-full border border-slate-700 shadow-2xl flex items-center justify-center">
                            {acceptState === 'loading_route' ? (
                                <Route className="h-10 w-10 text-indigo-400 animate-bounce" />
                            ) : (
                                <span className="text-4xl text-emerald-400">✓</span>
                            )}
                        </div>
                    </div>

                    <div className="text-center max-w-sm space-y-2">
                        {acceptState === 'loading_route' ? (
                            <>
                                <h3 className="text-2xl font-black tracking-tight">Calculating Route...</h3>
                                <p className="text-slate-400 text-sm">Finding optimized route coordinates and traffic snapshot...</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-black tracking-tight text-emerald-400 animate-bounce">Navigation Ready!</h3>
                                <p className="text-slate-300 text-sm font-semibold">Redirecting to customer location...</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* SOS Emergency Modal */}
            {isSosOpen && (
                <div onClick={() => setIsSosOpen(false)} className="fixed inset-0 z-[3000] flex items-center justify-center bg-red-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-red-600 animate-in zoom-in duration-300">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle className="h-8 w-8 fill-red-100 text-red-600 animate-pulse" />
                            <h3 className="text-xl font-black tracking-tight">SOS EMERGENCY ALERT</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-800">
                                🚨 SOS Emergency Mode Active! Customer and support have been notified of your location. Help is on the way!
                            </p>
                            <p className="text-xs text-slate-500">
                                Your GPS location is currently being broadcasted with high priority to nearest support teams and dispatch centers. Keep your phone active.
                            </p>
                            <button
                                onClick={() => setIsSosOpen(false)}
                                className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 text-sm transition-all active:scale-[0.98] cursor-pointer"
                            >
                                Dismiss SOS Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Incoming Shipment Request Modal Pop-Up Alert */}
            {activeRequestPopup && (
                <div onClick={() => setActiveRequestPopup(null)} className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className={`px-6 py-5 flex items-center justify-between relative text-white ${
                            activeRequestPopup.isTransporterAssigned ? 'bg-gradient-to-r from-purple-700 to-indigo-800' : 'bg-gradient-to-r from-sky-700 to-indigo-700'
                        }`}>
                            <div>
                                <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full border ${
                                    activeRequestPopup.isTransporterAssigned
                                        ? 'text-amber-200 bg-amber-500/20 border-amber-400/30'
                                        : 'text-sky-200 bg-sky-500/20 border-sky-300/30'
                                }`}>
                                    {activeRequestPopup.isTransporterAssigned ? '🏢 Customer Request Assigned by Transporter' : '👤 Direct Customer Request'}
                                </span>
                                <h3 className="text-lg font-black mt-1.5 tracking-tight flex items-center gap-1.5">
                                    <span>Ride Request #{activeRequestPopup.id}</span>
                                </h3>
                                <p className="text-xs font-bold text-white/90 mt-1 flex items-center gap-1">
                                    <span>Source:</span>
                                    <span className="text-white font-extrabold underline">
                                        {activeRequestPopup.isTransporterAssigned 
                                            ? `Customer (${activeRequestPopup.customerName || 'Customer'}) • Assigned by Transporter (${activeRequestPopup.transporterName || 'Your Transporter'})`
                                            : `Customer (${activeRequestPopup.customerName || 'Direct Booking'})`}
                                    </span>
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setDismissedRequestIds(prev => ({ ...prev, [activeRequestPopup.id]: true }));
                                    setActiveRequestPopup(null);
                                }} 
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Request Source Banner Card */}
                            {activeRequestPopup.isTransporterAssigned ? (
                                <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-md">
                                        🏢
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">Fleet Order Assignment</span>
                                        <p className="text-xs font-bold text-purple-950">
                                            Request by Customer (<strong className="text-purple-700 font-extrabold">{activeRequestPopup.customerName || 'Customer'}</strong>) and assigned by your Transporter (<strong className="text-purple-700 font-extrabold">{activeRequestPopup.transporterName || 'your Transporter'}</strong>).
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-md">
                                        👤
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 block">Direct Customer Request</span>
                                        <p className="text-xs font-bold text-sky-950">
                                            Requested directly by Customer: <strong className="text-sky-700 font-extrabold">{activeRequestPopup.customerName || 'Direct Booking'}</strong>
                                        </p>
                                    </div>
                                </div>
                            )}
                            {/* Route Segment Card */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                                        <div className="w-0.5 flex-1 bg-dashed border-l-2 border-slate-300 my-0.5" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10" />
                                    </div>
                                    <div className="flex-1 space-y-3 text-xs">
                                        <div>
                                            <p className="font-extrabold text-slate-400 uppercase tracking-wide">Pickup Point</p>
                                            <p className="font-bold text-slate-800 text-sm mt-0.5">{activeRequestPopup.pickupAddress}</p>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-400 uppercase tracking-wide">Destination Drop</p>
                                            <p className="font-bold text-slate-800 text-sm mt-0.5">{activeRequestPopup.dropAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="space-y-3.5 text-sm text-slate-650 font-medium">
                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Estimated Fare Price</span>
                                    <span className="font-black text-lg text-emerald-600">₹ {activeRequestPopup.estimatedFare}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                    <span className="text-slate-400 font-semibold">Weight & Load Size</span>
                                    <span className="font-extrabold text-slate-900">{activeRequestPopup.goodsWeight || 0} Tons ({activeRequestPopup.goodsType || 'General Goods'})</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-semibold">Estimated Duration</span>
                                    <span className="font-bold text-slate-800">
                                        {(() => {
                                            const dist = activeRequestPopup.pickupLat && activeRequestPopup.pickupLng && activeRequestPopup.dropLat && activeRequestPopup.dropLng
                                                ? Math.max(1, Math.round(
                                                    Math.sqrt(
                                                        Math.pow(activeRequestPopup.pickupLat - activeRequestPopup.dropLat, 2) +
                                                        Math.pow(activeRequestPopup.pickupLng - activeRequestPopup.dropLng, 2)
                                                    ) * 111
                                                  ))
                                                : 15;
                                            return `~${Math.round(dist * 2.5)} mins (${dist} km)`;
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* Accept and Reject Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={async () => {
                                        setDismissedRequestIds(prev => ({ ...prev, [activeRequestPopup.id]: true }));
                                        setActiveRequestPopup(null);
                                        try {
                                            await rejectRide(activeRequestPopup);
                                        } catch (err) {
                                            console.error("Failed to reject ride:", err);
                                        }
                                    }}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl border border-slate-200 transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                                >
                                    Reject Request
                                </button>
                                <button
                                    onClick={async () => {
                                        setDismissedRequestIds(prev => ({ ...prev, [activeRequestPopup.id]: true }));
                                        setActiveRequestPopup(null);
                                        try {
                                            // Trigger advanced acceptance state animations
                                            setAcceptState('loading_route');
                                            await new Promise(r => setTimeout(r, 1500));
                                            setAcceptState('ready');
                                            await new Promise(r => setTimeout(r, 1000));
                                            
                                            // Call accept API
                                            await apiClient.post(`/Transport/acceptShipmentAsDriver?driverUserId=${driverUserId}&bookingId=${activeRequestPopup.id}`);
                                            
                                            // Complete assignment locally
                                            setAcceptState('idle');
                                            await refreshRides();
                                        } catch (err: any) {
                                            setAcceptState('idle');
                                            alert(err?.response?.data?.message || err?.response?.data || 'Unable to accept shipment.');
                                        }
                                    }}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer text-center text-sm"
                                >
                                    Accept Request
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
            {/* Post-Ride Driver Payment Collection Modal */}
            {showPaymentCollectionModal && (
                <div onClick={() => setShowPaymentCollectionModal(null)} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 relative">
                        <button 
                            onClick={() => setShowPaymentCollectionModal(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                        >
                            ✕
                        </button>
                        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
                            💰
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Collect Ride Payment</h3>
                            <p className="text-xs text-slate-500 mt-1">Select how customer is paying for Ride #{showPaymentCollectionModal.id}</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Ride Fare</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">₹{showPaymentCollectionModal.estimatedFare || showPaymentCollectionModal.finalFare || 0}</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            {/* Option 1: Cash Collected */}
                            <button
                                onClick={async () => {
                                    try {
                                        const pType = showPaymentCollectionModal.rideStatus === 'ride_started' ? 'PostRide' : 'Advance';
                                        await apiClient.post(`/Vehicle/${showPaymentCollectionModal.id}/processPayment?paymentMethod=COD&paymentType=${pType}`);
                                        const targetRide = showPaymentCollectionModal;
                                        setShowPaymentCollectionModal(null);
                                        if (targetRide.rideStatus === 'ride_started') {
                                            await advanceRideStatus(targetRide, 'ride_completed');
                                        } else {
                                            alert("Advance cash payment recorded successfully!");
                                            fetchDashboardData();
                                        }
                                    } catch(e) {
                                        console.error("Payment error:", e);
                                    }
                                }}
                                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                            >
                                💵 Cash Collected (COD)
                            </button>

                            {/* Option 2: Show Dynamic UPI QR Scanner */}
                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-xs font-bold text-slate-500 mb-2">OR Customer Pay via UPI QR:</p>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner mb-3">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=navgatix@bank%26pn=Navgatix%26am=${showPaymentCollectionModal.estimatedFare || 100}%26tr=${showPaymentCollectionModal.id}`}
                                        alt="UPI QR Scanner" 
                                        className="w-44 h-44 mx-auto rounded-xl"
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            const pType = showPaymentCollectionModal.rideStatus === 'ride_started' ? 'PostRide' : 'Advance';
                                            await apiClient.post(`/Vehicle/${showPaymentCollectionModal.id}/processPayment?paymentMethod=UPI&paymentType=${pType}`);
                                            const targetRide = showPaymentCollectionModal;
                                            setShowPaymentCollectionModal(null);
                                            if (targetRide.rideStatus === 'ride_started') {
                                                await advanceRideStatus(targetRide, 'ride_completed');
                                            } else {
                                                alert("Advance UPI payment confirmed!");
                                                fetchDashboardData();
                                            }
                                        } catch(e) {
                                            console.error("Payment error:", e);
                                        }
                                    }}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                                >
                                    📱 Confirm UPI Payment Received
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Mobile Bottom Quick Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 text-white shadow-2xl flex items-center justify-around py-2 px-1 pb-safe">
                <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'overview' ? 'text-primary-400' : 'text-slate-400'}`}>
                    <Home className="h-5 w-5" />
                    Home
                </button>
                <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'wallet' ? 'text-primary-400' : 'text-slate-400'}`}>
                    <Wallet className="h-5 w-5" />
                    Wallet
                </button>
                <button onClick={() => setActiveTab('shipments')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'shipments' ? 'text-primary-400' : 'text-slate-400'}`}>
                    <Package className="h-5 w-5" />
                    Shipments
                </button>
                <button onClick={() => navigate('/profile')} className={`flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-primary-400`}>
                    <User className="h-5 w-5" />
                    Profile
                </button>
            </div>
        </div>
    );
};

export default DriverDashboard;
