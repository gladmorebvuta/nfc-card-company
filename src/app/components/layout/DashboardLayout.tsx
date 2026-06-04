import * as React from "react"
import { Outlet, NavLink, useNavigate } from "react-router"
import { Home, UserCircle, Users, Calendar, Settings, Bell, Search, LogOut, ChevronRight, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "../../utils"
import { useProfile } from "../../contexts/ProfileContext"
import { BrandaptLogo } from "../BrandaptLogo"
import { toast } from "sonner"
import { useAuth } from "../../contexts/AuthContext"
import { useNotifications } from "../../hooks/useNotifications"

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, nfcProfile } = useProfile();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [_searchFocused, setSearchFocused] = React.useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const navItems = [
    { icon: Home, label: "Overview", path: "/dashboard" },
    { icon: UserCircle, label: "Edit Card", path: "/dashboard/edit" },
    { icon: Users, label: "Connections", path: "/dashboard/connections" },
    { icon: Calendar, label: "Event Mode", path: "/dashboard/events" },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate("/dashboard/connections");
      toast(`Searching for "${searchQuery}"...`);
      setSearchQuery("");
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground selection:bg-[#3B82F6]/30 relative overflow-x-hidden">

      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] max-w-[500px] h-[60vw] max-h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] max-w-[400px] h-[50vw] max-h-[400px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      {/* Floating Desktop Sidebar */}
      <aside className="fixed inset-y-4 left-4 z-50 hidden w-[88px] flex-col items-center rounded-[2.5rem] bg-background/30 border border-border/25 py-8 backdrop-blur-xl lg:flex shadow-lg shadow-black/25">
        
        {/* Brand Mark */}
        <div className="mb-6">
          <BrandaptLogo className="h-8" />
        </div>

        {/* Avatar / Profile Trigger */}
        <div className="relative mb-8 group cursor-pointer">
          <img src={profile.avatar || user?.photoURL || ""} alt="Avatar" className="h-12 w-12 rounded-full border-2 border-border shadow-sm object-cover" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full bg-[#3B82F6] border-2 border-background" />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) => cn(
                "group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300",
                isActive
                  ? "bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40 shadow-sm border border-border/40"
              )}
              title={item.label}
            >
              {({ isActive: _isActive }) => (
                <>
                  <item.icon className={cn("h-6 w-6 transition-transform group-active:scale-95")} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full text-muted-foreground shadow-sm border border-border/40 transition-all hover:text-foreground hover:bg-background/40 active:scale-95"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="h-6 w-6" />
          </button>
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full text-muted-foreground shadow-sm border border-border/40 transition-all hover:text-foreground hover:bg-background/40 active:scale-95"
            onClick={() => nfcProfile?.uniqueId ? navigate(`/c/${nfcProfile.uniqueId}`) : undefined}
            title="View Public Profile"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-[120px] pb-28 sm:pb-28 lg:pb-0 relative w-full min-w-0">
        
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 sm:h-20 lg:h-24 items-center justify-between px-4 sm:px-6 lg:px-12 pt-2 sm:pt-4">
          <div className="lg:hidden flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            <img src={profile.avatar || user?.photoURL || ""} alt="Avatar" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-border shadow-sm object-cover shrink-0" />
            <BrandaptLogo className="h-6 sm:h-7" />
          </div>

          <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span>Home</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Dashboard</span>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-6 shrink-0">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-3 rounded-full bg-background/30 backdrop-blur-xl border border-border/25 px-5 py-2.5 shadow-sm">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-48 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground transition-all duration-300 focus:w-64 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </form>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-background/30 backdrop-blur-xl border border-border/25 text-muted-foreground shadow-sm transition-all hover:bg-background/50 hover:text-foreground hover:shadow-md active:scale-95"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3B82F6] px-1 text-[10px] font-bold text-white ring-2 ring-background">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <Bell className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 rounded-2xl bg-background/80 backdrop-blur-xl border border-border/30 shadow-xl z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="text-sm font-bold text-foreground">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              await markAllAsRead();
                              toast.success("All marked as read");
                            }}
                            className="text-xs font-semibold text-[#3B82F6] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                          <p className="text-xs text-muted-foreground mt-1">We'll notify you when something happens</p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              className={cn(
                                "w-full text-left px-4 py-3 hover:bg-background/50 transition-colors border-b border-border last:border-0",
                                !n.isRead && "bg-background/30",
                              )}
                              onClick={async () => {
                                if (!n.isRead) await markAsRead(n.id);
                                setShowNotifications(false);
                                if (n.link) navigate(n.link);
                              }}
                            >
                              <div className="flex items-start gap-2">
                                {!n.isRead && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#3B82F6]" />
                                )}
                                <div className={cn(!n.isRead ? "" : "pl-4")}>
                                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {n.createdAt?.toDate
                                      ? formatTimeAgo(n.createdAt.toDate())
                                      : "Just now"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="hidden lg:flex items-center gap-2 bg-background/30 backdrop-blur-xl rounded-full py-1.5 pr-2 pl-4 border border-border/25 shadow-sm">
                <span className="text-sm font-bold text-foreground mr-2">{nfcProfile?.displayName || profile.name || "User"}</span>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/90 transition-colors"
                  onClick={async () => {
                    await signOut();
                    toast.success("Logged out successfully!");
                    navigate("/login");
                  }}
                  title="Log out"
                >
                  <LogOut className="h-4 w-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-12 lg:pt-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Floating Pill Nav */}
      <nav className="fixed bottom-5 left-4 right-4 z-50 flex h-[60px] items-center justify-around rounded-full border border-border/25 bg-background/60 px-3 shadow-lg shadow-black/25 backdrop-blur-2xl lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className="group outline-none"
            title={item.label}
          >
            {({ isActive }) => (
              <div className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                isActive
                  ? "bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/30"
                  : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-background/95 backdrop-blur-2xl p-8 shadow-2xl border border-border/30"
            >
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-background/50 flex items-center justify-center text-muted-foreground hover:bg-background/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-2xl font-black text-foreground mb-6">Settings</h3>
              <div className="space-y-4">
                {[
                  { label: "Edit Profile", action: () => { navigate("/dashboard/edit"); setShowSettings(false); } },
                  { label: "Notification Preferences", action: () => { toast("Notification settings coming in V2"); setShowSettings(false); } },
                  { label: "Privacy & Security", action: () => { toast("Privacy settings coming in V2"); setShowSettings(false); } },
                  { label: "Billing & Subscription", action: () => { toast("Billing portal coming in V3"); setShowSettings(false); } },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full text-left px-4 py-3.5 rounded-xl border border-border/30 bg-background/30 hover:bg-background/50 hover:shadow-md transition-all text-sm font-semibold text-foreground flex items-center justify-between"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}