import axios from 'axios';
import { PRODUCTION_API_BASE_URL } from '../config';

// Priority: build-time env var -> committed production value -> local backend.
// The sentinel 'same-origin' means the API is served from the same domain
// (Vercel hosts the Python backend at /api).
const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const RAW_API_BASE_URL = ENV_API_BASE_URL || PRODUCTION_API_BASE_URL;
const API_BASE_URL =
  RAW_API_BASE_URL === 'same-origin' ? '' : RAW_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // AI generation can legitimately take up to ~60s
});

// Attach the current Supabase access token (kept in sync by AuthContext).
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('travelmate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap backend errors into friendly Error objects and notify the app when a
// session has expired so AuthContext can clear stale credentials.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred. Please check your connection and try again.';

    if (error.code === 'ECONNABORTED') {
      message = 'The request took too long. Please try again.';
    } else if (!error.response) {
      message = 'Cannot reach the TravelMate server. Make sure the backend is running and try again.';
    } else if (error.response.status === 401) {
      window.dispatchEvent(new Event('travelmate:unauthorized'));
      message = error.response.data?.message || error.response.data?.detail || 'Your session has expired. Please sign in again.';
    } else if (error.response.status === 429) {
      message = error.response.data?.message || error.response.data?.detail || 'Too many requests. Please wait a moment and try again.';
    } else if (error.response.data?.message) {
      message = error.response.data.message;
    } else if (error.response.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        message = error.response.data.detail.map((d) => d.msg || d.message).join(', ');
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Health
  checkHealth: async () => (await apiClient.get('/health')).data,

  // Itineraries
  generateItinerary: async (tripParams) => (await apiClient.post('/itineraries/generate', tripParams)).data,
  regenerateFullTrip: async (tripId) => (await apiClient.post(`/itineraries/${tripId}/regenerate`)).data,
  regenerateTripDay: async (tripId, dayNumber, notes) =>
    (await apiClient.post(`/itineraries/${tripId}/days/${dayNumber}/regenerate`, {
      day_number: dayNumber,
      additional_notes: notes || null,
    })).data,
  regeneratePreviewDay: async (dayNumber, tripContext, notes) =>
    (await apiClient.post(`/itineraries/preview/days/${dayNumber}/regenerate`, tripContext, {
      params: { additional_notes: notes || undefined },
    })).data,

  // Trips CRUD
  getTrips: async (params = {}) => (await apiClient.get('/trips', { params })).data,
  getTrip: async (tripId) => (await apiClient.get(`/trips/${tripId}`)).data,
  createTrip: async (tripData) => (await apiClient.post('/trips', tripData)).data,
  updateTrip: async (tripId, updateData) => (await apiClient.put(`/trips/${tripId}`, updateData)).data,
  deleteTrip: async (tripId) => (await apiClient.delete(`/trips/${tripId}`)).data,
  duplicateTrip: async (tripId) => (await apiClient.post(`/trips/${tripId}/duplicate`)).data,

  // Profile
  getProfile: async () => (await apiClient.get('/profile')).data,
  updateProfile: async (profileData) => (await apiClient.put('/profile', profileData)).data,
};

export default api;
