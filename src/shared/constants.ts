// ==========================================
// PakRide Shared Constants & Pilot Spatial Data
// ==========================================

export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_USER_ROOM: 'join_user_room',
  JOIN_ZONE_FEED: 'join_zone_feed',
  LEAVE_ZONE_FEED: 'leave_zone_feed',
  DRIVER_LOCATION_UPDATE: 'driver_location_update',
  SUBMIT_RIDE_REQUEST: 'submit_ride_request',
  SUBMIT_DRIVER_OFFER: 'submit_driver_offer',
  ACCEPT_DRIVER_OFFER: 'accept_driver_offer',
  UPDATE_RIDE_STATUS: 'update_ride_status',
  CANCEL_RIDE: 'cancel_ride',

  // Server -> Client Broadcasts
  NEW_RIDE_AVAILABLE: 'new_ride_available',
  RIDE_CANCELLED_BROADCAST: 'ride_cancelled_broadcast',
  NEW_OFFER_RECEIVED: 'new_offer_received',
  OFFER_ACCEPTED_NOTIFY: 'offer_accepted_notify',
  OFFER_REJECTED_NOTIFY: 'offer_rejected_notify',
  RIDE_STATUS_CHANGED: 'ride_status_changed',
  DRIVER_POSITION_BROADCAST: 'driver_position_broadcast',
  ERROR_ALERT: 'error_alert',
} as const;

// Conversion helper for Integer Minor Units (Paisa: 1 PKR = 100 Paisa)
export const paisaToPkr = (paisa: number): number => Math.round(paisa / 100);
export const pkrToPaisa = (pkr: number): number => Math.round(pkr * 100);

// Karachi & Islamabad Pilot Zones
export const PILOT_ZONES = [
  {
    id: 'zone-karachi-jauhar',
    cityId: 'city-karachi',
    cityName: 'Karachi',
    zoneName: 'Gulistan-e-Jauhar',
    isActive: true,
    centerLat: 24.918,
    centerLng: 67.135,
    radiusKm: 6.5,
    baseFareCarPaisa: 15000, // PKR 150
    baseFareMotoPaisa: 6000,  // PKR 60
    baseFareRickshawPaisa: 9000, // PKR 90
    perKmCarPaisa: 4000,     // PKR 40 / km
    perKmMotoPaisa: 1800,    // PKR 18 / km
    perKmRickshawPaisa: 2500 // PKR 25 / km
  },
  {
    id: 'zone-islamabad-central',
    cityId: 'city-islamabad',
    cityName: 'Islamabad',
    zoneName: 'Islamabad Central & Blue Area',
    isActive: true,
    centerLat: 33.6844,
    centerLng: 73.0479,
    radiusKm: 8.0,
    baseFareCarPaisa: 18000, // PKR 180
    baseFareMotoPaisa: 7000,  // PKR 70
    baseFareRickshawPaisa: 10000, // PKR 100
    perKmCarPaisa: 4500,     // PKR 45 / km
    perKmMotoPaisa: 2000,    // PKR 20 / km
    perKmRickshawPaisa: 2800 // PKR 28 / km
  }
];

export const ISLAMABAD_LANDMARKS = [
  { name: 'Centaurus Mall, Jinnah Ave', lat: 33.7077, lng: 73.0501, zone: 'Islamabad F-8' },
  { name: 'Blue Area (Saudi Pak Tower)', lat: 33.7145, lng: 73.0673, zone: 'Blue Area' },
  { name: 'F-6 Super Market', lat: 33.7297, lng: 73.0784, zone: 'Islamabad F-6' },
  { name: 'F-10 Markaz', lat: 33.6925, lng: 73.0118, zone: 'Islamabad F-10' },
  { name: 'G-9 Karachi Company', lat: 33.6894, lng: 73.0305, zone: 'Islamabad G-9' },
  { name: 'I-8 Markaz', lat: 33.6685, lng: 73.0760, zone: 'Islamabad I-8' },
  { name: 'Faisal Mosque Main Gate', lat: 33.7296, lng: 73.0372, zone: 'Margalla Foothills' },
  { name: 'Islamabad International Airport (IIAP)', lat: 33.5605, lng: 72.8517, zone: 'Islamabad West' }
];

export const KARACHI_LANDMARKS = [
  { name: 'Jauhar Chowrangi', lat: 24.9213, lng: 67.1355, zone: 'Gulistan-e-Jauhar' },
  { name: 'Kamran Chowrangi', lat: 24.9126, lng: 67.1287, zone: 'Gulistan-e-Jauhar' },
  { name: 'Continental Bakery, Block 12', lat: 24.9248, lng: 67.1382, zone: 'Gulistan-e-Jauhar' },
  { name: 'Darul Sehat Hospital', lat: 24.9142, lng: 67.1396, zone: 'Gulistan-e-Jauhar' },
  { name: 'Millennium Mall / Rashid Minhas Rd', lat: 24.8988, lng: 67.1121, zone: 'Gulistan-e-Jauhar' },
  { name: 'Habib University, Block 18', lat: 24.9037, lng: 67.1389, zone: 'Gulistan-e-Jauhar' },
  { name: 'Jinnah International Airport (JAP)', lat: 24.9065, lng: 67.1608, zone: 'Karachi East' },
  { name: 'Karachi University (KU Silver Jubilee Gate)', lat: 24.9395, lng: 67.1172, zone: 'Gulshan/Jauhar' },
  { name: 'NED University Main Gate', lat: 24.9338, lng: 67.1125, zone: 'Gulshan/Jauhar' },
  { name: 'Safari Park Karachi', lat: 24.9221, lng: 67.1084, zone: 'Gulshan-e-Iqbal' },
];
