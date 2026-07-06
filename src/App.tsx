import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Ride, PricingSettings, RideStatus } from './types';
import Login from './components/Login';
import SignUp from './components/SignUp';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import { initDatabase, getAllUsers, registerNewUser, updateUserData, registerNewRide, updateRideInDb, getAllRides, processRidePayment, updateUserStatus } from './utils/db';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'dashboard'>('login');
  
  // Real-time state arrays (In-Memory state initially loaded from and persisted to DB)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  
  // Platform Pricing Rules
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    economyBase: 15,
    economyPerKm: 1.5,
    premiumBase: 25,
    premiumPerKm: 2.5,
    scooterBase: 8,
    scooterPerKm: 1.0
  });

  // Initialize DB, load registered users and rides, and setup database sync polling
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        const [users, rides] = await Promise.all([
          getAllUsers(),
          getAllRides()
        ]);
        setRegisteredUsers(users);
        setActiveRides(rides);

        // Check if there is an active session
        const savedUser = sessionStorage.getItem('sadat_session');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            // Verify user still exists
            const userExists = users.find(u => u.id === parsed.id || u.phone === parsed.phone);
            if (userExists) {
              setCurrentUser(userExists);
              setCurrentView('dashboard');
            }
          } catch (e) {
            console.warn('Failed to parse saved session');
          }
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
      }
    };
    bootstrap();

    // Database polling for active cross-session sync
    const interval = setInterval(async () => {
      try {
        const [users, rides] = await Promise.all([
          getAllUsers(),
          getAllRides()
        ]);
        setRegisteredUsers(users);
        setActiveRides(rides);

        // Keep current user state synchronized
        setCurrentUser(prevUser => {
          if (!prevUser) return null;
          const fresh = users.find(u => u.id === prevUser.id);
          return fresh || prevUser;
        });
      } catch (e) {
        console.warn('Database polling failed:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Authentication callbacks
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('sadat_session', JSON.stringify(user));
    setCurrentView('dashboard');
  };

  const handleSignUpSuccess = async (newUser: User, password?: string) => {
    try {
      // Save to database
      await registerNewUser(newUser, password || '123456');
      const users = await getAllUsers();
      setRegisteredUsers(users);
      // Automatically log them in
      setCurrentUser(newUser);
      sessionStorage.setItem('sadat_session', JSON.stringify(newUser));
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Error during sign up database sync:', err);
      // Fallback
      setRegisteredUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      sessionStorage.setItem('sadat_session', JSON.stringify(newUser));
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('sadat_session');
    setCurrentView('login');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await updateUserData(updatedUser);
      setCurrentUser(updatedUser);
      sessionStorage.setItem('sadat_session', JSON.stringify(updatedUser));
      const users = await getAllUsers();
      setRegisteredUsers(users);
    } catch (err) {
      console.error('Error during user update database sync:', err);
      setCurrentUser(updatedUser);
      sessionStorage.setItem('sadat_session', JSON.stringify(updatedUser));
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
    }
  };

  // Ride Management callbacks
  const handleCreateRide = async (ride: Ride) => {
    try {
      await registerNewRide(ride);
      const rides = await getAllRides();
      setActiveRides(rides);
    } catch (err) {
      console.error('Failed to create ride in database:', err);
      setActiveRides((prev) => [ride, ...prev]);
    }
  };

  const handleUpdateRideStatus = async (
    rideId: string,
    status: RideStatus,
    captainId?: string,
    captainName?: string,
    captainPhone?: string,
    captainCar?: string,
    captainCarPlate?: string
  ) => {
    try {
      let captainDetails = undefined;
      if (captainId) {
        const cpt = registeredUsers.find(u => u.id === captainId);
        captainDetails = {
          id: captainId,
          name: captainName || '',
          phone: captainPhone || '',
          carModel: captainCar || 'سيارة ملاكي',
          carPlate: captainCarPlate || 'سادات 1',
          rating: cpt?.rating || 4.9
        };
      }

      if (status === 'completed') {
        const ride = activeRides.find(r => r.id === rideId);
        const paymentMethodSelected = ride?.paymentMethod || 'cash';
        
        // Process the payments, wallet changes, system commission, and transaction logging
        const result = await processRidePayment(rideId, paymentMethodSelected);
        if (!result.success) {
          alert(result.message);
          return;
        }
      } else {
        await updateRideInDb(rideId, status, captainDetails);
      }

      // Sync states across the application instantly
      const [users, rides] = await Promise.all([
        getAllUsers(),
        getAllRides()
      ]);
      setRegisteredUsers(users);
      setActiveRides(rides);

      // Keep current user state synchronized
      if (currentUser) {
        const freshUser = users.find(u => u.id === currentUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
          sessionStorage.setItem('sadat_session', JSON.stringify(freshUser));
        }
      }
    } catch (err) {
      console.error('Failed to update ride status in database:', err);
      setActiveRides((prev) =>
        prev.map((r) => {
          if (r.id === rideId) {
            return {
              ...r,
              status,
              ...(captainId && { captainId, captainName, captainPhone, captainCar, captainCarPlate })
            };
          }
          return r;
        })
      );
    }
  };

  const handleCancelRideByAdmin = async (rideId: string) => {
    try {
      await updateRideInDb(rideId, 'cancelled');
      const rides = await getAllRides();
      setActiveRides(rides);
    } catch (err) {
      console.error('Failed to cancel ride in database:', err);
      setActiveRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, status: 'cancelled' } : r))
      );
    }
  };

  const handleApproveCaptain = async (captainId: string) => {
    try {
      const captain = registeredUsers.find((u) => u.id === captainId);
      if (captain) {
        const updated = { ...captain, isApproved: true } as any;
        await updateUserData(updated);
        const users = await getAllUsers();
        setRegisteredUsers(users);
      }
    } catch (err) {
      console.error('Error during captain approval database sync:', err);
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === captainId ? { ...u, isApproved: true } : u))
      );
    }
  };

  const handleUpdateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await updateUserStatus(userId, isActive);
      const users = await getAllUsers();
      setRegisteredUsers(users);
    } catch (err) {
      console.error('Error during status update:', err);
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive } : u))
      );
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      <div className="mesh-bg"></div>
      <AnimatePresence mode="wait">
        {currentView === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Login
              onLoginSuccess={handleLoginSuccess}
              onNavigateToSignUp={() => setCurrentView('signup')}
              registeredUsers={registeredUsers}
            />
          </motion.div>
        )}

        {currentView === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SignUp
              onSignUpSuccess={handleSignUpSuccess}
              onNavigateToLogin={() => setCurrentView('login')}
            />
          </motion.div>
        )}

        {currentView === 'dashboard' && currentUser && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {currentUser.role === 'admin' ? (
              <AdminDashboard
                admin={currentUser}
                onLogout={handleLogout}
                registeredUsers={registeredUsers}
                activeRides={activeRides}
                pricingSettings={pricingSettings}
                onUpdatePricing={setPricingSettings}
                onApproveCaptain={handleApproveCaptain}
                onCancelRideByAdmin={handleCancelRideByAdmin}
                onUpdateUserStatus={handleUpdateUserStatus}
              />
            ) : (
              <UserDashboard
                user={currentUser}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
                activeRides={activeRides}
                onCreateRide={handleCreateRide}
                onUpdateRideStatus={handleUpdateRideStatus}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
