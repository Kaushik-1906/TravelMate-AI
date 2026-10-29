import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, DollarSign, Compass, Heart, Save, LogOut, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CURRENCIES, TRAVEL_STYLES, INTEREST_OPTIONS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

export default function ProfilePage() {
  const { user, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [defaultTravelStyle, setDefaultTravelStyle] = useState('balanced');
  const [defaultInterests, setDefaultInterests] = useState(['culture', 'food']);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await api.getProfile();
        if (data) {
          setPreferredCurrency(data.preferred_currency || 'USD');
          setDefaultTravelStyle(data.default_travel_style || 'balanced');
          setDefaultInterests(data.default_interests || ['culture', 'food']);
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const toggleInterest = (id) => {
    setDefaultInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateProfile({
        preferred_currency: preferredCurrency,
        default_travel_style: defaultTravelStyle,
        default_interests: defaultInterests,
      });
      setSuccessMsg('Profile preferences updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner title="Loading preferences..." subtitle="Retrieving profile configuration" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
          Profile & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-navy-500 mt-1">
          Customize your default travel styles, interests, and preferred currencies
        </p>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      {error && <AlertBanner type="error" message={error} onClose={() => setError('')} />}

      {isDemoMode && (
        <AlertBanner
          type="info"
          message="Local demo mode: Supabase is not configured, so profile preferences are stored in the backend process memory and reset when it restarts."
        />
      )}

      {/* Account Info Card */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-navy-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">
                {user?.user_metadata?.full_name || 'Traveler Account'}
              </h3>
              <p className="text-xs text-navy-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email || 'traveler@travelmate.ai'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Preferences Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1.5">
              Preferred Currency
            </label>
            <select
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-surface"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Default Travel Style */}
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1.5">
              Default Travel Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TRAVEL_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setDefaultTravelStyle(style.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    defaultTravelStyle === style.id
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-background border-navy-200 text-navy-700 hover:bg-navy-50'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Interests */}
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1.5">
              Default Interests
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = defaultInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-background border-navy-200 text-navy-700 hover:border-navy-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-navy-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
