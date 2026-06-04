import * as React from "react";
import { motion } from "motion/react";
import { Phone, Mail, Globe, MapPin, Radio } from "lucide-react";

interface CardProfile {
  name: string;
  title: string;
  phone: string;
  email: string;
  office: string;
  links: Array<{ type: string; url: string }>;
}

const backfaceHidden: React.CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/* ── FRONT of the card ── */
function CardFront({ profile }: { profile: CardProfile }) {
  return (
    <div
      className="w-full aspect-[252/144] rounded-2xl overflow-hidden relative select-none bg-gradient-to-br from-[#030213] via-[#030213] to-[#020817] border border-white/10"
      style={backfaceHidden}
    >
      {/* Premium subtle glow accent — low opacity blue→cyan→purple mesh in corner */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-purple-500/20 rounded-full blur-3xl pointer-events-none opacity-70" />

      {/* Brandapt logo — top left */}
      <div className="absolute top-4 left-4 flex items-center">
        <img
          src="/logo-light.png"
          alt="Brandapt"
          className="h-2.5 object-contain"
        />
      </div>

      {/* Faint top inner sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

      {/* Content — identity focal point */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        {/* Holder's name and title — lower left focal point */}
        <div className="relative z-10">
          <h2 className="text-white font-medium text-base leading-tight font-mono mb-0.5">
            {profile.name}
          </h2>
          <p className="text-white/55 text-[10px] uppercase tracking-wide font-mono">
            {profile.title}
          </p>
        </div>
      </div>

      {/* NFC tap affordance — bottom right */}
      <div className="absolute bottom-4 right-4">
        <Radio className="h-3.5 w-3.5 text-white/30" />
      </div>
    </div>
  );
}

/* ── BACK of the card ── */
function CardBack({ profile }: { profile: CardProfile }) {
  // Extract website URL, strip protocol, no fallback — only render if present
  const website = profile.links
    ?.find((l) => l.type === "website")
    ?.url.replace(/^https?:\/\//, "");

  return (
    <div
      className="w-full aspect-[252/144] rounded-2xl overflow-hidden relative select-none bg-gradient-to-br from-[#030213] via-[#030213] to-[#020817] border border-white/10 flex flex-col p-4 font-mono"
      style={{
        ...backfaceHidden,
        transform: "rotateY(180deg)",
        WebkitTransform: "rotateY(180deg)",
      }}
    >
      {/* Premium subtle glow accent — consistent with front */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-purple-500/20 rounded-full blur-3xl pointer-events-none opacity-70" />

      {/* Faint top inner sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* "CONTACT" header */}
        <div className="mb-3">
          <p className="text-white/40 text-[8px] uppercase tracking-widest font-mono">
            CONTACT
          </p>
        </div>

        {/* Contact info rows — clean, airy, premium */}
        <div className="flex flex-col gap-2.5 flex-grow justify-start">
          {/* Phone */}
          {profile.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="text-white/85 text-xs font-mono truncate">
                {profile.phone}
              </span>
            </div>
          )}

          {/* Email */}
          {profile.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="text-white/85 text-xs font-mono truncate">
                {profile.email}
              </span>
            </div>
          )}

          {/* Website */}
          {website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="text-white/85 text-xs font-mono truncate">{website}</span>
            </div>
          )}

          {/* Office/Address */}
          {profile.office && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/85 text-xs font-mono line-clamp-2">
                {profile.office}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Flippable Card ── */
export function FlippableCard({ profile }: { profile: CardProfile }) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  return (
    <div className="w-full px-0 sm:px-2 mb-6 sm:mb-8">
      {/* Entrance animation wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full cursor-pointer"
        onClick={() => setIsFlipped((f) => !f)}
        style={{ perspective: "1200px", WebkitPerspective: "1200px" } as React.CSSProperties}
      >
        {/* 3D flip container — CSS transition is more reliable than Framer Motion for preserve-3d */}
        <div
          className="relative w-full rounded-2xl shadow-[0_24px_60px_rgba(3,2,19,0.5)]"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            WebkitTransform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          } as React.CSSProperties}
        >
          {/* Front */}
          <CardFront profile={profile} />

          {/* Back — absolutely overlays front, pre-rotated 180deg */}
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" } as React.CSSProperties}>
            <CardBack profile={profile} />
          </div>
        </div>

        {/* Tap hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2 }}
          className="text-center text-[10px] tracking-[0.2em] uppercase text-white/40 mt-3 select-none"
        >
          Tap to flip
        </motion.p>
      </motion.div>
    </div>
  );
}
