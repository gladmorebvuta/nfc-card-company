import { collection, addDoc, doc, updateDoc, increment, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

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
