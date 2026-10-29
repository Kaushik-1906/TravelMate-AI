import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, MapPin, Calendar, User, LogOut, Menu, X, Sparkles, FolderHeart, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle({ iconClassName = 'w-4 h-4' }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="p-2 rounded-lg text-navy-500 hover:text-navy-900 hover:bg-navy-100 transition-colors"
    >
      {isDark ? <Sun className={iconClassName} /> : <Moon className={iconClassName} />}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-navy-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight text-navy-900 group-hover:text-primary-700 transition-colors">
                TravelMate<span className="text-primary-600">.ai</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-navy-400">Personalized Itineraries</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/plan"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/plan')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
              }`}
            >
              Trip Planner
            </Link>

            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/saved-trips"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/saved-trips')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                  }`}
                >
                  Saved Trips
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-navy-200 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:border-navy-300 transition-all"
                >
                  <User className="w-4 h-4 text-primary-600" />
                  <span className="max-w-[120px] truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-navy-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-navy-700 hover:text-navy-900 hover:bg-navy-100 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/plan"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Plan My Trip</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle iconClassName="w-5 h-5" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-navy-600 hover:bg-navy-100"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-navy-100 bg-surface px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/plan"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-navy-700 hover:bg-navy-50"
          >
            Trip Planner
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-navy-700 hover:bg-navy-50"
              >
                Dashboard
              </Link>
              <Link
                to="/saved-trips"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-navy-700 hover:bg-navy-50"
              >
                Saved Trips
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-navy-700 hover:bg-navy-50"
              >
                Profile & Settings
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 border-t border-navy-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium border border-navy-200 text-navy-800"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
