import * as React from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export interface EventData {
  id: string;
  profileUid: string;
  profileId: string;
  name: string;
  location: string;
  date: string;
  isActive: boolean;
  viewCount: number;
  exchangeCount: number;
  createdAt: any;
  endedAt: any;
}

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<EventData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "nfc_events"),
      where("profileUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventData)));
        setLoading(false);
      },
      (err) => {
        console.error("[useEvents] Firestore listener failed:", err.message);
        if (err.message.includes("index")) {
          console.error("[useEvents] Missing composite index. Deploy with: firebase deploy --only firestore:indexes");
        }
        setEvents([]);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  return { events, loading };
}
