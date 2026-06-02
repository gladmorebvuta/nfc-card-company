import * as React from "react";
import { motion } from "motion/react";
import { Phone, Mail, Globe, MapPin } from "lucide-react";

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
function CardFront() {
  return (
    <div
      className="w-full aspect-[252/144] rounded-2xl overflow-hidden relative select-none bg-gradient-to-br from-[#030213] via-[#030213] to-[#020817]"
      style={backfaceHidden}
    >
      {/* Glassmorphic effect with subtle blue accent glow */}
      <div className="absolute inset-0 backdrop-blur-sm" />
      <div className="absolute top-0 right-12 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brandapt logo — top left */}
      <div className="absolute top-4 left-4 flex items-center">
        <img
          src="/logo-dark.png"
          alt="Brandapt"
          className="h-6 object-contain"
        />
      </div>

      {/* Subtle blue→purple accent stripe on the left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 opacity-60" />

      {/* Faint "B" watermark in corner */}
      <div className="absolute bottom-2 right-3 text-white/10 text-4xl font-bold font-mono">
        B
      </div>

      {/* Subtle glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
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
      className="w-full aspect-[252/144] rounded-2xl overflow-hidden relative select-none bg-gradient-to-br from-[#030213] via-[#030213] to-[#020817] flex flex-col justify-between p-3 font-mono"
      style={{
        ...backfaceHidden,
        transform: "rotateY(180deg)",
        WebkitTransform: "rotateY(180deg)",
      }}
    >
      {/* Glassmorphic effect */}
      <div className="absolute inset-0 backdrop-blur-sm pointer-events-none" />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Name & Title section */}
        <div className="flex flex-col mb-2">
          <h2 className="text-white font-medium text-sm leading-tight">
            {profile.name}
          </h2>
          <p className="text-white/60 text-xs leading-tight">
            {profile.title}
          </p>
        </div>

        {/* Contact info rows */}
        <div className="flex flex-col gap-1.5 flex-grow justify-center">
          {/* Phone */}
          {profile.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-white/80 text-xs truncate">
                {profile.phone}
              </span>
            </div>
          )}

          {/* Email */}
          {profile.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-white/80 text-xs truncate">
                {profile.email}
              </span>
            </div>
          )}

          {/* Website */}
          {website && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-white/80 text-xs truncate">{website}</span>
            </div>
          )}

          {/* Office/Address */}
          {profile.office && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/80 text-xs line-clamp-2">
                {profile.office}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Subtle glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none" />
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
          className="relative w-full rounded-2xl shadow-[0_20px_50px_rgba(3,2,19,0.35)]"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            WebkitTransform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          } as React.CSSProperties}
        >
          {/* Front */}
          <CardFront />

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
