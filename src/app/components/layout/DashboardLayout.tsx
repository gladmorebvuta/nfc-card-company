import * as React from "react"
import { Outlet, NavLink, useNavigate } from "react-router"
import { Home, UserCircle, Users, Settings, Bell, Search, LogOut, ChevronRight, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "../../utils"
import { useProfile } from "../../contexts/ProfileContext"
import mcgLogoColour from "../../../assets/MCG Logo Colour.svg";
import mcgIconColour from "../../../assets/MCG Icon Colour.svg";
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
  const [searchFocused, setSearchFocused] = React.useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const navItems = [
    { icon: Home, label: "Overview", path: "/dashboard" },
    { icon: UserCircle, label: "Edit Card", path: "/dashboard/edit" },
    { icon: Users, label: "Connections", path: "/dashboard/connections" },
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
    <div className="flex min-h-screen bg-gradient-to-tr from-[#FFF7EE] via-[#FFEDD5] to-[#EDE9FE] font-sans text-gray-900 selection:bg-[#F97316]/30 relative overflow-x-hidden">

      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] max-w-[500px] h-[60vw] max-h-[500px] rounded-full bg-white opacity-40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] max-w-[400px] h-[50vw] max-h-[400px] rounded-full bg-white opacity-50 blur-[100px] pointer-events-none" />

      {/* Floating Desktop Sidebar */}
      <aside className="fixed inset-y-4 left-4 z-50 hidden w-[88px] flex-col items-center rounded-[2.5rem] bg-white/40 border border-white/60 py-8 backdrop-blur-xl lg:flex shadow-[0_8px_32px_rgba(46,16,101,0.04)]">
        
        {/* Brand Mark */}
        <div className="mb-6">
          <img src={mcgIconColour} alt="MCG" className="h-10 w-10" />
        </div>

        {/* Avatar / Profile Trigger */}
        <div className="relative mb-8 group cursor-pointer">
          <img src={profile.avatar || user?.photoURL || ""} alt="Avatar" className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full bg-[#F97316] border-2 border-white" />
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
                  ? "bg-[#F97316] text-white shadow-lg shadow-[#F97316]/30" 
                  : "bg-white text-gray-600 hover:bg-white/80 hover:text-[#2E1065] shadow-sm border border-white/60"
              )}
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-6 w-6 transition-transform group-active:scale-95")} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm border border-white/60 transition-all hover:bg-white/80 hover:text-[#2E1065] active:scale-95"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="h-6 w-6" />
          </button>
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm border border-white/60 transition-all hover:bg-white/80 hover:text-[#2E1065] active:scale-95"
            onClick={() => nfcProfile?.uniqueId ? navigate(`/c/${nfcProfile.uniqueId}`) : undefined}
            title="View Public Profile"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-[120px] pb-16 sm:pb-20 lg:pb-0 z-10 relative w-full min-w-0">
        
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 sm:h-20 lg:h-24 items-center justify-between px-4 sm:px-6 lg:px-12 pt-2 sm:pt-4">
          <div className="lg:hidden flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            <img src={profile.avatar || user?.photoURL || ""} alt="Avatar" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-white shadow-sm object-cover shrink-0" />
            <img src={mcgLogoColour} alt="Middlesex Consulting Group" className="h-7 sm:h-8 w-auto" />
          </div>
          
          <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-gray-500">
            <span>Home</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#2E1065]">Dashboard</span>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-6 shrink-0">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-3 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-5 py-2.5 shadow-sm">
              <Search className="h-5 w-5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-48 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500 transition-all duration-300 focus:w-64 font-medium"
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
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-white/60 text-gray-600 shadow-sm transition-all hover:bg-white hover:text-[#2E1065] hover:shadow-md active:scale-95"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <Bell className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-xl z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-bold text-[#2E1065]">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              await markAllAsRead();
                              toast.success("All marked as read");
                            }}
                            className="text-xs font-semibold text-[#F97316] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-400">No notifications yet</p>
                          <p className="text-xs text-gray-300 mt-1">We'll notify you when something happens</p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              className={cn(
                                "w-full text-left px-4 py-3 hover:bg-[#FFF7EE] transition-colors border-b border-gray-50 last:border-0",
                                !n.isRead && "bg-[#FFF7EE]/50",
                              )}
                              onClick={async () => {
                                if (!n.isRead) await markAsRead(n.id);
                                setShowNotifications(false);
                                if (n.link) navigate(n.link);
                              }}
                            >
                              <div className="flex items-start gap-2">
                                {!n.isRead && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#F97316]" />
                                )}
                                <div className={cn(!n.isRead ? "" : "pl-4")}>
                                  <p className="text-sm font-semibold text-[#2E1065]">{n.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">
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
              
              <div className="hidden lg:flex items-center gap-2 bg-white/50 backdrop-blur-md rounded-full py-1.5 pr-2 pl-4 border border-white/60 shadow-sm">
                <span className="text-sm font-bold text-[#2E1065] mr-2">{profile.name || user?.displayName || "User"}</span>
                <button 
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2E1065] text-white shadow-md hover:bg-[#2E1065]/90 transition-colors"
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

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 sm:h-20 items-center justify-around border-t border-white/40 bg-white/70 pb-safe backdrop-blur-2xl lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 p-2 text-[10px] font-bold transition-all duration-300",
              isActive ? "text-[#F97316]" : "text-gray-500 hover:text-[#2E1065]"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
                  isActive ? "bg-[#F97316] text-white shadow-md shadow-[#F97316]/20" : ""
                )}>
                  <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "")} />
                </div>
                {item.label}
              </>
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
              className="fixed inset-0 z-[60] bg-[#2E1065]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-white/95 backdrop-blur-2xl p-8 shadow-2xl border border-white/60"
            >
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-2xl font-black text-[#2E1065] mb-6">Settings</h3>
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
                    className="w-full text-left px-4 py-3.5 rounded-xl border border-white/60 bg-white/40 hover:bg-white hover:shadow-md transition-all text-sm font-semibold text-[#2E1065] flex items-center justify-between"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
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