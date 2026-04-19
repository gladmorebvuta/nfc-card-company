import * as React from "react";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";

export interface InsightsData {
  /** date string (YYYY-MM-DD) → view count, last 30 days */
  viewsByDay: Record<string, number>;
  /** source slug → view count, last 30 days */
  viewsBySource: Record<string, number>;
  /** per-link click aggregates, sorted by count desc */
  linkClicks: Array<{
    linkUrl: string;
    linkTitle: string;
    linkType: string;
    count: number;
  }>;
  loading: boolean;
}

export function useInsights(profileUid: string | null): InsightsData {
  const [viewsByDay, setViewsByDay] = React.useState<Record<string, number>>({});
  const [viewsBySource, setViewsBySource] = React.useState<Record<string, number>>({});
  const [linkClicks, setLinkClicks] = React.useState<InsightsData["linkClicks"]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profileUid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchInsights() {
      try {
        const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86_400_000)
          .toISOString()
          .slice(0, 10);

        // ── Profile views (last 30 days) ───────────────────────────────────────
        // Uses composite index: nfc_profile_views [profileUid ASC, date ASC]
        const viewsSnap = await getDocs(
          query(
            collection(db, "nfc_profile_views"),
            where("profileUid", "==", profileUid),
            where("date", ">=", thirtyDaysAgoStr),
            orderBy("date")
          )
        );

        if (cancelled) return;

        const byDay: Record<string, number> = {};
        const bySource: Record<string, number> = {};

        viewsSnap.docs.forEach((d) => {
          const { date, source } = d.data();
          byDay[date] = (byDay[date] ?? 0) + 1;
          bySource[source] = (bySource[source] ?? 0) + 1;
        });

        setViewsByDay(byDay);
        setViewsBySource(bySource);

        // ── Link clicks (last 500, recent first) ──────────────────────────────
        // Uses composite index: nfc_link_clicks [profileUid ASC, createdAt DESC]
        const clicksSnap = await getDocs(
          query(
            collection(db, "nfc_link_clicks"),
            where("profileUid", "==", profileUid),
            orderBy("createdAt", "desc"),
            limit(500)
          )
        );

        if (cancelled) return;

        const clickMap: Record<
          string,
          { linkUrl: string; linkTitle: string; linkType: string; count: number }
        > = {};

        clicksSnap.docs.forEach((d) => {
          const { linkUrl, linkTitle, linkType } = d.data();
          const key = linkUrl || linkTitle || "unknown";
          if (!clickMap[key]) {
            clickMap[key] = {
              linkUrl: linkUrl || "",
              linkTitle: linkTitle || key,
              linkType: linkType || "default",
              count: 0,
            };
          }
          clickMap[key].count++;
        });

        setLinkClicks(
          Object.values(clickMap).sort((a, b) => b.count - a.count)
        );
      } catch (err) {
        console.error("[useInsights]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInsights();
    return () => {
      cancelled = true;
    };
  }, [profileUid]);

  return { viewsByDay, viewsBySource, linkClicks, loading };
}
