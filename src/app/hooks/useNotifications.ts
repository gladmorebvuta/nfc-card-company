import * as React from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  writeBatch,
  updateDoc,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "exchange"       // someone exchanged contact info
  | "profile_view"   // someone viewed your profile
  | "card_save"      // someone saved your contact card
  | "order"          // order status update
  | "system";        // system announcements

export interface AppNotification {
  id: string;
  uid: string;               // owner of the notification
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Timestamp | null;
  /** Optional deep-link path, e.g. "/dashboard/connections" */
  link?: string;
  /** Optional metadata (exchange id, order id, etc.) */
  meta?: Record<string, string>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useNotifications(maxCount = 20) {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Real-time listener
  React.useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(maxCount),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)),
        );
        setLoading(false);
      },
      (err) => {
        // Log the error — Firestore missing-index errors include a direct link to create it
        console.error("[useNotifications] Firestore listener failed:", err.message);
        if (err.message.includes("index")) {
          console.error("[useNotifications] Missing composite index. Deploy indexes with: firebase deploy --only firestore:indexes");
        }
        setNotifications([]);
        setLoading(false);
      },
    );

    return unsub;
  }, [user, maxCount]);

  // Derived
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Actions ────────────────────────────────────────────────────────────────

  const markAsRead = React.useCallback(
    async (notificationId: string) => {
      try {
        await updateDoc(doc(db, "notifications", notificationId), {
          isRead: true,
        });
      } catch {
        // silent — UI will reconcile via listener
      }
    },
    [],
  );

  const markAllAsRead = React.useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { isRead: true });
      });
      await batch.commit();
    } catch {
      // silent
    }
  }, [notifications]);

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead };
}
