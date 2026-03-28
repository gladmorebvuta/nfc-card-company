import * as React from "react"
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react"
import { Users, Share2, Phone, Mail, MapPin, Building, QrCode, Download, ChevronRight, Check, User, AtSign, Briefcase, Building2, Copy, Link2 } from "lucide-react"
import { Button } from "../components/ui/Button"
import { useProfile } from "../contexts/ProfileContext"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { generateVCard } from "../utils/vcard"
import { createNotification } from "../services/notificationService"
import { logLinkClick, incrementProfileStat } from "../services/analyticsService"
import { FlippableCard } from "../components/FlippableCard"
import { usePublicProfile } from "../hooks/usePublicProfile"
import { ExchangeForm } from "../components/ExchangeForm"

import { QRCodeSVG } from 'qrcode.react';
import mcgLogoColour from "../../assets/MCG Logo Colour.svg";

export function PublicProfile() {
  const { uniqueId } = useParams<{ uniqueId: string }>();
  const { profile: apiProfile, ownerUid, profileDocId, source: visitSource, loading: apiLoading, error: apiError } = usePublicProfile(uniqueId);
  const { profile: localProfile } = useProfile();

  // Use API profile when viewing /c/:uniqueId, local profile when on /
  const isLiveCard = !!uniqueId;

  // Adapt API profile to match local profile shape
  const currentEmployee = React.useMemo(() => {
    if (isLiveCard && apiProfile) {
      return {
        id: uniqueId!,
        name: apiProfile.displayName,
        title: apiProfile.jobTitle || "",
        department: apiProfile.department || "",
        company: apiProfile.company || "",
        bio: apiProfile.bio || "",
        avatar: apiProfile.avatarUrl || "",
        cover: apiProfile.coverUrl || "",
        email: apiProfile.emailPublic || "",
        phone: apiProfile.phone || "",
        office: "",
        links: (apiProfile.links || []).map((l) => ({
          id: l.id,
          title: l.label,
          url: l.url,
          type: l.platform,
        })),
        stats: { views: 0, taps: 0, leads: 0 },
      };
    }
    return localProfile;
  }, [isLiveCard, apiProfile, localProfile, uniqueId]);

  const handleLinkClick = (link: { url: string; title: string; type: string }) => {
    if (isLiveCard && ownerUid) {
      logLinkClick({
        profileId: uniqueId!,
        profileUid: ownerUid,
        linkUrl: link.url,
        linkTitle: link.title,
        linkType: link.type,
        source: visitSource,
      });
    }
  };

  const [showShareModal, setShowShareModal] = React.useState(false);
  const [showExchangeModal, setShowExchangeModal] = React.useState(false);
  const [exchangeSuccess, setExchangeSuccess] = React.useState(false);
  const [showOfficeModal, setShowOfficeModal] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [exchangeFormOpen, setExchangeFormOpen] = React.useState(false);

  const { scrollYProgress } = useScroll();
  const bgOpacity1 = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0, 0]);
  const bgOpacity2 = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);
  const bgOpacity3 = useTransform(scrollYProgress, [0.5, 1], [0, 1]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  // Build a shareable URL with source tracking (strips any existing ?src= and adds ?src=link)
  const shareableUrl = React.useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("src", "link");
    return url.toString();
  }, []);

  // Loading / error states for live cards
  if (isLiveCard && apiLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E1065]" />
      </div>
    );
  }
  if (isLiveCard && apiError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-700">Profile not found</h1>
        <p className="text-gray-500">{apiError}</p>
      </div>
    );
  }

  const handleSaveContact = () => {
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

    // Notify profile owner someone saved their contact + increment stat
    if (ownerUid) {
      createNotification({
        uid: ownerUid,
        type: "card_save",
        title: "Contact card saved",
        body: "Someone downloaded your contact card.",
        link: "/dashboard",
      });
    }
    if (profileDocId) {
      incrementProfileStat(profileDocId, "totalSaves");
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setLinkCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  const handleNativeShare = async () => {
    const shareData = {
      title: `${currentEmployee.name} — Middlesex Consulting Group`,
      text: `Connect with ${currentEmployee.name}, ${currentEmployee.title}`,
      url: shareableUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareableUrl);
        toast.success("Link copied (sharing not supported on this browser)");
      }
    } catch {
      // user cancelled share
    }
  }

  const PLATFORM_COLORS: Record<string, string> = {
    linkedin: "#0A66C2",
    twitter: "#1DA1F2",
    x: "#000000",
    instagram: "#E1306C",
    github: "#333333",
    youtube: "#FF0000",
    facebook: "#1877F2",
    tiktok: "#010101",
    website: "#F97316",
    calendar: "#8B5CF6",
    action: "#8B5CF6",
    social: "#0A66C2",
    default: "#6B7280",
  };

  const getPlatformColor = (type: string) =>
    PLATFORM_COLORS[type?.toLowerCase()] ?? PLATFORM_COLORS.default;

  const getPlatformInitial = (title: string, type: string) => {
    const map: Record<string, string> = {
      linkedin: "in", twitter: "X", x: "X", instagram: "ig",
      github: "gh", youtube: "yt", facebook: "fb", tiktok: "tt",
    };
    return map[type?.toLowerCase()] ?? title.charAt(0).toUpperCase();
  };

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  const stripUrl = (url: string) => {
    try {
      const u = new URL(normalizeUrl(url));
      return (u.hostname + u.pathname).replace(/^www\./, "").replace(/\/$/, "");
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-[100dvh] font-sans text-gray-900 relative overflow-x-hidden">

      {/* Scroll-Responsive Animated Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ opacity: bgOpacity1 }} className="absolute inset-0 bg-gradient-to-tr from-[#FFF7EE] via-[#FFEDD5] to-[#EDE9FE]" />
        <motion.div style={{ opacity: bgOpacity2 }} className="absolute inset-0 bg-gradient-to-tr from-[#EDE9FE] via-[#FFF7EE] to-[#FFEDD5]" />
        <motion.div style={{ opacity: bgOpacity3 }} className="absolute inset-0 bg-gradient-to-tr from-[#FFEDD5] via-[#EDE9FE] to-[#FFF7EE]" />
      </div>

      {/* Background Ambience */}
      <motion.div style={{ y: orbY }} className="fixed top-[-20%] left-[-10%] w-[60vw] max-w-[500px] h-[60vw] max-h-[500px] rounded-full bg-white opacity-50 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] max-w-[400px] h-[50vw] max-h-[400px] rounded-full bg-white opacity-60 blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-md mx-auto relative z-10 flex flex-col min-h-[100dvh] px-4 sm:px-6 md:px-8 lg:px-12 pb-12">
        {/* Company Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 mb-2 sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-white/50 rounded-b-2xl shadow-[0_2px_16px_rgba(46,16,101,0.06)]"
        >
          <div className="flex items-center min-w-0">
            <img src={mcgLogoColour} alt="Middlesex Consulting Group" className="h-8 w-auto" />
          </div>
          <button onClick={() => setShowShareModal(true)} className="p-2 rounded-full bg-white/40 hover:bg-white/60 transition-colors backdrop-blur-md text-[#2E1065]">
            <QrCode className="h-5 w-5" />
          </button>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex-1 flex flex-col text-gray-900 mx-2 sm:mx-0 mt-4"
        >
          {/* Flippable SVG Business Card */}
          <FlippableCard profile={currentEmployee} />

          {/* Profile Hero Card */}
          <div className="bg-white/70 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/60 shadow-[0_8px_32px_rgba(46,16,101,0.08)] overflow-hidden flex flex-col mt-4">

            {/* Cover Banner */}
            <div className="relative h-24 w-full overflow-hidden rounded-t-[1.5rem] sm:rounded-t-[2.5rem]">
              {currentEmployee.cover ? (
                <img src={currentEmployee.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#2E1065] via-[#4c1d95] to-[#7c3aed]">
                  {/* subtle pattern */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #F97316 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B5CF6 0%, transparent 40%)" }} />
                </div>
              )}
            </div>

            {/* Avatar + Identity */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center px-5 sm:px-6 pb-5"
            >
              {/* Avatar — overlaps cover banner */}
              <div className="relative -mt-10 mb-3">
                <div className="h-20 w-20 rounded-full border-4 border-white shadow-[0_8px_24px_rgba(46,16,101,0.18)] overflow-hidden bg-gradient-to-br from-[#2E1065] to-[#7c3aed] flex items-center justify-center">
                  {currentEmployee.avatar ? (
                    <img src={currentEmployee.avatar} alt={currentEmployee.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-white select-none">
                      {currentEmployee.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2E1065] text-center leading-tight">{currentEmployee.name}</h1>
              {currentEmployee.title && (
                <p className="text-sm font-bold text-[#F97316] mt-0.5 text-center">{currentEmployee.title}</p>
              )}
              {currentEmployee.department && (
                <p className="text-xs font-semibold text-gray-400 mt-0.5 flex items-center gap-1">
                  <Building className="h-3 w-3" />{currentEmployee.department}
                </p>
              )}
              {currentEmployee.bio && (
                <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed text-[#2E1065]/60 text-center max-w-[280px]">
                  {currentEmployee.bio}
                </p>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-5 flex flex-col gap-2.5 w-full"
              >
                {/* Row 1: Save Contact — full width */}
                <button
                  onClick={handleSaveContact}
                  className="w-full flex items-center justify-center gap-2 h-13 py-3.5 rounded-full bg-gradient-to-br from-[#2E1065] to-[#4c1d95] text-white text-sm font-bold shadow-[0_4px_18px_rgba(46,16,101,0.30)] hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  Save Contact
                </button>
                {/* Row 2: Exchange (flex-grow) + Share icon */}
                <div className="flex gap-2">
                  <button
                    onClick={() => isLiveCard ? setExchangeFormOpen(true) : setShowExchangeModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 h-13 py-3.5 rounded-full bg-white/90 border border-gray-200/60 text-[#2E1065] text-sm font-bold shadow-sm hover:bg-white hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <Users className="h-4 w-4" />
                    Exchange
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex h-13 w-13 aspect-square py-3.5 px-3.5 items-center justify-center rounded-full bg-white/90 border border-gray-200/60 text-[#2E1065] shadow-sm hover:bg-white hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>

            {/* Quick Contact Icons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex justify-around gap-2 border-y border-gray-100/80 py-5 px-5 sm:px-6"
            >
              <a href={`mailto:${currentEmployee.email}`} className="group flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 backdrop-blur-xl text-[#F97316] transition-all group-hover:-translate-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Email</span>
              </a>
              <a href={`tel:${currentEmployee.phone}`} className="group flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 backdrop-blur-xl text-[#8B5CF6] transition-all group-hover:-translate-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Call</span>
              </a>
              <button onClick={() => setShowOfficeModal(true)} className="group flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 backdrop-blur-xl text-[#2E1065] transition-all group-hover:-translate-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Office</span>
              </button>
            </motion.div>

            {/* Links Section */}
            {currentEmployee.links.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="px-4 sm:px-5 py-5 space-y-2.5"
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 px-1 mb-3">Links</p>
                {currentEmployee.links.map((link) => {
                  const color = getPlatformColor(link.type);
                  const initial = getPlatformInitial(link.title, link.type);
                  return (
                    <a
                      key={link.id}
                      href={normalizeUrl(link.url)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleLinkClick(link)}
                      className="group flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-xl px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-white/60 transition-all hover:bg-white hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-black shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#2E1065] leading-tight truncate">{link.title}</p>
                          <p className="text-[11px] font-medium text-gray-400 truncate">{stripUrl(link.url)}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-[#2E1065] transition-colors ml-2" />
                    </a>
                  );
                })}
              </motion.div>
            )}

            <div className="pb-5" />
          </div>
        </motion.div>

        {/* Employee Login Entry Point (Subtle) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 flex justify-center"
        >
          <Link to="/dashboard" className="text-xs font-semibold text-[#2E1065]/50 hover:text-[#2E1065] transition-colors">
            Employee Login
          </Link>
        </motion.div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="fixed inset-0 z-50 bg-[#2E1065]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto"
            >
              {/* Sheet */}
              <div className="bg-white rounded-t-[2rem] shadow-[0_-12px_48px_rgba(46,16,101,0.18)] overflow-hidden">
                {/* Accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#8B5CF6] to-[#2E1065]" />

                <div className="px-6 pt-5 pb-8">
                  {/* Drag handle */}
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

                  {/* Profile row */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-11 w-11 rounded-2xl overflow-hidden bg-gradient-to-br from-[#2E1065] to-[#7c3aed] flex items-center justify-center shrink-0 shadow-sm">
                      {currentEmployee.avatar
                        ? <img src={currentEmployee.avatar} alt="" className="w-full h-full object-cover" />
                        : <span className="text-base font-black text-white">{currentEmployee.name?.charAt(0)}</span>
                      }
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#2E1065] leading-tight">{currentEmployee.name}</p>
                      <p className="text-xs font-medium text-gray-400">{currentEmployee.title}</p>
                    </div>
                  </div>

                  {/* QR code */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="p-4 bg-white rounded-[1.75rem] shadow-[0_4px_32px_rgba(46,16,101,0.12)] border border-gray-100/80">
                      <QRCodeSVG
                        value={(() => { const u = new URL(window.location.href); u.searchParams.set("src", "qr"); return u.toString(); })()}
                        size={180}
                        level="Q"
                        includeMargin={false}
                        fgColor="#2E1065"
                      />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-gray-400">Scan to view profile</p>
                  </div>

                  {/* Link row */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-4 border border-gray-100">
                    <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-500 truncate flex-1">{shareableUrl.replace(/^https?:\/\//, "")}</span>
                    <button
                      onClick={handleCopyLink}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#2E1065] hover:bg-gray-50 transition-all active:scale-[0.97] shadow-sm"
                    >
                      {linkCopied ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                    </button>
                  </div>

                  {/* Share button */}
                  <button
                    onClick={handleNativeShare}
                    className="w-full h-13 py-3.5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#2E1065] to-[#4c1d95] text-white font-bold text-sm shadow-[0_4px_18px_rgba(46,16,101,0.30)] hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    <Share2 className="h-4 w-4" /> Share via...
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Exchange Contact Modal */}
      <AnimatePresence>
        {showExchangeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowExchangeModal(false); setTimeout(() => setExchangeSuccess(false), 300); }}
              className="fixed inset-0 z-50 bg-[#2E1065]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-white rounded-t-[2rem] shadow-[0_-12px_48px_rgba(46,16,101,0.18)] overflow-hidden">
                {/* Accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#8B5CF6] to-[#2E1065]" />

                <div className="px-6 pt-5 pb-8">
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

                  {!exchangeSuccess ? (
                    <>
                      {/* "Connecting with" header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-11 w-11 rounded-2xl overflow-hidden bg-gradient-to-br from-[#2E1065] to-[#7c3aed] flex items-center justify-center shrink-0 shadow-sm">
                          {currentEmployee.avatar
                            ? <img src={currentEmployee.avatar} alt="" className="w-full h-full object-cover" />
                            : <span className="text-base font-black text-white">{currentEmployee.name?.charAt(0)}</span>
                          }
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Connecting with</p>
                          <p className="text-sm font-black text-[#2E1065]">{currentEmployee.name}</p>
                        </div>
                      </div>

                      <form
                        className="space-y-3"
                        onSubmit={(e) => { e.preventDefault(); setExchangeSuccess(true); }}
                      >
                        {/* Input helper */}
                        {[
                          { icon: <User className="h-4 w-4" />, type: "text", placeholder: "Full Name", required: true },
                          { icon: <AtSign className="h-4 w-4" />, type: "email", placeholder: "Email Address", required: true },
                          { icon: <Briefcase className="h-4 w-4" />, type: "text", placeholder: "Job Title", required: false },
                          { icon: <Building2 className="h-4 w-4" />, type: "text", placeholder: "Company", required: false },
                        ].map(({ icon, type, placeholder, required }) => (
                          <div key={placeholder} className="flex items-center gap-3 h-13 bg-gray-50 border border-gray-100 rounded-2xl px-4 focus-within:border-[#F97316]/40 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.08)] transition-all">
                            <span className="text-gray-400 shrink-0">{icon}</span>
                            <input
                              required={required}
                              type={type}
                              placeholder={placeholder}
                              className="flex-1 bg-transparent py-3.5 text-sm font-medium text-[#2E1065] placeholder:text-gray-400 focus:outline-none"
                            />
                          </div>
                        ))}

                        <button
                          type="submit"
                          className="w-full mt-2 h-13 py-3.5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#F97316] to-[#ea580c] text-white font-bold text-sm shadow-[0_4px_18px_rgba(249,115,22,0.30)] hover:opacity-90 transition-all active:scale-[0.98]"
                        >
                          <Users className="h-4 w-4" /> Exchange Contact
                        </button>
                      </form>
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-6"
                    >
                      <div className="h-20 w-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-5 shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h3 className="text-2xl font-black text-[#2E1065] mb-1">Connected!</h3>
                      <p className="text-center text-sm text-gray-500 font-medium max-w-[220px]">
                        Your info was sent to {currentEmployee.name.split(" ")[0]}.
                      </p>
                      <button
                        className="mt-7 w-full h-13 py-3.5 rounded-full border border-gray-200 bg-white text-[#2E1065] font-bold text-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
                        onClick={() => { setShowExchangeModal(false); setTimeout(() => setExchangeSuccess(false), 300); }}
                      >
                        Close
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Office Info Modal */}
      <AnimatePresence>
        {showOfficeModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfficeModal(false)}
              className="fixed inset-0 z-50 bg-[#2E1065]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-white/60 rounded-t-[1.5rem] sm:rounded-t-[2.5rem] p-5 sm:p-8 pb-safe shadow-[0_-8px_32px_rgba(46,16,101,0.1)] max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              <div className="text-center mb-6">
                <MapPin className="h-8 w-8 text-[#F97316] mx-auto mb-3" />
                <h3 className="text-2xl font-black text-[#2E1065]">Office Location</h3>
                <p className="text-sm font-medium text-gray-500 mt-2">{currentEmployee.office}</p>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(currentEmployee.office)}`}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button size="lg" className="w-full shadow-[0_8px_30px_rgb(46,16,101,0.2)] text-base font-semibold h-14 bg-gradient-to-br from-[#2E1065] to-[#4c1d95] hover:opacity-95 rounded-full flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-[0.98]">
                  Open in Maps
                </Button>
              </a>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full text-base font-semibold h-14 mt-3 rounded-full border-gray-200/60 bg-white/50 text-[#2E1065] hover:bg-white transition-all active:scale-[0.98]"
                onClick={() => setShowOfficeModal(false)}
              >
                Close
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Real Exchange Form for live cards */}
      {isLiveCard && (
        <ExchangeForm
          profileId={uniqueId!}
          profileName={currentEmployee.name}
          open={exchangeFormOpen}
          onOpenChange={setExchangeFormOpen}
          profileUid={ownerUid ?? undefined}
          profileDocId={profileDocId ?? undefined}
        />
      )}
    </div>
  )
}