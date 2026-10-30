# Deployment Guide

This guide deploys TravelMate AI with **Render** (FastAPI backend) and **Vercel** (React frontend). Netlify is also supported for the frontend.

There are two configurations. Pick one and keep both sides consistent.

| | Option A — Quick demo | Option B — Real production |
| --- | --- | --- |
| Supabase | Not configured | Configured |
| Backend `APP_ENV` | `development` | `production` |
| Login | Demo sign-in, no password | Real email/password |
| Data | In-memory, resets on restart | Postgres with RLS |
| AI | Demo generator | Your provider |
| Best for | Course submission / showcase | Real users |

> ⚠️ **Never mix them.** A demo frontend (blank Supabase keys) pointed at a production backend will sign in locally but every API call returns 401/503.

---

## Option S — Single Vercel deployment (recommended, no second host)

The React frontend and the FastAPI backend can run in **one Vercel project**. This is how
`https://travel-mate-ai-j25i.vercel.app` is deployed.

**How it works**

| Piece | Location |
| --- | --- |
| React build | `frontend/` → published from `frontend/dist` |
| FastAPI app | `api/index.py` (Vercel Python function) imports `backend/app` |
| Dependencies | root `requirements.txt` |
| Routing | `vercel.json` rewrites `/api/*` to the function, everything else to `index.html` |
| API address | `frontend/src/config.js` → `PRODUCTION_API_BASE_URL = 'same-origin'` (calls `/api` on the same domain) |

**Deploy**

1. Push the repo to GitHub.
2. Vercel → **Add New → Project** → import the repo.
3. Leave **Root Directory** empty (uses the root `vercel.json`).
4. No environment variables are required for demo mode.
5. Deploy. Every later `git push` redeploys automatically.

Verify:

```powershell
Invoke-RestMethod https://YOUR-PROJECT.vercel.app/api/health
```

> **Trade-offs.** Vercel Functions are serverless: demo trips live in a per-instance
> memory store, so on a cold start saved trips may not be listed. AI generation also
> must finish within the function time limit (10s on Hobby, 60s when configured).
> For durable data, use Supabase (Option B) or host the backend on Render (Option A).

---

## Option A — Quick demo (no Supabase)

### Step 1 — Deploy the backend to Render

**Using the blueprint (recommended):**

1. Sign in at [render.com](https://render.com) with GitHub.
2. Click **New +** → **Blueprint**.
3. Select your `travelmate-ai` repository. Render detects `render.yaml`.
4. When prompted:
   - `FRONTEND_ORIGIN` → enter `http://localhost:5173` for now (you'll update it after the frontend is live).
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_API_KEY` → leave blank.
5. Click **Apply** and wait for the deploy.
6. Copy the service URL, e.g. `https://travelmate-ai-api.onrender.com`.
7. Verify:

```powershell
Invoke-RestMethod https://travelmate-ai-api.onrender.com/api/health
```

Expected:

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

**Manual alternative (no blueprint):**

- **New +** → **Web Service** → connect the repo
- Root Directory: `backend`
- Runtime: Python 3
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`
- Add the environment variables listed in `render.yaml`

### Step 2 — Deploy the frontend to Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New** → **Project** → import your `travelmate-ai` repo.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Vite** (build `npm run build`, output `dist`).
5. Add environment variables:

| Key | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://travelmate-ai-api.onrender.com` |
| `VITE_SUPABASE_URL` | *(leave blank)* |
| `VITE_SUPABASE_ANON_KEY` | *(leave blank)* |

6. Click **Deploy** and copy the URL, e.g. `https://travelmate-ai.vercel.app`.

`frontend/vercel.json` already adds the SPA fallback, so refreshing `/plan` or `/saved-trips` works.

> **Already deployed and seeing `500: FUNCTION_INVOCATION_FAILED`?**
> That means Vercel built the **repository root** instead of the frontend and tried to
> run `backend/` as a Python function. Fix the existing project without deleting it:
> **Project → Settings → Build & Deployment → Root Directory → Edit → `frontend` → Save**,
> then **Deployments → ⋯ → Redeploy**.
>
> A root-level `vercel.json` and `.vercelignore` are included as a safety net, so deploying
> from the repo root now builds `frontend/`. Setting the Root Directory is still the
> recommended approach.

### Step 3 — Connect CORS

1. Go back to Render → your service → **Environment**.
2. Set `FRONTEND_ORIGIN` to your exact Vercel URL, e.g. `https://travelmate-ai.vercel.app`.
   - No trailing slash.
   - Multiple origins: comma-separate them.
3. Save. Render redeploys automatically.

Until this is done, the browser console will show CORS errors and API calls will fail.

### Step 4 — Verify

- Open the Vercel URL.
- Sign in with the demo button (or any email/password in demo mode).
- Generate an itinerary.
- Save it, open **Saved Trips**, refresh the page — the route must still work.
- Regenerate a single day.
- Check `https://your-backend.onrender.com/api/health`.

**Free-tier note:** Render sleeps after ~15 minutes of inactivity. The first request can take 30–60 seconds. Open the site once before sharing it.

---

## Option B — Real production (Supabase)

### Step 1 — Create the database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`.
3. Under **Authentication → Providers**, enable **Email**.
   - For quick testing, disable “Confirm email”.
   - For real use, keep confirmation enabled and configure SMTP.
4. Copy:
   - Project URL (`https://xxxx.supabase.co`)
   - **anon / public** key

### Step 2 — Configure the backend

In Render → Environment:

```
APP_ENV=production
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=<anon key>
FRONTEND_ORIGIN=https://your-app.vercel.app
AI_PROVIDER=gemini        # or openai / groq
AI_API_KEY=<server-side key>
AI_MODEL=gemini-1.5-flash
AI_DEMO_FALLBACK=false
```

Save and redeploy. `/api/health` should now show:

```json
{ "supabase_configured": true, "demo_mode": false, "live_ai_active": true }
```

### Step 3 — Configure the frontend

In Vercel → Settings → Environment Variables:

```
VITE_API_BASE_URL=https://travelmate-ai-api.onrender.com
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

> `VITE_*` values are baked in at **build time**. After changing them you must trigger a **new deployment** (Deployments → ⋯ → Redeploy).

### Step 4 — Verify

- Sign up with a real email, confirm it if required, then sign in.
- Create a trip, refresh, and confirm it persists in Supabase (`Table Editor → trips`).
- Confirm another account cannot see the first account's trips (RLS).
- Generate an itinerary and confirm the response is **not** labelled demo.

---

## Environment variables reference

### Backend (Render)

| Variable | Demo | Production |
| --- | --- | --- |
| `APP_ENV` | `development` | `production` |
| `FRONTEND_ORIGIN` | Vercel URL | Vercel URL |
| `SUPABASE_URL` | blank | project URL |
| `SUPABASE_ANON_KEY` | blank | anon key |
| `AI_PROVIDER` | `demo` | `gemini` / `openai` / `groq` |
| `AI_API_KEY` | blank | provider key |
| `AI_MODEL` | `gemini-1.5-flash` | provider model |
| `AI_DEMO_FALLBACK` | `false` | `false` |
| `AI_MAX_ATTEMPTS` | `2` | `2` |
| `RATE_LIMIT_REQUESTS` | `10` | tune as needed |
| `RATE_LIMIT_WINDOW_SECONDS` | `600` | tune as needed |

### Frontend (Vercel)

| Variable | Demo | Production |
| --- | --- | --- |
| `VITE_API_BASE_URL` | backend URL | backend URL |
| `VITE_SUPABASE_URL` | blank | project URL |
| `VITE_SUPABASE_ANON_KEY` | blank | **anon** key |

> 🔒 Never put `SUPABASE_SERVICE_ROLE_KEY` or any AI key in Vercel/Netlify. Only the Supabase **anon** key belongs in the browser.

---

## Netlify (frontend alternative)

1. **Add new site** → import the repo.
2. Base directory: `frontend`.
3. Build command: `npm run build`; publish directory: `dist`.
4. Add the same `VITE_*` variables.
5. Deploy.

`frontend/netlify.toml` and `frontend/public/_redirects` handle SPA routing automatically.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| CORS error in console | `FRONTEND_ORIGIN` doesn't match the browser origin | Set the exact Vercel URL (https, no trailing slash), redeploy backend |
| `Cannot reach the TravelMate server` | Wrong `VITE_API_BASE_URL` | Use backend root URL **without** `/api`, then redeploy frontend |
| 401 after demo login | Backend `APP_ENV=production` without Supabase | Use Option A consistently, or configure Supabase and use Option B |
| 404 on page refresh | SPA rewrite missing | Ensure `frontend/vercel.json` is committed and Root Directory is `frontend` |
| Build fails on Vercel | Wrong root directory | Set Root Directory to `frontend` |
| `500: FUNCTION_INVOCATION_FAILED` | Vercel built the repo root and treated `backend/` as a Python function | Set Root Directory to `frontend` (Settings → Build & Deployment) and redeploy |
| Blank page after successful deploy | Assets built from the wrong directory | Confirm Output Directory is `dist` when Root Directory is `frontend` |
| First load is very slow | Render free tier cold start | Expected; warm it before sharing |
| Trips vanish after a while | Demo in-memory store restarted | Configure Supabase for persistence |
| `429 Too Many Requests` | Per-IP AI rate limit | Wait for the window or raise the limit |

---

## Submission links

```
GitHub:  https://github.com/YOUR-USERNAME/travelmate-ai
Demo:    https://YOUR-PROJECT.vercel.app
```

Open both in a private/incognito window before submitting — that proves they are public and working.
