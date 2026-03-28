import * as React from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { createNotification } from "../services/notificationService";
import { incrementProfileStat } from "../services/analyticsService";

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

export function usePublicProfile(uniqueId: string | undefined) {
  const [profile, setProfile] = React.useState<PublicProfileData | null>(null);
  const [ownerUid, setOwnerUid] = React.useState<string | null>(null);
  const [profileDocId, setProfileDocId] = React.useState<string | null>(null);
  const [source] = React.useState(() => detectSource());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const source = detectSource();

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

        // Increment view counter (fire-and-forget)
        incrementProfileStat(docSnap.id, "totalViews");

        // Notify profile owner on NFC taps only (avoid spam for every view)
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
  }, [uniqueId]);

  return { profile, ownerUid, profileDocId, source, loading, error };
}
