import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Eye, MousePointerClick, Users, Link2, Share2, Copy, QrCode, Download, Check, X, ChevronRight, ExternalLink } from "lucide-react"
import { Card, CardContent } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { useProfile } from "../contexts/ProfileContext"
import { useAuth } from "../contexts/AuthContext"
import { uniqueIdCacheKey } from "../contexts/AuthContext"
import { useExchanges } from "../hooks/useExchanges"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { generateVCard } from "../utils/vcard"

import { QRCodeSVG } from 'qrcode.react';

// Platform colour map for link tiles
const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  instagram: "#E1306C",
  facebook: "#1877F2",
  website: "#2E1065",
  github: "#333",
  youtube: "#FF0000",
  default: "#8B5CF6",
};

export function Dashboard() {
  const { profile: currentEmployee, nfcProfile, isFirestoreBacked } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { exchanges } = useExchanges();
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);

  // Build unique per-user profile URLs with source tracking
  // Priority: Firestore profile > localStorage cache > fallback to base URL
  const baseProfileUrl = React.useMemo(() => {
    if (isFirestoreBacked && nfcProfile?.uniqueId) {
      return `${window.location.origin}/c/${nfcProfile.uniqueId}`;
    }
    // Fallback: try localStorage-cached uniqueId (survives Firestore read failures)
    if (user) {
      const cached = localStorage.getItem(uniqueIdCacheKey(user.uid));
      if (cached) return `${window.location.origin}/c/${cached}`;
    }
    return `${window.location.origin}/`;
  }, [isFirestoreBacked, nfcProfile, user]);

  // Tagged URLs for different sharing channels
  const profileUrl = `${baseProfileUrl}?src=link`;     // shared / copied link
  const qrProfileUrl = `${baseProfileUrl}?src=qr`;     // QR code scans

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setLinkCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 sm:space-y-8 min-w-0"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-[#2E1065]">Overview</h1>
        <p className="text-gray-500 font-medium">Welcome back, {currentEmployee.name.split(" ")[0]}</p>
      </div>

      {/* Stats — 2×2 grid, left-aligned with trend badges */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Profile Views",
            value: isFirestoreBacked ? currentEmployee.stats.views.toLocaleString() : "—",
            icon: <Eye className="h-5 w-5" />,
            iconBg: "bg-[#F97316]/10 text-[#F97316]",
          },
          {
            label: "Card Saves",
            value: isFirestoreBacked ? currentEmployee.stats.taps.toLocaleString() : "—",
            icon: <MousePointerClick className="h-5 w-5" />,
            iconBg: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
          },
          {
            label: "New Leads",
            value: isFirestoreBacked ? String(currentEmployee.stats.leads) : "—",
            icon: <Users className="h-5 w-5" />,
            iconBg: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Active Links",
            value: String(currentEmployee.links.length),
            icon: <Link2 className="h-5 w-5" />,
            iconBg: "bg-[#2E1065]/10 text-[#2E1065]",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all hover:bg-white/70">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-500 leading-tight">{stat.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-2xl ${stat.iconBg}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight text-[#2E1065] leading-none">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <Card>
            <div className="flex items-center justify-between border-b border-white/40 p-5">
              <div>
                <h2 className="text-base font-bold text-[#2E1065]">Share Profile</h2>
                {baseProfileUrl !== `${window.location.origin}/` && (
                  <p className="text-xs text-gray-400 font-medium mt-0.5 truncate max-w-[180px]">
                    {baseProfileUrl.replace(/^https?:\/\//, '')}
                  </p>
                )}
              </div>
              <button
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border ${
                  linkCopied
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-white/60 text-[#2E1065] border-white hover:bg-white shadow-sm"
                }`}
              >
                {linkCopied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Link</>}
              </button>
            </div>
            <CardContent className="p-6">
              <button
                onClick={() => setShowQrModal(true)}
                className="group flex w-full cursor-pointer items-center gap-4 rounded-[1.5rem] border border-white/60 bg-white/40 p-4 transition-all hover:border-[#F97316]/30 hover:bg-white/60 hover:shadow-md text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#F97316] shadow-sm">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2E1065]">My QR Code</h3>
                  <p className="text-xs text-gray-500 font-medium">Download for print</p>
                </div>
              </button>
            </CardContent>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-white/40 p-5">
              <h2 className="text-base font-bold text-[#2E1065]">Recent Leads</h2>
              <button
                onClick={() => navigate("/dashboard/connections")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:text-[#F97316]/80 transition-colors"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-white/30">
                {exchanges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Users className="h-8 w-8 text-gray-200" />
                    <p className="text-sm font-medium text-gray-400">No connections yet</p>
                    <p className="text-xs text-gray-300">Share your card to start collecting leads</p>
                  </div>
                ) : exchanges.slice(0, 3).map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/40 gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(ex.visitorName)}&background=EDE9FE&color=2E1065`}
                        alt={ex.visitorName}
                        className="h-10 w-10 rounded-2xl border-2 border-white object-cover shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-[#2E1065] truncate text-sm">{ex.visitorName}</h4>
                        <p className="text-xs font-medium text-gray-500 truncate">{ex.visitorCompany || ex.visitorEmail}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 shrink-0 bg-white/60 px-2 py-1 rounded-full">
                      {ex.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Pane */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-gray-100 bg-gray-50/50 shadow-inner">
            <div className="flex items-center justify-between border-b border-gray-200/50 bg-white/50 p-4 backdrop-blur-md">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Live Preview</h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 ring-4 ring-green-100" />
                <span className="text-xs font-bold text-gray-500">Online</span>
              </div>
            </div>
            
            <div className="relative mx-auto my-6 sm:my-8 h-[480px] sm:h-[540px] lg:h-[600px] w-full max-w-[280px] lg:max-w-[320px] overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-[6px] border-white bg-white shadow-2xl ring-1 ring-gray-200">
              <div className="absolute left-1/2 top-0 z-50 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-white" />
              
              <div className="h-full w-full overflow-y-auto bg-gradient-to-tr from-[#FFF7EE] to-[#EDE9FE] pb-8 scrollbar-hide px-3 pt-6">
                
                {/* Mini Live Digital Card */}
                <div className="w-full relative rounded-2xl shadow-[0_10px_20px_rgba(46,16,101,0.15)] overflow-hidden mb-6 border border-[#2E1065]/10 bg-[#FFF7EE] aspect-[1.75/1] flex flex-col justify-between p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-sm bg-[#2E1065]" />
                      {currentEmployee.department && (
                        <div className="leading-none">
                          <span className="block text-[6px] font-black text-[#2E1065] tracking-wide uppercase">{currentEmployee.department}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-xl font-['Qugan'] text-[#2E1065] leading-none mb-1">{currentEmployee.name}</h2>
                      <p className="text-[10px] font-semibold text-[#8B5CF6]">{currentEmployee.title}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/5 to-transparent pointer-events-none mix-blend-overlay" />
                </div>
                
                <div className="relative px-4 text-center">
                  <h3 className="mt-2 text-xl font-black tracking-tight text-[#2E1065] font-['Qugan']">{currentEmployee.name}</h3>
                  <p className="text-sm font-bold text-[#F97316]">{currentEmployee.title}</p>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <Button 
                      variant="default" 
                      className="w-full text-xs font-semibold h-10 shadow-[0_4px_14px_rgb(46,16,101,0.2)] bg-gradient-to-br from-[#2E1065] to-[#4c1d95] hover:opacity-95 rounded-full border border-white/10 transition-all active:scale-[0.98]"
                      onClick={() => {
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
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Save Contact
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs font-semibold h-10 bg-white/80 backdrop-blur-xl border-white/40 text-[#2E1065] rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.04)] hover:bg-white transition-all active:scale-[0.98]"
                        onClick={() => toast("Exchange Contact — available on the public profile")}
                      >
                        Exchange
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="shrink-0 h-10 w-10 bg-white/80 text-[#2E1065] hover:bg-white transition-colors border-white/40 shadow-[0_4px_14px_rgba(0,0,0,0.04)] rounded-full backdrop-blur-xl active:scale-[0.98]"
                        onClick={handleCopyLink}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {currentEmployee.links.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Links</span>
                        <span className="text-[10px] font-semibold text-[#F97316]">{currentEmployee.links.length} links</span>
                      </div>
                      <div className="space-y-2">
                        {currentEmployee.links.map((link) => {
                          const platform = (link.type || "default").toLowerCase();
                          const color = PLATFORM_COLORS[platform] || PLATFORM_COLORS.default;
                          return (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2.5 w-full rounded-2xl bg-white/60 backdrop-blur-md px-3 py-2.5 border border-white hover:bg-white hover:shadow-sm transition-all"
                            >
                              <div className="h-7 w-7 shrink-0 rounded-xl flex items-center justify-center text-white text-[9px] font-black" style={{ backgroundColor: color }}>
                                {link.title.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-[#2E1065] truncate leading-none">{link.title}</p>
                                <p className="text-[9px] text-gray-400 truncate mt-0.5">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                              </div>
                              <ExternalLink className="h-3 w-3 text-gray-300 shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowQrModal(false)}
              className="fixed inset-0 z-[60] bg-[#2E1065]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-white/95 backdrop-blur-2xl p-8 shadow-2xl border border-white/60"
            >
              <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-[#2E1065]">Your QR Code</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">Share or download for print</p>
              </div>
              <div className="aspect-square w-48 mx-auto bg-white rounded-[1.5rem] border border-gray-100 flex items-center justify-center mb-6 shadow-lg shadow-[#2E1065]/5">
                <QRCodeSVG
                  value={qrProfileUrl}
                  size={140}
                  level="Q"
                  includeMargin={false}
                  fgColor="#2E1065"
                />
              </div>
              <p className="text-xs text-center text-gray-400 mb-6 font-medium">{baseProfileUrl}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl text-[#2E1065]"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? "Copied!" : "Copy Link"}
                </Button>
                <Button 
                  className="h-12 rounded-xl bg-[#2E1065] hover:bg-[#2E1065]/90 text-white"
                  onClick={() => {
                    toast.success("QR Code downloaded! (In production, a PNG would be generated)");
                    setShowQrModal(false);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  )
}