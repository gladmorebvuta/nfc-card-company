import * as React from "react";
import { motion } from "motion/react";

import frontImage from "../../assets/MCG Business Card v.1.1 Front (Digital)-01.svg";
import backCardUrl from "../../assets/MCG Business Card v.1.1 Back (Digital)-02.svg";

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
    <div className="w-full aspect-[252/144] rounded-2xl overflow-hidden relative select-none bg-white"
      style={backfaceHidden}
    >
      <img
        src={frontImage}
        alt="MCG Business Card Front"
        className="absolute top-0 left-0 w-full h-auto"
      />
      {/* Subtle glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
    </div>
  );
}

/* ── BACK of the card ── */
function CardBack({ profile }: { profile: CardProfile }) {
  const website = profile.links?.find(l => l.type === 'website')?.url.replace(/^https?:\/\//, '') || 'middlesexcg.com';
  const officeLines = profile.office ? profile.office.split('-').map(s => s.trim()) : [];

  return (
    <div className="w-full aspect-[252/144] rounded-2xl overflow-hidden relative select-none bg-white"
      style={{ ...backfaceHidden, transform: "rotateY(180deg)", WebkitTransform: "rotateY(180deg)" }}
    >
      {/* Background SVG Base */}
      <img
        src={backCardUrl}
        alt="MCG Business Card Back"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* ── Exact SVG Overlay for Pixel-Perfect Layout ── */}
      <svg
        viewBox="0 0 252 144"
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Name & Title */}
        <text x="9.2" y="67" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="16.8" letterSpacing="0.01em">
          {profile.name}
        </text>
        <text x="10.2" y="75.2" fill="#7562AB" fontFamily="Qugan, sans-serif" fontSize="5.2">
          {profile.title}
        </text>

        {/* Contact Info */}
        <g>
          {/* Phone */}
          <path fill="#7562AB" d="M13.4,117.6s0,0,0,0c0,0,0,0,0,0,0-.4-.2-.8-.6-1.1-.3-.3-.7-.5-1.1-.6,0,0,0,0,0,0,0,0,0,0,0,0s0,0,0,0c0,0,0,0,0,0,.5,0,1,.3,1.3.6.4.4.6.8.6,1.3,0,0,0,0,0,0,0,0,0,0,0,0ZM12.3,117.6s0,0,0,0c0,0,0,0,0,0,0-.2-.1-.3-.2-.4-.1-.1-.3-.2-.4-.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.2,0,.4.2.6.3.2.2.3.3.3.6,0,0,0,0,0,0,0,0,0,0,0,0ZM13.2,119.9c-.4,0-.9-.1-1.3-.3-.5-.2-.9-.5-1.3-.9-.4-.4-.7-.8-.9-1.3-.2-.5-.3-.9-.3-1.3s0-.1,0-.2c0,0,.1,0,.2,0h.6c0,0,.1,0,.2,0,0,0,0,.1.1.2v.6c.1,0,.1.1.1.2,0,0,0,.1,0,.1l-.6.5c.1.2.2.4.4.6.1.2.3.3.4.5.2.2.3.3.5.4.2.1.4.3.6.4l.6-.6s0,0,.1,0c0,0,.1,0,.2,0h.5c0,.1.1.2.2.2,0,0,0,.1,0,.2v.6c0,0,0,.1,0,.2,0,0-.1,0-.2,0ZM9.9,117.2l.5-.5s0,0,0,0c0,0,0,0,0,0v-.6c-.1,0-.1,0-.2,0,0,0,0,0,0,0h-.5s0,0,0,0c0,0,0,0,0,0,0,.2,0,.4,0,.6,0,.2.1.4.2.6ZM12.1,119.4c.2,0,.4.2.6.2.2,0,.4,0,.5,0,0,0,0,0,0,0,0,0,0,0,0,0v-.5s0,0,0,0c0,0,0,0,0,0h-.5c0-.1,0-.1,0-.1,0,0,0,0,0,0l-.5.5Z"/>
          <text x="18.5" y="118.9" fill="#2E2664" fontFamily="Rinter, Qugan, sans-serif" fontSize="4.6">{profile.phone}</text>

          {/* Email */}
          <g stroke="#7562AB" strokeWidth="0.2" strokeMiterlimit="10" fill="none">
            <path d="M9.2,123.5l2,1.6c.2.1.4.1.6,0l2-1.6"/>
            <path d="M13.7,125.9v-2.6c0-.1,0-.2-.2-.2h-4.1c-.1,0-.2,0-.2.2v2.9c0,.1,0,.2.2.2h4.3"/>
          </g>
          <text x="18.5" y="125.8" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="4.6">{profile.email}</text>

          {/* Website */}
          <g stroke="#7562AB" strokeWidth="0.2" strokeMiterlimit="10" fill="none">
            <ellipse cx="11.4" cy="131.4" rx="1" ry="2.5"/>
            <line x1="9.1" y1="130.6" x2="13.7" y2="130.6"/>
            <line x1="13" y1="132.3" x2="9.1" y2="132.3"/>
            <circle cx="11.4" cy="131.4" r="2.5"/>
          </g>
          <text x="18.5" y="132.8" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="4.6">{website}</text>

          {/* Address */}
          <g stroke="#7562AB" strokeWidth="0.2" strokeMiterlimit="10" fill="none">
            <path d="M177.2,120.2s-2-2-2-3.5.9-2,2-2,2,.9,2,2-.9,2.2-1.5,2.9"/>
            <circle cx="177.2" cy="116.7" r=".9"/>
          </g>
          <text x="183.7" y="118.8" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="4.6">{officeLines[0] || profile.office || '203 Lowell Street'}</text>
          {officeLines.length > 1 ? (
            <text x="183.7" y="125.8" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="4.6">{officeLines[1]}</text>
          ) : (
            <text x="183.7" y="125.8" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="4.6">USA</text>
          )}
          {officeLines.length > 2 && (
             <text x="183.7" y="132.8" fill="#2E2664" fontFamily="Qugan, sans-serif" fontSize="4.6">{officeLines[2]}</text>
          )}
        </g>
      </svg>

      {/* Subtle glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10 pointer-events-none" />
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
          className="relative w-full rounded-2xl shadow-[0_20px_50px_rgba(46,16,101,0.25)]"
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
          className="text-center text-[10px] tracking-[0.2em] uppercase text-[#2E1065]/40 mt-3 select-none"
        >
          Tap to flip
        </motion.p>
      </motion.div>
    </div>
  );
}
