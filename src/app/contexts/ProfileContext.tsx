import * as React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "./AuthContext";
import { useNfcProfile, type NfcProfileData } from "../hooks/useNfcProfile";

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: string;
}

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
  links: LinkItem[];
  stats: {
    views: number;
    taps: number;
    leads: number;
  };
}

interface ProfileContextType {
  profile: ProfileData;
  nfcProfile: NfcProfileData | null;
  updateProfile: (updates: Partial<ProfileData>) => void;
  resetProfile: () => void;
  isFirestoreBacked: boolean;
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(
  undefined,
);

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
      taps: nfc.stats?.totalSaves || 0,
      leads: nfc.stats?.totalExchanges || 0,
    },
  };
}

const EMPTY_PROFILE: ProfileData = {
  id: "",
  name: "",
  title: "",
  department: "",
  bio: "",
  avatar: "",
  cover: "",
  email: "",
  phone: "",
  office: "",
  links: [],
  stats: { views: 0, taps: 0, leads: 0 },
};

/** Build a minimal profile from the Firebase Auth user when Firestore data isn't available yet */
function profileFromAuth(user: import("firebase/auth").User): ProfileData {
  return {
    ...EMPTY_PROFILE,
    id: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    avatar: user.photoURL || "",
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile: nfcProfile } = useNfcProfile();
  const [localOverrides, setLocalOverrides] = React.useState<Partial<ProfileData>>({});

  const isFirestoreBacked = !!user && !!nfcProfile;

  // Priority: Firestore profile > auth-derived profile > empty shell
  const profile = isFirestoreBacked
    ? nfcToLegacy(nfcProfile!)
    : user
      ? { ...profileFromAuth(user), ...localOverrides }
      : EMPTY_PROFILE;

  const updateProfile = React.useCallback(async (updates: Partial<ProfileData>) => {
    if (isFirestoreBacked && nfcProfile) {
      // Write to Firestore
      const nfcUpdates: Record<string, unknown> = {};
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
      if (updates.links !== undefined) {
        nfcUpdates.links = updates.links.map((l) => ({
          id: l.id,
          label: l.title,
          url: l.url,
          platform: l.type,
        }));
      }

      if (Object.keys(nfcUpdates).length > 0) {
        await updateDoc(doc(db, "nfc_profiles", nfcProfile.id), nfcUpdates);
      }
    } else {
      setLocalOverrides((prev) => ({ ...prev, ...updates }));
    }
  }, [isFirestoreBacked, nfcProfile]);

  const resetProfile = React.useCallback(() => {
    setLocalOverrides({});
  }, []);

  const value = React.useMemo(
    () => ({ profile, nfcProfile: nfcProfile || null, updateProfile, resetProfile, isFirestoreBacked }),
    [profile, nfcProfile, updateProfile, resetProfile, isFirestoreBacked]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = React.useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
