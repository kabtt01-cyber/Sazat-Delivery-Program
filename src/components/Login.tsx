import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { hashPassword } from '../utils/crypto';
import { User as UserType } from '../types';
import { findUserByCredentials, updateUserPassword } from '../utils/db';

interface LoginProps {
  onLoginSuccess: (user: UserType) => void;
  onNavigateToSignUp: () => void;
  registeredUsers: UserType[];
}

export default function Login({ onLoginSuccess, onNavigateToSignUp, registeredUsers }: LoginProps) {
  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recovery States
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryName, setRecoveryName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Give a slight delay for aesthetic animation
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const trimmedInput = usernameOrPhone.trim();
      const trimmedPassword = password;

      // Fetch user and password hash from the real database
      const dbResult = await findUserByCredentials(trimmedInput);

      if (dbResult) {
        const { user, passwordHash } = dbResult;
        
        // Encrypt the input password using SHA-256
        const inputHash = await hashPassword(trimmedPassword);

        // Verify if hashes match
        if (inputHash === passwordHash) {
          onLoginSuccess(user);
          setIsLoading(false);
          return;
        }
      }

      // Show friendly error
      setError('بيانات الدخول غير صحيحة. يرجى التحقق من اسم المستخدم/الهاتف وكلمة المرور.');
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول. حاول مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoverySuccess('');
    setIsLoading(true);

    try {
      // 1. Validation: Egyptian Mobile Phone
      const egPhoneRegex = /^01[0125][0-9]{8}$/;
      if (!egPhoneRegex.test(recoveryPhone.trim())) {
        setError('يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010، 011، 012، أو 015).');
        setIsLoading(false);
        return;
      }

      // 2. Validate Name
      if (recoveryName.trim().length < 3) {
        setError('يرجى إدخال الاسم الثلاثي الصحيح للتحقق.');
        setIsLoading(false);
        return;
      }

      // 3. Validate new password strength
      if (newPassword.length < 6) {
        setError('يجب أن تكون كلمة المرور الجديدة مكونة من 6 أحرف أو أرقام على الأقل.');
        setIsLoading(false);
        return;
      }

      // 4. Match new password
      if (newPassword !== confirmNewPassword) {
        setError('كلمتا المرور غير متطابقتين.');
        setIsLoading(false);
        return;
      }

      // 5. Query DB for user
      const dbResult = await findUserByCredentials(recoveryPhone.trim());
      if (!dbResult) {
        setError('رقم الهاتف هذا غير مسجل لدينا، يرجى التأكد منه أو إنشاء حساب جديد.');
        setIsLoading(false);
        return;
      }

      // 6. Verify Name matches (loose matching to ensure easy entry, e.g. first name matching)
      const inputNameNorm = recoveryName.trim().toLowerCase();
      const dbNameNorm = dbResult.user.name.trim().toLowerCase();
      
      const inputParts = inputNameNorm.split(/\s+/);
      const isNameMatch = inputParts.some(part => dbNameNorm.includes(part)) && inputNameNorm.length >= 3;

      if (!isNameMatch) {
        setError('الاسم الكامل غير متطابق مع بيانات هذا الحساب لمزيد من الأمان.');
        setIsLoading(false);
        return;
      }

      // 7. Update user password in DB
      await updateUserPassword(dbResult.user.id, newPassword);

      setRecoverySuccess('تم تحديث كلمة المرور بنجاح! جاري العودة لصفحة الدخول...');
      setRecoveryPhone('');
      setRecoveryName('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      setTimeout(() => {
        setIsRecovering(false);
        setRecoverySuccess('');
      }, 2500);

    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء استعادة كلمة المرور، يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md glass-card rounded-3xl overflow-hidden"
        id="login-card"
      >
        <div className="p-8">
          {isRecovering ? (
            <div>
              {/* Recovery Back Button */}
              <button
                id="back-to-login-from-recovery"
                onClick={() => {
                  setIsRecovering(false);
                  setError('');
                  setRecoverySuccess('');
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors mb-6 cursor-pointer opacity-85 hover:opacity-100"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لتسجيل الدخول</span>
              </button>

              {/* Recovery Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/30 shadow-lg mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">استعادة كلمة <span className="text-orange-500">المرور</span></h2>
                <p className="mt-2 text-sm text-slate-300 opacity-80">يرجى إدخال بيانات حسابك لتحديث كلمة المرور بشكل آمن</p>
              </div>

              {/* Recovery Form */}
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-2 bg-rose-500/10 text-rose-200 text-sm p-4 rounded-xl border border-rose-500/30"
                    id="recovery-error-alert"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {recoverySuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-2 bg-emerald-500/10 text-emerald-200 text-sm p-4 rounded-xl border border-emerald-500/30"
                    id="recovery-success-alert"
                  >
                    <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{recoverySuccess}</span>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">
                    رقم الهاتف المسجل
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="recovery-phone-input"
                      type="tel"
                      required
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">
                    الاسم الكامل المسجل (للتحقق)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="recovery-name-input"
                      type="text"
                      required
                      value={recoveryName}
                      onChange={(e) => setRecoveryName(e.target.value)}
                      placeholder="أدخل اسمك الكامل كما سجلته"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="recovery-new-password"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="recovery-confirm-password"
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pr-10 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <button
                  id="recovery-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'تحديث كلمة المرور'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 mb-4">
                  <Car className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">سادات <span className="text-orange-500">رايد</span></h2>
                <p className="mt-2 text-sm text-slate-300 opacity-80">رحلتك الآمنة والمريحة داخل مدينة السادات</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-2 bg-rose-500/10 text-rose-200 text-sm p-4 rounded-xl border border-rose-500/30"
                    id="login-error-alert"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">
                    رقم الهاتف أو البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="login-username-input"
                      type="text"
                      required
                      value={usernameOrPhone}
                      onChange={(e) => setUsernameOrPhone(e.target.value)}
                      placeholder="مثال: Ahmed أو 010xxxxxxxx"
                      className="block w-full pr-10 pl-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <button
                      id="forgot-password-btn"
                      type="button"
                      onClick={() => {
                        setIsRecovering(true);
                        setError('');
                        setRecoverySuccess('');
                      }}
                      className="text-xs text-orange-500 hover:text-orange-400 font-semibold focus:outline-none transition-colors"
                    >
                      هل نسيت كلمة المرور؟
                    </button>
                    <label className="block text-sm font-semibold text-slate-200">
                      كلمة المرور
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 opacity-60">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pr-10 pl-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 text-white placeholder-slate-400 transition-all text-right"
                    />
                    <button
                      id="toggle-password-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-300 hover:text-white focus:outline-none opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 hover:shadow-orange-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'تسجيل الدخول'
                  )}
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center text-sm border-t border-white/10 pt-6">
                <span className="text-slate-300">ليس لديك حساب؟</span>{' '}
                <button
                  id="goto-signup-btn"
                  onClick={onNavigateToSignUp}
                  className="font-bold text-orange-500 hover:text-orange-400 focus:outline-none transition-colors"
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
