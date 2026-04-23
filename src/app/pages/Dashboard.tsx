import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Eye, MousePointerClick, Users, Link2, Share2, Copy, QrCode,
  Download, Check, X, ChevronRight, Zap, Phone, Mail, MapPin, Building,
} from "lucide-react"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { useProfile } from "../contexts/ProfileContext"
import { useAuth } from "../contexts/AuthContext"
import { uniqueIdCacheKey } from "../contexts/AuthContext"
import { useExchanges } from "../hooks/useExchanges"
import { useInsights } from "../hooks/useInsights"
import { useEvents } from "../hooks/useEvents"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { generateVCard } from "../utils/vcard"
import { QRCodeSVG } from "qrcode.react"
import { FlippableCard } from "../components/FlippableCard"
import mcgLogoColour from "../../assets/MCG Logo Colour.svg"
import { Seo } from "../components/seo/Seo"

// ─── Platform colours ─────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  instagram: "#E1306C",
  facebook: "#1877F2",
  website: "#2E1065",
  github: "#333",
  youtube: "#FF0000",
  default: "#8B5CF6",
};

// ─── Source metadata ──────────────────────────────────────────────────────────
const SOURCE_META: Record<string, { label: string; color: string }> = {
  nfc:    { label: "NFC",    color: "#7C3AED" },
  qr:     { label: "QR",    color: "#3B82F6" },
  link:   { label: "Link",  color: "#0D9488" },
  direct: { label: "Direct",color: "#9CA3AF" },
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ viewsByDay }: { viewsByDay: Record<string, number> }) {
  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const date = d.toISOString().slice(0, 10);
        return {
          date,
          label: d.toLocaleDateString("en", { weekday: "short" }),
          count: viewsByDay[date] ?? 0,
        };
      }),
    [viewsByDay]
  );

  const total = days.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const W = 300, H = 56;
  const xOf = (i: number) => (i / 6) * W;
  const yOf = (n: number) => H - (n / maxCount) * (H * 0.82) - 2;

  const linePts = days.map((d, i) => `${xOf(i)},${yOf(d.count)}`).join(" ");
  const areaPts = [`0,${H}`, ...days.map((d, i) => `${xOf(i)},${yOf(d.count)}`), `${W},${H}`].join(" ");

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Views — 7 days</span>
        <span className="text-2xl font-black text-[#2E1065]">{total}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sp-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill="url(#sp-grad)" />
        <polyline points={linePts} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {days.map((d, i) =>
          d.count > 0 ? (
            <circle key={d.date} cx={xOf(i)} cy={yOf(d.count)} r="3" fill="#F97316" />
          ) : null
        )}
      </svg>
      <div className="flex justify-between">
        {days.map((d) => (
          <span key={d.date} className="text-[9px] font-bold text-gray-400">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Source breakdown ─────────────────────────────────────────────────────────
function SourceBreakdown({ viewsBySource }: { viewsBySource: Record<string, number> }) {
  const total = Object.values(viewsBySource).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const bars = (["nfc", "qr", "link", "direct"] as const)
    .map((src) => ({
      src,
      count: viewsBySource[src] ?? 0,
      pct: Math.round(((viewsBySource[src] ?? 0) / total) * 100),
      ...SOURCE_META[src],
    }))
    .filter((b) => b.count > 0);

  return (
    <div className="space-y-2 pt-4 border-t border-white/40">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Traffic Sources — 30 days</span>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {bars.map((b) => (
          <div key={b.src} style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {bars.map((b) => (
          <div key={b.src} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
            {b.label}
            <span className="font-black text-gray-600">{b.pct}%</span>
            <span className="text-gray-300">({b.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Conversion funnel ────────────────────────────────────────────────────────
function Funnel({ views, exchanges, converted }: { views: number; exchanges: number; converted: number }) {
  const vToE = views > 0 ? Math.round((exchanges / views) * 100) : 0;
  const eToC = exchanges > 0 ? Math.round((converted / exchanges) * 100) : 0;

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Conversion Funnel</span>
      <div className="flex items-stretch gap-2">
        <div className="flex-1 rounded-xl bg-violet-50 px-3 py-3 text-center">
          <p className="text-2xl font-black text-violet-700">{views.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-violet-400 mt-0.5 uppercase tracking-wide">Views</p>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0">
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <span className="text-[9px] font-black text-gray-400">{vToE}%</span>
        </div>
        <div className="flex-1 rounded-xl bg-[#FFF7EE] px-3 py-3 text-center">
          <p className="text-2xl font-black text-[#F97316]">{exchanges.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-[#F97316]/60 mt-0.5 uppercase tracking-wide">Exchanges</p>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0">
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <span className="text-[9px] font-black text-gray-400">{eToC}%</span>
        </div>
        <div className="flex-1 rounded-xl bg-green-50 px-3 py-3 text-center">
          <p className="text-2xl font-black text-green-700">{converted.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-green-500 mt-0.5 uppercase tracking-wide">Converted</p>
        </div>
      </div>
    </div>
  );
}

// ─── Link performance ─────────────────────────────────────────────────────────
function LinkPerformance({
  linkClicks,
  totalViews,
}: {
  linkClicks: Array<{ linkUrl: string; linkTitle: string; linkType: string; count: number }>;
  totalViews: number;
}) {
  if (linkClicks.length === 0) return null;
  const maxClicks = Math.max(...linkClicks.map((l) => l.count), 1);

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Link Performance — 30 days</span>
      <div className="space-y-3">
        {linkClicks.slice(0, 5).map((link, i) => {
          const barPct = Math.round((link.count / maxClicks) * 100);
          const ctr = totalViews > 0 ? ((link.count / totalViews) * 100).toFixed(1) : "0.0";
          const color = PLATFORM_COLORS[link.linkType] ?? PLATFORM_COLORS.default;
          return (
            <div key={link.linkUrl || i} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#2E1065] truncate flex-1">{link.linkTitle}</span>
                <span className="font-bold text-gray-400 shrink-0">
                  {link.count} clicks · {ctr}% CTR
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { profile: currentEmployee, nfcProfile, isFirestoreBacked } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { exchanges } = useExchanges();
  const { events } = useEvents();
  const { viewsByDay, viewsBySource, linkClicks, loading: insightsLoading } = useInsights(
    user?.uid ?? null
  );
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);

  const activeEvent = events.find((e) => e.isActive) ?? null;

  // Build unique per-user profile URLs with source tracking
  const baseProfileUrl = React.useMemo(() => {
    if (isFirestoreBacked && nfcProfile?.uniqueId) {
      return `${window.location.origin}/c/${nfcProfile.uniqueId}`;
    }
    if (user) {
      const cached = localStorage.getItem(uniqueIdCacheKey(user.uid));
      if (cached) return `${window.location.origin}/c/${cached}`;
    }
    return `${window.location.origin}/`;
  }, [isFirestoreBacked, nfcProfile, user]);

  const profileUrl = `${baseProfileUrl}?src=link`;
  const qrProfileUrl = `${baseProfileUrl}?src=qr`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setLinkCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Funnel data
  const totalViews = isFirestoreBacked ? currentEmployee.stats.views : 0;
  const totalExchanges = exchanges.length;
  const totalConverted = exchanges.filter(
    (e) => (e.followUpStatus ?? "new") === "converted"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 sm:space-y-8 min-w-0"
    >
      <Seo title="Dashboard" description="Manage your NFC digital business card." noindex />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-[#2E1065]">Overview</h1>
        <p className="text-gray-500 font-medium">Welcome back, {currentEmployee.name.split(" ")[0]}</p>
      </div>

      {/* Active Event Banner */}
      {activeEvent && (
        <button
          onClick={() => navigate("/dashboard/events")}
          className="flex w-full items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-green-700">Event Mode: </span>
            <span className="text-sm font-semibold text-green-600">{activeEvent.name}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs font-bold text-green-600">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {activeEvent.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {activeEvent.exchangeCount}
            </span>
            <Zap className="h-3.5 w-3.5" />
          </div>
        </button>
      )}

      {/* ── 4 Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Profile Views",
            value: isFirestoreBacked ? currentEmployee.stats.views.toLocaleString() : "—",
            icon: <Eye className="h-5 w-5" />,
            iconBg: "bg-[#F97316]/10 text-[#F97316]",
          },
          {
            label: "Card Saves",
            value: isFirestoreBacked ? currentEmployee.stats.taps.toLocaleString() : "—",
            icon: <MousePointerClick className="h-5 w-5" />,
            iconBg: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
          },
          {
            label: "New Leads",
            value: isFirestoreBacked ? String(currentEmployee.stats.leads) : "—",
            icon: <Users className="h-5 w-5" />,
            iconBg: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Active Links",
            value: String(currentEmployee.links.length),
            icon: <Link2 className="h-5 w-5" />,
            iconBg: "bg-[#2E1065]/10 text-[#2E1065]",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all hover:bg-white/70">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-500 leading-tight">{stat.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-2xl ${stat.iconBg}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight text-[#2E1065] leading-none">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* ── Main 2-col grid ────────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left col — 3/5 */}
        <div className="space-y-6 lg:col-span-3">

          {/* Share Profile */}
          <Card>
            <div className="flex items-center justify-between border-b border-white/40 p-5">
              <div>
                <h2 className="text-base font-bold text-[#2E1065]">Share Profile</h2>
                {baseProfileUrl !== `${window.location.origin}/` && (
                  <p className="text-xs text-gray-400 font-medium mt-0.5 truncate max-w-[180px]">
                    {baseProfileUrl.replace(/^https?:\/\//, "")}
                  </p>
                )}
              </div>
              <button
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border ${
                  linkCopied
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-white/60 text-[#2E1065] border-white hover:bg-white shadow-sm"
                }`}
              >
                {linkCopied ? (
                  <><Check className="h-3 w-3" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy Link</>
                )}
              </button>
            </div>
            <CardContent className="p-6">
              <button
                onClick={() => setShowQrModal(true)}
                className="group flex w-full cursor-pointer items-center gap-4 rounded-[1.5rem] border border-white/60 bg-white/40 p-4 transition-all hover:border-[#F97316]/30 hover:bg-white/60 hover:shadow-md text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#F97316] shadow-sm">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2E1065]">My QR Code</h3>
                  <p className="text-xs text-gray-500 font-medium">Download for print</p>
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Analytics: Sparkline + Source breakdown */}
          <Card>
            <div className="border-b border-white/40 px-5 py-4">
              <h2 className="text-base font-bold text-[#2E1065]">Analytics</h2>
            </div>
            <CardContent className="p-5 space-y-5">
              {insightsLoading ? (
                <p className="text-sm text-gray-400 font-medium text-center py-4">Loading analytics…</p>
              ) : (
                <>
                  <Sparkline viewsByDay={viewsByDay} />
                  <SourceBreakdown viewsBySource={viewsBySource} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardContent className="p-5">
              <Funnel views={totalViews} exchanges={totalExchanges} converted={totalConverted} />
            </CardContent>
          </Card>

          {/* Link Performance */}
          {!insightsLoading && linkClicks.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <LinkPerformance linkClicks={linkClicks} totalViews={totalViews} />
              </CardContent>
            </Card>
          )}

          {/* Recent Leads */}
          <Card>
            <div className="flex items-center justify-between border-b border-white/40 p-5">
              <h2 className="text-base font-bold text-[#2E1065]">Recent Leads</h2>
              <button
                onClick={() => navigate("/dashboard/connections")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:text-[#F97316]/80 transition-colors"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-white/30">
                {exchanges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Users className="h-8 w-8 text-gray-200" />
                    <p className="text-sm font-medium text-gray-400">No connections yet</p>
                    <p className="text-xs text-gray-300">Share your card to start collecting leads</p>
                  </div>
                ) : (
                  exchanges.slice(0, 3).map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/40 gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(ex.visitorName)}&background=EDE9FE&color=2E1065`}
                          alt={ex.visitorName}
                          className="h-10 w-10 rounded-2xl border-2 border-white object-cover shadow-sm shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#2E1065] truncate text-sm">{ex.visitorName}</h4>
                          <p className="text-xs font-medium text-gray-500 truncate">
                            {ex.visitorCompany || ex.visitorEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ex.engagementScore > 0 && (
                          <span
                            className={`text-[10px] font-black rounded-full px-1.5 py-0.5 ${
                              ex.engagementScore >= 60
                                ? "bg-green-100 text-green-700"
                                : ex.engagementScore >= 30
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {ex.engagementScore}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-gray-400 bg-white/60 px-2 py-1 rounded-full">
                          {ex.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right col — 2/5: Live Preview */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-gray-100 bg-gray-50/50 shadow-inner">
            <div className="flex items-center justify-between border-b border-gray-200/50 bg-white/50 p-4 backdrop-blur-md">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Live Preview</h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 ring-4 ring-green-100" />
                <span className="text-xs font-bold text-gray-500">Online</span>
              </div>
            </div>

            {/* Phone frame */}
            <div className="relative mx-auto my-6 h-[520px] sm:h-[580px] lg:h-[640px] w-full max-w-[260px] lg:max-w-[300px] overflow-hidden rounded-[2rem] border-[6px] border-white bg-white shadow-2xl ring-1 ring-gray-200">
              <div className="absolute left-1/2 top-0 z-50 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-white" />

              {/* Scrollable profile content */}
              <div className="h-full w-full overflow-y-auto bg-gradient-to-tr from-[#FFF7EE] via-[#FFEDD5] to-[#EDE9FE] scrollbar-hide">

                {/* Company header bar — matches the real sticky header */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 z-20">
                  <img src={mcgLogoColour} alt="MCG" className="h-5 w-auto" />
                  <QrCode className="h-4 w-4 text-[#2E1065] opacity-60" />
                </div>

                <div className="px-2 pt-2 pb-6 space-y-2">
                  {/* Flippable business card */}
                  <FlippableCard profile={currentEmployee} />

                  {/* Profile Hero Card */}
                  <div className="bg-white/70 backdrop-blur-2xl rounded-[1.25rem] border border-white/60 shadow-[0_8px_32px_rgba(46,16,101,0.08)] overflow-hidden">

                    {/* Cover banner */}
                    <div className="relative h-14 w-full overflow-hidden rounded-t-[1.25rem]">
                      {currentEmployee.cover ? (
                        <img src={currentEmployee.cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#2E1065] via-[#4c1d95] to-[#7c3aed]">
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #F97316 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B5CF6 0%, transparent 40%)" }} />
                        </div>
                      )}
                    </div>

                    {/* Avatar + Identity */}
                    <div className="flex flex-col items-center px-4 pb-4">
                      {/* Avatar overlapping cover */}
                      <div className="relative -mt-7 mb-2">
                        <div className="h-14 w-14 rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-gradient-to-br from-[#2E1065] to-[#7c3aed] flex items-center justify-center">
                          {currentEmployee.avatar ? (
                            <img src={currentEmployee.avatar} alt={currentEmployee.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-black text-white select-none">
                              {currentEmployee.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-black text-[#2E1065] text-center leading-tight">{currentEmployee.name}</h3>
                      {currentEmployee.title && (
                        <p className="text-[10px] font-bold text-[#F97316] mt-0.5 text-center">{currentEmployee.title}</p>
                      )}
                      {currentEmployee.department && (
                        <p className="text-[8px] font-semibold text-gray-400 mt-0.5 flex items-center gap-0.5">
                          <Building className="h-2.5 w-2.5" />{currentEmployee.department}
                        </p>
                      )}
                      {currentEmployee.bio && (
                        <p className="mt-2 text-[8px] leading-relaxed text-[#2E1065]/60 text-center line-clamp-2 max-w-[200px]">
                          {currentEmployee.bio}
                        </p>
                      )}

                      {/* Action buttons — match real profile exactly */}
                      <div className="mt-3 flex flex-col gap-1.5 w-full">
                        <button
                          onClick={() => {
                            generateVCard({
                              name: currentEmployee.name,
                              title: currentEmployee.title,
                              email: currentEmployee.email,
                              phone: currentEmployee.phone,
                              department: currentEmployee.department,
                              office: currentEmployee.office,
                              bio: currentEmployee.bio,
                              links: currentEmployee.links,
                            });
                            toast.success("Contact card downloaded!");
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-gradient-to-br from-[#2E1065] to-[#4c1d95] text-white text-[10px] font-bold shadow-[0_4px_14px_rgba(46,16,101,0.25)]"
                        >
                          <Download className="h-3 w-3" /> Save Contact
                        </button>
                        <div className="flex gap-1.5">
                          <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-white/90 border border-gray-200/60 text-[#2E1065] text-[10px] font-bold shadow-sm">
                            <Users className="h-3 w-3" /> Exchange
                          </div>
                          <div className="flex h-9 w-9 aspect-square items-center justify-center rounded-full bg-white/90 border border-gray-200/60 text-[#2E1065] shadow-sm">
                            <Share2 className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick contact icons — Email / Call / Office */}
                    <div className="flex justify-around border-y border-gray-100/80 py-3 px-4">
                      {[
                        { Icon: Mail,   label: "Email",  color: "text-[#F97316]"  },
                        { Icon: Phone,  label: "Call",   color: "text-[#8B5CF6]"  },
                        { Icon: MapPin, label: "Office", color: "text-[#2E1065]"  },
                      ].map(({ Icon, label, color }) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 ${color} shadow-sm border border-white/60`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[7px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Links — match real profile tile style */}
                    {currentEmployee.links.length > 0 && (
                      <div className="px-3 py-3 space-y-1.5">
                        <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 px-1 mb-2">Links</p>
                        {currentEmployee.links.map((link) => {
                          const platform = (link.type || "default").toLowerCase();
                          const color = PLATFORM_COLORS[platform] || PLATFORM_COLORS.default;
                          const initMap: Record<string, string> = {
                            linkedin: "in", twitter: "X", x: "X", instagram: "ig",
                            github: "gh", youtube: "yt", facebook: "fb", tiktok: "tt",
                          };
                          const initial = initMap[platform] ?? link.title.charAt(0).toUpperCase();
                          return (
                            <div key={link.id} className="flex items-center justify-between rounded-xl bg-white/80 backdrop-blur-xl px-3 py-2 border border-white/60">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-[8px] font-black shadow-sm"
                                  style={{ backgroundColor: color }}
                                >
                                  {initial}
                                </div>
                                <p className="text-[10px] font-bold text-[#2E1065] truncate">{link.title}</p>
                              </div>
                              <ChevronRight className="h-3 w-3 text-gray-300 shrink-0 ml-1" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowQrModal(false)}
              className="fixed inset-0 z-[60] bg-[#2E1065]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-white/95 backdrop-blur-2xl p-8 shadow-2xl border border-white/60"
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-[#2E1065]">Your QR Code</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">Share or download for print</p>
              </div>
              <div className="aspect-square w-48 mx-auto bg-white rounded-[1.5rem] border border-gray-100 flex items-center justify-center mb-6 shadow-lg shadow-[#2E1065]/5">
                <QRCodeSVG value={qrProfileUrl} size={140} level="Q" includeMargin={false} fgColor="#2E1065" />
              </div>
              <p className="text-xs text-center text-gray-400 mb-6 font-medium">{baseProfileUrl}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 rounded-xl text-[#2E1065]" onClick={handleCopyLink}>
                  {linkCopied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  className="h-12 rounded-xl bg-[#2E1065] hover:bg-[#2E1065]/90 text-white"
                  onClick={() => {
                    toast.success("QR Code downloaded!");
                    setShowQrModal(false);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
