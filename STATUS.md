# NFC Card Company — Status

**Stack:** React + Vite + TypeScript  
**Firebase:** brandaptos-v2 (shared) | No own functions | Hosting: `brandapt-nfc`  
**Last updated:** 2026-04-16

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

## Known Issues

- Build bundle is 1.1MB (needs code-splitting)
- `src/imports/pasted_text/` contains copy-pasted roadmap content

## Tech Debt

- No tests
- No CI/CD pipeline
- `pasted_text` directory should be cleaned up
- Some unused Radix components still in package.json

## Cross-App Dependencies

| Dependency | Direction | What |
|-----------|-----------|------|
| BrandaptOS | → depends on | NFC backend functions (profile CRUD, tap logging, etc.) |
| BrandaptOS | → depends on | Firestore rules for nfc_* collections |
| BrandaptOS | → depends on | Hosting deployed from BrandaptOS .firebaserc |
