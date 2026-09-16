# Shelf Swap

A marketplace for trading used books. List a book as **Sell / Swap / Free** (or any combination), negotiate with offers, message other users in real time, and build a ratings & wishlist history — all powered by Firebase.

Built with **Next.js (App Router) + TypeScript**, styled with **Tailwind + shadcn/ui**, and backed by **Firebase (Auth, Firestore, Storage)**.

## Features

- 📚 **Browse & search** — marketplace grid with filters (sell/swap/free), detail pages with related books
- 💰 **List a book** — create/edit listings, optional AI-generated description (Gemini), ISBN lookup
- 🤝 **Offers & negotiation** — make offers (price + optional swap items), accept/reject from "My Offers" (received / sent tabs)
- 💬 **Real-time messaging** — inbox and conversations subscribe to Firestore (`onSnapshot`); accepting an offer opens a chat between seller and buyer
- 🔔 **In-app notifications** — offer events, messages, and system notices with unread state
- ⭐ **Ratings & wishlist** — user ratings, saved books
- 🌍 **i18n & currency** — English/Arabic UI toggle, USD/SAR pricing

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions, Turbopack) + TypeScript |
| UI | React 18, Tailwind CSS, shadcn/ui, lucide-react |
| Forms | react-hook-form + zod (client & server validated) |
| Backend | Firebase Auth, Cloud Firestore, Cloud Storage |
| AI | Google Gemini (description generation), Google Books API (ISBN lookup) |
| Data fetching | Firestore web SDK (real-time listeners, pagination) + server actions |

## Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project (Auth with email/password enabled, Firestore, Storage)

### Install

```bash
npm install
```

### Environment variables

Create `.env.local` (copy the variables below) — values come from your Firebase console and Google/Gemini keys:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=...
GEMINI_API_KEY=...
```

Optional server-side admin SDK (only needed for the `/api/*` REST routes to hit real Firestore instead of sample data):

```env
FIREBASE_SERVICE_ACCOUNT_KEY={ "type": "service_account", ... }
```

### Run locally

```bash
npm run dev       # starts on http://localhost:9003
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (Turbopack, port 9003) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` — full type check |
| `npm run cypress:run` | Run e2e tests |
| `npm run genkit:dev` | Start the Genkit dev UI |

## Project Structure

```
src/
├── app/                  # Pages — folder name = URL (App Router)
│   ├── marketplace/      # Browse + listing detail
│   ├── profile/          # Dashboard, listings, offers, messages, settings, wishlist
│   ├── messages/         # Inbox
│   ├── notifications/    # Notification hub
│   └── (auth)/           # Login / register / password reset
├── components/
│   ├── marketplace/      # Listing form + filters + details
│   ├── offers/           # Offer dialog + offer card
│   ├── messaging/        # Chat interface, conversation list
│   ├── notifications/    # Notification item + bell
│   └── ui/               # shadcn primitives
├── contexts/             # Auth, notifications, theme, language, currency, wishlist
├── lib/
│   ├── actions/          # Server actions (writes): listings, offers, messages, ratings, wishlist
│   ├── firebase/         # Firebase config + query modules (reads)
│   ├── schemas.ts        # zod schemas (shared client/server validation)
│   └── types/...         # Shared helpers
├── types/                # Shared TypeScript contracts
├── ai/                   # Gemini-powered description generation
└── locales/              # i18n strings
```

## Architecture Notes

- **No REST for writes** — mutations go through **server actions**, which re-validate input (zod) and permissions server-side, write to Firestore, then `revalidatePath` affected pages.
- **Denormalized for reads** — seller info is stored on listing docs and `lastMessage` on conversation docs so Firestore (no joins) renders lists in a single read.
- **Race-safe offers** — accepting an offer runs inside a Firestore `runTransaction` so two buyers can't both be accepted for one listing.
- **Real-time** — inbox/thread pages and notifications use Firestore `onSnapshot` listeners; message history paginates via cursors.

## Deployment

Deploys on **Vercel** from the `main` branch. Add the environment variables above in the Vercel dashboard (highlighted names with the `NEXT_PUBLIC_` prefix are exposed to the browser; the rest are server-only).

> ⚠️ Before going live, deploy hardened **Firestore security rules** (`firestore.rules`) and review the Storage rules so data access is enforced server-side and client-side.

## License

Private project — all rights reserved.