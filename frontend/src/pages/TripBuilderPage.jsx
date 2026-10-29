import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, Sparkles, MapPin, Calendar, DollarSign, Users, Check, ArrowRight, ShieldAlert, Heart, Info, Clock, AlertCircle } from 'lucide-react';
import { CURRENCIES, TRAVEL_STYLES, INTEREST_OPTIONS, DAILY_PACES, POPULAR_DESTINATIONS } from '../utils/constants';
import { formatCurrency, getDaysCount } from '../utils/formatters';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

export default function TripBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Helper default dates: 14 days from now, duration 4 days
  const defaultStart = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    destination: searchParams.get('destination') || '',
    start_date: defaultStart,
    end_date: defaultEnd,
    budget: 1500,
    currency: 'USD',
    travelers_count: 2,
    travel_style: 'balanced',
    interests: ['culture', 'food', 'sightseeing'],
    daily_pace: 'balanced',
    accommodation_pref: 'Boutique Hotel / Central Stay',
    transportation_pref: 'Public Transit & Walking',
    dietary_pref: '',
    accessibility_req: '',
    additional_instructions: '',
  });

  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');

  // Update destination if URL query changes
  useEffect(() => {
    const dest = searchParams.get('destination');
    if (dest) {
      setFormData((prev) => ({ ...prev, destination: dest }));
    }
  }, [searchParams]);

  // Apply saved profile defaults once for signed-in users.
  const profileAppliedRef = useRef(false);
  useEffect(() => {
    if (!user || profileAppliedRef.current) return;
    profileAppliedRef.current = true;
    api
      .getProfile()
      .then((profile) => {
        setFormData((prev) => ({
          ...prev,
          currency: profile?.preferred_currency || prev.currency,
          travel_style: profile?.default_travel_style || prev.travel_style,
          interests:
            Array.isArray(profile?.default_interests) && profile.default_interests.length > 0
              ? profile.default_interests
              : prev.interests,
        }));
      })
      .catch(() => {
        // Profile defaults are optional; keep the form usable if unavailable.
      });
  }, [user]);

  const today = new Date().toISOString().split('T')[0];

  const toggleInterest = (id) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(id);
      return {
        ...prev,
        interests: exists ? prev.interests.filter((i) => i !== id) : [...prev.interests, id],
      };
    });
  };

  const daysCount = getDaysCount(formData.start_date, formData.end_date);
  const dailyBudget = daysCount > 0 ? Math.round(formData.budget / daysCount) : 0;

  const validateForm = () => {
    if (!formData.destination.trim()) {
      return 'Please enter a destination city, region, or country.';
    }
    if (!formData.start_date || !formData.end_date) {
      return 'Please select both trip start and end dates.';
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      return 'End date cannot be earlier than start date.';
    }
    if (daysCount > 30) {
      return 'Trips longer than 30 days should be planned in separate segments for optimal accuracy.';
    }
    if (!formData.budget || formData.budget <= 0) {
      return 'Please enter a valid trip budget greater than 0.';
    }
    if (formData.budget > 100000000) {
      return 'Please enter a more realistic trip budget.';
    }
    if (!formData.travelers_count || formData.travelers_count < 1 || formData.travelers_count > 50) {
      return 'Traveler count must be between 1 and 50.';
    }
    if (!Number.isInteger(Number(formData.travelers_count))) {
      return 'Traveler count must be a whole number.';
    }
    return null;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');

    const error = validateForm();
    if (error) {
      setValidationError(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      // Call backend generation endpoint
      const itinerary = await api.generateItinerary(formData);

      // Navigate to Itinerary View with generated state
      navigate('/itinerary/preview', {
        state: {
          itinerary,
          tripParams: formData,
        },
      });
    } catch (err) {
      setApiError(err.message || 'Failed to generate itinerary. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <LoadingSpinner
          title={`Crafting your personalized trip to ${formData.destination}...`}
          subtitle={`Calculating a ${daysCount}-day itinerary for ${formData.travelers_count} traveler(s) with ${formData.travel_style} pacing.`}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-50 text-xs font-semibold text-primary-700 border border-primary-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart Trip Builder</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
          Where would you like to explore?
        </h1>
        <p className="text-xs sm:text-sm text-navy-500 leading-relaxed">
          Provide your preferences below to let our AI design an optimal, day-by-day travel plan.
        </p>
      </div>

      {validationError && (
        <AlertBanner type="warning" message={validationError} onClose={() => setValidationError('')} />
      )}
      {apiError && (
        <AlertBanner type="error" message={apiError} onClose={() => setApiError('')} />
      )}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Sections */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section 1: Destination & Dates */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-6">
            <div className="border-b border-navy-100 pb-3">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span>1. Destination & Dates</span>
              </h2>
            </div>

            {/* Destination Input */}
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1.5">
                Destination City, Region, or Country *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Kyoto, Japan or Florence, Italy"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>

              {/* Quick Picks */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-navy-500">
                <span className="font-medium mr-1">Popular:</span>
                {POPULAR_DESTINATIONS.slice(0, 5).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, destination: p.name })}
                    className="px-2.5 py-1 rounded-full bg-navy-50 hover:bg-primary-50 hover:text-primary-700 border border-navy-100 transition-colors"
                  >
                    {p.name.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1.5">Start Date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    min={today}
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1.5">End Date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    min={formData.start_date || today}
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Budget & Travelers */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-6">
            <div className="border-b border-navy-100 pb-3">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-600" />
                <span>2. Budget & Party Size</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Budget */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-navy-700 mb-1.5">Total Budget *</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1.5">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-surface"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Travelers Count */}
            <div>
              <label htmlFor="travelers-count" className="block text-xs font-semibold text-navy-700 mb-1.5">
                Number of Travelers
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({ ...formData, travelers_count: num })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      formData.travelers_count === num
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'border-navy-200 text-navy-700 hover:bg-navy-50'
                    }`}
                  >
                    {num === 1 ? 'Solo' : num === 2 ? 'Couple' : `${num}`}
                  </button>
                ))}
                <div className="relative w-24 shrink-0">
                  <Users className="w-3.5 h-3.5 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="travelers-count"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.travelers_count}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        travelers_count: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                    title="Travelers (1-50)"
                  />
                </div>
              </div>
              <p className="text-[11px] text-navy-400 mt-1.5">Groups of up to 50 travelers are supported.</p>
            </div>
          </div>

          {/* Section 3: Style & Daily Pace */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-6">
            <div className="border-b border-navy-100 pb-3">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary-600" />
                <span>3. Travel Style & Pace</span>
              </h2>
            </div>

            {/* Travel Style Cards */}
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-2">Travel Style</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRAVEL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, travel_style: style.id })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      formData.travel_style === style.id
                        ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-1 ring-primary-500'
                        : 'border-navy-100 hover:border-navy-200 bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-navy-900">{style.label}</span>
                      {formData.travel_style === style.id && (
                        <Check className="w-4 h-4 text-primary-600 stroke-[3]" />
                      )}
                    </div>
                    <p className="text-xs text-navy-500 leading-relaxed">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Pace */}
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-2">Daily Activity Pace</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DAILY_PACES.map((pace) => (
                  <button
                    key={pace.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, daily_pace: pace.id })}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formData.daily_pace === pace.id
                        ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-500'
                        : 'border-navy-100 bg-background hover:border-navy-200'
                    }`}
                  >
                    <span className="font-bold text-xs text-navy-900 block mb-1">{pace.label}</span>
                    <span className="text-[11px] text-navy-500 leading-tight block">{pace.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Interests Multi-Select */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-4">
            <div className="border-b border-navy-100 pb-3">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary-600" />
                <span>4. Interests & Passions (Select all that apply)</span>
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
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

          {/* Section 5: Additional Preferences */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-4">
            <div className="border-b border-navy-100 pb-3">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-600" />
                <span>5. Dietary, Accessibility & Custom Requests</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">
                  Accommodation Preference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Boutique Hotel, AirBnB, Hostel"
                  value={formData.accommodation_pref}
                  onChange={(e) => setFormData({ ...formData, accommodation_pref: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">
                  Transportation Preference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro & Walking, Rental Car, Taxis"
                  value={formData.transportation_pref}
                  onChange={(e) => setFormData({ ...formData, transportation_pref: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Dietary Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian, Halal, Gluten-Free, None"
                  value={formData.dietary_pref}
                  onChange={(e) => setFormData({ ...formData, dietary_pref: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Accessibility Needs</label>
                <input
                  type="text"
                  placeholder="e.g. Wheelchair accessible, Elevator access, None"
                  value={formData.accessibility_req}
                  onChange={(e) => setFormData({ ...formData, accessibility_req: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Additional Instructions or Must-See Spots
              </label>
              <textarea
                rows="3"
                placeholder="Any specific monuments you want to include, anniversaries, traveling with toddlers, etc."
                value={formData.additional_instructions}
                onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Sticky Summary Sidebar */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="bg-surface rounded-3xl p-6 border border-navy-100 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <h3 className="text-base font-bold text-navy-950">Trip Summary</h3>
              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                {daysCount} Days
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-navy-500">Destination:</span>
                <span className="font-bold text-navy-900 text-right truncate max-w-[150px]">
                  {formData.destination || 'Not entered yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Dates:</span>
                <span className="font-semibold text-navy-800">
                  {formData.start_date && formData.end_date ? `${formData.start_date} to ${formData.end_date}` : 'Select dates'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Travelers:</span>
                <span className="font-semibold text-navy-800">{formData.travelers_count} person(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Style:</span>
                <span className="font-semibold text-navy-800 capitalize">{formData.travel_style}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Pace:</span>
                <span className="font-semibold text-navy-800 capitalize">{formData.daily_pace}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-navy-50">
                <span className="text-navy-500">Total Budget:</span>
                <span className="font-extrabold text-navy-900 text-sm">
                  {formatCurrency(formData.budget, formData.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">Avg. Daily Budget:</span>
                <span className="font-semibold text-teal-700">
                  ~{formatCurrency(dailyBudget, formData.currency)}/day
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-teal-200 group-hover:rotate-12 transition-transform" />
              <span>Generate My Itinerary</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="text-[11px] text-navy-400 leading-normal flex items-start gap-1.5 pt-2">
              <ShieldAlert className="w-3.5 h-3.5 text-navy-400 shrink-0 mt-0.5" />
              <span>
                Generation takes ~10-20 seconds. Generated itineraries can be customized and saved to your account.
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
