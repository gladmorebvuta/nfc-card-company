import { collection, addDoc, updateDoc, doc, Timestamp, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";

export interface CreateEventParams {
  profileUid: string;
  /** uniqueId of the nfc_profiles doc — used to build shareable links */
  profileId: string;
  name: string;
  location: string;
  date: string;
}

/**
 * Create a new live event for the profile owner.
 * Only one event should be active at a time — enforced in the UI.
 */
export async function createEvent(params: CreateEventParams): Promise<string> {
  const ref = await addDoc(collection(db, "nfc_events"), {
    profileUid: params.profileUid,
    profileId: params.profileId,
    name: params.name,
    location: params.location,
    date: params.date,
    isActive: true,
    viewCount: 0,
    exchangeCount: 0,
    createdAt: Timestamp.now(),
    endedAt: null,
  });
  return ref.id;
}

/** Mark an event as ended. */
export async function endEvent(eventId: string): Promise<void> {
  await updateDoc(doc(db, "nfc_events", eventId), {
    isActive: false,
    endedAt: Timestamp.now(),
  });
}

/**
 * Increment a stat counter on an event doc.
 * Called by unauthenticated visitors (view) and exchange submitters.
 * Security rules restrict updates to viewCount and exchangeCount only.
 */
export async function incrementEventStat(
  eventId: string,
  field: "viewCount" | "exchangeCount"
): Promise<void> {
  try {
    await updateDoc(doc(db, "nfc_events", eventId), { [field]: increment(1) });
  } catch {
    // Non-critical — don't bubble errors for stat increments
  }
}
