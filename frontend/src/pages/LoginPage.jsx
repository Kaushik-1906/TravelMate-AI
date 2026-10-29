import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AlertBanner from '../components/AlertBanner';

export default function LoginPage() {
  const { login, loginWithDemo, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');

  const finishLogin = () => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      finishLogin();
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    try {
      loginWithDemo();
      finishLogin();
    } catch (err) {
      setError(err.message || 'Demo login is unavailable.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md bg-surface rounded-3xl p-8 border border-navy-100 shadow-card">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy-950">Welcome Back</h2>
          <p className="text-xs text-navy-500 mt-1">
            Access your saved itineraries and personalized dashboard
          </p>
        </div>

        {notice && (
          <div className="mb-4">
            <AlertBanner type="info" message={notice} onClose={() => setNotice('')} />
          </div>
        )}

        {!isConfigured && (
          <div className="mb-6 p-4 rounded-2xl bg-primary-50/70 border border-primary-200/80 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary-900">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span>Local Demo Mode</span>
            </div>
            <p className="text-[11px] text-navy-600 leading-tight">
              Supabase is not configured. Use a demo session to explore the full app; data is stored
              in the backend's local demo store.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full mt-1 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Continue as Demo Traveler</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4">
            <AlertBanner type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-navy-100" />
          <span className="flex-shrink mx-4 text-navy-400 text-xs uppercase font-medium">
            {isConfigured ? 'Sign in with email' : 'Or use email in demo mode'}
          </span>
          <div className="flex-grow border-t border-navy-100" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-navy-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
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
            <label htmlFor="login-password" className="block text-xs font-semibold text-navy-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-navy-500 mt-6">
          Don't have an account yet?{' '}
          <Link to="/signup" state={location.state} className="font-semibold text-primary-600 hover:text-primary-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
