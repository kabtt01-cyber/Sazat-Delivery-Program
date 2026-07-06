import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Ride, PricingSettings, RideStatus } from './types';
import Login from './components/Login';
import SignUp from './components/SignUp';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import { initDatabase, getAllUsers, registerNewUser, updateUserData } from './utils/db';

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

  // Initialize DB and load registered users
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        const users = await getAllUsers();
        setRegisteredUsers(users);
      } catch (err) {
        console.error('Failed to initialize database:', err);
      }
    };
    bootstrap();
  }, []);

  // Authentication callbacks
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleSignUpSuccess = async (newUser: User) => {
    try {
      // Save to database
      await registerNewUser(newUser, '123456');
      const users = await getAllUsers();
      setRegisteredUsers(users);
      // Automatically log them in
      setCurrentUser(newUser);
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Error during sign up database sync:', err);
      // Fallback
      setRegisteredUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await updateUserData(updatedUser);
      setCurrentUser(updatedUser);
      const users = await getAllUsers();
      setRegisteredUsers(users);
    } catch (err) {
      console.error('Error during user update database sync:', err);
      setCurrentUser(updatedUser);
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
    }
  };

  // Ride Management callbacks
  const handleCreateRide = (ride: Ride) => {
    setActiveRides((prev) => [ride, ...prev]);

    // Simulate auto-assigning a captain after 5 seconds if a captain is active and online!
    const availableCaptain = registeredUsers.find(
      (u) => u.role === 'captain' && u.isOnline && !activeRides.some(r => r.captainId === u.id && r.status !== 'completed' && r.status !== 'cancelled')
    );

    if (availableCaptain) {
      setTimeout(() => {
        setActiveRides((prevRides) =>
          prevRides.map((r) =>
            r.id === ride.id
              ? {
                  ...r,
                  status: 'accepted',
                  captainId: availableCaptain.id,
                  captainName: availableCaptain.name,
                  captainPhone: availableCaptain.phone,
                  captainRating: availableCaptain.rating,
                  captainCar: availableCaptain.carDetails?.model || 'سيارة ملاكي',
                  captainCarPlate: availableCaptain.carDetails?.plate || 'سادات 1'
                }
              : r
          )
        );
      }, 4000);
    }
  };

  const handleUpdateRideStatus = (
    rideId: string,
    status: RideStatus,
    captainId?: string,
    captainName?: string,
    captainPhone?: string,
    captainCar?: string,
    captainCarPlate?: string
  ) => {
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
  };

  const handleCancelRideByAdmin = (rideId: string) => {
    setActiveRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, status: 'cancelled' } : r))
    );
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
