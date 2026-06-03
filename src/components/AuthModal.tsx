import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Chrome
} from 'lucide-react';
import { signIn, signUpWithEmail, signInWithEmail } from '../firebase';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialMode = 'login' 
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        if (!name) throw new Error('Name is required');
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError(t('emailInUse', 'Email already in use'));
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError(t('invalidCredentials', 'Invalid email or password'));
      } else if (err.code === 'auth/weak-password') {
        setError(t('weakPassword', 'Password should be at least 6 characters'));
      } else {
        setError(err.message || 'An error occurred during authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          {/* Header Image/Pattern */}
          <div className="h-32 bg-stone-900 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-400 via-transparent to-transparent scale-150" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <ShieldCheck className="w-10 h-10 text-stone-100 mb-2" />
              <h2 className="text-white font-display font-medium tracking-tight text-xl">
                {mode === 'login' ? t('login', 'Login') : t('createAccount', 'Create Account')}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-90 text-white rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 pb-12">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 text-sm border border-red-100"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-1">{t('fullName', 'Full Name')}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="text"
                      required={mode === 'signup'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Abebe Bikila"
                      className="w-full pl-11 pr-4 py-3.5 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-1">{t('email', 'Email')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('password', 'Password')}</label>
                  {mode === 'login' && (
                    <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-stone-900 hover:underline">
                      {t('forgotPassword', 'Forgot?')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all outline-none text-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('login', 'Login')}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {t('signup', 'Sign Up')}
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="bg-white px-4 text-stone-400 font-display">{t('or', 'Or continue with')}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-4 bg-white border border-stone-100 text-stone-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Chrome className="w-4 h-4 text-stone-900" />
              {t('signInWithGoogle', 'Sign In with Google')}
            </button>

            <p className="text-center mt-10 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
              {mode === 'login' ? t('noAccount', "Don't have an account?") : t('hasAccount', "Already have an account?")}{' '}
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-stone-900 hover:underline inline-flex items-center gap-1"
              >
                {mode === 'login' ? t('signup', 'Sign Up') : t('login', 'Login')}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
