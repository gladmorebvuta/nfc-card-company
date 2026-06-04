import * as React from "react"
import { motion } from "motion/react"
import { Calendar, Plus, Copy, Zap, Eye, Users, MapPin, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { toast } from "sonner"
import { useEvents } from "../hooks/useEvents"
import { createEvent, endEvent } from "../services/eventsService"
import { useAuth } from "../contexts/AuthContext"
import { useProfile } from "../contexts/ProfileContext"
import { Seo } from "../components/seo/Seo"

export function Events() {
  const { user } = useAuth();
  const { nfcProfile } = useProfile();
  const { events, loading } = useEvents();
  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    location: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const activeEvent = events.find(e => e.isActive) ?? null;
  const pastEvents = events.filter(e => !e.isActive);

  const profileId = nfcProfile?.uniqueId ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function eventLink(eventId: string, src: "nfc" | "qr") {
    return `${origin}/c/${profileId}?src=${src}&eid=${eventId}`;
  }

  function copyLink(link: string, label: string) {
    navigator.clipboard.writeText(link);
    toast.success(`${label} link copied!`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profileId) return;
    setCreating(true);
    try {
      await createEvent({
        profileUid: user.uid,
        profileId,
        name: form.name,
        location: form.location,
        date: form.date,
      });
      setShowCreate(false);
      setForm({ name: "", location: "", date: new Date().toISOString().slice(0, 10) });
      toast.success(`"${form.name}" is now live!`);
    } catch {
      toast.error("Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  async function handleEnd(eventId: string, name: string) {
    try {
      await endEvent(eventId);
      toast.success(`"${name}" ended`);
    } catch {
      toast.error("Failed to end event");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-6 min-w-0"
    >
      <Seo title="Events" description="Manage NFC card events and live sessions." noindex />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Event Mode</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Tag every tap from a networking event — see exactly who you met and where
          </p>
        </div>
        <Button
          className="gap-2 bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg shadow-black/20"
          onClick={() => setShowCreate(true)}
          disabled={!!activeEvent}
          title={activeEvent ? "End the current event before creating a new one" : undefined}
        >
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      {/* Active Event Card */}
      {loading ? null : activeEvent ? (
        <Card className="border-2 border-blue-500/30">
          <CardContent className="p-6 space-y-5">
            {/* Event name + end button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0 mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-green-400">Live</span>
                  <h2 className="text-xl font-black text-foreground leading-tight">{activeEvent.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                    {activeEvent.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {activeEvent.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {activeEvent.date}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleEnd(activeEvent.id, activeEvent.name)}
                className="shrink-0 rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
              >
                End Event
              </button>
            </div>

            {/* Live stats */}
            <div className="flex gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-card/80 border border-border px-4 py-3 shadow-sm">
                <Eye className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-xl font-black text-foreground">{activeEvent.viewCount}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Views</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-card/80 border border-border px-4 py-3 shadow-sm">
                <Users className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-xl font-black text-foreground">{activeEvent.exchangeCount}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Exchanges</div>
                </div>
              </div>
            </div>

            {/* Shareable links */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Shareable Links — tag every tap to this event
              </p>
              {(["nfc", "qr"] as const).map(src => (
                <div
                  key={src}
                  className="flex items-center gap-3 rounded-xl bg-card/70 border border-border px-3 py-2.5 shadow-sm"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      src === "nfc"
                        ? "bg-violet-500/15 text-violet-300"
                        : "bg-blue-500/15 text-blue-300"
                    }`}
                  >
                    {src.toUpperCase()}
                  </span>
                  <code className="flex-1 truncate text-xs text-muted-foreground font-mono">
                    {eventLink(activeEvent.id, src)}
                  </code>
                  <button
                    onClick={() => copyLink(eventLink(activeEvent.id, src), src.toUpperCase())}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                    title={`Copy ${src.toUpperCase()} link`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card">
              <Zap className="h-8 w-8 text-foreground" />
            </div>
            <p className="text-base font-bold text-foreground">No active event</p>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Create an event before your next networking session to tag every tap and
              know exactly where each connection came from.
            </p>
            <Button
              className="mt-2 gap-2 bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl shadow-lg shadow-blue-500/20"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Past Events</h2>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-card/30 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Date</th>
                    <th className="px-6 py-3 hidden md:table-cell">Location</th>
                    <th className="px-6 py-3">Views</th>
                    <th className="px-6 py-3">Exchanges</th>
                    <th className="px-6 py-3 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pastEvents.map(ev => (
                    <tr key={ev.id} className="hover:bg-card/60 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          {ev.name}
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden sm:table-cell text-muted-foreground font-medium">
                        {ev.date}
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-muted-foreground font-medium">
                        {ev.location || <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-6 py-3 font-bold text-foreground">{ev.viewCount}</td>
                      <td className="px-6 py-3 font-bold text-foreground">{ev.exchangeCount}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => copyLink(eventLink(ev.id, "nfc"), "Event")}
                          title="Copy NFC link"
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <Input
              placeholder="Event name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Location (e.g. Cape Town Convention Centre)"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Event date</label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={creating} className="w-full">
              {creating ? "Creating…" : "Create & Go Live"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
