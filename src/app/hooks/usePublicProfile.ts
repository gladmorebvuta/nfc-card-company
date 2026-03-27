import * as React from "react";
import { createNotification } from "../services/notificationService";

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

/**
 * Determine how the visitor arrived at this profile.
 * URL param ?src= can be: nfc, qr, link  (default: direct_link)
 */
function detectSource(): "nfc" | "qr" | "direct_link" {
  const params = new URLSearchParams(window.location.search);
  const src = params.get("src");
  if (src === "nfc") return "nfc";
  if (src === "qr") return "qr";
  if (src === "link") return "direct_link";
  return "direct_link"; // fallback for organic / untagged visits
}

export function usePublicProfile(uniqueId: string | undefined) {
  const [profile, setProfile] = React.useState<PublicProfileData | null>(null);
  const [ownerUid, setOwnerUid] = React.useState<string | null>(null);
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
        const res = await fetch(`${FUNCTIONS_BASE}/nfcPublicProfile?id=${encodeURIComponent(uniqueId!)}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.status === "success") {
          setProfile(json.data.profile);
          const uid = json.data.uid as string | undefined;
          if (uid) setOwnerUid(uid);

          // Notify profile owner on NFC taps (avoid notification spam for every view)
          if (uid && source === "nfc") {
            createNotification({
              uid,
              type: "profile_view",
              title: "NFC card tapped",
              body: "Someone tapped your NFC card and viewed your profile.",
              link: "/dashboard",
            });
          }
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

    // Log the tap with the detected source (fire and forget)
    fetch(`${FUNCTIONS_BASE}/nfcLogTap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: uniqueId, source }),
    }).catch(() => {}); // Intentionally ignore errors

    return () => { cancelled = true; };
  }, [uniqueId]);

  return { profile, ownerUid, loading, error };
}
