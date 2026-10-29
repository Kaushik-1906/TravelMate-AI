import React from 'react';
import { Compass, Sparkles } from 'lucide-react';

export default function LoadingSpinner({ title = "Crafting your personalized itinerary...", subtitle = "Analyzing destination geography, pacing activities, and optimizing your budget." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        {/* Glowing background ring */}
        <div className="absolute inset-0 rounded-full bg-primary-200 blur-xl opacity-60 animate-pulse" />
        
        {/* Spinning Outer Orbit */}
        <div className="relative w-20 h-20 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-surface shadow-inner flex items-center justify-center text-primary-600">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-navy-900 mb-2 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-600 animate-bounce" />
        <span>{title}</span>
      </h3>
      
      <p className="text-sm text-navy-500 max-w-md leading-relaxed">
        {subtitle}
      </p>

      {/* Progress steps animation */}
      <div className="mt-6 flex items-center gap-2 text-xs text-navy-400">
        <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping" />
        <span>Synthesizing travel preferences & local attractions</span>
      </div>
    </div>
  );
}
