import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Loader2, Package, MapPin, Navigation, CheckCircle, XCircle, Clock } from 'lucide-react';

interface FleetRow {
    vehicleId: string;
    vehicleNumber?: string;
    vehicleName?: string;
    driverId?: string;
    driverName?: string;
    liveStatus?: string;
    rideStatus?: string;
    latitude?: number;
    longitude?: number;
}

interface TransporterRideRequestsProps {
    userId: string;
    fleetRows: FleetRow[];
    onAssignmentSuccess?: () => void;
}

const TransporterRideRequests: React.FC<TransporterRideRequestsProps> = ({ userId, fleetRows, onAssignmentSuccess }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigningId, setAssigningId] = useState<number | null>(null);
    const [selectedFleetMap, setSelectedFleetMap] = useState<Record<number, string>>({});
    const [claimedBookingIds, setClaimedBookingIds] = useState<Record<number, boolean>>({});

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [requestsRes, claimRes] = await Promise.all([
                apiClient.get('/Vehicle/transporterRideRequests/' + userId),
                apiClient.get('/Transport/getRelationshipNotifications?userId=' + userId).catch(() => ({ data: [] }))
            ]);
            setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);

            const claimsMap: Record<number, boolean> = {};
            if (Array.isArray(claimRes.data)) {
                claimRes.data.forEach((n: any) => {
                    if (n.message && n.message.startsWith('CLAIM|')) {
                        const parts = n.message.split('|');
                        const bId = Number(parts[1]);
                        if (bId) claimsMap[bId] = true;
                    }
                });
            }
            setClaimedBookingIds(claimsMap);
        } catch (err) {
            console.error('Failed to fetch requests', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchRequests();
            const interval = setInterval(fetchRequests, 15000); // Polling every 15s
            return () => clearInterval(interval);
        }
    }, [userId]);

    const handleClaimShipment = async (bookingId: number) => {
        try {
            setAssigningId(bookingId);
            await apiClient.post(`/Transport/acceptShipmentAsTransporter?transporterUserId=${userId}&bookingId=${bookingId}`);
            alert('Shipment successfully claimed! Now select a driver to assign.');
            fetchRequests();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data || 'Failed to claim shipment.');
        } finally {
            setAssigningId(null);
        }
    };

    const handleAssign = async (bookingId: number) => {
        const selectedValue = selectedFleetMap[bookingId];
        if (!selectedValue) {
            alert('Please select a driver and vehicle to assign.');
            return;
        }

        const driverId = selectedValue.split('|')[0];
        if (!driverId || driverId === 'undefined') {
            alert('The selected vehicle does not have a valid driver assigned.');
            return;
        }

        try {
            setAssigningId(bookingId);
            await apiClient.post(`/Transport/assignTransporterBookingToDriver?transporterUserId=${userId}&bookingId=${bookingId}&driverId=${driverId}`);
            alert('Shipment successfully assigned to driver! Awaiting driver acceptance.');
            fetchRequests();
            if (onAssignmentSuccess) onAssignmentSuccess();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data || 'Failed to assign shipment.');
        } finally {
            setAssigningId(null);
        }
    };

    const handleReject = async (bookingId: number) => {
        if (!window.confirm('Are you sure you want to reject this ride for your entire fleet?')) return;
        
        try {
            setAssigningId(bookingId);
            await apiClient.patch(`/Vehicle/${bookingId}/transporterRideRequest/reject?transporterUserId=${userId}`);
            fetchRequests();
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.response?.data?.Message || 'Failed to reject ride.');
        } finally {
            setAssigningId(null);
        }
    };

    if (loading && requests.length === 0) {
        return <div className="p-8 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading incoming requests...</div>;
    }

    if (requests.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Navigation className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No active requests</h3>
                <p className="text-slate-500 max-w-sm">There are currently no new ride requests matching your fleet's active vicinity.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {requests.map(req => {
                const bookingId = req.id || req.Id;
                const isClaimed = claimedBookingIds[bookingId];

                return (
                    <div key={bookingId} className="premium-card p-6 border-l-4 border-l-primary-500 bg-white">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-primary-50 text-primary-700 font-bold text-xs rounded-full shadow-sm">New Request #{bookingId}</span>
                                    <span className="text-sm font-semibold text-slate-600 border border-slate-200 px-3 py-1 rounded-full">{req.goodsType || req.GoodsType} • {req.goodsWeight || req.GoodsWeight} Tons</span>
                                </div>
                                
                                <div className="relative pl-6 space-y-4 mb-5 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-200">
                                    <div className="relative">
                                        <div className="absolute -left-6 top-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900">{req.pickupAddress || req.PickupAddress || 'Unknown Pickup'}</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-6 top-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-50"></div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900">{req.dropAddress || req.DropAddress || 'Unknown Drop'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> <span className="font-semibold text-slate-700">Customer:</span> {req.customerName || req.CustomerName || 'N/A'}</div>
                                    <div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" /> <span className="font-semibold text-slate-700">Fare:</span> ₹ {req.estimatedFare || req.EstimatedFare || 0}</div>
                                    {req.scheduledTime && (
                                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> <span className="font-semibold text-slate-700">Scheduled:</span> {new Date(req.scheduledTime).toLocaleString()}</div>
                                    )}
                                </div>
                            </div>

                            <div className="md:w-72 flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                {isClaimed ? (
                                    <>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign to Vehicle & Driver</label>
                                        <select
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all cursor-pointer bg-slate-50 hover:bg-white"
                                            value={selectedFleetMap[bookingId] || ''}
                                            onChange={(e) => setSelectedFleetMap({ ...selectedFleetMap, [bookingId]: e.target.value })}
                                        >
                                            <option value="">-- Select Available Nearness --</option>
                                            {fleetRows
                                                .filter(f => {
                                                    const isAvailable = !f.rideStatus || f.rideStatus.toLowerCase() === 'available';
                                                    const hasDriver = f.driverId && f.driverId !== 'Unassigned';
                                                    return isAvailable && hasDriver;
                                                })
                                                .map(f => {
                                                    const dist = calculateDistance(
                                                        req.pickupLatitude || req.PickupLatitude,
                                                        req.pickupLongitude || req.PickupLongitude,
                                                        f.latitude || 0,
                                                        f.longitude || 0
                                                    );
                                                    return { ...f, distance: dist };
                                                })
                                                .sort((a, b) => a.distance - b.distance)
                                                .map(f => (
                                                    <option key={f.vehicleId} value={`${f.driverId}|${f.vehicleId}`}>
                                                        {f.vehicleNumber} ({f.driverName}) • {f.distance < 1 ? '<1' : f.distance.toFixed(1)} km away
                                                    </option>
                                                ))}
                                            {fleetRows.filter(f => {
                                                const isAvailable = !f.rideStatus || f.rideStatus.toLowerCase() === 'available';
                                                const hasDriver = f.driverId && f.driverId !== 'Unassigned';
                                                return !(isAvailable && hasDriver);
                                            }).length > 0 && (
                                                <optgroup label="Unavailable / No Driver">
                                                    {fleetRows
                                                        .filter(f => !(!f.rideStatus || f.rideStatus.toLowerCase() === 'available' && f.driverId && f.driverId !== 'Unassigned'))
                                                        .map(f => (
                                                            <option key={f.vehicleId} value="" disabled>
                                                                {f.vehicleNumber} ({f.driverName || 'No Driver'}) - {f.rideStatus || 'Busy'}
                                                            </option>
                                                        ))}
                                                </optgroup>
                                            )}
                                        </select>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAssign(bookingId)}
                                                disabled={assigningId === bookingId || !selectedFleetMap[bookingId]}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-500/20 cursor-pointer"
                                            >
                                                {assigningId === bookingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                Assign Driver
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-500 text-center italic mb-1">Claim shipment first to lock it under your transporter company.</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleClaimShipment(bookingId)}
                                                disabled={assigningId === bookingId}
                                                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary-500/20 cursor-pointer"
                                            >
                                                {assigningId === bookingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                Claim Shipment
                                            </button>
                                            <button
                                                onClick={() => handleReject(bookingId)}
                                                disabled={assigningId === bookingId}
                                                className="px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer"
                                                title="Reject Request"
                                            >
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TransporterRideRequests;
