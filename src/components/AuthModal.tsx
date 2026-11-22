import React, { useState } from 'react';
import { X, Lock, Phone, User, Car, Bike, Navigation, KeyRound, CheckCircle2 } from 'lucide-react';
import { VehicleCategory } from '../shared/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  apiBaseUrl: string;
  lang?: string;
  t?: any;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  apiBaseUrl
}) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

  // Driver vehicle details
  const [category, setCategory] = useState<VehicleCategory>('CAR');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Corolla');
  const [plateNumber, setPlateNumber] = useState('KHI-5555');
  const [color, setColor] = useState('White');

  // Forgot password states
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      if (data.token) {
        localStorage.setItem('pakride_token', data.token);
      }
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        phone,
        password,
        fullName,
        role
      };
      if (role === 'DRIVER') {
        payload.vehicleDetails = {
          category,
          make,
          model,
          plateNumber,
          color,
          year: 2022
        };
      }

      const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      if (data.token) {
        localStorage.setItem('pakride_token', data.token);
      }
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request reset OTP');
      setDemoOtpHint(data.demoOtp || '7788');
      setSuccessMsg(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: resetOtp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccessMsg('Password reset! Please sign in with your new password.');
      setTab('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-charcoal-900 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 mb-5">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`pb-2.5 px-4 font-bold text-sm transition ${
              tab === 'login'
                ? 'border-b-2 border-pakgreen-500 text-pakgreen-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(null); }}
            className={`pb-2.5 px-4 font-bold text-sm transition ${
              tab === 'signup'
                ? 'border-b-2 border-pakgreen-500 text-pakgreen-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setTab('forgot'); setError(null); }}
            className={`pb-2.5 px-4 font-bold text-sm transition ${
              tab === 'forgot'
                ? 'border-b-2 border-pakgreen-500 text-pakgreen-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Forgot Password
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* 1. SIGN IN TAB */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  required
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-pakgreen-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-pakgreen-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-3 rounded-xl shadow-md transition text-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to PakRide'}
            </button>
          </form>
        )}

        {/* 2. SIGN UP TAB (Passenger or Driver with Vehicle) */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Muhammad Ali"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pakgreen-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  required
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pakgreen-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pakgreen-500 outline-none"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Register As</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('PASSENGER')}
                  className={`py-2 rounded-xl border text-xs font-bold transition ${
                    role === 'PASSENGER'
                      ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setRole('DRIVER')}
                  className={`py-2 rounded-xl border text-xs font-bold transition ${
                    role === 'DRIVER'
                      ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Driver / Captain
                </button>
              </div>
            </div>

            {/* Driver Vehicle Details */}
            {role === 'DRIVER' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-charcoal-900 block">Add Vehicle Details</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategory('CAR')}
                    className={`py-1.5 rounded-lg border text-[11px] font-bold ${
                      category === 'CAR' ? 'border-pakgreen-500 bg-white text-pakgreen-700' : 'border-slate-200'
                    }`}
                  >
                    🚗 Car
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('MOTORCYCLE')}
                    className={`py-1.5 rounded-lg border text-[11px] font-bold ${
                      category === 'MOTORCYCLE' ? 'border-pakgreen-500 bg-white text-pakgreen-700' : 'border-slate-200'
                    }`}
                  >
                    🏍️ Bike
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('RICKSHAW')}
                    className={`py-1.5 rounded-lg border text-[11px] font-bold ${
                      category === 'RICKSHAW' ? 'border-pakgreen-500 bg-white text-pakgreen-700' : 'border-slate-200'
                    }`}
                  >
                    🛺 Rickshaw
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Make (e.g. Honda, Suzuki)"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="p-2 border rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Model (e.g. CD70, Alto)"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="p-2 border rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Plate # (e.g. KHI-1234)"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="p-2 border rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Color (e.g. White, Red)"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl shadow-md transition text-sm disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD TAB */}
        {tab === 'forgot' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Registered Phone</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendForgotOtp}
                  className="px-3 py-2 bg-charcoal-900 text-white font-bold text-xs rounded-xl"
                >
                  Send OTP
                </button>
              </div>
              {demoOtpHint && (
                <div className="text-[11px] text-pakgreen-600 font-semibold mt-1">
                  Simulation Note: Use Demo Code: <strong>{demoOtpHint}</strong>
                </div>
              )}
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enter 4-Digit OTP</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="7788"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  className="w-full text-center font-mono tracking-widest text-lg font-bold py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl text-sm"
              >
                Reset Password & Log In
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
