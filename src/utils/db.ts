import { createClient } from '@supabase/supabase-js';
import { User as UserType } from '../types';
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
        carDetails: user.carDetails ? JSON.stringify(user.carDetails) : undefined
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
    createdAt: dbUser.createdAt,
    ...(dbUser.carDetails ? { carDetails: typeof dbUser.carDetails === 'string' ? JSON.parse(dbUser.carDetails) : dbUser.carDetails } : {})
  }));
}
