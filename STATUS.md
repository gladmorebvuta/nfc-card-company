# NFC Card Company — Status

**Stack:** React + Vite + TypeScript  
**Firebase:** brandaptos-v2 (shared) | No own functions | Hosting: `brandapt-nfc`  
**Last updated:** 2026-04-19

## Feature Map

| Feature | Status | Notes |
|---------|--------|-------|
| **Profile Creation** | done | Users create digital business card profiles |
| **Profile Editor** | done | Edit contact info, links, bio, photo |
| **Public Profile Page** | done | Shareable URL at /c/:uniqueId |
| **QR Code Generation** | done | qrcode.react for sharing |
| **NFC Tap Logging** | done | Backend in BrandaptOS functions |
| **Contact Exchange** | done | Visitors exchange contact info |
| **Location Tagging** | done | Exchanges, views, saves tagged with location |
| **Analytics Dashboard** | done | Views, taps, link clicks, exchanges |
| **Link Click Tracking** | done | Outbound link analytics |
| **Contact Save (vCard)** | done | vCard download for visitors |
| **Notifications** | done | Real-time exchange/view notifications |
| **Onboarding Flow** | done | OnboardingModal for new users |
| **Events Page** | done | Event management for NFC cards |
| **Connections Page** | done | View all exchanges/connections |
| **Insights Page** | done | Detailed analytics breakdowns |
| **Live Events Stream** | done | `nfc_events` collection + `useEvents` hook (session analytics: view duration, link clicks, clicked email/phone/location) |
| **Follow-up Pipeline** | done | Lead pipeline on exchanges: `followUpStatus`, `followUpDate`, `employeeNotes`, `engagementScore` |
| **Public-Visitor Event Bumps** | done | Anonymous visitors can increment `viewCount` / `exchangeCount` on events |
| **CI/CD** | done | `.github/workflows/deploy.yml` — builds + deploys on push to main |
| **Auth** | done | Firebase Auth (shared pool) |
| **Team/Org Cards** | planned | Multiple cards per organization |
| **Custom Card Designs** | planned | Branded card templates |
| **CRM Integration** | planned | Export contacts to CRM tools |

## User Flows

1. **New User:** Sign up → onboarding → create profile → get NFC card/QR code
2. **Card Tap:** Physical tap → public profile loads → visitor views/exchanges → owner notified
3. **Analytics:** Owner → dashboard → view taps, views, exchanges, link clicks

## Decision Log

| Date | Decision | Rationale | Outcome |
|------|----------|-----------|---------|
| 2026-03 | Backend in BrandaptOS functions | Avoid 3rd functions codebase | ✅ Working |
| 2026-03 | Direct Firestore writes for exchanges | Removed dead Cloud Function call | ✅ Simpler |
| 2026-04 | Removed MUI deps (kept Radix/shadcn) | MUI was dead weight (0 imports) | ✅ Cleaner bundle |
| 2026-04-19 | `firestore.rules` / `firestore.indexes.json` are READ-ONLY mirrors of BrandaptOS | Per ecosystem CLAUDE.md — only BrandaptOS deploys rules/indexes | ✅ Banner added to rules file, firebase.json `firestore` + `storage` blocks removed |
| 2026-04-19 | `nfc_events` is the canonical analytics collection for sessions | Superset of `nfc_profile_views` — supports unauthenticated counter increments via field-scoped rule | ✅ Rule + indexes deployed via BrandaptOS |

## Known Issues

- Build bundle is 1.1MB (needs code-splitting)
- `src/imports/pasted_text/` contains copy-pasted roadmap content

## Tech Debt

- No tests
- `pasted_text` directory should be cleaned up
- Some unused Radix components still in package.json
- Firebase Web API key still hardcoded in `src/lib/firebase.ts` (low-risk — web keys are meant to be public; security enforced by Firestore rules — but should migrate to env vars for consistency)
- `BrandApt_NFC_Platform_Features.pdf` is committed as a binary in `docs/` (46 KB) — fine for now, reconsider if it grows

## Cross-App Dependencies

| Dependency | Direction | What |
|-----------|-----------|------|
| BrandaptOS | → depends on | NFC backend functions (profile CRUD, tap logging, etc.) |
| BrandaptOS | → depends on | Firestore rules for nfc_* collections |
| BrandaptOS | → depends on | Hosting deployed from BrandaptOS .firebaserc |
