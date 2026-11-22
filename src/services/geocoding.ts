import { LocationCoordinates } from '../shared/types';

const RECENT_LOCATIONS_KEY = 'pakride_recent_locations';

// Common Pakistani phonetic spelling corrections & city slang dictionary
const PAK_PHONETIC_REPLACEMENTS: [RegExp, string][] = [
  [/\b(centuras|centrus|centoras|centaurs|centarus)\b/gi, 'Centaurus'],
  [/\b(jauhr|johar|jouhar|jawhar)\b/gi, 'Jauhar'],
  [/\b(masjd|msjid|masjeed|msjd)\b/gi, 'Mosque'],
  [/\b(sadar|sader|sadder)\b/gi, 'Saddar'],
  [/\b(cliftn|cliften|clifttn)\b/gi, 'Clifton'],
  [/\b(shrah|shahra|shah-e)\b/gi, 'Shahrah'],
  [/\b(gulshn|glshan)\b/gi, 'Gulshan'],
  [/\b(chowrngi|chowrongi|chourangi|churangi)\b/gi, 'Chowrangi'],
  [/\b(isb|isl)\b/gi, 'Islamabad'],
  [/\b(pindi|rwp)\b/gi, 'Rawalpindi'],
  [/\b(khi|khi city)\b/gi, 'Karachi'],
  [/\b(lhr)\b/gi, 'Lahore'],
  [/\b(blu area|blue ara|blu are)\b/gi, 'Blue Area'],
  [/\b(iiap|isb airport)\b/gi, 'Islamabad International Airport'],
  [/\b(f10|f 10)\b/gi, 'F-10'],
  [/\b(f11|f 11)\b/gi, 'F-11'],
  [/\b(f8|f 8)\b/gi, 'F-8'],
  [/\b(f7|f 7|jinnah super)\b/gi, 'F-7'],
  [/\b(f6|f 6|super market)\b/gi, 'F-6'],
  [/\b(g9|g 9|karachi company)\b/gi, 'G-9'],
  [/\b(i8|i 8)\b/gi, 'I-8']
];

// City coordinate centroids for location-biasing queries
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Lahore: { lat: 31.5204, lng: 74.3587 }
};

export interface SearchResult {
  locations: LocationCoordinates[];
  didYouMean?: string;
  source: 'photon' | 'nominatim' | 'history';
}

export class GeocodingService {
  /**
   * Calculate Levenshtein Distance for typo matching
   */
  public static levenshtein(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
    for (let j = 0; j <= an; j++) matrix[0][j] = j;

    for (let i = 1; i <= bn; i++) {
      for (let j = 1; j <= an; j++) {
        if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[bn][an];
  }

  /**
   * Apply Pakistani phonetic correction
   */
  public static correctQuery(query: string): { corrected: string; wasCorrected: boolean } {
    let corrected = query;
    for (const [pattern, replacement] of PAK_PHONETIC_REPLACEMENTS) {
      corrected = corrected.replace(pattern, replacement);
    }
    return {
      corrected: corrected.trim(),
      wasCorrected: corrected.trim().toLowerCase() !== query.trim().toLowerCase()
    };
  }

  /**
   * Intelligent Search with Fuzzy Matching, Typo Tolerance, and Dynamic Location Biasing
   */
  public static async searchAddressWithFuzzy(
    query: string,
    userLocation?: { lat: number; lng: number }
  ): Promise<SearchResult> {
    if (!query || query.trim().length < 2) {
      return { locations: [], source: 'photon' };
    }

    const { corrected, wasCorrected } = this.correctQuery(query);
    const searchTarget = wasCorrected ? corrected : query.trim();

    // 1. Try Photon (Elasticsearch based, fuzzy enabled, biased to user location if available)
    try {
      const biasParams = userLocation
        ? `&lat=${userLocation.lat}&lon=${userLocation.lng}`
        : '';
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        searchTarget + ' Pakistan'
      )}${biasParams}&limit=6`;

      const res = await fetch(photonUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const locations: LocationCoordinates[] = data.features.map((f: any) => {
            const props = f.properties || {};
            const name = props.name || props.street || props.district || props.city || searchTarget;
            const context = [props.street, props.district || props.suburb, props.city, props.state]
              .filter(Boolean)
              .join(', ');
            return {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              address: name + (context ? ` (${context})` : ''),
              landmark: props.city || props.district || 'Pakistan'
            };
          });

          return {
            locations,
            didYouMean: wasCorrected ? corrected : undefined,
            source: 'photon'
          };
        }
      }
    } catch (e) {
      // Fall through to Nominatim
    }

    // 2. Fallback to OpenStreetMap Nominatim with Pakistan filter
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchTarget + ', Pakistan'
      )}&countrycodes=pk&limit=6`;

      const res = await fetch(nomUrl, {
        headers: { 'Accept-Language': 'en,ur' }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const locations: LocationCoordinates[] = data.map((item: any) => {
            const parts = item.display_name.split(',');
            const shortName = parts.slice(0, 3).join(',').trim();
            return {
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              address: shortName,
              landmark: parts[1]?.trim() || 'Pakistan'
            };
          });

          return {
            locations,
            didYouMean: wasCorrected ? corrected : undefined,
            source: 'nominatim'
          };
        }
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    }

    // 3. Fallback: Check local recent history for fuzzy match
    const recents = this.getRecentLocations();
    const matchedRecent = recents.filter((r) =>
      r.address.toLowerCase().includes(query.toLowerCase()) ||
      (r.landmark && r.landmark.toLowerCase().includes(query.toLowerCase()))
    );

    return {
      locations: matchedRecent,
      didYouMean: wasCorrected ? corrected : undefined,
      source: 'history'
    };
  }

  /**
   * Reverse Geocode: Get human-readable street address from Map Pin (Lat, Lng)
   */
  public static async reverseGeocode(lat: number, lng: number): Promise<LocationCoordinates> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en,ur' }
      });

      if (res.ok) {
        const data = await res.json();
        const parts = (data.display_name || '').split(',');
        const cleanAddress = parts.slice(0, 3).join(',').trim() || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        const landmark = parts[1]?.trim() || 'Map Location';

        return {
          lat,
          lng,
          address: cleanAddress,
          landmark
        };
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }

    return {
      lat,
      lng,
      address: `Selected Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      landmark: 'Map Pin'
    };
  }

  /**
   * Retrieve Initial Popular Hubs when user has no recent history
   */
  public static getPopularHubs(cityName: string): LocationCoordinates[] {
    if (cityName === 'Islamabad' || cityName === 'Rawalpindi') {
      return [
        { lat: 33.7077, lng: 73.0501, address: 'The Centaurus Mall, Jinnah Ave', landmark: 'F-8' },
        { lat: 33.7296, lng: 73.0372, address: 'Faisal Mosque Main Gate', landmark: 'Margalla Foothills' },
        { lat: 33.7145, lng: 73.0673, address: 'Blue Area (Saudi Pak Tower)', landmark: 'Blue Area' },
        { lat: 33.6925, lng: 73.0118, address: 'F-10 Markaz', landmark: 'F-10' },
        { lat: 33.6894, lng: 73.0305, address: 'G-9 Karachi Company', landmark: 'G-9' },
        { lat: 33.6685, lng: 73.0760, address: 'I-8 Markaz', landmark: 'I-8' }
      ];
    }
    if (cityName === 'Lahore') {
      return [
        { lat: 31.5126, lng: 74.3436, address: 'Liberty Market, Gulberg III', landmark: 'Gulberg' },
        { lat: 31.5085, lng: 74.3541, address: 'MM Alam Road, Gulberg', landmark: 'MM Alam' },
        { lat: 31.4707, lng: 74.4108, address: 'DHA Phase 5 Commercial', landmark: 'DHA' },
        { lat: 31.5204, lng: 74.3587, address: 'Mall of Lahore, Cantt', landmark: 'Cantt' },
        { lat: 31.5882, lng: 74.3105, address: 'Badshahi Mosque, Old City', landmark: 'Walled City' }
      ];
    }
    // Default Karachi
    return [
      { lat: 24.9213, lng: 67.1355, address: 'Jauhar Chowrangi', landmark: 'Gulistan-e-Jauhar' },
      { lat: 24.8988, lng: 67.1121, address: 'Millennium Mall, Rashid Minhas Rd', landmark: 'Gulshan/Jauhar' },
      { lat: 24.9065, lng: 67.1608, address: 'Jinnah International Airport (JAP)', landmark: 'Karachi Airport' },
      { lat: 24.8293, lng: 67.0336, address: 'Clifton (Teen Talwar)', landmark: 'Clifton' },
      { lat: 24.9395, lng: 67.1172, address: 'Karachi University (Silver Jubilee)', landmark: 'University Rd' }
    ];
  }

  /**
   * Retrieve intelligent location-biased popular hubs
   */
  public static getPopularHubsForLocation(loc?: { lat: number; lng: number }): LocationCoordinates[] {
    if (!loc) {
      // General cross-city popular hubs
      return [
        { lat: 33.7077, lng: 73.0501, address: 'The Centaurus Mall, Islamabad', landmark: 'Islamabad F-8' },
        { lat: 24.9213, lng: 67.1355, address: 'Jauhar Chowrangi, Karachi', landmark: 'Karachi Jauhar' },
        { lat: 31.5126, lng: 74.3436, address: 'Liberty Market, Gulberg, Lahore', landmark: 'Lahore Gulberg' },
        { lat: 33.7145, lng: 73.0673, address: 'Blue Area, Islamabad', landmark: 'Islamabad Central' },
        { lat: 24.8293, lng: 67.0336, address: 'Clifton (Teen Talwar), Karachi', landmark: 'Karachi Clifton' }
      ];
    }

    if (loc.lat >= 33.0) {
      return this.getPopularHubs('Islamabad');
    } else if (loc.lat >= 30.5) {
      return this.getPopularHubs('Lahore');
    } else {
      return this.getPopularHubs('Karachi');
    }
  }

  /**
   * Save a visited location to recent history
   */
  public static saveRecentLocation(loc: LocationCoordinates): void {
    try {
      const recents = this.getRecentLocations();
      const filtered = recents.filter(
        (r) => Math.abs(r.lat - loc.lat) > 0.001 || Math.abs(r.lng - loc.lng) > 0.001
      );
      const updated = [loc, ...filtered].slice(0, 8);
      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent location:', e);
    }
  }

  /**
   * Retrieve user's recent visited locations
   */
  public static getRecentLocations(): LocationCoordinates[] {
    try {
      const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to read recent locations:', e);
    }
    return [];
  }
}
