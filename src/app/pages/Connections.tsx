import * as React from "react"
import { motion } from "motion/react"
import { Download, Search, X, Mail, MapPin, Star, FileText, Wifi, QrCode, Link2, Globe } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { Card, CardContent } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { toast } from "sonner"
import { generateLeadVCard, exportLeadsCSV } from "../utils/vcard"
import { useExchanges } from "../hooks/useExchanges"

type FollowUpStatus = "new" | "contacted" | "meeting" | "converted" | "not_interested";
type SortKey = "date" | "score" | "followUp";

const STATUS_CONFIG: Record<FollowUpStatus, { label: string; color: string; bg: string }> = {
  new:            { label: "New",           color: "text-violet-700", bg: "bg-violet-100" },
  contacted:      { label: "Contacted",     color: "text-blue-700",   bg: "bg-blue-100"   },
  meeting:        { label: "Meeting",       color: "text-amber-700",  bg: "bg-amber-100"  },
  converted:      { label: "Converted",     color: "text-green-700",  bg: "bg-green-100"  },
  not_interested: { label: "Not Interested",color: "text-gray-500",   bg: "bg-gray-100"   },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  nfc:    { label: "NFC",    color: "text-violet-700", bg: "bg-violet-100", Icon: Wifi   },
  qr:     { label: "QR",     color: "text-blue-700",   bg: "bg-blue-100",   Icon: QrCode },
  link:   { label: "Link",   color: "text-teal-700",   bg: "bg-teal-100",   Icon: Link2  },
  direct: { label: "Direct", color: "text-gray-500",   bg: "bg-gray-100",   Icon: Globe  },
};

const STATUS_FILTERS: Array<{ key: FollowUpStatus | "all"; label: string }> = [
  { key: "all",           label: "All"           },
  { key: "new",           label: "New"           },
  { key: "contacted",     label: "Contacted"     },
  { key: "meeting",       label: "Meeting"       },
  { key: "converted",     label: "Converted"     },
  { key: "not_interested",label: "Not Interested"},
];

function ScoreBadge({ score }: { score: number }) {
  if (!score) return <span className="text-gray-300 text-xs font-medium">—</span>;
  const cls =
    score >= 60 ? "bg-green-100 text-green-700" :
    score >= 30 ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>
      {score}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.direct;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatDateInput(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value && typeof (value as any).toDate === "function") {
    return (value as any).toDate().toISOString().slice(0, 10);
  }
  return "";
}

function isOverdue(value: unknown): boolean {
  const d = formatDateInput(value);
  if (!d) return false;
  return d < new Date().toISOString().slice(0, 10);
}

const PAGE_SIZE = 20;

export function Connections() {
  const { exchanges, loading: exchangesLoading } = useExchanges();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FollowUpStatus | "all">("all");
  const [sortBy, setSortBy] = React.useState<SortKey>("date");
  const [highPriorityOnly, setHighPriorityOnly] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [expandedNotes, setExpandedNotes] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  const filtered = React.useMemo(() => {
    let list = exchanges;

    if (highPriorityOnly) list = list.filter(e => (e.engagementScore ?? 0) >= 60);
    if (statusFilter !== "all") list = list.filter(e => (e.followUpStatus ?? "new") === statusFilter);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.visitorName.toLowerCase().includes(q) ||
        (e.visitorEmail || "").toLowerCase().includes(q) ||
        (e.visitorCompany || "").toLowerCase().includes(q)
      );
    }

    if (sortBy === "score") {
      return [...list].sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0));
    }
    if (sortBy === "followUp") {
      return [...list].sort((a, b) => {
        const da = formatDateInput(a.followUpDate) || "9999-99-99";
        const db_ = formatDateInput(b.followUpDate) || "9999-99-99";
        return da < db_ ? -1 : da > db_ ? 1 : 0;
      });
    }
    // "date" — already ordered desc from Firestore listener
    return list;
  }, [exchanges, search, statusFilter, sortBy, highPriorityOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleStatusChange(id: string, status: FollowUpStatus) {
    try {
      await updateDoc(doc(db, "nfc_exchanges", id), { followUpStatus: status });
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleFollowUpDateChange(id: string, date: string) {
    try {
      await updateDoc(doc(db, "nfc_exchanges", id), { followUpDate: date || null });
    } catch {
      toast.error("Failed to update follow-up date");
    }
  }

  async function handleNoteSave(id: string) {
    try {
      await updateDoc(doc(db, "nfc_exchanges", id), { employeeNotes: noteDraft });
      setExpandedNotes(null);
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-6 min-w-0"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2E1065]">Connections</h1>
          <p className="text-sm text-gray-500 font-medium">
            Lead pipeline — {exchanges.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setHighPriorityOnly(!highPriorityOnly); setPage(0); }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
              highPriorityOnly
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : "bg-white/50 border-white text-gray-500 hover:text-amber-600 shadow-sm"
            }`}
          >
            <Star className="h-3.5 w-3.5" /> High Priority
          </button>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value as SortKey); setPage(0); }}
            className="rounded-xl border border-white bg-white/50 px-3 py-1.5 text-sm font-semibold text-[#2E1065] shadow-sm focus:outline-none"
          >
            <option value="date">Sort: Latest</option>
            <option value="score">Sort: Score ↓</option>
            <option value="followUp">Sort: Follow-up ↑</option>
          </select>
          <Button
            className="gap-2 shadow-lg shadow-[#F97316]/20 bg-[#2E1065] hover:bg-[#2E1065]/90 text-white rounded-xl"
            onClick={() => {
              exportLeadsCSV(
                filtered.map(e => ({
                  name: e.visitorName,
                  email: e.visitorEmail,
                  company: e.visitorCompany || "",
                  phone: e.visitorPhone || "",
                  note: e.visitorNote || "",
                  score: e.engagementScore ?? 0,
                  source: e.source,
                  status: e.followUpStatus ?? "new",
                  location: e.location
                    ? [e.location.city, e.location.country].filter(Boolean).join(", ")
                    : "",
                  date: e.createdAt?.toDate?.()?.toLocaleDateString() || "",
                }))
              );
              toast.success("CSV exported!");
            }}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(({ key, label }) => {
          const count =
            key === "all"
              ? exchanges.length
              : exchanges.filter(e => (e.followUpStatus ?? "new") === key).length;
          const active = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(0); }}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                active
                  ? "bg-[#2E1065] text-white"
                  : "bg-white/60 text-gray-500 hover:text-[#2E1065] border border-white/60"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? "bg-white/20" : "bg-gray-100"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-white/40 p-4 sm:p-6">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/60 bg-white/40 px-4 py-2 shadow-sm focus-within:bg-white focus-within:border-[#F97316]/50 transition-all">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by name, email, or company…"
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 font-medium"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(0); }}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/30 text-xs font-bold uppercase text-gray-500 border-b border-white/40">
                <tr>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Score</th>
                  <th className="px-4 py-3 hidden md:table-cell">Source</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                  <th className="px-4 py-3 hidden md:table-cell">Follow-up</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {exchangesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Loading connections…
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                      {search || statusFilter !== "all" || highPriorityOnly
                        ? "No connections match your filters."
                        : "No connections yet — share your card to start collecting leads."}
                    </td>
                  </tr>
                ) : paginated.map(e => {
                  const statusCfg = STATUS_CONFIG[e.followUpStatus as FollowUpStatus] ?? STATUS_CONFIG.new;
                  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(e.visitorName)}&background=EDE9FE&color=2E1065`;
                  const dateStr = e.createdAt?.toDate?.()?.toLocaleDateString() || "";
                  const overdue = isOverdue(e.followUpDate);
                  const notesOpen = expandedNotes === e.id;

                  return (
                    <React.Fragment key={e.id}>
                      <tr className="group hover:bg-white/60 transition-colors">
                        {/* Contact */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatar}
                              alt={e.visitorName}
                              className="h-9 w-9 rounded-xl border-2 border-white shadow-sm shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-[#2E1065] truncate">{e.visitorName}</div>
                              <div className="text-xs text-gray-400 truncate">
                                {e.visitorCompany || e.visitorEmail}
                              </div>
                              <div className="text-[10px] text-gray-300 mt-0.5 sm:hidden">{dateStr}</div>
                            </div>
                          </div>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <ScoreBadge score={e.engagementScore ?? 0} />
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <SourceBadge source={e.source} />
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 font-medium">
                          {e.location?.city || e.location?.country ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {[e.location.city, e.location.country].filter(Boolean).join(", ")}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Follow-up date */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <input
                            type="date"
                            defaultValue={formatDateInput(e.followUpDate)}
                            onChange={ev => handleFollowUpDateChange(e.id, ev.target.value)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#F97316] ${
                              overdue
                                ? "border-red-300 text-red-600 bg-red-50"
                                : "border-gray-200 text-gray-600 bg-white/60"
                            }`}
                          />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <select
                            value={e.followUpStatus ?? "new"}
                            onChange={ev => handleStatusChange(e.id, ev.target.value as FollowUpStatus)}
                            className={`rounded-full border-0 px-2 py-1 text-xs font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#F97316] ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Notes"
                              onClick={() => {
                                if (notesOpen) {
                                  setExpandedNotes(null);
                                } else {
                                  setExpandedNotes(e.id);
                                  setNoteDraft(e.employeeNotes ?? "");
                                }
                              }}
                              className={`rounded-lg p-1.5 transition-colors ${
                                notesOpen
                                  ? "bg-[#2E1065] text-white"
                                  : "text-gray-400 hover:text-[#2E1065] hover:bg-white/60"
                              }`}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              title={`Email ${e.visitorName}`}
                              onClick={() => { window.location.href = `mailto:${e.visitorEmail}`; }}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-[#2E1065] hover:bg-white/60 transition-colors"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              title="Download vCard"
                              onClick={() => {
                                generateLeadVCard({
                                  name: e.visitorName,
                                  title: "",
                                  company: e.visitorCompany || "",
                                });
                                toast.success(`${e.visitorName}'s vCard downloaded!`);
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-[#2E1065] hover:bg-white/60 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Notes expansion row */}
                      {notesOpen && (
                        <tr>
                          <td colSpan={7} className="px-4 pb-4 pt-0 bg-white/40">
                            <div className="flex gap-2 items-start pt-2">
                              <textarea
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#F97316] resize-none"
                                rows={2}
                                placeholder="Add a private note about this lead…"
                                value={noteDraft}
                                onChange={ev => setNoteDraft(ev.target.value)}
                              />
                              <Button
                                size="sm"
                                className="bg-[#2E1065] text-white hover:bg-[#2E1065]/90 rounded-xl shrink-0"
                                onClick={() => handleNoteSave(e.id)}
                              >
                                Save
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 border-t border-white/40 p-4 text-xs font-medium text-gray-500 bg-white/20">
            <span>
              Showing{" "}
              <strong className="text-[#2E1065]">
                {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}
              </strong>
              –
              <strong className="text-[#2E1065]">
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)}
              </strong>{" "}
              of <strong className="text-[#2E1065]">{filtered.length}</strong>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-white/40 border-white/60 text-gray-400"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-white border-white text-[#2E1065] shadow-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
