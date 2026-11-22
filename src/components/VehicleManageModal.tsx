import React, { useState } from 'react';
import { X, Car, Bike, Navigation, CheckCircle2 } from 'lucide-react';
import { VehicleCategory, Vehicle } from '../shared/types';

interface VehicleManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVehicle?: Vehicle;
  onSuccess: (updatedVehicle: Vehicle) => void;
  apiBaseUrl: string;
  driverId: string;
}

export const VehicleManageModal: React.FC<VehicleManageModalProps> = ({
  isOpen,
  onClose,
  currentVehicle,
  onSuccess,
  apiBaseUrl,
  driverId
}) => {
  const [category, setCategory] = useState<VehicleCategory>(currentVehicle?.category || 'CAR');
  const [make, setMake] = useState(currentVehicle?.make || 'Toyota');
  const [model, setModel] = useState(currentVehicle?.model || 'Corolla');
  const [plateNumber, setPlateNumber] = useState(currentVehicle?.plateNumber || 'KHI-8291');
  const [color, setColor] = useState(currentVehicle?.color || 'White');
  const [year, setYear] = useState(currentVehicle?.year || 2021);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('pakride_token') || `mock-token-${driverId}`;
      const res = await fetch(`${apiBaseUrl}/api/driver/vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          make,
          model,
          year,
          plateNumber,
          color
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update vehicle');
      onSuccess(data.vehicle);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-charcoal-900 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-charcoal-900 mb-1">Manage Your Vehicle</h3>
        <p className="text-xs text-slate-500 mb-4">
          Update your active vehicle category and registration details for rides.
        </p>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Category Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Category</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('CAR')}
                className={`py-2 rounded-xl border font-bold flex flex-col items-center space-y-1 transition ${
                  category === 'CAR'
                    ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Car</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('MOTORCYCLE')}
                className={`py-2 rounded-xl border font-bold flex flex-col items-center space-y-1 transition ${
                  category === 'MOTORCYCLE'
                    ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Bike</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('RICKSHAW')}
                className={`py-2 rounded-xl border font-bold flex flex-col items-center space-y-1 transition ${
                  category === 'RICKSHAW'
                    ? 'border-pakgreen-500 bg-pakgreen-50 text-pakgreen-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>Rickshaw</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Make</label>
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Model</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Plate Number</label>
              <input
                type="text"
                required
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Color</label>
              <input
                type="text"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pakgreen-500 hover:bg-pakgreen-600 text-white font-bold py-2.5 rounded-xl shadow-md transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Saving Vehicle...' : 'Save & Update Vehicle'}
          </button>
        </form>
      </div>
    </div>
  );
};
