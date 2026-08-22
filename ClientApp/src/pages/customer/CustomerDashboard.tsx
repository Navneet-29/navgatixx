import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Anchor, ArrowRightLeft, CheckCircle, Database, History, Info, Layout, MapPin, MessageCircle, Navigation, Package, Search, Truck, User, X, LayoutDashboard, Settings, LogOut, Menu, ChevronDown, CreditCard, Bell, Key, Home, Star, Loader2, Bookmark, Building, Plus, Trash2 } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { fetchVehicleCommonTypes } from '../../services/vehicleCommonTypes';
import { normalizeCommonTypes, type NormalizedCommonType } from '../../lib/commonTypes';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import TrackingMap from '../../components/TrackingMap';
import ChatPanel from '../../components/ChatPanel';
import scooterImg from '../../assets/vehicles/scooter.png';
import autoImg from '../../assets/vehicles/auto.png';
import truckImg from '../../assets/vehicles/truck.png';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type RideStatus =
    | 'request_for_ride'
    | 'driver_assigned'
    | 'driver_arriving'
    | 'ride_started'
    | 'ride_completed'
    | 'cancelled';

interface Shipment {
    id: number;
    productType: string;
    pickup: string;
    destination: string;
    weight: number;
    vehicle: string;
    matchedCount: number;
    status: RideStatus;
    date: string;
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    vehicleName?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    estimatedFare?: number;
    paymentStatus?: string;
}


const DEFAULT_PRODUCT_TYPES = [
    'Electronics',
    'Furniture',
    'Groceries',
    'Clothing',
    'Books',
    'Machinery',
    'Raw Materials',
    'Perishables',
    'Pharmaceuticals',
    'Other',
];

const FALLBACK_PRODUCT_TYPES: NormalizedCommonType[] = DEFAULT_PRODUCT_TYPES.map((name, index) => ({
    id: -(index + 1),
    name,
}));

const MapAutoController = ({ 
    pLat, 
    pLng, 
    dLat, 
    dLng, 
    focus 
}: { 
    pLat: number; 
    pLng: number; 
    dLat: number; 
    dLng: number; 
    focus: 'pickup' | 'destination' | 'both' | null; 
}) => {
    const map = useMap();

    useEffect(() => {
        const hasP = Number.isFinite(pLat) && pLat !== 0;
        const hasD = Number.isFinite(dLat) && dLat !== 0;

        if (focus === 'pickup' && hasP) {
            map.flyTo([pLat, pLng], 14, { duration: 1.2 });
        } else if (focus === 'destination' && hasD) {
            map.flyTo([dLat, dLng], 14, { duration: 1.2 });
        } else if (hasP && hasD) {
            const bounds = L.latLngBounds([[pLat, pLng], [dLat, dLng]]);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
        } else if (hasP) {
            map.flyTo([pLat, pLng], 14, { duration: 1.2 });
        } else if (hasD) {
            map.flyTo([dLat, dLng], 14, { duration: 1.2 });
        }
    }, [pLat, pLng, dLat, dLng, focus, map]);

    return null;
};

export interface SavedAddress {
    id: string;
    title: string;
    address: string;
    lat: number;
    lng: number;
    buildingNo?: string;
    houseNo?: string;
    category?: 'home' | 'office' | 'warehouse' | 'other';
}

const DEFAULT_SAVED_ADDRESSES: SavedAddress[] = [
    {
        id: 'saved-1',
        title: 'Home (Sector 17)',
        address: 'Sector 17, Chandigarh, 160017, India',
        lat: 30.7333,
        lng: 76.7794,
        category: 'home',
        houseNo: 'House #102'
    },
    {
        id: 'saved-2',
        title: 'Office (IT Park)',
        address: 'Phase 8, IT Park, Mohali, Punjab 160071, India',
        lat: 30.7046,
        lng: 76.7179,
        category: 'office',
        buildingNo: 'Tower B, 4th Floor'
    },
    {
        id: 'saved-3',
        title: 'Main Warehouse',
        address: 'Industrial Area Phase 1, Panchkula, Haryana 134113, India',
        lat: 30.6942,
        lng: 76.8606,
        category: 'warehouse',
        buildingNo: 'Plot #45'
    },
    {
        id: 'saved-4',
        title: 'Sirsa Hub',
        address: 'Bus Stand Road, Sirsa, Haryana 125055, India',
        lat: 29.5336,
        lng: 75.0298,
        category: 'other'
    }
];

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'shipments' | 'new'>('shipments');
    const [shipments, setShipments] = useState<Shipment[]>([]);
    
    // Dynamic common types
    const [vehicleTypes, setVehicleTypes] = useState<NormalizedCommonType[]>([]);
    const [bodyTypes, setBodyTypes] = useState<NormalizedCommonType[]>([]);
    const [tyreTypes, setTyreTypes] = useState<NormalizedCommonType[]>([]);
    const [productTypes, setProductTypes] = useState<NormalizedCommonType[]>([]);

    const [formData, setFormData] = useState({
        productType: '',
        customProductType: '',
        pickup: '',
        destination: '',
        pickupLat: '',
        pickupLng: '',
        dropLat: '',
        dropLng: '',
        weight: '',
        vehicle: '', 
        ctBodyType: '',
        ctTyreType: '',
        pickupBuildingNo: '',
        pickupHouseNo: '',
        dropBuildingNo: '',
        dropHouseNo: '',
    });
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [disputeDrafts, setDisputeDrafts] = useState<Record<number, string>>({});
    const [chatBookingId, setChatBookingId] = useState<number | null>(null);
    const [trackingBooking, setTrackingBooking] = useState<any>(null);
    
    // Realtime Driver Search States
    const [searchingBookingId, setSearchingBookingId] = useState<number | null>(null);
    const [searchTimeLeft, setSearchTimeLeft] = useState(45);
    const [searchPhase, setSearchPhase] = useState(0);
    const [searchTimeoutError, setSearchTimeoutError] = useState(false);
    const [matchedDriverDetails, setMatchedDriverDetails] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Rating States
    const [selectedRatingBooking, setSelectedRatingBooking] = useState<any>(null);
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    const lastSeenNotifIdsRef = useRef<Set<string>>(new Set());
    const handledCancellationNotifIdsRef = useRef<Set<string>>(new Set());
    const [shipmentMetrics, setShipmentMetrics] = useState<Record<number, { distanceKm: number; etaMins: number; phase: 'pickup' | 'delivery' }>>({});
    const [chatToast, setChatToast] = useState<{
        id: string;
        bookingId?: number;
        roomName?: string;
        senderName: string;
        messageText: string;
    } | null>(null);
    const [locatingField, setLocatingField] = useState<'pickup' | 'destination' | null>(null);
    const [activeMapFocus, setActiveMapFocus] = useState<'pickup' | 'destination' | 'both' | null>(null);
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [showDropSuggestions, setShowDropSuggestions] = useState(false);

    // Saved Addresses State
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
        try {
            const local = localStorage.getItem('navgatix_saved_addresses');
            if (local) {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse saved addresses', e);
        }
        return DEFAULT_SAVED_ADDRESSES;
    });

    const [activeSavedAddressModal, setActiveSavedAddressModal] = useState<'pickup' | 'destination' | null>(null);
    const [savedSearchQuery, setSavedSearchQuery] = useState('');
    const [isAddingNewSaved, setIsAddingNewSaved] = useState(false);
    const [newSavedTitle, setNewSavedTitle] = useState('');
    const [newSavedCategory, setNewSavedCategory] = useState<'home' | 'office' | 'warehouse' | 'other'>('home');

    const handleSelectSavedAddress = (item: SavedAddress, targetField: 'pickup' | 'destination') => {
        if (targetField === 'pickup') {
            setFormData(prev => ({
                ...prev,
                pickup: item.address,
                pickupLat: item.lat.toFixed(6),
                pickupLng: item.lng.toFixed(6),
                pickupBuildingNo: item.buildingNo || prev.pickupBuildingNo,
                pickupHouseNo: item.houseNo || prev.pickupHouseNo,
            }));
            setActiveMapFocus('pickup');
        } else {
            setFormData(prev => ({
                ...prev,
                destination: item.address,
                dropLat: item.lat.toFixed(6),
                dropLng: item.lng.toFixed(6),
                dropBuildingNo: item.buildingNo || prev.dropBuildingNo,
                dropHouseNo: item.houseNo || prev.dropHouseNo,
            }));
            setActiveMapFocus('destination');
        }
        setActiveSavedAddressModal(null);
    };

    const handleSaveCurrentAsSavedAddress = (targetField: 'pickup' | 'destination') => {
        const addrText = targetField === 'pickup' ? formData.pickup : formData.destination;
        const latVal = parseFloat(targetField === 'pickup' ? formData.pickupLat : formData.dropLat);
        const lngVal = parseFloat(targetField === 'pickup' ? formData.pickupLng : formData.dropLng);
        const bNo = targetField === 'pickup' ? formData.pickupBuildingNo : formData.dropBuildingNo;
        const hNo = targetField === 'pickup' ? formData.pickupHouseNo : formData.dropHouseNo;

        if (!addrText || isNaN(latVal) || isNaN(lngVal)) {
            alert('Please enter and locate a valid address on the map first before saving it.');
            return;
        }

        const newAddr: SavedAddress = {
            id: `saved-${Date.now()}`,
            title: newSavedTitle.trim() || (targetField === 'pickup' ? 'Saved Pickup Address' : 'Saved Drop Address'),
            address: addrText,
            lat: latVal,
            lng: lngVal,
            buildingNo: bNo,
            houseNo: hNo,
            category: newSavedCategory
        };

        const updated = [newAddr, ...savedAddresses];
        setSavedAddresses(updated);
        try {
            localStorage.setItem('navgatix_saved_addresses', JSON.stringify(updated));
        } catch (e) {
            console.error(e);
        }
        setNewSavedTitle('');
        setIsAddingNewSaved(false);
    };

    const handleDeleteSavedAddress = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = savedAddresses.filter(a => a.id !== id);
        setSavedAddresses(updated);
        try {
            localStorage.setItem('navgatix_saved_addresses', JSON.stringify(updated));
        } catch (err) {
            console.error(err);
        }
    };

    const [selectedCategory, setSelectedCategory] = useState<'two_wheeler' | 'three_wheeler' | 'truck' | null>(null);

    const TRUCK_SUBTYPES = [
        { key: 'mini', label: 'Mini Truck (Tata Ace)', icon: '🚚', keywords: ['mini truck', 'tata ace', 'veh003'] },
        { key: 'pickup', label: 'Pickup Truck (LCV)', icon: '🛻', keywords: ['pickup', 'lcv', 'veh004'] },
        { key: '14ft', label: '14 Ft Truck', icon: '🚛', keywords: ['14 ft', '14ft', 'veh005'] },
        { key: '17ft', label: '17 Ft Truck', icon: '🚛', keywords: ['17 ft', '17ft', 'veh006'] },
        { key: '20ft', label: '20 Ft Truck', icon: '🚛', keywords: ['20 ft', '20ft', 'veh007'] },
        { key: '24ft', label: '24 Ft Truck', icon: '🚛', keywords: ['24 ft', '24ft', 'veh008'] },
        { key: '32ft', label: '32 Ft Truck', icon: '🚛', keywords: ['32 ft', '32ft', 'veh009'] },
        { key: 'container', label: 'Container Truck', icon: '🚢', keywords: ['container', 'veh010'] },
    ];

    const findVehicleTypeByKeywords = (keywords: string[]) => {
        if (!Array.isArray(vehicleTypes) || vehicleTypes.length === 0) return null;
        return vehicleTypes.find((vt) => {
            const nameLower = (vt.name || '').toLowerCase();
            const codeLower = (vt.code || '').toLowerCase();
            return keywords.some((kw) => nameLower.includes(kw.toLowerCase()) || codeLower.includes(kw.toLowerCase()));
        }) || null;
    };

    const handleSelectCategory = (cat: 'two_wheeler' | 'three_wheeler' | 'truck') => {
        setSelectedCategory(cat);
        if (cat === 'two_wheeler') {
            const vt = findVehicleTypeByKeywords(['two wheeler', '2-wheeler', 'scooter', 'veh001']);
            setFormData((prev) => ({
                ...prev,
                vehicle: vt ? String(vt.id) : (vehicleTypes.length > 0 ? String(vehicleTypes[0].id) : ''),
                ctBodyType: '',
                ctTyreType: ''
            }));
        } else if (cat === 'three_wheeler') {
            const vt = findVehicleTypeByKeywords(['three wheeler', '3-wheeler', 'auto', 'veh002']);
            setFormData((prev) => ({
                ...prev,
                vehicle: vt ? String(vt.id) : '',
                ctBodyType: '',
                ctTyreType: ''
            }));
        } else if (cat === 'truck') {
            const defaultTruck = findVehicleTypeByKeywords(['mini truck', 'tata ace', 'veh003']);
            if (defaultTruck) {
                setFormData((prev) => ({ ...prev, vehicle: String(defaultTruck.id) }));
            }
        }
    };

    const handleSelectTruckSubtype = (truck: typeof TRUCK_SUBTYPES[0]) => {
        const vt = findVehicleTypeByKeywords(truck.keywords);
        if (vt) {
            setFormData((prev) => ({ ...prev, vehicle: String(vt.id) }));
        }
    };

    const getSelectedVehicleName = () => {
        if (!formData.vehicle || !Array.isArray(vehicleTypes)) return '';
        const match = vehicleTypes.find((vt) => String(vt.id) === String(formData.vehicle));
        if (!match || !match.name) return '';
        return match.name.replace(/^[\?\s\uFFFD]+/, '').replace(/^[^a-zA-Z0-9\s]+/, '').trim();
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        } else {
            navigate('/login');
        }
    }, [navigate]);

    // Poll chat notifications
    useEffect(() => {
        const customerId = user?.userId || user?.id || user?.UserId || '';
        if (!customerId) return;

        const checkChatNotifications = async () => {
            try {
                const res = await apiClient.get(`/Transport/getRelationshipNotifications?userId=${customerId}`);
                const notifications = Array.isArray(res.data) ? res.data : [];

                notifications.forEach((n: any) => {
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

                    if (n.message && (n.message.startsWith('RIDE_CANCELLED_BY_DRIVER|') || n.message.startsWith('RIDE_CANCELLED_BY_TRANSPORTER|'))) {
                        if (!handledCancellationNotifIdsRef.current.has(n.id)) {
                            handledCancellationNotifIdsRef.current.add(n.id);
                            apiClient.post(`/Transport/markNotificationRead?notificationId=${n.id}`).catch(() => {});

                            const parts = n.message.split('|');
                            const bId = Number(parts[1]);
                            const cancellerName = parts[2] || 'User';
                            const role = n.message.startsWith('RIDE_CANCELLED_BY_DRIVER|') ? 'Driver' : 'Transporter';

                            try {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                                audio.volume = 0.8;
                                audio.play().catch(() => {});
                            } catch (e) {}

                            alert(`Shipment #${bId} was cancelled by ${role} (${cancellerName}). Order is returned to request pool.`);
                            loadShipments();
                        }
                    }
                });

                lastSeenNotifIdsRef.current = new Set(notifications.map((n: any) => n.id));
            } catch (err) {
                console.error("Failed to load customer chat notifications:", err);
            }
        };

        const intervalId = setInterval(checkChatNotifications, 5000);
        return () => clearInterval(intervalId);
    }, [user]);

    const loadShipments = async () => {
        const customerUserId = user?.userId || user?.UserId || user?.id || '';
        if (!customerUserId) return;

        try {
            const res = await apiClient.post('/Vehicle/bookingVehiclerides', null, {
                params: { userId: customerUserId },
            });
            const data = Array.isArray(res.data) ? res.data : [];
            const normalized = data
                .filter((item) => item?.Id || item?.id)
                .map((item) => {
                    const rawStatus = item.rideStatus ?? item.RideStatus;
                    const statusCode = Number(item.cT_BookingStatus ?? item.CT_BookingStatus ?? item.bookingStatus ?? item.BookingStatus);
                    let resolvedStatus: RideStatus = 'request_for_ride';
                    if (typeof rawStatus === 'string' && rawStatus.trim() !== '') {
                        resolvedStatus = rawStatus.trim().toLowerCase() as RideStatus;
                    } else if (statusCode === 5) {
                        resolvedStatus = 'ride_completed';
                    } else if (statusCode === 6) {
                        resolvedStatus = 'cancelled';
                    } else if (statusCode === 4) {
                        resolvedStatus = 'ride_started';
                    } else if (statusCode === 3) {
                        resolvedStatus = 'driver_arriving';
                    } else if (statusCode === 2) {
                        resolvedStatus = 'driver_assigned';
                    }

                    return {
                        id: Number(item.id ?? item.Id),
                        productType: item.goodsType ?? item.GoodsType ?? 'Goods',
                        pickup: item.pickupAddress ?? item.PickupAddress ?? '',
                        destination: item.dropAddress ?? item.DropAddress ?? '',
                        weight: Number(item.goodsWeight ?? item.GoodsWeight ?? 0),
                        vehicle: item.vehicleNumber ?? item.VehicleNumber ?? 'Assigned vehicle',
                        matchedCount: 0,
                        status: resolvedStatus,
                        date: item.createdAt ?? item.CreatedAt ?? '',
                        driverName: item.driverName ?? item.DriverName ?? '',
                        driverPhone: item.driverPhone ?? item.DriverPhone ?? '',
                        driverUserId: item.driverUserId ?? item.DriverUserId ?? '',
                        vehicleNumber: item.vehicleNumber ?? item.VehicleNumber ?? '',
                        vehicleName: item.vehicleName ?? item.VehicleName ?? '',
                        pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                        pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                        dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                        dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                        estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                    };
                });

            normalized.sort((a, b) => b.id - a.id);
            setShipments(normalized);
        } catch (err) {
            console.error('Failed to load shipments:', err);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            // Load common types from backend helper
            try {
                const [masterData, prodRes] = await Promise.all([
                    fetchVehicleCommonTypes(),
                    apiClient.get('/CommonType/getcommontypeWithKeys/PRODTYP'),
                ]);
                setVehicleTypes(masterData.vehicleTypes);
                setBodyTypes(masterData.bodyTypes);
                setTyreTypes(masterData.tyreTypes);
                setProductTypes(normalizeCommonTypes(prodRes.data || []));
            } catch (err) {
                console.error('Failed to load vehicle common types', err);
            }

            await loadShipments();
        };

        loadInitialData();
    }, [user]);

    // Poll active shipments for updates (cancellations, driver updates) every 5 seconds
    useEffect(() => {
        const activeShipments = shipments.filter(s => ['driver_assigned', 'driver_arriving', 'ride_started'].includes(s.status));
        if (activeShipments.length === 0) return;

        const intervalId = setInterval(() => {
            loadShipments();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [shipments]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        setActiveTab(tab === 'new' ? 'new' : 'shipments');
    }, [searchParams]);

    const handleCancelSearch = async (bookingId: number) => {
        if (bookingId <= 0) {
            setSearchingBookingId(null);
            openShipmentList();
            return;
        }
        try {
            await apiClient.patch(`/Vehicle/${bookingId}/rideStatus`, null, { params: { status: 'cancelled', cancelledBy: 'Customer' } });
            setSearchingBookingId(null);
            setShipments((prev) => prev.map((s) => s.id === bookingId ? { ...s, status: 'cancelled' } : s));
            alert('Search cancelled successfully.');
            openShipmentList();
        } catch (err) {
            console.error('Failed to cancel search', err);
            setSearchingBookingId(null);
            openShipmentList();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    useEffect(() => {
        if (!searchingBookingId) return;

        // Reset states
        setSearchTimeLeft(300);
        setSearchPhase(0);
        setSearchTimeoutError(false);

        // 1s countdown timer
        const timer = setInterval(() => {
            setSearchTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setSearchTimeoutError(true);
                    return 0;
                }
                const next = prev - 1;
                
                // If it is a simulated search failure (-100), run for exactly 15 seconds then show timeout error
                if (searchingBookingId === -100 && next === 285) {
                    clearInterval(timer);
                    setSearchTimeoutError(true);
                    return 285;
                }

                // Transition phases
                if (next > 225) setSearchPhase(0);
                else if (next > 150) setSearchPhase(1);
                else if (next > 75) setSearchPhase(2);
                else setSearchPhase(3);
                return next;
            });
        }, 1000);

        // 3s status polling timer (only poll if bookingId > 0)
        let poll: any = null;
        if (searchingBookingId > 0) {
            poll = setInterval(async () => {
                try {
                    const res = await apiClient.get(`/Vehicle/ride/${searchingBookingId}`);
                    const ride = res.data || {};
                    const rideStatus = ride.rideStatus ?? ride.RideStatus ?? 'request_for_ride';
                    
                    if (rideStatus === 'driver_assigned' || rideStatus === 'driver_arriving' || rideStatus === 'ride_started') {
                        clearInterval(timer);
                        if (poll) clearInterval(poll);
                        
                        // Match succeeded! Update local shipments list
                        setShipments((prev) => prev.map((s) => s.id === searchingBookingId ? { 
                            ...s, 
                            status: rideStatus, 
                            vehicle: ride.vehicleNumber || s.vehicle 
                        } : s));
                        setMatchedDriverDetails(ride);
                    }
                } catch (err) {
                    console.error('Error polling ride status', err);
                }
            }, 3000);
        }

        return () => {
            clearInterval(timer);
            if (poll) clearInterval(poll);
        };
    }, [searchingBookingId]);

    const openNewShipment = () => {
        setActiveTab('new');
        setSearchParams({ tab: 'new' });
    };

    const openShipmentList = () => {
        setActiveTab('shipments');
        setSearchParams({});
    };

    const toCommonTypeId = (value: string) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const parseNum = (value: string) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === 'pickup') {
            fetchAddressSuggestions(value, 'pickup');
        } else if (name === 'destination') {
            fetchAddressSuggestions(value, 'destination');
        }
    };

    const handleCreateShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!formData.vehicle) {
            setErrorMessage('Vehicle type selection is mandatory for creating a shipment.');
            setSubmitStatus('error');
            return;
        }

        if (selectedCategory === 'two_wheeler' && parseNum(formData.weight) > 20) {
            setErrorMessage('Maximum product weight for Two Wheeler is 20 kg. For heavier loads, please select 3 Wheeler Cargo or a Truck.');
            setSubmitStatus('error');
            return;
        }

        setSubmitStatus('loading');

        // Activate search UI instantly in searching mode (-1) to feel super responsive!
        setSearchingBookingId(-1);
        setSearchTimeLeft(45);
        setSearchPhase(0);
        setSearchTimeoutError(false);
        setMatchedDriverDetails(null);

        try {
            // Use custom product type if "Other" is selected, otherwise use the selected product type
            const productListForSubmit = productTypes.length ? productTypes : FALLBACK_PRODUCT_TYPES;
            const selectedProduct = productListForSubmit.find((item) => String(item.id) === formData.productType);
            const finalProductType =
                formData.productType === 'Other'
                    ? formData.customProductType
                    : selectedProduct?.name ?? formData.productType;

            const finalPickupAddress = [
                formData.pickupHouseNo ? `H.No: ${formData.pickupHouseNo}` : '',
                formData.pickupBuildingNo ? `Bldg: ${formData.pickupBuildingNo}` : '',
                formData.pickup
            ].filter(Boolean).join(', ');

            const finalDropAddress = [
                formData.dropHouseNo ? `H.No: ${formData.dropHouseNo}` : '',
                formData.dropBuildingNo ? `Bldg: ${formData.dropBuildingNo}` : '',
                formData.destination
            ].filter(Boolean).join(', ');

            const payload = {
                customerId: user?.userId || user?.id || user?.UserId || '',
                customerName: user?.firstName || user?.name || user?.company || 'Customer',
                pickupAddress: finalPickupAddress,
                dropAddress: finalDropAddress,
                pickupLat: parseNum(formData.pickupLat),
                pickupLng: parseNum(formData.pickupLng),
                dropLat: parseNum(formData.dropLat),
                dropLng: parseNum(formData.dropLng),
                goodsWeight: parseNum(formData.weight),
                goodsType: finalProductType,
                estimatedFare: calculateLiveFare(),
                scheduledTime: new Date().toISOString(),
                CT_VehicleType: toCommonTypeId(formData.vehicle),
                CTBodyType: toCommonTypeId(formData.ctBodyType),
                CTTyreType: toCommonTypeId(formData.ctTyreType),
                radiusKm: 50,
            };

            const res = await apiClient.post('/Vehicle/matchDriversAndRequestRide', payload);
            const data = res.data || {};
            const bookingId = Number(data.bookingId ?? data.BookingId ?? 0);
            const matchedCount = Number(data.matchedCount ?? data.MatchedCount ?? 0);

            if (!bookingId) {
                throw new Error(data.message || data.Message || 'Ride request creation failed.');
            }

            const selectedVehicleType = vehicleTypes.find((v) => v.id === Number(formData.vehicle));
            const vehicleName = selectedVehicleType ? selectedVehicleType.name : 'Unknown Vehicle';

            const newShipment: Shipment = {
                id: bookingId,
                productType: finalProductType,
                pickup: formData.pickup,
                destination: formData.destination,
                weight: parseNum(formData.weight),
                vehicle: vehicleName,
                matchedCount,
                status: 'request_for_ride',
                date: new Date().toLocaleDateString(),
            };

            setShipments((prev) => [newShipment, ...prev]);
            setSubmitStatus('idle'); // clear processing button spinner
            
            // Promote simulated searching ID (-1) to the actual booking ID
            setSearchingBookingId(bookingId);

            // Clean the form
            setFormData({
                productType: '',
                customProductType: '',
                pickup: '',
                destination: '',
                pickupLat: '',
                pickupLng: '',
                dropLat: '',
                dropLng: '',
                weight: '',
                vehicle: '',
                ctBodyType: '',
                ctTyreType: '',
                pickupBuildingNo: '',
                pickupHouseNo: '',
                dropBuildingNo: '',
                dropHouseNo: '',
            });
        } catch (err: any) {
            console.error(err);
            const errText = err?.response?.data?.message || err?.response?.data?.Message || err?.message || 'Failed to submit shipment.';
            
            // Instead of instantly failing on screen, save the error and switch searching ID to simulated failure state (-100)
            // This lets the premium animation play for 15 seconds before revealing the error!
            setErrorMessage(errText);
            setSearchingBookingId(-100);
            setSubmitStatus('idle');
            
            // Clean the form as well so they don't have to re-fill or can modify
            setFormData({
                productType: '',
                customProductType: '',
                pickup: '',
                destination: '',
                pickupLat: '',
                pickupLng: '',
                dropLat: '',
                dropLng: '',
                weight: '',
                vehicle: '',
                ctBodyType: '',
                ctTyreType: '',
                pickupBuildingNo: '',
                pickupHouseNo: '',
                dropBuildingNo: '',
                dropHouseNo: '',
            });
        }
    };


    const reportDispute = async (rideId: number, endpoint: 'reportComplaint' | 'reportRideIssue') => {
        const description = (disputeDrafts[rideId] || '').trim();
        if (!description) {
            alert('Please write issue details first.');
            return;
        }

        try {
            const payload = {
                rideId,
                issueType: endpoint === 'reportRideIssue' ? 'ride_issue' : 'complaint',
                description,
                createdBy: Number(user?.appUserId || user?.AppUserId || 0),
            };
            const res = await apiClient.post(`/Dispute/${endpoint}`, payload);
            alert(res.data?.message || res.data?.Message || 'Dispute submitted.');
            setDisputeDrafts((prev) => ({ ...prev, [rideId]: '' }));
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Dispute submission failed.');
        }
    };

    const submitDriverRating = async () => {
        if (!selectedRatingBooking) return;
        const customerId = user?.userId || user?.id || user?.UserId || '';
        const driverUserId = selectedRatingBooking.driverUserId || selectedRatingBooking.DriverUserId;

        if (!driverUserId) {
            alert('No driver user account is linked to this shipment.');
            return;
        }

        setSubmittingRating(true);
        try {
            await apiClient.post(`/Vehicle/rateDriver?customerUserId=${customerId}&driverUserId=${driverUserId}&bookingId=${selectedRatingBooking.id}&score=${ratingScore}&comment=${encodeURIComponent(ratingComment)}`);
            alert('Thank you! Your rating has been submitted.');
            setIsRatingModalOpen(false);
            setRatingScore(5);
            setRatingComment('');
            setSelectedRatingBooking(null);
        } catch (err: any) {
            console.error('Rating submit error:', err);
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Failed to submit rating.');
        } finally {
            setSubmittingRating(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // Radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        return Math.round(d * 10) / 10;
    };

    const reverseGeocode = async (lat: number, lng: number, field: 'pickup' | 'destination') => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) {
                setFormData(p => ({ ...p, [field]: data.display_name }));
            }
        } catch (err) {
            console.error("Reverse geocoding failed:", err);
        }
    };

    const searchDebounceRef = useRef<any>(null);

    const isWithinIndia = (lat: number, lng: number) => {
        return lat >= 6.0 && lat <= 37.8 && lng >= 68.0 && lng <= 97.8;
    };

    const forwardGeocode = async (address: string, field: 'pickup' | 'destination') => {
        if (!address || address.trim().length < 2) return;
        const cleanAddress = address.trim();
        try {
            // 1. Primary Nominatim search
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&limit=5&addressdetails=1`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const validItem = data.find((item: any) => isWithinIndia(parseFloat(item.lat), parseFloat(item.lon)));
                    if (validItem) {
                        const latStr = parseFloat(validItem.lat).toFixed(6);
                        const lngStr = parseFloat(validItem.lon).toFixed(6);
                        if (field === 'pickup') {
                            setFormData(p => ({ ...p, pickup: validItem.display_name || cleanAddress, pickupLat: latStr, pickupLng: lngStr }));
                        } else {
                            setFormData(p => ({ ...p, destination: validItem.display_name || cleanAddress, dropLat: latStr, dropLng: lngStr }));
                        }
                        setActiveMapFocus(field);
                        return;
                    }
                }
            }

            // 2. Retry Nominatim with explicit India suffix if not present
            if (!cleanAddress.toLowerCase().includes('india')) {
                const resIndia = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress + ', India')}&limit=5&addressdetails=1`);
                if (resIndia.ok) {
                    const dataIndia = await resIndia.json();
                    if (Array.isArray(dataIndia)) {
                        const validItem = dataIndia.find((item: any) => isWithinIndia(parseFloat(item.lat), parseFloat(item.lon)));
                        if (validItem) {
                            const latStr = parseFloat(validItem.lat).toFixed(6);
                            const lngStr = parseFloat(validItem.lon).toFixed(6);
                            if (field === 'pickup') {
                                setFormData(p => ({ ...p, pickup: validItem.display_name || cleanAddress, pickupLat: latStr, pickupLng: lngStr }));
                            } else {
                                setFormData(p => ({ ...p, destination: validItem.display_name || cleanAddress, dropLat: latStr, dropLng: lngStr }));
                            }
                            setActiveMapFocus(field);
                            return;
                        }
                    }
                }
            }

            // 3. Fallback to Photon API
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanAddress)}&limit=8`);
            if (photonRes.ok) {
                const photonData = await photonRes.json();
                if (photonData?.features && photonData.features.length > 0) {
                    const validFeature = photonData.features.find((f: any) => {
                        const coords = f.geometry?.coordinates;
                        return coords && coords.length >= 2 && isWithinIndia(coords[1], coords[0]);
                    });
                    if (validFeature) {
                        const coords = validFeature.geometry.coordinates;
                        const props = validFeature.properties || {};
                        const placeName = [props.name, props.district || props.city, props.state, 'India'].filter(Boolean).join(', ');
                        const latStr = parseFloat(coords[1]).toFixed(6);
                        const lngStr = parseFloat(coords[0]).toFixed(6);
                        if (field === 'pickup') {
                            setFormData(p => ({ ...p, pickup: placeName || cleanAddress, pickupLat: latStr, pickupLng: lngStr }));
                        } else {
                            setFormData(p => ({ ...p, destination: placeName || cleanAddress, dropLat: latStr, dropLng: lngStr }));
                        }
                        setActiveMapFocus(field);
                    }
                }
            }
        } catch (err) {
            console.error("Forward geocoding failed:", err);
        }
    };

    const useCurrentLocation = (field: 'pickup' | 'destination') => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        setLocatingField(field);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const latStr = lat.toFixed(6);
                const lngStr = lng.toFixed(6);

                if (field === 'pickup') {
                    setFormData(p => ({
                        ...p,
                        pickupLat: latStr,
                        pickupLng: lngStr,
                        pickup: 'Detecting live location...'
                    }));
                } else {
                    setFormData(p => ({
                        ...p,
                        dropLat: latStr,
                        dropLng: lngStr,
                        destination: 'Detecting live location...'
                    }));
                }

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                    const data = await res.json();
                    const addressName = (data && data.display_name) 
                        ? data.display_name 
                        : `Live Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

                    if (field === 'pickup') {
                        setFormData(p => ({ ...p, pickup: addressName, pickupLat: latStr, pickupLng: lngStr }));
                    } else {
                        setFormData(p => ({ ...p, destination: addressName, dropLat: latStr, dropLng: lngStr }));
                    }
                    setActiveMapFocus(field);
                } catch (err) {
                    console.error("Failed to reverse geocode current location:", err);
                    const fallbackName = `Live Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                    if (field === 'pickup') {
                        setFormData(p => ({ ...p, pickup: fallbackName, pickupLat: latStr, pickupLng: lngStr }));
                    } else {
                        setFormData(p => ({ ...p, destination: fallbackName, dropLat: latStr, dropLng: lngStr }));
                    }
                } finally {
                    setLocatingField(null);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Unable to fetch your live location. Please allow location permissions in your browser.");
                setLocatingField(null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const fetchAddressSuggestions = (query: string, field: 'pickup' | 'destination') => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        if (!query || query.trim().length < 2) {
            if (field === 'pickup') {
                setPickupSuggestions([]);
                setShowPickupSuggestions(false);
            } else {
                setDropSuggestions([]);
                setShowDropSuggestions(false);
            }
            return;
        }

        const cleanQuery = query.trim();

        searchDebounceRef.current = setTimeout(async () => {
            try {
                // 1. Search OpenStreetMap Nominatim
                let nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=8&addressdetails=1`);
                let nomData = nomRes.ok ? await nomRes.json() : [];

                if ((!Array.isArray(nomData) || nomData.length === 0) && !cleanQuery.toLowerCase().includes('india')) {
                    const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', India')}&limit=8&addressdetails=1`);
                    if (fallbackRes.ok) {
                        nomData = await fallbackRes.json();
                    }
                }

                if (Array.isArray(nomData) && nomData.length > 0) {
                    const items = nomData
                        .filter((item: any) => isWithinIndia(parseFloat(item.lat), parseFloat(item.lon)))
                        .map((item: any) => ({
                            display_name: item.display_name,
                            lat: item.lat,
                            lon: item.lon,
                        }));

                    if (items.length > 0) {
                        if (field === 'pickup') {
                            setPickupSuggestions(items);
                            setShowPickupSuggestions(true);
                        } else {
                            setDropSuggestions(items);
                            setShowDropSuggestions(true);
                        }
                        return;
                    }
                }

                // 2. Photon API Fallback
                const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8`);
                if (photonRes.ok) {
                    const photonData = await photonRes.json();
                    if (photonData?.features && Array.isArray(photonData.features) && photonData.features.length > 0) {
                        const items = photonData.features
                            .filter((f: any) => {
                                const coords = f.geometry?.coordinates;
                                return coords && coords.length >= 2 && isWithinIndia(coords[1], coords[0]);
                            })
                            .map((f: any) => {
                                const props = f.properties || {};
                                const coords = f.geometry?.coordinates || [77.2090, 28.6139];
                                const villageOrName = props.name || cleanQuery;
                                const districtOrCity = props.district || props.city || props.county || '';
                                const state = props.state || '';
                                const formatted = [villageOrName, districtOrCity, state, 'India'].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                                return {
                                    display_name: formatted,
                                    lat: coords[1],
                                    lon: coords[0],
                                };
                            });

                        if (items.length > 0) {
                            if (field === 'pickup') {
                                setPickupSuggestions(items);
                                setShowPickupSuggestions(true);
                            } else {
                                setDropSuggestions(items);
                                setShowDropSuggestions(true);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch address suggestions:", err);
            }
        }, 250);
    };

    const handleSelectSuggestion = (item: any, field: 'pickup' | 'destination') => {
        const latStr = parseFloat(item.lat).toFixed(6);
        const lngStr = parseFloat(item.lon).toFixed(6);
        const addressName = item.display_name || item.name || '';

        if (field === 'pickup') {
            setFormData(p => ({ ...p, pickup: addressName, pickupLat: latStr, pickupLng: lngStr }));
            setShowPickupSuggestions(false);
        } else {
            setFormData(p => ({ ...p, destination: addressName, dropLat: latStr, dropLng: lngStr }));
            setShowDropSuggestions(false);
        }
        setActiveMapFocus(field);
    };

    const calculateLiveFare = () => {
        const pLat = parseFloat(formData.pickupLat);
        const pLng = parseFloat(formData.pickupLng);
        const dLat = parseFloat(formData.dropLat);
        const dLng = parseFloat(formData.dropLng);
        if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
            return 0;
        }

        const distanceKm = calculateDistance(pLat, pLng, dLat, dLng);
        if (distanceKm <= 0) return 0;

        const fare = distanceKm * 20;
        return Math.max(20, Math.round(fare));
    };

    const productPicklist = productTypes.length ? productTypes : FALLBACK_PRODUCT_TYPES;

    const isLiveShipment = (status: string) => {
        const s = String(status || '').trim().toLowerCase();
        return s === 'request_for_ride' || s === 'driver_assigned' || s === 'driver_arriving' || s === 'ride_started' || s === '1' || s === '2' || s === '3' || s === '4';
    };
    const activeShipments = shipments.filter(s => isLiveShipment(s.status));
    const previousShipments = shipments.filter(s => !isLiveShipment(s.status));

    return (
        <>
            <div className="flex h-screen bg-slate-50 overflow-hidden font-sans w-full">
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
                                onClick={() => { openShipmentList(); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'shipments' ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <LayoutDashboard className={`h-5 w-5 ${activeTab === 'shipments' ? 'text-primary-600' : ''}`} />
                                Overview
                            </button>
                            <button
                                onClick={() => { openNewShipment(); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'new' ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Package className={`h-5 w-5 ${activeTab === 'new' ? 'text-primary-600' : ''}`} />
                                Add Shipment
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
                                        onClick={() => { navigate('/profile?tab=addresses'); setSidebarOpen(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left"
                                    >
                                        <Home className="h-4 w-4 text-slate-400" />
                                        Saved Addresses
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
                                {(user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'C').toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName || user?.name || 'Customer'}</p>
                                <p className="text-xs text-slate-500 truncate">CUSTOMER</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-slate-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
                    {/* Mobile Header Bar */}
                    <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg">
                            <Menu className="h-6 w-6 text-white" />
                        </button>
                        <span className="font-extrabold tracking-tight">Navgatix</span>
                        <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 text-sm cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all">
                            {(user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'C').toUpperCase()}
                        </button>
                    </header>

                    <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                {submitStatus === 'success' && (
                    <div className="mb-8 flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                        <div className="mt-0.5">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-800">Shipment Requested Successfully</h4>
                            <p className="mt-1 text-sm text-emerald-700">Ride request sent to available drivers within 50 km.</p>
                        </div>
                    </div>
                )}

                {submitStatus === 'error' && (
                    <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {errorMessage || 'Unable to submit shipment.'}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="col-span-1 lg:col-span-2">
                        {activeTab === 'shipments' ? (
                            <div>
                                <h2 className="mb-6 flex items-center justify-between text-xl font-bold text-slate-800">
                                    <span className="flex items-center gap-2">
                                        <Search className="h-5 w-5 text-emerald-600" /> Active Shipments
                                    </span>
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                        {activeShipments.length} Live
                                    </span>
                                </h2>

                                {/* Prominent Active Shipment Hero Live Tracking Card */}
                                {activeShipments.filter(s => ['driver_assigned', 'driver_arriving', 'ride_started'].includes(s.status)).map((activeShip) => (
                                    <div key={activeShip.id} className="mb-8 rounded-3xl border border-indigo-150 bg-indigo-50/20 p-6 shadow-md border-t-4 border-t-indigo-600 animate-in fade-in slide-in-from-top duration-500">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                                            <div>
                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 tracking-wider uppercase">
                                                    Active Delivery: Ride #{activeShip.id}
                                                </span>
                                                <h3 className="text-xl font-black text-slate-900 mt-2">Live Shipment Tracking</h3>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Moving Status</p>
                                                <p className="text-sm font-extrabold text-indigo-600 uppercase mt-0.5 animate-pulse">
                                                    {activeShip.status === 'driver_assigned' && 'Driver Assigned'}
                                                    {activeShip.status === 'driver_arriving' && 'Driver is Arriving at Pickup'}
                                                    {activeShip.status === 'ride_started' && 'Journey in Progress'}
                                                </p>
                                            </div>
                                        </div>

                                        {shipmentMetrics[activeShip.id] && (
                                            <div className="mb-6 bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg border border-indigo-500/30 animate-in fade-in duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shrink-0 shadow-md">
                                                        {shipmentMetrics[activeShip.id].phase === 'delivery' ? '📦' : '🚚'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                                                            {shipmentMetrics[activeShip.id].phase === 'delivery' ? 'Live Progress: Goods En Route to Drop' : 'Live Progress: Driver En Route to Pickup'}
                                                        </p>
                                                        <p className="text-base font-extrabold text-white">
                                                            {shipmentMetrics[activeShip.id].phase === 'delivery' 
                                                                ? `${shipmentMetrics[activeShip.id].distanceKm} km from Drop Point` 
                                                                : `Driver is ${shipmentMetrics[activeShip.id].distanceKm} km away from pickup`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl px-4 py-2 text-right">
                                                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Estimated Time</p>
                                                    <p className="text-base font-black text-emerald-400">~{shipmentMetrics[activeShip.id].etaMins} mins</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                                <TrackingMap 
                                                    bookingId={activeShip.id}
                                                    pickupLat={activeShip.pickupLat || 28.6139}
                                                    pickupLng={activeShip.pickupLng || 77.2090}
                                                    dropLat={activeShip.dropLat || 19.0760}
                                                    dropLng={activeShip.dropLng || 72.8777}
                                                    rideStatus={activeShip.status}
                                                    onMetricsUpdate={(m) => {
                                                        setShipmentMetrics((prev) => ({ ...prev, [activeShip.id]: m }));
                                                    }}
                                                />
                                            </div>

                                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg uppercase shadow-sm">
                                                            {activeShip.driverName?.substring(0, 2) || 'DR'}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500 uppercase">Your Driver</p>
                                                            <p className="font-bold text-slate-900 text-base">{activeShip.driverName || 'Assigned Driver'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Vehicle:</span>
                                                            <span className="font-semibold text-slate-800">{activeShip.vehicleName || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Vehicle No:</span>
                                                            <span className="font-semibold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded text-xs">{activeShip.vehicleNumber || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Estimated Fare:</span>
                                                            <span className="font-bold text-slate-800">Rs {activeShip.estimatedFare}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                                                            <span className="text-slate-500 text-xs font-medium">Payment Status:</span>
                                                            {activeShip.paymentStatus?.includes('Paid') ? (
                                                                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                                                                    ✓ {activeShip.paymentStatus}
                                                                </span>
                                                            ) : (
                                                                <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs">
                                                                    ⏳ Pending Driver Collection
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 mt-6">
                                                    {activeShip.driverPhone && (
                                                        <a 
                                                            href={`tel:${activeShip.driverPhone}`} 
                                                            className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            📞 Call
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => setChatBookingId(activeShip.id)}
                                                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        💬 Chat
                                                    </button>
                                                </div>

                                                {(activeShip.status === 'driver_assigned' || activeShip.status === 'driver_arriving') && (
                                                    <button 
                                                        onClick={async () => {
                                                            if (window.confirm("Are you sure you want to cancel this ride?")) {
                                                                try {
                                                                    await apiClient.patch(`/Vehicle/${activeShip.id}/rideStatus`, null, { params: { status: 'cancelled', cancelledBy: 'Customer' } });
                                                                    alert('Ride cancelled successfully.');
                                                                    loadShipments();
                                                                } catch (err) {
                                                                    console.error("Failed to cancel ride:", err);
                                                                }
                                                            }
                                                        }}
                                                        className="w-full mt-3 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        🚫 Cancel Ride
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {activeShipments.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-100/50 p-8 text-center text-slate-500 mb-10">
                                        <p className="font-semibold text-slate-600">No active live shipments right now.</p>
                                        <button
                                            onClick={openNewShipment}
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-colors hover:bg-primary-500 cursor-pointer"
                                        >
                                            <Package className="h-4 w-4" />
                                            Add Shipment
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mb-10">
                                        {activeShipments.map((shipment) => (
                                            <div key={shipment.id} className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-sm border-l-4 border-l-emerald-500">
                                                <div className="mb-4 flex items-start justify-between">
                                                    <div>
                                                        <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-emerald-600">
                                                            Ride #{shipment.id}
                                                        </span>
                                                        <h3 className="mt-3 font-bold text-slate-900">{shipment.vehicle}</h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {shipment.productType} | {shipment.weight} kg
                                                        </p>
                                                    </div>
                                                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 capitalize">
                                                        {shipment.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </div>

                                                <div className="mb-4 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-400" /> {shipment.pickup}
                                                    </div>
                                                    <span className="text-slate-300">to</span>
                                                    <div className="flex items-center gap-2">
                                                        <Navigation className="h-4 w-4 text-slate-400" /> {shipment.destination}
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-3">
                                                    <input
                                                        value={disputeDrafts[shipment.id] || ''}
                                                        onChange={(e) => setDisputeDrafts((prev) => ({ ...prev, [shipment.id]: e.target.value }))}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                                                        placeholder="Report complaint or ride issue"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => reportDispute(shipment.id, 'reportComplaint')}
                                                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold cursor-pointer"
                                                        >
                                                            Complaint
                                                        </button>
                                                        <button
                                                            onClick={() => reportDispute(shipment.id, 'reportRideIssue')}
                                                            className="flex-1 rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 cursor-pointer"
                                                        >
                                                            Ride Issue
                                                        </button>
                                                    </div>
                                                </div>

                                                {(shipment.status === 'ride_started' || shipment.status === 'driver_assigned' || shipment.status === 'driver_arriving') && (
                                                    <button
                                                        onClick={() => setTrackingBooking(shipment)}
                                                        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary-50 py-3 text-sm font-bold text-primary-700 hover:bg-primary-100 transition-colors cursor-pointer"
                                                    >
                                                        <Navigation className="h-4 w-4" />
                                                        Track Live Location
                                                    </button>
                                                )}
                                                
                                                <button
                                                    onClick={() => setChatBookingId(shipment.id)}
                                                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                                >
                                                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                                                    Chat with Driver
                                                </button>

                                                {(shipment.status === 'driver_assigned' || shipment.status === 'driver_arriving') && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Are you sure you want to cancel this ride?")) {
                                                                try {
                                                                    await apiClient.patch(`/Vehicle/${shipment.id}/rideStatus`, null, { params: { status: 'cancelled' } });
                                                                    alert('Ride cancelled successfully.');
                                                                    loadShipments();
                                                                } catch (err) {
                                                                    console.error("Failed to cancel ride:", err);
                                                                }
                                                            }
                                                        }}
                                                        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 py-3 text-sm font-bold text-red-700 transition-all cursor-pointer"
                                                    >
                                                        🚫 Cancel Ride
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* PREVIOUS SHIPMENTS SECTION */}
                                <div className="mt-12 border-t border-slate-200 pt-8">
                                    <div className="mb-6 flex items-center justify-between">
                                        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                                            <History className="h-5 w-5 text-slate-500" /> Previous Shipments
                                        </h2>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                            {previousShipments.length} Previous
                                        </span>
                                    </div>

                                    {previousShipments.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                                            <p className="font-medium text-slate-500">No previous shipments yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {previousShipments.map((shipment) => (
                                                <div key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-95">
                                                    <div className="mb-4 flex items-start justify-between">
                                                        <div>
                                                            <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                                                                Ride #{shipment.id}
                                                            </span>
                                                            <h3 className="mt-3 font-bold text-slate-900">{shipment.vehicle}</h3>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {shipment.productType} | {shipment.weight} kg
                                                            </p>
                                                        </div>
                                                        <span className={`rounded-lg px-3 py-1 text-sm font-semibold capitalize ${shipment.status === 'ride_completed' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-600'}`}>
                                                            {shipment.status?.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>

                                                    <div className="mb-4 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-slate-400" /> {shipment.pickup}
                                                        </div>
                                                        <span className="text-slate-300">to</span>
                                                        <div className="flex items-center gap-2">
                                                            <Navigation className="h-4 w-4 text-slate-400" /> {shipment.destination}
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-3 md:grid-cols-3">
                                                        <input
                                                            value={disputeDrafts[shipment.id] || ''}
                                                            onChange={(e) => setDisputeDrafts((prev) => ({ ...prev, [shipment.id]: e.target.value }))}
                                                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                                                            placeholder="Report complaint or ride issue"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => reportDispute(shipment.id, 'reportComplaint')}
                                                                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold cursor-pointer"
                                                            >
                                                                Complaint
                                                            </button>
                                                            <button
                                                                onClick={() => reportDispute(shipment.id, 'reportRideIssue')}
                                                                className="flex-1 rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 cursor-pointer"
                                                            >
                                                                Ride Issue
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {shipment.status === 'ride_completed' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRatingBooking(shipment);
                                                                setIsRatingModalOpen(true);
                                                            }}
                                                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 text-sm font-bold text-white shadow-md shadow-amber-500/10 transition-all cursor-pointer"
                                                        >
                                                            <Star className="h-4 w-4 fill-white" />
                                                            Rate Driver
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Dark Hero Header Banner for Home Tab */}
                                <div className="mb-8 overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl shadow-slate-300/40">
                                    <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.3fr_0.9fr] lg:px-10">
                                        <div>
                                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-primary-200">
                                                <Truck className="h-4 w-4" />
                                                Hii, {user?.firstName || user?.name || 'Customer'}
                                            </div>
                                            <h1 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight">Customer (Logistics) Dashboard</h1>
                                            <p className="mt-4 max-w-2xl text-sm md:text-lg leading-7 md:leading-8 text-slate-300">
                                                This page is dedicated to customers. Add a shipment request, choose the required vehicle, and track every active booking from one place.
                                            </p>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                                                <p className="text-sm font-medium text-slate-300">Active Requests</p>
                                                <p className="mt-2 text-3xl font-extrabold">{activeShipments.length}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                                                <p className="text-sm font-medium text-slate-300">Required Details</p>
                                                <p className="mt-2 text-lg font-bold">Product, vehicle, weight, location</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                                                <p className="text-sm font-medium text-slate-300">Route Scope</p>
                                                <p className="mt-2 text-lg font-bold">Pickup and drop workflow</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                                <div className="mb-8 flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                                            <Package className="h-6 w-6 text-primary-600" /> Add Shipment
                                        </h2>
                                        <p className="mt-2 text-slate-500">Fill the shipment details below to request a driver.</p>
                                    </div>
                                    <div className="hidden rounded-2xl border border-primary-100 bg-primary-50 p-4 text-primary-700 sm:block">
                                        <p className="text-sm font-semibold">Required fields</p>
                                        <p className="mt-1 text-sm">Product type, vehicle type, product weight, pickup, and drop location.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateShipment} className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Product Type</label>
                                            <select
                                                required
                                                name="productType"
                                                value={formData.productType}
                                                onChange={handleChange}
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                                            >
                                                <option value="">-- Select Product Type --</option>
                                                {productPicklist.map((product) => (
                                                    <option key={product.id} value={String(product.id)}>
                                                        {product.name}
                                                    </option>
                                                ))}
                                                <option value="Other">Other</option>
                                            </select>
                                            {formData.productType === 'Other' && (
                                                <input
                                                    type="text"
                                                    name="customProductType"
                                                    value={formData.customProductType}
                                                    onChange={handleChange}
                                                    placeholder="Please specify your product type..."
                                                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* 3 Visual Vehicle Category Selector Cards */}
                                    <div className="col-span-full space-y-3">
                                        <label className="flex items-center justify-between text-sm font-extrabold text-slate-800">
                                            <span className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-primary-600" /> Select Vehicle Category <span className="text-rose-500 font-bold text-xs">(Required)</span>
                                            </span>
                                            {formData.vehicle && (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                                    ✓ Selected: {getSelectedVehicleName()}
                                                </span>
                                            )}
                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Card 1: Two Wheeler */}
                                            <button
                                                type="button"
                                                onClick={() => handleSelectCategory('two_wheeler')}
                                                className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                                    selectedCategory === 'two_wheeler'
                                                        ? 'border-primary-600 bg-gradient-to-br from-primary-50 to-indigo-50/80 shadow-md ring-2 ring-primary-500/20'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-primary-600">Quick Parcel</span>
                                                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                                        selectedCategory === 'two_wheeler' ? 'bg-primary-600 text-white border-primary-600 font-bold' : 'border-slate-300'
                                                    }`}>
                                                        {selectedCategory === 'two_wheeler' ? '✓' : ''}
                                                    </span>
                                                </div>
                                                <div className="h-28 flex items-center justify-center py-1">
                                                    <img src={scooterImg} alt="Two Wheeler" className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-300" />
                                                </div>
                                                <div className="mt-2">
                                                    <h4 className="font-extrabold text-slate-900 text-base">Two Wheeler</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Quick local delivery & parcels</p>
                                                </div>
                                            </button>

                                            {/* Card 2: Three Wheeler Cargo */}
                                            <button
                                                type="button"
                                                onClick={() => handleSelectCategory('three_wheeler')}
                                                className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                                    selectedCategory === 'three_wheeler'
                                                        ? 'border-primary-600 bg-gradient-to-br from-primary-50 to-indigo-50/80 shadow-md ring-2 ring-primary-500/20'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-primary-600">Light Cargo</span>
                                                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                                        selectedCategory === 'three_wheeler' ? 'bg-primary-600 text-white border-primary-600 font-bold' : 'border-slate-300'
                                                    }`}>
                                                        {selectedCategory === 'three_wheeler' ? '✓' : ''}
                                                    </span>
                                                </div>
                                                <div className="h-28 flex items-center justify-center py-1">
                                                    <img src={autoImg} alt="Three Wheeler Cargo" className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-300" />
                                                </div>
                                                <div className="mt-2">
                                                    <h4 className="font-extrabold text-slate-900 text-base">3 Wheeler Cargo</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Auto rickshaw cargo for light loads</p>
                                                </div>
                                            </button>

                                            {/* Card 3: Trucks / Heavy Vehicles */}
                                            <button
                                                type="button"
                                                onClick={() => handleSelectCategory('truck')}
                                                className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                                    selectedCategory === 'truck'
                                                        ? 'border-primary-600 bg-gradient-to-br from-primary-50 to-indigo-50/80 shadow-md ring-2 ring-primary-500/20'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-primary-600">Heavy Freight</span>
                                                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                                        selectedCategory === 'truck' ? 'bg-primary-600 text-white border-primary-600 font-bold' : 'border-slate-300'
                                                    }`}>
                                                        {selectedCategory === 'truck' ? '✓' : ''}
                                                    </span>
                                                </div>
                                                <div className="h-28 flex items-center justify-center py-1">
                                                    <img src={truckImg} alt="Trucks / Heavy Vehicles" className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-300" />
                                                </div>
                                                <div className="mt-2">
                                                    <h4 className="font-extrabold text-slate-900 text-base">Trucks / Heavy Vehicles</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Mini truck, LCV, 14ft-32ft & Container</p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Truck Sub-options Grid */}
                                        {selectedCategory === 'truck' && (
                                            <div className="mt-4 p-5 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-300">
                                                <p className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    🚚 Select Specific Truck Type:
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                    {TRUCK_SUBTYPES.map((truck) => {
                                                        const matchedVt = findVehicleTypeByKeywords(truck.keywords);
                                                        const vtIdStr = matchedVt ? String(matchedVt.id) : '';
                                                        const isSelected = formData.vehicle === vtIdStr;

                                                        return (
                                                            <button
                                                                key={truck.key}
                                                                type="button"
                                                                onClick={() => handleSelectTruckSubtype(truck)}
                                                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                                                                    isSelected
                                                                        ? 'border-primary-600 bg-white text-primary-900 shadow-md ring-2 ring-primary-500/30 font-bold'
                                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between w-full mb-1">
                                                                    <span className="text-lg">{truck.icon}</span>
                                                                    {isSelected && <span className="text-xs text-primary-600 font-black">✓</span>}
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-800 leading-snug">{truck.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Hidden input to guarantee native form validation compatibility */}
                                        <input type="hidden" name="vehicle" value={formData.vehicle} required />
                                    </div>
                                    
                                    {/* Body Type & Vehicle Tyre options are ONLY visible when Truck category is selected */}
                                    {selectedCategory === 'truck' && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                    <Layout className="h-4 w-4 text-primary-600" /> Body Type <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                                                </label>
                                                <select
                                                    name="ctBodyType"
                                                    value={formData.ctBodyType}
                                                    onChange={handleChange}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                                                >
                                                    <option value="">-- Any Body Type --</option>
                                                    {(Array.isArray(bodyTypes) ? bodyTypes : []).map((bt) => (
                                                        <option key={bt.id} value={bt.id}>{bt.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                    <Database className="h-4 w-4 text-primary-600" /> Vehicle Tyre <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                                                </label>
                                                <select
                                                    name="ctTyreType"
                                                    value={formData.ctTyreType}
                                                    onChange={handleChange}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                                                >
                                                    <option value="">-- Any Tyre Configuration --</option>
                                                    {(Array.isArray(tyreTypes) ? tyreTypes : []).map((tt) => (
                                                        <option key={tt.id} value={tt.id}>{tt.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Product Weight (kg)</label>
                                            <input
                                                required
                                                min="1"
                                                type="number"
                                                name="weight"
                                                value={formData.weight}
                                                onChange={handleChange}
                                                placeholder="Weight in kg"
                                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                                            />
                                            {selectedCategory === 'two_wheeler' && parseNum(formData.weight) > 20 && (
                                                <div className="mt-2.5 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm">
                                                    <span className="text-base">⚠️</span>
                                                    <span>Maximum weight for Two Wheeler is 20 kg. For heavier loads, please select 3 Wheeler Cargo or a Truck.</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-sm font-semibold text-slate-700">Matching note</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">Vehicle match is based on the selected vehicle requirements and the pickup/drop details you provide.</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
                                                <label className="text-sm font-semibold text-slate-700">Pickup Location</label>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveSavedAddressModal('pickup')}
                                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all active:scale-95 shadow-sm"
                                                        title="Choose from My Saved Pickup Addresses"
                                                    >
                                                        <Bookmark className="w-3 h-3 text-emerald-600 fill-emerald-600/30" />
                                                        <span>Saved Addresses</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => useCurrentLocation('pickup')}
                                                        disabled={locatingField === 'pickup'}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all active:scale-95 shadow-sm"
                                                        title="Set Pickup to My Current Live GPS Location"
                                                    >
                                                        {locatingField === 'pickup' ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                <span>Locating...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Navigation className="w-3 h-3 text-indigo-600 fill-indigo-600/20" />
                                                                <span>Use Current Location</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        required
                                                        type="text"
                                                        name="pickup"
                                                        value={formData.pickup}
                                                        onChange={handleChange}
                                                        onFocus={() => {
                                                            if (formData.pickup && formData.pickup.trim().length >= 2) {
                                                                fetchAddressSuggestions(formData.pickup, 'pickup');
                                                            }
                                                        }}
                                                        placeholder="Pickup address or district"
                                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                                                    />
                                                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[999] max-h-56 overflow-y-auto divide-y divide-slate-100">
                                                            {pickupSuggestions.map((item, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => handleSelectSuggestion(item, 'pickup')}
                                                                    className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-start gap-2 cursor-pointer transition-colors"
                                                                >
                                                                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                                                    <span className="line-clamp-2">{item.display_name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => forwardGeocode(formData.pickup, 'pickup')}
                                                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer shrink-0 h-[46px]"
                                                >
                                                    Locate
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <input
                                                    type="text"
                                                    name="pickupBuildingNo"
                                                    value={formData.pickupBuildingNo}
                                                    onChange={handleChange}
                                                    placeholder="Building No. (Optional)"
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    name="pickupHouseNo"
                                                    value={formData.pickupHouseNo}
                                                    onChange={handleChange}
                                                    placeholder="House/Apt No. (Optional)"
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
                                                <label className="text-sm font-semibold text-slate-700">Drop Location</label>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveSavedAddressModal('destination')}
                                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all active:scale-95 shadow-sm"
                                                        title="Choose from My Saved Drop Addresses"
                                                    >
                                                        <Bookmark className="w-3 h-3 text-emerald-600 fill-emerald-600/30" />
                                                        <span>Saved Addresses</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => useCurrentLocation('destination')}
                                                        disabled={locatingField === 'destination'}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all active:scale-95 shadow-sm"
                                                        title="Set Drop to My Current Live GPS Location"
                                                    >
                                                        {locatingField === 'destination' ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                <span>Locating...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Navigation className="w-3 h-3 text-indigo-600 fill-indigo-600/20" />
                                                                <span>Use Current Location</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        required
                                                        type="text"
                                                        name="destination"
                                                        value={formData.destination}
                                                        onChange={handleChange}
                                                        onFocus={() => {
                                                            if (formData.destination && formData.destination.trim().length >= 2) {
                                                                fetchAddressSuggestions(formData.destination, 'destination');
                                                            }
                                                        }}
                                                        placeholder="Drop address or district"
                                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                                                    />
                                                    {showDropSuggestions && dropSuggestions.length > 0 && (
                                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[999] max-h-56 overflow-y-auto divide-y divide-slate-100">
                                                            {dropSuggestions.map((item, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => handleSelectSuggestion(item, 'destination')}
                                                                    className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-start gap-2 cursor-pointer transition-colors"
                                                                >
                                                                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                                                    <span className="line-clamp-2">{item.display_name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => forwardGeocode(formData.destination, 'destination')}
                                                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer shrink-0 h-[46px]"
                                                >
                                                    Locate
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <input
                                                    type="text"
                                                    name="dropBuildingNo"
                                                    value={formData.dropBuildingNo}
                                                    onChange={handleChange}
                                                    placeholder="Building No. (Optional)"
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    name="dropHouseNo"
                                                    value={formData.dropHouseNo}
                                                    onChange={handleChange}
                                                    placeholder="House/Apt No. (Optional)"
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div>
                                                <div className="mb-1 flex items-center gap-2 text-slate-800">
                                                    <MapPin className="h-5 w-5 text-primary-600" />
                                                    <h3 className="font-bold">Interactive Location Picker</h3>
                                                </div>
                                                <p className="text-sm text-slate-500">Drag the pins or click on the map to set exact pickup and drop coordinates.</p>
                                            </div>
                                        </div>

                                        <div className="h-[420px] w-full rounded-2xl overflow-hidden shadow-md border border-slate-300 mb-6 relative">
                                            {typeof window !== 'undefined' && (() => {
                                                const pLat = Number(formData.pickupLat);
                                                const pLng = Number(formData.pickupLng);
                                                const dLat = Number(formData.dropLat);
                                                const dLng = Number(formData.dropLng);
                                                const validP = Number.isFinite(pLat) && pLat !== 0;
                                                const validD = Number.isFinite(dLat) && dLat !== 0;

                                                const pickupIcon = L.divIcon({
                                                    className: 'custom-pickup-pin',
                                                    html: `<div style="background-color: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); font-weight: 900; font-size: 16px;">📍</div>`,
                                                    iconSize: [36, 36],
                                                    iconAnchor: [18, 18]
                                                });

                                                const dropIcon = L.divIcon({
                                                    className: 'custom-drop-pin',
                                                    html: `<div style="background-color: #ef4444; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); font-weight: 900; font-size: 16px;">🏁</div>`,
                                                    iconSize: [36, 36],
                                                    iconAnchor: [18, 18]
                                                });

                                                return (
                                                    <MapContainer
                                                        center={validP ? [pLat, pLng] : (validD ? [dLat, dLng] : [20.5937, 78.9629])}
                                                        zoom={validP || validD ? 14 : 5}
                                                        scrollWheelZoom={true}
                                                        style={{ height: '100%', width: '100%' }}
                                                    >
                                                        <TileLayer
                                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                                        />
                                                        
                                                        <MapAutoController pLat={pLat} pLng={pLng} dLat={dLat} dLng={dLng} focus={activeMapFocus} />

                                                        {validP && (
                                                            <Marker
                                                                position={[pLat, pLng]}
                                                                icon={pickupIcon}
                                                                draggable={true}
                                                                eventHandlers={{
                                                                    dragend: (e) => {
                                                                        const marker = e.target;
                                                                        const position = marker.getLatLng();
                                                                        setFormData(p => ({ ...p, pickupLat: position.lat.toFixed(6), pickupLng: position.lng.toFixed(6) }));
                                                                        reverseGeocode(position.lat, position.lng, 'pickup');
                                                                    },
                                                                }}
                                                            />
                                                        )}

                                                        {validD && (
                                                            <Marker
                                                                position={[dLat, dLng]}
                                                                icon={dropIcon}
                                                                draggable={true}
                                                                eventHandlers={{
                                                                    dragend: (e) => {
                                                                        const marker = e.target;
                                                                        const position = marker.getLatLng();
                                                                        setFormData(p => ({ ...p, dropLat: position.lat.toFixed(6), dropLng: position.lng.toFixed(6) }));
                                                                        reverseGeocode(position.lat, position.lng, 'destination');
                                                                    },
                                                                }}
                                                            />
                                                        )}

                                                        {validP && validD && (
                                                            <Polyline
                                                                positions={[[pLat, pLng], [dLat, dLng]]}
                                                                pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.85, dashArray: '10, 10' }}
                                                            />
                                                        )}
                                                    </MapContainer>
                                                );
                                            })()}
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase">Pickup Coordinates</label>
                                                <div className="grid grid-cols-2 gap-2 mt-1">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        name="pickupLat"
                                                        value={formData.pickupLat}
                                                        onChange={handleChange}
                                                        placeholder="Latitude"
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        name="pickupLng"
                                                        value={formData.pickupLng}
                                                        onChange={handleChange}
                                                        placeholder="Longitude"
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase">Drop Coordinates</label>
                                                <div className="grid grid-cols-2 gap-2 mt-1">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        name="dropLat"
                                                        value={formData.dropLat}
                                                        onChange={handleChange}
                                                        placeholder="Latitude"
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        name="dropLng"
                                                        value={formData.dropLng}
                                                        onChange={handleChange}
                                                        placeholder="Longitude"
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Price Preview */}
                                    {calculateLiveFare() > 0 && (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div>
                                                <h4 className="text-sm font-bold text-amber-800">Estimated Delivery Fare</h4>
                                                <p className="text-xs text-amber-600 mt-0.5">Calculated based on distance and selected vehicle type.</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-amber-900">Rs {calculateLiveFare().toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 pt-2">
                                        <button type="submit" disabled={submitStatus === 'loading'} className="btn-primary flex-1 rounded-xl py-4 text-lg font-bold">
                                            {submitStatus === 'loading' ? 'Processing...' : 'Submit and Find Driver'}
                                        </button>
                                        <button type="button" onClick={openShipmentList} className="rounded-xl border border-slate-300 px-6 py-4 font-bold">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                    </div>

                    <div className="col-span-1 space-y-6">
                        <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-6 text-white shadow-lg shadow-primary-500/20">
                            <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
                                <Anchor className="h-32 w-32" />
                            </div>
                            <h3 className="relative z-10 mb-4 font-bold">Quick Profile</h3>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-sm">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold leading-tight">{user?.firstName || user?.company || 'Customer'}</p>
                                    <p className="text-sm text-primary-100">Customer Account</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-800">
                                <History className="h-5 w-5 text-slate-400" /> Shipment History
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-600">
                                Found <strong className="text-slate-900">{previousShipments.length} previous records</strong> ({activeShipments.length} active live).
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-800">
                                <ArrowRightLeft className="h-5 w-5 text-slate-400" /> Shipment Checklist
                            </h3>
                            <ul className="space-y-3 text-sm text-slate-600">
                                <li>1. Enter the product type clearly.</li>
                                <li>2. Choose the required vehicle type.</li>
                                <li>3. Add product weight in kilograms.</li>
                                <li>4. Fill pickup and drop locations.</li>
                            </ul>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2 font-bold text-slate-800">
                                <Info className="h-5 w-5 text-primary-600" /> Vehicle Matching
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-600">
                                Matching uses backend geolocation. If exact map pins are not entered, the shipment still uses your pickup and drop addresses.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

            {/* Tracking Modal */}
            {trackingBooking && (
                <div onClick={() => setTrackingBooking(null)} className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Live Tracking: Ride #{trackingBooking.id}</h3>
                                <p className="text-sm text-slate-500">{trackingBooking.pickup} → {trackingBooking.destination}</p>
                            </div>
                            <button 
                                onClick={() => setTrackingBooking(null)}
                                className="rounded-full p-2 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6">
                            <TrackingMap 
                                bookingId={trackingBooking.id}
                                pickupLat={trackingBooking.pickupLat || formData.pickupLat || 28.6139}
                                pickupLng={trackingBooking.pickupLng || formData.pickupLng || 77.2090}
                                dropLat={trackingBooking.dropLat || formData.dropLat || 19.0760}
                                dropLng={trackingBooking.dropLng || formData.dropLng || 72.8777}
                            />
                            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{trackingBooking.vehicle}</p>
                                        <p className="text-sm text-slate-500">Status: <span className="font-semibold text-primary-600 uppercase">{trackingBooking.status}</span></p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {trackingBooking.driverPhone && (
                                        <a 
                                            href={`tel:${trackingBooking.driverPhone}`} 
                                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5"
                                        >
                                            📞 Call
                                        </a>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setChatBookingId(trackingBooking.id);
                                            setTrackingBooking(null);
                                        }}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center gap-1.5"
                                    >
                                        💬 Chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Realtime Searching Pulse / Radar Overlay */}
            {searchingBookingId !== null && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-md rounded-[2.5rem] bg-white p-8 text-center shadow-2xl overflow-hidden border border-slate-100 flex flex-col items-center">
                        
                        {matchedDriverDetails ? (
                            // SUCCESS MATCH SCREEN
                            <div className="space-y-6 animate-in zoom-in duration-300 w-full">
                                <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md">
                                    <CheckCircle className="h-10 w-10 animate-bounce" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Driver Assigned!</h3>
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Your load shipment is matched successfully</p>
                                </div>

                                {/* Driver details panel */}
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-150 text-left space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                                            {matchedDriverDetails.driverName ? matchedDriverDetails.driverName.split(' ').map((n: string) => n[0]).join('') : 'D'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{matchedDriverDetails.driverName || 'Madan Kumar'}</p>
                                            <p className="text-xs text-slate-400">Mobile: {matchedDriverDetails.driverPhone || '+91 98765 43210'}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between text-xs font-semibold text-slate-600">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">VEHICLE DETAILS</span>
                                            <span className="text-slate-800 uppercase">
                                                {matchedDriverDetails.vehicleNumber || 'Unassigned'}
                                                {matchedDriverDetails.vehicleName && ` - ${matchedDriverDetails.vehicleName}`}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">ESTIMATED ARRIVAL</span>
                                            <span className="text-emerald-600 font-extrabold">3 Mins (1.8 km)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button 
                                        onClick={() => {
                                            const shipment = shipments.find(s => s.id === searchingBookingId);
                                            if (shipment) setTrackingBooking(shipment);
                                            setSearchingBookingId(null);
                                        }}
                                        className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3.5 font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        Track Live
                                    </button>
                                    <button 
                                        onClick={() => setSearchingBookingId(null)}
                                        className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 font-bold text-sm transition-all cursor-pointer"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : searchTimeoutError ? (
                            // TIMEOUT NO DRIVERS SCREEN
                            <div className="space-y-6 animate-in zoom-in duration-300 w-full">
                                <div className="mx-auto h-20 w-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-md">
                                    <X className="h-10 w-10 animate-pulse" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center">No Drivers Found</h3>
                                    <p className="text-rose-600 text-sm font-semibold bg-rose-50 p-4 rounded-xl border border-rose-100 mt-2 text-center">
                                        Could not able to find driver, so sorry for not loading your shipment.
                                    </p>
                                    <div className="mt-3 flex items-center justify-center gap-2 text-rose-500/80 text-xs font-bold uppercase tracking-wider">
                                        <span className="animate-bounce">⏳</span>
                                        <span>Please try again after 5 minutes</span>
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-3 w-full">
                                    <button 
                                        onClick={() => handleCancelSearch(searchingBookingId!)}
                                        className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3.5 font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        Adjust Details
                                    </button>
                                    <button 
                                        onClick={() => setSearchingBookingId(null)}
                                        className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 font-bold text-sm transition-all cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // ACTIVE SEARCHING SCREEN
                            <div className="space-y-6 w-full flex flex-col items-center">
                                {/* Breathtaking pulsing concentric ripples & radar */}
                                <div className="relative flex items-center justify-center h-48 w-48 mb-4">
                                    <div className="absolute inset-0 bg-primary-500/10 rounded-full animate-ping"></div>
                                    <div className="absolute inset-4 bg-primary-500/20 rounded-full animate-pulse"></div>
                                    <div className="absolute inset-8 bg-primary-500/30 rounded-full animate-ping"></div>
                                    <div className="absolute inset-0 border-4 border-dashed border-primary-500/30 rounded-full animate-spin [animation-duration:12s]"></div>
                                    
                                    <div className="relative z-10 w-24 h-24 bg-white rounded-full border border-slate-100 shadow-xl flex items-center justify-center">
                                        <Truck className="h-10 w-10 text-primary-600 animate-bounce" />
                                    </div>
                                </div>

                                <div className="space-y-2 w-full">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        {searchPhase === 0 && "Finding nearby drivers..."}
                                        {searchPhase === 1 && "Searching available transport..."}
                                        {searchPhase === 2 && "Connecting your shipment..."}
                                        {searchPhase === 3 && "Expanding search radius..."}
                                    </h3>
                                    
                                    {/* Horizontal step indicator */}
                                    <div className="flex justify-center gap-1.5 pt-1.5">
                                        <span className={`h-1.5 rounded-full transition-all duration-300 ${searchPhase >= 0 ? 'w-6 bg-primary-600' : 'w-2 bg-slate-200'}`}></span>
                                        <span className={`h-1.5 rounded-full transition-all duration-300 ${searchPhase >= 1 ? 'w-6 bg-primary-600' : 'w-2 bg-slate-200'}`}></span>
                                        <span className={`h-1.5 rounded-full transition-all duration-300 ${searchPhase >= 2 ? 'w-6 bg-primary-600' : 'w-2 bg-slate-200'}`}></span>
                                        <span className={`h-1.5 rounded-full transition-all duration-300 ${searchPhase >= 3 ? 'w-6 bg-primary-600' : 'w-2 bg-slate-200'}`}></span>
                                    </div>
                                    
                                    <p className="text-slate-400 text-xs font-semibold tracking-wider pt-2">
                                        TIMING OUT IN: <span className="text-primary-600 font-black">{searchTimeLeft}s</span>
                                    </p>
                                </div>

                                <button 
                                    onClick={() => handleCancelSearch(searchingBookingId)}
                                    className="w-full mt-4 rounded-2xl border border-red-200 hover:bg-red-50 text-red-600 py-3.5 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    Cancel Search Request
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        {/* Live Chat Panel */}
        {chatBookingId !== null && (
            <ChatPanel
                bookingId={chatBookingId as number}
                currentUserName={
                    user?.firstName ||
                    user?.name ||
                    user?.company ||
                    user?.UserName ||
                    'Customer'
                }
                onClose={() => setChatBookingId(null)}
            />
        )}

        {/* Rating Modal */}
        {isRatingModalOpen && selectedRatingBooking && (
            <div onClick={() => { setIsRatingModalOpen(false); setSelectedRatingBooking(null); }} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Rate Your Ride</h3>
                        <button onClick={() => { setIsRatingModalOpen(false); setSelectedRatingBooking(null); }} className="p-1 hover:bg-slate-100 rounded-full">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                    <div className="text-center space-y-4">
                        <p className="text-sm text-slate-500">How was your experience with the driver for Ride #{selectedRatingBooking.id}?</p>
                        <div className="flex justify-center gap-2 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRatingScore(star)}
                                    className="focus:outline-none transition-transform active:scale-95"
                                >
                                    <Star
                                        className={`h-8 w-8 transition-colors ${
                                            star <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Write a comment about your experience..."
                            className="w-full min-h-[100px] p-3 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                        <button
                            onClick={submitDriverRating}
                            disabled={submittingRating}
                            className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                        >
                            {submittingRating ? 'Submitting...' : 'Submit Rating'}
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
        {/* Saved Addresses Modal */}
        {activeSavedAddressModal !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Bookmark className="w-5 h-5 fill-emerald-400/20" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base">Select Saved Address</h3>
                                <p className="text-xs text-slate-300">
                                    For {activeSavedAddressModal === 'pickup' ? 'Pickup Location' : 'Drop Location'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setActiveSavedAddressModal(null);
                                setIsAddingNewSaved(false);
                            }}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
                        {/* Search Filter */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                value={savedSearchQuery}
                                onChange={(e) => setSavedSearchQuery(e.target.value)}
                                placeholder="Search saved addresses..."
                                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs focus:border-emerald-500 outline-none"
                            />
                        </div>

                        {/* List of Saved Addresses */}
                        <div className="space-y-2">
                            {savedAddresses
                                .filter(item => 
                                    item.title.toLowerCase().includes(savedSearchQuery.toLowerCase()) ||
                                    item.address.toLowerCase().includes(savedSearchQuery.toLowerCase())
                                )
                                .map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectSavedAddress(item, activeSavedAddressModal)}
                                        className="group p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm hover:shadow"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                                {item.category === 'home' && <Home className="w-4 h-4" />}
                                                {item.category === 'office' && <Building className="w-4 h-4" />}
                                                {item.category === 'warehouse' && <Package className="w-4 h-4" />}
                                                {(!item.category || item.category === 'other') && <MapPin className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-900">{item.title}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                                                        {item.category || 'saved'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 group-hover:text-slate-700 truncate mt-0.5">{item.address}</p>
                                                {(item.buildingNo || item.houseNo) && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {[item.houseNo, item.buildingNo].filter(Boolean).join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-xs font-extrabold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteSavedAddress(item.id, e)}
                                                className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                                                title="Delete saved address"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            {savedAddresses.length === 0 && (
                                <p className="text-center py-6 text-xs text-slate-400">No saved addresses yet.</p>
                            )}
                        </div>

                        {/* Save Current Address Section */}
                        <div className="border-t border-slate-100 pt-4">
                            {!isAddingNewSaved ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingNewSaved(true)}
                                    className="w-full py-2.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Save Current Inputted Location as New Address</span>
                                </button>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                                    <h4 className="font-bold text-xs text-slate-800">Save Current {activeSavedAddressModal === 'pickup' ? 'Pickup' : 'Drop'} Address</h4>
                                    <p className="text-[11px] text-slate-500 truncate bg-white p-2 rounded-lg border border-slate-200">
                                        {activeSavedAddressModal === 'pickup' ? (formData.pickup || 'No address set yet') : (formData.destination || 'No address set yet')}
                                    </p>

                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={newSavedTitle}
                                            onChange={(e) => setNewSavedTitle(e.target.value)}
                                            placeholder="Label (e.g. My Flat, Factory 2, Client Site)"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                                        />
                                        <div className="flex gap-2">
                                            {(['home', 'office', 'warehouse', 'other'] as const).map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setNewSavedCategory(cat)}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border capitalize transition-all cursor-pointer ${
                                                        newSavedCategory === cat 
                                                            ? 'bg-slate-900 text-white border-slate-900' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleSaveCurrentAsSavedAddress(activeSavedAddressModal)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                                        >
                                            Save Address
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingNewSaved(false)}
                                            className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Mobile Bottom Quick Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 text-white shadow-2xl flex items-center justify-around py-2 px-1 pb-safe">
            <button onClick={() => { setActiveTab('new'); navigate('/customer-portal?tab=new'); }} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'new' ? 'text-primary-400' : 'text-slate-400'}`}>
                <Home className="h-5 w-5" />
                Home
            </button>
            <button onClick={() => { setActiveTab('shipments'); navigate('/customer-portal?tab=shipments'); }} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'shipments' ? 'text-primary-400' : 'text-slate-400'}`}>
                <Package className="h-5 w-5" />
                Shipments
            </button>
            <button onClick={() => { navigate('/profile'); }} className={`flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-primary-400`}>
                <User className="h-5 w-5" />
                Profile
            </button>
        </div>
        </>
    );
};

export default CustomerDashboard;
