import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ShieldCheck,
  Users,
  Car,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  Radar,
  Radio,
  MapPin,
  Plus,
  Compass,
  Power
} from 'lucide-react';
import { DriverProfile, RideRequest, PaymentLedgerEntry, CityZone } from '../shared/types';
import { PILOT_ZONES } from '../shared/constants';

interface AdminViewProps {
  currentUser: { id: string; fullName: string; phone: string; role: string };
  lang: 'en' | 'ur';
  t: any;
  apiBaseUrl: string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  lang,
  t,
  apiBaseUrl
}) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [ledger, setLedger] = useState<PaymentLedgerEntry[]>([]);
  const [zones, setZones] = useState<CityZone[]>(PILOT_ZONES as CityZone[]);
  const [settings, setSettings] = useState<any>({ introductoryCommissionPercent: 0 });
  const [activeTab, setActiveTab] = useState<'radar' | 'drivers' | 'rides' | 'ledger' | 'zones'>('radar');
  const [radarCity, setRadarCity] = useState<'Karachi' | 'Islamabad' | 'Rawalpindi' | 'Lahore'>('Karachi');
  const [loading, setLoading] = useState(false);

  // New Zone Form state
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newCityName, setNewCityName] = useState('Islamabad');
  const [newZoneName, setNewZoneName] = useState('Islamabad West & G Sectors');
  const [newCenterLat, setNewCenterLat] = useState('33.6844');
  const [newCenterLng, setNewCenterLng] = useState('73.0479');
  const [newRadiusKm, setNewRadiusKm] = useState('7.0');
  const [newBaseFareCar, setNewBaseFareCar] = useState('180');
  const [newPerKmCar, setNewPerKmCar] = useState('45');

  // Map refs for Radar
  const radarMapContainerRef = useRef<HTMLDivElement>(null);
  const radarMapRef = useRef<L.Map | null>(null);
  const driverMarkersMapRef = useRef<Record<string, L.Marker>>({});

  const getAuthToken = () => {
    return localStorage.getItem('pakride_token') || `mock-token-${currentUser.id}`;
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };

      const [dRes, rRes, lRes, sRes, zRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/admin/drivers`, { headers }),
        fetch(`${apiBaseUrl}/api/admin/rides`, { headers }),
        fetch(`${apiBaseUrl}/api/admin/ledger`, { headers }),
        fetch(`${apiBaseUrl}/api/admin/settings`, { headers }),
        fetch(`${apiBaseUrl}/api/zones`)
      ]);

      const [dData, rData, lData, sData, zData] = await Promise.all([
        dRes.json(),
        rRes.json(),
        lRes.json(),
        sRes.json(),
        zRes.json()
      ]);

      if (dData.drivers) setDrivers(dData.drivers);
      if (rData.rides) setRides(rData.rides);
      if (lData.ledger) setLedger(lData.ledger);
      if (sData.settings) setSettings(sData.settings);
      if (zData.zones) setZones(zData.zones);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser.id]);

  // Initialize Radar Map when tab is 'radar'
  useEffect(() => {
    if (activeTab !== 'radar' || !radarMapContainerRef.current) return;

    if (!radarMapRef.current) {
      const jauhar = [24.918, 67.135] as [number, number];
      const map = L.map(radarMapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(jauhar, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      radarMapRef.current = map;
    }

    const map = radarMapRef.current;
    if (map) {
      // Pan radar map according to selected city
      if (radarCity === 'Islamabad') {
        map.flyTo([33.6844, 73.0479], 13);
      } else if (radarCity === 'Rawalpindi') {
        map.flyTo([33.5651, 73.0169], 13);
      } else if (radarCity === 'Lahore') {
        map.flyTo([31.5204, 74.3587], 13);
      } else {
        map.flyTo([24.918, 67.135], 14);
      }

      // Plot Drivers on Radar Map
      Object.values(driverMarkersMapRef.current).forEach((m) => m.remove());
      driverMarkersMapRef.current = {};

      drivers.forEach((d) => {
        if (d.currentLat && d.currentLng) {
          const iconChar = d.vehicle?.category === 'MOTORCYCLE' ? '🏍️' : d.vehicle?.category === 'RICKSHAW' ? '🛺' : '🚗';
          const iconColor = d.isOnline ? '#00a859' : '#94a3b8';
          const customIcon = L.divIcon({
            className: 'admin-radar-pin',
            html: `<div style="background-color: white; border: 3px solid ${iconColor}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">${iconChar}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          });

          const marker = L.marker([d.currentLat, d.currentLng], { icon: customIcon }).addTo(map);
          marker.bindPopup(`<b>${d.fullName}</b><br>${d.vehicle?.make || 'Vehicle'} (${d.vehicle?.category || 'CAR'})<br>${d.isOnline ? '🟢 Online' : '⚪ Offline'}`);
          driverMarkersMapRef.current[d.userId] = marker;
        }
      });
    }
  }, [activeTab, drivers, radarCity]);

  // Driver Document Approval Action
  const handleApproveDriver = async (userId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/drivers/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Driver approval error:', err);
    }
  };

  // Toggle Zone Active Status
  const handleToggleZone = async (zoneId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/zones/${zoneId}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        }
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Zone toggle error:', err);
    }
  };

  // Create New City/Zone
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          cityName: newCityName,
          zoneName: newZoneName,
          centerLat: parseFloat(newCenterLat),
          centerLng: parseFloat(newCenterLng),
          radiusKm: parseFloat(newRadiusKm),
          baseFareCarPaisa: Math.round(parseFloat(newBaseFareCar) * 100),
          perKmCarPaisa: Math.round(parseFloat(newPerKmCar) * 100)
        })
      });
      if (res.ok) {
        setShowAddZoneModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Create zone error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. Dashboard Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-pakgreen-600" />
            <span>{t.adminDashboard}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Multi-City Control Hub • Karachi Pilot & Islamabad Readiness • Platform Rate: {settings.introductoryCommissionPercent}%
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAdminData}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Drivers</div>
          <div className="text-2xl font-bold text-charcoal-900 mt-1">{drivers.length}</div>
          <div className="text-[11px] text-green-600 mt-1 font-semibold">
            {drivers.filter((d) => d.verificationStatus === 'APPROVED').length} Approved
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Rides</div>
          <div className="text-2xl font-bold text-charcoal-900 mt-1">{rides.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {rides.filter((r) => r.status === 'COMPLETED').length} Completed
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Gross GMV (PKR)</div>
          <div className="text-2xl font-bold text-pakgreen-600 mt-1">
            PKR {ledger.reduce((acc, l) => acc + Math.round(l.grossAmountPaisa / 100), 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cash-first Pilot</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Active Zones</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">
            {zones.filter((z) => z.isActive).length} / {zones.length}
          </div>
          <div className="text-[11px] text-purple-600 mt-1 font-semibold">Controlled Rollout</div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'radar'
              ? 'bg-charcoal-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-4 h-4 text-pakgreen-400 animate-pulse" />
          <span>{t.radarTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'zones'
              ? 'bg-charcoal-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Cities & Zones</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'drivers'
              ? 'bg-charcoal-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.driverVerification}</span>
        </button>

        <button
          onClick={() => setActiveTab('rides')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'rides'
              ? 'bg-charcoal-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>{t.activeDispatches}</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'ledger'
              ? 'bg-charcoal-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{t.financialLedger}</span>
        </button>
      </div>

      {/* 4. Tab 0: City Radar Live Map View */}
      {activeTab === 'radar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="font-bold text-sm text-charcoal-900 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pakgreen-500 animate-ping"></span>
              <span>{t.radarTitle}</span>
            </h3>

            {/* City Radar Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
              {(['Karachi', 'Islamabad', 'Rawalpindi', 'Lahore'] as const).map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setRadarCity(city)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    radarCity === city ? 'bg-white text-pakgreen-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-[480px] rounded-xl overflow-hidden border border-slate-200 relative">
            <div ref={radarMapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-md border border-slate-200 text-[11px] space-y-1">
              <div className="font-bold text-slate-800">Fleet Indicators:</div>
              <div className="flex items-center space-x-2">
                <span>🚗 Car</span>
                <span>🏍️ Bike</span>
                <span>🛺 Rickshaw</span>
              </div>
              <div className="text-[10px] text-slate-500">🟢 Online • ⚪ Offline</div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab: Cities & Zones Management */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-charcoal-900">Operational Cities & Pilot Zones</h3>
              <p className="text-xs text-slate-500">
                Blueprint Rule: Activate one compact, operationally manageable zone at a time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddZoneModal(true)}
              className="flex items-center space-x-1 px-3.5 py-2 bg-pakgreen-500 hover:bg-pakgreen-600 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Zone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`p-4 rounded-xl border-2 transition ${
                  zone.isActive ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-charcoal-900">{zone.cityName}</span>
                      <span className="text-xs text-slate-500">• {zone.zoneName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Center: ({zone.centerLat}, {zone.centerLng}) • Radius: {zone.radiusKm} km
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleZone(zone.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center space-x-1 ${
                      zone.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{zone.isActive ? 'Active' : 'Inactive'}</span>
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Car Base / Km</span>
                    <span className="font-bold text-slate-700">
                      PKR {Math.round(zone.baseFareCarPaisa / 100)} / {Math.round(zone.perKmCarPaisa / 100)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Bike Base / Km</span>
                    <span className="font-bold text-slate-700">
                      PKR {Math.round(zone.baseFareMotoPaisa / 100)} / {Math.round(zone.perKmMotoPaisa / 100)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Rickshaw Base / Km</span>
                    <span className="font-bold text-slate-700">
                      PKR {Math.round(zone.baseFareRickshawPaisa / 100)} / {Math.round(zone.perKmRickshawPaisa / 100)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Tab 1: Driver Verification Queue */}
      {activeTab === 'drivers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-sm text-charcoal-900">
            Registered Drivers & Document Verification
          </div>

          <div className="divide-y divide-slate-200">
            {drivers.map((driver) => (
              <div key={driver.userId} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-charcoal-900">{driver.fullName}</span>
                    <span className="text-xs text-slate-500">({driver.phone})</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        driver.verificationStatus === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : driver.verificationStatus === 'UNDER_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {driver.verificationStatus}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mt-1">
                    Vehicle: {driver.vehicle?.color} {driver.vehicle?.make} {driver.vehicle?.model} ({driver.vehicle?.plateNumber}) • {driver.vehicle?.category}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    CNIC: {driver.cnicNumber || '42201-XXXXXXX-X'} • DL: {driver.licenseNumber || 'Verified'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {driver.verificationStatus !== 'APPROVED' ? (
                    <button
                      type="button"
                      onClick={() => handleApproveDriver(driver.userId, 'APPROVED')}
                      className="px-3.5 py-1.5 bg-pakgreen-500 hover:bg-pakgreen-600 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t.approveDriver}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApproveDriver(driver.userId, 'REJECTED')}
                      className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Suspend / Reject</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Tab 2: Dispatches & Ride Monitor */}
      {activeTab === 'rides' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-sm text-charcoal-900">
            Real-Time Ride Requests & Status
          </div>

          <div className="divide-y divide-slate-200">
            {rides.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No rides created yet.</div>
            ) : (
              rides.map((ride) => (
                <div key={ride.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-slate-50/50 transition">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-charcoal-900">{ride.id}</span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                        {ride.category}
                      </span>
                      <span className="text-xs font-bold text-pakgreen-600">
                        PKR {Math.round((ride.agreedFarePaisa || ride.proposedFarePaisa) / 100)}
                      </span>
                      {ride.verificationOtp && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                          PIN: {ride.verificationOtp}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Passenger: {ride.passengerName} • 🟢 {ride.pickup.address} $\rightarrow$ 🔴 {ride.destination.address}
                    </div>
                    {ride.pickupNotes && (
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        📌 Gate Note: {ride.pickupNotes}
                      </div>
                    )}
                    {ride.driverName && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Driver Assigned: {ride.driverName} ({ride.vehicleDetails})
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full">
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 8. Tab 3: Financial Cash Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-sm text-charcoal-900 flex justify-between items-center">
            <span>Cash Reconciliation Ledger (Integer Paisa System)</span>
            <span className="text-xs font-semibold text-pakgreen-700 bg-pakgreen-100 px-2.5 py-0.5 rounded-full">
              Introductory 0% Commission
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Ledger ID</th>
                  <th className="p-3">Ride ID</th>
                  <th className="p-3">Gross (PKR)</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3">Driver Net (PKR)</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No payments settled yet. Complete a ride to see ledger transactions.
                    </td>
                  </tr>
                ) : (
                  ledger.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">{l.id}</td>
                      <td className="p-3 text-slate-500">{l.rideId}</td>
                      <td className="p-3 font-bold text-charcoal-900">
                        PKR {Math.round(l.grossAmountPaisa / 100)}
                      </td>
                      <td className="p-3 text-pakgreen-600 font-semibold">
                        PKR {Math.round(l.platformCommissionPaisa / 100)} (0%)
                      </td>
                      <td className="p-3 font-bold text-pakgreen-700">
                        PKR {Math.round(l.driverNetPaisa / 100)}
                      </td>
                      <td className="p-3 uppercase font-semibold text-slate-600">{l.method}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-bold">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-charcoal-900 flex items-center space-x-2">
              <Compass className="w-5 h-5 text-pakgreen-600" />
              <span>Add Operational City / Zone</span>
            </h3>

            <form onSubmit={handleCreateZone} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">City Name</label>
                <input
                  type="text"
                  required
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Islamabad, Rawalpindi, Lahore"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Blue Area & F Sectors"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Center Lat</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newCenterLat}
                    onChange={(e) => setNewCenterLat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Center Lng</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newCenterLng}
                    onChange={(e) => setNewCenterLng(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Radius (Km)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newRadiusKm}
                    onChange={(e) => setNewRadiusKm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Car (PKR)</label>
                  <input
                    type="number"
                    required
                    value={newBaseFareCar}
                    onChange={(e) => setNewBaseFareCar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Per Km (PKR)</label>
                  <input
                    type="number"
                    required
                    value={newPerKmCar}
                    onChange={(e) => setNewPerKmCar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl transition"
                >
                  Create & Activate Zone
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddZoneModal(false)}
                  className="border border-slate-300 text-slate-600 px-4 py-2.5 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
