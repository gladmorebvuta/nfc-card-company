# NFC Card Company — Digital Business Cards

## BEFORE YOU DO ANYTHING — Read These Files:
1. **STATUS.md** — feature map, decision log, what's WIP, what's done
2. **CHANGELOG.md** — what shipped recently
3. **This file** — conventions below

## BEFORE YOUR FINAL COMMIT:
1. **Update STATUS.md** — any feature status change, new decisions, new tech debt
2. **Append to CHANGELOG.md** — Added/Changed/Fixed/Removed under today's date
3. **Use `./scripts/deploy.sh`** instead of raw `firebase deploy`

## How to Write Code (MANDATORY — governs every diff)

These behavioral rules apply to every edit here. They bias toward caution over speed; for trivial one-liners, use judgment. Gates define the bar; these define the mindset.

1. **Think before coding.** State assumptions; if uncertain, ask — especially whether logic belongs in this frontend (direct Firestore) or in BrandaptOS Cloud Functions (`functions/src/nfc/`), and whether the path is anonymous-visitor or authenticated-owner. This repo has NO functions of its own. Present alternatives instead of silently picking. Architecture tradeoffs go in the STATUS.md Decision Log.
2. **Simplicity first.** Minimum code that solves the problem. No speculative features, no single-use abstractions, no error handling for impossible cases. 200 lines that could be 50 → rewrite. Ask: "Would a senior engineer call this overcomplicated?"
3. **Surgical changes.** Touch only what you must; don't refactor what isn't broken or restyle adjacent code. Match the repo's patterns — shadcn/Radix, the `nfc_` collection prefix. Remove only the orphans YOUR change created; log unrelated dead code to STATUS.md rather than deleting it. Every changed line traces to the request.
4. **Goal-driven execution.** Turn vague tasks into verifiable goals ("fix the bug" → "write a failing test, then make it pass"). For multi-step work, state a brief plan with a verify step each. **Verify =** `npm run build`; any rules or functions change is verified from BrandaptOS, not here.

**Working if:** fewer stray diffs, fewer overcomplication rewrites, and questions land before implementation rather than after.

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

## Parallel Agents

If multiple agents are active on this repo, **use worktrees** (see root CLAUDE.md for full protocol).

**Single-agent-only:** `package.json`, `firebase.json`, `src/app/routes.tsx`  
**Safe to parallelize:** Different page files, different hook files, different component dirs

**Remember:** Backend changes for NFC go in BrandaptOS (`functions/src/nfc/`), not here.

## Known Tech Debt
- **No tests**
- **`src/imports/pasted_text/`** — contains copy-pasted content that should be cleaned up or moved to proper data files
