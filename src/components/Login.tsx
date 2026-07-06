import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { hashPassword } from '../utils/crypto';
import { User as UserType } from '../types';
import { findUserByCredentials } from '../utils/db';

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
              <label className="block text-sm font-semibold text-slate-200 mb-1.5 pr-1">
                كلمة المرور
              </label>
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
      </motion.div>
    </div>
  );
}
