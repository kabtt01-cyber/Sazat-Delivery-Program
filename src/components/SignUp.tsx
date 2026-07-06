import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Phone, Car, Compass, ArrowRight, ShieldCheck, Check, Lock, AlertCircle } from 'lucide-react';
import { User as UserType, VehicleType } from '../types';
import { findUserByCredentials } from '../utils/db';

interface SignUpProps {
  onSignUpSuccess: (user: UserType, password?: string) => void;
  onNavigateToLogin: () => void;
}

export default function SignUp({ onSignUpSuccess, onNavigateToLogin }: SignUpProps) {
  const [role, setRole] = useState<'rider' | 'captain'>('rider');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Captain fields
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carColor, setCarColor] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('economy');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Validation: Name (At least triple name - 3 words)
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length < 3) {
        setError('يرجى إدخال الاسم ثلاثياً بالكامل (مثال: أحمد محمد علي).');
        setIsLoading(false);
        return;
      }

      // 2. Validation: Egyptian Mobile Phone
      const egPhoneRegex = /^01[0125][0-9]{8}$/;
      if (!egPhoneRegex.test(phone.trim())) {
        setError('يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010، 011، 012، أو 015).');
        setIsLoading(false);
        return;
      }

      // 3. Validation: Email format if entered
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('يرجى إدخال بريد إلكتروني صحيح أو تركه فارغاً.');
        setIsLoading(false);
        return;
      }

      // 4. Validation: Password strength
      if (password.length < 6) {
        setError('يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أرقام على الأقل.');
        setIsLoading(false);
        return;
      }

      // 5. Validation: Password Match
      if (password !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين.');
        setIsLoading(false);
        return;
      }

      // 6. Validation: Captain-specific vehicle details
      if (role === 'captain') {
        if (!carModel.trim()) {
          setError('يرجى إدخال موديل وسنة صنع السيارة.');
          setIsLoading(false);
          return;
        }
        if (!carPlate.trim()) {
          setError('يرجى إدخال رقم لوحة السيارة الحقيقي.');
          setIsLoading(false);
          return;
        }
        if (!carColor.trim()) {
          setError('يرجى إدخال لون السيارة.');
          setIsLoading(false);
          return;
        }
      }

      // 7. Validation: DB uniqueness checks (Real-time DB query)
      const existingPhone = await findUserByCredentials(phone.trim());
      if (existingPhone) {
        setError('رقم الهاتف هذا مسجل بالفعل بحساب آخر.');
        setIsLoading(false);
        return;
      }

      if (email.trim()) {
        const existingEmail = await findUserByCredentials(email.trim());
        if (existingEmail) {
          setError('البريد الإلكتروني هذا مسجل بالفعل بحساب آخر.');
          setIsLoading(false);
          return;
        }
      }

      const newUser: UserType = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || `${phone.trim()}@sadatride.com`,
        role: role,
        rating: 5.0,
        balance: role === 'rider' ? 250 : 0, // start riders with initial credits
        createdAt: new Date().toISOString(),
        ...(role === 'captain' && {
          carDetails: {
            model: carModel,
            plate: carPlate,
            color: carColor,
          },
          isOnline: false,
        }),
      };

      setSuccess(true);
      setTimeout(() => {
        onSignUpSuccess(newUser, password);
        setIsLoading(false);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg glass-card rounded-3xl overflow-hidden"
        id="signup-card"
      >
        <div className="p-8">
          {/* Back button */}
          <button
            id="back-to-login-btn"
            onClick={onNavigateToLogin}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors mb-6 cursor-pointer opacity-85 hover:opacity-100"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لتسجيل الدخول</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">إنشاء حساب <span className="text-orange-500">جديد</span></h2>
            <p className="mt-2 text-sm text-slate-300 opacity-80">انضم إلى شبكة سادات رايد واستمتع بأفضل تجربة نقل</p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 text-center"
              id="signup-success-view"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-white">تم إنشاء الحساب بنجاح!</h3>
              <p className="text-sm text-slate-300 mt-2 opacity-80">جاري الانتقال إلى لوحة التحكم الخاصة بك...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2 text-center">
                  اختر نوع الحساب
                </label>
                <div className="grid grid-cols-2 gap-3" id="role-selector-container">
                  <button
                    id="role-rider-btn"
                    type="button"
                    onClick={() => setRole('rider')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      role === 'rider'
                        ? 'border-orange-500 bg-white/10 text-white font-bold shadow-lg shadow-orange-500/10'
                        : 'border-white/10 hover:border-white/25 text-slate-300 bg-white/5'
                    }`}
                  >
                    <User className="w-6 h-6 mb-1.5" />
                    <span className="text-sm">راكب (طلب رحلة)</span>
                  </button>

                  <button
                    id="role-captain-btn"
                    type="button"
                    onClick={() => setRole('captain')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      role === 'captain'
                        ? 'border-orange-500 bg-white/10 text-white font-bold shadow-lg shadow-orange-500/10'
                        : 'border-white/10 hover:border-white/25 text-slate-300 bg-white/5'
                    }`}
                  >
                    <Car className="w-6 h-6 mb-1.5" />
                    <span className="text-sm">كابتن (تقديم رحلة)</span>
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-2 bg-rose-500/10 text-rose-200 text-sm p-4 rounded-xl border border-rose-500/30"
                  id="signup-error-alert"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Common Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">الاسم الكامل</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="الأسم الثلاثي بالكامل"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">رقم الهاتف</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input
                      id="signup-phone-input"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right text-left-direction"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">البريد الإلكتروني (اختياري)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="signup-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5 pr-1">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-confirm-password-input"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5 pr-1">كلمة المرور</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-password-input"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Captain details */}
              <AnimatePresence mode="wait">
                {role === 'captain' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 border-t border-white/10 pt-5 mt-5"
                    id="captain-details-section"
                  >
                    <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                      <Car className="w-5 h-5 text-orange-500" />
                      <span>تفاصيل المركبة</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">نوع المركبة</label>
                        <select
                          id="signup-vehicle-type"
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                          className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white text-right text-sm"
                        >
                          <option value="economy" className="bg-slate-900 text-white">ملاكي اقتصادية</option>
                          <option value="premium" className="bg-slate-900 text-white">ملاكي ممتازة</option>
                          <option value="scooter" className="bg-slate-900 text-white">سكوتر</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">موديل السيارة / السنة</label>
                        <input
                          id="signup-car-model"
                          type="text"
                          required={role === 'captain'}
                          value={carModel}
                          onChange={(e) => setCarModel(e.target.value)}
                          placeholder="مثال: هيونداي إلنترا 2021"
                          className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 text-right text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">رقم اللوحة</label>
                        <input
                          id="signup-car-plate"
                          type="text"
                          required={role === 'captain'}
                          value={carPlate}
                          onChange={(e) => setCarPlate(e.target.value)}
                          placeholder="مثال: أ ب ج 1 2 3"
                          className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 text-right text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 pr-1">لون المركبة</label>
                        <input
                          id="signup-car-color"
                          type="text"
                          required={role === 'captain'}
                          value={carColor}
                          onChange={(e) => setCarColor(e.target.value)}
                          placeholder="مثال: فضي"
                          className="block w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 text-right text-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password notice */}
              <div className="flex gap-2 items-center text-xs text-slate-300 bg-white/5 p-3.5 rounded-xl border border-white/10">
                <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0" />
                <span>جميع كلمات المرور يتم تشفيرها وحفظها بأمان داخل قاعدة بيانات Supabase.</span>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 hover:shadow-orange-500/30 transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'تأكيد وإنشاء الحساب'
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
