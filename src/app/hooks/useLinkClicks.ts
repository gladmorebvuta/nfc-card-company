import * as React from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export interface LinkClickData {
  id: string;
  profileId: string;
  profileUid: string;
  linkUrl: string;
  linkTitle: string;
  linkType: string;
  source: string;
  createdAt: { toDate?: () => Date; seconds?: number } | null;
}

export interface LinkClickSummary {
  linkTitle: string;
  linkUrl: string;
  linkType: string;
  totalClicks: number;
  /** Clicks broken down by source */
  bySource: Record<string, number>;
}

export function useLinkClicks(maxCount = 200) {
  const { user } = useAuth();
  const [clicks, setClicks] = React.useState<LinkClickData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setClicks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "nfc_link_clicks"),
      where("profileUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(maxCount),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setClicks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LinkClickData)));
        setLoading(false);
      },
      () => {
        setClicks([]);
        setLoading(false);
      },
    );

    return unsub;
  }, [user, maxCount]);

  // Aggregate by link
  const summary = React.useMemo<LinkClickSummary[]>(() => {
    const map = new Map<string, LinkClickSummary>();
    for (const click of clicks) {
      const key = click.linkUrl;
      if (!map.has(key)) {
        map.set(key, {
          linkTitle: click.linkTitle,
          linkUrl: click.linkUrl,
          linkType: click.linkType,
          totalClicks: 0,
          bySource: {},
        });
      }
      const entry = map.get(key)!;
      entry.totalClicks++;
      entry.bySource[click.source] = (entry.bySource[click.source] || 0) + 1;
    }
    return Array.from(map.values()).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [clicks]);

  return { clicks, summary, loading, totalClicks: clicks.length };
}
