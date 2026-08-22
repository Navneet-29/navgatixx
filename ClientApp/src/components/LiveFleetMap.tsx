import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ensureLeafletIconsConfigured } from '../lib/leafletHelpers';

interface LiveFleetMapProps {
    vehicles: Array<{
        vehicleNumber?: string;
        driverName?: string;
        latitude?: number;
        longitude?: number;
        liveStatus?: string;
    }>;
}

const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ vehicles }) => {
    ensureLeafletIconsConfigured();

    const points = useMemo(
        () =>
            vehicles
                .filter(
                    (vehicle) =>
                        typeof vehicle.latitude === 'number' &&
                        typeof vehicle.longitude === 'number' &&
                        !(vehicle.latitude === 0 && vehicle.longitude === 0)
                )
                .map((vehicle) => ({
                    lat: Number(vehicle.latitude),
                    lng: Number(vehicle.longitude),
                    title: vehicle.vehicleNumber || 'Vehicle',
                    driver: vehicle.driverName,
                    liveStatus: vehicle.liveStatus,
                })),
        [vehicles]
    );

    const center = useMemo(() => {
        if (!points.length) {
            return [20.5937, 78.9629]; // India center
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

    return (
        <div className="h-[400px] rounded-2xl border border-slate-200 overflow-hidden relative">
            {!points.length && (
                <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
                    📡 Waiting for live vehicle GPS pings...
                </div>
            )}
            <MapContainer center={center as [number, number]} zoom={points.length ? 10 : 5} scrollWheelZoom className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {points.map((point, index) => (
                    <Marker key={`${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]}>
                        <Popup>
                            <div className="text-sm">
                                <p className="font-bold text-slate-900">{point.title}</p>
                                {point.driver && <p className="text-slate-500 text-xs">{point.driver}</p>}
                                {point.liveStatus && <p className="text-xs text-slate-500">{point.liveStatus}</p>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default LiveFleetMap;
