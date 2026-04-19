import * as React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Briefcase, Phone, Globe, ArrowRight, ArrowLeft, Check, Sparkles,
  Mail, MapPin, Link2,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";
import { cn } from "../utils";
import mcgLogoColour from "../../assets/MCG Logo Colour.svg";

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "website", label: "Website" },
  { value: "twitter", label: "X / Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "github", label: "GitHub" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "other", label: "Other" },
];

const TOTAL_STEPS = 4;

const STEPS = [
  { icon: User,     title: "About you",    subtitle: "This appears on your public card" },
  { icon: Phone,    title: "Contact info", subtitle: "How people can reach you" },
  { icon: Briefcase,title: "Your bio",     subtitle: "A short intro that appears on your card" },
  { icon: Link2,    title: "Add a link",   subtitle: "Your first link card — add more later" },
];

export function Onboarding() {
  const { user } = useAuth();
  const { nfcProfile } = useProfile();
  const navigate = useNavigate();

  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [direction, setDirection] = React.useState<1 | -1>(1);

  // Step 0 — About
  const [displayName, setDisplayName] = React.useState(nfcProfile?.displayName || "");
  const [jobTitle, setJobTitle]       = React.useState(nfcProfile?.jobTitle || "");
  const [company, setCompany]         = React.useState(nfcProfile?.company || "");
  const [department, setDepartment]   = React.useState(nfcProfile?.department || "");

  // Step 1 — Contact
  const [phone, setPhone]           = React.useState(nfcProfile?.phone || "");
  const [emailPublic, setEmailPublic] = React.useState(nfcProfile?.emailPublic || "");
  const [office, setOffice]         = React.useState(nfcProfile?.office || "");

  // Step 2 — Bio
  const [bio, setBio] = React.useState(nfcProfile?.bio || "");

  // Step 3 — Link
  const [linkPlatform, setLinkPlatform] = React.useState("linkedin");
  const [linkUrl, setLinkUrl]           = React.useState("");
  const [linkLabel, setLinkLabel]       = React.useState("LinkedIn");

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  async function finish(skipLink = false) {
    if (!user) return;
    setSaving(true);

    const updates: Record<string, any> = { onboarded: true };

    if (displayName.trim()) {
      const parts = displayName.trim().split(/\s+/);
      updates.displayName = displayName.trim();
      updates.firstName   = parts[0] || "";
      updates.lastName    = parts.slice(1).join(" ") || "";
    }
    if (jobTitle.trim())    updates.jobTitle   = jobTitle.trim();
    if (company.trim())     updates.company    = company.trim();
    if (department.trim())  updates.department = department.trim();
    if (phone.trim())       updates.phone      = phone.trim();
    if (emailPublic.trim()) updates.emailPublic = emailPublic.trim();
    if (office.trim())      updates.office     = office.trim();
    if (bio.trim())         updates.bio        = bio.trim();

    if (!skipLink && linkUrl.trim()) {
      const newLink = {
        id:        `link-${Date.now()}`,
        platform:  linkPlatform,
        url:       linkUrl.trim(),
        label:     linkLabel.trim() || PLATFORM_OPTIONS.find((p) => p.value === linkPlatform)?.label || linkPlatform,
        sortOrder: 0,
      };
      updates.links = [...(nfcProfile?.links || []), newLink];
    }

    try {
      await updateDoc(doc(db, "nfc_profiles", user.uid), updates);
      navigate("/dashboard", { replace: true });
    } finally {
      setSaving(false);
    }
  }

  const stepVariants = {
    enter:  (d: number) => ({ x: d * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d * -60, opacity: 0 }),
  };

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF7EE] via-[#FFEDD5] to-[#EDE9FE] flex flex-col">

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[60vw] max-w-[500px] h-[60vw] max-h-[500px] rounded-full bg-white opacity-40 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[50vw] max-w-[400px] h-[50vw] max-h-[400px] rounded-full bg-white opacity-50 blur-[100px]" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <img src={mcgLogoColour} alt="MCG" className="h-7 w-auto" />
        <span className="text-xs font-semibold text-gray-400 bg-white/60 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/60">
          Step {step + 1} of {TOTAL_STEPS}
        </span>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i < step  ? "bg-[#F97316]" : "",
                  i === step ? "bg-[#F97316]" : "",
                  i > step  ? "bg-white/60" : "",
                  i === step ? "flex-[2]" : "flex-1"
                )}
              />
            ))}
          </div>

          {/* Step header */}
          <motion.div
            key={`header-${step}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#FB923C] shadow-lg shadow-[#F97316]/30">
                <StepIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#F97316] uppercase tracking-widest">Step {step + 1}</p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#2E1065] leading-tight">{currentStep.title}</h1>
              </div>
            </div>
            <p className="text-sm text-gray-500 ml-[52px]">{currentStep.subtitle}</p>
          </motion.div>

          {/* Step fields */}
          <div className="relative" style={{ minHeight: 240 }}>
            <AnimatePresence custom={direction} mode="wait">

              {step === 0 && (
                <motion.div key="s0" custom={direction} variants={stepVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="absolute inset-0 space-y-4"
                >
                  <Field label="Full name *" value={displayName} onChange={setDisplayName} placeholder="Jane Smith" autoFocus />
                  <Field label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="Senior Designer" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Company" value={company} onChange={setCompany} placeholder="Acme Inc." />
                    <Field label="Department" value={department} onChange={setDepartment} placeholder="Design" />
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="s1" custom={direction} variants={stepVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="absolute inset-0 space-y-4"
                >
                  <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555 000 0000" type="tel" icon={<Phone className="h-4 w-4 text-gray-400" />} autoFocus />
                  <Field label="Email (public)" value={emailPublic} onChange={setEmailPublic} placeholder="jane@company.com" type="email" icon={<Mail className="h-4 w-4 text-gray-400" />} />
                  <Field label="Office / Location" value={office} onChange={setOffice} placeholder="New York, NY" icon={<MapPin className="h-4 w-4 text-gray-400" />} />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" custom={direction} variants={stepVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="I help companies build great digital products..."
                    maxLength={300}
                    rows={6}
                    autoFocus
                    className="w-full resize-none rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md px-5 py-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#F97316]/50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all shadow-sm"
                  />
                  <p className="text-right text-xs text-gray-400 mt-2">{bio.length} / 300</p>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" custom={direction} variants={stepVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="absolute inset-0 space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase tracking-wider">Platform</label>
                    <select
                      value={linkPlatform}
                      onChange={(e) => {
                        setLinkPlatform(e.target.value);
                        const opt = PLATFORM_OPTIONS.find((p) => p.value === e.target.value);
                        if (opt) setLinkLabel(opt.label);
                      }}
                      className="w-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md px-5 py-3 text-sm text-gray-800 focus:border-[#F97316]/50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all shadow-sm"
                    >
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <Field label="URL" value={linkUrl} onChange={setLinkUrl} placeholder="https://linkedin.com/in/janesmith" icon={<Globe className="h-4 w-4 text-gray-400" />} autoFocus />
                  <Field label="Button label" value={linkLabel} onChange={setLinkLabel} placeholder="My LinkedIn" />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="mt-10 flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md text-gray-500 shadow-sm hover:bg-white transition-all active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={goNext}
                disabled={step === 0 && !displayName.trim()}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 h-14 rounded-2xl font-bold text-base transition-all",
                  step === 0 && !displayName.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white shadow-xl shadow-[#F97316]/30 hover:shadow-2xl hover:shadow-[#F97316]/40 active:scale-95"
                )}
              >
                Continue <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex flex-1 flex-col gap-3">
                <button
                  onClick={() => finish(false)}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white font-bold text-base shadow-xl shadow-[#F97316]/30 hover:shadow-2xl active:scale-95 transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <><Check className="h-5 w-5" /> Finish & go to dashboard</>
                  )}
                </button>
                <button
                  onClick={() => finish(true)}
                  disabled={saving}
                  className="w-full h-10 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip this step
                </button>
              </div>
            )}
          </div>

          {/* Welcome note on first step */}
          {step === 0 && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-6 text-center text-xs text-gray-400"
            >
              Takes about 2 minutes · You can edit everything later
            </motion.p>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Shared field component ────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text", icon, autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "w-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#F97316]/50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all shadow-sm",
            icon ? "pl-11 pr-5" : "px-5"
          )}
        />
      </div>
    </div>
  );
}
