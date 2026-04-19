import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth, uniqueIdCacheKey, ensureNfcProfile } from "../contexts/AuthContext";

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
  onboarded?: boolean;
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

    // Direct document fetch by user.uid — no query needed, matches security rules.
    const profileRef = doc(db, "nfc_profiles", user.uid);

    const unsub = onSnapshot(profileRef, (snap) => {
      if (!snap.exists()) {
        // Profile missing — re-provision (handles first-login race conditions)
        console.warn("[useNfcProfile] No profile at nfc_profiles/", user.uid, "— re-provisioning");
        ensureNfcProfile(user).catch(console.error);
        setProfile(null);
      } else {
        const data = { id: snap.id, ...snap.data() } as NfcProfileData;
        // Keep localStorage cache in sync
        if (data.uniqueId) localStorage.setItem(uniqueIdCacheKey(user.uid), data.uniqueId);
        setProfile(data);
      }
      setLoading(false);
    }, (err) => {
      // Firestore access denied — build a minimal stub from the cached uniqueId
      console.error("[useNfcProfile] Firestore read failed:", err.message);
      const cachedUniqueId = localStorage.getItem(uniqueIdCacheKey(user.uid));
      if (cachedUniqueId) {
        setProfile({
          id: user.uid,
          uid: user.uid,
          uniqueId: cachedUniqueId,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          displayName: user.displayName || "",
          jobTitle: null,
          company: null,
          department: null,
          bio: null,
          emailPublic: user.email || null,
          phone: null,
          office: null,
          avatarUrl: user.photoURL || null,
          coverUrl: null,
          links: [],
          theme: null,
          stats: { totalViews: 0, totalExchanges: 0, totalSaves: 0 },
          isActive: true,
          plan: "starter",
        });
      } else {
        setError(err.message);
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  return { profile, loading, error };
}
