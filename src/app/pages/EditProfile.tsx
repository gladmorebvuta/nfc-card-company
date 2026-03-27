import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Camera, Plus, Trash2, GripVertical, Eye, Share2, Download, Users, X, Loader2 } from "lucide-react"
import { Card, CardContent } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { Button } from "../components/ui/Button"
import { useProfile } from "../contexts/ProfileContext"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "sonner"
import { generateVCard } from "../utils/vcard"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "../../lib/firebase"

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: string;
}

const PLATFORMS = [
  { id: "linkedin",  label: "LinkedIn",    initial: "in", color: "#0A66C2", defaultTitle: "Connect on LinkedIn",  placeholder: "https://linkedin.com/in/..." },
  { id: "twitter",   label: "X / Twitter", initial: "X",  color: "#000000", defaultTitle: "Follow on X",          placeholder: "https://x.com/..." },
  { id: "github",    label: "GitHub",      initial: "gh", color: "#333333", defaultTitle: "GitHub",                placeholder: "https://github.com/..." },
  { id: "instagram", label: "Instagram",   initial: "ig", color: "#E1306C", defaultTitle: "Instagram",             placeholder: "https://instagram.com/..." },
  { id: "facebook",  label: "Facebook",    initial: "fb", color: "#1877F2", defaultTitle: "Facebook",              placeholder: "https://facebook.com/..." },
  { id: "youtube",   label: "YouTube",     initial: "yt", color: "#FF0000", defaultTitle: "YouTube Channel",       placeholder: "https://youtube.com/@..." },
  { id: "tiktok",    label: "TikTok",      initial: "tt", color: "#010101", defaultTitle: "TikTok",                placeholder: "https://tiktok.com/@..." },
  { id: "website",   label: "Website",     initial: "W",  color: "#F97316", defaultTitle: "Visit Website",         placeholder: "https://..." },
  { id: "calendar",  label: "Calendly",    initial: "Ca", color: "#8B5CF6", defaultTitle: "Book a Meeting",        placeholder: "https://calendly.com/..." },
  { id: "custom",    label: "Custom",      initial: "+",  color: "#6B7280", defaultTitle: "",                      placeholder: "https://..." },
];

export function EditProfile() {
  const { profile, updateProfile } = useProfile();
  const { user } = useAuth();
  const [showPreview, setShowPreview] = React.useState(false);
  const [showPlatformPicker, setShowPlatformPicker] = React.useState(false);
  const [pendingLink, setPendingLink] = React.useState<{ platformId: string; title: string; url: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [name, setName] = React.useState(profile.name);
  const [title, setTitle] = React.useState(profile.title);
  const [department, setDepartment] = React.useState(profile.department);
  const [office, setOffice] = React.useState(profile.office);
  const [bio, setBio] = React.useState(profile.bio);
  const [email, setEmail] = React.useState(profile.email);
  const [phone, setPhone] = React.useState(profile.phone);
  const [links, setLinks] = React.useState<LinkItem[]>([...profile.links]);
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar);
  const [coverUrl, setCoverUrl] = React.useState(profile.cover);
  const [saving, setSaving] = React.useState(false);

  // Sync local state when profile changes from context
  React.useEffect(() => {
    setName(profile.name);
    setTitle(profile.title);
    setDepartment(profile.department);
    setOffice(profile.office);
    setBio(profile.bio);
    setEmail(profile.email);
    setPhone(profile.phone);
    setLinks([...profile.links]);
    setAvatarUrl(profile.avatar);
    setCoverUrl(profile.cover);
  }, [profile]);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setLoading = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    const setter = type === "avatar" ? setAvatarUrl : setCoverUrl;
    setLoading(true);

    try {
      if (user) {
        // Upload to Firebase Storage
        const storageRef = ref(storage, `nfc_profiles/${user.uid}/${type}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setter(url);
        toast.success(`${type === "avatar" ? "Profile picture" : "Cover photo"} updated!`);
      } else {
        // Fallback: blob URL for local/unauthenticated mode
        setter(URL.createObjectURL(file));
        toast.success("Image updated (local preview only)");
      }
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setSaving(true);
    // Update the global profile context
    updateProfile({
      name,
      title,
      department,
      office,
      bio,
      email,
      phone,
      links,
      avatar: avatarUrl,
      cover: coverUrl,
    });
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile saved successfully!");
    }, 1200);
  };

  const handleAddLink = (platformId: string) => {
    const platform = PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[PLATFORMS.length - 1];
    setPendingLink({ platformId, title: platform.defaultTitle, url: "" });
  };

  const handleConfirmLink = () => {
    if (!pendingLink) return;
    const newLink: LinkItem = {
      id: `l${Date.now()}`,
      title: pendingLink.title,
      url: pendingLink.url,
      type: pendingLink.platformId,
    };
    setLinks([...links, newLink]);
    setPendingLink(null);
    setShowPlatformPicker(false);
  };

  const handleClosePlatformPicker = () => {
    setPendingLink(null);
    setShowPlatformPicker(false);
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
    toast("Link removed");
  };

  const handleLinkChange = (id: string, field: "title" | "url", value: string) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6 sm:space-y-8 relative min-w-0"
    >
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "avatar")} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2E1065]">Edit Card</h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Update your public digital business card</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2 bg-white/50 border-white shadow-sm hover:bg-white text-[#2E1065] rounded-xl"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button 
            size="lg" 
            className="shadow-lg shadow-[#F97316]/20 bg-[#2E1065] hover:bg-[#2E1065]/90 text-white rounded-xl"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Images */}
        <Card>
          <div className="border-b border-white/40 p-6">
            <h2 className="text-lg font-bold text-[#2E1065]">Images</h2>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Cover Photo</label>
                <div className="relative h-32 sm:h-40 w-full overflow-hidden rounded-xl sm:rounded-[1.5rem] border-2 border-dashed border-white/60 bg-white/40 transition-colors hover:border-[#F97316]/50">
                  {coverUrl && <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 shadow-lg bg-white border border-white text-[#2E1065] hover:text-[#F97316]"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                    >
                      {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {uploadingCover ? "Uploading..." : "Change Cover"}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Profile Picture</label>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative shrink-0">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Avatar" className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl sm:rounded-[1.25rem] border-4 border-white bg-white object-cover shadow-md" />
                      : <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl sm:rounded-[1.25rem] border-4 border-white bg-gradient-to-br from-[#2E1065] to-[#7c3aed] flex items-center justify-center shadow-md">
                          <span className="text-2xl font-black text-white">{name?.charAt(0)}</span>
                        </div>
                    }
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white/50 border-white shadow-sm hover:bg-white hover:text-[#F97316]"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Camera className="h-4 w-4" /> Upload New
                    </Button>
                    <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <div className="border-b border-white/40 p-6">
            <h2 className="text-lg font-bold text-[#2E1065]">Basic Info</h2>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/60 border-white/60 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Job Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/60 border-white/60 focus:bg-white" />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Department</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="bg-white/60 border-white/60 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Office Location</label>
                <Input value={office} onChange={(e) => setOffice(e.target.value)} className="bg-white/60 border-white/60 focus:bg-white" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-semibold text-gray-700">Bio</label>
              <textarea 
                className="w-full rounded-[1.25rem] border border-white/60 bg-white/60 p-4 text-sm text-[#2E1065] shadow-sm transition-all focus:border-[#F97316]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Methods */}
        <Card>
          <div className="border-b border-white/40 p-6">
            <h2 className="text-lg font-bold text-[#2E1065]">Contact Options</h2>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/60 border-white/60 focus:bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/60 border-white/60 focus:bg-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <div className="flex items-center justify-between border-b border-white/40 p-6">
            <h2 className="text-lg font-bold text-[#2E1065]">Links & Socials</h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white/50 border-white shadow-sm hover:bg-white hover:text-[#F97316]"
              onClick={() => setShowPlatformPicker(true)}
            >
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </div>
          <CardContent className="space-y-3 p-6">
            {links.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No links yet. Click "Add Link" to get started.</p>
            )}
            {links.map((link) => {
              const platform = PLATFORMS.find((p) => p.id === link.type) ?? PLATFORMS[PLATFORMS.length - 1];
              return (
                <div key={link.id} className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-[1.25rem] border border-white/60 bg-white/40 p-2 sm:p-3 shadow-sm transition-all hover:bg-white hover:shadow-md">
                  <button className="cursor-grab p-1 sm:p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing shrink-0">
                    <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  {/* Platform icon */}
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.initial}
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Input
                      value={link.title}
                      onChange={(e) => handleLinkChange(link.id, "title", e.target.value)}
                      className="h-10 text-sm bg-white/50 border-white/60 focus:bg-white"
                      placeholder="Link Title"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => handleLinkChange(link.id, "url", e.target.value)}
                      className="h-10 text-sm bg-white/50 border-white/60 focus:bg-white"
                      placeholder={platform.placeholder}
                    />
                  </div>
                  <button
                    className="ml-2 rounded-xl p-3 text-red-400 transition-colors bg-white/50 border border-white hover:bg-red-50 hover:text-red-500 shadow-sm"
                    onClick={() => handleRemoveLink(link.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Platform Picker Sheet */}
        <AnimatePresence>
          {showPlatformPicker && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClosePlatformPicker}
                className="fixed inset-0 z-[80] bg-[#2E1065]/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[90] max-h-[80vh] overflow-y-auto"
              >
                <div className="bg-white rounded-t-[2rem] shadow-[0_-12px_48px_rgba(46,16,101,0.18)] overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#8B5CF6] to-[#2E1065]" />
                  <div className="px-6 pt-5 pb-8">
                    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        {pendingLink && (
                          <button onClick={() => setPendingLink(null)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                          </button>
                        )}
                        <h3 className="text-lg font-black text-[#2E1065]">{pendingLink ? "Add Link" : "Choose Platform"}</h3>
                      </div>
                      <button onClick={handleClosePlatformPicker} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    {pendingLink ? (() => {
                      const platform = PLATFORMS.find((p) => p.id === pendingLink.platformId) ?? PLATFORMS[PLATFORMS.length - 1];
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0" style={{ backgroundColor: platform.color }}>
                              {platform.initial}
                            </div>
                            <span className="font-semibold text-[#2E1065]">{platform.label}</span>
                          </div>
                          <div className="space-y-2">
                            <Input
                              value={pendingLink.title}
                              onChange={(e) => setPendingLink({ ...pendingLink, title: e.target.value })}
                              placeholder="Link Title"
                              className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                            />
                            <Input
                              value={pendingLink.url}
                              onChange={(e) => setPendingLink({ ...pendingLink, url: e.target.value })}
                              placeholder={platform.placeholder}
                              className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter" && pendingLink.url.trim()) handleConfirmLink(); }}
                            />
                          </div>
                          <Button
                            onClick={handleConfirmLink}
                            disabled={!pendingLink.url.trim()}
                            className="w-full h-12 bg-[#2E1065] hover:bg-[#2E1065]/90 text-white rounded-xl font-bold shadow-lg shadow-[#2E1065]/20"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Link
                          </Button>
                        </div>
                      );
                    })() : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleAddLink(p.id)}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-md transition-all active:scale-[0.96]"
                        >
                          <div
                            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.initial}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight">{p.label}</span>
                        </button>
                      ))}
                    </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="fixed inset-0 z-[60] bg-[#2E1065]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[70] h-[80vh] w-[calc(100vw-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-[6px] sm:border-[8px] border-white bg-white shadow-2xl ring-1 ring-gray-200"
            >
              {/* Fake notch */}
              <div className="absolute left-1/2 top-0 z-50 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-white" />
              
              {/* Phone Content Frame */}
              <div className="h-full w-full overflow-y-auto bg-gradient-to-tr from-[#FFF7EE] to-[#EDE9FE] pb-8 scrollbar-hide relative pt-6 px-3">
                
                {/* Close Button overlay */}
                <button 
                  onClick={() => setShowPreview(false)}
                  className="absolute top-6 right-6 z-50 h-8 w-8 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center text-[#2E1065] hover:bg-white transition-colors border border-white"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="w-full relative rounded-2xl shadow-[0_10px_20px_rgba(46,16,101,0.15)] overflow-hidden mb-6 border border-[#2E1065]/10 bg-[#FFF7EE] aspect-[1.75/1] flex flex-col justify-between p-4 mt-10">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-sm bg-[#2E1065]" />
                      <div className="leading-none">
                        <span className="block text-[6px] font-black text-[#2E1065] tracking-wide">MIDDLESEX</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-xl font-['Qugan'] text-[#2E1065] leading-none mb-1">{name || "Your Name"}</h2>
                      <p className="text-[10px] font-semibold text-[#8B5CF6]">{title || "Your Title"}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/5 to-transparent pointer-events-none mix-blend-overlay" />
                </div>
                
                <div className="relative px-4 text-center">
                  <h3 className="mt-2 text-xl font-black tracking-tight text-[#2E1065] font-['Qugan']">{name || "Your Name"}</h3>
                  <p className="text-sm font-bold text-[#F97316]">{title || "Your Title"}</p>
                  {bio && <p className="text-xs text-[#2E1065]/70 mt-2 px-2 font-medium">{bio}</p>}
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <Button 
                      variant="default" 
                      className="w-full text-xs font-semibold h-10 shadow-[0_4px_14px_rgb(46,16,101,0.2)] bg-gradient-to-br from-[#2E1065] to-[#4c1d95] hover:opacity-95 rounded-full border border-white/10 transition-all active:scale-[0.98]"
                      onClick={() => {
                        generateVCard({ name, title, email, phone, department, office, bio, links });
                        toast.success("Contact card downloaded!");
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Save Contact
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs font-semibold h-10 bg-white/80 backdrop-blur-xl border-white/40 text-[#2E1065] rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.04)] hover:bg-white transition-all active:scale-[0.98]"
                        onClick={() => toast("Exchange Contact modal would open here")}
                      >
                        <Users className="h-3.5 w-3.5 mr-1.5" /> Exchange
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="shrink-0 h-10 w-10 bg-white/80 text-[#2E1065] hover:bg-white transition-colors border-white/40 shadow-[0_4px_14px_rgba(0,0,0,0.04)] rounded-full backdrop-blur-xl active:scale-[0.98]"
                        onClick={async () => {
                          try {
                            if (navigator.share) {
                              await navigator.share({ title: `${name} — Middlesex Consulting Group`, url: window.location.origin });
                            } else {
                              await navigator.clipboard.writeText(window.location.origin);
                              toast.success("Link copied!");
                            }
                          } catch {}
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {links.filter(l => l.title).map((link) => (
                      <a 
                        key={link.id} 
                        href={link.url || "#"} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-white/60 backdrop-blur-md px-4 text-sm font-bold text-[#2E1065] shadow-sm border border-white hover:bg-white hover:shadow-md transition-all cursor-pointer"
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}