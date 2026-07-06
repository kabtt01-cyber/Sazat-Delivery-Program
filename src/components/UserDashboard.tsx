import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, MapPin, Compass, Search, Clock, DollarSign, User, LogOut, Navigation, 
  CheckCircle, Shield, AlertTriangle, Star, RefreshCw, Smartphone, Check, HelpCircle, ArrowDownLeft, ArrowUpRight, ShieldAlert
} from 'lucide-react';
import { User as UserType, Ride, VehicleType, RideStatus, PaymentMethod, Transaction } from '../types';
import SadatMap, { SADAT_COORDINATES, getHaversineDistance } from './SadatMap';
import { getTransactions, topUpUserWallet, getZones, calculateRidePrice } from '../utils/db';

interface UserDashboardProps {
  user: UserType;
  onLogout: () => void;
  onUpdateUser: (updatedUser: UserType) => void;
  activeRides: Ride[];
  onCreateRide: (ride: Ride) => void;
  onUpdateRideStatus: (rideId: string, status: RideStatus, captainId?: string, captainName?: string, captainPhone?: string, captainCar?: string, captainCarPlate?: string) => void;
}

// Sadat City Landmarks for location dropdowns
const SADAT_LOCATIONS = [
  'المنطقة الصناعية الأولى',
  'المنطقة الصناعية الثانية',
  'جامعة مدينة السادات (المقر الرئيسي)',
  'كلية التربية الرياضية',
  'المنطقة السكنية الأولى (السوق القديم)',
  'المنطقة السكنية الرابعة',
  'المنطقة السكنية السابعة (العائلات)',
  'المنطقة السكنية الحادية عشر',
  'مول السادات التجاري',
  'مستشفى السادات العام',
  'هايبر خير زمان (المحور)',
  'موقف السادات العمومي (المسافرين)'
];

export default function UserDashboard({
  user,
  onLogout,
  onUpdateUser,
  activeRides,
  onCreateRide,
  onUpdateRideStatus
}: UserDashboardProps) {
  const isRider = user.role === 'rider';
  
  // Rider state
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [customStartCoords, setCustomStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType>('economy');
  const [rideCost, setRideCost] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [currentActiveRide, setCurrentActiveRide] = useState<Ride | null>(null);
  
  // Wallet top up state
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState<PaymentMethod>('card');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // New Wallet & Transaction States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [riderActiveTab, setRiderActiveTab] = useState<'rides' | 'transactions'>('rides');
  const [captainActiveTab, setCaptainActiveTab] = useState<'rides' | 'transactions'>('rides');

  const fetchMyTransactions = async () => {
    try {
      const txs = await getTransactions(user.id);
      setTransactions(txs);
    } catch (e) {
      console.warn('Failed to load transactions:', e);
    }
  };

  useEffect(() => {
    fetchMyTransactions();
  }, [user.id, user.balance, activeRides]);

  // Captain state
  const [isOnline, setIsOnline] = useState(user.isOnline || false);
  const [rejectedRideIds, setRejectedRideIds] = useState<string[]>([]);
  const [filterNearby, setFilterNearby] = useState(true);

  useEffect(() => {
    setIsOnline(user.isOnline || false);
  }, [user.isOnline]);

  // Auto-calculate ride pricing
  useEffect(() => {
    if (startLoc && endLoc && startLoc !== endLoc) {
      const startCoords = startLoc === 'موقعي الحالي' && customStartCoords
        ? customStartCoords
        : SADAT_COORDINATES[startLoc];
      const endCoords = SADAT_COORDINATES[endLoc];
      
      let distance = 3; // Default fallback in km
      if (startCoords && endCoords) {
        distance = getHaversineDistance(startCoords, endCoords);
      }

      const total = calculateRidePrice(startLoc, endLoc, vehicle, distance);
      setRideCost(total);
    } else {
      setRideCost(0);
    }
  }, [startLoc, endLoc, vehicle, customStartCoords]);

  // Sync active ride for the Rider
  useEffect(() => {
    if (isRider) {
      const riderRide = activeRides.find(
        r => r.riderId === user.id && r.status !== 'completed' && r.status !== 'cancelled'
      );
      if (riderRide) {
        setCurrentActiveRide(riderRide);
        setIsSearching(false);
      } else {
        setCurrentActiveRide(null);
      }
    }
  }, [activeRides, isRider, user.id]);

  const renderTransactionsList = () => {
    if (transactions.length === 0) {
      return (
        <p className="text-sm text-slate-400 py-4 text-center">لا توجد عمليات مالية مسجلة بعد.</p>
      );
    }
    return (
      <div className="divide-y divide-white/10 space-y-3 pt-2 max-h-[300px] overflow-y-auto scrollbar-thin">
        {transactions.map((tx) => {
          const isCredit = tx.type === 'deposit' || tx.type === 'payment_credit' || tx.type === 'commission_credit';
          return (
            <div key={tx.id} className="flex items-center justify-between pt-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                    tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    tx.type === 'payment_credit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    tx.type === 'payment_debit' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    tx.type === 'commission_debit' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {tx.type === 'deposit' && 'شحن'}
                    {tx.type === 'payment_credit' && 'أرباح توصيل'}
                    {tx.type === 'payment_debit' && 'دفع رحلة'}
                    {tx.type === 'commission_debit' && 'عمولة تطبيق'}
                    {tx.type === 'commission_credit' && 'عمولة نظام'}
                  </span>
                  <span className="font-bold text-white truncate text-xs">{tx.description}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span>{new Date(tx.createdAt).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span>•</span>
                  <span>الوسيلة: {
                    tx.paymentMethod === 'cash' ? 'نقدي 💵' :
                    tx.paymentMethod === 'wallet' ? 'المحفظة 📱' :
                    tx.paymentMethod === 'card' ? 'فيزا 💳' :
                    tx.paymentMethod === 'vodafone_cash' ? 'فودافون كاش 📱' : 'فوري 🏪'
                  }</span>
                </div>
              </div>
              <div className="text-left shrink-0 pr-2">
                <span className={`font-extrabold text-xs block ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isCredit ? '+' : '-'}{tx.amount} ج.م
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Action handlers
  const handleRequestRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startLoc || !endLoc) return;

    if (paymentMethod === 'wallet' && user.balance < rideCost) {
      alert('عذراً، رصيد المحفظة الحالي لا يغطي تكلفة الرحلة. يرجى شحن المحفظة أولاً أو اختيار الدفع النقدي.');
      return;
    }

    setIsSearching(true);

    const startCoords = startLoc === 'موقعي الحالي' && customStartCoords
      ? customStartCoords
      : SADAT_COORDINATES[startLoc];

    const endCoords = SADAT_COORDINATES[endLoc];

    // Create a pending ride request
    const newRide: Ride = {
      id: `ride-${Date.now()}`,
      riderId: user.id,
      riderName: user.name,
      riderPhone: user.phone,
      startLocation: startLoc,
      endLocation: endLoc,
      startLat: startCoords?.lat,
      startLng: startCoords?.lng,
      endLat: endCoords?.lat,
      endLng: endCoords?.lng,
      price: rideCost,
      status: 'pending',
      vehicleType: vehicle,
      durationMinutes: Math.abs(startLoc.length - endLoc.length) + 6,
      paymentMethod: paymentMethod,
      createdAt: new Date().toISOString()
    };

    // Delay slightly to simulate contacting network captains, then add to global state
    setTimeout(() => {
      onCreateRide(newRide);
    }, 1500);
  };

  const handleCancelRide = (rideId: string) => {
    onUpdateRideStatus(rideId, 'cancelled');
    setIsSearching(false);
  };

  const handleWalletTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      const newBal = await topUpUserWallet(user.id, amt, topUpMethod);
      onUpdateUser({
        ...user,
        balance: newBal
      });
      setTopUpSuccess(true);
      fetchMyTransactions();
      setTimeout(() => {
        setShowTopUpModal(false);
        setTopUpSuccess(false);
        setTopUpAmount('');
      }, 1200);
    } catch (err) {
      alert('فشل شحن الرصيد. يرجى المحاولة لاحقاً.');
    }
  };

  const handleToggleOnline = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    onUpdateUser({
      ...user,
      isOnline: nextState
    });
  };

  // Find all incoming ride requests that match the captain's vehicle type and haven't been rejected
  const modelLower = user.carDetails?.model?.toLowerCase() || '';
  const isCaptainScooter = modelLower.includes('scooter') || modelLower.includes('سكوتر');
  const isCaptainPremium = modelLower.includes('premium') || modelLower.includes('ممتاز');
  const captainVehicleType = isCaptainScooter ? 'scooter' : (isCaptainPremium ? 'premium' : 'economy');

  const getCaptainNearestZone = () => {
    if (!user.latitude || !user.longitude) return null;
    const captainCoords = { lat: user.latitude, lng: user.longitude };
    let minDistance = Infinity;
    let nearestLandmark = '';
    Object.entries(SADAT_COORDINATES).forEach(([name, coords]) => {
      const dist = getHaversineDistance(captainCoords, coords);
      if (dist < minDistance) {
        minDistance = dist;
        nearestLandmark = name;
      }
    });
    const zones = getZones();
    return zones.find(z => z.landmarks.includes(nearestLandmark)) || null;
  };

  const pendingRidesForCaptain = activeRides.filter((r) => {
    if (r.status !== 'pending') return false;
    if (rejectedRideIds.includes(r.id)) return false;
    if (r.vehicleType !== captainVehicleType) return false;

    if (filterNearby) {
      const captainZone = getCaptainNearestZone();
      const zones = getZones();
      const rideZone = zones.find(z => z.landmarks.includes(r.startLocation));
      
      if (captainZone && rideZone) {
        if (captainZone.id !== rideZone.id) {
          const startCoords = SADAT_COORDINATES[r.startLocation];
          const captainCoords = { lat: user.latitude || 30.380, lng: user.longitude || 30.515 };
          if (startCoords) {
            const dist = getHaversineDistance(captainCoords, startCoords);
            if (dist > 2.5) return false;
          } else {
            return false;
          }
        }
      } else {
        const startCoords = SADAT_COORDINATES[r.startLocation];
        const captainCoords = { lat: user.latitude || 30.380, lng: user.longitude || 30.515 };
        if (startCoords) {
          const dist = getHaversineDistance(captainCoords, startCoords);
          if (dist > 2.5) return false;
        }
      }
    }
    return true;
  });

  const pendingRideForCaptain = pendingRidesForCaptain[0] || null;

  const handleCaptainAcceptRide = (rideId: string) => {
    onUpdateRideStatus(
      rideId,
      'accepted',
      user.id,
      user.name,
      user.phone,
      user.carDetails?.model || 'سيارة ملاكي',
      user.carDetails?.plate || 'سادات 1'
    );
  };

  const handleCaptainRejectRide = (rideId: string) => {
    setRejectedRideIds(prev => [...prev, rideId]);
  };

  const myActiveCaptainRide = activeRides.find(
    r => r.captainId === user.id && r.status !== 'completed' && r.status !== 'cancelled'
  );

  if (user.isActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white font-sans relative" id="user-suspended-screen">
        <div className="mesh-bg"></div>
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-3xl p-8 text-center space-y-6 relative z-10 backdrop-blur-md">
          <div className="w-20 h-20 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">تم إيقاف حسابك مؤقتاً</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              عذراً {user.name}، لقد تم تعليق صلاحيات حسابك كـ {user.role === 'rider' ? 'راكب' : 'كابتن'} بقرار من الإدارة لمراجعة النشاط أو تحديث البيانات.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
            <p className="font-bold text-orange-400">لإعادة التفعيل ومراجعة الطلب:</p>
            <p>📧 البريد الإلكتروني: support@sadatride.com</p>
            <p>📞 الدعم الفني: 01278150</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" id="user-dashboard-root">
      {/* Navbar */}
      <nav className="glass border-b border-white/10 sticky top-0 z-40 shadow-sm" id="dashboard-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Car className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">سادات <span className="text-orange-500">رايد</span></span>
            </div>

            <div className="flex items-center gap-4">
              {/* User details */}
              <div className="flex flex-col text-left items-end">
                <span className="font-bold text-slate-100 text-sm">{user.name}</span>
                <span className="text-xs text-slate-300 opacity-80">
                  {isRider ? 'حساب راكب 👤' : `كابتن (${user.carDetails?.model}) 🚗`}
                </span>
              </div>

              {/* Balance Badge */}
              <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-orange-500" />
                <span>محفظة: {user.balance.toFixed(0)} ج.م</span>
              </div>

              {/* Logout button */}
              <button
                id="logout-btn"
                onClick={onLogout}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Section */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Rider Layout */}
          {isRider && (
            <>
              {/* Booking & Ride Request Section (Left/Center) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Active Ride Card */}
                <AnimatePresence mode="wait">
                  {currentActiveRide ? (
                    <motion.div
                      key="active-ride"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="glass-card rounded-3xl p-6 space-y-5"
                      id="active-ride-panel"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                          </span>
                          <h3 className="font-extrabold text-white">رحلتك الحالية قيد التنفيذ</h3>
                        </div>
                        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/25 text-xs px-3 py-1 rounded-full font-bold">
                          {currentActiveRide.status === 'accepted' && 'تم قبول الطلب'}
                          {currentActiveRide.status === 'arriving' && 'الكابتن يقترب'}
                          {currentActiveRide.status === 'ongoing' && 'في الطريق للوجهة'}
                        </span>
                      </div>

                      {/* Route Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-300 opacity-70 block">نقطة الانطلاق</span>
                            <span className="text-sm font-bold text-white">{currentActiveRide.startLocation}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 border-t sm:border-t-0 sm:border-r border-white/10 pt-3 sm:pt-0 sm:pr-4">
                          <Navigation className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-300 opacity-70 block">نقطة الوصول</span>
                            <span className="text-sm font-bold text-white">{currentActiveRide.endLocation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Driver & Car details */}
                      {currentActiveRide.captainId ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-white/10 rounded-2xl bg-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-slate-200">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{currentActiveRide.captainName}</span>
                                <span className="bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 border border-amber-500/20">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>{currentActiveRide.captainRating || '4.9'}</span>
                                </span>
                              </div>
                              <span className="text-xs text-slate-300 opacity-80">{currentActiveRide.captainPhone}</span>
                            </div>
                          </div>

                          <div className="text-center sm:text-left">
                            <span className="text-xs text-slate-300 opacity-70 block">تفاصيل المركبة</span>
                            <span className="text-sm font-bold text-white">{currentActiveRide.captainCar}</span>
                            <span className="bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded border border-orange-500/20 block mt-1 font-mono">
                              {currentActiveRide.captainCarPlate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 text-amber-300 p-4 rounded-2xl border border-amber-500/25 text-sm flex gap-2">
                          <Clock className="w-5 h-5 shrink-0" />
                          <span>بانتظار قبول طلبك من أقرب كابتن متاح في السادات...</span>
                        </div>
                      )}

                      {/* Price & Simulated Controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                        <div>
                          <span className="text-xs text-slate-300 opacity-70 block">تكلفة الرحلة</span>
                          <span className="text-2xl font-black text-white">{currentActiveRide.price} ج.م</span>
                        </div>

                        {/* Interactive Ride State Simulator (since no backend) */}
                        <div className="flex gap-2">
                          {!currentActiveRide.captainId && (
                            <button
                              id="cancel-booking-btn"
                              onClick={() => handleCancelRide(currentActiveRide.id)}
                              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border border-rose-500/25 font-bold text-sm rounded-xl transition-all"
                            >
                              إلغاء الطلب
                            </button>
                          )}

                          {currentActiveRide.captainId && currentActiveRide.status === 'accepted' && (
                            <button
                              id="sim-captain-arrived"
                              onClick={() => onUpdateRideStatus(currentActiveRide.id, 'arriving')}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all"
                            >
                              محاكاة وصول الكابتن
                            </button>
                          )}

                          {currentActiveRide.status === 'arriving' && (
                            <button
                              id="sim-start-ride"
                              onClick={() => onUpdateRideStatus(currentActiveRide.id, 'ongoing')}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl transition-all"
                            >
                              محاكاة بدء الرحلة للوجهة
                            </button>
                          )}

                          {currentActiveRide.status === 'ongoing' && (
                            <button
                              id="sim-complete-ride"
                              onClick={() => onUpdateRideStatus(currentActiveRide.id, 'completed')}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl transition-all"
                            >
                              محاكاة إنهاء الرحلة والوصول
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : isSearching ? (
                    /* Search Screen Animation */
                    <motion.div
                      key="searching"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="glass-card rounded-3xl p-8 text-center space-y-6"
                      id="search-anim-panel"
                    >
                      <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping opacity-40" />
                        <div className="absolute inset-2 bg-orange-500/30 rounded-full animate-ping opacity-60" />
                        <div className="absolute inset-4 bg-orange-600 text-white rounded-full flex items-center justify-center">
                          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '4s' }} />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-extrabold text-white">جاري البحث عن كابتن متاح</h3>
                        <p className="text-sm text-slate-300 opacity-80 mt-1.5">نقوم بمسح منطقة السادات لإيجاد أسرع رحلة لك...</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl max-w-sm mx-auto text-right text-sm space-y-2">
                        <div>
                          <span className="text-slate-400">من:</span> <span className="font-semibold text-white">{startLoc}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">إلى:</span> <span className="font-semibold text-white">{endLoc}</span>
                        </div>
                      </div>

                      <button
                        id="cancel-search-btn"
                        onClick={() => setIsSearching(false)}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold rounded-xl transition-all text-sm"
                      >
                        إلغاء البحث
                      </button>
                    </motion.div>
                  ) : (
                    /* Normal Ride Booking Request Card */
                    <motion.div
                      key="booking-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card rounded-3xl p-6"
                      id="booking-form-card"
                    >
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-orange-500" />
                        <span>اطلب رحلة سريعة داخل السادات</span>
                      </h3>

                      <form onSubmit={handleRequestRide} className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">مكان الانطلاق</label>
                            <select
                              id="ride-start-select"
                              required
                              value={startLoc}
                              onChange={(e) => setStartLoc(e.target.value)}
                              className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white text-right text-sm"
                            >
                              <option value="" className="bg-slate-900 text-white">اختر نقطة الانطلاق...</option>
                              {customStartCoords && (
                                <option value="موقعي الحالي" className="bg-slate-900 text-amber-400 font-bold">📍 موقعي الحالي (محدد بالـ GPS)</option>
                              )}
                              {SADAT_LOCATIONS.map((loc, idx) => (
                                <option key={`start-${idx}`} value={loc} className="bg-slate-900 text-white">{loc}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">وجهة الوصول</label>
                            <select
                              id="ride-end-select"
                              required
                              value={endLoc}
                              onChange={(e) => setEndLoc(e.target.value)}
                              className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white text-right text-sm"
                            >
                              <option value="" className="bg-slate-900 text-white">اختر وجهة الوصول...</option>
                              {SADAT_LOCATIONS.map((loc, idx) => (
                                <option key={`end-${idx}`} value={loc} disabled={loc === startLoc} className="bg-slate-900 text-white">{loc}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Vehicle select */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2 pr-1">فئة المركبة</label>
                          <div className="grid grid-cols-3 gap-3" id="vehicle-selector">
                            <button
                              id="vehicle-economy"
                              type="button"
                              onClick={() => setVehicle('economy')}
                              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                                vehicle === 'economy'
                                  ? 'border-orange-500 bg-white/10 text-white font-bold'
                                  : 'border-white/10 hover:border-white/20 text-slate-300 bg-white/5'
                              }`}
                            >
                              <Car className="w-5 h-5 mb-1 text-slate-200" />
                              <span className="text-xs">اقتصادية</span>
                            </button>

                            <button
                              id="vehicle-premium"
                              type="button"
                              onClick={() => setVehicle('premium')}
                              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                                vehicle === 'premium'
                                  ? 'border-orange-500 bg-white/10 text-white font-bold'
                                  : 'border-white/10 hover:border-white/20 text-slate-300 bg-white/5'
                              }`}
                            >
                              <Car className="w-5 h-5 mb-1 text-orange-400" />
                              <span className="text-xs">ممتازة</span>
                            </button>

                            <button
                              id="vehicle-scooter"
                              type="button"
                              onClick={() => setVehicle('scooter')}
                              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                                vehicle === 'scooter'
                                  ? 'border-orange-500 bg-white/10 text-white font-bold'
                                  : 'border-white/10 hover:border-white/20 text-slate-300 bg-white/5'
                              }`}
                            >
                              <Compass className="w-5 h-5 mb-1 text-sky-400" />
                              <span className="text-xs">سكوتر</span>
                            </button>
                          </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2 pr-1">طريقة دفع الأجرة</label>
                          <div className="grid grid-cols-2 gap-3" id="payment-method-selector">
                            <button
                              id="payment-cash"
                              type="button"
                              onClick={() => setPaymentMethod('cash')}
                              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 transition-all cursor-pointer text-xs ${
                                paymentMethod === 'cash'
                                  ? 'border-orange-500 bg-white/10 text-white font-bold'
                                  : 'border-white/10 hover:border-white/20 text-slate-300 bg-white/5'
                              }`}
                            >
                              <span>الدفع نقداً 💵</span>
                            </button>

                            <button
                              id="payment-wallet"
                              type="button"
                              onClick={() => setPaymentMethod('wallet')}
                              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 transition-all cursor-pointer text-xs ${
                                paymentMethod === 'wallet'
                                  ? 'border-orange-500 bg-white/10 text-white font-bold'
                                  : 'border-white/10 hover:border-white/20 text-slate-300 bg-white/5'
                              }`}
                            >
                              <span>المحفظة 📱</span>
                            </button>
                          </div>
                          
                          {/* Future extensible payment systems (Point 5 requirement) */}
                          <div className="flex gap-1.5 mt-2 pr-1 items-center">
                            <span className="text-[10px] text-slate-400">خيارات دفع رقمية إضافية (قريباً):</span>
                            <span className="text-[10px] bg-white/5 text-orange-400/80 px-1.5 py-0.5 rounded border border-white/5">فيزا</span>
                            <span className="text-[10px] bg-white/5 text-orange-400/80 px-1.5 py-0.5 rounded border border-white/5">Vodafone Cash</span>
                            <span className="text-[10px] bg-white/5 text-orange-400/80 px-1.5 py-0.5 rounded border border-white/5">فوري</span>
                          </div>
                        </div>

                        {/* Cost Display */}
                        {rideCost > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between"
                            id="cost-preview-panel"
                          >
                            <div>
                              <span className="text-xs text-slate-300 opacity-70 block">التكلفة المتوقعة للرحلة</span>
                              <span className="text-xl font-extrabold text-white">{rideCost} ج.م</span>
                            </div>
                            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1.5 rounded-lg border border-orange-500/20">
                              {paymentMethod === 'cash' ? 'دفع نقدي للكابتن 💵' : 'خصم تلقائي من المحفظة 📱'}
                            </span>
                          </motion.div>
                        )}

                        <button
                          id="book-now-btn"
                          type="submit"
                          disabled={!startLoc || !endLoc || startLoc === endLoc}
                          className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 disabled:bg-white/5 disabled:border-white/10 disabled:text-slate-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2"
                        >
                          <Search className="w-5 h-5" />
                          <span>اطلب الرحلة الآن</span>
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ride History & Financial Logs */}
                <div className="glass-card rounded-3xl p-6" id="ride-history-panel">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <div className="flex gap-4">
                      <button
                        id="rider-tab-rides"
                        type="button"
                        onClick={() => setRiderActiveTab('rides')}
                        className={`text-sm font-bold pb-2 transition-all ${
                          riderActiveTab === 'rides'
                            ? 'text-orange-500 border-b-2 border-orange-500'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        سجل رحلاتك الأخيرة
                      </button>
                      <button
                        id="rider-tab-transactions"
                        type="button"
                        onClick={() => setRiderActiveTab('transactions')}
                        className={`text-sm font-bold pb-2 transition-all flex items-center gap-1 ${
                          riderActiveTab === 'transactions'
                            ? 'text-orange-500 border-b-2 border-orange-500'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>سجل المعاملات المالي</span>
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                      </button>
                    </div>
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>

                  {riderActiveTab === 'rides' ? (
                    activeRides.filter(r => r.riderId === user.id && r.status === 'completed').length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">لا توجد رحلات مكتملة في جلستك الحالية بعد.</p>
                    ) : (
                      <div className="divide-y divide-white/10 space-y-3 pt-2">
                        {activeRides
                          .filter(r => r.riderId === user.id && r.status === 'completed')
                          .map((ride) => (
                            <div key={ride.id} className="flex items-center justify-between pt-3 text-sm">
                              <div>
                                <span className="font-bold text-white block">{ride.startLocation} إلى {ride.endLocation}</span>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                  <span>{new Date(ride.createdAt).toLocaleTimeString('ar-EG')}</span>
                                  <span>•</span>
                                  <span>الوسيلة: {ride.paymentMethod === 'wallet' ? 'المحفظة 📱' : 'نقدي 💵'}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="font-extrabold text-orange-400 block">{ride.price} ج.م</span>
                                <span className="text-xs text-slate-400 font-medium">مكتملة ✓</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                  ) : (
                    renderTransactionsList()
                  )}
                </div>

              </div>

              {/* Sidebar Info & Wallet Controls (Right) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Real Live Google Map Component */}
                <SadatMap
                  userRole="rider"
                  userId={user.id}
                  activeRide={currentActiveRide}
                  startLocName={startLoc}
                  endLocName={endLoc}
                  onSetCurrentLocation={(coords) => setCustomStartCoords(coords)}
                />

                {/* Wallet top up controls */}
                <div className="glass-card rounded-3xl p-6 space-y-4" id="wallet-management-card">
                  <h3 className="font-bold text-white">إدارة محفظتك</h3>
                  <p className="text-xs text-slate-300 opacity-80">اشحن رصيد محفظتك لتتمكن من حجز الرحلات فوراً دون انقطاع.</p>

                  <button
                    id="open-topup-modal-btn"
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>شحن رصيد المحفظة</span>
                    <DollarSign className="w-4 h-4" />
                  </button>
                </div>

                {/* Safety Tips */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3" id="safety-tips-card">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-500" />
                    <span>ميثاق الأمان في سادات رايد</span>
                  </h4>
                  <ul className="text-xs text-slate-300 opacity-85 list-disc list-inside space-y-1.5 pr-1">
                    <li>يتم مراجعة أوراق وهوية جميع الكباتن المعتمدين بدقة.</li>
                    <li>يرجى مطابقة رقم لوحة السيارة قبل الصعود للمركبة.</li>
                    <li>يمكنك مشاركة تفاصيل رحلتك مباشرة مع عائلتك.</li>
                  </ul>
                </div>
              </div>
            </>
          )}


          {/* Captain Layout */}
          {!isRider && (
            <>
              {/* Main Booking requests area */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Active Ride controls */}
                {myActiveCaptainRide ? (
                  <div className="glass-card rounded-3xl p-6 space-y-5" id="captain-active-ride-panel">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                        </span>
                        <h3 className="font-extrabold text-white">رحلة جارية مع العميل</h3>
                      </div>
                      <span className="bg-indigo-500/10 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold border border-indigo-500/20">
                        {myActiveCaptainRide.status === 'accepted' && 'تم قبول الطلب، توجه للراكب'}
                        {myActiveCaptainRide.status === 'arriving' && 'لقد وصلت للراكب'}
                        {myActiveCaptainRide.status === 'ongoing' && 'في الطريق للوجهة'}
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-slate-300 opacity-70 block">موقع الراكب (نقطة الالتقاء)</span>
                          <span className="text-sm font-bold text-white">{myActiveCaptainRide.startLocation}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-t border-white/10 pt-3">
                        <Navigation className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-slate-300 opacity-70 block">وجهة التوصيل</span>
                          <span className="text-sm font-bold text-white">{myActiveCaptainRide.endLocation}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-white/10 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-200">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs text-slate-300 opacity-70 block">الراكب</span>
                          <span className="font-bold text-white block">{myActiveCaptainRide.riderName}</span>
                          <span className="text-xs text-slate-300 opacity-80">{myActiveCaptainRide.riderPhone}</span>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-xs text-slate-300 opacity-70 block">الأجرة الصافية</span>
                        <span className="text-xl font-extrabold text-orange-400">{myActiveCaptainRide.price} ج.م</span>
                      </div>
                    </div>

                    {/* Captain Ride Controls */}
                    <div className="flex justify-end gap-2 pt-2">
                      {myActiveCaptainRide.status === 'accepted' && (
                        <button
                          id="captain-arrived-btn"
                          onClick={() => onUpdateRideStatus(myActiveCaptainRide.id, 'arriving')}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                        >
                          لقد وصلت لمكان العميل
                        </button>
                      )}

                      {myActiveCaptainRide.status === 'arriving' && (
                        <button
                          id="captain-start-trip-btn"
                          onClick={() => onUpdateRideStatus(myActiveCaptainRide.id, 'ongoing')}
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all"
                        >
                          بدء الرحلة الآن
                        </button>
                      )}

                      {myActiveCaptainRide.status === 'ongoing' && (
                        <button
                          id="captain-complete-trip-btn"
                          onClick={() => onUpdateRideStatus(myActiveCaptainRide.id, 'completed')}
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all"
                        >
                          إنهاء الرحلة وتحصيل الأجرة
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Waiting for bookings / incoming request alert */
                  <div className="space-y-6">
                    <div className="glass-card rounded-3xl p-6 space-y-6" id="captain-standby-panel">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">حالة تلقي الطلبات</h3>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                            <label className="text-[11px] text-slate-300 font-bold select-none cursor-pointer flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={filterNearby}
                                onChange={(e) => setFilterNearby(e.target.checked)}
                                className="accent-orange-500 cursor-pointer w-3.5 h-3.5 rounded"
                              />
                              <span>الطلبات القريبة فقط (≤ 2.5 كم)</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-orange-500 animate-pulse' : 'bg-slate-500'}`} />
                            <span className="text-xs font-bold text-slate-300 opacity-90">{isOnline ? 'نشط ومستعد للتوصيل' : 'غير متصل بالشبكة'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-white/10 bg-white/5 p-8 rounded-2xl text-center space-y-4">
                        {isOnline ? (
                          <>
                            <div className="w-16 h-16 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                              <Compass className="w-8 h-8" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white">بانتظار طلبات العملاء في السادات...</h4>
                              <p className="text-xs text-slate-300 opacity-80 mt-1">تأكد من بقاء هذه الصفحة مفتوحة لاستقبال الإشعارات والرحلات القريبة منك فوراً.</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 text-slate-400 border border-white/10 rounded-full flex items-center justify-center mx-auto">
                              <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-300">أنت خارج التغطية حالياً</h4>
                              <p className="text-xs text-slate-300 opacity-80 mt-1">اضغط على زر التفعيل بالجانب لبدء استقبال الطلبات ومطابقة رحلات الركاب بمدينة السادات.</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Incoming Pending Request Alert Box (Simulated matching) */}
                      {isOnline && pendingRideForCaptain && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 space-y-4"
                          id="incoming-request-card"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-full font-bold">طلب رحلة جديد!</span>
                            <span className="text-sm font-bold text-white">{pendingRideForCaptain.price} ج.م</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-xs text-slate-400 block">من:</span>
                              <span className="font-semibold text-white">{pendingRideForCaptain.startLocation}</span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400 block">إلى:</span>
                              <span className="font-semibold text-white">{pendingRideForCaptain.endLocation}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/10 pt-3">
                            <span className="text-xs text-slate-300 opacity-80">الراكب: {pendingRideForCaptain.riderName}</span>
                            <div className="flex gap-2">
                              <button
                                id="reject-incoming-btn"
                                onClick={() => handleCaptainRejectRide(pendingRideForCaptain.id)}
                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-bold rounded-xl text-xs transition-all"
                              >
                                رفض الطلب
                              </button>
                              <button
                                id="accept-incoming-btn"
                                onClick={() => handleCaptainAcceptRide(pendingRideForCaptain.id)}
                                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-all"
                              >
                                قبول وتلبية الطلب
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Completed trips by Captain */}
                    <div className="glass-card rounded-3xl p-6" id="captain-ride-history">
                      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                        <div className="flex gap-4">
                          <button
                            id="captain-tab-rides"
                            type="button"
                            onClick={() => setCaptainActiveTab('rides')}
                            className={`text-sm font-bold pb-2 transition-all ${
                              captainActiveTab === 'rides'
                                ? 'text-orange-500 border-b-2 border-orange-500'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            رحلاتك المنجزة اليوم
                          </button>
                          <button
                            id="captain-tab-transactions"
                            type="button"
                            onClick={() => setCaptainActiveTab('transactions')}
                            className={`text-sm font-bold pb-2 transition-all flex items-center gap-1 ${
                              captainActiveTab === 'transactions'
                                ? 'text-orange-500 border-b-2 border-orange-500'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>سجل المعاملات المالي</span>
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                          </button>
                        </div>
                      </div>

                      {captainActiveTab === 'rides' ? (
                        activeRides.filter(r => r.captainId === user.id && r.status === 'completed').length === 0 ? (
                          <p className="text-sm text-slate-400 py-4 text-center">لم تقم بإتمام أي رحلات في هذه الجلسة بعد.</p>
                        ) : (
                          <div className="divide-y divide-white/10 space-y-3">
                            {activeRides
                              .filter(r => r.captainId === user.id && r.status === 'completed')
                              .map((ride) => {
                                const commission = ride.commissionAmount || Math.round(ride.price * 0.15);
                                const netEarnings = ride.captainEarnings || (ride.price - commission);
                                return (
                                  <div key={ride.id} className="flex items-center justify-between pt-3 text-sm">
                                    <div>
                                      <span className="font-bold text-white block">{ride.startLocation} إلى {ride.endLocation}</span>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                        <span>{new Date(ride.createdAt).toLocaleTimeString('ar-EG')}</span>
                                        <span>•</span>
                                        <span>الأجر: {ride.price} ج.م • عمولة التطبيق (15%): {commission} ج.م</span>
                                      </div>
                                    </div>
                                    <div className="text-left">
                                      <span className="font-extrabold text-emerald-400 block">+{netEarnings} ج.م</span>
                                      <span className="text-[10px] text-slate-400">{ride.paymentMethod === 'wallet' ? 'دفع محفظة 📱' : 'دفع نقدي 💵'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )
                      ) : (
                        renderTransactionsList()
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Captain stats sidebar */}
              <div className="lg:col-span-4 space-y-6">
                {/* Real Live Google Map Component */}
                <SadatMap
                  userRole="captain"
                  userId={user.id}
                  activeRide={myActiveCaptainRide || null}
                />

                {/* Switch online/offline */}
                <div className="glass-card rounded-3xl p-6 space-y-4" id="captain-toggle-panel">
                  <h4 className="font-bold text-white">حالة التوصيل</h4>
                  <button
                    id="toggle-online-btn"
                    onClick={handleToggleOnline}
                    className={`w-full py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                      isOnline 
                        ? 'bg-rose-500/10 text-rose-200 border border-rose-500/25 hover:bg-rose-500/20' 
                        : 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg'
                    }`}
                  >
                    <span>{isOnline ? 'تعطيل استقبال الرحلات' : 'بدء تلقي طلبات الركاب'}</span>
                  </button>
                </div>

                {/* Performance stats */}
                <div className="glass-card rounded-3xl p-6 space-y-4" id="captain-performance-panel">
                  <h3 className="font-bold text-white">إحصائيات الكابتن اليومية</h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                      <span className="text-xs text-slate-400 block">التقييم العام</span>
                      <span className="text-lg font-black text-white flex items-center justify-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>5.0</span>
                      </span>
                    </div>

                    <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                      <span className="text-xs text-slate-400 block">إجمالي أرباحك</span>
                      <span className="text-lg font-black text-orange-400 mt-1 block">
                        {user.balance.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/20 text-orange-300 p-4 rounded-2xl text-xs space-y-1">
                    <span className="font-bold block">ملاحظة الأرباح:</span>
                    <p>يتم إضافة تكلفة الرحلات الملباة مباشرة إلى حسابك. يمكنك التقدم بطلب سحب أرباحك من فرع الإدارة بالسادات.</p>
                  </div>
                </div>

                {/* Car info widget */}
                <div className="glass-card text-white rounded-3xl p-6 border border-orange-500/10 space-y-3" id="captain-vehicle-widget">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-400 font-bold">معلومات المركبة المسجلة</span>
                    <Car className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white">{user.carDetails?.model}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">اللون: {user.carDetails?.color}</span>
                    <span className="inline-block mt-2 bg-white/10 border border-white/10 font-mono text-sm px-3 py-1 rounded text-orange-400">
                      {user.carDetails?.plate}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Wallet Top Up Modal */}
      <AnimatePresence>
        {showTopUpModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans" id="topup-modal-container">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card rounded-3xl p-6 max-w-sm w-full text-white relative space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-white">شحن رصيد المحفظة</h3>
                <p className="text-xs text-slate-300 opacity-80 mt-1">أدخل المبلغ المطلوب شحنه بالجنيه المصري (متاح الدفع بفيزا أو فودافون كاش)</p>
              </div>

              {topUpSuccess ? (
                <div className="py-6 text-center text-orange-400 font-bold text-sm flex flex-col items-center gap-2" id="topup-success">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span>تم إضافة الرصيد لمحفظتك بنجاح!</span>
                </div>
              ) : (
                <form onSubmit={handleWalletTopUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">المبلغ المراد شحنه (ج.م)</label>
                    <input
                      id="topup-amount-input"
                      type="number"
                      required
                      min="10"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="مثال: 100"
                      className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white text-right text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">طريقة شحن الرصيد</label>
                    <select
                      id="topup-method-select"
                      value={topUpMethod}
                      onChange={(e) => setTopUpMethod(e.target.value as PaymentMethod)}
                      className="block w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white text-right text-sm"
                    >
                      <option value="card" className="bg-slate-900 text-white">💳 بطاقة ائتمانية (فيزا / ماستر كارد)</option>
                      <option value="vodafone_cash" className="bg-slate-900 text-white">📱 محفظة الهاتف (فودافون كاش)</option>
                      <option value="fawry" className="bg-slate-900 text-white">🏪 منفذ فوري (Fawry Pay)</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="submit-topup-btn"
                      type="submit"
                      className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
                    >
                      شحن الآن
                    </button>
                    <button
                      id="cancel-topup-btn"
                      type="button"
                      onClick={() => setShowTopUpModal(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold rounded-xl text-sm transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
