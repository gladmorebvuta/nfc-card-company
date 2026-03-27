import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { NotificationType } from "../hooks/useNotifications";

interface CreateNotificationParams {
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, string>;
}

/**
 * Write a notification document to Firestore.
 * This is called client-side for events that originate in the browser
 * (e.g. when a visitor submits an exchange form).
 *
 * For server-side events (order shipped, etc.) use Cloud Functions instead.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await addDoc(collection(db, "notifications"), {
      uid: params.uid,
      type: params.type,
      title: params.title,
      body: params.body,
      isRead: false,
      createdAt: Timestamp.now(),
      link: params.link ?? null,
      meta: params.meta ?? null,
    });
  } catch {
    // Non-critical — don't break the caller's flow
    console.warn("[notificationService] Failed to create notification");
  }
}
