import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass, MapPin, Calendar, Users, DollarSign, Search, ArrowUpDown, Trash2, Copy,
  ArrowRight, Sparkles, Filter, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDateRange, getDaysCount } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

export default function SavedTripsPage() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await api.getTrips({ search, sort_by: sortBy });
      setTrips(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch saved trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrips();
  };

  const handleDelete = async (tripId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip itinerary?')) return;
    try {
      await api.deleteTrip(tripId);
      setTrips(trips.filter((t) => t.id !== tripId));
      setSuccessMsg('Trip itinerary permanently deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete trip.');
    }
  };

  const handleDuplicate = async (tripId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const copy = await api.duplicateTrip(tripId);
      setTrips([copy, ...trips]);
      setSuccessMsg('Trip duplicated! A new copy is now available below.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to duplicate trip.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">Saved Trips</h1>
          <p className="text-xs sm:text-sm text-navy-500">
            Browse, manage, and duplicate all itineraries saved to your account
          </p>
        </div>
        <Link
          to="/plan"
          className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Plan New Trip</span>
        </Link>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      {error && <AlertBanner type="error" message={error} onClose={() => setError('')} />}

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-2xl p-4 border border-navy-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-navy-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by destination or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </form>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <ArrowUpDown className="w-4 h-4 text-navy-400" />
          <span className="text-navy-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-navy-200 bg-background text-xs font-semibold text-navy-800 outline-none"
          >
            <option value="created_at">Recently Created</option>
            <option value="start_date">Upcoming Travel Date</option>
          </select>
        </div>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <LoadingSpinner title="Retrieving saved itineraries..." subtitle="Accessing your encrypted travel vault" />
      ) : trips.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 text-center border border-dashed border-navy-200 max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-navy-900">No saved trips found</h3>
            <p className="text-xs text-navy-500">
              {search ? 'No trips match your search query.' : 'You have not saved any trip itineraries yet.'}
            </p>
          </div>
          <Link
            to="/plan"
            className="inline-block px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm"
          >
            Create Your First Itinerary
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const days = getDaysCount(trip.start_date, trip.end_date);
            return (
              <div
                key={trip.id}
                onClick={() => navigate(`/itinerary/${trip.id}`)}
                className="group cursor-pointer bg-surface rounded-3xl p-6 border border-navy-100 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100 truncate max-w-[160px]">
                      {trip.destination}
                    </span>
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

                <div className="mt-6 pt-4 border-t border-navy-50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-navy-400 block uppercase font-medium">Estimated Budget</span>
                    <span className="text-sm font-extrabold text-navy-900">
                      {formatCurrency(trip.budget, trip.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicate(trip.id, e)}
                      title="Duplicate Trip"
                      className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(trip.id, e)}
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
  );
}
