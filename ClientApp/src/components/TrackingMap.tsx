import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSignalR } from '../hooks/useSignalR';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface TrackingMapProps {
  bookingId: number;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  rideStatus?: string;
  driverInitialLat?: number;
  driverInitialLng?: number;
  onMetricsUpdate?: (metrics: { distanceKm: number; etaMins: number; phase: 'pickup' | 'delivery' }) => void;
}

const calculateHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const ZoomHandler = ({ location }: { location: { latitude: number; longitude: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.panTo([location.latitude, location.longitude]);
    }
  }, [location, map]);
  return null;
};

const TrackingMap: React.FC<TrackingMapProps> = ({
  bookingId,
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  rideStatus = 'driver_assigned',
  driverInitialLat,
  driverInitialLng,
  onMetricsUpdate,
}) => {
  const { driverLocation } = useSignalR(bookingId);

  // Fallback initial location if driver GPS signal has not arrived yet (e.g. 1.5km offset from pickup)
  const defaultDriverLat = driverInitialLat || pickupLat + 0.015;
  const defaultDriverLng = driverInitialLng || pickupLng + 0.015;

  const [animatedLocation, setAnimatedLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: defaultDriverLat,
    longitude: defaultDriverLng,
  });

  const [activeRoute, setActiveRoute] = useState<[number, number][]>([]);
  const [fullRoute, setFullRoute] = useState<[number, number][]>([]);
  const lastFetchedTargetRef = useRef<string>('');

  const isDeliveryPhase = rideStatus === 'ride_started';
  const targetPhase: 'pickup' | 'delivery' = isDeliveryPhase ? 'delivery' : 'pickup';
  const targetLat = isDeliveryPhase ? dropLat : pickupLat;
  const targetLng = isDeliveryPhase ? dropLng : pickupLng;

  // Smooth position interpolation for driver movement
  useEffect(() => {
    if (!driverLocation) return;

    const startLat = animatedLocation.latitude;
    const startLng = animatedLocation.longitude;
    const endLat = driverLocation.latitude;
    const endLng = driverLocation.longitude;

    const duration = 1000;
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;

      setAnimatedLocation({ latitude: currentLat, longitude: currentLng });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [driverLocation]);

  // Fetch turn-by-turn route and distance from OSRM
  useEffect(() => {
    const fetchNavigationRoute = async () => {
      const curLat = animatedLocation.latitude;
      const curLng = animatedLocation.longitude;

      const cacheKey = `${curLat.toFixed(3)},${curLng.toFixed(3)}->${targetLat.toFixed(3)},${targetLng.toFixed(3)}`;
      if (lastFetchedTargetRef.current === cacheKey) return;
      lastFetchedTargetRef.current = cacheKey;

      try {
        // Active Leg: Driver to Target (Pickup or Drop)
        const url = `https://router.project-osrm.org/route/v1/driving/${curLng},${curLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setActiveRoute(coords);

          const distanceMeters = data.routes[0].distance || 0;
          const durationSeconds = data.routes[0].duration || 0;

          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10 || calculateHaversineKm(curLat, curLng, targetLat, targetLng);
          const etaMins = Math.max(1, Math.round(durationSeconds / 60)) || Math.max(1, Math.round(distanceKm * 2.5));

          if (onMetricsUpdate) {
            onMetricsUpdate({ distanceKm, etaMins, phase: targetPhase });
          }
        }
      } catch (err) {
        // Fallback to straight line & Haversine calculation if OSRM is offline
        setActiveRoute([
          [curLat, curLng],
          [targetLat, targetLng],
        ]);
        const distanceKm = calculateHaversineKm(curLat, curLng, targetLat, targetLng);
        const etaMins = Math.max(1, Math.round(distanceKm * 2.5));
        if (onMetricsUpdate) {
          onMetricsUpdate({ distanceKm, etaMins, phase: targetPhase });
        }
      }
    };

    fetchNavigationRoute();
  }, [animatedLocation.latitude, animatedLocation.longitude, targetLat, targetLng, targetPhase]);

  // Fetch full Pickup -> Drop route geometry for overall trip visualization
  useEffect(() => {
    const fetchFullRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setFullRoute(coords);
        }
      } catch (e) {}
    };
    fetchFullRoute();
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  const distanceToPickup = calculateHaversineKm(animatedLocation.latitude, animatedLocation.longitude, pickupLat, pickupLng);
  const isNearPickup = !isDeliveryPhase && distanceToPickup <= 0.5;

  const DynamicTruckIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center" style="width: 100%; height: 100%;">
      ${isNearPickup ? `<div class="absolute rounded-full bg-rose-500/25 border-2 border-rose-500 animate-ping" style="width: 56px; height: 56px;"></div>` : ''}
      <div style="font-size: ${isNearPickup ? '40px' : '28px'}; transition: font-size 0.4s ease;">🚚</div>
    </div>`,
    className: 'custom-truck-marker',
    iconSize: isNearPickup ? [56, 56] : [36, 36],
    iconAnchor: isNearPickup ? [28, 28] : [18, 18],
  });

  return (
    <div className="relative h-[420px] w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200">
      {/* Alert Banner when Driver is near customer pickup */}
      {isNearPickup && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm rounded-2xl bg-amber-500 px-5 py-3 text-white text-center font-bold text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 border border-amber-400 animate-bounce">
          🔔 Driver is arriving at pickup location!
        </div>
      )}

      <MapContainer
        center={[pickupLat, pickupLng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Customer Pickup Marker */}
        <Marker position={[pickupLat, pickupLng]}>
          <Popup>
            <div className="font-bold text-xs text-slate-800">
              📍 Customer Pickup Point
              <br />
              <span className="text-slate-500 font-normal">{pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}</span>
            </div>
          </Popup>
        </Marker>

        {/* Customer Drop Destination Marker */}
        <Marker position={[dropLat, dropLng]}>
          <Popup>
            <div className="font-bold text-xs text-slate-800">
              🏁 Destination Drop Location
              <br />
              <span className="text-slate-500 font-normal">{dropLat.toFixed(4)}, {dropLng.toFixed(4)}</span>
            </div>
          </Popup>
        </Marker>

        {/* Background Trip Line */}
        {fullRoute.length > 0 && (
          <Polyline positions={fullRoute} color="#cbd5e1" weight={3} opacity={0.5} dashArray="6, 6" />
        )}

        {/* Active Navigation Polyline (Driver -> Target) */}
        {activeRoute.length > 0 && (
          <Polyline
            positions={activeRoute}
            color={isDeliveryPhase ? '#059669' : '#4f46e5'}
            weight={6}
            opacity={0.85}
          />
        )}

        {/* Dynamic Moving Driver Truck Marker */}
        <Marker position={[animatedLocation.latitude, animatedLocation.longitude]} icon={DynamicTruckIcon}>
          <Popup>
            <div className="font-bold text-xs text-slate-900">
              🚚 Driver Live Location
              <br />
              <span className="text-emerald-600 font-semibold">
                {isDeliveryPhase ? 'Goods Loaded • En route to Drop' : 'En route to Pickup'}
              </span>
            </div>
          </Popup>
        </Marker>

        <ZoomHandler location={animatedLocation} />
      </MapContainer>
    </div>
  );
};

export default TrackingMap;
