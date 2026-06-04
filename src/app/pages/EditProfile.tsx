import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Camera, Plus, Trash2, GripVertical, Eye, Share2, Download, Users, X, Loader2, Mail, Phone, MapPin, Building, ChevronRight } from "lucide-react"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { useProfile } from "../contexts/ProfileContext"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "sonner"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "../../lib/firebase"
import { FlippableCard } from "../components/FlippableCard"
import { Seo } from "../components/seo/Seo"

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
  { id: "website",   label: "Website",     initial: "W",  color: "#3B82F6", defaultTitle: "Visit Website",         placeholder: "https://..." },
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

  // Detect unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    return (
      name !== profile.name ||
      title !== profile.title ||
      department !== profile.department ||
      office !== profile.office ||
      bio !== profile.bio ||
      email !== profile.email ||
      phone !== profile.phone ||
      avatarUrl !== profile.avatar ||
      coverUrl !== profile.cover ||
      JSON.stringify(links) !== JSON.stringify(profile.links)
    );
  }, [name, title, department, office, bio, email, phone, avatarUrl, coverUrl, links, profile]);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB — must match storage.rules

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate before uploading
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File is ${sizeMB} MB — maximum is 5 MB. Please use a smaller image.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed (JPG, PNG, WebP)");
      return;
    }

    const setLoading = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    const setter = type === "avatar" ? setAvatarUrl : setCoverUrl;
    setLoading(true);

    try {
      if (user) {
        const storageRef = ref(storage, `nfc_profiles/${user.uid}/${type}_${Date.now()}`);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        setter(url);
        toast.success(`${type === "avatar" ? "Profile picture" : "Cover photo"} updated!`);
      } else {
        setter(URL.createObjectURL(file));
        toast.success("Image updated (local preview only)");
      }
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
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
      toast.success("Profile saved!");
    } catch {
      toast.error("Save failed — please try again");
    } finally {
      setSaving(false);
    }
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
      <Seo title="Edit Profile" description="Edit your NFC digital business card profile." noindex />
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "avatar")} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Edit Card</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Update your public digital business card</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 bg-card/50 border-border shadow-sm hover:bg-card text-foreground rounded-xl"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button
            size="lg"
            className="shadow-lg shadow-black/20 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
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
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-bold text-foreground">Images</h2>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Cover Photo</label>
                <div className="relative h-32 sm:h-40 w-full overflow-hidden rounded-xl sm:rounded-[1.5rem] border-2 border-dashed border-border bg-card/40 transition-colors hover:border-blue-500/50">
                  {coverUrl && <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 shadow-lg bg-card border border-border text-foreground hover:text-blue-400"
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
                <label className="mb-2 block text-sm font-semibold text-foreground">Profile Picture</label>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative shrink-0">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Avatar" className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl sm:rounded-[1.25rem] border-4 border-card bg-card object-cover shadow-md" />
                      : <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl sm:rounded-[1.25rem] border-4 border-card bg-gradient-to-br from-foreground to-blue-500 flex items-center justify-center shadow-md">
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
                      className="gap-2 bg-card/50 border-border shadow-sm hover:bg-card hover:text-blue-400"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Camera className="h-4 w-4" /> Upload New
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-bold text-foreground">Basic Info</h2>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-card/60 border-border focus:bg-card" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Job Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-card/60 border-border focus:bg-card" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Department</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="bg-card/60 border-border focus:bg-card" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Office Location</label>
                <Input value={office} onChange={(e) => setOffice(e.target.value)} className="bg-card/60 border-border focus:bg-card" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-semibold text-foreground">Bio</label>
              <textarea
                className="w-full rounded-[1.25rem] border border-border bg-card/60 p-4 text-sm text-foreground shadow-sm transition-all focus:border-blue-500/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Methods */}
        <Card>
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-bold text-foreground">Contact Options</h2>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-card/60 border-border focus:bg-card" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Phone Number</label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-card/60 border-border focus:bg-card" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <div className="flex items-center justify-between border-b border-border p-6">
            <h2 className="text-lg font-bold text-foreground">Links & Socials</h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-card/50 border-border shadow-sm hover:bg-card hover:text-blue-400"
              onClick={() => setShowPlatformPicker(true)}
            >
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </div>
          <CardContent className="space-y-3 p-6">
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No links yet. Click "Add Link" to get started.</p>
            )}
            {links.map((link) => {
              const platform = PLATFORMS.find((p) => p.id === link.type) ?? PLATFORMS[PLATFORMS.length - 1];
              return (
                <div key={link.id} className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-[1.25rem] border border-border bg-card/40 p-2 sm:p-3 shadow-sm transition-all hover:bg-card/60 hover:shadow-md">
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
                      className="h-10 text-sm bg-card/50 border-border focus:bg-card"
                      placeholder="Link Title"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => handleLinkChange(link.id, "url", e.target.value)}
                      className="h-10 text-sm bg-card/50 border-border focus:bg-card"
                      placeholder={platform.placeholder}
                    />
                  </div>
                  <button
                    className="ml-2 rounded-xl p-3 text-red-400 transition-colors bg-card/50 border border-border hover:bg-red-500/20 hover:text-red-300 shadow-sm"
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
                className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[90] max-h-[80vh] overflow-y-auto"
              >
                <div className="bg-card rounded-t-[2rem] shadow-lg shadow-black/40 overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-foreground" />
                  <div className="px-6 pt-5 pb-8">
                    <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        {pendingLink && (
                          <button onClick={() => setPendingLink(null)} className="p-2 rounded-xl bg-background hover:bg-background/80 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                          </button>
                        )}
                        <h3 className="text-lg font-black text-foreground">{pendingLink ? "Add Link" : "Choose Platform"}</h3>
                      </div>
                      <button onClick={handleClosePlatformPicker} className="p-2 rounded-xl bg-background hover:bg-background/80 transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    {pendingLink ? (() => {
                      const platform = PLATFORMS.find((p) => p.id === pendingLink.platformId) ?? PLATFORMS[PLATFORMS.length - 1];
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0" style={{ backgroundColor: platform.color }}>
                              {platform.initial}
                            </div>
                            <span className="font-semibold text-foreground">{platform.label}</span>
                          </div>
                          <div className="space-y-2">
                            <Input
                              value={pendingLink.title}
                              onChange={(e) => setPendingLink({ ...pendingLink, title: e.target.value })}
                              placeholder="Link Title"
                              className="h-11 bg-background border-border focus:bg-card"
                            />
                            <Input
                              value={pendingLink.url}
                              onChange={(e) => setPendingLink({ ...pendingLink, url: e.target.value })}
                              placeholder={platform.placeholder}
                              className="h-11 bg-background border-border focus:bg-card"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter" && pendingLink.url.trim()) handleConfirmLink(); }}
                            />
                          </div>
                          <Button
                            onClick={handleConfirmLink}
                            disabled={!pendingLink.url.trim()}
                            className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl font-bold shadow-lg shadow-black/20"
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
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border bg-background hover:bg-card hover:border-border/80 hover:shadow-md transition-all active:scale-[0.96]"
                        >
                          <div
                            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.initial}
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight">{p.label}</span>
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

      {/* Sticky Save Bar — appears when there are unsaved changes */}
      <AnimatePresence>
        {hasUnsavedChanges && !saving && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 sm:bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background shadow-xl shadow-black/30 transition-all hover:bg-foreground/90 active:scale-95 border border-border"
            >
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Save Changes
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal — mirrors the actual public profile layout */}
      <AnimatePresence>
        {showPreview && (() => {
          const PLATFORM_COLORS: Record<string, string> = {
            linkedin: "#0A66C2", twitter: "#1DA1F2", x: "#000000", instagram: "#E1306C",
            github: "#333333", youtube: "#FF0000", facebook: "#1877F2", tiktok: "#010101",
            website: "#3B82F6", calendar: "#8B5CF6", default: "#6B7280",
          };
          const getColor = (type: string) => PLATFORM_COLORS[type?.toLowerCase()] ?? PLATFORM_COLORS.default;
          const getInitial = (t: string, type: string) => {
            const map: Record<string, string> = { linkedin: "in", twitter: "X", x: "X", instagram: "ig", github: "gh", youtube: "yt", facebook: "fb", tiktok: "tt" };
            return map[type?.toLowerCase()] ?? t.charAt(0).toUpperCase();
          };
          const stripUrl = (url: string) => { try { const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`); return (u.hostname + u.pathname).replace(/^www\./, "").replace(/\/$/, ""); } catch { return url; } };

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPreview(false)}
                className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-1/2 top-1/2 z-[70] h-[80vh] w-[calc(100vw-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-[6px] sm:border-[8px] border-card bg-card shadow-2xl ring-1 ring-border"
              >
                {/* Fake notch */}
                <div className="absolute left-1/2 top-0 z-50 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-card" />

                {/* Close */}
                <button
                  onClick={() => setShowPreview(false)}
                  className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Scrollable content — matches PublicProfile layout */}
                <div className="h-full w-full overflow-y-auto bg-background scrollbar-hide px-3 pt-8">

                  {/* Flippable Business Card */}
                  <div className="mb-4">
                    <FlippableCard profile={{ name, title, phone, email, office, links }} />
                  </div>

                  {/* Profile Hero Card */}
                  <div className="bg-card backdrop-blur-2xl rounded-[2rem] border border-border shadow-lg shadow-black/20 overflow-hidden flex flex-col">

                    {/* Cover Banner */}
                    <div className="relative h-24 w-full overflow-hidden">
                      {coverUrl ? (
                        <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500">
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #3B82F6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B5CF6 0%, transparent 40%)" }} />
                        </div>
                      )}
                    </div>

                    {/* Avatar + Identity */}
                    <div className="flex flex-col items-center px-5 pb-5">
                      {/* Avatar — overlaps cover */}
                      <div className="relative -mt-10 mb-3">
                        <div className="h-20 w-20 rounded-full border-4 border-white shadow-[0_8px_24px_rgba(3,2,19,0.18)] overflow-hidden bg-gradient-to-br from-[#030213] to-[#3B82F6] flex items-center justify-center">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-white select-none">
                              {name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                      </div>

                      <h1 className="text-xl font-black tracking-tight text-foreground text-center leading-tight">{name || "Your Name"}</h1>
                      {title && <p className="text-sm font-bold text-blue-400 mt-0.5 text-center">{title}</p>}
                      {department && (
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building className="h-3 w-3" />{department}
                        </p>
                      )}
                      {bio && <p className="mt-3 text-xs font-medium leading-relaxed text-foreground/70 text-center max-w-[260px]">{bio}</p>}

                      {/* Action Buttons */}
                      <div className="mt-5 flex flex-col gap-2.5 w-full">
                        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-br from-foreground to-purple-900 text-white text-sm font-bold shadow-lg shadow-black/30">
                          <Download className="h-4 w-4" /> Save Contact
                        </button>
                        <div className="flex gap-2">
                          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-card/90 border border-border text-foreground text-sm font-bold shadow-sm">
                            <Users className="h-4 w-4" /> Exchange
                          </button>
                          <button className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-card/90 border border-border text-foreground shadow-sm">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Contact Icons */}
                    <div className="flex justify-around gap-2 border-y border-border py-4 px-5">
                      {[
                        { icon: <Mail className="h-4 w-4" />, label: "Email", color: "text-blue-400" },
                        { icon: <Phone className="h-4 w-4" />, label: "Call", color: "text-purple-400" },
                        { icon: <MapPin className="h-4 w-4" />, label: "Office", color: "text-foreground" },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center gap-1.5">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 backdrop-blur-xl ${item.color} shadow-lg shadow-black/10 border border-border`}>
                            {item.icon}
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Links Section */}
                    {links.filter(l => l.title).length > 0 && (
                      <div className="px-4 py-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-2">Links</p>
                        {links.filter(l => l.title).map((link) => {
                          const color = getColor(link.type);
                          const initial = getInitial(link.title, link.type);
                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between rounded-xl bg-card/80 backdrop-blur-xl px-3 py-3 shadow-lg shadow-black/10 border border-border"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-black shadow-sm" style={{ backgroundColor: color }}>
                                  {initial}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground leading-tight truncate">{link.title}</p>
                                  {link.url && <p className="text-[10px] font-medium text-muted-foreground truncate">{stripUrl(link.url)}</p>}
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="pb-4" />
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  )
}