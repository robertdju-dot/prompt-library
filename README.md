# Prompt Library

A professional SaaS workspace to build, organize, tag, and reuse AI prompts with dynamic variables.

## Tech Stack

- **Next.js 16** (App Router)
- **Firebase** (Firestore + Auth)
- **Stripe** (Payments — sandbox + live mode)
- **Tailwind CSS v4**

## Features

- 🔒 Firebase Auth (Email + Google OAuth)
- 📝 Prompt management (CRUD, search, filter, pagination, version history)
- 📁 Collections (Firestore-backed folder grouping)
- 📊 Dashboard stat cards (dynamic prompt & collection counts)
- 💳 Stripe billing with sandbox + live mode
- 🧾 Invoice history (Firestore persistence, CSV export, status badges)
- 🔑 API Key management with REST endpoints
- 👑 Admin panel (user tier/status management, system logs, tier config)
- 🌙 Dark / Light mode
- 🖥️ Desktop zoom scaling (80%)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file:

```
STRIPE_SECRET_KEY=sk_test_...
```

Firebase config is in `src/lib/firebase.js`. For production, move values to env vars:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/prompts` | List prompts (Bearer token) |
| `GET` | `/api/v1/prompts/:id` | Get a single prompt |
| `POST` | `/api/stripe/checkout-session` | Create Stripe session |
| `GET` | `/api/stripe/verify-session` | Verify Stripe payment |

## Data Model (Firestore)

```
prompts/{id}              — prompt docs
collections/{id}          — user collections
users/{uid}               — user profile + tier
users/{uid}/invoices/{id} — billing history
checkoutSessions/{id}     — Stripe sandbox sessions
apiKeys/{id}              — API key records
settings/config           — tier pricing config
```

## Pushing Full Source with Git

Since git is not installed on this machine, install it from https://git-scm.com/download/win then run:

```bash
git init
git remote add origin https://github.com/robertdju-dot/prompt-library.git
git add .
git commit -m "Full source: dashboard, billing, admin, prompts"
git push -u origin main --force
```
