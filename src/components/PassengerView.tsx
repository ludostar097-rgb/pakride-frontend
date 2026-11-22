import React, { useState, useEffect } from 'react';
import {
  Car,
  Bike,
  Navigation,
  Clock,
  Banknote,
  Star,
  CheckCircle,
  AlertTriangle,
  Phone,
  ShieldAlert,
  ArrowRight,
  Share2,
  KeyRound,
  MessageSquare,
  Volume2,
  Check,
  MapPin,
  Sparkles,
  Compass
} from 'lucide-react';
import {
  VehicleCategory,
  LocationCoordinates,
  RideRequest,
  RideOffer
} from '../shared/types';
import { MapView } from './MapView';
import { LocationSearchInput } from './LocationSearchInput';
import { LiveChatModal } from './LiveChatModal';
import { GeocodingService } from '../services/geocoding';
import { Socket } from 'socket.io-client';

interface PassengerViewProps {
  socket: Socket | null;
  currentUser: { id: string; fullName: string; phone: string };
  lang: 'en' | 'ur';
  t: any;
  apiBaseUrl: string;
}

export const PassengerView: React.FC<PassengerViewProps> = ({
  socket,
  currentUser,
  lang,
  t,
  apiBaseUrl
}) => {
  const [detectedCity, setDetectedCity] = useState<string>('Islamabad & Rawalpindi');
  const [category, setCategory] = useState<VehicleCategory>('CAR');
  const [mapTargetMode, setMapTargetMode] = useState<'pickup' | 'destination'>('pickup');
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Initialize with dynamic popular hubs or saved user history
  const savedRecents = GeocodingService.getRecentLocations();
  const defaultHubs = GeocodingService.getPopularHubsForLocation();
  const [pickup, setPickup] = useState<LocationCoordinates>(savedRecents[0] || defaultHubs[0]);
  const [destination, setDestination] = useState<LocationCoordinates>(savedRecents[1] || defaultHubs[1]);
  const [pickupNotes, setPickupNotes] = useState<string>('');
  const [recentChips, setRecentChips] = useState<LocationCoordinates[]>(
    savedRecents.length > 0 ? savedRecents : defaultHubs
  );

  const [fareEstimate, setFareEstimate] = useState<{
    distanceKm: number;
    estimatedMinutes: number;
    suggestedFarePkr: number;
    zoneName?: string;
  } | null>(null);

  const [proposedFarePkr, setProposedFarePkr] = useState<number>(250);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [offers, setOffers] = useState<RideOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | undefined>();
  const [showSosModal, setShowSosModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [audioPromptSent, setAudioPromptSent] = useState(false);

  const notePresets = [t.noteGate, t.noteBakery, t.noteCall, t.noteCorner];

  const getAuthToken = () => {
    return localStorage.getItem('pakride_token') || `mock-token-${currentUser.id}`;
  };

  // Automatically detect GPS location on app launch (Zero-effort passenger onboarding)
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocatingGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lng = Math.round(pos.coords.longitude * 10000) / 10000;
          try {
            const loc = await GeocodingService.reverseGeocode(lat, lng);
            setPickup(loc);
            GeocodingService.saveRecentLocation(loc);
            const hubs = GeocodingService.getPopularHubsForLocation({ lat, lng });
            setRecentChips(hubs);
            if (lat >= 33.0) setDetectedCity('Islamabad / Rawalpindi');
            else if (lat >= 31.0) setDetectedCity('Lahore');
            else setDetectedCity('Karachi');
          } catch (e) {
            console.warn('Auto reverse-geocoding error:', e);
          } finally {
            setIsLocatingGps(false);
          }
        },
        (err) => {
          console.log('GPS auto-locate permission notice:', err.message);
          setIsLocatingGps(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Locate Me manual trigger using Device / Browser GPS
  const handleLocateGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        const loc = await GeocodingService.reverseGeocode(lat, lng);
        setPickup(loc);
        GeocodingService.saveRecentLocation(loc);
        const hubs = GeocodingService.getPopularHubsForLocation({ lat, lng });
        setRecentChips(hubs);
        if (lat >= 33.0) setDetectedCity('Islamabad / Rawalpindi');
        else if (lat >= 31.0) setDetectedCity('Lahore');
        else setDetectedCity('Karachi');
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsLocatingGps(false);
        alert('Could not retrieve GPS location. Please check location permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Fetch estimated fare whenever pickup, dest, or category changes (Auto-detects active operational zone)
  useEffect(() => {
    if (!pickup || !destination) return;

    fetch(`${apiBaseUrl}/api/rides/calculate-fare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        pickup,
        destination
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestedFarePkr) {
          setFareEstimate(data);
          setProposedFarePkr(data.suggestedFarePkr);
          if (data.zoneName) {
            setDetectedCity(data.zoneName);
          }
        }
      })
      .catch((err) => console.error('Fare calculation error:', err));
  }, [category, pickup, destination, apiBaseUrl]);

  // Socket event listeners for real-time ride & offer updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_user_room', currentUser.id);

    socket.on('new_offer_received', (data: { rideId: string; offer: RideOffer }) => {
      setOffers((prev) => {
        const exists = prev.some((o) => o.id === data.offer.id);
        if (exists) return prev;
        return [data.offer, ...prev];
      });
    });

    socket.on('ride_status_changed', (data: { ride: RideRequest }) => {
      setActiveRide(data.ride);
    });

    socket.on('driver_position_broadcast', (data: { driverId: string; lat: number; lng: number }) => {
      if (activeRide && activeRide.driverId === data.driverId) {
        setDriverPos({ lat: data.lat, lng: data.lng });
      }
    });

    return () => {
      socket.off('new_offer_received');
      socket.off('ride_status_changed');
      socket.off('driver_position_broadcast');
    };
  }, [socket, currentUser.id, activeRide]);

  // Submit Ride Request
  const handleRequestRide = async () => {
    setLoading(true);
    setOffers([]);
    try {
      const res = await fetch(`${apiBaseUrl}/api/rides/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          category,
          pickup,
          destination,
          proposedFarePkr,
          pickupNotes: pickupNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.ride) {
        setActiveRide(data.ride);
        // Save pickup and destination to user's recent places
        GeocodingService.saveRecentLocation(pickup);
        GeocodingService.saveRecentLocation(destination);
      }
    } catch (err) {
      console.error('Request ride failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Passenger selects an offer (Atomic Assignment)
  const handleSelectOffer = async (offerId: string) => {
    if (!activeRide) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/rides/${activeRide.id}/select-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ offerId })
      });
      const data = await res.json();
      if (data.ride) {
        setActiveRide(data.ride);
      }
    } catch (err) {
      console.error('Error selecting offer:', err);
    }
  };

  // Cancel Ride
  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
      await fetch(`${apiBaseUrl}/api/rides/${activeRide.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          newStatus: 'CANCELLED',
          reason: 'Cancelled by Passenger'
        })
      });
      setActiveRide(null);
      setOffers([]);
    } catch (err) {
      console.error('Cancel ride error:', err);
    }
  };

  // Generate WhatsApp Safety Share Link
  const handleShareWhatsApp = () => {
    if (!activeRide) return;
    const msg = encodeURIComponent(
      `Assalam-o-Alaikum! I am on a PakRide trip in ${detectedCity}.\nDriver: ${activeRide.driverName || 'Assigned Driver'}\nVehicle: ${activeRide.vehicleDetails || 'PakRide'}\nFare: PKR ${Math.round((activeRide.agreedFarePaisa || activeRide.proposedFarePaisa) / 100)}\nTrack trip safety: https://pakride.pk/track/${activeRide.id}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Quick Simulated Voice Note
  const handleSimulateAudioNote = () => {
    setAudioPromptSent(true);
    setTimeout(() => setAudioPromptSent(false), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left Column: Interactive Map */}
      <div className="lg:col-span-7 h-[440px] lg:h-[720px] sticky top-20">
        <MapView
          pickup={pickup}
          destination={destination}
          driverLocation={driverPos}
          onSelectPickup={(loc) => {
            if (!activeRide) {
              setPickup(loc);
              GeocodingService.saveRecentLocation(loc);
            }
          }}
          onSelectDestination={(loc) => {
            if (!activeRide) {
              setDestination(loc);
              GeocodingService.saveRecentLocation(loc);
            }
          }}
          zoneName={detectedCity}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-pakgreen-600" />
            <span>Click anywhere on the map to set pin location</span>
          </div>
          <div className="flex items-center space-x-1 font-semibold">
            <span className={mapTargetMode === 'pickup' ? 'text-pakgreen-600' : 'text-slate-400'}>🟢 Pickup</span>
            <span>/</span>
            <span className={mapTargetMode === 'destination' ? 'text-red-600' : 'text-slate-400'}>🔴 Drop</span>
          </div>
        </div>
      </div>

      {/* Right Column: Ride Actions & Workflow */}
      <div className="lg:col-span-5 space-y-4">
        {/* CASE 1: No Active Ride - Booking Flow */}
        {!activeRide && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            {/* Clean Header: Vehicle Category & GPS Location Status (No manual city tabs) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-charcoal-900 flex items-center space-x-2">
                  <span>{t.selectCategory}</span>
                </h2>
                <span className="text-xs bg-pakgreen-100 text-pakgreen-800 px-2.5 py-1 rounded-full font-bold">
                  0% Commission
                </span>
              </div>

              {/* Automatic Location / Zone Status Banner */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pakgreen-500 animate-pulse flex-shrink-0"></span>
                  <span className="text-slate-700 font-semibold truncate">
                    📍 {pickup?.address ? pickup.address.split(',')[0] : 'Current Location'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLocateGps}
                  disabled={isLocatingGps}
                  className="text-pakgreen-700 hover:text-pakgreen-800 font-bold text-[11px] flex items-center space-x-1 flex-shrink-0 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-slate-50 transition"
                >
                  <Navigation className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGps ? 'Locating...' : 'Locate Me'}</span>
                </button>
              </div>
            </div>

            {/* Vehicle Category Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('CAR')}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition ${
                  category === 'CAR'
                    ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Car className="w-6 h-6" />
                <span className="font-semibold text-xs">{t.car}</span>
                <span className="text-[10px] text-slate-400">4 Seats</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('MOTORCYCLE')}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition ${
                  category === 'MOTORCYCLE'
                    ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Bike className="w-6 h-6" />
                <span className="font-semibold text-xs">{t.motorcycle}</span>
                <span className="text-[10px] text-slate-400">1 Rider</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('RICKSHAW')}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition ${
                  category === 'RICKSHAW'
                    ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Navigation className="w-6 h-6" />
                <span className="font-semibold text-xs">{t.rickshaw}</span>
                <span className="text-[10px] text-slate-400">3 Seats</span>
              </button>
            </div>

            {/* Dynamic Search Inputs (Fuzzy, Typo-Tolerant Autocomplete) */}
            <div className="space-y-3">
              <LocationSearchInput
                label={t.pickupLocation}
                iconColor="bg-emerald-500"
                value={pickup}
                onChange={(loc) => setPickup(loc)}
                placeholder="Where should we pick you up? (or tap Locate Me)..."
                userLocation={pickup ? { lat: pickup.lat, lng: pickup.lng } : undefined}
                showGpsButton={true}
                onLocateGps={handleLocateGps}
                isLocating={isLocatingGps}
              />

              <LocationSearchInput
                label={t.destinationLocation}
                iconColor="bg-red-500"
                value={destination}
                onChange={(loc) => setDestination(loc)}
                placeholder="Where to? (e.g. Centaurus, Airport, F-10, DHA...)"
                userLocation={pickup ? { lat: pickup.lat, lng: pickup.lng } : undefined}
              />

              {/* Recent / Frequent Location Quick Chips */}
              {recentChips.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Quick Places:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentChips.slice(0, 5).map((hub, idx) => (
                      <button
                        key={`${hub.address}-${idx}`}
                        type="button"
                        onClick={() => {
                          setDestination(hub);
                          GeocodingService.saveRecentLocation(hub);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 truncate max-w-[180px]"
                        title={hub.address}
                      >
                        <MapPin className="w-3 h-3 text-pakgreen-600 flex-shrink-0" />
                        <span className="truncate">{hub.address.split(',')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pickup Landmark & Gate Detail Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block flex items-center space-x-1">
                  <span>📌 {t.pickupNotesLabel}</span>
                </label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder={t.pickupNotesPlaceholder}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pakgreen-500 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {notePresets.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPickupNotes((prev) => (prev ? `${prev}, ${tag}` : tag))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-medium transition"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Estimated Stats */}
            {fareEstimate && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-3 text-center divide-x divide-slate-200">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">{t.distance}</div>
                  <div className="text-sm font-bold text-slate-700">{fareEstimate.distanceKm} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">{t.estTime}</div>
                  <div className="text-sm font-bold text-slate-700">{fareEstimate.estimatedMinutes} mins</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">{t.suggestedFare}</div>
                  <div className="text-sm font-bold text-pakgreen-600">PKR {fareEstimate.suggestedFarePkr}</div>
                </div>
              </div>
            )}

            {/* Fare Negotiation Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-charcoal-900">{t.yourOffer}</label>
                <span className="text-[11px] text-slate-400">
                  Suggested: PKR {fareEstimate?.suggestedFarePkr || 250}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="50"
                  value={proposedFarePkr}
                  onChange={(e) => setProposedFarePkr(Number(e.target.value))}
                  className="w-full pl-4 pr-16 py-3 text-lg font-extrabold bg-white border-2 border-slate-300 focus:border-pakgreen-500 rounded-xl outline-none"
                />
                <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">PKR</span>
              </div>
            </div>

            {/* Request Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleRequestRide}
              className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pakgreen-500/20 active:scale-[0.99] transition flex items-center justify-center space-x-2"
            >
              <span>{t.findDrivers}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* CASE 2: Ride Requested & Waiting for Driver Counteroffers */}
        {activeRide && (activeRide.status === 'REQUESTED' || activeRide.status === 'OFFERS_OPEN') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                  {t.waitingOffers}
                </span>
                <h3 className="text-lg font-bold text-charcoal-900 mt-2">{t.receivedOffers} ({offers.length})</h3>
              </div>
              <button
                onClick={handleCancelRide}
                className="text-xs text-red-600 hover:text-red-700 font-semibold underline"
              >
                {t.cancelRide}
              </button>
            </div>

            {/* Ride Details Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t.yourOffer}</span>
                <span className="font-bold text-slate-800 text-sm">
                  PKR {Math.round(activeRide.proposedFarePaisa / 100)} ({activeRide.category})
                </span>
              </div>
              {activeRide.pickupNotes && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  📌 <span className="font-semibold">Note:</span> {activeRide.pickupNotes}
                </div>
              )}
            </div>

            {/* Offers List */}
            {offers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-spin" />
                <p>{t.noOffersYet}</p>
                <p className="text-xs mt-1 text-slate-400">Drivers nearby are reviewing your offer...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const offerPkr = Math.round(offer.counterFarePaisa / 100);
                  const proposedPkr = Math.round(activeRide.proposedFarePaisa / 100);
                  const isCounter = offerPkr !== proposedPkr;

                  return (
                    <div
                      key={offer.id}
                      className="p-4 rounded-xl border-2 border-slate-200 hover:border-pakgreen-500 bg-white transition space-y-2 relative overflow-hidden"
                    >
                      {/* Urgency countdown indicator */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
                        <div className="h-full bg-pakgreen-500 w-3/4 animate-pulse"></div>
                      </div>

                      <div className="flex justify-between items-start pt-1">
                        <div>
                          <div className="font-bold text-charcoal-900 text-sm">{offer.driverName}</div>
                          <div className="text-xs text-slate-500">{offer.driverVehicle}</div>
                          <div className="flex items-center text-xs text-amber-500 font-semibold mt-0.5">
                            <Star className="w-3.5 h-3.5 fill-current mr-1" />
                            <span>{offer.driverRating}</span>
                            <span className="text-slate-400 font-normal ml-2">
                              {offer.etaMinutes} {t.minsAway}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-extrabold text-pakgreen-600">
                            PKR {offerPkr}
                          </div>
                          {isCounter ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              {t.counterOfferBadge}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              {t.driverAcceptedBadge}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectOffer(offer.id)}
                        className="w-full mt-2 bg-charcoal-900 hover:bg-black text-white font-bold py-2 rounded-lg text-xs transition"
                      >
                        {t.acceptOffer}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CASE 3: Driver Selected & Trip in Progress */}
        {activeRide &&
          ['DRIVER_SELECTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(activeRide.status) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-pakgreen-600 bg-pakgreen-50 px-3 py-1 rounded-full">
                  {activeRide.status === 'DRIVER_SELECTED' && t.driverSelected}
                  {activeRide.status === 'EN_ROUTE' && t.enRoute}
                  {activeRide.status === 'IN_PROGRESS' && t.inProgress}
                  {activeRide.status === 'COMPLETED' && t.completed}
                </span>

                <button
                  type="button"
                  onClick={() => setShowSosModal(true)}
                  className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-xl text-xs font-bold flex items-center space-x-1 border border-red-200"
                >
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>{t.sosButton}</span>
                </button>
              </div>

              {/* 4-DIGIT RIDE VERIFICATION PIN (Safety Feature) */}
              {activeRide.status !== 'COMPLETED' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span>{t.otpPinTitle}</span>
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5">{t.otpPinSub}</div>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-charcoal-900 tracking-widest bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-inner">
                    {activeRide.verificationOtp || '4821'}
                  </div>
                </div>
              )}

              {/* Driver Details Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-charcoal-900">{activeRide.driverName}</div>
                  <div className="text-xs text-slate-500">{activeRide.vehicleDetails}</div>
                  <div className="flex items-center text-xs text-amber-500 font-semibold mt-1">
                    <Star className="w-3.5 h-3.5 fill-current mr-1" />
                    <span>{activeRide.driverRating || 4.9}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowChatModal(true)}
                    className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 shadow-sm"
                    title="Live Chat with Driver"
                  >
                    <MessageSquare className="w-4 h-4 text-pakgreen-600" />
                  </button>
                  <a
                    href={`tel:${activeRide.driverPhone}`}
                    className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 shadow-sm"
                    title="Call Driver"
                  >
                    <Phone className="w-4 h-4 text-pakgreen-600" />
                  </a>
                </div>
              </div>

              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.shareWhatsApp}</span>
              </button>

              {/* Quick Simulated Voice Note */}
              <button
                type="button"
                onClick={handleSimulateAudioNote}
                className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-2 transition"
              >
                <Volume2 className="w-4 h-4 text-pakgreen-600" />
                <span>{audioPromptSent ? t.audioSimulatedMsg : t.quickAudioPrompt}</span>
              </button>

              {/* Payment Summary */}
              <div className="p-4 bg-pakgreen-50 rounded-xl border border-pakgreen-200 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-600 block">{t.fareSummary}</span>
                  <span className="text-xl font-extrabold text-pakgreen-700">
                    PKR {Math.round((activeRide.agreedFarePaisa || activeRide.proposedFarePaisa) / 100)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Method</span>
                  <div className="text-xs font-bold text-charcoal-900 uppercase">Cash on Arrival</div>
                </div>
              </div>

              {/* Completed Modal / Review */}
              {activeRide.status === 'COMPLETED' && (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="flex items-center space-x-2 text-pakgreen-600 font-bold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>{t.completed}</span>
                  </div>
                  <p className="text-xs text-slate-500">{t.rateDriver}</p>

                  <div className="flex space-x-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        onClick={() => setSelectedStars(star)}
                        className={`w-7 h-7 cursor-pointer transition ${
                          star <= selectedStars
                            ? 'text-amber-400 fill-current hover:scale-110'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>

                  <input
                    type="text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write a review (e.g. polite driver, AC working, on time)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch(`${apiBaseUrl}/api/rides/${activeRide.id}/rate`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${getAuthToken()}`
                          },
                          body: JSON.stringify({
                            rating: selectedStars,
                            reviewComment: reviewText
                          })
                        });
                      } catch (err) {}
                      setActiveRide(null);
                      setOffers([]);
                    }}
                    className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    {t.submitReview}
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Live Chat Modal */}
      {activeRide && (
        <LiveChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          rideId={activeRide.id}
          currentUser={currentUser}
          recipientName={activeRide.driverName || 'Driver'}
          recipientPhone={activeRide.driverPhone}
          socket={socket}
          apiBaseUrl={apiBaseUrl}
        />
      )}

      {/* Emergency SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-charcoal-900">PakRide Safety SOS</h3>
            <p className="text-xs text-center text-slate-600">
              Emergency assistance is available 24/7 across Pakistan (Police Madadgar 15).
            </p>
            <div className="space-y-2">
              <a
                href="tel:15"
                className="block text-center w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm"
              >
                Call Police (Madadgar 15)
              </a>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="w-full border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
