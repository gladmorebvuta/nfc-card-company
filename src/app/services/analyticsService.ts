import { collection, addDoc, doc, updateDoc, increment, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

// ─── Existing ─────────────────────────────────────────────────────────────────

interface LogLinkClickParams {
  /** The uniqueId of the profile being viewed */
  profileId: string;
  /** Firebase UID of the profile owner */
  profileUid: string;
  /** The link that was clicked */
  linkUrl: string;
  /** Display label of the link */
  linkTitle: string;
  /** Platform type (linkedin, twitter, website, etc.) */
  linkType: string;
  /** How the visitor arrived: nfc, qr, link, direct */
  source: string;
  /** Session identifier — links this click to a view session */
  sessionId?: string;
}

/**
 * Log an outbound link click on a public profile.
 * Fire-and-forget — should never block UI.
 */
export async function logLinkClick(params: LogLinkClickParams) {
  try {
    await addDoc(collection(db, "nfc_link_clicks"), {
      profileId: params.profileId,
      profileUid: params.profileUid,
      linkUrl: params.linkUrl,
      linkTitle: params.linkTitle,
      linkType: params.linkType,
      source: params.source,
      sessionId: params.sessionId ?? null,
      createdAt: Timestamp.now(),
    });
  } catch {
    // Non-critical — don't break navigation
  }
}

/**
 * Increment a stat counter on an nfc_profiles document.
 * Fire-and-forget — should never block UI.
 */
export async function incrementProfileStat(
  profileDocId: string,
  field: "totalViews" | "totalExchanges" | "totalSaves"
) {
  try {
    await updateDoc(doc(db, "nfc_profiles", profileDocId), {
      [`stats.${field}`]: increment(1),
    });
  } catch {
    // Non-critical
  }
}

// ─── View session tracking ────────────────────────────────────────────────────

export interface LogProfileViewParams {
  /** uniqueId slug (e.g. "abc123") — not the Firestore doc ID */
  profileId: string;
  /** Firebase UID of the profile owner */
  profileUid: string;
  /** How the visitor arrived */
  source: "nfc" | "qr" | "link" | "direct";
  /** Stable identifier for this browser session — prevents refresh inflation */
  sessionId: string;
  /** Set when the employee had Event Mode active when the card was tapped */
  eventId?: string;
}

/**
 * Create a view event document in nfc_profile_views.
 * Returns the document ID so behavioral fields can be patched incrementally (Phase 2).
 * Fire-and-forget safe — returns null on failure, never throws.
 */
export async function logProfileView(params: LogProfileViewParams): Promise<string | null> {
  try {
    const today = new Date().toISOString().slice(0, 10); // "2026-03-29"
    const ref = await addDoc(collection(db, "nfc_profile_views"), {
      profileId: params.profileId,
      profileUid: params.profileUid,
      source: params.source,
      sessionId: params.sessionId,
      eventId: params.eventId ?? null,
      date: today,
      // Behavioral fields — written later by updateViewSession (Phase 2)
      viewDuration: 0,
      linksReached: false,
      linkClickCount: 0,
      clickedEmail: false,
      clickedPhone: false,
      clickedLocation: false,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  } catch {
    return null;
  }
}

export interface ViewSessionUpdate {
  viewDuration?: number;
  linksReached?: boolean;
  linkClickCount?: number;
  clickedEmail?: boolean;
  clickedPhone?: boolean;
  clickedLocation?: boolean;
  location?: { lat: number; lng: number; accuracy: number; city: string | null; country: string | null } | null;
}

/**
 * Patch behavioral fields on an existing view session document.
 * Called by PublicProfile.tsx as the visitor interacts (Phase 2).
 * Fire-and-forget — never throws.
 */
export async function updateViewSession(viewDocId: string, data: ViewSessionUpdate) {
  try {
    await updateDoc(doc(db, "nfc_profile_views", viewDocId), data);
  } catch {
    // Non-critical
  }
}

// ─── Contact save tracking ────────────────────────────────────────────────────

export interface LogContactSaveParams {
  /** uniqueId slug of the profile whose card was saved */
  profileId: string;
  /** Firebase UID of the profile owner */
  profileUid: string;
  /** How the visitor arrived */
  source: string;
  /** Session identifier — links this save to a view session */
  sessionId?: string;
  /** Geolocation of the visitor at save time */
  location?: { lat: number; lng: number; accuracy: number; city: string | null; country: string | null } | null;
}

/**
 * Log a vCard download as an individual event in nfc_contact_saves.
 * Mirrors nfc_link_clicks — preserves time, source, and session context so
 * save counts can be sliced by day, source, and event in the dashboard.
 * Fire-and-forget — never throws.
 */
export async function logContactSave(params: LogContactSaveParams) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await addDoc(collection(db, "nfc_contact_saves"), {
      profileId: params.profileId,
      profileUid: params.profileUid,
      source: params.source,
      sessionId: params.sessionId ?? null,
      location: params.location ?? null,
      date: today,
      createdAt: Timestamp.now(),
    });
  } catch {
    // Non-critical
  }
}
