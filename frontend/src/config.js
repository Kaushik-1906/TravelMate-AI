// Public deployment settings baked into the production build.
//
// Only put NON-SECRET values here. This file is committed to the repository,
// so never add API keys, Supabase service-role keys, or anything private.
//
// LOCAL DEVELOPMENT
//   Leave PRODUCTION_API_BASE_URL empty. The app falls back to
//   http://localhost:8000 for the FastAPI backend.
//
// DEPLOYED FRONTEND
//   Set this to the public backend URL, e.g.
//   export const PRODUCTION_API_BASE_URL = 'https://travelmate-ai-api.onrender.com';
//   No trailing slash and no /api suffix (the API client adds /api).
//
// A VITE_API_BASE_URL environment variable, when set, takes priority over
// this value (useful for preview deployments).
export const PRODUCTION_API_BASE_URL = '';
