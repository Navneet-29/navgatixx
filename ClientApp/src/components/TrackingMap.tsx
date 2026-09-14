import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSignalR } from '../hooks/useSignalR';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import apiClient from '../api/apiClient';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const carIcon = L.divIcon({
  html: '<div style="background-color: #4f46e5; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35);">🚗</div>',
  className: 'custom-driver-car-pin',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

const pickupIcon = L.divIcon({
  html: '<div style="background-color: #059669; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">📍</div>',
  className: 'custom-pickup-pin',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

const dropIcon = L.divIcon({
  html: '<div style="background-color: #e11d48; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">🏁</div>',
  className: 'custom-drop-pin',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

interface TrackingMapProps {
  bookingId: number;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropLat?: number | null;
  dropLng?: number | null;
  pickupAddress?: string;
  dropAddress?: string;
  rideStatus?: string;
}

const AutoFitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);
  return null;
};

const TrackingMap: React.FC<TrackingMapProps> = ({
  bookingId,
  pickupLat: initialPickupLat,
  pickupLng: initialPickupLng,
  dropLat: initialDropLat,
  dropLng: initialDropLng,
  pickupAddress,
  dropAddress,
  rideStatus = 'driver_assigned'
}) => {
  const { driverLocation } = useSignalR(bookingId);
  const [animatedLocation, setAnimatedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [resolvedPickup, setResolvedPickup] = useState<[number, number] | null>(
    (initialPickupLat && initialPickupLng && initialPickupLat !== 0 && initialPickupLng !== 0)
      ? [initialPickupLat, initialPickupLng]
      : null
  );
  const [resolvedDrop, setResolvedDrop] = useState<[number, number] | null>(
    (initialDropLat && initialDropLng && initialDropLat !== 0 && initialDropLng !== 0)
      ? [initialDropLat, initialDropLng]
      : null
  );

  const [stage1Route, setStage1Route] = useState<[number, number][]>([]);
  const [stage2Route, setStage2Route] = useState<[number, number][]>([]);

  const isGoodsLoaded = rideStatus === 'driver_arriving' || rideStatus === 'ride_started' || rideStatus === 'ride_completed';
  const [activeView, setActiveView] = useState<'both' | 'to_pickup' | 'to_drop'>(isGoodsLoaded ? 'to_drop' : 'to_pickup');
  const [routeSummaryText, setRouteSummaryText] = useState<{ distanceKm: number; durationMin: number; currentStep: string } | null>(null);

  // Sync / resolve coordinates from props or geocoding
  useEffect(() => {
    if (initialPickupLat && initialPickupLng && initialPickupLat !== 0 && initialPickupLng !== 0) {
      setResolvedPickup([initialPickupLat, initialPickupLng]);
    } else if (pickupAddress && pickupAddress.trim()) {
      apiClient.get(`/Location/search?q=${encodeURIComponent(pickupAddress.trim())}`)
        .then(res => {
          const data = res.data;
          if (Array.isArray(data) && data.length > 0) {
            const lat = Number(data[0].lat || data[0].Lat);
            const lon = Number(data[0].lon || data[0].Lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              setResolvedPickup([lat, lon]);
            }
          }
        })
        .catch(() => {});
    }
  }, [initialPickupLat, initialPickupLng, pickupAddress]);

  useEffect(() => {
    if (initialDropLat && initialDropLng && initialDropLat !== 0 && initialDropLng !== 0) {
      setResolvedDrop([initialDropLat, initialDropLng]);
    } else if (dropAddress && dropAddress.trim()) {
      apiClient.get(`/Location/search?q=${encodeURIComponent(dropAddress.trim())}`)
        .then(res => {
          const data = res.data;
          if (Array.isArray(data) && data.length > 0) {
            const lat = Number(data[0].lat || data[0].Lat);
            const lon = Number(data[0].lon || data[0].Lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              setResolvedDrop([lat, lon]);
            }
          }
        })
        .catch(() => {});
    }
  }, [initialDropLat, initialDropLng, dropAddress]);

  const pickupLat = resolvedPickup ? resolvedPickup[0] : 0;
  const pickupLng = resolvedPickup ? resolvedPickup[1] : 0;
  const dropLat = resolvedDrop ? resolvedDrop[0] : 0;
  const dropLng = resolvedDrop ? resolvedDrop[1] : 0;

  // Fetch live tracking coordinates snapshot from backend and poll every 3 seconds
  useEffect(() => {
    if (!bookingId) return;
    const fetchTracking = async () => {
      try {
        const res = await apiClient.get(`/Vehicle/tracking/${bookingId}`);
        if (res.data) {
          const data = res.data;
          const dLat = data.driverLatitude ?? data.DriverLatitude;
          const dLng = data.driverLongitude ?? data.DriverLongitude;
          if (dLat && dLng && Number(dLat) !== 0 && Number(dLng) !== 0) {
            setAnimatedLocation({ latitude: Number(dLat), longitude: Number(dLng) });
          }
        }
      } catch (err) {
        console.error('Customer tracking fetch failed:', err);
      }
    };
    fetchTracking();
    const interval = setInterval(fetchTracking, 3000);
    return () => clearInterval(interval);
  }, [bookingId]);

  // Sync SignalR live location updates
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
    return () => cancelAnimationFrame(animationFrameId);
  }, [driverLocation]);

  // Driver coords with fallback near pickup if driver GPS signal hasn't pinged yet
  const driverLat = animatedLocation?.latitude || (pickupLat ? pickupLat - 0.008 : null);
  const driverLng = animatedLocation?.longitude || (pickupLng ? pickupLng - 0.008 : null);

  useEffect(() => {
    setActiveView(isGoodsLoaded ? 'to_drop' : 'to_pickup');
  }, [isGoodsLoaded]);

  // Stage 1 Route: Driver -> Pickup
  useEffect(() => {
    if (!driverLat || !driverLng || !pickupLat || !pickupLng) {
      if (driverLat && driverLng && pickupLat && pickupLng) {
        setStage1Route([[driverLat, driverLng], [pickupLat, pickupLng]]);
      }
      return;
    }
    const fetchStage1 = async () => {
      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/' + driverLng + ',' + driverLat + ';' + pickupLng + ',' + pickupLat + '?overview=full&geometries=geojson&steps=true';
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          const coords = r.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setStage1Route(coords);
          if (!isGoodsLoaded) {
            const firstStep = r.legs?.[0]?.steps?.[0]?.maneuver?.instruction || r.legs?.[0]?.steps?.[0]?.name || 'Driver on the way to pickup';
            setRouteSummaryText({
              distanceKm: Math.round((r.distance / 1000) * 10) / 10,
              durationMin: Math.round(r.duration / 60),
              currentStep: firstStep.startsWith('Head') ? firstStep : `Drive via ${firstStep}`
            });
          }
        } else {
          setStage1Route([[driverLat, driverLng], [pickupLat, pickupLng]]);
        }
      } catch (err) {
        setStage1Route([[driverLat, driverLng], [pickupLat, pickupLng]]);
      }
    };
    fetchStage1();
  }, [driverLat, driverLng, pickupLat, pickupLng, isGoodsLoaded]);

  // Stage 2 Route: Pickup -> Drop
  useEffect(() => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return;
    }
    const startLng = (rideStatus === 'ride_started' && driverLng) ? driverLng : pickupLng;
    const startLat = (rideStatus === 'ride_started' && driverLat) ? driverLat : pickupLat;

    const fetchStage2 = async () => {
      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/' + startLng + ',' + startLat + ';' + dropLng + ',' + dropLat + '?overview=full&geometries=geojson&steps=true';
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          const coords = r.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setStage2Route(coords);
          if (isGoodsLoaded) {
            const firstStep = r.legs?.[0]?.steps?.[0]?.maneuver?.instruction || r.legs?.[0]?.steps?.[0]?.name || 'Head to destination drop location';
            setRouteSummaryText({
              distanceKm: Math.round((r.distance / 1000) * 10) / 10,
              durationMin: Math.round(r.duration / 60),
              currentStep: firstStep.startsWith('Head') ? firstStep : `Head towards destination via ${firstStep}`
            });
          }
        } else {
          setStage2Route([[startLat, startLng], [dropLat, dropLng]]);
        }
      } catch (err) {
        setStage2Route([[startLat, startLng], [dropLat, dropLng]]);
      }
    };
    fetchStage2();
  }, [pickupLat, pickupLng, dropLat, dropLng, isGoodsLoaded, rideStatus, driverLat, driverLng]);

  const mapPoints: [number, number][] = [];
  if (driverLat && driverLng) mapPoints.push([driverLat, driverLng]);
  if (pickupLat && pickupLng) mapPoints.push([pickupLat, pickupLng]);
  if (dropLat && dropLng) mapPoints.push([dropLat, dropLng]);

  const defaultCenter: [number, number] = driverLat && driverLng
    ? [driverLat, driverLng]
    : pickupLat && pickupLng
      ? [pickupLat, pickupLng]
      : [28.6139, 77.2090];

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      {/* Top Header Bar matching Driver Interactive Map */}
      <div className="bg-slate-900 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">Interactive Ride Navigation Map</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView('both')}
            className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (activeView === 'both' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white')}
          >
            Full Route
          </button>
          <button
            type="button"
            onClick={() => setActiveView('to_pickup')}
            className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (activeView === 'to_pickup' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white')}
          >
            1. Driver ➔ Pickup
          </button>
          <button
            type="button"
            onClick={() => setActiveView('to_drop')}
            className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ' + (activeView === 'to_drop' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white')}
          >
            2. Pickup ➔ Drop
          </button>
        </div>
      </div>

      <div className="h-[380px] w-full relative">
        {/* Navigation Live Turn-By-Turn HUD Banner */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] w-[94%] max-w-lg rounded-2xl bg-slate-900/95 backdrop-blur-md px-4 py-3 text-white shadow-xl border border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 shadow-md ${
              !isGoodsLoaded ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {!isGoodsLoaded ? '📍' : '🏁'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  !isGoodsLoaded ? 'bg-indigo-500/30 text-indigo-300' : 'bg-emerald-500/30 text-emerald-300'
                }`}>
                  {!isGoodsLoaded ? 'Stage 1: To Pickup' : 'Stage 2: To Destination'}
                </span>
                {routeSummaryText && (
                  <span className="text-xs font-black text-amber-400">
                    {routeSummaryText.distanceKm} km • {routeSummaryText.durationMin} mins
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-100 truncate mt-0.5">
                {!isGoodsLoaded
                  ? `Pickup: ${pickupAddress || "Customer Pickup"}`
                  : `Drop: ${dropAddress || "Destination Drop"}`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Step Guide</span>
            <span className="text-xs font-extrabold text-white">
              {!isGoodsLoaded ? 'Stage 1 of 2' : 'Stage 2 of 2'}
            </span>
          </div>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {driverLat && driverLng && (
            <Marker position={[driverLat, driverLng]} icon={carIcon}>
              <Popup>
                <div className="font-bold text-xs">
                  <p className="text-indigo-600 uppercase font-black">🚗 Driver Live Location</p>
                  <p className="text-slate-500 font-normal mt-0.5">Driver GPS Location</p>
                </div>
              </Popup>
            </Marker>
          )}

          {pickupLat && pickupLng && (
            <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
              <Popup>
                <div className="font-bold text-xs">
                  <p className="text-emerald-700 uppercase font-black">📍 Step 1: Customer Pickup</p>
                  <p className="text-slate-600 font-normal mt-0.5">{pickupAddress || "Pickup location"}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {dropLat && dropLng && (
            <Marker position={[dropLat, dropLng]} icon={dropIcon}>
              <Popup>
                <div className="font-bold text-xs">
                  <p className="text-rose-700 uppercase font-black">🏁 Step 2: Destination Drop</p>
                  <p className="text-slate-600 font-normal mt-0.5">{dropAddress || "Drop location"}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {(activeView === 'both' || activeView === 'to_pickup') && stage1Route.length > 0 && (
            <Polyline
              positions={stage1Route}
              color="#4f46e5"
              weight={5}
              opacity={0.9}
            />
          )}

          {(activeView === 'both' || activeView === 'to_drop') && stage2Route.length > 0 && (
            <Polyline
              positions={stage2Route}
              color="#059669"
              weight={5}
              opacity={0.9}
            />
          )}

          {mapPoints.length > 0 && <AutoFitBounds points={
            activeView === 'to_pickup' && driverLat && driverLng && pickupLat && pickupLng
              ? [[driverLat, driverLng], [pickupLat, pickupLng]]
              : activeView === 'to_drop' && dropLat && dropLng && (driverLat || pickupLat)
                ? [[driverLat || pickupLat!, driverLng || pickupLng!], [dropLat, dropLng]]
                : mapPoints
          } />}
        </MapContainer>

        <div className="absolute bottom-2.5 left-2.5 z-[400] bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-md border border-slate-200 text-[11px] font-bold text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-1 rounded ${!isGoodsLoaded ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-slate-300'}`}></span>
            <span className={!isGoodsLoaded ? 'text-indigo-700 font-black' : 'text-slate-400'}>Stage 1: Driver ➔ Pickup</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-1 rounded ${isGoodsLoaded ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-slate-300'}`}></span>
            <span className={isGoodsLoaded ? 'text-emerald-700 font-black' : 'text-slate-400'}>Stage 2: Pickup ➔ Drop</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;
