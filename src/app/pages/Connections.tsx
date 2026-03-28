import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Download, Search, Filter, MoreHorizontal, Mail, MapPin, Trash2, X } from "lucide-react"
import { Card, CardContent } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { toast } from "sonner"
import { generateLeadVCard, exportLeadsCSV } from "../utils/vcard"
import { useExchanges } from "../hooks/useExchanges"

const PAGE_SIZE = 4;

export function Connections() {
  const { exchanges, loading: exchangesLoading } = useExchanges();
  const [search, setSearch] = React.useState("");
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const [filterCompany, setFilterCompany] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [contextMenu, setContextMenu] = React.useState<string | null>(null);

  const allLeads = React.useMemo(() => {
    return exchanges.map((e) => ({
      id: e.id,
      name: e.visitorName,
      title: "",
      company: e.visitorCompany || "",
      email: e.visitorEmail,
      date: e.createdAt?.toDate?.()?.toLocaleDateString() || "",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(e.visitorName)}&background=EDE9FE&color=2E1065`,
      location: e.location
        ? [e.location.city, e.location.country].filter(Boolean).join(", ") || null
        : null,
    }));
  }, [exchanges]);

  const companies = Array.from(new Set(allLeads.map(l => l.company)));

  const filtered = allLeads.filter((lead) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || lead.name.toLowerCase().includes(q) || lead.title.toLowerCase().includes(q) || lead.company.toLowerCase().includes(q);
    const matchesFilter = !filterCompany || lead.company === filterCompany;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 sm:space-y-8 min-w-0"
    >
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2E1065]">Connections</h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Manage your leads and saved contacts</p>
        </div>
        <div className="flex items-center gap-2 relative flex-wrap">
          <div className="relative">
            <Button 
              variant="outline" 
              className={`gap-2 bg-white/50 border-white shadow-sm hover:bg-white text-[#2E1065] ${filterCompany ? 'ring-2 ring-[#F97316]/40' : ''}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <Filter className="h-4 w-4" /> {filterCompany || "Filter"}
            </Button>
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-xl z-50 overflow-hidden"
                >
                  <button 
                    onClick={() => { setFilterCompany(null); setShowFilterMenu(false); setPage(0); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-[#FFF7EE] transition-colors ${!filterCompany ? 'text-[#F97316] font-bold' : 'text-[#2E1065]'}`}
                  >
                    All Companies
                  </button>
                  {companies.map(c => (
                    <button 
                      key={c}
                      onClick={() => { setFilterCompany(c); setShowFilterMenu(false); setPage(0); }}
                      className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-[#FFF7EE] transition-colors border-t border-gray-100 ${filterCompany === c ? 'text-[#F97316] font-bold' : 'text-[#2E1065]'}`}
                    >
                      {c}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button 
            className="gap-2 shadow-lg shadow-[#F97316]/20 bg-[#2E1065] hover:bg-[#2E1065]/90 text-white rounded-xl"
            onClick={() => {
              exportLeadsCSV(allLeads);
              toast.success("CSV exported successfully!");
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-white/40 p-4 sm:p-6">
          <div className="flex w-full sm:max-w-md items-center gap-2 rounded-2xl border border-white/60 bg-white/40 px-3 sm:px-4 py-2 shadow-sm focus-within:bg-white focus-within:border-[#F97316]/50 transition-all">
            <Search className="h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by name, company, or job title..." 
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500 font-medium"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(0); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/30 text-xs font-bold uppercase text-gray-500 border-b border-white/40">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Contact</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Company</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">Location</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Date Added</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {exchangesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Loading connections...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-gray-400 font-medium">{search || filterCompany ? "No connections match your search." : "No connections yet — share your card to start collecting leads."}</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((lead) => (
                  <tr key={lead.id} className="group transition-colors hover:bg-white/60">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <img src={lead.avatar} alt={lead.name} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl border-2 border-white object-cover shadow-sm shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-[#2E1065] text-sm sm:text-base truncate">{lead.name}</div>
                          <div className="text-xs font-medium text-gray-500 truncate">{lead.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell font-medium text-gray-600">
                      {lead.company}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                      {lead.location ? (
                        <div className="flex items-center gap-1 text-gray-500 font-medium">
                          <MapPin className="h-3.5 w-3.5" /> {lead.location}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell text-gray-500 font-medium">
                      {lead.date}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hidden lg:flex gap-2 text-xs font-semibold text-[#2E1065] hover:text-[#F97316] hover:bg-white/60 rounded-xl"
                          onClick={() => {
                            generateLeadVCard(lead);
                            toast.success(`${lead.name}'s vCard downloaded!`);
                          }}
                        >
                          <Download className="h-4 w-4" /> Save vCard
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-[#F97316] hover:bg-white/60 rounded-xl lg:hidden" 
                          title="Save vCard"
                          onClick={() => {
                            generateLeadVCard(lead);
                            toast.success(`${lead.name}'s vCard downloaded!`);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-[#2E1065] hover:bg-white/60 rounded-xl"
                          onClick={() => {
                            if (lead.email) window.location.href = `mailto:${lead.email}`;
                          }}
                          title={`Email ${lead.name}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-400 hover:text-[#2E1065] hover:bg-white/60 rounded-xl"
                            onClick={() => setContextMenu(contextMenu === lead.id ? null : lead.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          <AnimatePresence>
                            {contextMenu === lead.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-xl z-50 overflow-hidden"
                              >
                                <button 
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#2E1065] hover:bg-[#FFF7EE] transition-colors flex items-center gap-2"
                                  onClick={() => {
                                    generateLeadVCard(lead);
                                    toast.success(`${lead.name}'s vCard downloaded!`);
                                    setContextMenu(null);
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5" /> Download vCard
                                </button>
                                <button 
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#2E1065] hover:bg-[#FFF7EE] transition-colors flex items-center gap-2 border-t border-gray-100"
                                  onClick={() => {
                                    const info = [lead.name, lead.email, lead.company].filter(Boolean).join(", ");
                                    navigator.clipboard.writeText(info);
                                    toast.success("Contact info copied!");
                                    setContextMenu(null);
                                  }}
                                >
                                  <Mail className="h-3.5 w-3.5" /> Copy Info
                                </button>
                                <button 
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                                  onClick={() => {
                                    toast("Connection removed (demo)");
                                    setContextMenu(null);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/40 p-3 sm:p-6 text-xs sm:text-sm font-medium text-gray-500 bg-white/20">
            <div>Showing <span className="font-bold text-[#2E1065]">{filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}</span>–<span className="font-bold text-[#2E1065]">{Math.min((page + 1) * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-[#2E1065]">{filtered.length}</span></div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 bg-white/40 border-white/60 text-gray-400" 
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 bg-white border-white text-[#2E1065] hover:text-[#F97316] shadow-sm" 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
