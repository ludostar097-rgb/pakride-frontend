import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Clock, Sparkles, X, Check } from 'lucide-react';
import { LocationCoordinates } from '../shared/types';
import { GeocodingService } from '../services/geocoding';

interface LocationSearchInputProps {
  label: string;
  iconColor: string;
  value: LocationCoordinates;
  onChange: (loc: LocationCoordinates) => void;
  placeholder: string;
  userLocation?: { lat: number; lng: number };
  showGpsButton?: boolean;
  onLocateGps?: () => void;
  isLocating?: boolean;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  label,
  iconColor,
  value,
  onChange,
  placeholder,
  userLocation,
  showGpsButton = false,
  onLocateGps,
  isLocating = false
}) => {
  const [query, setQuery] = useState(value.address || '');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<LocationCoordinates[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | undefined>();
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<LocationCoordinates[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal query when external value changes
  useEffect(() => {
    setQuery(value.address || '');
  }, [value.address]);

  // Load recents & popular hubs on mount
  useEffect(() => {
    const saved = GeocodingService.getRecentLocations();
    if (saved.length > 0) {
      setRecents(saved);
    } else {
      setRecents(GeocodingService.getPopularHubsForLocation(userLocation));
    }
  }, [userLocation]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search with fuzzy matching
  useEffect(() => {
    if (!isOpen) return;

    if (!query || query.trim().length < 2) {
      setResults([]);
      setDidYouMean(undefined);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await GeocodingService.searchAddressWithFuzzy(query, userLocation);
      setResults(res.locations);
      setDidYouMean(res.didYouMean);
      setSearching(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [query, userLocation, isOpen]);

  const handleSelectLocation = (loc: LocationCoordinates) => {
    setQuery(loc.address);
    setIsOpen(false);
    GeocodingService.saveRecentLocation(loc);
    onChange(loc);
  };

  const handleApplyDidYouMean = async (correctedQuery: string) => {
    setQuery(correctedQuery);
    setSearching(true);
    const res = await GeocodingService.searchAddressWithFuzzy(correctedQuery, userLocation);
    setResults(res.locations);
    setDidYouMean(undefined);
    setSearching(false);
    if (res.locations.length > 0) {
      handleSelectLocation(res.locations[0]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${iconColor} inline-block shadow-sm`} />
          <span>{label}</span>
        </span>
        {value.landmark && (
          <span className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
            {value.landmark}
          </span>
        )}
      </label>

      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-16 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-pakgreen-500 rounded-xl transition outline-none font-medium text-slate-800 shadow-inner"
        />

        <div className="absolute right-2 flex items-center space-x-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setDidYouMean(undefined);
              }}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {showGpsButton && onLocateGps && (
            <button
              type="button"
              onClick={onLocateGps}
              disabled={isLocating}
              className={`p-1.5 rounded-lg text-pakgreen-600 hover:bg-pakgreen-50 border border-pakgreen-200 shadow-xs transition ${
                isLocating ? 'animate-pulse text-amber-500' : ''
              }`}
              title="Use Current GPS Location"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1">
          {/* Typo Correction / Did You Mean Banner */}
          {didYouMean && (
            <div className="bg-amber-50/90 border-b border-amber-200/60 px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>
                  Did you mean:{' '}
                  <strong className="font-semibold underline cursor-pointer" onClick={() => handleApplyDidYouMean(didYouMean)}>
                    {didYouMean}
                  </strong>
                  ?
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleApplyDidYouMean(didYouMean)}
                className="text-[11px] font-bold text-pakgreen-700 bg-pakgreen-100/70 hover:bg-pakgreen-100 px-2 py-0.5 rounded-md transition"
              >
                Apply
              </button>
            </div>
          )}

          {searching && (
            <div className="px-4 py-3 text-xs text-slate-500 flex items-center space-x-2">
              <div className="w-3.5 h-3.5 border-2 border-pakgreen-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching places nearby...</span>
            </div>
          )}

          {/* Dynamic Search Results */}
          {!searching && results.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Search Results
              </div>
              {results.map((loc, idx) => (
                <button
                  key={`${loc.lat}-${loc.lng}-${idx}`}
                  type="button"
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-start space-x-2.5 transition border-b border-slate-50 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-pakgreen-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{loc.address}</div>
                    {loc.landmark && (
                      <div className="text-[10px] text-slate-400 truncate">{loc.landmark}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {!searching && query.trim().length >= 2 && results.length === 0 && !didYouMean && (
            <div className="px-4 py-4 text-center text-xs text-slate-500">
              No places found for "{query}". Try picking on the map or searching a nearby landmark.
            </div>
          )}

          {/* Recent & Frequent Places */}
          {(!query || query.trim().length < 2) && recents.length > 0 && (
            <div className="py-1">
              <div className="px-3.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Recent & Suggested Places</span>
              </div>
              {recents.map((loc, idx) => (
                <button
                  key={`recent-${loc.lat}-${loc.lng}-${idx}`}
                  type="button"
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-start space-x-2.5 transition border-b border-slate-50 last:border-0"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">{loc.address}</div>
                    {loc.landmark && (
                      <div className="text-[10px] text-slate-400 truncate">{loc.landmark}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
