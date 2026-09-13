import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ensureLeafletIconsConfigured } from '../lib/leafletHelpers';

interface DriverMapPoint {
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleName?: string;
    vehicleNumber?: string;
    rideStatus?: string;
    isOnline?: boolean;
    latitude?: number;
    longitude?: number;
    hasLiveGps?: boolean;
}

interface LiveFleetMapProps {
    drivers?: DriverMapPoint[];
    vehicles?: Array<{
        vehicleNumber?: string;
        driverName?: string;
        latitude?: number;
        longitude?: number;
        liveStatus?: string;
    }>;
}

const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ drivers, vehicles }) => {
    ensureLeafletIconsConfigured();

    const points = useMemo(() => {
        if (drivers && drivers.length > 0) {
            return drivers
                .filter((d) => typeof d.latitude === 'number' && typeof d.longitude === 'number')
                .map((d) => ({
                    lat: Number(d.latitude),
                    lng: Number(d.longitude),
                    driverName: d.driverName || 'Driver',
                    phone: d.driverPhone || '',
                    vehicle: d.vehicleNumber ? `${d.vehicleName || 'Vehicle'} (${d.vehicleNumber})` : 'No Vehicle Assigned',
                    rideStatus: d.rideStatus || (d.isOnline ? 'Available' : 'Offline'),
                    isOnline: !!d.isOnline,
                    hasLiveGps: d.hasLiveGps
                }));
        }

        if (vehicles && vehicles.length > 0) {
            return vehicles
                .filter((vehicle) => typeof vehicle.latitude === 'number' && typeof vehicle.longitude === 'number')
                .map((vehicle) => ({
                    lat: Number(vehicle.latitude),
                    lng: Number(vehicle.longitude),
                    driverName: vehicle.driverName || 'Driver',
                    phone: '',
                    vehicle: vehicle.vehicleNumber || 'Vehicle',
                    rideStatus: vehicle.liveStatus || 'Live',
                    isOnline: true,
                    hasLiveGps: true
                }));
        }

        return [];
    }, [drivers, vehicles]);

    const center = useMemo(() => {
        if (!points.length) {
            return [28.6139, 77.2090]; // Default New Delhi center
        }

        const total = points.reduce(
            (acc, point) => {
                acc.lat += point.lat;
                acc.lng += point.lng;
                return acc;
            },
            { lat: 0, lng: 0 }
        );

        return [total.lat / points.length, total.lng / points.length];
    }, [points]);

    if (!points.length) {
        return (
            <div className="h-full w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 grid place-items-center text-sm text-slate-500">
                No fleet drivers registered to display.
            </div>
        );
    }

    return (
        <div className="h-full w-full rounded-xl overflow-hidden relative">
            <MapContainer center={center as [number, number]} zoom={points.length === 1 ? 12 : 5} scrollWheelZoom className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {points.map((point, index) => {
                    const statusColor = point.rideStatus === 'On Ride' 
                        ? '#10b981' 
                        : point.rideStatus === 'Available' || point.isOnline 
                            ? '#06b6d4' 
                            : '#94a3b8';

                    const customIcon = L.divIcon({
                        className: 'custom-driver-marker',
                        html: `<div style="background-color: ${statusColor}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">🚚</div>`,
                        iconSize: [34, 34],
                        iconAnchor: [17, 17],
                        popupAnchor: [0, -18]
                    });

                    return (
                        <Marker 
                            key={`${point.lat}-${point.lng}-${index}`} 
                            position={[point.lat, point.lng]}
                            icon={customIcon}
                        >
                            <Popup>
                                <div className="p-1 text-xs">
                                    <p className="font-extrabold text-slate-900 text-sm">{point.driverName}</p>
                                    {point.phone && <p className="text-slate-500">{point.phone}</p>}
                                    <p className="font-semibold text-primary-600 mt-1">🚚 {point.vehicle}</p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                        <span className="font-bold">Status:</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            point.rideStatus === 'On Ride' 
                                                ? 'bg-emerald-100 text-emerald-800' 
                                                : point.rideStatus === 'Available' || point.isOnline
                                                    ? 'bg-teal-100 text-teal-800'
                                                    : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {point.rideStatus}
                                        </span>
                                    </div>
                                    {!point.hasLiveGps && (
                                        <p className="text-[10px] text-amber-600 italic mt-1.5">📍 Waiting for driver app GPS update</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default LiveFleetMap;
