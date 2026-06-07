# Prompt Library

A professional SaaS workspace to build, organize, tag, and reuse AI prompts with dynamic variables.

## Tech Stack

- **Next.js 16** (App Router)
- **Firebase** (Firestore + Auth)
- **Stripe** (Payments)
- **Tailwind CSS v4**

## Features

- 🔒 Firebase Auth (Email + Google OAuth)
- 📝 Prompt management with dynamic `##variable##` injection
- 📁 Collections (group prompts into folders)
- 🕓 Version History (Power User tier)
- 🔑 API Key management with REST endpoints
- 💳 Stripe billing with sandbox + live mode
- 👑 Admin dashboard with user tier/status management
- 🌙 Dark / Light mode

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

Firebase config is embedded in `src/lib/firebase.js`.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/prompts` | List prompts (Bearer token) |
| `GET` | `/api/v1/prompts/:id` | Get a single prompt |
| `POST` | `/api/stripe/checkout-session` | Create Stripe session |
| `GET` | `/api/stripe/verify-session` | Verify Stripe payment |
