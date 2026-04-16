# Changelog — NFC Card Company

All notable changes are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/).

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
