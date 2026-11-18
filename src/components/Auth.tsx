import { useState, FormEvent } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { handleSecretTap } from '../lib/demoConfig';
import { inputClass } from './ui';

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setError('Verification email sent! Please check your inbox before logging in.');
        setIsRegistering(false);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-carbon-black bg-carbon px-5 py-12 pt-[calc(3rem+env(safe-area-inset-top,0px))]">
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-racing-red/15 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-racing-red flex items-center justify-center font-bold text-3xl italic mb-5 cursor-pointer select-none shadow-lg shadow-racing-red/30" onClick={handleSecretTap}>
            <span className="-skew-x-12">P</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-gray-400 mt-2">Your car's service book, in your pocket.</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="h-px flex-1 bg-white/10"></div>
          <span className="text-sm text-gray-500">or use email</span>
          <div className="h-px flex-1 bg-white/10"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-racing-red/10 p-3 rounded-2xl flex items-start gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 text-racing-red shrink-0 mt-0.5" />
                <p className="text-sm text-racing-red">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            required
            autoComplete="email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="Email"
          />
          <input
            type="password"
            required
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full racing-button flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Just a sec…' : (isRegistering ? 'Create account' : 'Sign in')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          {isRegistering ? 'Already have an account?' : 'New to Pistyn?'}{' '}
          <button onClick={() => setIsRegistering(!isRegistering)} className="font-semibold text-white active:opacity-60">
            {isRegistering ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
