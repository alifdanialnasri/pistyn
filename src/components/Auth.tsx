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
    <div className="min-h-screen flex items-center justify-center bg-carbon-black bg-carbon px-4 py-12">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-[500px] bg-racing-red blur-[150px]"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-[500px] bg-red-800 blur-[150px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md racing-panel p-8 rounded-2xl relative z-10"
      >
        <div className="flex justify-center mb-6 cursor-pointer select-none" onClick={handleSecretTap}>
          <div className="w-12 h-12 bg-racing-red flex items-center justify-center font-bold text-3xl italic skew-x-[-15deg]">P</div>
        </div>
        <h1 className="text-3xl font-bold text-center italic tracking-tighter uppercase mb-2">Pistyn</h1>
        <p className="text-gray-500 text-center mb-8 text-[10px] tracking-widest uppercase">Performance Maintenance Hub</p>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-racing-red/10 border border-racing-red/20 p-3 rounded-lg flex items-start gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 text-racing-red shrink-0 mt-0.5" />
                <p className="text-[10px] text-racing-red font-mono uppercase leading-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 focus:border-racing-red focus:outline-none transition-all text-sm"
              placeholder="driver@pistyn.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 focus:border-racing-red focus:outline-none transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full racing-button flex items-center justify-center gap-2 py-4 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Initialize Account' : 'Authenticate')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-white/5"></div>
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">OR</span>
          <div className="h-px flex-1 bg-white/5"></div>
        </div>
        
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-4 bg-white/5 text-white border border-white/10 font-bold py-3 rounded-lg hover:bg-white/10 transition-all group overflow-hidden relative"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" />
          <span className="text-xs uppercase tracking-wider">Fast-track with Google</span>
          <div className="absolute bottom-0 left-0 h-0.5 bg-racing-red w-0 group-hover:w-full transition-all duration-300"></div>
        </button>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[10px] font-mono text-gray-500 hover:text-white uppercase tracking-widest transition-colors underline underline-offset-4"
          >
            {isRegistering ? 'Existing Operator? Login' : 'New Member? Register'}
          </button>
        </div>
        
        <div className="mt-10 grid grid-cols-4 gap-1 h-0.5 opacity-10">
          <div className="bg-racing-red"></div>
          <div className="bg-white"></div>
          <div className="bg-racing-red"></div>
          <div className="bg-white"></div>
        </div>
      </motion.div>
    </div>
  );
}
