import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AlertBanner from '../components/AlertBanner';

export default function SignupPage() {
  const { signup, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const data = await signup(email, password, fullName);
      if (isConfigured && !data.session) {
        setSuccess('Account created. Check your email to confirm your address, then sign in.');
        return;
      }
      const returnTo = location.state?.returnTo;
      if (returnTo && location.state?.itinerary) {
        navigate(returnTo, {
          replace: true,
          state: {
            itinerary: location.state.itinerary,
            tripParams: location.state.tripParams,
          },
        });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md bg-surface rounded-3xl p-8 border border-navy-100 shadow-card">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy-950">Create Your Account</h2>
          <p className="text-xs text-navy-500 mt-1">
            Start generating and saving personalized AI travel itineraries
          </p>
        </div>

        {success && <div className="mb-4"><AlertBanner type="success" message={success} /></div>}
        {error && (
          <div className="mb-4">
            <AlertBanner type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="block text-xs font-semibold text-navy-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-navy-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-navy-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-navy-400 mt-1">
              {isConfigured ? 'Use at least 6 characters. Supabase handles secure hashing.' : 'Demo mode accepts any password of 6+ characters.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Sign Up Free</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-navy-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-primary-600 hover:text-primary-700">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
