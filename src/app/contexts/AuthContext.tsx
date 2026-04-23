import * as React from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, deleteDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/** Generate a URL-safe slug from a display name + random suffix, ensuring uniqueness in Firestore. */
async function generateUniqueId(displayName: string | null): Promise<string> {
  const base = (displayName || "user")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join("-");

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const candidate = `${base}-${suffix}`;
    const q = query(
      collection(db, "nfc_profiles"),
      where("uniqueId", "==", candidate),
      where("isActive", "==", true),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Build a user-scoped localStorage key so switching accounts doesn't leak cached data */
export function uniqueIdCacheKey(uid: string) {
  return `nfc_unique_id_${uid}`;
}

/**
 * Ensure the user has an nfc_profiles document at path nfc_profiles/{uid}.
 *
 * Document ID === user.uid so security rules can use `profileId == request.auth.uid`
 * for a direct, query-free ownership check.
 *
 * Migration: if the user has an old random-ID profile (created before this change),
 * we copy its data to the new UID-keyed path and remove the old document.
 */
export async function ensureNfcProfile(user: User): Promise<void> {
  const profileRef = doc(db, "nfc_profiles", user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    const data = profileSnap.data();
    if (data.uniqueId) {
      localStorage.setItem(uniqueIdCacheKey(user.uid), data.uniqueId);
    }
    return;
  }

  // ── Migration: look for a legacy profile with a random document ID ────────
  // Old profiles have uid stored as a field; they're readable because isActive==true.
  try {
    const legacyQ = query(
      collection(db, "nfc_profiles"),
      where("uid", "==", user.uid),
      where("isActive", "==", true),
      limit(1)
    );
    const legacySnap = await getDocs(legacyQ);

    if (!legacySnap.empty) {
      const legacyDoc = legacySnap.docs[0];
      const legacyData = legacyDoc.data();
      console.log("[ensureNfcProfile] Migrating legacy profile", legacyDoc.id, "→ nfc_profiles/", user.uid);

      // Write data to the new UID-keyed path
      await setDoc(profileRef, { ...legacyData, uid: user.uid });

      // Cache uniqueId
      if (legacyData.uniqueId) {
        localStorage.setItem(uniqueIdCacheKey(user.uid), legacyData.uniqueId);
      }

      // Best-effort: remove the old document (non-fatal if it fails)
      try {
        await deleteDoc(legacyDoc.ref);
      } catch {
        console.warn("[ensureNfcProfile] Could not delete legacy profile doc — it may remain as a duplicate");
      }

      return;
    }
  } catch (err) {
    console.warn("[ensureNfcProfile] Legacy profile query failed (non-fatal):", (err as Error).message);
  }

  // ── First-ever login: create a fresh profile ──────────────────────────────
  console.log("[ensureNfcProfile] Creating new profile for:", user.displayName, user.uid);
  const uniqueId = await generateUniqueId(user.displayName);
  const nameParts = (user.displayName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  await setDoc(profileRef, {
    uid: user.uid,
    uniqueId,
    firstName,
    lastName,
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
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem(uniqueIdCacheKey(user.uid), uniqueId);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Step 1: Check or create user doc
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserRole(userSnap.data().role || "nfc-user");
          } else {
            await setDoc(userRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: "nfc-user",
              createdAt: new Date().toISOString(),
            });
            setUserRole("nfc-user");
          }
        } catch {
          setUserRole("nfc-user");
        }

        // Step 2: Ensure nfc_profiles document exists (with migration)
        try {
          await ensureNfcProfile(firebaseUser);
        } catch (err) {
          console.error("[AuthContext] ensureNfcProfile failed:", err);
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
