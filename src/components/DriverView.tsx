import React, { useState, useEffect } from 'react';
import {
  Power,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  KeyRound,
  Sparkles,
  Zap
} from 'lucide-react';
import { RideRequest, DriverProfile } from '../shared/types';
import { Socket } from 'socket.io-client';

interface DriverViewProps {
  socket: Socket | null;
  currentUser: { id: string; fullName: string; phone: string };
  driverProfile: DriverProfile;
  lang: 'en' | 'ur';
  t: any;
  apiBaseUrl: string;
}

export const DriverView: React.FC<DriverViewProps> = ({
  socket,
  currentUser,
  driverProfile: initialProfile,
  lang,
  t,
  apiBaseUrl
}) => {
  const [profile, setProfile] = useState<DriverProfile>(initialProfile);
  const [availableRides, setAvailableRides] = useState<RideRequest[]>([]);
  const [activeTrip, setActiveTrip] = useState<RideRequest | null>(null);
  const [counterValues, setCounterValues] = useState<Record<string, number>>({});
  const [showPinModal, setShowPinModal] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<{
    completedTripsCount: number;
    totalGrossPkr: number;
    totalCommissionPkr: number;
    totalNetPkr: number;
  }>({
    completedTripsCount: 0,
    totalGrossPkr: 0,
    totalCommissionPkr: 0,
    totalNetPkr: 0
  });

  const isApproved = profile.verificationStatus === 'APPROVED';

  const getAuthToken = () => {
    return localStorage.getItem('pakride_token') || `mock-token-${currentUser.id}`;
  };

  // Fetch driver earnings
  const fetchEarnings = () => {
    fetch(`${apiBaseUrl}/api/driver/earnings`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.totalGrossPkr !== undefined) setEarnings(data);
      })
      .catch((err) => console.error('Earnings fetch error:', err));
  };

  // Fetch available requests feed
  const fetchFeed = () => {
    if (!profile.isOnline || !isApproved) return;
    fetch(`${apiBaseUrl}/api/rides/driver/feed`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.rides) setAvailableRides(data.rides);
      })
      .catch((err) => console.error('Feed error:', err));
  };

  useEffect(() => {
    fetchEarnings();
    if (profile.isOnline) fetchFeed();
  }, [profile.isOnline, isApproved]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_user_room', currentUser.id);

    socket.on('new_ride_available', (newRide: RideRequest) => {
      if (profile.isOnline && isApproved) {
        setAvailableRides((prev) => {
          if (prev.some((r) => r.id === newRide.id)) return prev;
          return [newRide, ...prev];
        });
      }
    });

    socket.on('offer_accepted_notify', (data: { ride: RideRequest }) => {
      setActiveTrip(data.ride);
      setAvailableRides((prev) => prev.filter((r) => r.id !== data.ride.id));
    });

    socket.on('ride_status_changed', (data: { ride: RideRequest }) => {
      if (activeTrip && activeTrip.id === data.ride.id) {
        setActiveTrip(data.ride);
      }
    });

    // Periodic GPS simulation for Gulistan-e-Jauhar
    const interval = setInterval(() => {
      if (profile.isOnline && isApproved) {
        const deltaLat = (Math.random() - 0.5) * 0.001;
        const deltaLng = (Math.random() - 0.5) * 0.001;
        const lat = (profile.currentLat || 24.918) + deltaLat;
        const lng = (profile.currentLng || 67.135) + deltaLng;

        socket.emit('driver_location_update', {
          driverId: currentUser.id,
          lat,
          lng
        });
      }
    }, 4000);

    return () => {
      socket.off('new_ride_available');
      socket.off('offer_accepted_notify');
      socket.off('ride_status_changed');
      clearInterval(interval);
    };
  }, [socket, currentUser.id, profile.isOnline, isApproved, activeTrip]);

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    if (!isApproved) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/driver/toggle-online`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        }
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        if (!data.profile.isOnline) setAvailableRides([]);
      }
    } catch (err) {
      console.error('Toggle online error:', err);
    }
  };

  // Submit Driver Offer / Counteroffer
  const handleSubmitOffer = async (rideId: string, counterPkr: number) => {
    try {
      await fetch(`${apiBaseUrl}/api/rides/${rideId}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          counterFarePkr: counterPkr,
          etaMinutes: 4
        })
      });
      alert(`Offer of PKR ${counterPkr} submitted! Waiting for passenger confirmation.`);
    } catch (err) {
      console.error('Submit offer error:', err);
    }
  };

  // Progress Trip Workflow
  const handleTripTransition = async (newStatus: 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED', otp?: string) => {
    if (!activeTrip) return;
    setPinError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/rides/${activeTrip.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ newStatus, otp })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPinError(data.error || 'Failed to update trip');
        return;
      }
      if (data.ride) {
        if (newStatus === 'COMPLETED') {
          setActiveTrip(null);
          fetchEarnings();
        } else {
          setActiveTrip(data.ride);
          setShowPinModal(false);
          setInputPin('');
        }
      }
    } catch (err) {
      console.error('Trip transition error:', err);
    }
  };

  // Estimated 20% platform commission saved vs competitors
  const commissionSavedPkr = Math.round(earnings.totalGrossPkr * 0.20);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* 1. Header & Verification Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-charcoal-900">{currentUser.fullName}</h2>
              {isApproved ? (
                <span className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-800 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.statusApproved}</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t.statusReview}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {profile.vehicle?.color} {profile.vehicle?.make} {profile.vehicle?.model} ({profile.vehicle?.plateNumber}) • {t.pilotZone}
            </p>
          </div>

          {/* Online Toggle Button */}
          <button
            type="button"
            disabled={!isApproved}
            onClick={handleToggleOnline}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 shadow-sm transition ${
              !isApproved
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : profile.isOnline
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-pakgreen-500 hover:bg-pakgreen-600 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{profile.isOnline ? t.goOffline : t.goOnline}</span>
          </button>
        </div>

        {/* Warning if unapproved */}
        {!isApproved && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>{t.unapprovedNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Driver Earnings & 0% Commission Savings Tracker */}
      <div className="bg-gradient-to-r from-pakgreen-700 via-pakgreen-800 to-charcoal-900 rounded-2xl p-5 text-white shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-pakgreen-300" />
            <h3 className="text-sm font-semibold text-pakgreen-100">{t.driverEarnings}</h3>
          </div>
          <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
            0% Platform Fee
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-extrabold">PKR {earnings.totalNetPkr}</div>
            <div className="text-xs text-pakgreen-200 mt-0.5">Total Net Cash in Pocket</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{earnings.completedTripsCount}</div>
            <div className="text-xs text-pakgreen-200 mt-0.5">{t.tripsCompleted}</div>
          </div>
        </div>

        {/* Commission Savings Callout */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>{t.savingsTitle}: PKR {commissionSavedPkr}</span>
          </div>
          <span className="text-[10px] text-slate-300">{t.savingsSubtitle}</span>
        </div>
      </div>

      {/* 3. ACTIVE TRIP PROGRESSION (If Driver is on a ride) */}
      {activeTrip && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-pakgreen-500 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-pakgreen-700 bg-pakgreen-100 px-3 py-1 rounded-full">
              {t.tripStatus}: {activeTrip.status}
            </span>
            <span className="text-lg font-extrabold text-pakgreen-600">
              Cash: PKR {Math.round((activeTrip.agreedFarePaisa || activeTrip.proposedFarePaisa) / 100)}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-sm text-charcoal-900">Passenger: {activeTrip.passengerName}</div>
            <div className="text-xs text-slate-600">🟢 Pickup: {activeTrip.pickup.address}</div>
            <div className="text-xs text-slate-600">🔴 Destination: {activeTrip.destination.address}</div>
            {activeTrip.pickupNotes && (
              <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                📌 <span className="font-bold">Passenger Gate Note:</span> {activeTrip.pickupNotes}
              </div>
            )}
          </div>

          {/* Workflow Action Buttons */}
          <div className="pt-2">
            {activeTrip.status === 'DRIVER_SELECTED' && (
              <button
                type="button"
                onClick={() => handleTripTransition('EN_ROUTE')}
                className="w-full bg-charcoal-900 hover:bg-black text-white font-bold py-3 rounded-xl text-sm transition"
              >
                {t.markArrived}
              </button>
            )}

            {activeTrip.status === 'EN_ROUTE' && (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-3 rounded-xl text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{t.startTrip}</span>
              </button>
            )}

            {activeTrip.status === 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={() => handleTripTransition('COMPLETED')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{t.completeTrip}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. PIN VERIFICATION MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-pakgreen-100 rounded-full flex items-center justify-center mx-auto text-pakgreen-600">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-charcoal-900">{t.enterPinPrompt}</h3>
            <p className="text-xs text-center text-slate-500">
              Ask passenger for their 4-digit security PIN displayed on their screen.
            </p>

            {pinError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 text-center font-semibold">
                {pinError}
              </div>
            )}

            <div>
              <input
                type="text"
                maxLength={4}
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                placeholder="4-digit PIN"
                className="w-full text-center text-2xl font-mono font-extrabold tracking-widest py-2.5 border-2 border-slate-300 focus:border-pakgreen-500 rounded-xl outline-none"
              />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={inputPin.length < 4}
                onClick={() => handleTripTransition('IN_PROGRESS', inputPin)}
                className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition disabled:opacity-50"
              >
                {t.pinSubmit}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinError(null);
                }}
                className="w-full border border-slate-300 text-slate-700 font-semibold py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. LIVE REQUEST FEED */}
      {!activeTrip && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-charcoal-900 text-base">{t.activeRequests}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
              {availableRides.length} available
            </span>
          </div>

          {!profile.isOnline ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Power className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>You are currently OFFLINE.</p>
              <p className="text-xs mt-1">Tap "Go Online" above to receive passenger requests in Gulistan-e-Jauhar.</p>
            </div>
          ) : availableRides.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-spin" />
              <p>{t.noRequests}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableRides.map((ride) => {
                const passengerFare = Math.round(ride.proposedFarePaisa / 100);
                const currentCounter = counterValues[ride.id] || passengerFare;

                return (
                  <div
                    key={ride.id}
                    className="p-4 rounded-xl border-2 border-slate-200 hover:border-pakgreen-400 bg-white transition space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-slate-500">
                          {ride.category} • {ride.distanceKm} km
                        </span>
                        <div className="font-bold text-sm text-charcoal-900 mt-1">
                          🟢 {ride.pickup.address}
                        </div>
                        <div className="font-bold text-sm text-charcoal-900 mt-0.5">
                          🔴 {ride.destination.address}
                        </div>
                        {ride.pickupNotes && (
                          <div className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded mt-1.5 border border-amber-200 inline-block">
                            📌 {ride.pickupNotes}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">{t.yourOffer}</span>
                        <span className="text-xl font-extrabold text-pakgreen-600">
                          PKR {passengerFare}
                        </span>
                      </div>
                    </div>

                    {/* Counteroffer Controls with 1-Tap Quick Increment Pills */}
                    <div className="bg-slate-50 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleSubmitOffer(ride.id, passengerFare + 20)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:border-pakgreen-500 rounded text-xs font-bold text-pakgreen-700 shadow-sm"
                        >
                          +20 PKR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitOffer(ride.id, passengerFare + 50)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:border-pakgreen-500 rounded text-xs font-bold text-pakgreen-700 shadow-sm"
                        >
                          +50 PKR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitOffer(ride.id, passengerFare + 100)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:border-pakgreen-500 rounded text-xs font-bold text-pakgreen-700 shadow-sm"
                        >
                          +100 PKR
                        </button>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-slate-600">PKR</span>
                        <input
                          type="number"
                          step="10"
                          value={currentCounter}
                          onChange={(e) =>
                            setCounterValues({ ...counterValues, [ride.id]: Number(e.target.value) })
                          }
                          className="w-20 px-2 py-1 text-sm font-bold border border-slate-300 rounded bg-white text-right outline-none"
                        />
                      </div>
                    </div>

                    {/* Submit Offer Button */}
                    <button
                      type="button"
                      onClick={() => handleSubmitOffer(ride.id, currentCounter)}
                      className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1"
                    >
                      <span>
                        {currentCounter === passengerFare
                          ? t.acceptRide
                          : `${t.offerFare} ${currentCounter}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
