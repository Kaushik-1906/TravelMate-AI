import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ShieldCheck, Heart, Sparkles, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-navy-100 text-navy-600 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-navy-900 tracking-tight">
                TravelMate<span className="text-primary-600">.ai</span>
              </span>
            </div>
            <p className="text-xs text-navy-500 leading-relaxed">
              Crafting personalized, budget-conscious day-by-day itineraries tailored to your unique travel style.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md w-fit border border-primary-100">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              <span>AI-Powered Engine</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/plan" className="hover:text-primary-600 transition-colors">Smart Trip Planner</Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary-600 transition-colors">Personal Dashboard</Link>
              </li>
              <li>
                <Link to="/saved-trips" className="hover:text-primary-600 transition-colors">Saved Itineraries</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900 mb-3">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/plan" className="hover:text-primary-600 transition-colors">Popular Destinations</Link>
              </li>
              <li>
                <span className="text-navy-400">Budget Estimation</span>
              </li>
              <li>
                <span className="text-navy-400">Day-by-Day Optimizer</span>
              </li>
            </ul>
          </div>

          {/* Trust & Transparency */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900 mb-3">Transparency</h4>
            <p className="text-xs text-navy-500 leading-relaxed mb-3">
              Estimated costs, opening hours, transit durations, and attraction recommendations are AI approximations. We recommend checking official booking sites prior to travel.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-navy-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secured by Supabase RLS</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-navy-100 flex flex-col sm:flex-row items-center justify-between text-xs text-navy-400 gap-4">
          <p>© {new Date().getFullYear()} TravelMate AI. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with precision for travelers worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
