import React, { useState } from 'react';
import { Clock, DollarSign, Navigation, Lightbulb, RefreshCw, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function ActivityCard({ activity, currency = 'USD', onEdit, onDelete }) {
  const [showAlternative, setShowAlternative] = useState(false);

  const getPeriodBadge = (period) => {
    switch (period?.toLowerCase()) {
      case 'morning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'afternoon':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'evening':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-navy-50 text-navy-700 border-navy-200';
    }
  };

  return (
    <div className="group relative bg-surface rounded-2xl p-5 border border-navy-100 shadow-card hover:shadow-card-hover transition-all duration-200">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-navy-700 bg-background px-2.5 py-1 rounded-md border border-navy-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary-600" />
            <span>{activity.time}</span>
          </span>

          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPeriodBadge(activity.period)}`}>
            {activity.period}
          </span>

          <span className="text-[11px] font-medium text-navy-500 bg-navy-50 px-2 py-0.5 rounded-md">
            {activity.category}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(activity)}
              title="Edit Activity"
              className="p-1.5 rounded-lg text-navy-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(activity.id)}
              title="Delete Activity"
              className="p-1.5 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="mb-3">
        <h4 className="text-base font-bold text-navy-900 group-hover:text-primary-700 transition-colors">
          {activity.name}
        </h4>
        <p className="text-xs text-navy-600 leading-relaxed mt-1">
          {activity.description}
        </p>
      </div>

      {/* Metrics Row (Duration & Cost) */}
      <div className="flex flex-wrap items-center gap-4 py-2 border-y border-navy-50 text-xs text-navy-600 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-navy-400" />
          <span>Approx. {activity.estimated_duration_minutes || 90} mins</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-navy-400" />
          <span className="font-semibold text-navy-900">
            {activity.estimated_cost > 0 ? formatCurrency(activity.estimated_cost, currency) : 'Free / Included'}
          </span>
        </div>
      </div>

      {/* Recommendation Reason */}
      {activity.reason_for_recommendation && (
        <div className="mb-2 flex items-start gap-1.5 text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
          <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span className="leading-tight">{activity.reason_for_recommendation}</span>
        </div>
      )}

      {/* Transportation To Next */}
      {activity.transportation_to_next && (
        <div className="flex items-center gap-2 text-[11px] text-navy-500 bg-navy-50/60 px-3 py-1.5 rounded-xl">
          <Navigation className="w-3.5 h-3.5 text-primary-600 shrink-0" />
          <span className="truncate">Next transit: {activity.transportation_to_next}</span>
          {activity.estimated_travel_minutes && (
            <span className="ml-auto shrink-0 font-medium text-navy-600">~{activity.estimated_travel_minutes} mins</span>
          )}
        </div>
      )}

      {/* Alternative suggestion toggle */}
      {activity.alternative_suggestion && (
        <div className="mt-2.5 pt-2 border-t border-navy-50">
          <button
            onClick={() => setShowAlternative(!showAlternative)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800 transition-colors"
          >
            <span>{showAlternative ? 'Hide backup alternative' : 'View alternative option'}</span>
            {showAlternative ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showAlternative && (
            <p className="mt-1 text-xs text-navy-500 bg-background p-2.5 rounded-lg border border-navy-100">
              {activity.alternative_suggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
