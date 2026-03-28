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

    // Direct document snapshot using uid as doc ID — no collection query, no permission issue
    const profileRef = doc(db, "nfc_profiles", user.uid);

    const unsub = onSnapshot(profileRef, (snap) => {
      if (!snap.exists()) {
        // Profile missing at runtime (e.g. data was reset) — re-provision it
        console.warn("[useNfcProfile] No profile found for uid:", user.uid, "— re-provisioning");
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
      // Firestore direct access denied — build a minimal stub from the cached uniqueId
      // so the dashboard can still show the correct share link
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
        console.error("[useNfcProfile] No cached uniqueId either — profile will be unavailable");
        setError(err.message);
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  return { profile, loading, error };
}
