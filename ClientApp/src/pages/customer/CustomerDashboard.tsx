import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Anchor, ArrowRightLeft, Bookmark, CheckCircle, ClipboardList, Database, History, Info, Layout, MapPin, MessageCircle, Navigation, Package, Search, Truck, User, X, LayoutDashboard, Settings, LogOut, Menu, ChevronDown, CreditCard, Bell, Key, Home, Star } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { fetchVehicleCommonTypes } from '../../services/vehicleCommonTypes';
import { normalizeCommonTypes, type NormalizedCommonType } from '../../lib/commonTypes';
import { getSavedAddresses, upsertSavedAddress, type SavedAddress } from '../../services/savedAddressService';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center && Number.isFinite(center[0]) && Number.isFinite(center[1]) && center[0] !== 0 && center[1] !== 0) {
            map.flyTo(center, zoom, { duration: 1.2 });
        }
    }, [center, zoom, map]);
    return null;
};
import TrackingMap from '../../components/TrackingMap';
import ChatPanel from '../../components/ChatPanel';

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
    weightUnit?: string;
    vehicle: string;
    matchedCount: number;
    status: RideStatus;
    date: string;
    driverName?: string;
    driverPhone?: string;
    driverUserId?: string;
    driverProfilePic?: string;
    vehicleNumber?: string;
    vehicleName?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    estimatedFare?: number;
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
    const [selectedCategory, setSelectedCategory] = useState<'bike' | 'auto' | 'truck'>('truck');

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
        weightUnit: 'kg' as 'kg' | 'Tons',
        vehicle: '', 
        ctBodyType: '',
        ctTyreType: '',
        pickupBuildingNo: '',
        pickupHouseNo: '',
        dropBuildingNo: '',
        dropHouseNo: '',
    });
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [showDropSuggestions, setShowDropSuggestions] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
    const [mapZoom, setMapZoom] = useState<number>(5);

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
    const [chatToast, setChatToast] = useState<{
        id: string;
        bookingId?: number;
        roomName?: string;
        senderName: string;
        messageText: string;
    } | null>(null);

    // Saved Address Management & Sync
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => getSavedAddresses());
    const [showSaveAddressModal, setShowSaveAddressModal] = useState<{ open: boolean; target: 'pickup' | 'destination'; text: string; lat: string; lng: string }>({
        open: false,
        target: 'pickup',
        text: '',
        lat: '',
        lng: ''
    });
    const [modalAddressLabel, setModalAddressLabel] = useState('Home');
    const [modalCustomLabel, setModalCustomLabel] = useState('');
    const [saveAddressFeedback, setSaveAddressFeedback] = useState('');

    useEffect(() => {
        const handleSyncSavedAddresses = () => {
            setSavedAddresses(getSavedAddresses());
        };
        window.addEventListener('saved_addresses_updated', handleSyncSavedAddresses);
        window.addEventListener('storage', handleSyncSavedAddresses);
        return () => {
            window.removeEventListener('saved_addresses_updated', handleSyncSavedAddresses);
            window.removeEventListener('storage', handleSyncSavedAddresses);
        };
    }, []);

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
                });

                lastSeenNotifIdsRef.current = new Set(notifications.map((n: any) => n.id));
            } catch (err) {
                console.error("Failed to load customer chat notifications:", err);
            }
        };

        const intervalId = setInterval(checkChatNotifications, 5000);
        return () => clearInterval(intervalId);
    }, [user]);

    useEffect(() => {
        const loadInitialData = async () => {
            const customerUserId = user?.userId || user?.UserId || user?.id || '';
            
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

            if (!customerUserId) {
                return;
            }

            try {
                const res = await apiClient.post('/Vehicle/bookingVehiclerides', null, {
                    params: { userId: customerUserId },
                });
                const data = Array.isArray(res.data) ? res.data : [];
                const normalized = data
                    .filter((item) => item?.Id || item?.id)
                    .map((item) => {
                        const rawType = item.goodsType ?? item.GoodsType ?? 'Goods';
                        const isTons = rawType.includes('[Unit: Tons]');
                        const cleanProductType = rawType.replace(/\s*\[Unit:\s*Tons\]/gi, '').trim() || 'Goods';
                        return {
                            id: Number(item.id ?? item.Id),
                            productType: cleanProductType,
                            pickup: item.pickupAddress ?? item.PickupAddress ?? '',
                            destination: item.dropAddress ?? item.DropAddress ?? '',
                            weight: Number(item.goodsWeight ?? item.GoodsWeight ?? 0),
                            weightUnit: isTons ? 'Tons' : 'kg',
                            vehicle: item.vehicleNumber ?? item.VehicleNumber ?? 'Assigned vehicle',
                            matchedCount: 0,
                            status: (item.rideStatus ?? item.RideStatus ?? 'request_for_ride') as RideStatus,
                            date: item.createdAt ?? item.CreatedAt ?? '',
                            driverName: item.driverName ?? item.DriverName ?? '',
                            driverPhone: item.driverPhone ?? item.DriverPhone ?? '',
                            driverUserId: item.driverUserId ?? item.DriverUserId ?? '',
                            driverProfilePic: item.driverProfilePic ?? item.DriverProfilePic ?? '',
                            vehicleNumber: item.vehicleNumber ?? item.VehicleNumber ?? '',
                            vehicleName: item.vehicleName ?? item.VehicleName ?? '',
                            pickupLat: Number(item.pickupLat ?? item.PickupLat ?? 0),
                            pickupLng: Number(item.pickupLng ?? item.PickupLng ?? 0),
                            dropLat: Number(item.dropLat ?? item.DropLat ?? 0),
                            dropLng: Number(item.dropLng ?? item.DropLng ?? 0),
                            estimatedFare: Number(item.estimatedFare ?? item.EstimatedFare ?? 0),
                        };
                    });

                setShipments(normalized);

            } catch (err) {
                console.error(err);
            }
        };

        loadInitialData();
    }, [user]);

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
            await apiClient.patch(`/Vehicle/${bookingId}/rideStatus`, null, { params: { status: 'cancelled' } });
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
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreateShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!formData.vehicle) {
            setErrorMessage('Vehicle type selection is mandatory for creating a shipment.');
            setSubmitStatus('error');
            return;
        }

        if (selectedCategory === 'bike' && Number(formData.weight) > 20) {
            setErrorMessage('2-Wheeler (Bike) shipment weight cannot exceed 20 kg.');
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
            const baseProductType =
                formData.productType === 'Other'
                    ? formData.customProductType
                    : selectedProduct?.name ?? formData.productType;

            const finalProductType = formData.weightUnit === 'Tons' ? `${baseProductType} [Unit: Tons]` : baseProductType;

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
                productType: baseProductType,
                pickup: formData.pickup,
                destination: formData.destination,
                weight: parseNum(formData.weight),
                weightUnit: formData.weightUnit,
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
                weightUnit: 'kg',
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
                weightUnit: 'kg',
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
            const res = await apiClient.get(`/Location/reverse?lat=${lat}&lng=${lng}`);
            const data = res.data || {};
            if (data && data.displayName) {
                setFormData(p => ({ ...p, [field]: data.displayName }));
            }
        } catch (err) {
            console.error("Reverse geocoding failed:", err);
        }
    };

    const forwardGeocode = async (address: string, field: 'pickup' | 'destination') => {
        if (!address || address.trim().length < 2) return;
        try {
            const res = await apiClient.get(`/Location/search?q=${encodeURIComponent(address)}`);
            const data = Array.isArray(res.data) ? res.data : [];
            if (data && data.length > 0) {
                const item = data[0];
                const latStr = String(item.lat || item.Lat);
                const lngStr = String(item.lon || item.Lon);
                const latNum = Number(latStr);
                const lngNum = Number(lngStr);

                if (field === 'pickup') {
                    setFormData(p => ({ ...p, pickupLat: latStr, pickupLng: lngStr }));
                } else {
                    setFormData(p => ({ ...p, dropLat: latStr, dropLng: lngStr }));
                }

                if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
                    setMapCenter([latNum, lngNum]);
                    setMapZoom(16);
                }
            }
        } catch (err) {
            console.error("Forward geocoding failed:", err);
        }
    };

    const fetchLocationSuggestions = async (query: string, field: 'pickup' | 'destination') => {
        if (!query || query.trim().length < 2) {
            if (field === 'pickup') setPickupSuggestions([]);
            else setDropSuggestions([]);
            return;
        }

        try {
            const res = await apiClient.get(`/Location/search?q=${encodeURIComponent(query)}`);
            const results = Array.isArray(res.data) ? res.data : [];
            if (field === 'pickup') {
                setPickupSuggestions(results);
                setShowPickupSuggestions(true);
            } else {
                setDropSuggestions(results);
                setShowDropSuggestions(true);
            }
        } catch (err) {
            console.error("Failed to fetch address suggestions:", err);
        }
    };

    const handleUseCurrentLocation = (field: 'pickup' | 'destination') => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const latStr = lat.toFixed(6);
                const lngStr = lng.toFixed(6);

                if (field === 'pickup') {
                    setFormData(p => ({ ...p, pickupLat: latStr, pickupLng: lngStr }));
                } else {
                    setFormData(p => ({ ...p, dropLat: latStr, dropLng: lngStr }));
                }

                setMapCenter([lat, lng]);
                setMapZoom(16);

                await reverseGeocode(lat, lng, field);
            },
            (error) => {
                console.error("Error obtaining geolocation:", error);
                alert("Could not obtain your current GPS location. Please check location permissions.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
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

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shrink-0">
                                {user?.profilePic || user?.ProfilePic ? (
                                    <img 
                                        src={
                                            (user.profilePic || user.ProfilePic).startsWith('http') || (user.profilePic || user.ProfilePic).startsWith('data:')
                                                ? (user.profilePic || user.ProfilePic)
                                                : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${(user.profilePic || user.ProfilePic).startsWith('/') ? '' : '/'}${user.profilePic || user.ProfilePic}`
                                        } 
                                        alt="Customer" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span>{user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'C'}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName || user?.name || 'Customer'}</p>
                                <p className="text-xs text-slate-500 truncate">CUSTOMER</p>
                            </div>
                            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50">
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
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 text-sm shrink-0">
                            {user?.profilePic || user?.ProfilePic ? (
                                <img 
                                    src={
                                        (user.profilePic || user.ProfilePic).startsWith('http') || (user.profilePic || user.ProfilePic).startsWith('data:')
                                            ? (user.profilePic || user.ProfilePic)
                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${(user.profilePic || user.ProfilePic).startsWith('/') ? '' : '/'}${user.profilePic || user.ProfilePic}`
                                    } 
                                    alt="Customer" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <span>{user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'C'}</span>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
                <div className="mb-8 overflow-hidden rounded-2xl sm:rounded-[2rem] bg-slate-900 text-white shadow-2xl shadow-slate-300/40">
                    <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.3fr_0.9fr] lg:p-10">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-200">
                                <Truck className="h-4 w-4" />
                                Hii, {user?.firstName || user?.name || 'Customer'}
                            </div>
                            <h1 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight">Customer (Logistics) Dashboard</h1>
                            <p className="mt-3 max-w-2xl text-sm sm:text-lg leading-relaxed text-slate-300">
                                This page is dedicated to customers. Add a shipment request, choose the required vehicle, and track every active booking from one place.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    onClick={openNewShipment}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-colors hover:bg-primary-500"
                                >
                                    <Package className="h-4 w-4" />
                                    Add Shipment
                                </button>
                                <button
                                    onClick={openShipmentList}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white transition-colors hover:bg-white/10"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    View Shipments
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-1">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
                                <p className="text-xs sm:text-sm font-medium text-slate-300">Active Requests</p>
                                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-extrabold">{shipments.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
                                <p className="text-xs sm:text-sm font-medium text-slate-300">Required Details</p>
                                <p className="mt-1 sm:mt-2 text-xs sm:text-lg font-bold">Product, vehicle, weight, location</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
                                <p className="text-xs sm:text-sm font-medium text-slate-300">Route Scope</p>
                                <p className="mt-1 sm:mt-2 text-xs sm:text-lg font-bold">Pickup and drop workflow</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8 flex flex-wrap items-center gap-3">
                    <button
                        onClick={openShipmentList}
                        className={`rounded-xl px-5 py-3 font-semibold transition-colors ${activeTab === 'shipments' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
                    >
                        Shipment Overview
                    </button>
                    <button
                        onClick={openNewShipment}
                        className={`rounded-xl px-5 py-3 font-semibold transition-colors ${activeTab === 'new' ? 'bg-primary-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-primary-300 hover:text-primary-700'}`}
                    >
                        Add Shipment
                    </button>
                </div>

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
                                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
                                    <Search className="h-5 w-5 text-primary-600" /> Active Shipments
                                </h2>

                                {/* Prominent Active Shipment Hero Live Tracking Card */}
                                {shipments.filter(s => ['driver_assigned', 'driver_arriving', 'ride_started'].includes(s.status)).map((activeShip) => (
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

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                                <TrackingMap 
                                                    bookingId={activeShip.id}
                                                    pickupLat={activeShip.pickupLat || 28.6139}
                                                    pickupLng={activeShip.pickupLng || 77.2090}
                                                    dropLat={activeShip.dropLat || 19.0760}
                                                    dropLng={activeShip.dropLng || 72.8777}
                                                />
                                            </div>

                                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center font-black text-white text-base uppercase shadow-md border-2 border-white ring-2 ring-primary-100 shrink-0">
                                                            {activeShip.driverProfilePic ? (
                                                                <img 
                                                                    src={
                                                                        activeShip.driverProfilePic.startsWith('http') || activeShip.driverProfilePic.startsWith('data:') 
                                                                            ? activeShip.driverProfilePic 
                                                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${activeShip.driverProfilePic.startsWith('/') ? '' : '/'}${activeShip.driverProfilePic}`
                                                                    } 
                                                                    alt={activeShip.driverName || 'Driver'} 
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span>{activeShip.driverName?.substring(0, 2) || 'DR'}</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Driver</p>
                                                            <p className="font-extrabold text-slate-900 text-base truncate">{activeShip.driverName || 'Assigned Driver'}</p>
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
                                                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        💬 Chat
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {shipments.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-100/50 p-12 text-center text-slate-500">
                                        <p>No active shipments found for this customer account yet.</p>
                                        <button
                                            onClick={openNewShipment}
                                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition-colors hover:bg-primary-500"
                                        >
                                            <Package className="h-4 w-4" />
                                            Add Shipment
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {shipments.map((shipment) => (
                                            <div key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                                <div className="mb-4 flex items-start justify-between">
                                                    <div>
                                                        <span className="rounded-lg border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-primary-600">
                                                            Ride #{shipment.id}
                                                        </span>
                                                        <h3 className="mt-3 font-bold text-slate-900">{shipment.vehicle}</h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {shipment.productType} | {shipment.weight} {shipment.weightUnit || 'kg'} | Matched drivers: {shipment.matchedCount}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                                                        {shipment.status}
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
                                                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                                                        >
                                                            Complaint
                                                        </button>
                                                        <button
                                                            onClick={() => reportDispute(shipment.id, 'reportRideIssue')}
                                                            className="flex-1 rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
                                                        >
                                                            Ride Issue
                                                        </button>
                                                    </div>
                                                </div>

                                                {(shipment.status === 'ride_started' || shipment.status === 'driver_assigned' || shipment.status === 'driver_arriving') && (
                                                    <button
                                                        onClick={() => setTrackingBooking(shipment)}
                                                        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary-50 py-3 text-sm font-bold text-primary-700 hover:bg-primary-100 transition-colors"
                                                    >
                                                        <Navigation className="h-4 w-4" />
                                                        Track Live Location
                                                    </button>
                                                )}
                                                {/* Chat button – always visible once a shipment exists */}
                                                <button
                                                    onClick={() => setChatBookingId(shipment.id)}
                                                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                                                    Chat with Driver
                                                </button>

                                                {shipment.status === 'ride_completed' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRatingBooking(shipment);
                                                            setIsRatingModalOpen(true);
                                                        }}
                                                        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 text-sm font-bold text-white shadow-md shadow-amber-500/10 transition-all cursor-pointer"
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
                        ) : (
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
                                    {/* Vehicle Category Selector: 2-Wheeler (Bike), 3-Wheeler (Auto/Rickshaw), Truck */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                                Select Vehicle Category <span className="text-rose-500 font-semibold text-xs">(Required)</span>
                                            </label>
                                            <span className="text-xs text-slate-500 font-medium">Choose transport mode</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* 2 Wheeler Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory('bike');
                                                    const bikeMatch = vehicleTypes.find(v => 
                                                        v.name.toLowerCase().includes('bike') || 
                                                        v.name.toLowerCase().includes('two') || 
                                                        v.name.toLowerCase().includes('scooter') ||
                                                        v.name.toLowerCase().includes('2 wheeler') ||
                                                        v.name.toLowerCase().includes('2-wheeler')
                                                    );
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        vehicle: bikeMatch ? String(bikeMatch.id) : (vehicleTypes[0] ? String(vehicleTypes[0].id) : '1'),
                                                        ctBodyType: '',
                                                        ctTyreType: '',
                                                        weight: Number(prev.weight) > 20 ? '20' : prev.weight
                                                    }));
                                                }}
                                                className={`group relative flex flex-col items-center justify-between p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
                                                    selectedCategory === 'bike'
                                                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
                                                }`}
                                            >
                                                <div className="w-full h-28 flex items-center justify-center p-2">
                                                    <img 
                                                        src="/assets/vehicles/2wheeler.png" 
                                                        alt="2-Wheeler Courier Bike" 
                                                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="w-full text-center border-t border-slate-100/80 pt-2 mt-1">
                                                    <span className="font-extrabold text-sm block text-slate-900">🏍️ 2-Wheeler</span>
                                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full inline-block mt-1">
                                                        Bike (Max 20 kg)
                                                    </span>
                                                </div>
                                            </button>

                                            {/* 3 Wheeler Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory('auto');
                                                    const autoMatch = vehicleTypes.find(v => 
                                                        v.name.toLowerCase().includes('auto') || 
                                                        v.name.toLowerCase().includes('three') || 
                                                        v.name.toLowerCase().includes('rickshaw') ||
                                                        v.name.toLowerCase().includes('3 wheeler') ||
                                                        v.name.toLowerCase().includes('3-wheeler') ||
                                                        v.name.toLowerCase().includes('ape')
                                                    );
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        vehicle: autoMatch ? String(autoMatch.id) : (vehicleTypes[0] ? String(vehicleTypes[0].id) : '1'),
                                                        ctBodyType: '',
                                                        ctTyreType: '',
                                                    }));
                                                }}
                                                className={`group relative flex flex-col items-center justify-between p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
                                                    selectedCategory === 'auto'
                                                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
                                                }`}
                                            >
                                                <div className="w-full h-28 flex items-center justify-center p-2">
                                                    <img 
                                                        src="/assets/vehicles/3wheeler.png" 
                                                        alt="3-Wheeler Auto Cargo" 
                                                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="w-full text-center border-t border-slate-100/80 pt-2 mt-1">
                                                    <span className="font-extrabold text-sm block text-slate-900">🛺 3-Wheeler</span>
                                                    <span className="text-[11px] font-semibold text-slate-500 inline-block mt-1">
                                                        Auto / Cargo Loader
                                                    </span>
                                                </div>
                                            </button>

                                            {/* Truck Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory('truck');
                                                    const truckMatch = vehicleTypes.find(v => 
                                                        v.name.toLowerCase().includes('mini truck') ||
                                                        v.name.toLowerCase().includes('tata ace') ||
                                                        v.name.toLowerCase().includes('pickup') ||
                                                        v.name.toLowerCase().includes('truck')
                                                    );
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        vehicle: truckMatch ? String(truckMatch.id) : (vehicleTypes[0] ? String(vehicleTypes[0].id) : ''),
                                                    }));
                                                }}
                                                className={`group relative flex flex-col items-center justify-between p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
                                                    selectedCategory === 'truck'
                                                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
                                                }`}
                                            >
                                                <div className="w-full h-28 flex items-center justify-center p-2">
                                                    <img 
                                                        src="/assets/vehicles/truck.png" 
                                                        alt="Truck and Heavy Lorries" 
                                                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="w-full text-center border-t border-slate-100/80 pt-2 mt-1">
                                                    <span className="font-extrabold text-sm block text-slate-900">🚚 Truck / Commercial</span>
                                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full inline-block mt-1">
                                                        Mini / Open / 14 Ft+
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Product Type Selection */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-800">Product / Cargo Type</label>
                                            <select
                                                required
                                                name="productType"
                                                value={formData.productType}
                                                onChange={handleChange}
                                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="">-- Select Product Type --</option>
                                                {productPicklist.map((product) => (
                                                    <option key={product.id} value={String(product.id)}>
                                                        {product.name}
                                                    </option>
                                                ))}
                                                <option value="Other">Other (Custom Cargo)</option>
                                            </select>
                                            {formData.productType === 'Other' && (
                                                <input
                                                    type="text"
                                                    name="customProductType"
                                                    value={formData.customProductType}
                                                    onChange={handleChange}
                                                    placeholder="Please specify your product type..."
                                                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                                                    required
                                                />
                                            )}
                                        </div>

                                        {selectedCategory !== 'truck' && (
                                            <div className="flex flex-col justify-center rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                                                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                                                    Active Dispatch Scope
                                                </span>
                                                <p className="text-sm font-bold text-slate-900 mt-1">
                                                    {selectedCategory === 'bike' ? '🏍️ Direct 2-Wheeler Delivery' : '🛺 Direct 3-Wheeler Auto Cargo'}
                                                </p>
                                                <p className="text-xs text-slate-600 mt-0.5">
                                                    {selectedCategory === 'bike' ? 'Fast city courier for documents & small packages up to 20 kg.' : 'Standard local goods & commercial cargo transport.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* SPECIFIC TRUCK VEHICLE CARDS - UNHIDDEN WHEN TRUCK IS SELECTED */}
                                    {selectedCategory === 'truck' && (
                                        <div className="space-y-4 p-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-3xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                                        <Truck className="h-4 w-4 text-emerald-600" /> Select Truck Model & Capacity
                                                    </label>
                                                    <p className="text-xs text-slate-500 mt-0.5">Choose the right vehicle configuration for your cargo size</p>
                                                </div>
                                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                                                    Required
                                                </span>
                                            </div>

                                            {/* Interactive Visual Truck Cards */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { idSuffix: 'mini', label: '🚚 Mini Truck', sub: 'Tata Ace / Bolero', keyMatch: 'mini' },
                                                    { idSuffix: 'pickup', label: '🛻 Pickup', sub: 'LCV / 1.5 - 2.5 Ton', keyMatch: 'pickup' },
                                                    { idSuffix: '14ft', label: '🚛 14 Ft Truck', sub: 'Medium Cargo Eicher', keyMatch: '14' },
                                                    { idSuffix: 'open', label: '🚚 Open Body Truck', sub: 'Heavy Open Load', keyMatch: 'open' },
                                                    { idSuffix: '17ft', label: '🚛 17 Ft Truck', sub: 'Heavy Commercial', keyMatch: '17' },
                                                    { idSuffix: '20ft', label: '🚛 20 Ft Truck', sub: 'Multi-axle Freight', keyMatch: '20' },
                                                    { idSuffix: '32ft', label: '🚛 32 Ft Truck', sub: 'Single/Multi Axle Container', keyMatch: '32' },
                                                    { idSuffix: 'container', label: '📦 Container Truck', sub: 'Secure Box Container', keyMatch: 'container' },
                                                ].map((cardItem) => {
                                                    // Match with loaded vehicleTypes from DB
                                                    const matchedVt = (Array.isArray(vehicleTypes) ? vehicleTypes : []).find(v => 
                                                        v.name.toLowerCase().includes(cardItem.keyMatch)
                                                    ) || vehicleTypes[0];
                                                    const targetId = matchedVt ? String(matchedVt.id) : cardItem.idSuffix;
                                                    const isSelected = String(formData.vehicle) === targetId;

                                                    return (
                                                        <button
                                                            key={cardItem.idSuffix}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    vehicle: targetId
                                                                }));
                                                            }}
                                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                                                isSelected
                                                                    ? 'border-emerald-600 bg-white text-slate-900 shadow-md ring-2 ring-emerald-500/20'
                                                                    : 'border-slate-200/90 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-extrabold text-xs text-slate-900">{cardItem.label}</span>
                                                                    {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 leading-tight">{cardItem.sub}</p>
                                                            </div>
                                                            <div className="mt-2 text-right">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {isSelected ? '✓ Selected' : 'Select'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Body Type and Tyre Configuration Cards / Controls */}
                                            <div className="grid gap-4 md:grid-cols-2 pt-2">
                                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
                                                    <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                        <Layout className="h-4 w-4 text-emerald-600" /> Body Configuration
                                                    </label>
                                                    <select
                                                        name="ctBodyType"
                                                        value={formData.ctBodyType}
                                                        onChange={handleChange}
                                                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium outline-none focus:bg-white"
                                                    >
                                                        <option value="">-- Any Body Type (All Available) --</option>
                                                        {(Array.isArray(bodyTypes) ? bodyTypes : []).map((bt) => (
                                                            <option key={bt.id} value={bt.id}>
                                                                🚚 {bt.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
                                                    <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                        <Database className="h-4 w-4 text-emerald-600" /> Tyre Configuration
                                                    </label>
                                                    <select
                                                        name="ctTyreType"
                                                        value={formData.ctTyreType}
                                                        onChange={handleChange}
                                                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium outline-none focus:bg-white"
                                                    >
                                                        <option value="">-- Any Tyre Count (4, 6, 10, 12, 14+ Tyre) --</option>
                                                        {(Array.isArray(tyreTypes) ? tyreTypes : []).map((tt) => (
                                                            <option key={tt.id} value={tt.id}>
                                                                🔘 {tt.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Weight input with Unit Selector (kg or Tons) */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-semibold text-slate-700">Product Weight</label>
                                                {selectedCategory === 'bike' ? (
                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                        Max 20 kg for Bike
                                                    </span>
                                                ) : (
                                                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(p => ({ ...p, weightUnit: 'kg' }))}
                                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                                                formData.weightUnit === 'kg'
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'text-slate-600 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            kg
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(p => ({ ...p, weightUnit: 'Tons' }))}
                                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                                                formData.weightUnit === 'Tons'
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'text-slate-600 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            Tons
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    required
                                                    min="0.1"
                                                    step="any"
                                                    max={selectedCategory === 'bike' ? 20 : undefined}
                                                    type="number"
                                                    name="weight"
                                                    value={formData.weight}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (selectedCategory === 'bike' && Number(val) > 20) {
                                                            alert('Bike delivery is restricted to a maximum of 20 kg.');
                                                            setFormData(p => ({ ...p, weight: '20' }));
                                                            return;
                                                        }
                                                        handleChange(e);
                                                    }}
                                                    placeholder={selectedCategory === 'bike' ? "Weight in kg (max 20 kg)" : `Weight in ${formData.weightUnit}`}
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 uppercase">
                                                    {selectedCategory === 'bike' ? 'kg' : formData.weightUnit}
                                                </span>
                                            </div>
                                            {selectedCategory === 'bike' && Number(formData.weight) > 20 && (
                                                <p className="mt-1 text-xs font-semibold text-rose-500">
                                                    Weight exceeds the 20 kg limit for 2-Wheelers.
                                                </p>
                                            )}
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-sm font-semibold text-slate-700">Matching note</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                {selectedCategory === 'bike'
                                                    ? 'Direct match with nearby two-wheeler delivery partners (restricted to parcels under 20 kg).'
                                                    : selectedCategory === 'auto'
                                                    ? 'Direct match with three-wheeler / auto delivery partners for local goods transport.'
                                                    : 'Vehicle match is based on your selected truck type, body type, tyre count, and weight.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid gap-6 md:grid-cols-2 pt-2">
                                          {/* Pickup Location */}
                                          <div className="relative space-y-2">
                                              <div className="flex items-center justify-between">
                                                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                                      <MapPin className="h-4 w-4 text-emerald-600" /> Pickup Location
                                                  </label>
                                                  <button
                                                      type="button"
                                                      onClick={() => handleUseCurrentLocation('pickup')}
                                                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors"
                                                  >
                                                      <Navigation className="h-3 w-3" /> Current Location
                                                  </button>
                                              </div>

                                              {/* Saved Address Quick Selector for Pickup */}
                                              {savedAddresses.length > 0 && (
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                                          <Bookmark className="h-3 w-3 text-emerald-600" /> Saved:
                                                      </span>
                                                      {savedAddresses.map((addr) => (
                                                          <button
                                                              key={addr.id}
                                                              type="button"
                                                              onClick={() => {
                                                                  setFormData(p => ({
                                                                      ...p,
                                                                      pickup: addr.text,
                                                                      pickupLat: addr.lat || p.pickupLat,
                                                                      pickupLng: addr.lng || p.pickupLng
                                                                  }));
                                                                  if (addr.lat && addr.lng) {
                                                                      const nLat = Number(addr.lat);
                                                                      const nLng = Number(addr.lng);
                                                                      if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
                                                                          setMapCenter([nLat, nLng]);
                                                                          setMapZoom(16);
                                                                      }
                                                                  } else {
                                                                      forwardGeocode(addr.text, 'pickup');
                                                                  }
                                                              }}
                                                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                                                  formData.pickup === addr.text
                                                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                              }`}
                                                          >
                                                              <span>
                                                                  {addr.label.toLowerCase() === 'home' ? '🏠' : 
                                                                   addr.label.toLowerCase() === 'office' ? '🏢' : 
                                                                   addr.label.toLowerCase() === 'warehouse' ? '🏭' : '📍'}
                                                              </span>
                                                              <span>{addr.label}</span>
                                                          </button>
                                                      ))}
                                                  </div>
                                              )}

                                              <div className="flex gap-2">
                                                  <input
                                                      required
                                                      type="text"
                                                      name="pickup"
                                                      value={formData.pickup}
                                                      onChange={(e) => {
                                                          handleChange(e);
                                                          fetchLocationSuggestions(e.target.value, 'pickup');
                                                      }}
                                                      onFocus={() => {
                                                          if (pickupSuggestions.length > 0) setShowPickupSuggestions(true);
                                                      }}
                                                      placeholder="Pickup address (e.g. Vishal Mega Mart)"
                                                      className="flex-1 rounded-xl border border-slate-300 px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                                                  />
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          forwardGeocode(formData.pickup, 'pickup');
                                                          setShowPickupSuggestions(false);
                                                      }}
                                                      className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
                                                  >
                                                      Locate
                                                  </button>
                                                  {formData.pickup && (
                                                      <button
                                                          type="button"
                                                          title="Save this address for fast booking"
                                                          onClick={() => {
                                                              setShowSaveAddressModal({
                                                                  open: true,
                                                                  target: 'pickup',
                                                                  text: formData.pickup,
                                                                  lat: formData.pickupLat,
                                                                  lng: formData.pickupLng
                                                              });
                                                              setModalAddressLabel('Home');
                                                              setModalCustomLabel('');
                                                              setSaveAddressFeedback('');
                                                          }}
                                                          className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                                                      >
                                                          <Bookmark className="h-4 w-4" />
                                                      </button>
                                                  )}
                                              </div>

                                              {/* Autocomplete Dropdown for Pickup */}
                                              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                                  <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl py-2">
                                                      {pickupSuggestions.map((item, idx) => (
                                                          <div
                                                              key={idx}
                                                              onClick={() => {
                                                                  const ltt = String(item.lat || item.Lat);
                                                                  const lnn = String(item.lon || item.Lon);
                                                                  setFormData(p => ({
                                                                      ...p,
                                                                      pickup: item.displayName,
                                                                      pickupLat: ltt,
                                                                      pickupLng: lnn
                                                                  }));
                                                                  const nLat = Number(ltt);
                                                                  const nLng = Number(lnn);
                                                                  if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
                                                                      setMapCenter([nLat, nLng]);
                                                                      setMapZoom(16);
                                                                  }
                                                                  setShowPickupSuggestions(false);
                                                              }}
                                                              className="flex items-start gap-3 px-4 py-2.5 hover:bg-primary-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                                                          >
                                                              <MapPin className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                                                              <div>
                                                                  <p className="text-xs font-bold text-slate-800">{item.displayName}</p>
                                                                  {item.type && <span className="text-[10px] uppercase font-semibold text-slate-400">{item.type}</span>}
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}

                                              <div className="grid grid-cols-2 gap-2 mt-2">
                                                  <input
                                                      type="text"
                                                      name="pickupBuildingNo"
                                                      value={formData.pickupBuildingNo}
                                                      onChange={handleChange}
                                                      placeholder="Bldg/Flat (Opt)"
                                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                  />
                                                  <input
                                                      type="text"
                                                      name="pickupHouseNo"
                                                      value={formData.pickupHouseNo}
                                                      onChange={handleChange}
                                                      placeholder="Apt/Street (Opt)"
                                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                  />
                                              </div>
                                          </div>

                                          {/* Drop Location */}
                                          <div className="relative space-y-2">
                                              <div className="flex items-center justify-between">
                                                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                                      <MapPin className="h-4 w-4 text-rose-500" /> Drop Location
                                                  </label>
                                                  <button
                                                      type="button"
                                                      onClick={() => handleUseCurrentLocation('destination')}
                                                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors"
                                                  >
                                                      <Navigation className="h-3 w-3" /> Current Location
                                                  </button>
                                              </div>

                                              {/* Saved Address Quick Selector for Drop */}
                                              {savedAddresses.length > 0 && (
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                                          <Bookmark className="h-3 w-3 text-rose-500" /> Saved:
                                                      </span>
                                                      {savedAddresses.map((addr) => (
                                                          <button
                                                              key={addr.id}
                                                              type="button"
                                                              onClick={() => {
                                                                  setFormData(p => ({
                                                                      ...p,
                                                                      destination: addr.text,
                                                                      dropLat: addr.lat || p.dropLat,
                                                                      dropLng: addr.lng || p.dropLng
                                                                  }));
                                                                  if (addr.lat && addr.lng) {
                                                                      const nLat = Number(addr.lat);
                                                                      const nLng = Number(addr.lng);
                                                                      if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
                                                                          setMapCenter([nLat, nLng]);
                                                                          setMapZoom(16);
                                                                      }
                                                                  } else {
                                                                      forwardGeocode(addr.text, 'destination');
                                                                  }
                                                              }}
                                                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                                                  formData.destination === addr.text
                                                                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                              }`}
                                                          >
                                                              <span>
                                                                  {addr.label.toLowerCase() === 'home' ? '🏠' : 
                                                                   addr.label.toLowerCase() === 'office' ? '🏢' : 
                                                                   addr.label.toLowerCase() === 'warehouse' ? '🏭' : '📍'}
                                                              </span>
                                                              <span>{addr.label}</span>
                                                          </button>
                                                      ))}
                                                  </div>
                                              )}

                                              <div className="flex gap-2">
                                                  <input
                                                      required
                                                      type="text"
                                                      name="destination"
                                                      value={formData.destination}
                                                      onChange={(e) => {
                                                          handleChange(e);
                                                          fetchLocationSuggestions(e.target.value, 'destination');
                                                      }}
                                                      onFocus={() => {
                                                          if (dropSuggestions.length > 0) setShowDropSuggestions(true);
                                                      }}
                                                      placeholder="Drop address"
                                                      className="flex-1 rounded-xl border border-slate-300 px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                                                  />
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          forwardGeocode(formData.destination, 'destination');
                                                          setShowDropSuggestions(false);
                                                      }}
                                                      className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
                                                  >
                                                      Locate
                                                  </button>
                                                  {formData.destination && (
                                                      <button
                                                          type="button"
                                                          title="Save this address for fast booking"
                                                          onClick={() => {
                                                              setShowSaveAddressModal({
                                                                  open: true,
                                                                  target: 'destination',
                                                                  text: formData.destination,
                                                                  lat: formData.dropLat,
                                                                  lng: formData.dropLng
                                                              });
                                                              setModalAddressLabel('Office');
                                                              setModalCustomLabel('');
                                                              setSaveAddressFeedback('');
                                                          }}
                                                          className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                                                      >
                                                          <Bookmark className="h-4 w-4" />
                                                      </button>
                                                  )}
                                              </div>

                                              {/* Autocomplete Dropdown for Drop */}
                                              {showDropSuggestions && dropSuggestions.length > 0 && (
                                                  <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl py-2">
                                                      {dropSuggestions.map((item, idx) => (
                                                          <div
                                                              key={idx}
                                                              onClick={() => {
                                                                  const ltt = String(item.lat || item.Lat);
                                                                  const lnn = String(item.lon || item.Lon);
                                                                  setFormData(p => ({
                                                                      ...p,
                                                                      destination: item.displayName,
                                                                      dropLat: ltt,
                                                                      dropLng: lnn
                                                                  }));
                                                                  const nLat = Number(ltt);
                                                                  const nLng = Number(lnn);
                                                                  if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
                                                                      setMapCenter([nLat, nLng]);
                                                                      setMapZoom(16);
                                                                  }
                                                                  setShowDropSuggestions(false);
                                                              }}
                                                              className="flex items-start gap-3 px-4 py-2.5 hover:bg-primary-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                                                          >
                                                              <MapPin className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                                                              <div>
                                                                  <p className="text-xs font-bold text-slate-800">{item.displayName}</p>
                                                                  {item.type && <span className="text-[10px] uppercase font-semibold text-slate-400">{item.type}</span>}
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}

                                              <div className="grid grid-cols-2 gap-2 mt-2">
                                                  <input
                                                      type="text"
                                                      name="dropBuildingNo"
                                                      value={formData.dropBuildingNo}
                                                      onChange={handleChange}
                                                      placeholder="Bldg/Flat (Opt)"
                                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                  />
                                                  <input
                                                      type="text"
                                                      name="dropHouseNo"
                                                      value={formData.dropHouseNo}
                                                      onChange={handleChange}
                                                      placeholder="Apt/Street (Opt)"
                                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                                                  />
                                              </div>
                                          </div>
                                      </div>

                                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-5">
                                         <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-2">
                                             <div>
                                                 <div className="mb-1 flex items-center gap-2 text-slate-800">
                                                     <MapPin className="h-5 w-5 text-primary-600" />
                                                     <h3 className="font-bold">Interactive Location Picker</h3>
                                                 </div>
                                                 <p className="text-sm text-slate-500">Drag the pins or click on the map to set exact pickup and drop coordinates.</p>
                                             </div>
                                         </div>

                                         <div className="h-[420px] sm:h-[450px] w-full rounded-xl overflow-hidden shadow-md border border-slate-300 mb-4">
                                             {typeof window !== 'undefined' && (
                                                 <MapContainer
                                                     center={mapCenter}
                                                     zoom={mapZoom}
                                                     scrollWheelZoom={true}
                                                     style={{ height: '100%', width: '100%' }}
                                                 >
                                                     <MapController center={mapCenter} zoom={mapZoom} />
                                                     <TileLayer
                                                         attribution='&copy; Google Maps'
                                                         url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                                     />
                                                    <Marker
                                                        position={[
                                                            Number.isFinite(Number(formData.pickupLat)) ? Number(formData.pickupLat) : 28.6139,
                                                            Number.isFinite(Number(formData.pickupLng)) ? Number(formData.pickupLng) : 77.2090
                                                        ]}
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
                                                    <Marker
                                                        position={[
                                                            Number.isFinite(Number(formData.dropLat)) ? Number(formData.dropLat) : 19.0760,
                                                            Number.isFinite(Number(formData.dropLng)) ? Number(formData.dropLng) : 72.8777
                                                        ]}
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
                                                </MapContainer>
                                            )}
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
                                Found <strong className="text-slate-900">{shipments.length} records</strong> in the current session.
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
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">
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
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm border border-indigo-200 shrink-0">
                                            {matchedDriverDetails.driverProfilePic ? (
                                                <img 
                                                    src={
                                                        matchedDriverDetails.driverProfilePic.startsWith('http') || matchedDriverDetails.driverProfilePic.startsWith('data:')
                                                            ? matchedDriverDetails.driverProfilePic
                                                            : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${matchedDriverDetails.driverProfilePic.startsWith('/') ? '' : '/'}${matchedDriverDetails.driverProfilePic}`
                                                    }
                                                    alt={matchedDriverDetails.driverName || 'Driver'}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span>{matchedDriverDetails.driverName ? matchedDriverDetails.driverName.split(' ').map((n: string) => n[0]).join('') : 'D'}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{matchedDriverDetails.driverName || 'Assigned Driver'}</p>
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
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
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
        {/* SAVE ADDRESS MODAL DIALOG */}
        {showSaveAddressModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                            <Bookmark className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-base font-extrabold text-slate-900">
                                Save Location for Fast Booking
                            </h3>
                        </div>
                        <button
                            onClick={() => setShowSaveAddressModal(p => ({ ...p, open: false }))}
                            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Address Text
                            </label>
                            <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium line-clamp-3">
                                {showSaveAddressModal.text}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Select or Write Address Label
                            </label>
                            <select
                                value={modalAddressLabel}
                                onChange={(e) => setModalAddressLabel(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 font-semibold focus:border-emerald-500 outline-none"
                            >
                                <option value="Home">🏠 Home</option>
                                <option value="Office">🏢 Office</option>
                                <option value="Warehouse">🏭 Warehouse</option>
                                <option value="Shop">🏪 Shop / Store</option>
                                <option value="Custom">✏️ Custom Label...</option>
                            </select>

                            {modalAddressLabel === 'Custom' && (
                                <input
                                    type="text"
                                    value={modalCustomLabel}
                                    onChange={(e) => setModalCustomLabel(e.target.value)}
                                    placeholder="e.g. My Godown, North Hub"
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                                />
                            )}
                            <p className="text-[11px] text-slate-400 mt-1">
                                * Only 1 address is saved per unique label. Saving will update any existing address for this label.
                            </p>
                        </div>

                        {saveAddressFeedback && (
                            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                                {saveAddressFeedback}
                            </p>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowSaveAddressModal(p => ({ ...p, open: false }))}
                                className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const effectiveLabel = modalAddressLabel === 'Custom' ? modalCustomLabel.trim() : modalAddressLabel;
                                    if (!effectiveLabel) {
                                        setSaveAddressFeedback('Please enter a label.');
                                        return;
                                    }
                                    const res = upsertSavedAddress(
                                        effectiveLabel,
                                        showSaveAddressModal.text,
                                        showSaveAddressModal.lat,
                                        showSaveAddressModal.lng
                                    );
                                    if (res.success) {
                                        setSavedAddresses(res.addresses);
                                        setSaveAddressFeedback(res.message);
                                        setTimeout(() => {
                                            setShowSaveAddressModal(p => ({ ...p, open: false }));
                                        }, 1200);
                                    } else {
                                        setSaveAddressFeedback(res.message);
                                    }
                                }}
                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 text-xs font-bold shadow-md transition-all active:scale-95"
                            >
                                Save Location
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CustomerDashboard;
