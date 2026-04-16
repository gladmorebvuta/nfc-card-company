# NFC Card Company — Digital Business Cards

> **Start every session by reading STATUS.md and CHANGELOG.md.**  
> **Use `./scripts/deploy.sh` instead of raw `firebase deploy`.**  
> **Update STATUS.md + CHANGELOG.md before your final commit.**

## Overview
NFC Card Company is a digital business card platform. Users create profiles, share via NFC taps or QR codes, and track engagement analytics. The frontend is a standalone React app; the backend lives inside BrandaptOS Cloud Functions.

## Tech Stack
- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS + Radix UI + shadcn pattern
- **Routing:** React Router
- **Database:** Cloud Firestore (shared project `brandaptos-v2`, `nfc_` prefixed collections)
- **Auth:** Firebase Auth (shared user pool)
- **Backend:** BrandaptOS Cloud Functions (`functions/src/nfc/`)

**NOTE:** This app has NO Cloud Functions of its own. All backend logic is in BrandaptOS.

## Architecture
- Frontend-only codebase — reads/writes Firestore directly for simple ops
- Complex operations (NFC tap logging, rate limiting, notifications) go through BrandaptOS functions
- Anonymous access patterns: visitors can view profiles, create exchanges, log views without auth
- Authenticated owners manage their own profiles and see analytics

## Commands
- `npm run dev` — Start Vite dev server
- `npm run build` — Production build

## Deploy Workflow
1. `npm run build`
2. Deploy from BrandaptOS repo: `firebase deploy --only hosting:nfc --project brandaptos-v2`
   (The NFC hosting target is defined in BrandaptOS's `.firebaserc`)
3. Commit and push

**Backend changes:** If you need to change NFC Cloud Functions, switch to the BrandaptOS repo and edit `functions/src/nfc/`.

**Rules changes:** If you need new Firestore rules for `nfc_*` collections, edit `firestore.rules` in BrandaptOS.

## File Structure
- `src/app/pages/` — Route pages (dashboard, profile editor, analytics, public profile)
- `src/app/components/ui/` — shadcn primitives
- `src/app/components/layout/` — App shell, navigation
- `src/app/hooks/` — Custom hooks (Firestore queries)
- `src/app/services/` — Firebase service layer
- `src/app/contexts/` — Auth context

## Key Firestore Collections
`nfc_profiles`, `nfc_exchanges`, `nfc_taps`, `nfc_link_clicks`, `nfc_profile_views`, `nfc_events`, `nfc_contact_saves`, `nfc_rate_limits`, `nfc_daily_stats`, `notifications`

## Known Tech Debt
- **MUI + Radix coexistence:** App was started with MUI, later added Radix/shadcn. MUI should be fully removed and replaced with Radix equivalents to reduce bundle size and improve consistency.
- **No tests**
- **`src/imports/pasted_text/`** — contains copy-pasted content that should be cleaned up or moved to proper data files
