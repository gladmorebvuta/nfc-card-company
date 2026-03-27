# NFC Card Platform — BrandaptOS Integration Plan

## Architecture Decision: One Firebase Project, Two Frontends

The NFC Card app runs on the **same Firebase project** (`brandaptos-v2`) as BrandaptOS. This is not a shortcut — it's the architecture that gives us shared auth infrastructure, a single Firestore instance for cross-product analytics, unified Cloud Functions deployment, and the ability to manage the NFC venture from inside BrandaptOS exactly like Pamhepo.

```
brandaptos-v2 (Firebase Project)
├── Hosting: brandapt.co          → BrandaptOS (admin dashboard, venture studio)
├── Hosting: cards.brandapt.co    → NFC Card App (public profiles, card dashboard)
├── Cloud Functions                → Shared API layer (both apps call the same functions)
├── Firestore                      → Single database, collections scoped by prefix
├── Firebase Auth                  → Shared auth — one account works everywhere
└── Firebase Storage               → Profile photos, card assets
```

**What this means for the NFC roadmap spec:**
- "Backend: TBD" → **Firebase Cloud Functions v2** (Node 20, TypeScript)
- "Frontend deployed as static build on cPanel" → **Firebase Hosting** (multi-site, CDN, SSL)
- "JWT tokens or sessions?" → **Firebase Auth ID tokens** (handled by SDK, no manual JWT management)
- "SQL database?" → **Firestore** (NoSQL, real-time listeners, native vector search, scales to zero)
- "CORS & deployment?" → **Same Firebase project** — CORS pre-configured, staging via preview channels

---

## 1. Firestore Data Model

All NFC collections are prefixed with `nfc_` to avoid collisions with existing BrandaptOS collections. This is a flat Firestore structure (not deeply nested) for query flexibility and security rule simplicity.

### 1.1 `nfc_profiles/{profileId}`

The core entity — one per card owner. This is what the public sees when they tap a card.

```typescript
interface NfcProfile {
  // Identity
  id: string;                      // Auto-generated Firestore doc ID
  uid: string;                     // Firebase Auth UID (FK → users/{uid})
  uniqueId: string;                // URL slug: "sarah-jenkins" or "abc123" (unique, indexed)

  // Display fields
  firstName: string;
  lastName: string;
  displayName: string;             // Computed: "Sarah Jenkins"
  jobTitle: string | null;
  company: string | null;
  department: string | null;
  bio: string | null;              // V2
  emailPublic: string | null;      // Public contact email (may differ from auth email)
  phone: string | null;
  office: string | null;

  // Media
  avatarUrl: string | null;        // Firebase Storage URL
  coverUrl: string | null;         // Firebase Storage URL

  // Social & links (V2)
  links: Array<{
    id: string;
    platform: string;              // "linkedin" | "twitter" | "website" | "calendly" | "custom"
    url: string;
    label: string;
    sortOrder: number;
  }>;

  // Theming (V2)
  theme: {
    primaryColor: string;          // Hex
    accentColor: string;           // Hex
    preset: string | null;         // "dark" | "light" | "ocean" | "custom"
  } | null;

  // Denormalized stats (updated by Cloud Function triggers, NOT by client)
  stats: {
    totalViews: number;            // From nfc_taps count
    totalExchanges: number;        // From nfc_exchanges count
    totalSaves: number;            // From nfc_events where type='contact_save'
  };

  // Status
  isActive: boolean;               // Can be deactivated (hides public page)
  plan: 'free' | 'pro' | 'enterprise';  // V3: determines feature access

  // Venture link (BrandaptOS integration)
  ventureId: string;               // Always "nfc-cards" — ties analytics to venture

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes required:**
- `uniqueId ASC` (single-field, for public profile lookup)
- `uid ASC` (single-field, for "my profile" lookup)
- `company ASC, createdAt DESC` (composite, for enterprise team views in V4)

### 1.2 `nfc_exchanges/{exchangeId}`

When Person B fills the contact exchange form on Person A's card.

```typescript
interface NfcExchange {
  id: string;
  profileId: string;               // FK → nfc_profiles/{profileId} (whose card was tapped)
  profileUid: string;              // Denormalized owner UID (for security rules + queries)

  // Visitor info (Person B)
  visitorName: string;             // Required
  visitorEmail: string;            // Required
  visitorPhone: string | null;     // Optional
  visitorCompany: string | null;   // Optional
  visitorNote: string | null;      // Optional: "Met at TechCrunch Disrupt"

  // Metadata
  source: 'nfc' | 'qr' | 'direct_link';
  tagId: string | null;            // V4: which specific NFC tag triggered this
  userAgent: string | null;
  ipAddress: string | null;        // For geo lookup (server-side only, never sent to client)

  // Status
  isRead: boolean;                 // Card owner has viewed this exchange
  isArchived: boolean;             // Card owner archived it

  createdAt: Timestamp;
}
```

**Indexes required:**
- `profileUid ASC, createdAt DESC` (composite, for exchange log pagination)
- `profileUid ASC, isArchived ASC, createdAt DESC` (composite, for filtered view)

### 1.3 `nfc_taps/{tapId}`

Analytics events — one per public profile view. Written by Cloud Function, never by client.

```typescript
interface NfcTap {
  id: string;
  profileId: string;               // FK → nfc_profiles
  profileUid: string;              // Denormalized for queries

  // Device info (parsed server-side from User-Agent)
  userAgent: string | null;
  deviceType: 'mobile' | 'desktop' | 'tablet' | null;
  os: string | null;               // "iOS 17", "Android 14"
  browser: string | null;          // "Safari", "Chrome"

  // Geo (derived from IP server-side)
  ipHash: string | null;           // SHA256 of IP (never store raw IP — GDPR)
  city: string | null;
  country: string | null;
  countryCode: string | null;

  // Source tracking
  source: 'nfc' | 'qr' | 'direct_link';
  tagId: string | null;            // V4: which physical tag
  referrer: string | null;

  tappedAt: Timestamp;
}
```

**Indexes required:**
- `profileUid ASC, tappedAt DESC` (composite, for analytics timeline)
- `profileUid ASC, deviceType ASC, tappedAt DESC` (composite, for device breakdown)
- `profileUid ASC, country ASC, tappedAt DESC` (composite, for location breakdown)

### 1.4 `nfc_tags/{tagId}` (V4)

Physical NFC tag inventory and linking.

```typescript
interface NfcTag {
  id: string;
  uid: string;                     // Owner's Firebase Auth UID
  profileId: string;               // FK → nfc_profiles (which profile this tag opens)
  serialNumber: string | null;     // Physical tag serial (from manufacturer)
  label: string | null;            // User-assigned: "Black metal card"
  nfcUrl: string;                  // The URL encoded on the tag: cards.brandapt.co/c/{uniqueId}
  isActive: boolean;               // Can be deactivated if lost
  linkedAt: Timestamp;
  createdAt: Timestamp;
}
```

### 1.5 `nfc_daily_stats/{profileId}/days/{YYYY-MM-DD}` (V3)

Pre-aggregated daily stats. Written by a scheduled Cloud Function (runs nightly). This avoids expensive real-time aggregation queries on the taps collection.

```typescript
interface NfcDailyStat {
  date: string;                    // "2026-03-26"
  profileId: string;
  views: number;
  exchanges: number;
  contactSaves: number;
  linkClicks: number;
  byDevice: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  byCountry: Record<string, number>;  // { "ZW": 14, "US": 3, "ZA": 8 }
  bySource: {
    nfc: number;
    qr: number;
    directLink: number;
  };
}
```

### 1.6 Reusing Existing BrandaptOS Collections

These collections already exist and the NFC app plugs into them directly:

| Collection | How NFC Uses It |
|---|---|
| `users/{uid}` | NFC users get the same user doc with `role: 'nfc-user'` (new role) |
| `ventures/nfc-cards` | The NFC Card Company venture — managed from BrandaptOS Flight Deck |
| `ventures/nfc-cards/logs/{logId}` | Decision log entries from VentureChat about NFC strategy |
| `venture_conversations/{id}` | VentureChat conversations about the NFC venture |
| `knowledge_chunks/{id}` | RAG docs with `metadata.ventureId: 'nfc-cards'` |
| `venture_metrics/nfc-cards/daily/{date}` | Business-level metrics aggregated from nfc_taps |

---

## 2. Cloud Functions API

All NFC endpoints are Cloud Functions v2 (`onRequest`) deployed from the **same `functions/` directory** as existing BrandaptOS functions. They share the same Node.js runtime, `firebase-admin` instance, and deployment pipeline.

### 2.1 File Structure

```
functions/src/
├── index.ts              ← Existing (add NFC exports)
├── ventureChat.ts        ← Existing
├── modelRouter.ts        ← Existing
├── rag.ts                ← Existing
├── prompts.ts            ← Existing
├── types.ts              ← Existing
│
├── nfc/                  ← NEW: NFC-specific functions
│   ├── publicProfile.ts      → GET  /nfcPublicProfile?id={uniqueId}
│   ├── profileCrud.ts        → POST /nfcProfileUpdate (authenticated)
│   ├── exchange.ts           → POST /nfcExchange (public, rate-limited)
│   ├── contacts.ts           → GET  /nfcContacts (authenticated, paginated)
│   ├── tapLogger.ts          → POST /nfcLogTap (public, fire-and-forget)
│   ├── analytics.ts          → GET  /nfcAnalytics (authenticated)
│   ├── photoUpload.ts        → POST /nfcPhotoUpload (authenticated, V2)
│   ├── tagManager.ts         → CRUD /nfcTags (authenticated, V4)
│   ├── notifier.ts           → Firestore trigger: email on new exchange
│   └── statsAggregator.ts    → Scheduled: nightly stats roll-up
│
└── nfc/types.ts          ← NFC-specific TypeScript interfaces
```

### 2.2 V1 Endpoints

**`nfcPublicProfile`** — Fetch public profile by unique slug
```
GET https://us-central1-brandaptos-v2.cloudfunctions.net/nfcPublicProfile?id=sarah-jenkins

Response 200:
{
  profile: {
    displayName: "Sarah Jenkins",
    jobTitle: "Principal Product Designer",
    company: "Middlesex Consulting Group",
    emailPublic: "sarah.j@mcg.com",
    phone: "+1 (555) 123-4567",
    avatarUrl: "https://storage.googleapis.com/...",
    links: [...],
    theme: null
  }
}

Response 404: { error: "Profile not found" }
```
- No auth required (public endpoint)
- Rate limited: 100 req/min per IP
- Strips internal fields (uid, stats, plan)

**`nfcProfileUpdate`** — Create or update profile
```
POST /nfcProfileUpdate
Authorization: Bearer {Firebase ID Token}

Body: {
  firstName: "Sarah",
  lastName: "Jenkins",
  jobTitle: "Principal Product Designer",
  ...partial profile fields
}

Response 200: { profile: { ...updated fields } }
```
- Requires Firebase Auth
- Creates profile if none exists for this UID
- Auto-generates `uniqueId` on first create (slugified name + random suffix)
- Validates uniqueId uniqueness on custom slug changes (V2)

**`nfcExchange`** — Public contact exchange (the core loop)
```
POST /nfcExchange

Body: {
  profileId: "abc123",         // Which card was tapped
  visitorName: "Alex Thompson",
  visitorEmail: "alex@stripe.com",
  visitorPhone: "+1...",       // optional
  visitorCompany: "Stripe",    // optional
  visitorNote: "Met at event"  // optional
  source: "nfc"                // "nfc" | "qr" | "direct_link"
}

Response 200: { status: "success", exchangeId: "xyz" }
```
- No auth required (public endpoint — Person B is anonymous)
- Rate limited: 5 exchanges per IP per hour (anti-spam)
- Triggers `nfcExchangeNotifier` to email the card owner
- Increments `nfc_profiles/{id}.stats.totalExchanges` atomically

**`nfcContacts`** — Paginated exchange log
```
GET /nfcContacts?page=1&limit=20&archived=false
Authorization: Bearer {Firebase ID Token}

Response 200: {
  contacts: [...],
  total: 86,
  page: 1,
  pages: 5
}
```
- Requires Firebase Auth
- Returns only exchanges where `profileUid == caller's UID`
- Supports `?search=stripe` for name/company filtering
- Supports `?archived=true` to show archived exchanges

**`nfcLogTap`** — Silent analytics ping (fire-and-forget)
```
POST /nfcLogTap

Body: {
  profileId: "abc123",
  source: "nfc",
  referrer: "..."
}

Response 200: { status: "ok" }
```
- No auth required
- Rate limited: 1 per IP per profile per minute (dedup)
- Server-side: parses User-Agent, hashes IP, does geo lookup
- Increments `nfc_profiles/{id}.stats.totalViews` atomically

### 2.3 V2 Endpoints

**`nfcPhotoUpload`** — Profile photo upload
```
POST /nfcPhotoUpload
Authorization: Bearer {Firebase ID Token}
Content-Type: multipart/form-data

Body: file (max 5MB, JPEG/PNG/WebP)

Response 200: { url: "https://storage.googleapis.com/..." }
```
- Resizes to 500x500 server-side (Sharp library)
- Stores in Firebase Storage: `nfc-profiles/{uid}/avatar.webp`
- Updates `nfc_profiles/{id}.avatarUrl` automatically

### 2.4 V3 Endpoints

**`nfcAnalytics`** — Pre-aggregated analytics
```
GET /nfcAnalytics?from=2026-01-01&to=2026-03-26&metric=summary
Authorization: Bearer {Firebase ID Token}

Response 200: {
  summary: { totalViews: 2845, totalExchanges: 86, totalSaves: 342 },
  timeline: [ { date: "2026-03-25", views: 14, exchanges: 2 }, ... ],
  devices: { mobile: 1840, desktop: 680, tablet: 325 },
  countries: { "ZW": 1200, "ZA": 800, "US": 400, ... },
  sources: { nfc: 2100, qr: 500, directLink: 245 }
}
```
- Reads from `nfc_daily_stats` (pre-aggregated), not raw taps
- Fast: no scanning millions of tap docs

### 2.5 Firestore Triggers

**`nfcExchangeNotifier`** — Email on new exchange
```typescript
// Trigger: onDocumentCreated("nfc_exchanges/{exchangeId}")
// Action: Send email to card owner via SendGrid/Mailgun
// Template: "New contact from {visitorName} at {visitorCompany}"
```

**`nfcStatsAggregator`** — Nightly roll-up
```typescript
// Trigger: onSchedule("every day 02:00") or onDocumentCreated("nfc_taps/{tapId}")
// Action: Read today's taps → write/update nfc_daily_stats/{profileId}/days/{date}
// Also: Update venture_metrics/nfc-cards/daily/{date} for BrandaptOS dashboard
```

---

## 3. Firestore Security Rules

Added inside the existing `firestore.rules` file:

```
// ─── NFC Card Platform ────────────────────────────────────────────────

// Public profiles — anyone can read (public card page), owner can write
match /nfc_profiles/{profileId} {
  allow read: if true;  // Public card page needs unauthenticated read
  allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow update: if request.auth != null &&
    (resource.data.uid == request.auth.uid || isAdmin());
  allow delete: if isAdmin();
}

// Exchanges — profile owner reads their own, public can create (exchange form)
match /nfc_exchanges/{exchangeId} {
  allow read: if request.auth != null &&
    (resource.data.profileUid == request.auth.uid || isAdmin());
  allow create: if true;  // Public exchange form (rate limiting at function level)
  allow update: if request.auth != null &&
    (resource.data.profileUid == request.auth.uid || isAdmin());
  allow delete: if isAdmin();
}

// Taps — written only by Cloud Functions (server-side), readable by profile owner
match /nfc_taps/{tapId} {
  allow read: if request.auth != null &&
    (resource.data.profileUid == request.auth.uid || isAdmin());
  allow write: if false;  // Server-side only
}

// Tags (V4) — owner CRUD, admin full access
match /nfc_tags/{tagId} {
  allow read: if request.auth != null &&
    (resource.data.uid == request.auth.uid || isAdmin());
  allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow update: if request.auth != null &&
    (resource.data.uid == request.auth.uid || isAdmin());
  allow delete: if request.auth != null &&
    (resource.data.uid == request.auth.uid || isAdmin());
}

// Daily stats — read by profile owner, written by Cloud Functions only
match /nfc_daily_stats/{profileId}/days/{date} {
  allow read: if request.auth != null;
  allow write: if false;  // Server-side only (aggregator function)
}
```

---

## 4. Auth Strategy

### 4.1 NFC Card Users vs BrandaptOS Admins

Same Firebase Auth instance, different roles:

| Role | Set When | Access |
|---|---|---|
| `admin` | First login if email in `BOOTSTRAP_ADMIN_EMAILS` | Full BrandaptOS + all NFC data |
| `nfc-user` | NFC card app registration | Own NFC profile, exchanges, analytics |
| `nfc-enterprise-admin` | Assigned by admin (V4) | Team NFC profiles + billing |

### 4.2 NFC Auth Flow

The NFC app uses Firebase Auth directly — **no custom JWT, no backend auth endpoints**.

```
1. User opens cards.brandapt.co/login
2. Options: Google SSO, Email/Password, or Email Link (magic link)
3. Firebase Auth SDK handles token lifecycle (refresh, persistence)
4. On first sign-in:
   - AuthContext checks if users/{uid} exists
   - If not: creates users/{uid} with role: 'nfc-user'
   - Creates empty nfc_profiles/{id} with uid + auto-generated uniqueId
5. Subsequent logins: AuthContext reads role from users/{uid}
6. All API calls: getIdToken() → Authorization: Bearer {token}
```

This answers the roadmap spec questions:
- **"JWT or sessions?"** → Firebase ID tokens (auto-refreshed, no manual management)
- **"Where does the token go?"** → `Authorization: Bearer {token}` header
- **"Token refresh?"** → Firebase SDK handles silently
- **"Email verification?"** → Firebase Auth has built-in email verification
- **"Registration auto-creates profile?"** → Yes, in AuthContext on first login

### 4.3 Shared AuthContext Pattern

The NFC app gets its own `AuthContext` that mirrors BrandaptOS's pattern but with NFC-specific role handling:

```typescript
// NFC Card App: src/contexts/AuthContext.tsx
// Same Firebase project, same auth instance, different role expectations

const firebaseConfig = {
  // SAME config as BrandaptOS — same project
  projectId: "brandaptos-v2",
  ...
};
```

A user who has both `admin` and `nfc-user` access (e.g., Gladmore testing the NFC app) gets admin-level access automatically via the existing `isAdmin()` security rule function.

---

## 5. Multi-Site Hosting

### 5.1 Firebase Hosting Targets

Update `.firebaserc` in BrandaptOS:

```json
{
  "projects": { "default": "brandaptos-v2" },
  "targets": {
    "brandaptos-v2": {
      "hosting": {
        "main": ["brandaptos-v2"],
        "nfc": ["brandapt-nfc"]
      }
    }
  }
}
```

Update `firebase.json` in BrandaptOS:

```json
{
  "hosting": [
    {
      "target": "main",
      "public": "dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }],
      "headers": [...]
    },
    {
      "target": "nfc",
      "public": "../NFC Card Company/dist",
      "rewrites": [
        { "source": "/api/**", "function": "nfcApi" },
        { "source": "**", "destination": "/index.html" }
      ],
      "headers": [
        {
          "source": "/c/**",
          "headers": [
            { "key": "Cache-Control", "value": "public, max-age=300" }
          ]
        }
      ]
    }
  ]
}
```

### 5.2 Custom Domains

- `brandapt.co` → BrandaptOS (already configured)
- `cards.brandapt.co` → NFC Card App (add in Firebase Console → Hosting → Custom Domains)

### 5.3 NFC URL Scheme

Physical NFC tags encode: `https://cards.brandapt.co/c/{uniqueId}`

Routes in NFC app:
```
/                       → Landing page (marketing)
/c/{uniqueId}           → Public profile (the card page)
/login                  → Auth page
/register               → Registration
/dashboard              → Overview (stats, recent exchanges)
/dashboard/edit         → Profile editor
/dashboard/connections  → Exchange log
/dashboard/analytics    → V3: Charts & insights
/dashboard/tags         → V4: NFC tag management
/dashboard/settings     → V4: Account settings
```

---

## 6. NFC App → BrandaptOS Integration Points

### 6.1 Venture Metrics Pipeline

Every NFC tap, exchange, and contact save flows into the BrandaptOS venture dashboard:

```
NFC App Event
    ↓
nfc_taps / nfc_exchanges (Firestore write)
    ↓
nfcStatsAggregator (Firestore trigger or scheduled function)
    ↓
nfc_daily_stats/{profileId}/days/{date}     ← NFC app reads for analytics
    ↓
venture_metrics/nfc-cards/daily/{date}      ← BrandaptOS reads for Flight Deck
```

BrandaptOS already renders `venture_metrics` in the VentureWorkspacePage vital signs panel. No frontend changes needed — just writing to the right collection.

### 6.2 VentureChat for NFC Strategy

The NFC venture already has a VentureChat entry point in BrandaptOS:
- Venture document: `ventures/nfc-cards` (name: "NFC Card Company", stage: "MVP Development")
- VentureChat: `venture-chat/nfc-cards` — AI cofounder conversations about NFC strategy
- RAG: Upload NFC product specs, pricing, competitor analysis → scoped to `ventureId: 'nfc-cards'`
- Decision log: AI-extracted decisions from VentureChat auto-log to `ventures/nfc-cards/logs`

### 6.3 MCP Server Extensions

Add NFC-specific tools to the existing `brandapt-mcp-server`:

```typescript
// New tools in brandapt-mcp-server/src/tools/nfc.ts

brandapt_nfc_get_metrics      → Read nfc_daily_stats for a profile or all profiles
brandapt_nfc_list_profiles    → List all NFC profiles with stats
brandapt_nfc_list_exchanges   → Recent exchanges across all profiles
brandapt_nfc_get_analytics    → Aggregated analytics (taps, devices, locations)
```

This lets Claude (via MCP) answer questions like:
- "How many card taps did we get this week?"
- "What's the exchange conversion rate?"
- "Which countries are seeing the most NFC taps?"

### 6.4 Knowledge Base Integration

NFC product documents can be ingested into the existing RAG pipeline:

```bash
# From BrandaptOS, ingest the NFC roadmap
curl -X POST https://us-central1-brandaptos-v2.cloudfunctions.net/ingestDocument \
  -H "Content-Type: application/json" \
  -d '{
    "content": "...NFC platform roadmap text...",
    "metadata": {
      "source": "nfc-card-platform-roadmap.md",
      "sourceType": "md",
      "ventureId": "nfc-cards"
    }
  }'
```

Then VentureChat for the NFC venture automatically gets this context in conversations.

---

## 7. NFC App Frontend Migration

### 7.1 What Changes

The current NFC app is a Figma Make export with localStorage. Here's what gets replaced:

| Current | Becomes |
|---|---|
| `ProfileContext` + localStorage | Firebase Auth + Firestore `nfc_profiles` |
| `mockData.ts` hardcoded employee | Real profile from Firestore |
| `recentLeads` hardcoded array | Real-time Firestore listener on `nfc_exchanges` |
| No auth | Firebase Auth (Google SSO + Email/Password) |
| No backend | Cloud Functions API calls |
| `vcard.ts` (client-side only) | Still client-side, but data comes from Firestore |

### 7.2 What Stays

| Keep As-Is | Why |
|---|---|
| All UI components (shadcn/ui, Radix) | Production-quality, already styled |
| `FlippableCard` component | Core UX differentiator |
| `DashboardLayout` | Solid responsive layout |
| `vcard.ts` utility | Client-side vCard generation is correct |
| Tailwind/styling/theme | Consistent brand |
| `routes.tsx` structure | Clean route architecture |

### 7.3 New Files to Create

```
src/
├── lib/
│   └── firebase.ts              ← Firebase client config (same project as BrandaptOS)
├── contexts/
│   ├── AuthContext.tsx           ← Firebase Auth (replaces ProfileContext for auth)
│   └── ProfileContext.tsx        ← MODIFIED: reads from Firestore instead of localStorage
├── hooks/
│   ├── useNfcProfile.ts         ← Real-time Firestore listener for own profile
│   ├── usePublicProfile.ts      ← One-time fetch for public card page
│   ├── useExchanges.ts          ← Paginated exchange log with real-time updates
│   ├── useAnalytics.ts          ← Read nfc_daily_stats (V3)
│   └── useTags.ts               ← NFC tag CRUD (V4)
├── components/
│   ├── ProtectedRoute.tsx       ← Auth guard (mirrors BrandaptOS pattern)
│   └── ExchangeForm.tsx         ← Public exchange modal (calls nfcExchange function)
└── pages/
    ├── AuthPage.tsx             ← Login/Register (Firebase Auth UI)
    └── AnalyticsPage.tsx        ← V3: Charts dashboard
```

### 7.4 Firebase Client Config

```typescript
// NFC Card App: src/lib/firebase.ts
// SAME Firebase project as BrandaptOS

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCWwldeA6VuZN31GM5xoaEWGhgdA5MyXm4",
  authDomain: "brandaptos-v2.firebaseapp.com",
  projectId: "brandaptos-v2",
  storageBucket: "brandaptos-v2.firebasestorage.app",
  messagingSenderId: "561453413325",
  appId: "1:561453413325:web:XXXXXXXXXX"  // Create second web app in Firebase Console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

**Important**: Create a **second web app** in Firebase Console for the NFC site (different `appId`). Same project, different app registration — Firebase tracks analytics separately per app.

---

## 8. API Response Format

Answering the roadmap spec's question about standard response shapes:

```typescript
// Success
{
  status: "success",
  data: { ... }  // The actual payload
}

// Error
{
  status: "error",
  error: {
    code: "PROFILE_NOT_FOUND",         // Machine-readable
    message: "No profile found",        // Human-readable
    fields?: {                          // Validation errors (for forms)
      email: "Invalid email format",
      phone: "Must include country code"
    }
  }
}
```

HTTP status codes:
- `200` — Success
- `400` — Validation error (includes `fields` for inline form errors)
- `401` — Missing or invalid auth token
- `403` — Forbidden (wrong role)
- `404` — Resource not found
- `429` — Rate limited
- `500` — Server error

---

## 9. Rate Limiting & Anti-Spam

Public endpoints (no auth) need protection:

| Endpoint | Limit | Window | Method |
|---|---|---|---|
| `nfcPublicProfile` | 100 | per minute per IP | Cloud Armor or in-function |
| `nfcExchange` | 5 | per hour per IP | Firestore counter + check |
| `nfcLogTap` | 1 | per minute per IP per profile | Firestore dedup |

Implementation: Use a `nfc_rate_limits/{ipHash}` collection with TTL (Firestore TTL policies auto-delete expired docs).

```typescript
// In nfcExchange function:
const ipHash = sha256(request.ip);
const rateDoc = await db.doc(`nfc_rate_limits/${ipHash}_exchange`).get();
if (rateDoc.exists && rateDoc.data().count >= 5) {
  response.status(429).json({ error: "Too many exchange requests" });
  return;
}
```

---

## 10. Scalability Considerations

### 10.1 Read-Heavy Profile Pages

Public profile pages will get the most traffic (every NFC tap = one page load). Strategy:
- **CDN caching**: Firebase Hosting CDN caches static assets; profile data cached 5 min via `Cache-Control`
- **Firestore reads**: One doc read per profile view — Firestore handles this at any scale
- **No joins**: Profile doc contains everything needed for public display (denormalized)

### 10.2 Write-Heavy Tap Logging

At scale, `nfc_taps` could get millions of writes. Strategy:
- **Fire-and-forget**: `nfcLogTap` returns 200 immediately, writes async
- **Dedup**: Skip duplicate taps from same IP within 1 minute
- **Pre-aggregation**: `nfcStatsAggregator` rolls up daily, so analytics reads are cheap
- **TTL**: Raw `nfc_taps` docs can be TTL'd after 90 days (keep only aggregates)

### 10.3 Exchange Notifications

Email sending shouldn't block the exchange response. Strategy:
- **Firestore trigger**: `nfcExchangeNotifier` fires asynchronously on doc create
- **Retry**: Cloud Functions v2 retries failed triggers automatically
- **Idempotency**: Check for duplicate notification before sending

### 10.4 Multi-Profile (V4)

When users can have multiple cards/profiles:
- `nfc_profiles` already supports multiple docs per `uid`
- Security rules use `resource.data.uid == request.auth.uid` (not 1:1 assumption)
- No schema change needed — just update UI to show profile picker

---

## 11. Implementation Phases

### Phase 1 — MVP (The Core Loop)

**Goal**: Tap → see card → exchange → log. Nothing else.

**Cloud Functions** (add to `functions/src/`):
1. `nfc/publicProfile.ts` — GET public profile
2. `nfc/profileCrud.ts` — Create/update profile
3. `nfc/exchange.ts` — Contact exchange submission
4. `nfc/contacts.ts` — Exchange log (paginated)
5. `nfc/tapLogger.ts` — Silent view counter
6. `nfc/notifier.ts` — Email notification trigger

**NFC App changes**:
1. Add `src/lib/firebase.ts` (Firebase client)
2. Add `src/contexts/AuthContext.tsx` (Firebase Auth)
3. Add `src/pages/AuthPage.tsx` (Login/Register)
4. Add `src/hooks/useNfcProfile.ts` (real profile data)
5. Add `src/hooks/usePublicProfile.ts` (public card data)
6. Add `src/hooks/useExchanges.ts` (exchange log)
7. Modify `ProfileContext.tsx` → reads from Firestore
8. Modify `PublicProfile.tsx` → fetches from API
9. Add `ExchangeForm.tsx` → posts to nfcExchange
10. Modify `Dashboard.tsx` → real stats from Firestore
11. Modify `Connections.tsx` → real exchange data
12. Add `ProtectedRoute.tsx` (auth guard)
13. Update `routes.tsx` with auth routes

**Firestore**:
1. Add security rules for `nfc_*` collections
2. Add indexes for exchanges + profiles
3. Create `ventures/nfc-cards` document in BrandaptOS

**Deployment**:
1. Register second web app in Firebase Console
2. Set up `brandapt-nfc` hosting target
3. Deploy functions + rules + NFC hosting

### Phase 2 — Enrich the Card

1. Photo upload (Firebase Storage + Sharp resize)
2. Social links editor (update `nfc_profiles.links`)
3. Custom URL slug (uniqueId uniqueness check)
4. Profile themes/colors
5. Bio/about section

### Phase 3 — Analytics & Insights

1. `nfc/analytics.ts` — aggregated analytics endpoint
2. `nfc/statsAggregator.ts` — nightly roll-up function
3. `AnalyticsPage.tsx` — charts (Recharts already in deps)
4. Date range filters
5. CSV/vCard batch export
6. Wire venture_metrics for BrandaptOS dashboard

### Phase 4 — Scale & Manage

1. `nfc/tagManager.ts` — tag CRUD
2. Multi-card support
3. Enterprise admin dashboard
4. Account settings
5. Tag provisioning/ordering flow

---

## 12. Deployment Commands

```bash
# From BrandaptOS directory:

# Deploy NFC Cloud Functions (they're in the same functions/ dir)
npx firebase deploy --only functions

# Deploy NFC hosting site
npx firebase deploy --only hosting:nfc

# Deploy Firestore rules (shared)
npx firebase deploy --only firestore:rules

# Deploy Firestore indexes (shared)
npx firebase deploy --only firestore:indexes

# Deploy everything
npx firebase deploy
```

---

## 13. Environment & Secrets

| Secret/Config | Purpose | Set Via |
|---|---|---|
| `SENDGRID_API_KEY` | Exchange notification emails | `firebase functions:secrets:set SENDGRID_API_KEY` |
| `ANTHROPIC_API_KEY` | Claude in VentureChat (Phase 2) | Already planned |
| `OPENAI_API_KEY` | GPT-4o in VentureChat (Phase 2) | Already planned |
| `MAXMIND_LICENSE_KEY` | IP → geo lookup for tap analytics (V3) | `firebase functions:secrets:set MAXMIND_LICENSE_KEY` |

---

## 14. Summary: What Connects Where

```
┌──────────────────────┐     ┌──────────────────────────┐
│  NFC Card App        │     │  BrandaptOS              │
│  cards.brandapt.co   │     │  brandapt.co             │
│                      │     │                          │
│  Public Profile      │     │  Flight Deck             │
│  Dashboard           │     │    └─ NFC-Cards venture  │
│  Exchange Log        │     │       ├─ Health Score    │
│  Analytics (V3)      │     │       ├─ Metrics ◄───────┼── venture_metrics
│  Tag Manager (V4)    │     │       └─ VentureChat     │
│                      │     │           └─ RAG (NFC docs)│
├──────────────────────┤     ├──────────────────────────┤
│  Firebase Auth ◄─────┼─────┼─► Firebase Auth          │
│  Firestore (nfc_*)   │     │  Firestore (ventures/*)  │
│  Cloud Functions     │     │  Cloud Functions          │
│  Firebase Storage    │     │  MCP Server               │
└──────────────────────┘     └──────────────────────────┘
          │                            │
          └────── Same Firebase Project ───────┘
                  (brandaptos-v2)
```
