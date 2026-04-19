import * as React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Briefcase, Phone, Globe, ArrowRight, ArrowLeft, Check, Sparkles,
  Mail, Building2, MapPin, Link2,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { NfcProfileData } from "../hooks/useNfcProfile";
import { cn } from "../utils";

interface OnboardingModalProps {
  nfcProfile: NfcProfileData;
}

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

export function OnboardingModal({ nfcProfile }: OnboardingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [direction, setDirection] = React.useState<1 | -1>(1);

  // Step 1 — About You
  const [displayName, setDisplayName] = React.useState(nfcProfile.displayName || "");
  const [jobTitle, setJobTitle] = React.useState(nfcProfile.jobTitle || "");
  const [company, setCompany] = React.useState(nfcProfile.company || "");
  const [department, setDepartment] = React.useState(nfcProfile.department || "");

  // Step 2 — Contact
  const [phone, setPhone] = React.useState(nfcProfile.phone || "");
  const [emailPublic, setEmailPublic] = React.useState(nfcProfile.emailPublic || "");
  const [office, setOffice] = React.useState(nfcProfile.office || "");

  // Step 3 — Bio
  const [bio, setBio] = React.useState(nfcProfile.bio || "");

  // Step 4 — First link
  const [linkPlatform, setLinkPlatform] = React.useState("linkedin");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkLabel, setLinkLabel] = React.useState("");

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

    const updates: Record<string, any> = {
      onboarded: true,
    };

    if (displayName.trim()) {
      const parts = displayName.trim().split(/\s+/);
      updates.displayName = displayName.trim();
      updates.firstName = parts[0] || "";
      updates.lastName = parts.slice(1).join(" ") || "";
    }
    if (jobTitle.trim()) updates.jobTitle = jobTitle.trim();
    if (company.trim()) updates.company = company.trim();
    if (department.trim()) updates.department = department.trim();
    if (phone.trim()) updates.phone = phone.trim();
    if (emailPublic.trim()) updates.emailPublic = emailPublic.trim();
    if (office.trim()) updates.office = office.trim();
    if (bio.trim()) updates.bio = bio.trim();

    if (!skipLink && linkUrl.trim()) {
      const newLink = {
        id: `link-${Date.now()}`,
        platform: linkPlatform,
        url: linkUrl.trim(),
        label: linkLabel.trim() || PLATFORM_OPTIONS.find((p) => p.value === linkPlatform)?.label || linkPlatform,
        sortOrder: 0,
      };
      updates.links = [...(nfcProfile.links || []), newLink];
    }

    try {
      await updateDoc(doc(db, "nfc_profiles", user.uid), updates);
    } finally {
      setSaving(false);
    }
  }

  const stepVariants = {
    enter: (d: number) => ({ x: d * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d * -40, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2E1065]/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md rounded-[2rem] bg-white/98 backdrop-blur-xl border border-white/60 shadow-2xl overflow-hidden"
      >
        {/* Header gradient strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#7C3AED]" />

        <div className="p-7 pb-6">
          {/* Logo + heading */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#7C3AED] shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F97316] uppercase tracking-wider">Welcome</p>
              <h2 className="text-lg font-black text-[#2E1065] leading-tight">Let's set up your card</h2>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-7">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i <= step
                    ? "bg-[#F97316]"
                    : "bg-gray-200",
                  i === step ? "w-8" : "w-4"
                )}
              />
            ))}
            <span className="ml-auto text-xs font-semibold text-gray-400">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>

          {/* Step content */}
          <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
            <AnimatePresence custom={direction} mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <StepHeader
                    icon={<User className="h-5 w-5" />}
                    title="About you"
                    subtitle="This appears on your public profile"
                  />
                  <div className="space-y-3 mt-4">
                    <Field label="Full name *" value={displayName} onChange={setDisplayName} placeholder="Jane Smith" />
                    <Field label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="Senior Designer" />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Company" value={company} onChange={setCompany} placeholder="Acme Inc." />
                      <Field label="Department" value={department} onChange={setDepartment} placeholder="Design" />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <StepHeader
                    icon={<Phone className="h-5 w-5" />}
                    title="Contact info"
                    subtitle="How people can reach you"
                  />
                  <div className="space-y-3 mt-4">
                    <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555 000 0000" type="tel" icon={<Phone className="h-4 w-4 text-gray-400" />} />
                    <Field label="Email (public)" value={emailPublic} onChange={setEmailPublic} placeholder="jane@company.com" type="email" icon={<Mail className="h-4 w-4 text-gray-400" />} />
                    <Field label="Office / Location" value={office} onChange={setOffice} placeholder="New York, NY" icon={<MapPin className="h-4 w-4 text-gray-400" />} />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <StepHeader
                    icon={<Briefcase className="h-5 w-5" />}
                    title="Your bio"
                    subtitle="A short intro that appears on your card"
                  />
                  <div className="mt-4">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="I help companies build great digital products..."
                      maxLength={300}
                      rows={5}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#F97316]/50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all"
                    />
                    <p className="text-right text-xs text-gray-400 mt-1">{bio.length}/300</p>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <StepHeader
                    icon={<Link2 className="h-5 w-5" />}
                    title="Add a link"
                    subtitle="Your first link card — you can add more later"
                  />
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Platform</label>
                      <select
                        value={linkPlatform}
                        onChange={(e) => {
                          setLinkPlatform(e.target.value);
                          const opt = PLATFORM_OPTIONS.find((p) => p.value === e.target.value);
                          if (opt && !linkLabel) setLinkLabel(opt.label);
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-[#F97316]/50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all"
                      >
                        {PLATFORM_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <Field label="URL" value={linkUrl} onChange={setLinkUrl} placeholder="https://linkedin.com/in/janesmith" icon={<Globe className="h-4 w-4 text-gray-400" />} />
                    <Field label="Label" value={linkLabel} onChange={setLinkLabel} placeholder="My LinkedIn" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer buttons */}
          <div className="mt-6 flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={goNext}
                disabled={step === 0 && !displayName.trim()}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 h-11 rounded-full font-bold text-sm transition-all",
                  step === 0 && !displayName.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white shadow-lg shadow-[#F97316]/30 hover:shadow-xl hover:shadow-[#F97316]/40 active:scale-95"
                )}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => finish(true)}
                  disabled={saving}
                  className="flex-1 h-11 rounded-full border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => finish(false)}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-full bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white font-bold text-sm shadow-lg shadow-[#F97316]/30 hover:shadow-xl active:scale-95 transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Finish
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF7EE] text-[#F97316] border border-[#F97316]/20">
        {icon}
      </div>
      <div>
        <h3 className="font-black text-[#2E1065] text-base">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#F97316]/50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all",
            icon ? "pl-9 pr-4" : "px-4"
          )}
        />
      </div>
    </div>
  );
}
