import React, { useEffect, useState } from 'react';
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
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const ZoomHandler = ({ location }: { location: { latitude: number; longitude: number } | null }) => {
  const map = useMap();
  React.useEffect(() => {
    if (location) {
      map.panTo([location.latitude, location.longitude]);
    }
  }, [location, map]);
  return null;
};

const TrackingMap: React.FC<TrackingMapProps> = ({ bookingId, pickupLat, pickupLng, dropLat, dropLng }) => {
  const { driverLocation } = useSignalR(bookingId);
  const [animatedLocation, setAnimatedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);

  // Position interpolation for smooth movement transitions
  useEffect(() => {
    if (!driverLocation) return;
    if (!animatedLocation) {
      setAnimatedLocation(driverLocation);
      return;
    }

    const startLat = animatedLocation.latitude;
    const startLng = animatedLocation.longitude;
    const endLat = driverLocation.latitude;
    const endLng = driverLocation.longitude;

    const duration = 1000; // interpolate over 1 second
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

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoute(coords);
        }
      } catch (err) {
        console.error('OSRM fetch failed:', err);
      }
    };
    fetchRoute();
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  // Calculate distance between driver and customer pickup location
  const distanceToPickup = animatedLocation
    ? calculateDistance(animatedLocation.latitude, animatedLocation.longitude, pickupLat, pickupLng)
    : null;

  const isNear = distanceToPickup !== null && distanceToPickup <= 0.5; // True if within 500 meters

  // Scale up driver truck icon size and add pulsing rings when driver comes near customer
  const DynamicTruckIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center" style="width: 100%; height: 100%;">
      ${isNear ? `<div class="absolute rounded-full bg-rose-500/25 border-2 border-rose-500 animate-ping" style="width: 56px; height: 56px;"></div>` : ''}
      <div style="font-size: ${isNear ? '40px' : '26px'}; transition: font-size 0.4s ease-out-in;">🚚</div>
    </div>`,
    className: 'custom-truck-marker',
    iconSize: isNear ? [56, 56] : [32, 32],
    iconAnchor: isNear ? [28, 28] : [16, 16]
  });

  return (
    <div className="relative h-[400px] w-full rounded-xl overflow-hidden shadow-lg border border-slate-200">
      {/* Alert Notification Toast when Driver is near */}
      {isNear && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm rounded-2xl bg-amber-500 px-5 py-3 text-white text-center font-bold text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 border border-amber-400 animate-bounce">
          🔔 Driver is near your location!
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

        {/* Pickup Marker */}
        <Marker position={[pickupLat, pickupLng]}>
          <Popup>Pickup Location</Popup>
        </Marker>

        {/* Drop Marker */}
        <Marker position={[dropLat, dropLng]}>
          <Popup>Drop Location</Popup>
        </Marker>

        {/* Route Polyline */}
        {route.length > 0 && (
          <Polyline 
            positions={route} 
            color="#4f46e5" 
            weight={4} 
            opacity={0.6} 
            dashArray="10, 10"
          />
        )}

        {/* Dynamic Smooth Driver Marker */}
        {animatedLocation && (
          <Marker position={[animatedLocation.latitude, animatedLocation.longitude]} icon={DynamicTruckIcon}>
            <Popup>Driver is here</Popup>
          </Marker>
        )}

        <ZoomHandler location={animatedLocation} />
      </MapContainer>
    </div>
  );
};

export default TrackingMap;
