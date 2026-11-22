import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Car,
  Bike,
  Navigation,
  Shield,
  User,
  Globe,
  Bell,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { PassengerView } from './components/PassengerView';
import { DriverView } from './components/DriverView';
import { AdminView } from './components/AdminView';
import { AuthModal } from './components/AuthModal';
import { translations, Language } from './i18n/translations';
import { DriverProfile, UserRole } from './shared/types';

// Environment-aware API URL (Vercel Cloud or Localhost)
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

// Pre-seeded Personas for testing & instant demonstration
const DEMO_PERSONAS = [
  {
    id: 'user-passenger-1',
    fullName: 'Ali Khan',
    phone: '03001234567',
    role: 'PASSENGER' as UserRole,
    label: 'Passenger (Ali)'
  },
  {
    id: 'user-driver-car-1',
    fullName: 'Tariq Mehmood',
    phone: '03007654321',
    role: 'DRIVER' as UserRole,
    label: 'Driver: Car (Tariq)'
  },
  {
    id: 'user-driver-moto-1',
    fullName: 'Kamran Iqbal',
    phone: '03112233445',
    role: 'DRIVER' as UserRole,
    label: 'Driver: Bike (Kamran)'
  },
  {
    id: 'user-driver-rick-1',
    fullName: 'Zubair Ahmed',
    phone: '03229988776',
    role: 'DRIVER' as UserRole,
    label: 'Driver: Rickshaw (Zubair)'
  },
  {
    id: 'user-driver-pending-1',
    fullName: 'Usman Farooq',
    phone: '03335555555',
    role: 'DRIVER' as UserRole,
    label: 'Driver: Unapproved (Usman)'
  },
  {
    id: 'user-admin-1',
    fullName: 'Ahmad Hassan',
    phone: '03009999999',
    role: 'ADMIN' as UserRole,
    label: 'Admin Console (Ahmad)'
  }
];

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [activePersona, setActivePersona] = useState(DEMO_PERSONAS[0]);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCustomAuth, setIsCustomAuth] = useState(false);

  const t = translations[lang];

  const getAuthToken = () => {
    return localStorage.getItem('pakride_token') || `mock-token-${activePersona.id}`;
  };

  // Initialize Socket.io connection
  useEffect(() => {
    const s = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('[APP] Connected to PakRide real-time engine:', s.id);
    });

    s.on('new_offer_received', (data: any) => {
      showToast(`⚡ New Offer: ${data.offer.driverName} offered PKR ${Math.round(data.offer.counterFarePaisa / 100)}`);
    });

    s.on('offer_accepted_notify', (data: any) => {
      showToast(`🎉 Passenger ${data.ride.passengerName} accepted your offer for PKR ${Math.round(data.ride.agreedFarePaisa / 100)}!`);
    });

    s.on('ride_status_changed', (data: any) => {
      showToast(`Status Updated: Trip is now ${data.ride.status}`);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Fetch driver profile if active persona is a driver
  useEffect(() => {
    if (activePersona.role === 'DRIVER') {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.driverProfile) {
            setDriverProfile(data.driverProfile);
          }
        })
        .catch((err) => console.error('Error fetching driver profile:', err));
    } else {
      setDriverProfile(null);
    }
  }, [activePersona.id, activePersona.role]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'ur' : 'en'));
  };

  const handleAuthSuccess = (data: { user: any; token: string; driverProfile?: any }) => {
    setIsCustomAuth(true);
    setActivePersona({
      id: data.user.id,
      fullName: data.user.fullName,
      phone: data.user.phone,
      role: data.user.role,
      label: `${data.user.role} (${data.user.fullName})`
    });
    if (data.driverProfile) {
      setDriverProfile(data.driverProfile);
    }
    showToast(`Welcome, ${data.user.fullName}! Logged in as ${data.user.role}.`);
  };

  const handleLogout = () => {
    localStorage.removeItem('pakride_token');
    setIsCustomAuth(false);
    setActivePersona(DEMO_PERSONAS[0]);
    setDriverProfile(null);
    showToast('Logged out successfully.');
  };

  // Switch between 3 Core Applications
  const switchAppMode = (targetRole: 'PASSENGER' | 'DRIVER' | 'ADMIN') => {
    if (targetRole === 'PASSENGER') {
      setActivePersona(DEMO_PERSONAS[0]);
    } else if (targetRole === 'DRIVER') {
      setActivePersona(DEMO_PERSONAS[1]); // Default to Car Driver Tariq
    } else if (targetRole === 'ADMIN') {
      setActivePersona(DEMO_PERSONAS[5]); // Admin Ahmad
    }
  };

  return (
    <div
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-100 flex flex-col ${
        lang === 'ur' ? 'font-urdu' : 'font-sans'
      }`}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-charcoal-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 border border-pakgreen-500 animate-bounce">
          <Bell className="w-4 h-4 text-pakgreen-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="bg-charcoal-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-pakgreen-500 flex items-center justify-center font-extrabold text-white text-base shadow-sm">
              PR
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight flex items-center space-x-2">
                <span>{t.brand}</span>
                <span className="text-[10px] bg-pakgreen-500/30 text-pakgreen-300 px-2 py-0.5 rounded font-mono font-bold">
                  PILOT v1.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 hidden sm:block">{t.tagline}</div>
            </div>
          </div>

          {/* 3 App Switching Segmented Tabs */}
          <div className="flex items-center bg-charcoal-800 p-1 rounded-xl border border-charcoal-700">
            <button
              type="button"
              onClick={() => switchAppMode('PASSENGER')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activePersona.role === 'PASSENGER'
                  ? 'bg-pakgreen-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{lang === 'ur' ? 'مسافر ایپ' : 'Passenger App'}</span>
            </button>

            <button
              type="button"
              onClick={() => switchAppMode('DRIVER')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activePersona.role === 'DRIVER'
                  ? 'bg-pakgreen-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{lang === 'ur' ? 'ڈرائیور ایپ' : 'Driver App'}</span>
            </button>

            <button
              type="button"
              onClick={() => switchAppMode('ADMIN')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activePersona.role === 'ADMIN'
                  ? 'bg-pakgreen-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{lang === 'ur' ? 'ایڈمن کنٹرول' : 'Admin Console'}</span>
            </button>
          </div>

          {/* User Status / Persona Switcher / Auth Buttons */}
          <div className="flex items-center space-x-2">
            {!isCustomAuth ? (
              <>
                <select
                  value={activePersona.id}
                  onChange={(e) => {
                    const found = DEMO_PERSONAS.find((p) => p.id === e.target.value);
                    if (found) setActivePersona(found);
                  }}
                  className="bg-charcoal-800 text-xs text-white border border-charcoal-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-pakgreen-500 outline-none font-medium hidden sm:block"
                >
                  {DEMO_PERSONAS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-1 bg-pakgreen-500 hover:bg-pakgreen-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t.signIn || 'Sign In / Up'}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2 bg-charcoal-800 px-3 py-1 rounded-xl border border-charcoal-700">
                <div className="text-left text-xs">
                  <div className="font-bold text-white truncate max-w-[120px]">{activePersona.fullName}</div>
                  <div className="text-[10px] text-pakgreen-400 font-semibold">{activePersona.role}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-charcoal-700 text-red-400 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center space-x-1 bg-charcoal-800 hover:bg-charcoal-700 text-pakgreen-400 border border-charcoal-700 px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.langToggle}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activePersona.role === 'PASSENGER' && (
          <PassengerView
            socket={socket}
            currentUser={activePersona}
            lang={lang}
            t={t}
            apiBaseUrl={API_BASE_URL}
          />
        )}

        {activePersona.role === 'DRIVER' && (
          <DriverView
            socket={socket}
            currentUser={activePersona}
            driverProfile={
              driverProfile || {
                id: 'prof-fallback',
                userId: activePersona.id,
                verificationStatus: activePersona.id.includes('pending') ? 'UNDER_REVIEW' : 'APPROVED',
                isOnline: false,
                activeCityId: 'city-karachi',
                activeZoneId: 'zone-karachi-jauhar',
                ratingAverage: 4.9,
                ratingCount: 15,
                vehicle: {
                  id: 'v-fallback',
                  driverId: activePersona.id,
                  category: activePersona.id.includes('moto') ? 'MOTORCYCLE' : activePersona.id.includes('rick') ? 'RICKSHAW' : 'CAR',
                  make: 'Toyota',
                  model: 'Corolla',
                  year: 2021,
                  plateNumber: 'KHI-8291',
                  color: 'White'
                }
              }
            }
            lang={lang}
            t={t}
            apiBaseUrl={API_BASE_URL}
          />
        )}

        {activePersona.role === 'ADMIN' && (
          <AdminView
            currentUser={activePersona}
            lang={lang}
            t={t}
            apiBaseUrl={API_BASE_URL}
          />
        )}
      </main>

      {/* Auth Modal (Login / Register / Forgot Password) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        apiBaseUrl={API_BASE_URL}
        lang={lang}
        t={t}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        PakRide • Pilot Launch Edition • Karachi (Gulistan-e-Jauhar Pilot Zone) & Islamabad Multi-City Rollout • Cash-First Model
      </footer>
    </div>
  );
};
