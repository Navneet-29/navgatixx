import { useEffect, useMemo, useState, useRef } from 'react';
import { DollarSign, Truck, Clock, Wallet, Send, MapPin, Route, History, MessageCircle, LayoutDashboard, LogOut, Settings, ChevronDown, CreditCard, Bell, Key, User, Star, Phone, AlertTriangle, X, QrCode, Banknote, CheckCircle2, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import ChatPanel from '../../components/ChatPanel';
import { disablePushNotifications } from '../../lib/firebaseMessaging';
import { logoutFirebaseAuth } from '../../lib/firebaseAuth';
import { useAuth } from '../../hooks/useAuth';
import DriverWallet from '../../components/DriverWallet';
import ProfilePage from '../ProfilePage';
import DriverRouteMap from '../../components/DriverRouteMap';

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
    ctVehicleType?: number;
    ctBodyType?: number;
    ctTyreType?: number;
    customerProfilePic?: string;
    assignedByTransporter?: boolean;
    transporterName?: string;
};

const ACTIVE_STATUSES: RideStatus[] = ['driver_assigned', 'driver_arriving', 'ride_started'];

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'rides' | 'wallet' | 'settings' | 'profile'>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [wallet, setWallet] = useState<any>(null);
    const [, setLoadingWallet] = useState(false);
    const [rideRequests, setRideRequests] = useState<RideItem[]>([]);
    const [rides, setRides] = useState<RideItem[]>([]);
    const [, setLoadingRides] = useState(false);
    const [disputeDrafts, setDisputeDrafts] = useState<Record<number, string>>({});
    const [isTracking, setIsTracking] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('driver_online_status');
            return saved !== null ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });
    const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
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
    const [commonTypesMap, setCommonTypesMap] = useState<Record<number, string>>({});
    const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
    const [assignedVehicle, setAssignedVehicle] = useState<{
        vehicleId: string;
        vehicleName?: string;
        vehicleNumber?: string;
        capacityTons?: number;
        rcNumber?: string;
        ctBodyType?: number;
        ctTyreType?: number;
        ctVehicleType?: number;
    } | null>(null);
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
    const [dismissedRequestIds, setDismissedRequestIds] = useState<Record<number, boolean>>({});
    const [paymentModalRide, setPaymentModalRide] = useState<RideItem | null>(null);
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'QR'>('QR');
    const [customPaymentAmount, setCustomPaymentAmount] = useState<string>('');
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);

    const prevRideRequestIdsRef = useRef<Set<number>>(new Set());

    const playNotificationAlertSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
            audio.volume = 0.8;
            audio.play().catch(() => {});
        } catch (e) {}
    };


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
                const formattedRequests = requestData
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
                        ctVehicleType: Number(item.ct_VehicleType ?? item.CT_VehicleType ?? item.cT_VehicleType ?? 0),
                        ctBodyType: Number(item.ctBodyType ?? item.CTBodyType ?? item.cTBodyType ?? 0),
                        ctTyreType: Number(item.ctTyreType ?? item.CTTyreType ?? item.cTTyreType ?? 0),
                        assignedByTransporter: !!(item.assignedByTransporter ?? item.AssignedByTransporter),
                        transporterName: item.transporterName ?? item.TransporterName,
                    }));

                // Check for new requests
                const currentReqIds = new Set(formattedRequests.map(r => r.id));
                const hasBrandNew = formattedRequests.some(r => !prevRideRequestIdsRef.current.has(r.id));
                if (hasBrandNew && prevRideRequestIdsRef.current.size > 0) {
                    playNotificationAlertSound();
                }
                prevRideRequestIdsRef.current = currentReqIds;
                setRideRequests(formattedRequests);

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
                        scheduledTime: item.scheduledTime ?? item.ScheduledTime,
                        isPaid: !!(item.isPaid ?? item.IsPaid),
                        pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                        pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                        dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                        dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                        goodsWeight: Number(item.goodsWeight ?? item.GoodsWeight ?? 0),
                    }));

                setRides(normalized);
            } catch (err) {
                console.error("Error loading rides:", err);
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
            const vId = res.data?.vehicleId || res.data?.VehicleId || null;
            setActiveVehicleId(vId);
            if (vId) {
                setAssignedVehicle({
                    vehicleId: vId,
                    vehicleName: res.data?.vehicleName || res.data?.VehicleName,
                    vehicleNumber: res.data?.vehicleNumber || res.data?.VehicleNumber,
                    capacityTons: res.data?.capacityTons || res.data?.CapacityTons,
                    rcNumber: res.data?.rcNumber || res.data?.RcNumber,
                    ctBodyType: res.data?.ctBodyType || res.data?.CtBodyType,
                    ctTyreType: res.data?.ctTyreType || res.data?.CtTyreType,
                    ctVehicleType: res.data?.ctVehicleType || res.data?.CtVehicleType
                });
            } else {
                setAssignedVehicle(null);
            }
        } catch (err) {
            console.error("Failed to load active vehicle ID:", err);
            setAssignedVehicle(null);
        }
    };

        const loadUserProfile = async () => {
            try {
                const res = await apiClient.get(`/User/getUserDetail/${driverUserId}`);
                if (res.data) {
                    setUser((prev: any) => ({
                        ...prev,
                        ...res.data,
                        profilePic: res.data.profilePic || res.data.ProfilePic || prev?.profilePic || prev?.ProfilePic,
                        name: res.data.name || res.data.firstName || prev?.name,
                        firstName: res.data.firstName || prev?.firstName
                    }));
                    if (typeof res.data.isOnline === 'boolean') {
                        setIsTracking(res.data.isOnline);
                        try {
                            localStorage.setItem('driver_online_status', JSON.stringify(res.data.isOnline));
                        } catch {}
                    }
                }
            } catch (err) {
                console.log("Note loading driver user profile:", err);
            }
        };

        const loadCommonTypes = async () => {
            try {
                const res = await apiClient.get('/CommonType/getall');
                const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
                const map: Record<number, string> = {};
                list.forEach((item: any) => {
                    const id = Number(item.id || item.Id);
                    const name = item.name || item.Name || '';
                    if (id && name) map[id] = name;
                });
                setCommonTypesMap(map);
            } catch (err) {
                console.error("Failed to load common types:", err);
            }
        };

        loadCommonTypes();
        loadUserProfile();
        loadWallet();
        loadRides();
        loadRelationshipDetails();
        loadRating();
        loadActiveVehicleId();
    }, [driverUserId]);

    // Poll ride requests and relationship notifications
    useEffect(() => {
        if (!driverUserId) return;

        const intervalId = setInterval(async () => {
            refreshRides();
            loadRelationshipDetails();
            loadActiveVehicle();
        }, 3000);
        return () => clearInterval(intervalId);
    }, [driverUserId]);

    // Track incoming requests to trigger pop-up modals (only when driver is Online / isTracking)
    useEffect(() => {
        if (isTracking && rideRequests.length > 0) {
            const activeReq = rideRequests.find(r => !dismissedRequestIds[r.id]);
            if (activeReq) {
                setActiveRequestPopup(activeReq);
            } else {
                setActiveRequestPopup(null);
            }
        } else {
            setActiveRequestPopup(null);
        }
    }, [rideRequests, dismissedRequestIds, isTracking]);

    // Background Geolocation Tracking (Always acquires high accuracy GPS when toggle is ON)
    useEffect(() => {
        if (!isTracking) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
                console.warn('Geolocation access warning:', err.message);
                // Fallback attempt to get one-time position
                navigator.geolocation.getCurrentPosition(
                    (p) => setCurrentPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
                    () => {}
                );
            },
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isTracking]);

    // Periodic Backend Ping (every 5 seconds) syncing driver live location to backend & customer tracking
    useEffect(() => {
        if (!driverUserId || !isTracking || !currentPosition) return;

        const interval = setInterval(async () => {
            try {
                const vehicleId = activeVehicleId;
                const activeBooking = rides.find(r => r.rideStatus && ACTIVE_STATUSES.includes(r.rideStatus));

                await apiClient.post('/Vehicle/saveLiveVehicleTracking', {
                    vehicleId: vehicleId || undefined,
                    bookingId: activeBooking?.id || undefined,
                    userId: driverUserId,
                    deviceId: 'driver-gps-web',
                    latitude: currentPosition.lat,
                    longitude: currentPosition.lng,
                    lastLatitude: currentPosition.lat,
                    lastLongitude: currentPosition.lng
                });
            } catch (err) {
                console.error('Driver live location ping failed:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [driverUserId, isTracking, currentPosition, activeVehicleId, rides]);

    const currentRide = useMemo(
        () => rides.find((ride) => ride.rideStatus && ACTIVE_STATUSES.includes(ride.rideStatus) && (ride.customerName || ride.pickupAddress || ride.dropAddress)) || null,
        [rides]
    );

    // Keep track of accumulated live GPS distance during active journeys
    const prevPositionRef = useRef<{ lat: number; lng: number } | null>(null);
    const [liveOdometerKm, setLiveOdometerKm] = useState<number>(() => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const stored = localStorage.getItem(`driver_odometer_${todayStr}`);
            return stored ? parseFloat(stored) : 0;
        } catch {
            return 0;
        }
    });

    useEffect(() => {
        if (!currentPosition || !isTracking) return;

        // If driver has an active ride and position moves, accumulate differential distance
        if (currentRide && prevPositionRef.current) {
            const distDelta = calculateDistance(
                prevPositionRef.current.lat,
                prevPositionRef.current.lng,
                currentPosition.lat,
                currentPosition.lng
            );

            // Filter out GPS jitter (< 15 meters) and teleport anomalies (> 50 km)
            if (distDelta >= 0.015 && distDelta < 50) {
                setLiveOdometerKm((prev) => {
                    const next = Math.round((prev + distDelta) * 100) / 100;
                    try {
                        const todayStr = new Date().toISOString().split('T')[0];
                        localStorage.setItem(`driver_odometer_${todayStr}`, String(next));
                    } catch {}
                    return next;
                });
            }
        }
        prevPositionRef.current = currentPosition;
    }, [currentPosition, isTracking, currentRide]);

    // Calculate total today's distance traveled (Completed rides today + live active progress distance)
    const todaysDistanceTraveledKm = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Completed rides today
        const completedDistToday = rides
            .filter(r => r.rideStatus === 'ride_completed' && r.createdAt && r.createdAt.startsWith(todayStr))
            .reduce((acc, r) => {
                if (r.pickupLat && r.pickupLng && r.dropLat && r.dropLng) {
                    return acc + calculateDistance(r.pickupLat, r.pickupLng, r.dropLat, r.dropLng);
                }
                return acc;
            }, 0);

        // 2. Active ride distance progress
        let activeRideDist = 0;
        if (currentRide) {
            if (currentRide.rideStatus === 'ride_started' && currentRide.pickupLat && currentRide.pickupLng && currentRide.dropLat && currentRide.dropLng) {
                const totalRouteDist = calculateDistance(currentRide.pickupLat, currentRide.pickupLng, currentRide.dropLat, currentRide.dropLng);
                if (currentPosition) {
                    const remainingDist = calculateDistance(currentPosition.lat, currentPosition.lng, currentRide.dropLat, currentRide.dropLng);
                    const progressed = Math.max(0, totalRouteDist - remainingDist);
                    activeRideDist = Math.max(progressed, liveOdometerKm);
                } else {
                    activeRideDist = liveOdometerKm;
                }
            } else if (currentRide.rideStatus === 'driver_arriving' && currentRide.pickupLat && currentRide.pickupLng) {
                if (currentPosition) {
                    activeRideDist = liveOdometerKm;
                }
            } else {
                activeRideDist = liveOdometerKm;
            }
        }

        const total = Math.max(completedDistToday + activeRideDist, liveOdometerKm);
        return Math.round(total * 10) / 10;
    }, [rides, currentRide, currentPosition, liveOdometerKm]);

    const activeRideProgressKm = useMemo(() => {
        if (!currentRide) return 0;
        if (currentRide.rideStatus === 'ride_started' && currentRide.pickupLat && currentRide.pickupLng && currentRide.dropLat && currentRide.dropLng) {
            const totalRouteDist = calculateDistance(currentRide.pickupLat, currentRide.pickupLng, currentRide.dropLat, currentRide.dropLng);
            if (currentPosition) {
                const remainingDist = calculateDistance(currentPosition.lat, currentPosition.lng, currentRide.dropLat, currentRide.dropLng);
                return Math.round(Math.max(0, totalRouteDist - remainingDist) * 10) / 10;
            }
        }
        return Math.round(liveOdometerKm * 10) / 10;
    }, [currentRide, currentPosition, liveOdometerKm]);

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
        const formattedRequests = requestData
            .filter((item) => item?.Id || item?.id)
            .map((item) => ({
                id: Number(item.id ?? item.Id),
                customerName: item.customerName ?? item.CustomerName,
                customerProfilePic: item.customerProfilePic ?? item.CustomerProfilePic,
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
                ctVehicleType: item.ctVehicleType ?? item.CT_VehicleType ?? item.ct_VehicleType,
                ctBodyType: item.ctBodyType ?? item.CTBodyType ?? item.ct_BodyType,
                ctTyreType: item.ctTyreType ?? item.CTTyreType ?? item.ct_TyreType,
                assignedByTransporter: !!(item.assignedByTransporter ?? item.AssignedByTransporter),
                transporterName: item.transporterName ?? item.TransporterName,
            }));

        const currentReqIds = new Set(formattedRequests.map(r => r.id));
        const hasBrandNew = formattedRequests.some(r => !prevRideRequestIdsRef.current.has(r.id));
        if (hasBrandNew && prevRideRequestIdsRef.current.size > 0) {
            playNotificationAlertSound();
        }
        prevRideRequestIdsRef.current = currentReqIds;
        setRideRequests(formattedRequests);

        const res = await apiClient.get(`/Vehicle/driverRides/${driverUserId}`);
        const data = Array.isArray(res.data) ? res.data : [];
        const normalized = data
            .filter((item) => item?.Id || item?.id)
            .map((item) => ({
                id: Number(item.id ?? item.Id),
                customerName: item.customerName ?? item.CustomerName,
                customerProfilePic: item.customerProfilePic ?? item.CustomerProfilePic,
                pickupAddress: item.pickupAddress ?? item.PickupAddress,
                dropAddress: item.dropAddress ?? item.DropAddress,
                goodsType: item.goodsType ?? item.GoodsType,
                estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                finalFare: Number(item.finalFare ?? item.FinalFare ?? 0),
                rideStatus: (item.rideStatus ?? item.RideStatus ?? 'request_for_ride') as RideStatus,
                createdAt: item.createdAt ?? item.CreatedAt,
                scheduledTime: item.scheduledTime ?? item.ScheduledTime,
                isPaid: !!(item.isPaid ?? item.IsPaid),
                pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                goodsWeight: Number(item.goodsWeight ?? item.GoodsWeight ?? 0),
                ctVehicleType: item.ctVehicleType ?? item.CT_VehicleType ?? item.ct_VehicleType,
                ctBodyType: item.ctBodyType ?? item.CTBodyType ?? item.ct_BodyType,
                ctTyreType: item.ctTyreType ?? item.CTTyreType ?? item.ct_TyreType,
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
                    playNotificationAlertSound();
                    if (n.message && (n.message.startsWith('CHAT_MESSAGE|') || n.message.startsWith('CHAT_MESSAGE_DIRECT|'))) {
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
                    } else if (n.message && (n.message.startsWith('VEHICLE_ASSIGN|') || n.message.startsWith('VEHICLE_UNASSIGN|'))) {
                        const parts = n.message.split('|');
                        const info = parts[1] || '';
                        const isAssign = n.message.startsWith('VEHICLE_ASSIGN|');
                        setChatToast({
                            id: n.id,
                            senderName: isAssign ? '🚚 Vehicle Assigned' : '⚠️ Vehicle Unassigned',
                            messageText: isAssign ? `Assigned to: ${info}` : info
                        });
                        // Immediately refresh active vehicle state without full page refresh
                        try {
                            apiClient.get(`/Transport/getDriverActiveVehicle?userId=${driverUserId}`).then(res => {
                                const vId = res.data?.vehicleId || res.data?.VehicleId || null;
                                setActiveVehicleId(vId);
                                if (vId) {
                                    setAssignedVehicle({
                                        vehicleId: vId,
                                        vehicleName: res.data?.vehicleName || res.data?.VehicleName,
                                        vehicleNumber: res.data?.vehicleNumber || res.data?.VehicleNumber,
                                        capacityTons: res.data?.capacityTons || res.data?.CapacityTons,
                                        rcNumber: res.data?.rcNumber || res.data?.RcNumber,
                                        ctBodyType: res.data?.ctBodyType || res.data?.CtBodyType,
                                        ctTyreType: res.data?.ctTyreType || res.data?.CtTyreType,
                                        ctVehicleType: res.data?.ctVehicleType || res.data?.CtVehicleType
                                    });
                                } else {
                                    setAssignedVehicle(null);
                                }
                            });
                        } catch (e) {}
                    } else if (n.message && n.message.startsWith('RIDE_CANCELLED|')) {
                        const parts = n.message.split('|');
                        const info = parts[2] || parts[1] || 'Ride cancelled';
                        setChatToast({
                            id: n.id,
                            senderName: '⚠️ Ride Cancelled',
                            messageText: info
                        });
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

    const loadActiveVehicle = async () => {
        if (!driverUserId) return;
        try {
            const res = await apiClient.get(`/Transport/getDriverActiveVehicle?userId=${driverUserId}`);
            const vId = res.data?.vehicleId || res.data?.VehicleId || null;
            setActiveVehicleId(vId);
            if (vId) {
                setAssignedVehicle({
                    vehicleId: vId,
                    vehicleName: res.data?.vehicleName || res.data?.VehicleName,
                    vehicleNumber: res.data?.vehicleNumber || res.data?.VehicleNumber,
                    capacityTons: res.data?.capacityTons || res.data?.CapacityTons,
                    rcNumber: res.data?.rcNumber || res.data?.RcNumber,
                    ctBodyType: res.data?.ctBodyType || res.data?.CtBodyType,
                    ctTyreType: res.data?.ctTyreType || res.data?.CtTyreType,
                    ctVehicleType: res.data?.ctVehicleType || res.data?.CtVehicleType
                });
            } else {
                setAssignedVehicle(null);
            }
        } catch (err) {
            console.error("Failed to load active vehicle ID:", err);
            setAssignedVehicle(null);
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
            alert(err?.response?.data || err?.response?.data?.message || "Failed to request leave.");
        }
    };
    const handleToggleOnline = async () => {
        const nextState = !isTracking;
        if (!nextState) {
            const confirmed = window.confirm("Are you sure you want to turn off your online status?");
            if (!confirmed) return;
        }
        setIsTracking(nextState);
        try {
            localStorage.setItem('driver_online_status', JSON.stringify(nextState));
        } catch {}
        const vehicleId = activeVehicleId;
        try {
            const driverUserId = user?.userId || user?.id || user?.UserId || '';
            await apiClient.post(`/Transport/toggleDriverOnlineStatus?vehicleId=${vehicleId || ''}&isOnline=${nextState}&driverUserId=${driverUserId}`);
        } catch (err) {
            console.error("Failed to toggle online status on backend:", err);
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

            const res = await apiClient.patch(`/Vehicle/${ride.id}/rideStatus`, null, { params });
            alert(res.data?.message || res.data?.Message || 'Ride status updated.');
            await refreshRides();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Ride status update failed.');
        }
    };



    /* requestWithdrawal handled via DriverWallet component */

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

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shrink-0">
                            {user?.profilePic || user?.ProfilePic ? (
                                <img 
                                    src={
                                        (user.profilePic || user.ProfilePic).startsWith('http') || (user.profilePic || user.ProfilePic).startsWith('data:')
                                            ? (user.profilePic || user.ProfilePic)
                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${(user.profilePic || user.ProfilePic).startsWith('/') ? '' : '/'}${user.profilePic || user.ProfilePic}`
                                    } 
                                    alt="Driver" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <span>{user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'D'}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName || user?.name || 'Driver'}</p>
                            <p className="text-xs text-slate-500 truncate text-uppercase">DRIVER</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
                {/* Mobile Header Bar */}
                <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-40 shadow-md relative">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                            <Truck className="text-white h-4 w-4" />
                        </div>
                        <span className="font-extrabold tracking-tight text-xl">Navgatix</span>
                    </div>
                    
                    {/* Circle Avatar with Dropdown Toggle */}
                    <div className="relative">
                        <button 
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            title="Account & Settings"
                            className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-primary-500 flex items-center justify-center text-white font-black border-2 border-white/40 shadow-md active:scale-90 transition-all text-xs cursor-pointer"
                        >
                            {user?.profilePic || user?.ProfilePic ? (
                                <img 
                                    src={
                                        (user.profilePic || user.ProfilePic).startsWith('http') || (user.profilePic || user.ProfilePic).startsWith('data:')
                                            ? (user.profilePic || user.ProfilePic)
                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${(user.profilePic || user.ProfilePic).startsWith('/') ? '' : '/'}${user.profilePic || user.ProfilePic}`
                                    } 
                                    alt="Driver" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <span>{user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'D'}</span>
                            )}
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
                                            {user?.firstName || user?.name || 'Driver Account'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {user?.email || user?.phoneNumber || 'Driver'}
                                        </p>
                                    </div>

                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setActiveTab('profile');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                                        >
                                            <User className="h-4 w-4 text-indigo-600" /> Profile Info
                                        </button>

                                        <button
                                            onClick={() => {
                                                setActiveTab('wallet');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                                        >
                                            <Wallet className="h-4 w-4 text-indigo-600" /> Wallet & Earnings
                                        </button>

                                        <button
                                            onClick={() => {
                                                setActiveTab('settings');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                                        >
                                            <Bell className="h-4 w-4 text-indigo-600" /> Notification Settings
                                        </button>

                                        <button
                                            onClick={() => {
                                                setActiveTab('settings');
                                                setProfileDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                                        >
                                            <Key className="h-4 w-4 text-indigo-600" /> Security & Password
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

                <div className="flex-1 overflow-y-auto relative px-3 sm:px-4 py-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
                    <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 text-white z-0">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c159bf?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                    </div>

                    <div className="relative z-10">
                    {activeTab === 'overview' && (
                        <>
                            <header className="flex justify-between items-end mb-8 h-24">
                                <div className="text-white space-y-1">
                                    <p className="text-indigo-200 font-bold tracking-wide text-sm uppercase">Hii, {user?.firstName || user?.name || 'Driver'}</p>
                                    <h1 className="text-3xl font-extrabold tracking-tight">Driver Control Panel</h1>
                                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold bg-white/10 px-3 py-1 rounded-full w-fit backdrop-blur-sm">
                                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                                        <span>Rating: {driverRating.averageRating.toFixed(1)} / 5.0 ({driverRating.totalRatings} reviews)</span>
                                    </div>
                                </div>
                            </header>

                            {/* Prominent Inbound Transporter Invitations Banner at Top */}
                            {relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|') && !req.message.startsWith('VEHICLE_ASSIGN|') && !req.message.startsWith('VEHICLE_UNASSIGN|')).map(req => {
                                const parts = req.message.split('|');
                                const companyName = parts[3] || 'Transporter';
                                const email = parts[2] || '';
                                return (
                                    <div key={req.id} className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 mb-6 relative z-10 shadow-xl border border-blue-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-blue-200 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                                                Fleet Invitation
                                            </span>
                                            <h4 className="font-extrabold text-base flex items-center gap-2 mt-1">
                                                <span>🏢 {companyName}</span>
                                            </h4>
                                            <p className="text-xs text-blue-100 font-medium">
                                                Invited you to join their fleet ({email}). Accept to connect with this transporter.
                                            </p>
                                        </div>
                                        <div className="flex gap-2.5 shrink-0">
                                            <button 
                                                onClick={() => handleRejectRelationship(req.id)}
                                                className="bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                                            >
                                                Decline
                                            </button>
                                            <button 
                                                onClick={() => handleAcceptRelationship(req.id)}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                                            >
                                                Accept Invitation
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Prominent Incoming Customer Ride Requests Banner at Top */}
                            {rideRequests.length > 0 && (
                                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 mb-6 relative z-10 shadow-xl border border-emerald-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="animate-ping h-2 w-2 rounded-full bg-yellow-300" />
                                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-100 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                                                {rideRequests.length === 1 ? 'New Incoming Ride Request' : `${rideRequests.length} New Ride Requests Available`}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-base truncate">
                                            {rideRequests[0].pickupAddress} ➔ {rideRequests[0].dropAddress}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100 font-bold">
                                            <span>Fare: <strong className="text-yellow-300 text-sm">{toCurrency(rideRequests[0].estimatedFare)}</strong></span>
                                            <span>•</span>
                                            <span>Goods: {rideRequests[0].goodsType || 'General Freight'}</span>
                                            {rideRequests[0].goodsWeight ? (
                                                <>
                                                    <span>•</span>
                                                    <span>{rideRequests[0].goodsWeight} kg</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex gap-2.5 shrink-0">
                                        <button 
                                            onClick={() => setActiveRequestPopup(rideRequests[0])}
                                            className="bg-white/20 hover:bg-white/30 border border-white/25 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                                        >
                                            View Details
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const req = rideRequests[0];
                                                setDismissedRequestIds(prev => ({ ...prev, [req.id]: true }));
                                                setActiveRequestPopup(null);
                                                acceptRide(req);
                                            }}
                                            className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-yellow-500/30 transition-all cursor-pointer"
                                        >
                                            Accept Immediately
                                        </button>
                                    </div>
                                </div>
                            )}
                            
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

                            {/* Driver Online / Tracking Status Card (Single Consolidated Control) at top */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6 relative z-10 space-y-4">
                                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 text-sm md:text-base">Driver Online Status</p>
                                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase border ${isTracking ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {isTracking ? 'Online & Available' : 'Offline'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">Toggle whether you are available to receive and accept load assignments.</p>
                                    </div>
                                    <button 
                                        onClick={handleToggleOnline}
                                        className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer flex-shrink-0 ${isTracking ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                    </button>
                                </div>

                                {/* Active Assigned Vehicle Badge / Banner on Main Screen */}
                                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    assignedVehicle?.vehicleNumber 
                                        ? 'bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50 border-indigo-100/80' 
                                        : 'bg-amber-50/40 border-amber-200/60'
                                }`}>
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                            assignedVehicle?.vehicleNumber 
                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            <Truck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Vehicle</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black border ${
                                                    assignedVehicle?.vehicleNumber 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {assignedVehicle?.vehicleNumber ? 'Vehicle Linked' : 'Awaiting Assignment'}
                                                </span>
                                            </div>
                                            {assignedVehicle?.vehicleNumber ? (
                                                <p className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">
                                                    {assignedVehicle.vehicleName ? `${assignedVehicle.vehicleName} ` : ''}
                                                    <span className="font-mono font-black text-indigo-700 tracking-wide uppercase bg-indigo-100/80 px-2 py-0.5 rounded-md text-xs sm:text-sm">
                                                        {assignedVehicle.vehicleNumber}
                                                    </span>
                                                    {assignedVehicle.capacityTons ? (
                                                        <span className="text-xs font-semibold text-slate-500 ml-2 font-sans">
                                                            ({assignedVehicle.capacityTons} Tons)
                                                        </span>
                                                    ) : null}
                                                </p>
                                            ) : (
                                                <p className="text-xs font-semibold text-slate-600 mt-0.5 italic">
                                                    Currently no vehicle is assigned. Waiting for transporter to assign a vehicle.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {assignedVehicle?.vehicleNumber && (
                                        <div className="text-left sm:text-right text-xs text-slate-500 pl-13 sm:pl-0">
                                            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80 font-bold text-slate-700">
                                                Ready for Dispatch
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Key Summary Stats Grid - 2 per row on mobile, full width at top */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <p className="text-xs md:text-sm font-bold text-slate-500">Current Balance</p>
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                            <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg md:text-2xl font-black text-slate-900 mt-2">{toCurrency(wallet?.currentBalance)}</h3>
                                </div>
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <p className="text-xs md:text-sm font-bold text-slate-500">Today's Earnings</p>
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                            <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg md:text-2xl font-black text-slate-900 mt-2">{toCurrency(wallet?.totalEarnings)}</h3>
                                </div>
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <p className="text-xs md:text-sm font-bold text-slate-500">Today's Distance</p>
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Navigation className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <h3 className="text-lg md:text-2xl font-black text-slate-900">{todaysDistanceTraveledKm} km</h3>
                                        <p className="text-[11px] text-slate-400 font-semibold truncate">
                                            {currentRide ? `Active: ${activeRideProgressKm} km` : 'Fleet Ready'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <p className="text-xs md:text-sm font-bold text-slate-500">Pending Withdrawals</p>
                                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                            <Clock className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <h3 className="text-lg md:text-2xl font-black text-slate-900">{wallet?.pendingWithdrawalCount || 0}</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">{toCurrency(wallet?.pendingWithdrawalAmount)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pending Customer Ride Requests - Highlighted at top */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 md:mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-indigo-600" />
                                        Pending Customer Ride Requests
                                    </h3>
                                    {activeTransporter?.isIndependent && !assignedVehicle?.vehicleNumber ? (
                                        <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                            Vehicle Required
                                        </span>
                                    ) : rideRequests.length > 0 && (
                                        <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                            {rideRequests.length} Waiting
                                        </span>
                                    )}
                                </div>

                                {activeTransporter?.isIndependent && !assignedVehicle?.vehicleNumber ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                                            <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-base">Vehicle Registration Required</h4>
                                            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                                                As an independent owner-driver, you must add and register your vehicle to receive and accept customer ride requests.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/profile')}
                                            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                                        >
                                            <Truck className="h-4 w-4" /> Add Vehicle in Settings
                                        </button>
                                    </div>
                                ) : rideRequests.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 text-center">
                                        No pending ride requests from customers right now.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {rideRequests.map((ride) => (
                                            <div key={ride.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-indigo-200 transition-colors">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs uppercase shrink-0">
                                                                {ride.customerProfilePic ? (
                                                                    <img 
                                                                        src={
                                                                            ride.customerProfilePic.startsWith('http') || ride.customerProfilePic.startsWith('data:')
                                                                                ? ride.customerProfilePic
                                                                                : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${ride.customerProfilePic.startsWith('/') ? '' : '/'}${ride.customerProfilePic}`
                                                                        }
                                                                        alt={ride.customerName || 'Customer'}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLElement).style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span>{ride.customerName?.substring(0, 2) || 'CU'}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-base font-bold text-slate-900">{ride.customerName ? `${ride.customerName} (Ride #${ride.id})` : `Ride #${ride.id}`}</p>
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
                                                            {(() => {
                                                                const rawGoods = ride.goodsType || 'N/A';
                                                                const isTons = rawGoods.includes('[Unit: Tons]');
                                                                const cleanGoods = rawGoods.replace(/\s*\[Unit:\s*Tons\]/gi, '').trim() || 'N/A';
                                                                const unit = isTons ? 'Tons' : 'kg';
                                                                return (
                                                                    <>
                                                                        <p><span className="font-semibold text-slate-800">Goods:</span> {cleanGoods}</p>
                                                                        {ride.goodsWeight && ride.goodsWeight > 0 ? (
                                                                            <p><span className="font-semibold text-slate-800">Weight:</span> {ride.goodsWeight} {unit}</p>
                                                                        ) : null}
                                                                    </>
                                                                );
                                                            })()}
                                                            {(ride.ctVehicleType || ride.ctBodyType || ride.ctTyreType) ? (
                                                                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                                                                    {ride.ctVehicleType ? (
                                                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
                                                                            🚚 {commonTypesMap[ride.ctVehicleType] || `Type #${ride.ctVehicleType}`}
                                                                        </span>
                                                                    ) : null}
                                                                    {ride.ctBodyType ? (
                                                                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
                                                                            📦 {commonTypesMap[ride.ctBodyType] || `Body #${ride.ctBodyType}`}
                                                                        </span>
                                                                    ) : null}
                                                                    {ride.ctTyreType ? (
                                                                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-semibold">
                                                                            🔘 {commonTypesMap[ride.ctTyreType] || `Tyre #${ride.ctTyreType}`}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2.5 sm:flex-row">
                                                        <button
                                                            onClick={() => acceptRide(ride)}
                                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 text-sm transition-colors cursor-pointer"
                                                        >
                                                            Accept Ride
                                                        </button>
                                                        <button
                                                            onClick={() => rejectRide(ride)}
                                                            className="rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-bold px-6 py-2.5 text-sm transition-colors cursor-pointer"
                                                        >
                                                            Reject Ride
                                                        </button>
                                                        <button
                                                            onClick={() => setChatBookingId(ride.id)}
                                                            className="rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold px-5 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
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

                            {/* Transporter Relationship Control Panel */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 md:mb-8 relative z-10 space-y-4">
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-slate-900">Transporter Fleet Connection</h3>
                                    <p className="text-slate-500 text-xs mt-0.5">Manage your active transporter link, outbound join requests, and inbound invitations.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
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
                                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        💬 Chat
                                                    </button>
                                                    <button
                                                        onClick={handleSendLeaveRequest}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer"
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
                                {relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|')).length > 0 && (
                                    <div className="border-t border-slate-100 pt-4 space-y-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inbound Invitations</p>
                                        <div className="space-y-2">
                                            {relationshipRequests.filter(req => req.message && !req.message.startsWith('CHAT_MESSAGE|') && !req.message.startsWith('CHAT_MESSAGE_DIRECT|')).map(req => {
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

<div className="grid grid-cols-1 gap-8 mb-8">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Current Ride Status</h3>
                                    {currentRide ? (
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">Ride #{currentRide.id}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">Current status: {currentRide.rideStatus}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-200 border-2 border-white shadow-xs flex items-center justify-center font-black text-primary-800 text-xs uppercase shrink-0">
                                                            {currentRide.customerProfilePic ? (
                                                                <img 
                                                                    src={
                                                                        currentRide.customerProfilePic.startsWith('http') || currentRide.customerProfilePic.startsWith('data:')
                                                                            ? currentRide.customerProfilePic
                                                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${currentRide.customerProfilePic.startsWith('/') ? '' : '/'}${currentRide.customerProfilePic}`
                                                                    }
                                                                    alt={currentRide.customerName || 'Customer'}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span>{currentRide.customerName?.substring(0, 2) || 'CU'}</span>
                                                            )}
                                                        </div>
                                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-700 border border-primary-200">
                                                            {currentRide.customerName || 'Assigned Customer'}
                                                        </span>
                                                        <button
                                                            onClick={() => setChatBookingId(currentRide.id)}
                                                            className="flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
                                                        >
                                                            <MessageCircle className="h-3 w-3" /> Chat
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                                                    <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-extrabold text-emerald-800 block text-xs uppercase tracking-wider">Step 1: Pickup Location</span>
                                                                    {currentRide.rideStatus === 'driver_arriving' || currentRide.rideStatus === 'ride_started' || currentRide.rideStatus === 'ride_completed' ? (
                                                                        <span className="px-1.5 py-0.2 text-[9px] font-black bg-emerald-100 text-emerald-800 rounded uppercase">Reached / Loaded</span>
                                                                    ) : null}
                                                                </div>
                                                                <span className="font-semibold text-slate-800 text-xs">{currentRide.pickupAddress || 'Pickup location not available'}</span>
                                                                {currentRide.pickupLat && currentRide.pickupLng ? (
                                                                    <span className="text-[11px] text-indigo-600 font-bold block mt-0.5">
                                                                        {(() => {
                                                                            const lat = currentPosition?.lat ?? currentRide.pickupLat;
                                                                            const lng = currentPosition?.lng ?? currentRide.pickupLng;
                                                                            const dist = calculateDistance(lat, lng, currentRide.pickupLat, currentRide.pickupLng);
                                                                            const time = getEstimatedTime(dist);
                                                                            if (dist <= 0.05) return '📍 Arrived at Customer Pickup';
                                                                            return `🚗 Remaining to Pickup: ${dist} km • ${time} ETA`;
                                                                        })()}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const dest = currentRide.pickupAddress || `${currentRide.pickupLat},${currentRide.pickupLng}`;
                                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank');
                                                            }}
                                                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                                            title="Navigate from your current location to Customer Pickup"
                                                        >
                                                            <Navigation className="h-3 w-3" /> Navigate
                                                        </button>
                                                    </div>

                                                    <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <Route className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-extrabold text-rose-800 block text-xs uppercase tracking-wider">Step 2: Destination Drop</span>
                                                                    {currentRide.rideStatus === 'ride_started' ? (
                                                                        <span className="px-1.5 py-0.2 text-[9px] font-black bg-indigo-100 text-indigo-800 rounded uppercase animate-pulse">In Transit</span>
                                                                    ) : null}
                                                                </div>
                                                                <span className="font-semibold text-slate-800 text-xs">{currentRide.dropAddress || 'Drop location not available'}</span>
                                                                {currentRide.dropLat && currentRide.dropLng ? (
                                                                    <span className="text-[11px] text-purple-600 font-bold block mt-0.5">
                                                                        {(() => {
                                                                            const isStarted = currentRide.rideStatus === 'ride_started';
                                                                            const startLat = (isStarted && currentPosition) ? currentPosition.lat : (currentRide.pickupLat ?? currentRide.dropLat);
                                                                            const startLng = (isStarted && currentPosition) ? currentPosition.lng : (currentRide.pickupLng ?? currentRide.dropLng);
                                                                            const dist = calculateDistance(startLat, startLng, currentRide.dropLat, currentRide.dropLng);
                                                                            const time = getEstimatedTime(dist);
                                                                            if (dist <= 0.05 && isStarted) return '🏁 Arrived at Destination Drop';
                                                                            return `📦 ${isStarted ? 'Remaining to Destination:' : 'Total Route Distance:'} ${dist} km • ${time} ETA`;
                                                                        })()}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const dest = currentRide.dropAddress || `${currentRide.dropLat},${currentRide.dropLng}`;
                                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank');
                                                            }}
                                                            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                                            title="Navigate to Destination Drop"
                                                        >
                                                            <Navigation className="h-3 w-3" /> Navigate
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Navigation Quick Actions */}
                                            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 mt-4">
                                                <button
                                                    onClick={() => window.open('tel:+919999988888')}
                                                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 transition-colors text-xs sm:text-sm cursor-pointer"
                                                >
                                                    <Phone className="h-4 w-4" /> Call
                                                </button>
                                                <button
                                                    onClick={() => setChatBookingId(currentRide.id)}
                                                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2.5 transition-colors text-xs sm:text-sm cursor-pointer"
                                                >
                                                    <MessageCircle className="h-4 w-4" /> Chat
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPaymentModalRide(currentRide);
                                                        setCustomPaymentAmount(String(currentRide.finalFare || currentRide.estimatedFare || ''));
                                                        setPaymentMode('QR');
                                                    }}
                                                    className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 transition-colors text-xs sm:text-sm cursor-pointer shadow-sm"
                                                >
                                                    <QrCode className="h-4 w-4" /> Pay / Cash
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
                                                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 transition-colors text-xs sm:text-sm cursor-pointer"
                                                >
                                                    <AlertTriangle className="h-4 w-4 fill-white" /> SOS
                                                </button>
                                            </div>

                                            {/* Live Dynamic Routing Map */}
                                            <DriverRouteMap
                                                driverLat={currentPosition?.lat || currentRide.pickupLat}
                                                driverLng={currentPosition?.lng || currentRide.pickupLng}
                                                pickupLat={currentRide.pickupLat}
                                                pickupLng={currentRide.pickupLng}
                                                dropLat={currentRide.dropLat}
                                                dropLng={currentRide.dropLng}
                                                rideStatus={currentRide.rideStatus || 'driver_assigned'}
                                                pickupAddress={currentRide.pickupAddress}
                                                dropAddress={currentRide.dropAddress}
                                            />

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
                                            </div>

                                            {/* Action Control Button */}
                                            {currentRide.rideStatus === 'driver_assigned' && (
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <button
                                                        onClick={() => advanceRideStatus(currentRide, 'driver_arriving')}
                                                        className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 text-base tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
                                                    >
                                                        📦 Goods Loaded successfully
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm(`Are you sure you want to cancel Ride #${currentRide.id}? The customer and your transporter will be notified.`)) {
                                                                return;
                                                            }
                                                            await advanceRideStatus(currentRide, 'cancelled');
                                                        }}
                                                        className="px-6 py-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
                                                    >
                                                        ✕ Cancel Ride
                                                    </button>
                                                </div>
                                            )}

                                            {currentRide.rideStatus === 'driver_arriving' && (
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <button
                                                        onClick={() => advanceRideStatus(currentRide, 'ride_started')}
                                                        className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 text-base tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
                                                    >
                                                        🚚 Start Journey
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm(`Are you sure you want to cancel Ride #${currentRide.id}? The customer and your transporter will be notified.`)) {
                                                                return;
                                                            }
                                                            await advanceRideStatus(currentRide, 'cancelled');
                                                        }}
                                                        className="px-6 py-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
                                                    >
                                                        ✕ Cancel Ride
                                                    </button>
                                                </div>
                                            )}

                                            {currentRide.rideStatus === 'ride_started' && (
                                                <button
                                                    onClick={() => advanceRideStatus(currentRide, 'ride_completed')}
                                                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 text-base tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer"
                                                >
                                                    🏁 Delivered (Mark Complete)
                                                </button>
                                            )}
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
                                                                            onClick={() => {
                                                                                setPaymentModalRide(ride);
                                                                                setCustomPaymentAmount(String(ride.finalFare || ride.estimatedFare || ''));
                                                                                setPaymentMode('QR');
                                                                            }}
                                                                            className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                                                                        >
                                                                            <QrCode className="h-3.5 w-3.5" /> Collect Payment
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
                        </>
                    )}
                    
                    {activeTab === 'rides' && (
                        <div className="space-y-8 pb-20">
                            <header className="flex justify-between items-end mb-10 h-24">
                                <div className="text-white">
                                    <p className="text-indigo-200 font-medium tracking-wide text-sm mb-1 uppercase">RIDES & REQUESTS</p>
                                    <h1 className="text-3xl font-extrabold tracking-tight">Active Trips & Requests</h1>
                                </div>
                            </header>

                            {/* Pending Ride Requests */}
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
                                                            <p><span className="font-semibold text-slate-800">Goods:</span> {ride.goodsType || 'N/A'} {ride.goodsWeight ? `(${ride.goodsWeight} kg)` : ''}</p>
                                                            {(ride.ctVehicleType || ride.ctBodyType || ride.ctTyreType) ? (
                                                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                                                    <span className="text-xs font-bold text-slate-500">Required:</span>
                                                                    {ride.ctVehicleType && commonTypesMap[ride.ctVehicleType] && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                                                                            🚚 {commonTypesMap[ride.ctVehicleType]}
                                                                        </span>
                                                                    )}
                                                                    {ride.ctBodyType && commonTypesMap[ride.ctBodyType] && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                                                            📦 {commonTypesMap[ride.ctBodyType]}
                                                                        </span>
                                                                    )}
                                                                    {ride.ctTyreType && commonTypesMap[ride.ctTyreType] && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                                                                            🔘 {commonTypesMap[ride.ctTyreType]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                            <p><span className="font-semibold text-slate-800">Estimated Fare:</span> {toCurrency(ride.estimatedFare)}</p>
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

                            {/* Ride History */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <History className="h-5 w-5 text-slate-700" /> Ride History & Issues
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

                    {(activeTab === 'settings' || activeTab === 'profile') && (
                        <div className="pb-20">
                            <ProfilePage isEmbedded={true} />
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
                <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-red-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-red-600 animate-in zoom-in duration-300">
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
                <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-indigo-600 text-white px-6 py-5 flex items-center justify-between relative">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 border-2 border-white/50 flex items-center justify-center font-black text-white text-base uppercase shrink-0 shadow-sm">
                                    {activeRequestPopup.customerProfilePic ? (
                                        <img 
                                            src={
                                                activeRequestPopup.customerProfilePic.startsWith('http') || activeRequestPopup.customerProfilePic.startsWith('data:')
                                                    ? activeRequestPopup.customerProfilePic
                                                    : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${activeRequestPopup.customerProfilePic.startsWith('/') ? '' : '/'}${activeRequestPopup.customerProfilePic}`
                                            }
                                            alt={activeRequestPopup.customerName || 'Customer'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <span>{activeRequestPopup.customerName?.substring(0, 2) || 'CU'}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-200 bg-indigo-700/50 px-2 py-0.5 rounded-full border border-indigo-400/20">
                                            {activeRequestPopup.assignedByTransporter ? 'Transporter Assigned' : 'Customer Request'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black mt-0.5 tracking-tight flex items-center gap-1.5">
                                        <span>{activeRequestPopup.customerName || `Ride #${activeRequestPopup.id}`}</span>
                                    </h3>
                                    {activeRequestPopup.assignedByTransporter && (
                                        <p className="text-xs text-indigo-100 font-bold mt-0.5 bg-white/10 px-2 py-0.5 rounded-md inline-block">
                                            🏢 Assigned by {activeRequestPopup.transporterName || 'Transporter'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setDismissedRequestIds(prev => ({ ...prev, [activeRequestPopup.id]: true }));
                                    setActiveRequestPopup(null);
                                }} 
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-colors cursor-pointer self-start"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
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
                                            <p className="font-extrabold text-slate-400 uppercase tracking-wide">Drop Location</p>
                                            <p className="font-bold text-slate-800 text-sm mt-0.5">{activeRequestPopup.dropAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Goods & Load Info */}
                            {(() => {
                                const rawGoods = activeRequestPopup.goodsType || 'General Freight';
                                const isTons = rawGoods.includes('[Unit: Tons]');
                                const cleanGoods = rawGoods.replace(/\s*\[Unit:\s*Tons\]/gi, '').trim() || 'General Freight';
                                const unit = isTons ? 'Tons' : 'kg';
                                return (
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-slate-400 font-bold uppercase">Goods</p>
                                            <p className="font-extrabold text-slate-800 mt-0.5">{cleanGoods}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-slate-400 font-bold uppercase">Weight</p>
                                            <p className="font-extrabold text-slate-800 mt-0.5">{activeRequestPopup.goodsWeight ? `${activeRequestPopup.goodsWeight} ${unit}` : 'N/A'}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Vehicle Specs Badge in Popup (Only shown if customer specified them) */}
                            {(activeRequestPopup.ctVehicleType || activeRequestPopup.ctBodyType || activeRequestPopup.ctTyreType) ? (
                                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-xs space-y-2">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Required Vehicle Specifications</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {activeRequestPopup.ctVehicleType ? (
                                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Vehicle Type</p>
                                                <p className="text-xs font-black text-indigo-700 truncate mt-0.5">
                                                    {commonTypesMap[activeRequestPopup.ctVehicleType] || `Type #${activeRequestPopup.ctVehicleType}`}
                                                </p>
                                            </div>
                                        ) : null}
                                        {activeRequestPopup.ctBodyType ? (
                                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Body Type</p>
                                                <p className="text-xs font-black text-blue-700 truncate mt-0.5">
                                                    {commonTypesMap[activeRequestPopup.ctBodyType] || `Body #${activeRequestPopup.ctBodyType}`}
                                                </p>
                                            </div>
                                        ) : null}
                                        {activeRequestPopup.ctTyreType ? (
                                            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Tyre Type</p>
                                                <p className="text-xs font-black text-slate-800 truncate mt-0.5">
                                                    {commonTypesMap[activeRequestPopup.ctTyreType] || `Tyre #${activeRequestPopup.ctTyreType}`}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {/* Estimated Fare Highlight */}
                            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Estimated Fare</p>
                                    <p className="text-2xl font-black text-emerald-700 tracking-tight mt-0.5">
                                        {toCurrency(activeRequestPopup.estimatedFare)}
                                    </p>
                                </div>
                                <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-500/30 font-black">
                                    ₹
                                </div>
                            </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => {
                                    setDismissedRequestIds(prev => ({ ...prev, [activeRequestPopup.id]: true }));
                                    setActiveRequestPopup(null);
                                    rejectRide(activeRequestPopup);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all cursor-pointer"
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => {
                                    const currentPop = activeRequestPopup;
                                    setDismissedRequestIds(prev => ({ ...prev, [currentPop.id]: true }));
                                    setActiveRequestPopup(null);
                                    acceptRide(currentPop);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                Accept Load
                            </button>
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
                    className="fixed bottom-24 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur text-white rounded-2xl p-4 shadow-2xl border border-slate-700/50 flex flex-col gap-3 animate-in slide-in-from-bottom-5 duration-300 cursor-pointer"
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

            {/* Flexible Payment Modal (Advance, In-between, After Completed) */}
            {paymentModalRide && (
                <div 
                    onClick={() => setPaymentModalRide(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 cursor-default"
                    >
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <Banknote className="h-6 w-6 text-teal-600" /> Collect Payment
                                </h3>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                    Ride #{paymentModalRide.id} • Status: <span className="text-indigo-600 font-bold capitalize">{paymentModalRide.rideStatus || 'Active'}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setPaymentModalRide(null)}
                                className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Payment Mode Selector */}
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPaymentMode('QR')}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    paymentMode === 'QR'
                                        ? 'bg-white text-teal-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <QrCode className="h-4 w-4" /> QR Code (UPI)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMode('Cash')}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    paymentMode === 'Cash'
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Banknote className="h-4 w-4" /> Cash in Hand
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Payment Amount (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={customPaymentAmount}
                                    onChange={(e) => setCustomPaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-3 text-base font-extrabold text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">
                                Estimated Fare: {toCurrency(paymentModalRide.finalFare || paymentModalRide.estimatedFare || 0)} (can collect full or advance)
                            </p>
                        </div>

                        {/* Mode specifics */}
                        {paymentMode === 'QR' ? (
                            <div className="bg-gradient-to-b from-slate-50 to-teal-50/40 p-5 rounded-2xl border border-teal-100 text-center space-y-3">
                                <p className="text-xs font-bold text-teal-800">
                                    Scan QR code with any UPI app (GPay, PhonePe, Paytm)
                                </p>
                                <div className="bg-white p-3 rounded-2xl inline-block shadow-md border border-slate-200">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                            `upi://pay?pa=navgatix@upi&pn=Navgatix Logistics&am=${customPaymentAmount || 0}&tn=Ride-${paymentModalRide.id}&cu=INR`
                                        )}`}
                                        alt="UPI QR Code"
                                        className="w-40 h-40 object-contain mx-auto"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Ask customer to scan to complete payment.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 text-center space-y-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                    <Banknote className="h-5 w-5" />
                                </div>
                                <p className="text-xs font-bold text-emerald-900">
                                    Cash Collection Mode
                                </p>
                                <p className="text-xs text-slate-600 font-medium">
                                    Collect ₹{customPaymentAmount || 0} in cash directly from customer and confirm below.
                                </p>
                            </div>
                        )}

                        {/* Confirm Button */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setPaymentModalRide(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isRecordingPayment || !customPaymentAmount || Number(customPaymentAmount) <= 0}
                                onClick={async () => {
                                    const amountNum = Number(customPaymentAmount);
                                    if (amountNum <= 0) {
                                        alert('Please enter a valid amount.');
                                        return;
                                    }
                                    setIsRecordingPayment(true);
                                    try {
                                        const res = await apiClient.post('/DriverFinance/ridePayment', {
                                            rideId: paymentModalRide.id,
                                            amount: amountNum,
                                            paymentMode: paymentMode === 'QR' ? 'UPI_QR' : 'Cash',
                                            transactionReference: `${paymentMode}_Ride_${paymentModalRide.id}_${Date.now()}`
                                        });
                                        if (res.data && res.data.success === false) {
                                            alert(res.data.message || 'Payment recording failed.');
                                            return;
                                        }
                                        if (paymentMode === 'Cash') {
                                            const comm = (amountNum * 0.10).toFixed(2);
                                            alert(`Cash payment of ₹${amountNum} confirmed! ₹${comm} app commission deducted from your wallet.`);
                                        } else {
                                            const net = (amountNum * 0.90).toFixed(2);
                                            alert(`Online payment of ₹${amountNum} recorded! Net ₹${net} credited to your wallet.`);
                                        }
                                        setPaymentModalRide(null);
                                        await refreshRides();
                                        try {
                                            const wRes = await apiClient.get(`/DriverFinance/wallet/${driverUserId}`);
                                            setWallet(wRes.data || {});
                                        } catch (e) {}
                                    } catch (err: any) {
                                        alert(err?.response?.data?.message || err?.response?.data?.Message || 'Payment recording failed.');
                                    } finally {
                                        setIsRecordingPayment(false);
                                    }
                                }}
                                className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-extrabold text-sm shadow-lg shadow-teal-600/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {isRecordingPayment ? 'Recording...' : 'Confirm Received'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-2 px-2 flex items-center justify-around shadow-2xl safe-area-bottom">
                {[
                    { id: 'overview', label: 'Home', icon: LayoutDashboard },
                    { id: 'rides', label: 'Ride / Request', icon: Truck },
                    { id: 'wallet', label: 'Wallet', icon: Wallet },
                    { id: 'profile', label: 'Profile', icon: Settings },
                ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id || (item.id === 'profile' && activeTab === 'settings');
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id as any);
                                setSidebarOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
                                isActive
                                    ? 'text-indigo-600 font-extrabold bg-indigo-50/80 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 font-medium'
                            }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 stroke-[2.5]' : 'text-slate-500'}`} />
                            <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default DriverDashboard;
