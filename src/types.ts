export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'rider' | 'captain' | 'admin';
  rating: number;
  balance: number;
  isOnline?: boolean;
  isActive?: boolean; // Controls whether user is active or suspended
  latitude?: number;
  longitude?: number;
  carDetails?: {
    model: string;
    plate: string;
    color: string;
  };
  createdAt: string;
}

export type RideStatus = 'pending' | 'accepted' | 'arriving' | 'ongoing' | 'completed' | 'cancelled';

export type VehicleType = 'economy' | 'premium' | 'scooter';

export type PaymentMethod = 'cash' | 'wallet' | 'card' | 'vodafone_cash' | 'fawry';

export interface Zone {
  id: string;
  name: string;
  basePrice: number;
  minFare: number;
  landmarks: string[];
}

export interface Ride {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  captainId?: string;
  captainName?: string;
  captainPhone?: string;
  captainRating?: number;
  captainCar?: string;
  captainCarPlate?: string;
  startLocation: string;
  endLocation: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  captainLat?: number;
  captainLng?: number;
  price: number;
  status: RideStatus;
  vehicleType: VehicleType;
  durationMinutes: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  commissionAmount?: number;
  captainEarnings?: number;
  createdAt: string;
}

export interface PricingSettings {
  economyBase: number;
  economyPerKm: number;
  premiumBase: number;
  premiumPerKm: number;
  scooterBase: number;
  scooterPerKm: number;
}

export type TransactionType = 'deposit' | 'payment_debit' | 'payment_credit' | 'commission_debit' | 'commission_credit' | 'payout';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  rideId?: string;
  createdAt: string;
}
