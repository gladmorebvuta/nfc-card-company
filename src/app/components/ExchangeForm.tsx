import * as React from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { createNotification } from "../services/notificationService";
import { incrementProfileStat } from "../services/analyticsService";

interface ExchangeFormProps {
  profileId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Firebase UID of the profile owner — used for notification + useExchanges query */
  profileUid?: string;
  /** Firestore document ID of the nfc_profiles doc — used for stat increments */
  profileDocId?: string;
}

export function ExchangeForm({ profileId, profileName, open, onOpenChange, profileUid, profileDocId }: ExchangeFormProps) {
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
      const source = new URLSearchParams(window.location.search).get("src") || "direct";

      const docRef = await addDoc(collection(db, "nfc_exchanges"), {
        profileId,
        profileUid: profileUid || null,
        visitorName: form.visitorName,
        visitorEmail: form.visitorEmail,
        visitorPhone: form.visitorPhone || null,
        visitorCompany: form.visitorCompany || null,
        visitorNote: form.visitorNote || null,
        source,
        isRead: false,
        isArchived: false,
        createdAt: Timestamp.now(),
      });

      toast.success("Contact exchanged!");
      onOpenChange(false);

      if (profileUid) {
        createNotification({
          uid: profileUid,
          type: "exchange",
          title: "New contact exchange",
          body: `${form.visitorName}${form.visitorCompany ? ` from ${form.visitorCompany}` : ""} exchanged contact info with you.`,
          link: "/dashboard/connections",
          meta: { exchangeId: docRef.id },
        });
      }

      if (profileDocId) {
        incrementProfileStat(profileDocId, "totalExchanges");
      }

      setForm({ visitorName: "", visitorEmail: "", visitorPhone: "", visitorCompany: "", visitorNote: "" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save exchange. Please try again.");
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
