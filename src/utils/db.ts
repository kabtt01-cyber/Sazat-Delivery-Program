import { createClient } from '@supabase/supabase-js';
import { User as UserType, Ride, RideStatus, Transaction, PaymentMethod, Zone, VehicleType } from '../types';
import { hashPassword } from './crypto';

// Read Supabase environment variables
const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '') as string;
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '') as string;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Initialize Supabase if credentials are provided
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface DbUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'rider' | 'captain' | 'admin';
  rating: number;
  balance: number;
  isOnline?: boolean;
  isActive?: boolean;
  carDetails?: string; // stringified JSON for Supabase, or object for local
  password_hash: string;
  createdAt: string;
}

// ---------------- LOCAL DATABASE FALLBACK ----------------
const LOCAL_DB_KEY = 'sadat_ride_local_users';

function getLocalUsers(): DbUser[] {
  const data = localStorage.getItem(LOCAL_DB_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalUsers(users: DbUser[]) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(users));
}

// ---------------- PUBLIC DATABASE INTERFACE ----------------

/**
 * Initializes the database.
 * Ensures the Super Admin "Ahmed" exists with encrypted password "01278150" (SHA-256).
 */
export async function initDatabase(): Promise<void> {
  const adminName = "Ahmed";
  const adminPass = "01278150";
  const encryptedPass = await hashPassword(adminPass);

  const adminObj: DbUser = {
    id: 'admin-super',
    name: adminName,
    phone: '',
    email: 'admin@sadatride.com',
    role: 'admin',
    rating: 5.0,
    balance: 0,
    password_hash: encryptedPass,
    createdAt: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check if table or admin exists in Supabase
      const { data, error } = await supabase
        .from('sadat_users')
        .select('*')
        .eq('role', 'admin')
        .eq('name', adminName)
        .maybeSingle();

      if (error) {
        console.warn('Supabase: checking admin failed, perhaps sadat_users table does not exist yet. Please run the SQL migration in your Supabase dashboard.');
        throw error;
      }

      if (!data) {
        // Create the admin record
        const { error: insertError } = await supabase
          .from('sadat_users')
          .insert([adminObj]);
        
        if (insertError) {
          console.error('Supabase: failed to auto-create admin:', insertError);
        } else {
          console.log('Supabase: Super Admin account created successfully inside Supabase.');
        }
      } else {
        console.log('Supabase: Super Admin account already exists in Supabase.');
      }
    } catch (err) {
      console.warn('Supabase initialization failed, falling back to local database.');
      await initLocalAdmin(adminObj);
    }
  } else {
    // Falls back to local database
    await initLocalAdmin(adminObj);
  }
}

async function initLocalAdmin(adminObj: DbUser) {
  const localUsers = getLocalUsers();
  const adminExists = localUsers.some(u => u.role === 'admin' && u.name === adminObj.name);
  if (!adminExists) {
    localUsers.push(adminObj);
    saveLocalUsers(localUsers);
    console.log('Local DB: Super Admin account created successfully once.');
  } else {
    console.log('Local DB: Super Admin account already exists.');
  }
}

/**
 * Retrieves a user by their name/username, phone, or email.
 */
export async function findUserByCredentials(usernameOrPhoneOrEmail: string): Promise<{ user: UserType; passwordHash: string } | null> {
  const target = usernameOrPhoneOrEmail.trim();

  if (isSupabaseConfigured && supabase) {
    try {
      // Query Supabase
      const { data, error } = await supabase
        .from('sadat_users')
        .select('*')
        .or(`name.eq.${target},phone.eq.${target},email.eq.${target}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const dbUser = data as DbUser;
        const user: UserType = {
          id: dbUser.id,
          name: dbUser.name,
          phone: dbUser.phone,
          email: dbUser.email,
          role: dbUser.role,
          rating: Number(dbUser.rating),
          balance: Number(dbUser.balance),
          isOnline: dbUser.isOnline,
          isActive: dbUser.isActive !== false,
          createdAt: dbUser.createdAt,
          ...(dbUser.carDetails ? { carDetails: typeof dbUser.carDetails === 'string' ? JSON.parse(dbUser.carDetails) : dbUser.carDetails } : {})
        };
        return { user, passwordHash: dbUser.password_hash };
      }
    } catch (err) {
      console.warn('Supabase query failed, querying local storage fallback instead.');
    }
  }

  // Local query
  const localUsers = getLocalUsers();
  const dbUser = localUsers.find(
    u => u.name === target || u.phone === target || u.email === target
  );

  if (dbUser) {
    const user: UserType = {
      id: dbUser.id,
      name: dbUser.name,
      phone: dbUser.phone,
      email: dbUser.email,
      role: dbUser.role,
      rating: dbUser.rating,
      balance: dbUser.balance,
      isOnline: dbUser.isOnline,
      isActive: dbUser.isActive !== false,
      createdAt: dbUser.createdAt,
      ...(dbUser.carDetails ? { carDetails: typeof dbUser.carDetails === 'string' ? JSON.parse(dbUser.carDetails) : dbUser.carDetails } : {})
    };
    return { user, passwordHash: dbUser.password_hash };
  }

  return null;
}

/**
 * Registers a new user with their password hash.
 */
export async function registerNewUser(user: UserType, plainPassword = '123456'): Promise<void> {
  const passwordHash = await hashPassword(plainPassword);
  const dbUser: DbUser = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    rating: user.rating,
    balance: user.balance,
    isOnline: user.isOnline,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    password_hash: passwordHash,
    carDetails: user.carDetails ? JSON.stringify(user.carDetails) : undefined
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('sadat_users').insert([dbUser]);
      if (!error) {
        console.log('Supabase: Registered new user successfully.');
        return;
      }
      console.warn('Supabase register error:', error);
    } catch (err) {
      console.warn('Supabase register failed, using local database instead.');
    }
  }

  // Local storage save
  const localUsers = getLocalUsers();
  const exists = localUsers.some(u => u.id === dbUser.id);
  if (!exists) {
    localUsers.push(dbUser);
    saveLocalUsers(localUsers);
  }
}

/**
 * Updates an existing user's data (balance, isOnline state, etc.).
 */
export async function updateUserData(user: UserType): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('sadat_users')
        .update({
          balance: user.balance,
          isOnline: user.isOnline,
          isActive: user.isActive,
          carDetails: user.carDetails ? JSON.stringify(user.carDetails) : null
        })
        .eq('id', user.id);

      if (!error) {
        console.log('Supabase: Updated user data successfully.');
        return;
      }
      console.warn('Supabase update error:', error);
    } catch (err) {
      console.warn('Supabase update failed, using local database instead.');
    }
  }

  // Local storage update
  const localUsers = getLocalUsers();
  const updated = localUsers.map(u => {
    if (u.id === user.id) {
      return {
        ...u,
        balance: user.balance,
        isOnline: user.isOnline,
        isActive: user.isActive,
        carDetails: user.carDetails ? JSON.stringify(user.carDetails) : undefined
      };
    }
    return u;
  });
  saveLocalUsers(updated);
}

/**
 * Updates a user's password in the database.
 */
export async function updateUserPassword(userId: string, newPlainPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPlainPassword);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('sadat_users')
        .update({ password_hash: passwordHash })
        .eq('id', userId);

      if (!error) {
        console.log('Supabase: Password updated successfully.');
        return;
      }
      console.warn('Supabase password update error:', error);
    } catch (err) {
      console.warn('Supabase password update failed, updating local instead.');
    }
  }

  // Local storage update
  const localUsers = getLocalUsers();
  const updated = localUsers.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        password_hash: passwordHash
      };
    }
    return u;
  });
  saveLocalUsers(updated);
}

/**
 * Returns all registered users for administration.
 */
export async function getAllUsers(): Promise<UserType[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sadat_users')
        .select('*');

      if (!error && data) {
        return (data as DbUser[]).map(dbUser => ({
          id: dbUser.id,
          name: dbUser.name,
          phone: dbUser.phone,
          email: dbUser.email,
          role: dbUser.role,
          rating: Number(dbUser.rating),
          balance: Number(dbUser.balance),
          isOnline: dbUser.isOnline,
          isActive: dbUser.isActive !== false,
          createdAt: dbUser.createdAt,
          ...(dbUser.carDetails ? { carDetails: typeof dbUser.carDetails === 'string' ? JSON.parse(dbUser.carDetails) : dbUser.carDetails } : {})
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch failed, loading from local instead.');
    }
  }

  const localUsers = getLocalUsers();
  return localUsers.map(dbUser => ({
    id: dbUser.id,
    name: dbUser.name,
    phone: dbUser.phone,
    email: dbUser.email,
    role: dbUser.role,
    rating: dbUser.rating,
    balance: dbUser.balance,
    isOnline: dbUser.isOnline,
    isActive: dbUser.isActive !== false,
    createdAt: dbUser.createdAt,
    ...(dbUser.carDetails ? { carDetails: typeof dbUser.carDetails === 'string' ? JSON.parse(dbUser.carDetails) : dbUser.carDetails } : {})
  }));
}

// ---------------- RIDES DATABASE FALLBACK ----------------
const LOCAL_RIDES_KEY = 'sadat_ride_local_rides';

function getLocalRides(): Ride[] {
  const data = localStorage.getItem(LOCAL_RIDES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalRides(rides: Ride[]) {
  localStorage.setItem(LOCAL_RIDES_KEY, JSON.stringify(rides));
}

/**
 * Registers a new ride in the database.
 */
export async function registerNewRide(ride: Ride): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('sadat_rides').insert([ride]);
      if (!error) {
        console.log('Supabase: Registered new ride successfully.');
        return;
      }
      console.warn('Supabase ride register error:', error);
    } catch (err) {
      console.warn('Supabase ride register failed, using local database instead.');
    }
  }

  // Local storage save
  const localRides = getLocalRides();
  const exists = localRides.some(r => r.id === ride.id);
  if (!exists) {
    localRides.push(ride);
    saveLocalRides(localRides);
  }
}

/**
 * Updates an existing ride's status and optional captain info in the database.
 */
export async function updateRideInDb(
  rideId: string,
  status: RideStatus,
  captainDetails?: {
    id: string;
    name: string;
    phone: string;
    carModel: string;
    carPlate: string;
    rating: number;
  }
): Promise<void> {
  const updateData: any = { status };
  if (captainDetails) {
    updateData.captainId = captainDetails.id;
    updateData.captainName = captainDetails.name;
    updateData.captainPhone = captainDetails.phone;
    updateData.captainCar = captainDetails.carModel;
    updateData.captainCarPlate = captainDetails.carPlate;
    updateData.captainRating = captainDetails.rating;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('sadat_rides')
        .update(updateData)
        .eq('id', rideId);

      if (!error) {
        console.log('Supabase: Updated ride in db successfully.');
        return;
      }
      console.warn('Supabase ride update error:', error);
    } catch (err) {
      console.warn('Supabase ride update failed, using local database instead.');
    }
  }

  // Local storage update
  const localRides = getLocalRides();
  const updated = localRides.map(r => {
    if (r.id === rideId) {
      return {
        ...r,
        status,
        ...(captainDetails && {
          captainId: captainDetails.id,
          captainName: captainDetails.name,
          captainPhone: captainDetails.phone,
          captainCar: captainDetails.carModel,
          captainCarPlate: captainDetails.carPlate,
          captainRating: captainDetails.rating
        })
      };
    }
    return r;
  });
  saveLocalRides(updated);
}

/**
 * Returns all rides in the database.
 */
export async function getAllRides(): Promise<Ride[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sadat_rides')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data) {
        return data as Ride[];
      }
    } catch (err) {
      console.warn('Supabase fetch rides failed, loading from local instead.');
    }
  }

  return getLocalRides().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Updates a user's current live GPS coordinates.
 */
export async function updateUserCoordinates(userId: string, latitude: number, longitude: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('sadat_users')
        .update({ latitude, longitude })
        .eq('id', userId);
    } catch (err) {
      console.warn('Supabase update user coordinates failed:', err);
    }
  }

  // Local storage fallback
  const localData = localStorage.getItem('sadat_ride_local_users');
  if (localData) {
    const users: UserType[] = JSON.parse(localData);
    const updated = users.map(u => u.id === userId ? { ...u, latitude, longitude } : u);
    localStorage.setItem('sadat_ride_local_users', JSON.stringify(updated));
  }
}

/**
 * Updates an active ride's live captain GPS coordinates.
 */
export async function updateRideCoordinates(rideId: string, captainLat: number, captainLng: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('sadat_rides')
        .update({ captainLat, captainLng })
        .eq('id', rideId);
    } catch (err) {
      console.warn('Supabase update ride coordinates failed:', err);
    }
  }

  // Local storage fallback
  const localRides = getLocalRides();
  const updated = localRides.map(r => r.id === rideId ? { ...r, captainLat, captainLng } : r);
  saveLocalRides(updated);
}

// ---------------- TRANSACTIONS DATABASE FALLBACK ----------------
const LOCAL_TX_KEY = 'sadat_ride_local_transactions';

export function getLocalTransactions(): Transaction[] {
  const data = localStorage.getItem(LOCAL_TX_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveLocalTransactions(txs: Transaction[]) {
  localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(txs));
}

/**
 * Returns all financial transactions, optionally filtered by user ID.
 */
export async function getTransactions(userId?: string): Promise<Transaction[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('sadat_transactions').select('*').order('createdAt', { ascending: false });
      if (userId) {
        query = query.eq('userId', userId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data as Transaction[];
      }
    } catch (err) {
      console.warn('Supabase fetch transactions failed, loading from local instead.');
    }
  }

  const txs = getLocalTransactions();
  const sorted = txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (userId) {
    return sorted.filter(t => t.userId === userId);
  }
  return sorted;
}

/**
 * Creates a new financial transaction log.
 */
export async function createTransaction(tx: Transaction): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('sadat_transactions').insert([tx]);
      if (!error) {
        console.log('Supabase: Created transaction successfully.');
        return;
      }
      console.warn('Supabase transaction insert error:', error);
    } catch (err) {
      console.warn('Supabase transaction insert failed, falling back to local.');
    }
  }

  const txs = getLocalTransactions();
  txs.push(tx);
  saveLocalTransactions(txs);
}

/**
 * High-level wallet top up function.
 */
export async function topUpUserWallet(userId: string, amount: number, method: PaymentMethod): Promise<number> {
  // 1. Fetch user
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    throw new Error('المستخدم غير موجود.');
  }

  // 2. Add to balance
  const originalBalance = user.balance;
  const newBalance = originalBalance + amount;
  const updatedUser = { ...user, balance: newBalance };
  await updateUserData(updatedUser);

  // 3. Log transaction
  const tx: Transaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    type: 'deposit',
    amount,
    paymentMethod: method,
    description: `شحن رصيد المحفظة عبر ${method === 'card' ? 'البطاقة الائتمانية' : method === 'vodafone_cash' ? 'Vodafone Cash' : method === 'fawry' ? 'Fawry' : 'شحن مباشر'}`,
    createdAt: new Date().toISOString()
  };
  await createTransaction(tx);

  return newBalance;
}

/**
 * Processes a ride payment upon completion.
 * Handles cash vs wallet, calculates commission (15%), credits driver, and records transaction logs.
 */
export async function processRidePayment(
  rideId: string,
  paymentMethod: PaymentMethod
): Promise<{ success: boolean; riderBalance: number; captainBalance: number; message: string; commissionAmount: number; captainEarnings: number }> {
  // 1. Fetch the ride
  const rides = await getAllRides();
  const ride = rides.find(r => r.id === rideId);
  if (!ride) {
    return { success: false, riderBalance: 0, captainBalance: 0, message: 'الرحلة غير موجودة.', commissionAmount: 0, captainEarnings: 0 };
  }

  // 2. Fetch rider and captain
  const users = await getAllUsers();
  const rider = users.find(u => u.id === ride.riderId);
  const captain = ride.captainId ? users.find(u => u.id === ride.captainId) : null;

  if (!rider) {
    return { success: false, riderBalance: 0, captainBalance: 0, message: 'الراكب غير موجود.', commissionAmount: 0, captainEarnings: 0 };
  }

  const price = ride.price;
  const commission = Math.round(price * 0.15); // 15% commission
  const captainEarnings = price - commission;

  let finalRiderBalance = rider.balance;
  let finalCaptainBalance = captain ? captain.balance : 0;

  if (paymentMethod === 'wallet') {
    // Check if rider has enough balance
    if (rider.balance < price) {
      return {
        success: false,
        riderBalance: rider.balance,
        captainBalance: finalCaptainBalance,
        message: 'رصيد المحفظة للراكب غير كافٍ. يرجى شحن الرصيد أو الدفع نقداً.',
        commissionAmount: commission,
        captainEarnings
      };
    }

    // Deduct price from rider balance
    finalRiderBalance = rider.balance - price;
    await updateUserData({ ...rider, balance: finalRiderBalance });

    // Record rider transaction
    const riderTx: Transaction = {
      id: `tx-${Date.now()}-rider`,
      userId: rider.id,
      type: 'payment_debit',
      amount: price,
      paymentMethod,
      description: `دفع تكلفة الرحلة من ${ride.startLocation} إلى ${ride.endLocation}`,
      rideId,
      createdAt: new Date().toISOString()
    };
    await createTransaction(riderTx);

    // Credit captain balance with earnings
    if (captain) {
      finalCaptainBalance = captain.balance + captainEarnings;
      await updateUserData({ ...captain, balance: finalCaptainBalance });

      // Record captain credit transaction
      const captainTx: Transaction = {
        id: `tx-${Date.now()}-captain-credit`,
        userId: captain.id,
        type: 'payment_credit',
        amount: captainEarnings,
        paymentMethod,
        description: `أرباح الرحلة من ${ride.startLocation} إلى ${ride.endLocation} (بعد خصم العمولة)`,
        rideId,
        createdAt: new Date().toISOString()
      };
      await createTransaction(captainTx);

      // Record system commission credit
      const systemTx: Transaction = {
        id: `tx-${Date.now()}-sys-credit`,
        userId: 'system',
        type: 'commission_credit',
        amount: commission,
        paymentMethod,
        description: `عمولة التطبيق (15%) للرحلة من ${ride.startLocation} إلى ${ride.endLocation}`,
        rideId,
        createdAt: new Date().toISOString()
      };
      await createTransaction(systemTx);
    }
  } else {
    // Cash payment (or external payment method like Card, Vodafone Cash, Fawry directly to Captain)
    // Rider pays captain directly physically.
    // Application commission (15%) is deducted from captain's wallet balance.
    if (captain) {
      finalCaptainBalance = captain.balance - commission;
      await updateUserData({ ...captain, balance: finalCaptainBalance });

      // Record captain commission debit transaction
      const captainDebitTx: Transaction = {
        id: `tx-${Date.now()}-captain-debit`,
        userId: captain.id,
        type: 'commission_debit',
        amount: commission,
        paymentMethod,
        description: `خصم عمولة التطبيق (15%) للرحلة النقدية من ${ride.startLocation} إلى ${ride.endLocation}`,
        rideId,
        createdAt: new Date().toISOString()
      };
      await createTransaction(captainDebitTx);

      // Record system commission credit
      const systemTx: Transaction = {
        id: `tx-${Date.now()}-sys-credit-cash`,
        userId: 'system',
        type: 'commission_credit',
        amount: commission,
        paymentMethod,
        description: `عمولة التطبيق (15% - نقدي) للرحلة من ${ride.startLocation} إلى ${ride.endLocation}`,
        rideId,
        createdAt: new Date().toISOString()
      };
      await createTransaction(systemTx);
    }

    // Record rider transaction for transparency
    const riderTx: Transaction = {
      id: `tx-${Date.now()}-rider-cash`,
      userId: rider.id,
      type: 'payment_debit',
      amount: price,
      paymentMethod,
      description: `سداد أجرة الرحلة نقداً من ${ride.startLocation} إلى ${ride.endLocation}`,
      rideId,
      createdAt: new Date().toISOString()
    };
    await createTransaction(riderTx);
  }

  // Update ride object with payment attributes
  const localRides = getLocalRides();
  const updatedRides = localRides.map(r => {
    if (r.id === rideId) {
      return {
        ...r,
        status: 'completed' as RideStatus,
        paymentMethod,
        paymentStatus: 'paid' as const,
        commissionAmount: commission,
        captainEarnings
      };
    }
    return r;
  });
  saveLocalRides(updatedRides);

  // If Supabase is active, update Supabase as well
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('sadat_rides')
        .update({
          status: 'completed',
          paymentMethod,
          paymentStatus: 'paid',
          commissionAmount: commission,
          captainEarnings
        })
        .eq('id', rideId);
    } catch (e) {
      console.warn('Supabase update ride payments failed, using local sync.');
    }
  }

  return {
    success: true,
    riderBalance: finalRiderBalance,
    captainBalance: finalCaptainBalance,
    message: 'تمت التسوية المالية للرحلة بنجاح!',
    commissionAmount: commission,
    captainEarnings
  };
}

// ---------------- ZONES & PRICING MANAGEMENT ----------------

export const DEFAULT_ZONES: Zone[] = [
  {
    id: 'zone-north',
    name: 'المنطقة الشمالية (السكنية والجامعية)',
    basePrice: 15,
    minFare: 20,
    landmarks: [
      'جامعة مدينة السادات (المقر الرئيسي)',
      'كلية التربية الرياضية',
      'المنطقة السكنية الأولى (السوق القديم)',
      'المنطقة السكنية الرابعة',
      'موقف السادات العمومي (المسافرين)'
    ]
  },
  {
    id: 'zone-central',
    name: 'المنطقة الوسطى (التجارية والخدمية)',
    basePrice: 12,
    minFare: 15,
    landmarks: [
      'مول السادات التجاري',
      'مستشفى السادات العام',
      'هايبر خير زمان (المحور)'
    ]
  },
  {
    id: 'zone-south',
    name: 'المنطقة الجنوبية (العائلات والنمو)',
    basePrice: 18,
    minFare: 25,
    landmarks: [
      'المنطقة السكنية السابعة (العائلات)',
      'المنطقة السكنية الحادية عشر'
    ]
  },
  {
    id: 'zone-industrial',
    name: 'المنطقة الصناعية (المصانع والخدمات)',
    basePrice: 25,
    minFare: 35,
    landmarks: [
      'المنطقة الصناعية الأولى',
      'المنطقة الصناعية الثانية'
    ]
  }
];

export function getZones(): Zone[] {
  const data = localStorage.getItem('sadat_ride_zones');
  if (!data) {
    localStorage.setItem('sadat_ride_zones', JSON.stringify(DEFAULT_ZONES));
    return DEFAULT_ZONES;
  }
  return JSON.parse(data);
}

export function updateZonePricing(zoneId: string, basePrice: number, minFare: number): Zone[] {
  const zones = getZones();
  const updated = zones.map(z => z.id === zoneId ? { ...z, basePrice, minFare } : z);
  localStorage.setItem('sadat_ride_zones', JSON.stringify(updated));
  return updated;
}

export function calculateRidePrice(startLoc: string, endLoc: string, vehicleType: VehicleType, distance: number): number {
  const zones = getZones();
  const zone = zones.find(z => z.landmarks.includes(startLoc)) || zones[1]; // default to central
  
  let base = zone.basePrice;
  let multiplier = 1.0;
  if (vehicleType === 'premium') {
    multiplier = 1.6;
  } else if (vehicleType === 'scooter') {
    multiplier = 0.7;
  }
  
  let total = Math.round(base + (distance * 4 * multiplier));
  if (total < zone.minFare) {
    total = zone.minFare;
  }
  return total;
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('sadat_users')
        .update({ isActive })
        .eq('id', userId);
    } catch (e) {
      console.warn('Supabase status update failed, using local.');
    }
  }

  const localUsers = getLocalUsers();
  const updated = localUsers.map(u => u.id === userId ? { ...u, isActive } : u);
  saveLocalUsers(updated);
}



