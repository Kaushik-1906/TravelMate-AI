import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Plus, Calendar, MapPin, DollarSign, Users, ArrowRight, Clock, Trash2, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatCurrency, formatDateRange, getDaysCount } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await api.getTrips();
      setTrips(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDeleteTrip = async (tripId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip itinerary?')) return;
    try {
      await api.deleteTrip(tripId);
      setTrips(trips.filter((t) => t.id !== tripId));
      setActionSuccess('Trip itinerary deleted successfully.');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete trip.');
    }
  };

  const handleDuplicateTrip = async (tripId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const duplicated = await api.duplicateTrip(tripId);
      setTrips([duplicated, ...trips]);
      setActionSuccess('Trip duplicated successfully! You can find the copy below.');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to duplicate trip.');
    }
  };

  // Compute metrics
  const totalTrips = trips.length;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const upcomingTrips = trips.filter((t) => {
    const end = new Date(t.end_date);
    return end >= new Date(now.toDateString());
  });
  const recentTrips = trips.filter((t) => {
    const created = new Date(t.created_at);
    return !Number.isNaN(created.getTime()) && created >= thirtyDaysAgo;
  });

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Traveler';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-primary-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-teal-300 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Travel Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {displayName}!
            </h1>
            <p className="text-navy-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Plan your next getaway, review budget metrics, and manage your saved day-by-day itineraries.
            </p>
          </div>

          <Link
            to="/plan"
            className="px-6 py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-navy-950 font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Trip</span>
          </Link>
        </div>
      </div>

      {actionSuccess && <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess('')} />}
      {error && <AlertBanner type="error" message={error} onClose={() => setError('')} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl p-6 border border-navy-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider block">Total Trips</span>
            <span className="text-2xl font-extrabold text-navy-900">{totalTrips}</span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-navy-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider block">Upcoming Trips</span>
            <span className="text-2xl font-extrabold text-navy-900">{upcomingTrips.length}</span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-navy-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider block">Recently Planned</span>
            <span className="text-2xl font-extrabold text-navy-900">{recentTrips.length}</span>
          </div>
        </div>
      </div>

      {/* Trips Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy-950">Your Planned Trips</h2>
            <p className="text-xs text-navy-500">Access and edit your customized travel itineraries</p>
          </div>
          {trips.length > 0 && (
            <Link
              to="/saved-trips"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>View all saved ({totalTrips})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <LoadingSpinner title="Loading your travel plans..." subtitle="Fetching saved itineraries from Supabase database" />
        ) : trips.length === 0 ? (
          /* Empty State */
          <div className="bg-surface rounded-3xl p-12 text-center border border-dashed border-navy-200 shadow-sm space-y-4 max-w-xl mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-navy-900">No trips planned yet</h3>
              <p className="text-xs text-navy-500 max-w-sm mx-auto leading-relaxed">
                Ready to explore somewhere new? Generate your first personalized itinerary in under a minute with AI.
              </p>
            </div>
            <Link
              to="/plan"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Plan My First Trip</span>
            </Link>
          </div>
        ) : (
          /* Trip Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const days = getDaysCount(trip.start_date, trip.end_date);
              return (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/itinerary/${trip.id}`)}
                  className="group cursor-pointer bg-surface rounded-2xl p-6 border border-navy-100 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md">
                        <MapPin className="w-3.5 h-3.5 text-primary-600" />
                        <span className="truncate max-w-[150px]">{trip.destination}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-navy-500 uppercase bg-navy-50 px-2 py-0.5 rounded-full">
                        {trip.travel_style}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-navy-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                      {trip.title}
                    </h3>

                    <div className="space-y-1.5 text-xs text-navy-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-navy-400" />
                        <span>{formatDateRange(trip.start_date, trip.end_date)} ({days} days)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-navy-400" />
                        <span>{trip.travelers_count} Traveler{trip.travelers_count > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer with Budget & Controls */}
                  <div className="mt-5 pt-4 border-t border-navy-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-navy-400 block uppercase font-medium">Estimated Budget</span>
                      <span className="text-sm font-extrabold text-navy-900">
                        {formatCurrency(trip.budget, trip.currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDuplicateTrip(trip.id, e)}
                        title="Duplicate Trip"
                        className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        title="Delete Trip"
                        className="p-1.5 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
