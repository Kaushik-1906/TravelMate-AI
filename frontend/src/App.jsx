import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Route-level code splitting keeps the initial landing page light.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TripBuilderPage = lazy(() => import('./pages/TripBuilderPage'));
const ItineraryPage = lazy(() => import('./pages/ItineraryPage'));
const SavedTripsPage = lazy(() => import('./pages/SavedTripsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner title="Loading TravelMate..." subtitle="Preparing your travel workspace" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="flex flex-col min-h-screen bg-background text-navy-900 selection:bg-primary-100 selection:text-primary-900">
              <Navbar />
              <main className="flex-grow">
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/plan" element={<TripBuilderPage />} />
                    <Route path="/itinerary/preview" element={<ItineraryPage />} />
                    <Route path="/itinerary/:tripId" element={<ItineraryPage />} />

                    {/* Protected User Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/saved-trips"
                      element={
                        <ProtectedRoute>
                          <SavedTripsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
