import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Sparkles, MapPin, Calendar, DollarSign, ArrowRight, ShieldCheck, CheckCircle2, Sliders, RefreshCw, Star, Users } from 'lucide-react';
import { POPULAR_DESTINATIONS } from '../utils/constants';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-primary-50/60 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100/80 border border-primary-200 text-xs font-semibold text-primary-800">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>Next-Generation Personalized Travel Planning</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-950 tracking-tight leading-[1.15]">
                Your Next Adventure, <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">
                  Planned by AI.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-navy-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Skip hours of chaotic browser tabs. Enter your destination, travel dates, budget, interests, and style to receive a handcrafted, day-by-day travel itinerary with realistic costs, meal recommendations, and localized transit tips.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/plan"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-base shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-5 h-5 text-teal-200 group-hover:rotate-12 transition-transform" />
                  <span>Plan My Trip</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-navy-200 hover:border-navy-300 bg-surface text-navy-800 font-semibold text-base hover:bg-navy-50 transition-all text-center"
                >
                  Explore Features
                </a>
              </div>

              {/* Social proof chips */}
              <div className="pt-6 border-t border-navy-100 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-navy-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>100% Free Preview</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Realistic Budget Tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Day-by-Day Customization</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-surface rounded-3xl p-6 border border-navy-100 shadow-2xl space-y-4">
                {/* Visual Header Image */}
                <div className="relative h-48 rounded-2xl overflow-hidden shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80"
                    alt="Tokyo cityscape"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-300">Preview Itinerary</span>
                      <h3 className="text-lg font-bold text-white">4 Days in Tokyo & Kyoto</h3>
                    </div>
                  </div>
                </div>

                {/* Itinerary Snippet Cards */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-background border border-navy-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-600" />
                      <span className="font-semibold text-navy-800">Day 1: Historic Asakusa & Senso-ji</span>
                    </div>
                    <span className="text-navy-500 font-medium">Morning</span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-navy-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      <span className="font-semibold text-navy-800">Tasting Tour at Tsukiji Outer Market</span>
                    </div>
                    <span className="text-navy-500 font-medium">Afternoon</span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-navy-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-navy-800">Shibuya Sky Golden Hour & Izakaya</span>
                    </div>
                    <span className="text-navy-500 font-medium">Evening</span>
                  </div>
                </div>

                {/* Budget Pill */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Estimated Budget: $1,450 USD</span>
                  </div>
                  <span className="text-emerald-700 font-bold">Within Budget</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-20 bg-surface border-y border-navy-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Built For Modern Explorers</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              Everything You Need for a Seamless Trip
            </h2>
            <p className="text-sm sm:text-base text-navy-600">
              Smart scheduling algorithms that take into account daily travel pace, geographical distances, and realistic budgets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-background rounded-2xl p-6 border border-navy-100 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900 mb-2">AI Itinerary Generation</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Personalized day-by-day plans crafted around your specific interests, dietary needs, and accessibility requirements.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-2xl p-6 border border-navy-100 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900 mb-2">Smart Budget Breakdown</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Transparent expense breakdowns across lodging, food, transit, and activities with proactive over-budget warnings.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-2xl p-6 border border-navy-100 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900 mb-2">Single-Day Regeneration</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Dislike a single afternoon or rainy forecast? Regenerate any specific day without wiping the rest of your itinerary.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background rounded-2xl p-6 border border-navy-100 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-900 mb-2">Full Activity Editing</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Add your own must-see gems, reorder schedules, edit durations, and customize expenses directly on the fly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Effortless 3-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
              How TravelMate AI Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-surface rounded-2xl p-8 border border-navy-100 shadow-card text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                1
              </div>
              <h3 className="text-lg font-bold text-navy-900">Enter Your Preferences</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Provide your dream destination, travel dates, budget, travelers count, preferred pace, and top interests.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface rounded-2xl p-8 border border-navy-100 shadow-card text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                2
              </div>
              <h3 className="text-lg font-bold text-navy-900">AI Synthesizes Itinerary</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Our engine groups attractions geographically, pairs morning/evening spots, and calculates realistic costs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface rounded-2xl p-8 border border-navy-100 shadow-card text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                3
              </div>
              <h3 className="text-lg font-bold text-navy-900">Customize & Travel</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Save trips securely to your dashboard, edit activities, swap days, and access your itinerary from any device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations Showcase */}
      <section className="py-20 bg-surface border-t border-navy-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Inspiration</span>
              <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight">Popular Destinations</h2>
            </div>
            <Link
              to="/plan"
              className="text-sm font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1 group"
            >
              <span>Explore all destinations</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {POPULAR_DESTINATIONS.map((dest) => (
              <Link
                key={dest.name}
                to={`/plan?destination=${encodeURIComponent(dest.name)}`}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-card hover:shadow-card-hover transition-all"
              >
                <img
                  src={dest.img}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent p-5 flex flex-col justify-end text-white">
                  <span className="text-xs font-semibold text-teal-300">{dest.tag}</span>
                  <h3 className="text-xl font-bold">{dest.name}</h3>
                  <span className="text-xs text-navy-200 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <span>Plan this trip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-gradient-to-tr from-primary-900 via-navy-900 to-navy-950 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Experience Stress-Free Travel Planning?
          </h2>
          <p className="text-navy-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Generate your personalized, day-by-day travel plan in under 30 seconds with TravelMate AI.
          </p>
          <div className="pt-2">
            <Link
              to="/plan"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-navy-950 font-bold text-base shadow-lg transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Planning for Free</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
