# WorkShetu Production Environment Inventory

This document defines all environment variables required for the production deployment of WorkShetu across **Render** (Backend), **Vercel** (Frontend), and **MongoDB Atlas** (Database).

---

## 1. Backend Environment Variables (Render)

Set these in **Render Dashboard** → Your Web Service (`workshetu-api`) → **Environment**.

| Variable | Required | Sensitive | Description & Production Value |
|---|---|---|---|
| `NODE_ENV` | **Yes** | No | Set to `production`. Enables secure cookie handling and optimized Express runtime. |
| `PORT` | **Yes** | No | Render automatically sets this (default `10000`). Express listens via `process.env.PORT`. |
| `MONGO_URL` | **Yes** | **YES** | MongoDB Atlas TLS connection URI string (e.g. `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/workshetu?retryWrites=true&w=majority`). |
| `SESSION_SECRET` | **Yes** | **YES** | Random 32+ character string used to cryptographically sign session cookies and OTP encryption. |
| `CLIENT_URL` | **Yes** | No | Primary production frontend URL (e.g. `https://workshetu.com`). |
| `FRONTEND_URL` | Optional | No | Alternate frontend URL (e.g. `https://workshetu.vercel.app`). |
| `CUSTOM_DOMAIN` | Optional | No | Custom apex domain (e.g. `workshetu.com`). Automatically configures CORS for apex and `www`. |
| `CLOUD_NAME` | **Yes** | No | Cloudinary cloud name for machine and driver document uploads. |
| `API_KEY` | **Yes** | **YES** | Cloudinary API key. |
| `API_SECRET` | **Yes** | **YES** | Cloudinary API secret. |
| `GROQ_API_KEY` | **Yes** | **YES** | Groq AI API key powering the Farmer Assistant, Driver Co-Pilot, and Labour Assistant. |
| `GROQ_MODEL` | Optional | No | AI model identifier (defaults to `openai/gpt-oss-120b`). |

> **Security Rule**: Never commit real secret values to Git or paste them in issue trackers. All backend credentials must only be injected via Render's encrypted environment variables.

---

## 2. Frontend Environment Variables (Vercel)

Set these in **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**.

| Variable | Required | Public in Build | Description & Production Value |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | Yes (Client-side) | The public URL of the Render backend web service (e.g. `https://workshetu-api.onrender.com` or `https://api.workshetu.com`). Omit trailing slash. |

> **Important**: In Vite, any variable prefixed with `VITE_` is bundled into the client JavaScript build and is public to anyone visiting the website. **Never put database connection strings, session secrets, or private API keys in Vite environment variables.**

---

## 3. Database Network Access (MongoDB Atlas)

- **Cluster**: Dedicated production Atlas cluster (`cluster0`).
- **Database Name**: `workshetu`.
- **IP Access List**:
  - Since Render Web Services operate across dynamic egress IP pools, configure Atlas Network Access with `0.0.0.0/0` (Allow Access from Anywhere) combined with strong database user authentication (SCRAM-SHA-256) and TLS encryption.
