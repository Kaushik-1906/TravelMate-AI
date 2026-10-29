import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Calendar, DollarSign, Users, MapPin, Plus, RefreshCw, Save, ArrowLeft,
  ShieldAlert, Bed, Bus, Lightbulb, Shield, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateRange } from '../utils/formatters';
import ActivityCard from '../components/ActivityCard';
import ActivityModal from '../components/ActivityModal';
import BudgetChart from '../components/BudgetChart';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

export default function ItineraryPage() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isPreview = !tripId || tripId === 'preview';

  // Data state
  const [itinerary, setItinerary] = useState(null);
  const [tripParams, setTripParams] = useState(null);
  const [currentTripId, setCurrentTripId] = useState(tripId !== 'preview' ? tripId : null);

  // UI state
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingText, setActionLoadingText] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [regenDayModalOpen, setRegenDayModalOpen] = useState(false);
  const [regenNotes, setRegenNotes] = useState('');

  // Recalculate activity totals locally so the budget summary stays in sync
  // before the user saves. Mirrors the backend's BudgetService logic.
  const withRecalculatedBudget = (nextDays, baseItinerary) => {
    const totalActivityCost = nextDays.reduce(
      (sum, day) =>
        sum +
        (day.activities || []).reduce(
          (daySum, activity) => daySum + (Number(activity.estimated_cost) || 0),
          0
        ),
      0
    );

    const breakdown = { ...(baseItinerary.budget_breakdown || {}) };
    breakdown.accommodation = Number(breakdown.accommodation) || 0;
    breakdown.food = Number(breakdown.food) || 0;
    breakdown.transportation = Number(breakdown.transportation) || 0;
    breakdown.miscellaneous = Number(breakdown.miscellaneous) || 0;
    breakdown.activities = Math.round(totalActivityCost * 100) / 100;

    const newTotal = Math.round(
      (breakdown.accommodation +
        breakdown.food +
        breakdown.transportation +
        breakdown.activities +
        breakdown.miscellaneous) *
        100
    ) / 100;
    breakdown.total_estimated = newTotal;

    return {
      ...baseItinerary,
      days: nextDays,
      budget_breakdown: breakdown,
      estimated_total_cost: newTotal,
      daily_budget_recommendation: nextDays.length
        ? Math.round((newTotal / nextDays.length) * 100) / 100
        : newTotal,
    };
  };

  // 1. Load data
  useEffect(() => {
    const loadTripData = async () => {
      setLoading(true);
      setError('');
      try {
        if (!isPreview && tripId) {
          // Fetch existing trip from backend
          const tripRecord = await api.getTrip(tripId);
          setItinerary(tripRecord.itinerary);
          setTripParams({
            destination: tripRecord.destination,
            start_date: tripRecord.start_date,
            end_date: tripRecord.end_date,
            budget: tripRecord.budget,
            currency: tripRecord.currency,
            travelers_count: tripRecord.travelers_count,
            travel_style: tripRecord.travel_style,
            interests: tripRecord.interests,
            daily_pace: tripRecord.preferences?.daily_pace || 'balanced',
            preferences: tripRecord.preferences,
          });
          setCurrentTripId(tripRecord.id);
        } else if (location.state?.itinerary) {
          // Preview state passed from TripBuilder
          setItinerary(location.state.itinerary);
          setTripParams(location.state.tripParams);
        } else {
          // No state and no tripId, redirect to planner
          navigate('/plan');
        }
      } catch (err) {
        setError(err.message || 'Failed to load itinerary.');
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
  }, [tripId, isPreview]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner title="Loading Itinerary..." subtitle="Retrieving activity schedule and budget metrics" />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-navy-900">Itinerary Not Found</h2>
        <p className="text-xs text-navy-500">The requested travel itinerary could not be loaded.</p>
        <Link to="/plan" className="inline-block px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-xs">
          Plan a New Trip
        </Link>
      </div>
    );
  }

  const days = itinerary.days || [];
  if (days.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-navy-900">No daily plan available</h2>
        <p className="text-xs text-navy-500">
          This itinerary has no activities yet. Regenerate it or create a new plan.
        </p>
        <Link
          to="/plan"
          className="inline-block px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-xs"
        >
          Plan a New Trip
        </Link>
      </div>
    );
  }
  const activeDay = days[Math.min(selectedDayIdx, days.length - 1)] || days[0];
  const currency = itinerary.currency || tripParams?.currency || 'USD';
  const durationDays = days.length;

  // -------------------------------------------------------------
  // Activity Editing Operations
  // -------------------------------------------------------------
  const handleOpenAddActivity = () => {
    setEditingActivity(null);
    setModalOpen(true);
  };

  const handleOpenEditActivity = (act) => {
    setEditingActivity(act);
    setModalOpen(true);
  };

  const handleSaveActivity = (activityData) => {
    const currentDay = days[selectedDayIdx];
    const currentDayActivities = [...(currentDay.activities || [])];

    if (editingActivity) {
      const idx = currentDayActivities.findIndex((a) => a.id === editingActivity.id);
      if (idx !== -1) {
        currentDayActivities[idx] = { ...activityData, id: editingActivity.id };
      }
    } else {
      currentDayActivities.push(activityData);
    }

    const updatedDays = days.map((day, index) =>
      index === selectedDayIdx ? { ...day, activities: currentDayActivities } : day
    );

    setItinerary(withRecalculatedBudget(updatedDays, itinerary));
    setSuccessMsg(editingActivity ? 'Activity updated.' : 'New activity added.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteActivity = (actId) => {
    if (!window.confirm('Remove this activity from the day plan?')) return;

    const updatedDays = days.map((day, index) =>
      index === selectedDayIdx
        ? { ...day, activities: (day.activities || []).filter((a) => a.id !== actId) }
        : day
    );

    setItinerary(withRecalculatedBudget(updatedDays, itinerary));
    setSuccessMsg('Activity removed.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // -------------------------------------------------------------
  // Regeneration Operations
  // -------------------------------------------------------------
  const handleRegenerateDay = async () => {
    const targetDayNumber = activeDay.day_number;
    setRegenDayModalOpen(false);
    setActionLoading(true);
    setActionLoadingText(`Regenerating Day ${targetDayNumber} with AI...`);
    setError('');

    try {
      if (currentTripId) {
        // Saved trip in backend
        const updatedTrip = await api.regenerateTripDay(currentTripId, targetDayNumber, regenNotes);
        setItinerary(updatedTrip.itinerary);
      } else {
        // Preview mode
        const newDay = await api.regeneratePreviewDay(
          targetDayNumber,
          {
            destination: tripParams.destination,
            currency: tripParams.currency,
            travel_style: tripParams.travel_style,
            interests: tripParams.interests,
            preferences: { daily_pace: tripParams.daily_pace },
            days: itinerary.days,
          },
          regenNotes
        );

        const updatedDays = days.map((day, index) =>
          index === selectedDayIdx ? newDay : day
        );
        setItinerary(withRecalculatedBudget(updatedDays, itinerary));
      }

      setRegenNotes('');
      setSuccessMsg(`Day ${targetDayNumber} has been freshly regenerated!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to regenerate this day.');
    } finally {
      setActionLoading(false);
      setActionLoadingText('');
    }
  };

  const handleRegenerateEntireTrip = async () => {
    if (!window.confirm('Regenerate the ENTIRE itinerary? Any custom activities you added will be refreshed.')) {
      return;
    }

    setActionLoading(true);
    setActionLoadingText('Regenerating full itinerary from destination foundations...');
    setError('');

    try {
      if (currentTripId) {
        const updated = await api.regenerateFullTrip(currentTripId);
        setItinerary(updated.itinerary);
      } else {
        const newItinerary = await api.generateItinerary(tripParams);
        setItinerary(newItinerary);
      }
      setSelectedDayIdx(0);
      setSuccessMsg('Entire itinerary successfully regenerated!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to regenerate full trip.');
    } finally {
      setActionLoading(false);
      setActionLoadingText('');
    }
  };

  // -------------------------------------------------------------
  // Save Trip to Account
  // -------------------------------------------------------------
  const handleSaveTrip = async () => {
    if (!user) {
      // Preserve the in-memory itinerary while the visitor signs in.
      navigate('/login', {
        state: {
          notice: 'Sign in or create a free account to save this itinerary. Your plan is kept while you sign in.',
          returnTo: '/itinerary/preview',
          itinerary,
          tripParams,
        },
      });
      return;
    }

    setActionLoading(true);
    setActionLoadingText('Saving trip to your account...');
    setError('');

    try {
      if (currentTripId) {
        // Update existing saved trip
        await api.updateTrip(currentTripId, {
          title: itinerary.trip_title,
          itinerary: itinerary,
          estimated_total_cost: itinerary.estimated_total_cost,
        });
        setSuccessMsg('All itinerary modifications saved to your account!');
      } else {
        // Create new trip record
        const saved = await api.createTrip({
          ...tripParams,
          itinerary_override: itinerary,
        });
        setCurrentTripId(saved.id);
        setSuccessMsg('Trip saved to your dashboard successfully!');
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // canvas-confetti fallback
      }

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save trip to database.');
    } finally {
      setActionLoading(false);
      setActionLoadingText('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-navy-100">
        <Link
          to={user ? '/dashboard' : '/plan'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{user ? 'Back to Dashboard' : 'Modify Parameters'}</span>
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRegenerateEntireTrip}
            disabled={actionLoading}
            className="px-3.5 py-2 rounded-xl border border-navy-200 hover:border-navy-300 text-navy-700 bg-surface text-xs font-semibold hover:bg-navy-50 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-navy-500" />
            <span>Regenerate Entire Trip</span>
          </button>

          <button
            onClick={handleSaveTrip}
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{currentTripId ? 'Save Changes' : 'Save to My Trips'}</span>
          </button>
        </div>
      </div>

      {actionLoading && (
        <div className="p-4 rounded-2xl bg-primary-50 border border-primary-200 flex items-center justify-center gap-3 text-primary-800 text-xs font-medium animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
          <span>{actionLoadingText}</span>
        </div>
      )}

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      {error && <AlertBanner type="error" message={error} onClose={() => setError('')} />}

      {/* Destination Hero Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary-600" />
                <span>{itinerary.destination}</span>
              </span>
              {itinerary.is_demo && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Demo Heuristic Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              {itinerary.trip_title}
            </h1>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-navy-600 bg-background p-3 rounded-2xl border border-navy-100">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span>{durationDays} Days</span>
            </div>
            <span className="text-navy-300">•</span>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-primary-600" />
              <span>{tripParams?.travelers_count || 1} Traveler(s)</span>
            </div>
            <span className="text-navy-300">•</span>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-navy-900">
                {formatCurrency(itinerary.estimated_total_cost, currency)} Total
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-navy-500 px-1">
          {tripParams?.start_date && tripParams?.end_date && (
            <span>{formatDateRange(tripParams.start_date, tripParams.end_date)}</span>
          )}
          <span>
            Avg. daily estimate:{' '}
            <strong className="text-navy-800">
              {formatCurrency(
                itinerary.daily_budget_recommendation ||
                  itinerary.estimated_total_cost / Math.max(1, durationDays),
                currency
              )}
            </strong>
          </span>
          {tripParams?.budget ? (
            <span>
              Planned budget:{' '}
              <strong className="text-navy-800">{formatCurrency(tripParams.budget, currency)}</strong>
            </span>
          ) : null}
        </div>

        {/* Overview Description */}
        <p className="text-xs sm:text-sm text-navy-600 leading-relaxed pt-2 border-t border-navy-50">
          {itinerary.overview}
        </p>
      </div>

      {/* Main Content Layout: Left Days Itinerary & Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Day Navigation Tabs & Day Activities */}
        <div className="lg:col-span-8 space-y-6">
          {/* Day Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {days.map((day, idx) => (
              <button
                key={day.day_number}
                onClick={() => setSelectedDayIdx(idx)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex flex-col items-center gap-0.5 ${
                  selectedDayIdx === idx
                    ? 'bg-navy-900 text-white shadow-md'
                    : 'bg-surface text-navy-600 hover:bg-navy-100 border border-navy-100'
                }`}
              >
                <span>Day {day.day_number}</span>
                <span className="text-[10px] font-normal opacity-75">{day.date}</span>
              </button>
            ))}
          </div>

          {/* Active Day Card */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-100 gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  Day {activeDay.day_number} Plan
                  {activeDay.is_demo && (
                    <span className="ml-2 text-[10px] font-semibold normal-case text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      demo
                    </span>
                  )}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-navy-900">{activeDay.title}</h2>
                {activeDay.theme && (
                  <p className="text-xs text-navy-500 mt-0.5">{activeDay.theme}</p>
                )}
              </div>

              {/* Day Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRegenDayModalOpen(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl border border-navy-200 hover:border-navy-300 text-navy-700 bg-background text-xs font-semibold hover:bg-navy-100 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-navy-500" />
                  <span>Regenerate Day {activeDay.day_number}</span>
                </button>

                <button
                  onClick={handleOpenAddActivity}
                  className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Activity</span>
                </button>
              </div>
            </div>

            {/* Activities List */}
            {(!activeDay.activities || activeDay.activities.length === 0) ? (
              <div className="text-center py-12 border border-dashed border-navy-200 rounded-2xl">
                <p className="text-xs text-navy-500">No activities scheduled for this day.</p>
                <button
                  onClick={handleOpenAddActivity}
                  className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  + Add the first activity
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDay.activities.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    currency={currency}
                    onEdit={handleOpenEditActivity}
                    onDelete={handleDeleteActivity}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Budget Breakdown Chart Component */}
          <BudgetChart
            breakdown={itinerary.budget_breakdown}
            totalBudget={tripParams?.budget || itinerary.estimated_total_cost}
            estimatedTotal={itinerary.estimated_total_cost}
            currency={currency}
          />
        </div>

        {/* Right Sidebar: Lodging, Transit, Tips, Safety */}
        <div className="lg:col-span-4 space-y-6">
          {/* Accommodation Recommendations */}
          {itinerary.accommodation_recommendations?.length > 0 && (
            <div className="bg-surface rounded-3xl p-6 border border-navy-100 shadow-card space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-navy-100">
                <Bed className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-bold text-navy-900">Recommended Lodging</h3>
              </div>
              <div className="space-y-3">
                {itinerary.accommodation_recommendations.map((hotel, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-background border border-navy-100 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-navy-900">{hotel.name}</span>
                      <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full shrink-0">
                        {hotel.type}
                      </span>
                    </div>
                    <p className="text-navy-500 text-[11px]">{hotel.area}</p>
                    {hotel.estimated_nightly && (
                      <div className="pt-1 text-[11px] font-semibold text-navy-800">
                        ~{formatCurrency(hotel.estimated_nightly, currency)} / night
                      </div>
                    )}
                    {hotel.notes && (
                      <p className="text-[11px] text-navy-400 leading-tight italic pt-0.5">
                        {hotel.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transportation Tips */}
          {itinerary.transportation_tips?.length > 0 && (
            <div className="bg-surface rounded-3xl p-6 border border-navy-100 shadow-card space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-navy-100">
                <Bus className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-bold text-navy-900">Local Transit Advice</h3>
              </div>
              <ul className="space-y-2 text-xs text-navy-600">
                {itinerary.transportation_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Practical Travel Tips */}
          {itinerary.travel_tips?.length > 0 && (
            <div className="bg-surface rounded-3xl p-6 border border-navy-100 shadow-card space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-navy-100">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-navy-900">Practical Travel Tips</h3>
              </div>
              <ul className="space-y-2 text-xs text-navy-600">
                {itinerary.travel_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Safety & Local Etiquette */}
          {itinerary.safety_and_etiquette?.length > 0 && (
            <div className="bg-surface rounded-3xl p-6 border border-navy-100 shadow-card space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-navy-100">
                <Shield className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-navy-900">Safety & Etiquette</h3>
              </div>
              <ul className="space-y-2 text-xs text-navy-600">
                {itinerary.safety_and_etiquette.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Verification Disclaimer */}
          <div className="p-4 rounded-2xl bg-navy-50/80 border border-navy-200 text-xs text-navy-500 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-navy-800">
              <ShieldAlert className="w-4 h-4 text-navy-500" />
              <span>Independent Verification Disclaimer</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              {itinerary.disclaimer ||
                'All AI-generated prices, operating hours, ticket booking requirements, and transit timetables are approximations and subject to seasonal change. Please verify with official venues prior to travel.'}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Add/Edit Modal */}
      <ActivityModal
        isOpen={modalOpen}
        activity={editingActivity}
        currency={currency}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveActivity}
      />

      {/* Regenerate Single Day Modal */}
      {regenDayModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-md w-full shadow-2xl border border-navy-100 space-y-4">
            <h3 className="text-base font-bold text-navy-900">
              Regenerate Day {activeDay.day_number}
            </h3>
            <p className="text-xs text-navy-500 leading-relaxed">
              Our AI engine will compose brand-new morning, afternoon, and evening recommendations for this specific day without touching any other days in your trip.
            </p>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Special notes for this day (Optional)
              </label>
              <textarea
                rows="3"
                placeholder="e.g. Focus on museum visits due to rain, or prioritize artisan shopping stalls..."
                value={regenNotes}
                onChange={(e) => setRegenNotes(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRegenDayModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-navy-200 text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateDay}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
              >
                Regenerate Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
