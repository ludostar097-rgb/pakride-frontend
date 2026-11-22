// ==========================================
// PakRide Shared Core Types & Enums
// ==========================================

export type UserRole = 'PASSENGER' | 'DRIVER' | 'CITY_MANAGER' | 'ADMIN';

export type VehicleCategory = 'CAR' | 'MOTORCYCLE' | 'RICKSHAW';

export type RideStatus =
  | 'REQUESTED'
  | 'OFFERS_OPEN'
  | 'DRIVER_SELECTED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type OfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type DriverVerificationStatus =
  | 'PENDING_DOCUMENTS'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type PaymentMethod = 'CASH' | 'JAZZCASH' | 'EASYPAISA';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address: string;
  landmark?: string;
  zoneId?: string;
}

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  languagePreference: 'en' | 'ur';
  createdAt: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  category: VehicleCategory;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  verificationStatus: DriverVerificationStatus;
  isOnline: boolean;
  activeCityId: string;
  activeZoneId: string;
  currentLat?: number;
  currentLng?: number;
  ratingAverage: number;
  ratingCount: number;
  vehicle?: Vehicle;
  cnicNumber?: string;
  licenseNumber?: string;
}

export interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  category: VehicleCategory;
  pickup: LocationCoordinates;
  destination: LocationCoordinates;
  pickupNotes?: string;
  distanceKm: number;
  estimatedMinutes: number;
  suggestedFarePaisa: number; // in integer minor units (PKR Paisa: 100 paisa = 1 PKR)
  proposedFarePaisa: number;
  agreedFarePaisa?: number;
  verificationOtp?: string; // 4-digit security PIN to start trip
  status: RideStatus;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  vehicleDetails?: string;
  chatMessages?: ChatMessage[];
  rating?: number;
  reviewComment?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cancellationReason?: string;
  cancelledBy?: 'PASSENGER' | 'DRIVER' | 'SYSTEM' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface RideOffer {
  id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  driverVehicle: string;
  counterFarePaisa: number; // In minor units (paisa)
  etaMinutes: number;
  status: OfferStatus;
  createdAt: string;
  expiresAt: string;
}

export interface PaymentLedgerEntry {
  id: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  method: PaymentMethod;
  grossAmountPaisa: number;
  platformCommissionPaisa: number; // 0% introductory rate
  driverNetPaisa: number;
  status: PaymentStatus;
  reconciledAt?: string;
  createdAt: string;
}

export interface CityZone {
  id: string;
  cityId: string;
  cityName: string;
  zoneName: string;
  isActive: boolean;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  baseFareCarPaisa: number;
  baseFareMotoPaisa: number;
  baseFareRickshawPaisa: number;
  perKmCarPaisa: number;
  perKmMotoPaisa: number;
  perKmRickshawPaisa: number;
}
