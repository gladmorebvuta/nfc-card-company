# NFC Card Platform — Master Implementation Prompt
> Generated: 2026-03-26 | Owner: Gladmore Bvuta (gladmorebvuta@gmail.com)
> Company: BrandApt (Private) Limited — Venture Studio
> This prompt drives the full Phase 1 build of the NFC Card Platform integrated with BrandaptOS.

---

## 0. Critical Context — READ FIRST

**Two repos, one Firebase project:**
- **BrandaptOS** → `C:\Dev\Brandapt\BrandaptOS` (admin dashboard, venture studio — live at `brandapt.co`)
- **NFC Card App** → `C:\Dev\Brandapt\nfc-card-company` (public card profiles + card owner dashboard — will be at `cards.brandapt.co`)
- **Firebase project ID**: `brandaptos-v2` (⚠️ NOT `brandapt-os`)
- **Region**: `us-central1`
- **Functions base URL**: `https://us-central1-brandaptos-v2.cloudfunctions.net`

**What exists already in the NFC Card App:**
- React 18 + Vite + Tailwind v4 + Radix/shadcn UI (54 components)
- 4 pages: `PublicProfile` (`/`), `Dashboard` (`/dashboard`), `EditProfile` (`/dashboard/edit`), `Connections` (`/dashboard/connections`)
- `ProfileContext` with localStorage persistence (mock data — no backend)
- `FlippableCard` 3D component, `DashboardLayout` with sidebar/topbar
- `vcard.ts` utility for VCard generation + CSV export
- All UI is polished and responsive — DO NOT redesign, only wire to real data

**What exists in BrandaptOS (shared backend):**
- Firebase Auth (Google SSO), Firestore, Cloud Functions v2 (TypeScript)
- RAG pipeline (`functions/src/rag.ts`) with venture-scoped vector search
- VentureChat (`functions/src/ventureChat.ts`) with decision auto-logging
- Model router (`functions/src/modelRouter.ts`) — Gemini active, Claude/OpenAI stubs
- Security rules, indexes, multi-collection structure
- `useVentures`, `useVenture`, `useClients` hooks + VentureWorkspacePage

**Architecture rule**: NFC Cloud Functions live in `BrandaptOS/functions/src/nfc/` (same deploy pipeline). NFC Firestore collections prefixed with `nfc_`. NFC frontend stays in its own repo, deployed as a separate Firebase Hosting site.

**DO NOT**:
- Run `npm install` or `npm run build` — the environment doesn't support it; just write files and verify with `npx tsc --noEmit` where applicable
- Redesign any existing NFC UI component — only modify data flow
- Create new UI component libraries — reuse existing shadcn/ui components
- Touch BrandaptOS frontend files unless explicitly told to
- Use `firebase-admin` in frontend code — that's backend only

---

## 1. Firestore Data Model

All collections use the `nfc_` prefix. Security rules and indexes go in BrandaptOS's shared `firestore.rules` and `firestore.indexes.json`.

### 1.1 `nfc_profiles/{profileId}`

```typescript
interface NfcProfile {
  id: string;
  uid: string;                     // Firebase Auth UID → users/{uid}
  uniqueId: string;                // URL slug: "sarah-jenkins-a7x" (unique, indexed)

  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle: string | null;
  company: string | null;
  department: string | null;
  bio: string | null;
  emailPublic: string | null;
  phone: string | null;
  office: string | null;

  avatarUrl: string | null;
  coverUrl: string | null;

  links: Array<{
    id: string;
    platform: string;             // "linkedin" | "twitter" | "website" | "calendly" | "custom"
    url: string;
    label: string;
    sortOrder: number;
  }>;

  theme: {
    primaryColor: string;
    accentColor: string;
    preset: string | null;
  } | null;

  stats: {
    totalViews: number;
    totalExchanges: number;
    totalSaves: number;
  };

  isActive: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  ventureId: string;               // Always "nfc-cards"

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.2 `nfc_exchanges/{exchangeId}`

```typescript
interface NfcExchange {
  id: string;
  profileId: string;               // FK → nfc_profiles
  profileUid: string;              // Denormalized owner UID

  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  visitorCompany: string | null;
  visitorNote: string | null;

  source: 'nfc' | 'qr' | 'direct_link';
  tagId: string | null;
  userAgent: string | null;

  isRead: boolean;
  isArchived: boolean;

  createdAt: Timestamp;
}
```

### 1.3 `nfc_taps/{tapId}`

```typescript
interface NfcTap {
  id: string;
  profileId: string;
  profileUid: string;

  userAgent: string | null;
  deviceType: 'mobile' | 'desktop' | 'tablet' | null;
  os: string | null;
  browser: string | null;

  ipHash: string | null;           // SHA256 — never store raw IP
  city: string | null;
  country: string | null;
  countryCode: string | null;

  source: 'nfc' | 'qr' | 'direct_link';
  tagId: string | null;
  referrer: string | null;

  tappedAt: Timestamp;
}
```

### 1.4 `nfc_rate_limits/{key}` (ephemeral, TTL'd)

```typescript
interface NfcRateLimit {
  count: number;
  windowStart: Timestamp;
  expiresAt: Timestamp;           // Firestore TTL policy auto-deletes
}
```

---

## 2. Cloud Functions — Backend (in BrandaptOS repo)

**All files go in `C:\Dev\Brandapt\BrandaptOS\functions\src\nfc\`**

Create this directory structure:
```
functions/src/nfc/
├── types.ts              ← All NFC interfaces (copy from Section 1)
├── publicProfile.ts      ← GET public profile
├── profileCrud.ts        ← POST create/update profile
├── exchange.ts           ← POST contact exchange (public)
├── contacts.ts           ← GET paginated exchange log (authed)
├── tapLogger.ts          ← POST silent analytics ping (public)
├── notifier.ts           ← Firestore trigger: email on new exchange
└── index.ts              ← Barrel export for all NFC functions
```

### 2.1 `functions/src/nfc/types.ts`

Export all interfaces from Section 1. Also export:

```typescript
// Standard API response wrapper
export interface NfcApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

// Helper to parse user agent (basic — no external deps)
export function parseUserAgent(ua: string | undefined): {
  deviceType: 'mobile' | 'desktop' | 'tablet' | null;
  os: string | null;
  browser: string | null;
} {
  if (!ua) return { deviceType: null, os: null, browser: null };
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  let os: string | null = null;
  if (/iPhone|iPad|Mac OS/i.test(ua)) os = 'iOS/macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser: string | null = null;
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return { deviceType, os, browser };
}
```

### 2.2 `functions/src/nfc/publicProfile.ts`

```typescript
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import cors from "cors";

const corsHandler = cors({ origin: true });

export const nfcPublicProfile = onRequest(
  { region: "us-central1", memory: "256MiB" },
  async (request, response) => {
    corsHandler(request, response, async () => {
      if (request.method !== "GET") {
        response.status(405).json({ status: "error", error: { code: "METHOD_NOT_ALLOWED", message: "GET only" } });
        return;
      }

      const uniqueId = request.query.id as string;
      if (!uniqueId) {
        response.status(400).json({ status: "error", error: { code: "MISSING_ID", message: "id query param required" } });
        return;
      }

      const db = admin.firestore();
      const snap = await db.collection("nfc_profiles")
        .where("uniqueId", "==", uniqueId)
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (snap.empty) {
        response.status(404).json({ status: "error", error: { code: "PROFILE_NOT_FOUND", message: "No profile found" } });
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();

      // Strip internal fields — only return public data
      response.status(200).json({
        status: "success",
        data: {
          profile: {
            displayName: data.displayName,
            firstName: data.firstName,
            lastName: data.lastName,
            jobTitle: data.jobTitle,
            company: data.company,
            department: data.department,
            bio: data.bio,
            emailPublic: data.emailPublic,
            phone: data.phone,
            office: data.office,
            avatarUrl: data.avatarUrl,
            coverUrl: data.coverUrl,
            links: data.links || [],
            theme: data.theme,
          },
        },
      });
    });
  }
);
```

### 2.3 `functions/src/nfc/profileCrud.ts`

```typescript
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import cors from "cors";

const corsHandler = cors({ origin: true });

// Helper: generate unique slug from name
function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30);
  const suffix = Math.random().toString(36).substring(2, 5);
  return `${base}-${suffix}`;
}

export const nfcProfileUpdate = onRequest(
  { region: "us-central1", memory: "256MiB" },
  async (request, response) => {
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).json({ status: "error", error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } });
        return;
      }

      // Verify Firebase Auth token
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        response.status(401).json({ status: "error", error: { code: "UNAUTHORIZED", message: "Missing auth token" } });
        return;
      }

      let uid: string;
      try {
        const token = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
        uid = token.uid;
      } catch {
        response.status(401).json({ status: "error", error: { code: "INVALID_TOKEN", message: "Invalid auth token" } });
        return;
      }

      const db = admin.firestore();
      const body = request.body;

      // Validate required fields on create
      if (!body.firstName || !body.lastName) {
        response.status(400).json({
          status: "error",
          error: { code: "VALIDATION", message: "firstName and lastName required", fields: { firstName: "Required", lastName: "Required" } },
        });
        return;
      }

      // Check if profile exists for this user
      const existing = await db.collection("nfc_profiles").where("uid", "==", uid).limit(1).get();

      if (existing.empty) {
        // CREATE new profile
        const uniqueId = generateSlug(body.firstName, body.lastName);
        const now = admin.firestore.FieldValue.serverTimestamp();

        const profileData = {
          uid,
          uniqueId,
          firstName: body.firstName,
          lastName: body.lastName,
          displayName: `${body.firstName} ${body.lastName}`,
          jobTitle: body.jobTitle || null,
          company: body.company || null,
          department: body.department || null,
          bio: body.bio || null,
          emailPublic: body.emailPublic || null,
          phone: body.phone || null,
          office: body.office || null,
          avatarUrl: body.avatarUrl || null,
          coverUrl: body.coverUrl || null,
          links: body.links || [],
          theme: null,
          stats: { totalViews: 0, totalExchanges: 0, totalSaves: 0 },
          isActive: true,
          plan: "free" as const,
          ventureId: "nfc-cards",
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await db.collection("nfc_profiles").add(profileData);
        response.status(200).json({ status: "success", data: { profile: { id: docRef.id, ...profileData, uniqueId } } });
      } else {
        // UPDATE existing profile
        const docRef = existing.docs[0].ref;
        const updates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

        // Only update provided fields
        const allowedFields = [
          "firstName", "lastName", "jobTitle", "company", "department", "bio",
          "emailPublic", "phone", "office", "avatarUrl", "coverUrl", "links",
        ];
        for (const field of allowedFields) {
          if (body[field] !== undefined) updates[field] = body[field];
        }
        if (body.firstName || body.lastName) {
          const current = existing.docs[0].data();
          updates.displayName = `${body.firstName || current.firstName} ${body.lastName || current.lastName}`;
        }

        await docRef.update(updates);
        response.status(200).json({ status: "success", data: { profile: { id: docRef.id, ...updates } } });
      }
    });
  }
);
```

### 2.4 `functions/src/nfc/exchange.ts`

```typescript
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import cors from "cors";

const corsHandler = cors({ origin: true });

export const nfcExchange = onRequest(
  { region: "us-central1", memory: "256MiB" },
  async (request, response) => {
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).json({ status: "error", error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } });
        return;
      }

      const { profileId, visitorName, visitorEmail, visitorPhone, visitorCompany, visitorNote, source } = request.body;

      // Validate required fields
      if (!profileId || !visitorName || !visitorEmail) {
        response.status(400).json({
          status: "error",
          error: { code: "VALIDATION", message: "profileId, visitorName, visitorEmail required" },
        });
        return;
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
        response.status(400).json({
          status: "error",
          error: { code: "VALIDATION", message: "Invalid email", fields: { visitorEmail: "Invalid email format" } },
        });
        return;
      }

      const db = admin.firestore();

      // Rate limit: 5 exchanges per IP per hour
      const ip = request.ip || request.headers["x-forwarded-for"] as string || "unknown";
      const ipHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
      const rateLimitKey = `${ipHash}_exchange`;
      const rateLimitRef = db.doc(`nfc_rate_limits/${rateLimitKey}`);
      const rateDoc = await rateLimitRef.get();

      if (rateDoc.exists) {
        const data = rateDoc.data()!;
        const windowStart = data.windowStart?.toDate?.() || new Date(0);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (windowStart > hourAgo && data.count >= 5) {
          response.status(429).json({ status: "error", error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } });
          return;
        }
        if (windowStart <= hourAgo) {
          // Reset window
          await rateLimitRef.set({ count: 1, windowStart: admin.firestore.FieldValue.serverTimestamp(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) });
        } else {
          await rateLimitRef.update({ count: admin.firestore.FieldValue.increment(1) });
        }
      } else {
        await rateLimitRef.set({ count: 1, windowStart: admin.firestore.FieldValue.serverTimestamp(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) });
      }

      // Verify profile exists and get owner UID
      const profileSnap = await db.collection("nfc_profiles").doc(profileId).get();
      if (!profileSnap.exists) {
        // Also try by uniqueId
        const bySlug = await db.collection("nfc_profiles").where("uniqueId", "==", profileId).limit(1).get();
        if (bySlug.empty) {
          response.status(404).json({ status: "error", error: { code: "PROFILE_NOT_FOUND", message: "Profile not found" } });
          return;
        }
        // Use the found profile
        const profile = bySlug.docs[0];
        const profileData = profile.data();

        const exchangeData = {
          profileId: profile.id,
          profileUid: profileData.uid,
          visitorName,
          visitorEmail,
          visitorPhone: visitorPhone || null,
          visitorCompany: visitorCompany || null,
          visitorNote: visitorNote || null,
          source: source || "direct_link",
          tagId: null,
          userAgent: request.headers["user-agent"] || null,
          isRead: false,
          isArchived: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const batch = db.batch();
        const exchangeRef = db.collection("nfc_exchanges").doc();
        batch.set(exchangeRef, exchangeData);
        // Atomically increment exchange count
        batch.update(profile.ref, { "stats.totalExchanges": admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await batch.commit();

        response.status(200).json({ status: "success", data: { exchangeId: exchangeRef.id } });
        return;
      }

      // Profile found by doc ID
      const profileData = profileSnap.data()!;
      const exchangeData = {
        profileId,
        profileUid: profileData.uid,
        visitorName,
        visitorEmail,
        visitorPhone: visitorPhone || null,
        visitorCompany: visitorCompany || null,
        visitorNote: visitorNote || null,
        source: source || "direct_link",
        tagId: null,
        userAgent: request.headers["user-agent"] || null,
        isRead: false,
        isArchived: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const batch = db.batch();
      const exchangeRef = db.collection("nfc_exchanges").doc();
      batch.set(exchangeRef, exchangeData);
      batch.update(profileSnap.ref, { "stats.totalExchanges": admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      await batch.commit();

      response.status(200).json({ status: "success", data: { exchangeId: exchangeRef.id } });
    });
  }
);
```

### 2.5 `functions/src/nfc/contacts.ts`

```typescript
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import cors from "cors";

const corsHandler = cors({ origin: true });

export const nfcContacts = onRequest(
  { region: "us-central1", memory: "256MiB" },
  async (request, response) => {
    corsHandler(request, response, async () => {
      if (request.method !== "GET") {
        response.status(405).json({ status: "error", error: { code: "METHOD_NOT_ALLOWED", message: "GET only" } });
        return;
      }

      // Auth
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        response.status(401).json({ status: "error", error: { code: "UNAUTHORIZED", message: "Missing auth token" } });
        return;
      }

      let uid: string;
      try {
        const token = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
        uid = token.uid;
      } catch {
        response.status(401).json({ status: "error", error: { code: "INVALID_TOKEN", message: "Invalid auth token" } });
        return;
      }

      const db = admin.firestore();
      const page = parseInt(request.query.page as string) || 1;
      const limit = Math.min(parseInt(request.query.limit as string) || 20, 50);
      const archived = request.query.archived === "true";
      const search = (request.query.search as string || "").toLowerCase();

      // Build query — exchanges where caller is the profile owner
      let query = db.collection("nfc_exchanges")
        .where("profileUid", "==", uid)
        .where("isArchived", "==", archived)
        .orderBy("createdAt", "desc");

      // Get total count (separate query)
      const countSnap = await db.collection("nfc_exchanges")
        .where("profileUid", "==", uid)
        .where("isArchived", "==", archived)
        .count()
        .get();
      const total = countSnap.data().count;

      // Paginate
      const offset = (page - 1) * limit;
      const snap = await query.offset(offset).limit(limit).get();

      let contacts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Client-side search filter (Firestore doesn't support LIKE queries)
      if (search) {
        contacts = contacts.filter((c: any) =>
          c.visitorName?.toLowerCase().includes(search) ||
          c.visitorEmail?.toLowerCase().includes(search) ||
          c.visitorCompany?.toLowerCase().includes(search)
        );
      }

      response.status(200).json({
        status: "success",
        data: {
          contacts,
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      });
    });
  }
);
```

### 2.6 `functions/src/nfc/tapLogger.ts`

```typescript
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import cors from "cors";
import { parseUserAgent } from "./types";

const corsHandler = cors({ origin: true });

export const nfcLogTap = onRequest(
  { region: "us-central1", memory: "256MiB" },
  async (request, response) => {
    corsHandler(request, response, async () => {
      // Always return 200 fast — this is fire-and-forget from the client's perspective
      if (request.method !== "POST") {
        response.status(200).json({ status: "ok" });
        return;
      }

      const { profileId, source, referrer } = request.body;
      if (!profileId) {
        response.status(200).json({ status: "ok" });
        return;
      }

      const db = admin.firestore();
      const ip = request.ip || request.headers["x-forwarded-for"] as string || "unknown";
      const ipHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);

      // Dedup: 1 tap per IP per profile per minute
      const dedupKey = `${ipHash}_tap_${profileId}`;
      const dedupRef = db.doc(`nfc_rate_limits/${dedupKey}`);
      const dedupDoc = await dedupRef.get();

      if (dedupDoc.exists) {
        const lastTap = dedupDoc.data()!.windowStart?.toDate?.() || new Date(0);
        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        if (lastTap > oneMinAgo) {
          response.status(200).json({ status: "ok" }); // Silently ignore duplicate
          return;
        }
      }

      // Update dedup tracker
      await dedupRef.set({
        count: 1,
        windowStart: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // TTL: 5 min
      });

      // Look up profile to get owner UID
      const profileSnap = await db.collection("nfc_profiles").doc(profileId).get();
      let profileUid = "";
      let profileRef = profileSnap.ref;

      if (!profileSnap.exists) {
        // Try by uniqueId
        const bySlug = await db.collection("nfc_profiles").where("uniqueId", "==", profileId).limit(1).get();
        if (bySlug.empty) {
          response.status(200).json({ status: "ok" });
          return;
        }
        profileUid = bySlug.docs[0].data().uid;
        profileRef = bySlug.docs[0].ref;
      } else {
        profileUid = profileSnap.data()!.uid;
      }

      const ua = request.headers["user-agent"] as string | undefined;
      const parsed = parseUserAgent(ua);

      const tapData = {
        profileId: profileRef.id,
        profileUid,
        userAgent: ua || null,
        deviceType: parsed.deviceType,
        os: parsed.os,
        browser: parsed.browser,
        ipHash,
        city: null,       // V3: MaxMind geo lookup
        country: null,
        countryCode: null,
        source: source || "direct_link",
        tagId: null,
        referrer: referrer || null,
        tappedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const batch = db.batch();
      batch.set(db.collection("nfc_taps").doc(), tapData);
      batch.update(profileRef, {
        "stats.totalViews": admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();

      response.status(200).json({ status: "ok" });
    });
  }
);
```

### 2.7 `functions/src/nfc/notifier.ts`

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Sends notification to card owner when they receive a new exchange
// Phase 1: Write to a notifications subcollection (in-app notification)
// Phase 2: Add SendGrid email delivery
export const nfcExchangeNotifier = onDocumentCreated(
  { document: "nfc_exchanges/{exchangeId}", region: "us-central1", memory: "512MiB" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const db = admin.firestore();

    // Look up profile owner's user record for their email
    const userSnap = await db.doc(`users/${data.profileUid}`).get();
    if (!userSnap.exists) return;

    // For Phase 1: just log it. Phase 2: send email via SendGrid
    console.log(`New exchange on profile ${data.profileId}: ${data.visitorName} (${data.visitorEmail}) from ${data.visitorCompany || 'unknown company'}`);

    // TODO Phase 2: Send email notification
    // const ownerEmail = userSnap.data()?.email;
    // await sendGrid.send({ to: ownerEmail, subject: `New contact: ${data.visitorName}`, ... });
  }
);
```

### 2.8 `functions/src/nfc/index.ts` (barrel export)

```typescript
export { nfcPublicProfile } from "./publicProfile";
export { nfcProfileUpdate } from "./profileCrud";
export { nfcExchange } from "./exchange";
export { nfcContacts } from "./contacts";
export { nfcLogTap } from "./tapLogger";
export { nfcExchangeNotifier } from "./notifier";
```

### 2.9 Update `functions/src/index.ts` (BrandaptOS main index)

Add this single line alongside existing exports:

```typescript
// NFC Card Platform
export { nfcPublicProfile, nfcProfileUpdate, nfcExchange, nfcContacts, nfcLogTap, nfcExchangeNotifier } from "./nfc";
```

### 2.10 Compile check

After writing all function files, run from the BrandaptOS directory:

```bash
cd functions && npx tsc --noEmit
```

Fix any TypeScript errors before proceeding.

---

## 3. Firestore Security Rules

Add to the existing `firestore.rules` in BrandaptOS, inside the `match /databases/{database}/documents` block, BEFORE the catch-all deny rule:

```
    // ─── NFC Card Platform ──────────────────────────────────────────────

    match /nfc_profiles/{profileId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null &&
        (resource.data.uid == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }

    match /nfc_exchanges/{exchangeId} {
      allow read: if request.auth != null &&
        (resource.data.profileUid == request.auth.uid || isAdmin());
      allow create: if true;
      allow update: if request.auth != null &&
        (resource.data.profileUid == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }

    match /nfc_taps/{tapId} {
      allow read: if request.auth != null &&
        (resource.data.profileUid == request.auth.uid || isAdmin());
      allow write: if false;
    }

    match /nfc_rate_limits/{limitId} {
      allow read, write: if false;
    }

    match /nfc_daily_stats/{profileId}/days/{date} {
      allow read: if request.auth != null;
      allow write: if false;
    }
```

---

## 4. Firestore Indexes

Add to `firestore.indexes.json` in BrandaptOS, inside the `"indexes"` array:

```json
    {
      "collectionGroup": "nfc_profiles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uniqueId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "nfc_exchanges",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "profileUid", "order": "ASCENDING" },
        { "fieldPath": "isArchived", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "nfc_taps",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "profileUid", "order": "ASCENDING" },
        { "fieldPath": "tappedAt", "order": "DESCENDING" }
      ]
    }
```

---

## 5. Firebase Hosting — Multi-Site Setup

### 5.1 Update `.firebaserc` in BrandaptOS

```json
{
  "projects": {
    "default": "brandaptos-v2"
  },
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

**Before this will work**, create the second hosting site in Firebase Console:
```
Firebase Console → brandaptos-v2 → Hosting → Add another site → Site ID: "brandapt-nfc"
```

Then connect custom domain `cards.brandapt.co` to the `brandapt-nfc` site.

### 5.2 Update `firebase.json` in BrandaptOS

Replace the single `"hosting"` object with an array of two:

```json
{
  "hosting": [
    {
      "target": "main",
      "public": "dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }],
      "headers": [
        {
          "source": "**",
          "headers": [
            { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }
          ]
        }
      ]
    },
    {
      "target": "nfc",
      "public": "../nfc-card-company/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }],
      "headers": [
        {
          "source": "/c/**",
          "headers": [
            { "key": "Cache-Control", "value": "public, max-age=300" }
          ]
        },
        {
          "source": "**",
          "headers": [
            { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }
          ]
        }
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "codebase": "default",
    "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"],
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  }
}
```

---

## 6. NFC Frontend — Firebase Integration

All files in `C:\Dev\Brandapt\nfc-card-company\src\`

### 6.1 `src/lib/firebase.ts` (NEW)

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Same Firebase project as BrandaptOS — shared auth, shared Firestore
const firebaseConfig = {
  apiKey: "AIzaSyCWwldeA6VuZN31GM5xoaEWGhgdA5MyXm4",
  authDomain: "brandaptos-v2.firebaseapp.com",
  projectId: "brandaptos-v2",
  storageBucket: "brandaptos-v2.firebasestorage.app",
  messagingSenderId: "561453413325",
  appId: "1:561453413325:web:REPLACE_WITH_NFC_APP_ID"  // Create second web app in Firebase Console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

**⚠️ Important**: Before deploying, create a second web app registration in Firebase Console → Project Settings → General → Your apps → Add app (Web). Use the `appId` it gives you. This is just for analytics separation — the other config values stay the same.

### 6.2 `src/app/contexts/AuthContext.tsx` (NEW)

```typescript
import * as React from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check or create user doc
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().role || "nfc-user");
        } else {
          // First login — create user doc with nfc-user role
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: "nfc-user",
            createdAt: new Date().toISOString(),
          });
          setUserRole("nfc-user");
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signOutFn = React.useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = React.useMemo(
    () => ({ user, userRole, loading, signInWithGoogle, signOut: signOutFn }),
    [user, userRole, loading, signInWithGoogle, signOutFn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

### 6.3 `src/app/hooks/useNfcProfile.ts` (NEW)

Real-time Firestore listener for the logged-in user's own NFC profile.

```typescript
import * as React from "react";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export interface NfcProfileData {
  id: string;
  uid: string;
  uniqueId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle: string | null;
  company: string | null;
  department: string | null;
  bio: string | null;
  emailPublic: string | null;
  phone: string | null;
  office: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  links: Array<{ id: string; platform: string; url: string; label: string; sortOrder: number }>;
  theme: { primaryColor: string; accentColor: string; preset: string | null } | null;
  stats: { totalViews: number; totalExchanges: number; totalSaves: number };
  isActive: boolean;
  plan: string;
}

export function useNfcProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<NfcProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "nfc_profiles"),
      where("uid", "==", user.uid),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setProfile(null);
      } else {
        const doc = snap.docs[0];
        setProfile({ id: doc.id, ...doc.data() } as NfcProfileData);
      }
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  return { profile, loading, error };
}
```

### 6.4 `src/app/hooks/usePublicProfile.ts` (NEW)

One-time fetch for the public card page (no auth needed).

```typescript
import * as React from "react";

const FUNCTIONS_BASE = "https://us-central1-brandaptos-v2.cloudfunctions.net";

export interface PublicProfileData {
  displayName: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  company: string | null;
  department: string | null;
  bio: string | null;
  emailPublic: string | null;
  phone: string | null;
  office: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  links: Array<{ id: string; platform: string; url: string; label: string; sortOrder: number }>;
  theme: { primaryColor: string; accentColor: string; preset: string | null } | null;
}

export function usePublicProfile(uniqueId: string | undefined) {
  const [profile, setProfile] = React.useState<PublicProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      try {
        const res = await fetch(`${FUNCTIONS_BASE}/nfcPublicProfile?id=${encodeURIComponent(uniqueId!)}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.status === "success") {
          setProfile(json.data.profile);
        } else {
          setError(json.error?.message || "Profile not found");
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();

    // Also log the tap (fire and forget)
    fetch(`${FUNCTIONS_BASE}/nfcLogTap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: uniqueId, source: "direct_link" }),
    }).catch(() => {}); // Intentionally ignore errors

    return () => { cancelled = true; };
  }, [uniqueId]);

  return { profile, loading, error };
}
```

### 6.5 `src/app/hooks/useExchanges.ts` (NEW)

Real-time exchange log for the dashboard connections page.

```typescript
import * as React from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export interface ExchangeData {
  id: string;
  profileId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  visitorCompany: string | null;
  visitorNote: string | null;
  source: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: any;
}

export function useExchanges(showArchived = false) {
  const { user } = useAuth();
  const [exchanges, setExchanges] = React.useState<ExchangeData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setExchanges([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "nfc_exchanges"),
      where("profileUid", "==", user.uid),
      where("isArchived", "==", showArchived),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setExchanges(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ExchangeData)));
      setLoading(false);
    });

    return unsub;
  }, [user, showArchived]);

  return { exchanges, loading };
}
```

### 6.6 `src/app/components/ProtectedRoute.tsx` (NEW)

```typescript
import * as React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### 6.7 `src/app/components/ExchangeForm.tsx` (NEW)

Contact exchange modal for the public profile page.

```typescript
import * as React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";
import { toast } from "sonner";

const FUNCTIONS_BASE = "https://us-central1-brandaptos-v2.cloudfunctions.net";

interface ExchangeFormProps {
  profileId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExchangeForm({ profileId, profileName, open, onOpenChange }: ExchangeFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    visitorCompany: "",
    visitorNote: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/nfcExchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          ...form,
          source: "direct_link",
        }),
      });

      const json = await res.json();

      if (json.status === "success") {
        toast.success("Contact exchanged! They'll receive your info.");
        onOpenChange(false);
        setForm({ visitorName: "", visitorEmail: "", visitorPhone: "", visitorCompany: "", visitorNote: "" });
      } else if (json.error?.code === "RATE_LIMITED") {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error(json.error?.message || "Something went wrong");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exchange contact with {profileName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Your name *"
            value={form.visitorName}
            onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
            required
          />
          <Input
            type="email"
            placeholder="Your email *"
            value={form.visitorEmail}
            onChange={(e) => setForm((f) => ({ ...f, visitorEmail: e.target.value }))}
            required
          />
          <Input
            placeholder="Phone (optional)"
            value={form.visitorPhone}
            onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))}
          />
          <Input
            placeholder="Company (optional)"
            value={form.visitorCompany}
            onChange={(e) => setForm((f) => ({ ...f, visitorCompany: e.target.value }))}
          />
          <Textarea
            placeholder="Note — e.g. 'Met at TechCrunch Disrupt' (optional)"
            value={form.visitorNote}
            onChange={(e) => setForm((f) => ({ ...f, visitorNote: e.target.value }))}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Exchange Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.8 `src/app/pages/AuthPage.tsx` (NEW)

```typescript
import * as React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";

export function AuthPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = React.useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign-in failed:", err);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">NFC Card Platform</CardTitle>
          <CardDescription>Sign in to manage your digital business card</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSignIn} disabled={signingIn} className="w-full" size="lg">
            {signingIn ? "Signing in..." : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.9 Update `src/app/routes.tsx`

Replace the entire file. Key changes:
- Add `/c/:uniqueId` route for public card pages (NFC tags encode this URL)
- Add `/login` route
- Wrap dashboard in `ProtectedRoute`
- Wrap everything in `AuthProvider`

```typescript
import * as React from "react";
import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { PublicProfile } from "./pages/PublicProfile";
import { EditProfile } from "./pages/EditProfile";
import { Connections } from "./pages/Connections";
import { AuthPage } from "./pages/AuthPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: () => (
      <AppWrapper>
        <PublicProfile />
      </AppWrapper>
    ),
  },
  {
    path: "/c/:uniqueId",
    Component: () => (
      <AppWrapper>
        <PublicProfile />
      </AppWrapper>
    ),
  },
  {
    path: "/login",
    Component: () => (
      <AppWrapper>
        <AuthPage />
      </AppWrapper>
    ),
  },
  {
    path: "/dashboard",
    Component: () => (
      <AppWrapper>
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      </AppWrapper>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "edit", Component: EditProfile },
      { path: "connections", Component: Connections },
    ],
  },
]);
```

### 6.10 Update `src/app/contexts/ProfileContext.tsx`

Modify to read from Firestore when authenticated, fall back to localStorage for demo/unauthenticated. Replace the entire file:

```typescript
import * as React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "./AuthContext";
import { useNfcProfile, NfcProfileData } from "../hooks/useNfcProfile";
import { currentEmployee } from "../mockData";

// Keep the original interface for backward compatibility with existing components
export interface ProfileData {
  id: string;
  name: string;
  title: string;
  department: string;
  bio: string;
  avatar: string;
  cover: string;
  email: string;
  phone: string;
  office: string;
  links: Array<{ id: string; title: string; url: string; type: string }>;
  stats: { views: number; taps: number; leads: number };
}

interface ProfileContextType {
  profile: ProfileData;
  nfcProfile: NfcProfileData | null;
  updateProfile: (updates: Partial<ProfileData>) => void;
  resetProfile: () => void;
  isFirestoreBacked: boolean;
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(undefined);

// Convert NfcProfile → ProfileData for backward compatibility with existing UI
function nfcToLegacy(nfc: NfcProfileData): ProfileData {
  return {
    id: nfc.id,
    name: nfc.displayName,
    title: nfc.jobTitle || "",
    department: nfc.department || "",
    bio: nfc.bio || "",
    avatar: nfc.avatarUrl || "",
    cover: nfc.coverUrl || "",
    email: nfc.emailPublic || "",
    phone: nfc.phone || "",
    office: nfc.office || "",
    links: (nfc.links || []).map((l) => ({
      id: l.id,
      title: l.label,
      url: l.url,
      type: l.platform,
    })),
    stats: {
      views: nfc.stats?.totalViews || 0,
      taps: nfc.stats?.totalViews || 0, // taps = views in our model
      leads: nfc.stats?.totalExchanges || 0,
    },
  };
}

const STORAGE_KEY = "mcg_profile_data";

function getLocalProfile(): ProfileData {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
  }
  return currentEmployee;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile: nfcProfile } = useNfcProfile();
  const [localProfile, setLocalProfile] = React.useState<ProfileData>(getLocalProfile);

  const isFirestoreBacked = !!user && !!nfcProfile;

  const profile = isFirestoreBacked ? nfcToLegacy(nfcProfile!) : localProfile;

  // Persist local profile to localStorage
  React.useEffect(() => {
    if (!isFirestoreBacked) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile));
    }
  }, [localProfile, isFirestoreBacked]);

  const updateProfile = React.useCallback(async (updates: Partial<ProfileData>) => {
    if (isFirestoreBacked && nfcProfile) {
      // Write to Firestore
      const nfcUpdates: Record<string, any> = {};
      if (updates.name) {
        const parts = updates.name.split(" ");
        nfcUpdates.firstName = parts[0] || "";
        nfcUpdates.lastName = parts.slice(1).join(" ") || "";
        nfcUpdates.displayName = updates.name;
      }
      if (updates.title !== undefined) nfcUpdates.jobTitle = updates.title;
      if (updates.department !== undefined) nfcUpdates.department = updates.department;
      if (updates.bio !== undefined) nfcUpdates.bio = updates.bio;
      if (updates.email !== undefined) nfcUpdates.emailPublic = updates.email;
      if (updates.phone !== undefined) nfcUpdates.phone = updates.phone;
      if (updates.office !== undefined) nfcUpdates.office = updates.office;
      if (updates.avatar !== undefined) nfcUpdates.avatarUrl = updates.avatar;
      if (updates.cover !== undefined) nfcUpdates.coverUrl = updates.cover;

      if (Object.keys(nfcUpdates).length > 0) {
        await updateDoc(doc(db, "nfc_profiles", nfcProfile.id), nfcUpdates);
      }
    } else {
      setLocalProfile((prev) => ({ ...prev, ...updates }));
    }
  }, [isFirestoreBacked, nfcProfile]);

  const resetProfile = React.useCallback(() => {
    setLocalProfile(currentEmployee);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = React.useMemo(
    () => ({ profile, nfcProfile: nfcProfile || null, updateProfile, resetProfile, isFirestoreBacked }),
    [profile, nfcProfile, updateProfile, resetProfile, isFirestoreBacked]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = React.useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within a ProfileProvider");
  return context;
}
```

### 6.11 Update `src/app/pages/PublicProfile.tsx`

Add support for the `/c/:uniqueId` route. The component should:
1. Check if `uniqueId` param exists → fetch from API via `usePublicProfile`
2. If no param (root `/` route) → show the existing demo profile from `useProfile()`
3. Add `ExchangeForm` component for contact exchange

**Modification strategy** (DO NOT rewrite the whole component — only add):

At the top of the component:
```typescript
import { useParams } from "react-router";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { ExchangeForm } from "../components/ExchangeForm";

export function PublicProfile() {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const { profile: apiProfile, loading: apiLoading, error: apiError } = usePublicProfile(uniqueId);
  const { profile: localProfile } = useProfile();
  const [exchangeOpen, setExchangeOpen] = React.useState(false);

  // Use API profile when viewing /c/:uniqueId, local profile when on /
  const isLiveCard = !!uniqueId;
  const profile = isLiveCard ? apiProfile : localProfile;
  // ... rest of component uses `profile` for display
```

At the bottom, add the ExchangeForm:
```tsx
{isLiveCard && profile && (
  <>
    <Button onClick={() => setExchangeOpen(true)}>Exchange Contact</Button>
    <ExchangeForm
      profileId={uniqueId!}
      profileName={profile.displayName || profile.name || ""}
      open={exchangeOpen}
      onOpenChange={setExchangeOpen}
    />
  </>
)}
```

### 6.12 Update `src/app/pages/Dashboard.tsx`

Modify the stats cards to show real data from `useProfile()`. The existing component already reads from ProfileContext — since we updated ProfileContext to read from Firestore when authenticated, the dashboard will automatically show real stats. No changes needed if the component uses `useProfile().profile.stats`.

### 6.13 Update `src/app/pages/Connections.tsx`

Replace the hardcoded `allLeads` array with real data from `useExchanges()`:

```typescript
import { useExchanges } from "../hooks/useExchanges";

export function Connections() {
  const { exchanges, loading } = useExchanges();
  // Map exchanges to the existing lead display format
  const leads = exchanges.map((e) => ({
    id: e.id,
    name: e.visitorName,
    email: e.visitorEmail,
    company: e.visitorCompany || "Unknown",
    phone: e.visitorPhone || "",
    date: e.createdAt?.toDate?.()?.toLocaleDateString() || "",
    note: e.visitorNote || "",
    source: e.source,
  }));
  // ... rest uses `leads` array instead of hardcoded data
```

---

## 7. NFC App Dependencies

Add Firebase to the NFC Card App. In `C:\Dev\Brandapt\nfc-card-company\package.json`, add to `"dependencies"`:

```json
"firebase": "^11.0.0"
```

Then run `npm install` (do this manually, not via Claude Code).

---

## 8. BrandaptOS — VentureWorkspace AI Co-Founder Tab Redirect

In BrandaptOS, replace the AI CO-FOUNDER tab content in `VentureWorkspacePage.tsx` with a redirect card. This is the ONLY BrandaptOS frontend change.

Find the AI Co-Founder tab panel content and replace with:

```tsx
<div className="flex flex-col items-center justify-center py-16 px-8 text-center">
  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6">
    <Bot className="w-8 h-8 text-purple-400" />
  </div>
  <h3 className="text-lg font-semibold text-white mb-2">AI Co-Founder</h3>
  <p className="text-sm text-gray-400 mb-6 max-w-md">
    Strategic AI conversations about this venture — product strategy, market positioning, growth tactics, and architecture decisions. All conversations are persisted with automatic decision logging.
  </p>
  {/* Show last decision or conversation count if available */}
  <a
    href={`/venture-chat/${ventureId}`}
    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
  >
    Open VentureChat
    <ArrowRight className="w-4 h-4" />
  </a>
</div>
```

---

## 9. Deployment Sequence

Run from the **BrandaptOS** directory (`C:\Dev\Brandapt\BrandaptOS`):

```bash
# 1. Compile functions (includes new NFC functions)
cd functions && npx tsc --noEmit && cd ..

# 2. Deploy Firestore rules + indexes
npx firebase deploy --only firestore:rules,firestore:indexes

# 3. Deploy Cloud Functions
npx firebase deploy --only functions

# 4. Build and deploy BrandaptOS hosting (main site)
npm run build && npx firebase deploy --only hosting:main

# 5. Build and deploy NFC Card App hosting
cd "../nfc-card-company" && npm run build && cd "../BrandaptOS"
npx firebase deploy --only hosting:nfc
```

**Pre-requisites before deploy:**
1. Create `brandapt-nfc` hosting site in Firebase Console
2. Create second web app registration in Firebase Console (get appId for NFC)
3. Run `npm install` in NFC Card Company directory (adds firebase dependency)
4. Connect `cards.brandapt.co` custom domain in Firebase Console

---

## 10. Seed Data

After first deploy, create the NFC venture document in BrandaptOS Firestore:

```typescript
// Run once via Firebase Console or a script
db.doc("ventures/nfc-cards").set({
  name: "NFC Card Company",
  status: "active",
  stage: "MVP Development",
  healthScore: 85,
  launchDate: "Q2 2026",
  nextMilestone: "Beta Launch",
  teamSize: 2,
  investmentStage: "Bootstrap",
  description: "Smart NFC business card platform — tap to share professional digital profiles with built-in lead capture and analytics.",
  industry: "SaaS / Hardware",
  marketingCopy: {
    heroTitle: "NFC Card Platform",
    heroSubtitle: "Tap. Share. Connect.",
    missionTitle: "Digital Business Cards Reimagined",
    missionDescription: "Professional digital presence that fits in your pocket. NFC-powered business cards with real-time analytics, lead capture, and CRM integration."
  }
});
```

---

## 11. Verification Checklist

After deployment, verify each piece works:

- [ ] `https://us-central1-brandaptos-v2.cloudfunctions.net/nfcPublicProfile?id=test` returns 404 (no profiles yet)
- [ ] `cards.brandapt.co` loads the NFC Card App
- [ ] `cards.brandapt.co/login` shows Google sign-in
- [ ] After sign-in, `cards.brandapt.co/dashboard` loads with empty stats
- [ ] Edit profile saves to Firestore `nfc_profiles` collection
- [ ] `cards.brandapt.co/c/{uniqueId}` shows the public profile
- [ ] Contact exchange form submits successfully
- [ ] `brandapt.co/dashboard/ventures/nfc-cards` loads VentureWorkspacePage
- [ ] AI Co-Founder tab shows redirect card to VentureChat
- [ ] `brandapt.co/venture-chat/nfc-cards` opens VentureChat for NFC venture
- [ ] Firestore security rules block unauthorized access

---

## 12. What's NOT in Phase 1

Explicitly deferred to later phases:

| Feature | Phase | Why Deferred |
|---|---|---|
| Photo upload (Firebase Storage) | 2 | Needs Sharp for server-side resize |
| Custom URL slugs | 2 | Needs uniqueness validation + migration |
| Profile themes/colors | 2 | Nice-to-have, not core loop |
| Analytics dashboard (charts) | 3 | Needs nfcStatsAggregator + Recharts integration |
| Email notifications (SendGrid) | 2 | Needs SENDGRID_API_KEY secret + templates |
| NFC tag management | 4 | Needs physical tag provisioning flow |
| Enterprise multi-team | 4 | Needs billing + role hierarchy |
| MCP server tools | 2 | Needs brandapt-mcp-server repo setup |
| White-labeling | 4 | Needs multi-tenant architecture |
| CRM integrations | 3 | Needs OAuth flows for Salesforce/HubSpot |

---

## 13. File Summary

### Files to CREATE in BrandaptOS (`C:\Dev\Brandapt\BrandaptOS`):
```
functions/src/nfc/types.ts
functions/src/nfc/publicProfile.ts
functions/src/nfc/profileCrud.ts
functions/src/nfc/exchange.ts
functions/src/nfc/contacts.ts
functions/src/nfc/tapLogger.ts
functions/src/nfc/notifier.ts
functions/src/nfc/index.ts
```

### Files to MODIFY in BrandaptOS:
```
functions/src/index.ts          ← Add NFC exports
firestore.rules                 ← Add nfc_* collection rules
firestore.indexes.json          ← Add nfc_* indexes
.firebaserc                     ← Add hosting targets
firebase.json                   ← Multi-site hosting config
src/pages/VentureWorkspacePage.tsx  ← AI Co-Founder tab redirect card
```

### Files to CREATE in NFC Card App (`C:\Dev\Brandapt\nfc-card-company`):
```
src/lib/firebase.ts
src/app/contexts/AuthContext.tsx
src/app/hooks/useNfcProfile.ts
src/app/hooks/usePublicProfile.ts
src/app/hooks/useExchanges.ts
src/app/components/ProtectedRoute.tsx
src/app/components/ExchangeForm.tsx
src/app/pages/AuthPage.tsx
```

### Files to MODIFY in NFC Card App:
```
src/app/routes.tsx              ← Add auth routes, /c/:uniqueId, ProtectedRoute
src/app/contexts/ProfileContext.tsx  ← Firestore-backed when authenticated
src/app/pages/PublicProfile.tsx ← Add API fetch + ExchangeForm for /c/:uniqueId
src/app/pages/Connections.tsx   ← Replace mock data with useExchanges()
package.json                    ← Add firebase dependency
```

---

> **This document is self-contained.** Execute sections 2 through 9 in order. Each section includes the complete code. Do not improvise or add features not listed here. If something is unclear, refer to the existing integration plan at `NFC_BRANDAPTOS_INTEGRATION_PLAN.md` for architectural context.
