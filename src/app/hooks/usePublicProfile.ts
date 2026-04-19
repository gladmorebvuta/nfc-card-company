import * as React from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../lib/firebase";
import { createNotification } from "../services/notificationService";
import { incrementProfileStat, logProfileView, updateViewSession } from "../services/analyticsService";
import { incrementEventStat } from "../services/eventsService";
import { getLocation } from "../utils/location";

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

/**
 * Determine how the visitor arrived at this profile.
 * URL param ?src= can be: nfc, qr, link  (default: direct)
 */
export function detectSource(): "nfc" | "qr" | "link" | "direct" {
  const params = new URLSearchParams(window.location.search);
  const src = params.get("src");
  if (src === "nfc") return "nfc";
  if (src === "qr") return "qr";
  if (src === "link") return "link";
  return "direct";
}

// ─── Session management ───────────────────────────────────────────────────────
// Stored in sessionStorage — survives page refreshes, cleared on tab close.
// Scoped to uniqueId so multiple profiles on the same device don't collide.

const sidKey = (uid: string) => `nfc_sid_${uid}`;
const vidKey = (uid: string) => `nfc_vid_${uid}`;

/**
 * Get or create a stable session for this profile visit.
 *
 * - Existing session (same tab): returns the cached sessionId + viewDocId
 *   so we skip creating a duplicate view event.
 * - New session: generates a UUID, clears any stale viewDocId from a prior
 *   visit on the same device.
 */
function resolveSession(uniqueId: string): {
  sessionId: string;
  existingViewDocId: string | null;
} {
  let sessionId = sessionStorage.getItem(sidKey(uniqueId));
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(sidKey(uniqueId), sessionId);
    // New session — stale viewDocId from a previous visit is now invalid
    sessionStorage.removeItem(vidKey(uniqueId));
  }
  return {
    sessionId,
    existingViewDocId: sessionStorage.getItem(vidKey(uniqueId)),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePublicProfile(uniqueId: string | undefined) {
  const [profile, setProfile] = React.useState<PublicProfileData | null>(null);
  const [ownerUid, setOwnerUid] = React.useState<string | null>(null);
  const [profileDocId, setProfileDocId] = React.useState<string | null>(null);
  const [viewDocId, setViewDocId] = React.useState<string | null>(null);
  const [source] = React.useState(() => detectSource());
  const [eventId] = React.useState(() => new URLSearchParams(window.location.search).get("eid") ?? null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Resolve session once on mount — stable for the lifetime of this tab
  const { sessionId, existingViewDocId } = React.useMemo(
    () =>
      uniqueId
        ? resolveSession(uniqueId)
        : { sessionId: crypto.randomUUID(), existingViewDocId: null },
    // uniqueId is stable for any given profile page — intentional single-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uniqueId]
  );

  React.useEffect(() => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      try {
        const q = query(
          collection(db, "nfc_profiles"),
          where("uniqueId", "==", uniqueId),
          where("isActive", "==", true),
          limit(1),
        );
        const snap = await getDocs(q);

        if (cancelled) return;

        if (snap.empty) {
          setError("Profile not found");
          setLoading(false);
          return;
        }

        const docSnap = snap.docs[0];
        const docData = docSnap.data();
        const uid = docData.uid as string;

        const profileData: PublicProfileData = {
          displayName: docData.displayName || `${docData.firstName || ""} ${docData.lastName || ""}`.trim(),
          firstName: docData.firstName || "",
          lastName: docData.lastName || "",
          jobTitle: docData.jobTitle || null,
          company: docData.company || null,
          department: docData.department || null,
          bio: docData.bio || null,
          emailPublic: docData.emailPublic || null,
          phone: docData.phone || null,
          office: docData.office || null,
          avatarUrl: docData.avatarUrl || null,
          coverUrl: docData.coverUrl || null,
          links: docData.links || [],
          theme: docData.theme || null,
        };

        setProfile(profileData);
        setOwnerUid(uid);
        setProfileDocId(docSnap.id);

        // ── Self-view suppression ──────────────────────────────────────────────
        // Employees previewing their own card must not inflate their stats.
        // getAuth().currentUser is synchronous — no extra round trip needed.
        const currentUser = getAuth().currentUser;
        if (currentUser?.uid === uid) {
          if (!cancelled) setLoading(false);
          return;
        }

        // ── Session deduplication ──────────────────────────────────────────────
        // Same browser tab refreshing the page reuses the existing view doc
        // rather than creating a duplicate event. The viewDocId is used by
        // Phase 2 behavioral tracking to patch the same document.
        if (existingViewDocId) {
          if (!cancelled) {
            setViewDocId(existingViewDocId);
            setLoading(false);
          }
          return;
        }

        // ── New session: record the view ───────────────────────────────────────
        // Increment the fast-read counter that powers the dashboard stat card
        incrementProfileStat(docSnap.id, "totalViews");

        // Log the full view event — docId returned for Phase 2 behavioral patches
        const docId = await logProfileView({
          profileId: uniqueId,
          profileUid: uid,
          source,
          sessionId,
          eventId: eventId ?? undefined,
        });

        if (cancelled) return;

        if (docId) {
          // Cache so page refreshes within this tab reuse the same view doc
          sessionStorage.setItem(vidKey(uniqueId), docId);
          setViewDocId(docId);

          // Increment event view counter — fire-and-forget
          if (eventId) incrementEventStat(eventId, "viewCount");

          // Enrich the view doc with location — fire-and-forget, non-blocking
          getLocation().then((loc) => {
            if (loc) {
              updateViewSession(docId, {
                location: { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, city: loc.city, country: loc.country },
              });
            }
          });
        }

        // Notify profile owner on NFC taps only — every web view would be noisy
        if (source === "nfc") {
          createNotification({
            uid,
            type: "profile_view",
            title: "NFC card tapped",
            body: "Someone tapped your NFC card and viewed your profile.",
            link: "/dashboard",
          });
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();

    return () => { cancelled = true; };
  }, [uniqueId, source, sessionId, existingViewDocId]);

  return { profile, ownerUid, profileDocId, viewDocId, sessionId, eventId, source, loading, error };
}
