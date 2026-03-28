import * as React from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export interface ExchangeData {
  id: string;
  profileId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  visitorCompany: string | null;
  visitorNote: string | null;
  source: string;
  location: { lat: number; lng: number; accuracy: number; city: string | null; country: string | null } | null;
  isRead: boolean;
  isArchived: boolean;
  createdAt: any;
}

export function useExchanges(showArchived = false) {
  const { user } = useAuth();
  const [exchanges, setExchanges] = React.useState<ExchangeData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setExchanges([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "nfc_exchanges"),
      where("profileUid", "==", user.uid),
      where("isArchived", "==", showArchived),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setExchanges(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ExchangeData)));
      setLoading(false);
    }, (err) => {
      console.error("[useExchanges] Firestore listener failed:", err.message);
      if (err.message.includes("index")) {
        console.error("[useExchanges] Missing composite index. Deploy indexes with: firebase deploy --only firestore:indexes");
      }
      setExchanges([]);
      setLoading(false);
    });

    return unsub;
  }, [user, showArchived]);

  return { exchanges, loading };
}
