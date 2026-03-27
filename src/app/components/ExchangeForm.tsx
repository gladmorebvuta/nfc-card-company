import * as React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { createNotification } from "../services/notificationService";

const FUNCTIONS_BASE = "https://us-central1-brandaptos-v2.cloudfunctions.net";

interface ExchangeFormProps {
  profileId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Firebase UID of the profile owner — used for client-side notification creation */
  profileUid?: string;
}

export function ExchangeForm({ profileId, profileName, open, onOpenChange, profileUid }: ExchangeFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    visitorCompany: "",
    visitorNote: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/nfcExchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          ...form,
          source: new URLSearchParams(window.location.search).get("src") || "direct_link",
        }),
      });

      const json = await res.json();

      if (json.status === "success") {
        toast.success("Contact exchanged! They'll receive your info.");
        onOpenChange(false);

        // Create in-app notification for the profile owner
        const ownerUid = profileUid || json.data?.profileUid;
        if (ownerUid) {
          createNotification({
            uid: ownerUid,
            type: "exchange",
            title: "New contact exchange",
            body: `${form.visitorName}${form.visitorCompany ? ` from ${form.visitorCompany}` : ""} exchanged contact info with you.`,
            link: "/dashboard/connections",
            meta: { exchangeId: json.data?.exchangeId ?? "" },
          });
        }

        setForm({ visitorName: "", visitorEmail: "", visitorPhone: "", visitorCompany: "", visitorNote: "" });
      } else if (json.error?.code === "RATE_LIMITED") {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error(json.error?.message || "Something went wrong");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exchange contact with {profileName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Your name *"
            value={form.visitorName}
            onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
            required
          />
          <Input
            type="email"
            placeholder="Your email *"
            value={form.visitorEmail}
            onChange={(e) => setForm((f) => ({ ...f, visitorEmail: e.target.value }))}
            required
          />
          <Input
            placeholder="Phone (optional)"
            value={form.visitorPhone}
            onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))}
          />
          <Input
            placeholder="Company (optional)"
            value={form.visitorCompany}
            onChange={(e) => setForm((f) => ({ ...f, visitorCompany: e.target.value }))}
          />
          <Textarea
            placeholder="Note — e.g. 'Met at TechCrunch Disrupt' (optional)"
            value={form.visitorNote}
            onChange={(e) => setForm((f) => ({ ...f, visitorNote: e.target.value }))}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Exchange Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
