import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Car, Navigation, DollarSign, Settings, Bell, LogOut, CheckCircle, 
  XCircle, Sliders, Shield, RefreshCw, Layers, TrendingUp, AlertCircle, ShieldAlert, Percent
} from 'lucide-react';
import { User, Ride, PricingSettings, RideStatus, Zone } from '../types';
import { getZones, updateZonePricing } from '../utils/db';

interface AdminDashboardProps {
  admin: User;
  onLogout: () => void;
  registeredUsers: User[];
  activeRides: Ride[];
  pricingSettings: PricingSettings;
  onUpdatePricing: (pricing: PricingSettings) => void;
  onApproveCaptain: (captainId: string) => void;
  onCancelRideByAdmin: (rideId: string) => void;
  onUpdateUserStatus: (userId: string, isActive: boolean) => void;
}

export default function AdminDashboard({
  admin,
  onLogout,
  registeredUsers,
  activeRides,
  pricingSettings,
  onUpdatePricing,
  onApproveCaptain,
  onCancelRideByAdmin,
  onUpdateUserStatus
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'captains' | 'riders' | 'rides' | 'pricing'>('overview');
  
  // Pricing state editors
  const [economyBase, setEconomyBase] = useState(pricingSettings.economyBase);
  const [economyPerKm, setEconomyPerKm] = useState(pricingSettings.economyPerKm);
  const [premiumBase, setPremiumBase] = useState(pricingSettings.premiumBase);
  const [premiumPerKm, setPremiumPerKm] = useState(pricingSettings.premiumPerKm);
  const [scooterBase, setScooterBase] = useState(pricingSettings.scooterBase);
  const [scooterPerKm, setScooterPerKm] = useState(pricingSettings.scooterPerKm);
  
  const [pricingSuccess, setPricingSuccess] = useState(false);
  const [zones, setZones] = useState<Zone[]>(() => getZones());

  // Computed metrics
  const riders = registeredUsers.filter((u) => u.role === 'rider');
  const captains = registeredUsers.filter((u) => u.role === 'captain');
  const completedRides = activeRides.filter((r) => r.status === 'completed');
  const platformRevenue = completedRides.reduce((acc, curr) => acc + (curr.price * 0.15), 0); // 15% platform commission

  // Advanced Statistics Calculator (Daily, Weekly, Monthly)
  const getPeriodStats = (days: number) => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - days);
    
    const filtered = completedRides.filter(r => {
      const rideDate = new Date(r.createdAt);
      if (days === 0) {
        return rideDate.toDateString() === now.toDateString();
      }
      return rideDate >= cutoffDate;
    });

    const totalFares = filtered.reduce((acc, curr) => acc + curr.price, 0);
    const commission = filtered.reduce((acc, curr) => acc + (curr.commissionAmount || (curr.price * 0.15)), 0);
    const captainEarnings = totalFares - commission;

    return {
      count: filtered.length,
      totalFares,
      commission,
      captainEarnings
    };
  };

  const dailyStats = getPeriodStats(0);
  const weeklyStats = getPeriodStats(7);
  const monthlyStats = getPeriodStats(30);

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePricing({
      economyBase,
      economyPerKm,
      premiumBase,
      premiumPerKm,
      scooterBase,
      scooterPerKm
    });
    setPricingSuccess(true);
    setTimeout(() => setPricingSuccess(false), 2000);
  };

  const handleSaveZonePricing = (zoneId: string, basePrice: number, minFare: number) => {
    const updated = updateZonePricing(zoneId, basePrice, minFare);
    setZones(updated);
    setPricingSuccess(true);
    setTimeout(() => setPricingSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col" id="admin-dashboard-root">
      {/* Header */}
      <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between" id="admin-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight">سادات رايد • الإدارة العامة</h1>
            <p className="text-xs text-orange-400 font-medium">لوحة تحكم المدير الرئيسي (Super Admin)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-mono">
            المدير النشط: {admin.name}
          </span>
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="تسجيل الخروج الآمن"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="md:col-span-3 glass-card rounded-3xl p-5 h-fit space-y-4" id="admin-sidebar">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 opacity-60 px-3">القائمة الرئيسية</h3>
          <nav className="flex flex-col gap-1">
            <button
              id="tab-overview-btn"
              onClick={() => setActiveTab('overview')}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-right flex items-center justify-between transition-all ${
                activeTab === 'overview' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>مؤشرات الأداء العامة</span>
              <TrendingUp className="w-4 h-4" />
            </button>

            <button
              id="tab-captains-btn"
              onClick={() => setActiveTab('captains')}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-right flex items-center justify-between transition-all ${
                activeTab === 'captains' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>إدارة الكباتن والسيارات</span>
              <div className="flex items-center gap-1.5">
                {captains.length > 0 && (
                  <span className="bg-white/10 text-orange-400 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-orange-500/20">
                    {captains.length}
                  </span>
                )}
                <Car className="w-4 h-4" />
              </div>
            </button>

            <button
              id="tab-riders-btn"
              onClick={() => setActiveTab('riders')}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-right flex items-center justify-between transition-all ${
                activeTab === 'riders' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>إدارة ركاب المنصة</span>
              <div className="flex items-center gap-1.5">
                {riders.length > 0 && (
                  <span className="bg-white/10 text-orange-400 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-orange-500/20">
                    {riders.length}
                  </span>
                )}
                <Users className="w-4 h-4" />
              </div>
            </button>

            <button
              id="tab-rides-btn"
              onClick={() => setActiveTab('rides')}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-right flex items-center justify-between transition-all ${
                activeTab === 'rides' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>مراقبة الرحلات الحية</span>
              <div className="flex items-center gap-1.5">
                {activeRides.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                    {activeRides.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length}
                  </span>
                )}
                <Navigation className="w-4 h-4" />
              </div>
            </button>

            <button
              id="tab-pricing-btn"
              onClick={() => setActiveTab('pricing')}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-right flex items-center justify-between transition-all ${
                activeTab === 'pricing' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>إعدادات التسعير والتعرفة</span>
              <Settings className="w-4 h-4" />
            </button>
          </nav>

          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2 text-xs text-slate-300 opacity-80 mt-8">
            <div className="flex items-center gap-1.5 text-orange-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>ملاحظة أمان هامة</span>
            </div>
            <p>لا يمكن لأي حساب آخر حذف أو تعديل أو محاكاة صلاحيات حساب Super Admin الخاص بك.</p>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="md:col-span-9 space-y-6">
          
          {/* Overview Dashboard Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6" id="overview-tab-content">
              
              {/* Bento statistics header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-5 space-y-2 animate-fade-in" id="stat-commission">
                  <span className="text-xs text-slate-400 font-bold block">إجمالي أرباح المنصة (15%)</span>
                  <span className="text-2xl font-black text-orange-400 block">{platformRevenue.toFixed(2)} ج.م</span>
                  <span className="text-[10px] text-slate-300 opacity-75 block">من الرحلات المكتملة</span>
                </div>

                <div className="glass-card rounded-2xl p-5 space-y-2" id="stat-active-rides">
                  <span className="text-xs text-slate-400 font-bold block">الرحلات الجارية حالياً</span>
                  <span className="text-2xl font-black text-white block">
                    {activeRides.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length}
                  </span>
                  <span className="text-[10px] text-slate-300 opacity-75 block">قيد التنفيذ والمطابقة</span>
                </div>

                <div className="glass-card rounded-2xl p-5 space-y-2" id="stat-captains">
                  <span className="text-xs text-slate-400 font-bold block">الكباتن المسجلين</span>
                  <span className="text-2xl font-black text-orange-400 block">{captains.length}</span>
                  <span className="text-[10px] text-slate-300 opacity-75 block">كباتن مدينة السادات</span>
                </div>

                <div className="glass-card rounded-2xl p-5 space-y-2" id="stat-riders">
                  <span className="text-xs text-slate-400 font-bold block">الركاب النشطين</span>
                  <span className="text-2xl font-black text-white block">{riders.length}</span>
                  <span className="text-[10px] text-slate-300 opacity-75 block">مستخدمي الخدمة</span>
                </div>
              </div>

              {/* Advanced Period Statistics */}
              <div className="glass-card rounded-3xl p-6 space-y-4" id="advanced-stats-section">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <span>تفاصيل الأرباح وإحصائيات الرحلات الدورية (السادات رايد)</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 opacity-80 mt-1">
                    متابعة وتدقيق الإيرادات وعمولات المنصة وصافي أرباح الكباتن مقسمة زمنياً لليوم، الأسبوع والشهر.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Daily Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-slate-200 text-xs">إحصائيات اليوم (اليومية)</span>
                      <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">اليوم</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>الرحلات المكتملة:</span>
                        <span className="font-bold text-white">{dailyStats.count} مشاوير</span>
                      </div>
                      <div className="flex justify-between">
                        <span>إجمالي حجم التداول:</span>
                        <span className="font-bold text-white">{dailyStats.totalFares} ج.م</span>
                      </div>
                      <div className="flex justify-between text-orange-400">
                        <span>عمولة المنصة الصافية:</span>
                        <span className="font-bold">{dailyStats.commission.toFixed(1)} ج.م</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 border-t border-white/5 pt-1.5 mt-1.5">
                        <span>صافي أرباح الكباتن:</span>
                        <span className="font-bold">{dailyStats.captainEarnings.toFixed(1)} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-slate-200 text-xs">إحصائيات الأسبوع (7 أيام)</span>
                      <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">أسبوعي</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>الرحلات المكتملة:</span>
                        <span className="font-bold text-white">{weeklyStats.count} مشاوير</span>
                      </div>
                      <div className="flex justify-between">
                        <span>إجمالي حجم التداول:</span>
                        <span className="font-bold text-white">{weeklyStats.totalFares} ج.م</span>
                      </div>
                      <div className="flex justify-between text-orange-400">
                        <span>عمولة المنصة الصافية:</span>
                        <span className="font-bold">{weeklyStats.commission.toFixed(1)} ج.م</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 border-t border-white/5 pt-1.5 mt-1.5">
                        <span>صافي أرباح الكباتن:</span>
                        <span className="font-bold">{weeklyStats.captainEarnings.toFixed(1)} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-slate-200 text-xs">إحصائيات الشهر (30 يوم)</span>
                      <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">شهري</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>الرحلات المكتملة:</span>
                        <span className="font-bold text-white">{monthlyStats.count} مشاوير</span>
                      </div>
                      <div className="flex justify-between">
                        <span>إجمالي حجم التداول:</span>
                        <span className="font-bold text-white">{monthlyStats.totalFares} ج.م</span>
                      </div>
                      <div className="flex justify-between text-orange-400">
                        <span>عمولة المنصة الصافية:</span>
                        <span className="font-bold">{monthlyStats.commission.toFixed(1)} ج.م</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 border-t border-white/5 pt-1.5 mt-1.5">
                        <span>صافي أرباح الكباتن:</span>
                        <span className="font-bold">{monthlyStats.captainEarnings.toFixed(1)} ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status information info panel */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-right">
                  <h4 className="font-bold text-white">التحكم في البيئة التجريبية</h4>
                  <p className="text-xs text-slate-300 opacity-80">يمكنك محاكاة تسجيل ركاب وكباتن جدد عبر واجهة المستخدم للتأكد من ربط رحلاتهم ومراقبة حركتها في السادات.</p>
                </div>
                <div className="bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-orange-500/30">
                  خوادم مدينة السادات متصلة ✓
                </div>
              </div>

              {/* Recent activity log */}
              <div className="glass-card rounded-3xl p-6" id="activity-logger">
                <h3 className="font-bold text-white text-sm mb-4">نشاطات النظام الأخيرة</h3>
                {activeRides.length === 0 && registeredUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">لا توجد عمليات جارية حالياً للتسجيل أو التوصيل.</p>
                ) : (
                  <div className="space-y-3">
                    {registeredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10">
                        <span>انضم مستخدم جديد: <strong className="text-white">{user.name}</strong> كـ {user.role === 'rider' ? 'راكب' : 'كابتن'}</span>
                        <span className="text-slate-500">{new Date(user.createdAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    ))}
                    {activeRides.map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10">
                        <span>طلب رحلة من <strong className="text-white">{ride.riderName}</strong> إلى {ride.endLocation}</span>
                        <span className="text-slate-500">{new Date(ride.createdAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Captains Directory Tab */}
          {activeTab === 'captains' && (
            <div className="glass-card rounded-3xl p-6 space-y-6" id="captains-tab-content">
              <div>
                <h3 className="text-lg font-bold text-white">إدارة الكباتن والسائقين</h3>
                <p className="text-xs text-slate-300 opacity-80 mt-1">عرض جميع السائقين ومراجعة تفاصيل سياراتهم المسجلة.</p>
              </div>

              {captains.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  لا يوجد كباتن مسجلين حالياً بالمنصة.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-300 text-xs">
                        <th className="pb-3 pt-2 px-4">اسم الكابتن</th>
                        <th className="pb-3 pt-2 px-4">رقم الهاتف</th>
                        <th className="pb-3 pt-2 px-4">نوع المركبة</th>
                        <th className="pb-3 pt-2 px-4">أرقام اللوحات</th>
                        <th className="pb-3 pt-2 px-4">رصيد الحساب</th>
                        <th className="pb-3 pt-2 px-4">الحالة للعمل</th>
                        <th className="pb-3 pt-2 px-4">التحكم والنشاط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {captains.map((captain) => (
                        <tr key={captain.id} className="hover:bg-white/5">
                          <td className="py-4 px-4 font-semibold text-white">{captain.name}</td>
                          <td className="py-4 px-4 font-mono text-slate-300">{captain.phone}</td>
                          <td className="py-4 px-4 text-slate-300">{captain.carDetails?.model}</td>
                          <td className="py-4 px-4 font-mono text-orange-400">{captain.carDetails?.plate}</td>
                          <td className="py-4 px-4 font-bold text-orange-400">{captain.balance} ج.م</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              captain.isOnline ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-white/5 text-slate-500 border border-white/5'
                            }`}>
                              {captain.isOnline ? 'مستقبل للطلبات' : 'مغلق'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                captain.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {captain.isActive !== false ? 'نشط' : 'موقوف'}
                              </span>
                              <button
                                id={`toggle-active-${captain.id}`}
                                onClick={() => onUpdateUserStatus(captain.id, captain.isActive !== false ? false : true)}
                                className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all ${
                                  captain.isActive !== false 
                                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-900/30' 
                                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-900/30'
                                }`}
                              >
                                {captain.isActive !== false ? 'إيقاف السائق' : 'تفعيل السائق'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Riders Directory Tab */}
          {activeTab === 'riders' && (
            <div className="glass-card rounded-3xl p-6 space-y-6" id="riders-tab-content">
              <div>
                <h3 className="text-lg font-bold text-white">سجل ركاب منصة سادات رايد</h3>
                <p className="text-xs text-slate-300 opacity-80 mt-1">إدارة ومراقبة حسابات العملاء المسجلين والتحقق من أرصدتهم وموثوقية تعاملهم.</p>
              </div>

              {riders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  لا يوجد ركاب مسجلين حالياً.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-300 text-xs">
                        <th className="pb-3 pt-2 px-4">اسم الراكب</th>
                        <th className="pb-3 pt-2 px-4">رقم الهاتف</th>
                        <th className="pb-3 pt-2 px-4">البريد الإلكتروني</th>
                        <th className="pb-3 pt-2 px-4">الرصيد المتوفر</th>
                        <th className="pb-3 pt-2 px-4">التقييم</th>
                        <th className="pb-3 pt-2 px-4">تاريخ الانضمام</th>
                        <th className="pb-3 pt-2 px-4">حالة الحساب والتحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {riders.map((rider) => (
                        <tr key={rider.id} className="hover:bg-white/5">
                          <td className="py-4 px-4 font-semibold text-white">{rider.name}</td>
                          <td className="py-4 px-4 font-mono text-slate-300">{rider.phone}</td>
                          <td className="py-4 px-4 text-slate-300">{rider.email}</td>
                          <td className="py-4 px-4 font-bold text-orange-400">{rider.balance} ج.م</td>
                          <td className="py-4 px-4">⭐ {rider.rating.toFixed(1)}</td>
                          <td className="py-4 px-4 text-xs text-slate-400">
                            {new Date(rider.createdAt).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                rider.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {rider.isActive !== false ? 'نشط' : 'موقوف'}
                              </span>
                              <button
                                id={`toggle-active-rider-${rider.id}`}
                                onClick={() => onUpdateUserStatus(rider.id, rider.isActive !== false ? false : true)}
                                className={`px-2 py-1 text-[11px] font-black rounded-lg transition-all ${
                                  rider.isActive !== false 
                                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-900/30' 
                                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-900/30'
                                }`}
                              >
                                {rider.isActive !== false ? 'إيقاف الراكب' : 'تفعيل الراكب'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Live Rides Monitoring Tab */}
          {activeTab === 'rides' && (
            <div className="glass-card rounded-3xl p-6 space-y-6" id="rides-tab-content">
              <div>
                <h3 className="text-lg font-bold text-white">الرحلات والربط الحي بمدينة السادات</h3>
                <p className="text-xs text-slate-300 opacity-80 mt-1">تتبع كافة الطلبات الجارية، المعلقة والمكتملة داخل النظام مع خيارات التحكم.</p>
              </div>

              {activeRides.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  لا توجد طلبات رحلات نشطة بالمنصة حالياً.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRides.map((ride) => (
                    <div 
                      key={ride.id} 
                      className={`p-5 rounded-2xl border ${
                        ride.status === 'completed' 
                          ? 'bg-white/5 border-white/10' 
                          : ride.status === 'cancelled' 
                            ? 'bg-rose-950/10 border-rose-950/20 text-slate-400' 
                            : 'bg-orange-500/5 border-orange-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                        <span className="font-mono text-xs text-slate-400">كود الرحلة: #{ride.id.split('-')[1]}</span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          ride.status === 'completed' 
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                            : ride.status === 'cancelled' 
                              ? 'bg-rose-950 text-rose-400' 
                              : 'bg-white/10 text-white border border-white/10 animate-pulse'
                        }`}>
                          {ride.status === 'pending' && 'في انتظار كابتن'}
                          {ride.status === 'accepted' && 'تم القبول'}
                          {ride.status === 'arriving' && 'الكابتن وصل'}
                          {ride.status === 'ongoing' && 'في الطريق للوجهة'}
                          {ride.status === 'completed' && 'مكتملة ✓'}
                          {ride.status === 'cancelled' && 'ملغية ✗'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-xs text-slate-400">العميل:</span> <span className="font-semibold text-white">{ride.riderName}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">نقطة الانطلاق:</span> <span className="text-slate-300">{ride.startLocation}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">نقطة الوصول:</span> <span className="text-slate-300">{ride.endLocation}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 sm:border-r sm:border-white/10 sm:pr-4">
                          <div>
                            <span className="text-xs text-slate-400">نوع الخدمة:</span> <span className="font-bold text-orange-400 uppercase">{ride.vehicleType}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">سعر المشوار الصافي:</span> <span className="font-extrabold text-orange-400">{ride.price} ج.م</span>
                          </div>
                          {ride.captainName && (
                            <div>
                              <span className="text-xs text-slate-400">الكابتن:</span> <span className="text-slate-200 font-bold">{ride.captainName} ({ride.captainCar})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Cancel overriding trigger */}
                      {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                        <div className="flex justify-end pt-2 border-t border-white/10">
                          <button
                            id={`cancel-override-${ride.id}`}
                            onClick={() => onCancelRideByAdmin(ride.id)}
                            className="px-4 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-900 text-rose-300 font-bold text-xs rounded-lg transition-all"
                          >
                            إلغاء الرحلة بصفة الإدارة
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing Config Tab */}
          {activeTab === 'pricing' && (
            <div className="glass-card rounded-3xl p-6 space-y-6" id="pricing-tab-content">
              <div>
                <h3 className="text-lg font-bold text-white">إدارة تعرفة وتسعير المناطق والمركبات</h3>
                <p className="text-xs text-slate-300 opacity-80 mt-1">
                  تحديد سعر البداية والحد الأدنى للتسعير لكل منطقة مقسمة بمدينة السادات، بالإضافة للتسعير الأساسي للمركبات.
                </p>
              </div>

              {pricingSuccess && (
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs p-4 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>تم حفظ وتحديث تعريفة أسعار المشاوير والمناطق بنجاح!</span>
                </div>
              )}

              {/* Zone-based Pricing Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-400" />
                  <span>تسعير وتقسيم مناطق السادات</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {zones.map((zone) => (
                    <div key={zone.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                      <div>
                        <span className="font-bold text-orange-400 text-xs block">{zone.name}</span>
                        <p className="text-[10px] text-slate-300 opacity-70 mt-1">
                          المعالم: {zone.landmarks.slice(0, 3).join('، ')}...
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">سعر البداية (ج.م)</label>
                          <input
                            type="number"
                            value={zone.basePrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setZones(prev => prev.map(z => z.id === zone.id ? { ...z, basePrice: val } : z));
                            }}
                            className="block w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-right text-xs focus:outline-none focus:border-orange-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">الحد الأدنى (ج.م)</label>
                          <input
                            type="number"
                            value={zone.minFare}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setZones(prev => prev.map(z => z.id === zone.id ? { ...z, minFare: val } : z));
                            }}
                            className="block w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-right text-xs focus:outline-none focus:border-orange-500/50"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          id={`save-zone-btn-${zone.id}`}
                          onClick={() => handleSaveZonePricing(zone.id, zone.basePrice, zone.minFare)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          حفظ تسعير المنطقة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 my-6" />

              <form onSubmit={handleSavePricing} className="space-y-6">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-orange-400" />
                  <span>عوامل تصفية المركبات والتوصيل</span>
                </h4>
                
                {/* Economy pricing group */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-orange-400 flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    <span>ملاكي اقتصادية (Economy)</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 opacity-80 mb-1">التعرفة الأساسية لفتح العداد (ج.م)</label>
                      <input
                        id="pricing-economy-base"
                        type="number"
                        value={economyBase}
                        onChange={(e) => setEconomyBase(parseFloat(e.target.value))}
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 opacity-80 mb-1">سعر المتر/الكيلومتر الإضافي (ج.م)</label>
                      <input
                        id="pricing-economy-km"
                        type="number"
                        step="0.1"
                        value={economyPerKm}
                        onChange={(e) => setEconomyPerKm(parseFloat(e.target.value))}
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Premium pricing group */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-orange-400 flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    <span>ملاكي ممتازة (Premium)</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 opacity-80 mb-1">التعرفة الأساسية لفتح العداد (ج.م)</label>
                      <input
                        id="pricing-premium-base"
                        type="number"
                        value={premiumBase}
                        onChange={(e) => setPremiumBase(parseFloat(e.target.value))}
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 opacity-80 mb-1">سعر المتر/الكيلومتر الإضافي (ج.م)</label>
                      <input
                        id="pricing-premium-km"
                        type="number"
                        step="0.1"
                        value={premiumPerKm}
                        onChange={(e) => setPremiumPerKm(parseFloat(e.target.value))}
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Scooter pricing group */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-orange-400 flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    <span>سكوتر سريع (Scooter)</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 opacity-80 mb-1">التعرفة الأساسية لفتح العداد (ج.م)</label>
                      <input
                        id="pricing-scooter-base"
                        type="number"
                        value={scooterBase}
                        onChange={(e) => setScooterBase(parseFloat(e.target.value))}
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 opacity-80 mb-1">سعر المتر/الكيلومتر الإضافي (ج.م)</label>
                      <input
                        id="pricing-scooter-km"
                        type="number"
                        step="0.1"
                        value={scooterPerKm}
                        onChange={(e) => setScooterPerKm(parseFloat(e.target.value))}
                        className="block w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                <button
                  id="save-pricing-btn"
                  type="submit"
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  تحديث وحفظ كافة أسعار وخصائص المركبات
                </button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
