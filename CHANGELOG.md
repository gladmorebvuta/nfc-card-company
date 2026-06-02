# Changelog — NFC Card Company

All notable changes are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/).

## 2026-06-02

### Changed
- Rebranded the entire app from the white-label "MCG" theme to the Brandapt design system: design tokens in `src/styles/theme.css` swapped to navy `#030213`/dark-first palette, glassmorphism utilities added, and `Qugan` font replaced with `Space Mono` (`src/styles/fonts.css`).
- Swept ~270 hardcoded MCG purple/orange hex values (`#2E1065`, `#F97316`, cream/peach tints) → Brandapt navy/blue across all pages and components; social-platform brand colors preserved.
- Redesigned the digital business card (`FlippableCard.tsx`) as a code-rendered Brandapt card (navy + Space Mono + Lucide contact icons, profile-driven, no static client SVGs) while keeping the 3D flip mechanics.
- Replaced MCG logo usage with a theme-aware `BrandaptLogo` component across AuthPage, Dashboard, Onboarding, PublicProfile, and DashboardLayout; updated "Middlesex Consulting Group" strings (vCard ORG, share titles, auth copy) to Brandapt.
- `index.html` title/OG/Twitter/theme-color updated to "Brandapt Cards"; `public/llms.txt` rebranded.

### Added
- `src/app/components/ThemeProvider.tsx` (dark-first light/dark/system theme context) and `src/app/components/BrandaptLogo.tsx`, mounted via `src/main.tsx`.
- Brandapt brand assets copied from BrandaptOS into `public/`: `favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`, `logo-light.png`, `logo-dark.png`.

### Removed
- Orphaned MCG SVG assets in `src/assets/` and `src/imports/`, plus the dead `src/app/test.ts` debug file.

## 2026-04-19

### Added
- 17:35 UTC — `nfc_events` analytics pipeline: `useEvents` hook (live session stream with view duration, link reach, click breakdown), `useInsights` hook (views-by-day, views-by-source, link-click totals), `eventsService` with `incrementEventStat` for anonymous visitor counter bumps.
- 17:35 UTC — Events page for in-person tradeshow mode (create/end event sessions).
- 17:35 UTC — Lead pipeline fields on exchanges: `engagementScore`, `followUpStatus`, `followUpDate`, `employeeNotes`, `sessionId`.
- 17:35 UTC — Onboarding flow: `Onboarding` page + `OnboardingModal` component + `allowUnboarded` flag on `ProtectedRoute`, wired to `/onboarding` route.
- 17:35 UTC — `.github/workflows/deploy.yml` — GitHub Actions deploy to `hosting:nfc` on push to main.
- 17:35 UTC — `docs/BrandApt_NFC_Platform_Features.pdf` — moved from repo root into `docs/`.
- 17:30 UTC — `.github/workflows/require-changelog.yml` — CI check blocking code PRs that don't update `CHANGELOG.md`. Escape hatches: `[skip-changelog]` in PR title, `skip-changelog` label, or docs-/CI-/config-only PRs.
- 17:30 UTC — `.github/pull_request_template.md` — PR template with CHANGELOG + STATUS + tests checklist.

### Changed
- 17:35 UTC — Dashboard rebuilt around `useEvents` + `useInsights`; Connections page expanded with follow-up pipeline UI; EditProfile + PublicProfile improvements; vCard + hooks updated for new event flow.
- 17:35 UTC — AuthContext cleaned up (unique-slug generation simplified, `deleteDoc` import added).
- 17:35 UTC — Minor UI primitive tweaks: `dialog`, `input`, `sheet`, `textarea`, `DashboardLayout`, `ExchangeForm`, `ProtectedRoute`.
- 17:35 UTC — `firestore.rules` now carries a READ-ONLY banner; `nfc_events` rule block synced with BrandaptOS source of truth.
- 17:35 UTC — `firestore.indexes.json` synced with BrandaptOS (`nfc_exchanges` by `followUpStatus`, `nfc_events` by `createdAt`).

### Removed
- 17:35 UTC — `firestore` and `storage` blocks from `firebase.json` — those configs belong to BrandaptOS only (per ecosystem CLAUDE.md).

## 2026-04-16

### Added
- CLAUDE.md with stack, deploy workflow, known tech debt
- STATUS.md master feature tracker
- This changelog

### Removed
- Dead MUI dependencies (@emotion, @mui, react-dnd, react-slick, react-popper)

## 2026-04-13

### Changed
- Expanded .gitignore with build, mobile, and service account patterns

## 2026-03-29

### Added
- Location tagging on exchanges, profile views, and contact saves

### Fixed
- Exchanges write directly to Firestore (removed dead Cloud Function call)

## 2026-03-27

### Added
- Initial NFC card company platform
- Real Firestore data wiring, hooks fixes, deployed to nfc.brandapt.co
