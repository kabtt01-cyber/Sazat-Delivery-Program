export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'rider' | 'captain' | 'admin';
  rating: number;
  balance: number;
  isOnline?: boolean;
  carDetails?: {
    model: string;
    plate: string;
    color: string;
  };
  createdAt: string;
}

export type RideStatus = 'pending' | 'accepted' | 'arriving' | 'ongoing' | 'completed' | 'cancelled';

export type VehicleType = 'economy' | 'premium' | 'scooter';

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
  price: number;
  status: RideStatus;
  vehicleType: VehicleType;
  durationMinutes: number;
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
