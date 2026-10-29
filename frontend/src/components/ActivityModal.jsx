import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, Tag, Navigation, FileText } from 'lucide-react';

export default function ActivityModal({ isOpen, onClose, onSave, activity = null, currency = 'USD' }) {
  const [formData, setFormData] = useState({
    id: '',
    time: '10:00 AM',
    period: 'Morning',
    name: '',
    description: '',
    category: 'Sightseeing',
    estimated_duration_minutes: 90,
    estimated_cost: 0,
    transportation_to_next: '',
    estimated_travel_minutes: 15,
    reason_for_recommendation: '',
    alternative_suggestion: '',
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        id: activity.id || `act_${Date.now()}`,
        time: activity.time || '10:00 AM',
        period: activity.period || 'Morning',
        name: activity.name || '',
        description: activity.description || '',
        category: activity.category || 'Sightseeing',
        estimated_duration_minutes: activity.estimated_duration_minutes || 90,
        estimated_cost: activity.estimated_cost || 0,
        transportation_to_next: activity.transportation_to_next || '',
        estimated_travel_minutes: activity.estimated_travel_minutes || 15,
        reason_for_recommendation: activity.reason_for_recommendation || '',
        alternative_suggestion: activity.alternative_suggestion || '',
      });
    } else {
      setFormData({
        id: `act_${Date.now()}`,
        time: '10:00 AM',
        period: 'Morning',
        name: '',
        description: '',
        category: 'Sightseeing',
        estimated_duration_minutes: 90,
        estimated_cost: 0,
        transportation_to_next: 'Walk / Metro',
        estimated_travel_minutes: 15,
        reason_for_recommendation: 'Added by traveler',
        alternative_suggestion: '',
      });
    }
  }, [activity, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-navy-100 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 bg-background/50">
          <h3 className="text-base font-bold text-navy-900">
            {activity ? 'Edit Travel Activity' : 'Add New Activity'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Activity Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Visit the Historic Colosseum"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Time</label>
              <input
                type="text"
                placeholder="e.g. 09:30 AM"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Period</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-surface"
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-surface"
              >
                <option value="Sightseeing">Sightseeing</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Culture & History">Culture & History</option>
                <option value="Nature & Outdoor">Nature & Outdoor</option>
                <option value="Relaxation & Wellness">Relaxation & Wellness</option>
                <option value="Shopping & Markets">Shopping & Markets</option>
                <option value="Entertainment">Entertainment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Estimated Cost ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Description</label>
            <textarea
              rows="3"
              placeholder="Highlight key details, tips, or experiences for this activity..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="10"
                step="5"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value, 10) || 60 })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Transit to Next</label>
              <input
                type="text"
                placeholder="e.g. 10-min metro ride"
                value={formData.transportation_to_next}
                onChange={(e) => setFormData({ ...formData, transportation_to_next: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
            >
              {activity ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
