# TravelMate AI

A full-stack, AI-assisted travel itinerary planner. Describe a trip — destination, dates, budget, travel style, and interests — and TravelMate generates a day-by-day plan with activities, a budget breakdown, and practical travel tips. Plans can be saved, edited, duplicated, and regenerated per day.

![Stack](https://img.shields.io/badge/React-18-61DAFB) ![Stack](https://img.shields.io/badge/Vite-5-646CFF) ![Stack](https://img.shields.io/badge/FastAPI-0.115-009688) ![Stack](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E)

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick start (demo mode)](#quick-start-demo-mode)
- [Configuration](#configuration)
- [Supabase setup](#supabase-setup)
- [AI providers](#ai-providers)
- [Demo vs. live mode](#demo-vs-live-mode)
- [API reference](#api-reference)
- [Testing](#testing)
- [Production build & deployment](#production-build--deployment)
- [Step-by-step deployment guide](DEPLOYMENT.md)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Features

- **AI itinerary generation** — day-by-day plans with timed activities, categories, costs, durations, transit hints, and recommendation reasons.
- **Budget intelligence** — five-category breakdown (accommodation, food, transportation, activities, miscellaneous), daily recommendation, and automatic recalculation whenever activities change.
- **Trip management** — create, list, search, sort, view, update, duplicate, and delete trips.
- **Day-level regeneration** — regenerate a single day of a saved trip, or a preview day before saving, with optional notes.
- **Authentication** — Supabase email/password auth with JWT verification on every protected request and row-level security (RLS) in Postgres.
- **Graceful demo mode** — with no credentials, the app runs entirely locally with an in-memory store and a deterministic demo generator. Demo output is clearly labelled in the UI and API.
- **Polished UX** — responsive Tailwind UI, loading/empty/error states, error boundary, toast-style alerts, lazy-loaded routes, budget charts (Recharts).
- **Light & dark themes** — one-click toggle in the navbar, remembered per browser, and follows the OS preference until the user chooses. Charts and native controls adapt too.
- **Guardrails** — strict request validation, per-IP rate limiting on AI endpoints, explicit CORS origins, no silent AI fallback, and no secrets in the frontend.

### Main screens

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page |
| `/plan` | Trip builder (public) |
| `/itinerary/preview` | Generated preview (public, save requires sign-in) |
| `/itinerary/:tripId` | Saved itinerary (editing requires sign-in) |
| `/login`, `/signup` | Authentication |
| `/dashboard` | Stats and recent trips (protected) |
| `/saved-trips` | Search/sort/manage trips (protected) |
| `/profile` | Travel preferences (protected) |

---

## Architecture

```
travel project/
├─ backend/                  FastAPI service
│  ├─ app/
│  │  ├─ api/                Route modules (health, itineraries, trips, profile)
│  │  ├─ core/               Auth/JWT, rate limiting, exceptions
│  │  ├─ database/           Supabase clients (auth, user-scoped, admin)
│  │  ├─ schemas/            Pydantic request/response models
│  │  ├─ services/           AI generation + itinerary persistence logic
│  │  ├─ config.py           Environment-driven settings
│  │  └─ main.py             App factory, CORS, error handlers
│  └─ tests/                 Pytest suite (25 tests)
├─ frontend/                 React + Vite + Tailwind SPA
│  └─ src/
│     ├─ components/         Navbar, charts, activity cards/modal, alerts…
│     ├─ context/            AuthContext (Supabase session + demo fallback)
│     ├─ pages/              Landing, builder, itinerary, dashboard, profile…
│     └─ services/           Axios API client + Supabase client
└─ supabase/migrations/      SQL schema, indexes, triggers, RLS policies
```

**Data flow**

1. The frontend calls FastAPI under `/api`.
2. Protected routes verify the Supabase access token from the `Authorization` header.
3. The backend makes Postgres calls with a Supabase client authenticated as that user, so **RLS remains enforced** — the service-role key is not used for user data.
4. If Supabase is not configured, the backend uses an in-memory store keyed to a demo user.

> AI calls happen only on the backend. Provider keys never reach the browser.

---

## Quick start (demo mode)

### Windows: one-click option (this laptop)

If the bundled Python runtime (`backend\.tools\python\python.exe`) is present, you do **not** need to install Python. Just double-click **`start-travelmate.bat`** in the project root. It opens the backend and frontend in separate windows and launches http://localhost:5173.

To start them manually instead:

```powershell
# Terminal 1
cd backend
.\.tools\python\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
npm.cmd run dev
```

> The bundled `.tools` runtime is local-only and git-ignored. On a fresh clone, follow the standard setup below.

### Standard setup

**Prerequisites:** Python 3.11+, Node.js 18+.

### 1. Backend

```powershell
cd backend

# Create and activate a virtual environment (Windows PowerShell)
py -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Optional: start from the example config. The app already defaults to demo mode.
Copy-Item .env.example .env

uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000` and interactive docs at `http://localhost:8000/docs`.

Verify:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install

# Optional: only needed for live Supabase auth.
Copy-Item .env.example .env

npm run dev
```

Open `http://localhost:5173`.

With no Supabase or AI credentials, the app:

- Signs you in through a clearly labelled demo flow.
- Stores trips in backend memory (they reset when the backend restarts).
- Uses a deterministic demo itinerary generator, labelled **Demo** in the UI and in API responses (`is_demo: true`).

> **Note:** Windows PowerShell may block `npm.ps1`. If you see a script-execution error, use `npm.cmd install` / `npm.cmd run dev`, or run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` for the current shell only.

---

## Configuration

### Backend — `backend/.env`

| Variable | Default | Description |
| --- | --- | --- |
| `APP_ENV` | `development` | Set to `production` to disable demo auth and require real credentials. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins. |
| `SUPABASE_URL` | – | Supabase project URL (`https://xxxx.supabase.co`). |
| `SUPABASE_ANON_KEY` | – | Supabase anon/public key. |
| `SUPABASE_SERVICE_ROLE_KEY` | – | Optional. Trusted server tasks only; not needed for normal user data. |
| `AI_PROVIDER` | `demo` | `demo`, `gemini`, `openai`, or `groq`. |
| `AI_API_KEY` | – | Provider API key. |
| `AI_MODEL` | provider default | Model name, e.g. `gemini-1.5-flash`, `gpt-4o-mini`. |
| `AI_BASE_URL` | – | Optional OpenAI-compatible base URL (custom gateways; Groq auto-detected). |
| `AI_TIMEOUT_SECONDS` | `60` | Per-call provider timeout. |
| `AI_MAX_ATTEMPTS` | `2` | Provider attempts per request (input clamped to 1–3). |
| `AI_DEMO_FALLBACK` | `false` | If `true`, a failed live call returns a labelled demo itinerary instead of an error. Keep `false` in production. |
| `RATE_LIMIT_REQUESTS` | `10` | Max AI requests per client IP per window. |
| `RATE_LIMIT_WINDOW_SECONDS` | `600` | Rate-limit window length. |

### Frontend — `frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base URL, default `http://localhost:8000` (no `/api` suffix). |
| `VITE_SUPABASE_URL` | Supabase project URL. Blank = demo auth. |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** key (public by design). Never use the service-role key here. |

Both `.env` files are git-ignored; only `.env.example` is committed.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql). It is idempotent and creates:
   - `profiles` and `trips` tables
   - RLS policies with `USING` **and** `WITH CHECK` ownership checks
   - indexes for user, destination, start date, and recency
   - a new-user profile trigger plus a backfill for existing users
   - automatic `updated_at` triggers
3. Under **Authentication → Providers**, enable **Email**. For local testing you may disable “Confirm email”; otherwise confirm the signup email before signing in.
4. Copy the project URL and **anon** key into both:
   - `backend/.env` → `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `frontend/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
5. Restart both servers. `/api/health` should report `"supabase_configured": true` and `"demo_mode": false`.

RLS means the backend never needs the service-role key for user data. Every query runs as the authenticated user.

---

## AI providers

Set `AI_PROVIDER`, `AI_API_KEY`, and optionally `AI_MODEL`, then restart the backend.

| Provider | Example config | Notes |
| --- | --- | --- |
| `demo` | `AI_PROVIDER=demo` | No network calls. Deterministic, clearly labelled output. |
| `gemini` | `AI_PROVIDER=gemini`, `AI_MODEL=gemini-1.5-flash` | Uses the Google Gen AI SDK with an HTTP REST fallback. |
| `openai` | `AI_PROVIDER=openai`, `AI_MODEL=gpt-4o-mini` | Any OpenAI-compatible endpoint via `AI_BASE_URL`. |
| `groq` | `AI_PROVIDER=groq`, `AI_MODEL=llama-3.3-70b-versatile` | Groq base URL is applied automatically. |

Behaviour:

- Output is validated against strict Pydantic schemas.
- Invalid JSON is retried/normalized up to `AI_MAX_ATTEMPTS` (max 3).
- Day numbers, dates, and budget totals are reconciled with the request.
- **Live failures surface as errors by default.** Demo output is never silently substituted unless `AI_DEMO_FALLBACK=true`, and demo responses remain labelled `is_demo: true`.

---

## Demo vs. live mode

The backend labels its mode at `GET /api/health`:

```json
{
  "status": "healthy",
  "environment": "development",
  "supabase_configured": false,
  "demo_mode": true,
  "ai_provider": "demo",
  "live_ai_active": false
}
```

| | Demo mode | Live mode |
| --- | --- | --- |
| Trigger | Supabase unset **and** `APP_ENV != production` | Supabase configured, or production |
| Auth | Demo/guest identity | Real Supabase JWT verification |
| Persistence | In-memory (resets on restart) | Supabase Postgres with RLS |
| AI | Built-in demo generator | Configured provider |
| Labelling | Demo notices in UI, `is_demo: true` in payloads | Normal output |

In `APP_ENV=production`, demo tokens are rejected and the server requires real Supabase auth.

---

## API reference

Base path: `/api`. Interactive docs: `/docs`.

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | – | Status and configuration flags. |

### Itineraries

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/itineraries/generate` | – (rate-limited) | Generate an itinerary preview. |
| `POST` | `/itineraries/preview/days/{day}/regenerate` | – (rate-limited) | Regenerate one preview day with trip context + optional notes. |
| `POST` | `/itineraries/{trip_id}/regenerate` | ✅ | Regenerate a saved trip. |
| `POST` | `/itineraries/{trip_id}/days/{day}/regenerate` | ✅ | Regenerate one saved day. |

### Trips

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/trips?search=&sort_by=` | ✅ | List own trips (`sort_by`: `created_at` or `start_date`). |
| `POST` | `/trips` | ✅ | Save a trip (generates if no itinerary is supplied). |
| `GET` | `/trips/{trip_id}` | ✅ | Get one trip. |
| `PUT` | `/trips/{trip_id}` | ✅ | Update title, itinerary, status, or budget. |
| `DELETE` | `/trips/{trip_id}` | ✅ | Delete a trip (`204`). |
| `POST` | `/trips/{trip_id}/duplicate` | ✅ | Duplicate a trip. |

### Profile

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/profile` | ✅ | Read preferences. |
| `PUT` | `/profile` | ✅ | Update currency, travel style, interests. |

Authenticated requests use `Authorization: Bearer <supabase_access_token>`.

Example generation request:

```json
{
  "destination": "Kyoto, Japan",
  "start_date": "2026-11-10",
  "end_date": "2026-11-14",
  "budget": 1800,
  "currency": "USD",
  "travelers_count": 2,
  "travel_style": "balanced",
  "interests": ["Culture", "Food & Dining", "Nature"],
  "preferences": { "pace": "moderate" }
}
```

---

## Testing

### Backend

```powershell
cd backend
python -m pytest -q
```

Current result: **25 passed**. Coverage includes API routes, budget math, AI JSON parsing/repair, retry limits, demo-mode gating, production safeguards, preview regeneration routing, and input validation.

The suite runs fully offline — no Supabase project or AI key required.

### Frontend

```powershell
cd frontend
npm run build
```

The production build validates imports, JSX, and code splitting. There is no frontend unit-test runner configured; UI behaviour was verified manually.

---

## Production build & deployment

> 📘 For a click-by-click Render + Vercel walkthrough (with exact environment values), see **[DEPLOYMENT.md](DEPLOYMENT.md)**. The repo includes `render.yaml`, `frontend/vercel.json`, and `frontend/netlify.toml`.

### Frontend

```powershell
cd frontend
npm run build
npm run preview   # local verification of dist/
```

Deploy `frontend/dist/` to any static host (Vercel, Netlify, Cloudflare Pages, S3 + CDN). Configure SPA fallback so unknown routes serve `index.html`.

### Backend

```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Deploy behind a process manager or container platform (Render, Railway, Fly.io, ECS, etc.). Checklist:

- Set `APP_ENV=production`.
- Set `FRONTEND_ORIGIN` to your real frontend origin(s).
- Configure Supabase URL + anon key and run the migration.
- Configure a live AI provider; keep `AI_DEMO_FALLBACK=false`.
- Use HTTPS and never expose `.env`.
- If you run multiple workers, rate limiting is per-process; add a shared store (e.g. Redis) for strict global limits.

---

## Security notes

- **RLS-first data access.** User queries use the user's JWT; ownership is enforced in both the API and Postgres.
- **No trust in client identity.** User IDs come from verified tokens, never request bodies.
- **Strict schemas.** Pydantic bounds dates, budgets, traveler counts, string lengths, and activity fields.
- **Rate limiting.** AI endpoints are limited per client IP.
- **Explicit CORS.** Origins are configured, not wildcarded with credentials.
- **No silent fallback.** Live AI failures raise clear errors unless explicitly opted into demo fallback.
- **Secrets stay server-side.** The frontend only receives the Supabase anon key, which is intended to be public.
- **Generic error responses.** Unexpected exceptions return a safe message while details are logged server-side.

---

## Known limitations

- **Live integrations are unverified in this environment.** Supabase auth/DB and live AI require credentials that are not configured here. Demo mode and offline tests were verified.
- **Demo persistence is in-memory.** Restarting the backend clears demo trips.
- **No frontend test suite.** Build and manual QA only.
- **Rate limiting is in-process.** It resets on restart and is not shared across workers.
- **AI estimates are approximate.** Prices, opening hours, availability, and transit times must be independently verified.
- **No payment/booking integration.** TravelMate plans; it does not book.
- **Timezone handling** is date-based; cross-timezone edge cases are not modelled.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot reach the TravelMate server` | Start the backend on port 8000 and check `VITE_API_BASE_URL`. |
| CORS error in the browser | Add the frontend origin to `FRONTEND_ORIGIN` and restart the backend. |
| `Your session has expired` | Sign in again; the token may have expired or Supabase config changed. |
| Signup succeeds but login fails | Email confirmation is enabled — confirm the email first. |
| `429 Too Many Requests` | Wait for `RATE_LIMIT_WINDOW_SECONDS` or raise the limit for development. |
| Demo trips disappeared | Expected: demo storage is in-memory. Configure Supabase for persistence. |
| `Demo sessions are disabled` | You are in production mode; configure Supabase and sign in normally. |
| `npm` blocked by PowerShell | Use `npm.cmd run dev` / `npm.cmd run build`. |
| `'npm.cmd' is not recognized` | Node isn't on that terminal's PATH. Use `run-frontend.bat` (it locates npm automatically), open a fresh terminal, or call `"%ProgramFiles%\nodejs\npm.cmd" run dev`. |

---

## License

This project is provided for educational and portfolio use. Add a license of your choice before redistribution.
