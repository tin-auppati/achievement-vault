"use client";

import { useEffect, useState } from "react";
import { Folder, Search, Calendar, ChevronLeft, ChevronRight, Activity, Award, X, Clock, ArrowDownCircle, Trash2, Edit3, Save, Eye } from "lucide-react";
import { useApp, Achievement } from "../context/AppContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import TechBadge from "../components/TechBadge";
import StatusBadge from "../components/StatusBadge";
import { extractTechKeywords } from "../utils/techUtils";

export default function VaultGallery() {
  const { deleteAchievement, updateAchievement, showToast } = useApp();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // IMMERSIVE LIGHTBOX STATE
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  const limit = 9;

  const fetchAchievements = async (currentPage: number, append: boolean = false) => {
    try {
      setLoading(true);
      let startStr = "";
      let endStr = "";

      if (dateRange === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startStr = d.toISOString().split("T")[0];
      } else if (dateRange === "month") {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        startStr = d.toISOString().split("T")[0];
      } else if (dateRange === "three_months") {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        startStr = d.toISOString().split("T")[0];
      } else if (dateRange === "custom") {
        startStr = customStartDate;
        endStr = customEndDate;
      }

      const offset = (currentPage - 1) * limit;
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", limit.toString());
      params.set("offset", offset.toString());
      if (startStr) params.set("start_date", startStr);
      if (endStr) params.set("end_date", endStr);

      const res = await fetch(`/api/achievements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load approved milestones");
      const data = await res.json();

      if (Array.isArray(data)) {
        if (append) {
          setAchievements(prev => [...prev, ...data]);
        } else {
          setAchievements(data);
        }
        setHasMore(data.length === limit);
      } else {
        if (!append) setAchievements([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Could not retrieve milestones list.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reset page and reload on search/filter changes
  useEffect(() => {
    setPage(1);
    fetchAchievements(1, false);
  }, [search, dateRange, customStartDate, customEndDate]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAchievements(nextPage, true);
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to remove this milestone from the Vault permanently?")) return;
    
    try {
      await deleteAchievement(id);
      if (activeAchievement && activeAchievement.id === id) {
        setActiveAchievement(null);
        setIsEditing(false);
      }
      // Reload current list
      setPage(1);
      fetchAchievements(1, false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = () => {
    if (!activeAchievement) return;
    setEditedContent(activeAchievement.content_md);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!activeAchievement) return;
    try {
      await updateAchievement(activeAchievement.id, editedContent);
      setActiveAchievement((prev: Achievement | null) => prev ? { ...prev, content_md: editedContent } : null);
      setIsEditing(false);
      // Refresh database records
      fetchAchievements(1, false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 font-mono pb-12 p-8 max-w-7xl mx-auto animate-fade-in transition-colors">
      
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-900">
        <div className="space-y-1">
          <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1.5 uppercase font-bold tracking-wider">
            <Award className="h-4 w-4" /> Weekly Milestones Archives
          </span>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase">
            Milestones Gallery
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-450 font-sans leading-relaxed">
            Browse and refine finalized accomplishment reports captured from repository git activity feeds.
          </p>
        </div>
      </section>

      {/* ADVANCED FILTERING CONTROL BOARD */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550 pointer-events-none">
              <Search className="h-4 w-4 text-zinc-550" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search weekly summaries..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-150 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono transition-all"
            />
          </div>

          {/* DATE RANGE FILTER */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-zinc-800 dark:text-zinc-350 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-mono transition-all cursor-pointer"
            >
              <option value="all">📅 All Time</option>
              <option value="week">📅 Last 7 Days</option>
              <option value="month">📅 Last 30 Days</option>
              <option value="three_months">📅 Last 3 Months</option>
              <option value="custom">📅 Custom Date Range...</option>
            </select>
          </div>

          {/* TOTAL SUMMARY COUNTER */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono">
            <span className="text-zinc-550 dark:text-zinc-455 uppercase font-black tracking-wider">Milestones Vault:</span>
            <span className="font-black text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
              {achievements.length} loaded
            </span>
          </div>

        </div>

        {/* CUSTOM DATE RANGE ROW */}
        {dateRange === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-450 uppercase block">From Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-lg text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-455 uppercase block">To Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-lg text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CORE GRID GALLERY */}
      <section className="space-y-6">
        {loading && achievements.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="h-6 w-6 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-teal-600 dark:text-teal-400 font-bold">Loading achievements archive...</p>
          </div>
        ) : achievements.length === 0 ? (
          <div className="p-24 border border-dashed border-slate-200 dark:border-slate-900 rounded-3xl text-center text-zinc-500 text-sm leading-relaxed">
            📭 No approved milestone summaries stored inside the SQLite vault database yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveAchievement(item)}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800 rounded-3xl p-6 transition-all duration-300 shadow-sm cursor-pointer relative group flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 animate-fade-in"
                >
                  <div className="space-y-4">
                    {/* Badge and Title Row */}
                    <div className="flex justify-between items-start gap-1 font-mono">
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-450 flex items-center gap-1.5 uppercase font-black">
                          <Clock className="h-3.5 w-3.5" /> Milestone Summary
                        </span>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide mt-1">
                          {new Date(item.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - {new Date(item.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <StatusBadge status="Sealed" />
                    </div>

                    {/* Markdown snippet container */}
                    <div className="text-sm text-zinc-800 dark:text-zinc-300 line-clamp-5 leading-relaxed prose dark:prose-invert prose-base max-w-none font-sans py-3 border-t border-slate-200 dark:border-slate-900 border-b">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{item.content_md}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Card bottom details */}
                  <div className="flex justify-between items-center pt-4 font-mono text-xs text-zinc-500">
                    <span className="font-bold text-[10px] tracking-wider uppercase text-zinc-600 dark:text-zinc-400">Saved in vault: #{item.id}</span>
                    <div className="flex items-center gap-2">
                      {extractTechKeywords(item.content_md).slice(0, 2).map((tech, i) => (
                        <TechBadge key={`${tech}-${i}`} tech={tech} />
                      ))}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete Milestone"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Trigger Button for Infinite Scroll */}
            {hasMore && (
              <div className="text-center pt-6 font-mono">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  <ArrowDownCircle className="h-4 w-4 text-teal-500 animate-bounce" /> Load More Milestones
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* IMMERSIVE LIGHTBOX DETAIL MODAL - INTEGRATED DUAL-MODE EDIT/PREVIEW */}
      {activeAchievement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in font-mono">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-teal-500" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Weekly Achievement Detail</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-1">
                    {new Date(activeAchievement.start_date).toLocaleDateString(undefined, { month: "long", day: "numeric" })} - {new Date(activeAchievement.end_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Save/Edit Mode Toggle Buttons */}
                {isEditing ? (
                  <button
                    onClick={handleSaveEdit}
                    className="h-8 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-650 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <Save className="h-3.5 w-3.5 text-emerald-500" /> Save Changes
                  </button>
                ) : (
                  <button
                    onClick={handleStartEdit}
                    className="h-8 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-teal-500" /> Edit Milestone
                  </button>
                )}

                {isEditing && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="h-8 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={() => handleDelete(activeAchievement.id)}
                  className="h-8 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete
                </button>

                <button
                  onClick={() => {
                    setActiveAchievement(null);
                    setIsEditing(false);
                  }}
                  className="h-8 w-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 shadow-inner flex flex-col">
              {isEditing ? (
                <div className="flex-1 flex flex-col h-full space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Edit3 className="h-3.5 w-3.5 text-teal-500" /> Markdown Source Editor
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="flex-1 min-h-[350px] w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed text-base shadow-inner"
                    placeholder="Edit milestone description in markdown..."
                  />
                </div>
              ) : (
                <div className="prose dark:prose-invert prose-base lg:prose-lg max-w-none text-zinc-800 dark:text-zinc-300 font-sans leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeAchievement.content_md}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border-t border-slate-200 dark:border-slate-850 text-xs text-zinc-550 dark:text-zinc-500 flex justify-between items-center">
              <span>Saved in vault database ID: #{activeAchievement.id}</span>
              <span>Committed: {new Date(activeAchievement.created_at).toLocaleString()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
