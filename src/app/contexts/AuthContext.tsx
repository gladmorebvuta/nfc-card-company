import * as React from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/** Generate a URL-safe slug from a display name + random suffix, ensuring uniqueness in Firestore.
 *  Checks against active profiles only (all profiles are created active, so this catches all slugs).
 */
async function generateUniqueId(displayName: string | null): Promise<string> {
  const base = (displayName || "user")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2) // first + last name only
    .join("-");

  // Try up to 5 times to generate a unique slug
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 8); // 6-char random for fewer collisions
    const candidate = `${base}-${suffix}`;
    // Query active profiles only — the isActive filter satisfies the public read rule
    const q = query(
      collection(db, "nfc_profiles"),
      where("uniqueId", "==", candidate),
      where("isActive", "==", true),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return candidate; // no collision — use it
  }

  // Fallback: use timestamp-based suffix to guarantee uniqueness
  return `${base}-${Date.now().toString(36)}`;
}

/** Build a user-scoped localStorage key so switching accounts doesn't leak cached data */
export function uniqueIdCacheKey(uid: string) {
  return `nfc_unique_id_${uid}`;
}

/** Ensure the user has an nfc_profiles document; create one if not.
 *  Uses the user's UID as the document ID for direct, query-free access.
 *  Caches the uniqueId in localStorage so the dashboard can show the link
 *  even when Firestore direct reads are unavailable.
 *  Exported so useNfcProfile can call it when a profile is missing at runtime.
 */
export async function ensureNfcProfile(user: User): Promise<void> {
  // Direct document read — no collection query needed, avoids query security validation
  const profileRef = doc(db, "nfc_profiles", user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    // Profile exists — cache the uniqueId locally (scoped to this user)
    const data = profileSnap.data();
    if (data.uniqueId) {
      localStorage.setItem(uniqueIdCacheKey(user.uid), data.uniqueId);
    }
    return;
  }

  // First login: provision a new profile document
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
    company: "Middlesex Consulting Group",
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

  // Cache the newly created uniqueId (scoped to this user)
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
        // Step 1: Check or create user doc (best-effort — permission failures are non-fatal)
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
          // users collection may be restricted — that's ok, default to nfc-user
          setUserRole("nfc-user");
        }

        // Step 2: Ensure nfc_profiles document exists — always run, independent of step 1
        try {
          await ensureNfcProfile(firebaseUser);
        } catch (err) {
          console.error("ensureNfcProfile failed:", err);
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
