"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Award, Search, Calendar, Sparkles, X, Clock, ArrowDownCircle, Trash2 } from "lucide-react";
import { useApp, Achievement } from "../context/AppContext";

function TechBadge({ tech }: { tech: string }) {
  const normalized = tech.trim().toLowerCase();
  let colorClass = "";
  if (normalized === "go" || normalized === "golang") {
    colorClass = "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20";
  } else if (normalized === "typescript" || normalized === "ts") {
    colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  } else if (normalized === "python") {
    colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
  } else if (normalized === "docker" || normalized === "dockerfile") {
    colorClass = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20";
  } else if (normalized === "react" || normalized === "next.js" || normalized === "nextjs" || normalized === "javascript" || normalized === "js") {
    colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
  } else if (normalized === "tailwind" || normalized === "tailwindcss" || normalized === "css" || normalized === "sass") {
    colorClass = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20";
  } else if (normalized === "sqlite" || normalized === "sql" || normalized === "postgres" || normalized === "postgresql" || normalized === "database" || normalized === "db") {
    colorClass = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
  } else if (normalized === "git" || normalized === "github") {
    colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
  } else if (normalized === "rust") {
    colorClass = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
  } else {
    colorClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-md border font-mono tracking-wide ${colorClass}`}>
      {tech}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  let colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border font-mono ${colorClass}`}>
      {status}
    </span>
  );
}

function extractTechKeywords(text: string): string[] {
  if (!text) return [];
  const keywords = [
    { label: "Go", patterns: [/\bgo\b/i, /\bgolang\b/i] },
    { label: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
    { label: "Python", patterns: [/\bpython\b/i] },
    { label: "Docker", patterns: [/\bdocker\b/i, /\bdockerfile\b/i] },
    { label: "Next.js", patterns: [/\bnext\.js\b/i, /\bnextjs\b/i] },
    { label: "React", patterns: [/\breact\b/i] },
    { label: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
    { label: "Tailwind CSS", patterns: [/\btailwind\b/i, /\btailwindcss\b/i] },
    { label: "SQLite", patterns: [/\bsqlite\b/i] },
    { label: "SQL", patterns: [/\bsql\b/i] },
    { label: "Git", patterns: [/\bgit\b/i] },
    { label: "Rust", patterns: [/\brust\b/i] },
  ];

  const found: string[] = [];
  keywords.forEach(kw => {
    for (const pattern of kw.patterns) {
      if (pattern.test(text)) {
        found.push(kw.label);
        break;
      }
    }
  });
  return found;
}

export default function AchievementsVault() {
  const { deleteAchievement } = useApp();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);

  const limit = 12;

  // Initial fetch when filters change
  const fetchInitialAchievements = () => {
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

    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    params.set("limit", limit.toString());
    params.set("offset", "0");
    if (startStr) params.set("start_date", startStr);
    if (endStr) params.set("end_date", endStr);

    fetch(`/api/achievements?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAchievements(data);
          setHasMore(data.length === limit);
        } else {
          setAchievements([]);
          setHasMore(false);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load achievements", err);
        setAchievements([]);
        setHasMore(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInitialAchievements();
  }, [search, dateRange, customStartDate, customEndDate]);

  // Handle Load More (Incremental appending for Infinite Scroll style)
  const handleLoadMore = () => {
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

    const currentOffset = achievements.length;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    params.set("limit", limit.toString());
    params.set("offset", currentOffset.toString());
    if (startStr) params.set("start_date", startStr);
    if (endStr) params.set("end_date", endStr);

    fetch(`/api/achievements?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAchievements(prev => [...prev, ...data]);
          setHasMore(data.length === limit);
        } else {
          setHasMore(false);
        }
      })
      .catch(err => {
        console.error("Failed to load more achievements", err);
        setHasMore(false);
      });
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this achievement milestone?")) return;
    await deleteAchievement(id);
    fetchInitialAchievements();
  };

  return (
    <div className="flex flex-col space-y-6">
      
      {/* FILTER CONTROLS GRID */}
      <section className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search weekly summaries..."
              className="w-full pl-9 pr-3 py-2 text-[11px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono transition-all"
            />
          </div>

          {/* DATE RANGE FILTER */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 text-[11px] bg-slate-950 border border-slate-900 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono transition-all cursor-pointer"
            >
              <option value="all">📅 All Time</option>
              <option value="week">📅 Last 7 Days</option>
              <option value="month">📅 Last 30 Days</option>
              <option value="three_months">📅 Last 3 Months</option>
              <option value="custom">📅 Custom Date Range...</option>
            </select>
          </div>

          {/* TOTAL SUMMARY COUNTER */}
          <div className="flex items-center justify-between gap-2 bg-slate-950 px-4 py-2 border border-slate-900 rounded-lg font-mono text-[10px]">
            <span className="text-zinc-500 uppercase font-bold tracking-wider">Milestones Vault:</span>
            <span className="font-black text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/10">
              {achievements.length} loaded
            </span>
          </div>

        </div>

        {/* CUSTOM DATE RANGE ROW */}
        {dateRange === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">From Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-[10px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">To Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-[10px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CORE GRID GALLERY */}
      <section className="space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3 font-mono">
            <div className="h-6 w-6 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin mx-auto" />
            <p className="text-[10px] text-teal-400">Loading achievements archive...</p>
          </div>
        ) : achievements.length === 0 ? (
          <div className="p-24 border border-dashed border-slate-900 rounded-3xl text-center text-zinc-500 text-xs font-mono">
            📭 No approved milestone summaries stored inside the SQLite vault database yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveAchievement(item)}
                  className="bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-2xl p-6 transition-all duration-300 shadow-sm cursor-pointer relative group flex flex-col justify-between hover:bg-slate-950/60"
                >
                  <div className="space-y-4">
                    {/* Badge and Title Row */}
                    <div className="flex justify-between items-start gap-1 font-mono">
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 flex items-center gap-1.5 uppercase font-bold">
                          <Clock className="h-3 w-3" /> Milestone Summary
                        </span>
                        <div className="text-[9px] font-black text-slate-200 uppercase tracking-wide mt-1">
                          {new Date(item.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - {new Date(item.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <StatusBadge status="Sealed" />
                    </div>

                    {/* Markdown snippet container */}
                    <div className="text-[10px] text-zinc-400 line-clamp-5 leading-relaxed prose dark:prose-invert prose-xs max-w-none font-sans py-2.5 border-t border-slate-900 border-b">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{item.content_md}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Card bottom details */}
                  <div className="flex justify-between items-center pt-4 font-mono text-[9px] text-zinc-500">
                    <span className="font-bold text-[8px] tracking-wider uppercase">Saved in vault: #{item.id}</span>
                    <div className="flex items-center gap-2">
                      {extractTechKeywords(item.content_md).slice(0, 2).map((tech, i) => (
                        <TechBadge key={`${tech}-${i}`} tech={tech} />
                      ))}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors"
                        title="Delete Milestone"
                      >
                        <Trash2 className="h-3 w-3" />
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
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-zinc-300 hover:text-white border border-slate-800 rounded-xl transition-all cursor-pointer font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <ArrowDownCircle className="h-4 w-4 text-teal-400 animate-bounce" /> Load More Milestones
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* IMMERSIVE LIGHTBOX DETAIL MODAL */}
      {activeAchievement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-850 flex justify-between items-center font-mono">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-teal-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-100">Weekly Achievement Detail</h3>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">
                    {new Date(activeAchievement.start_date).toLocaleDateString(undefined, { month: "long", day: "numeric" })} - {new Date(activeAchievement.end_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAchievement(null)}
                className="h-8 w-8 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-950 shadow-inner flex flex-col">
              <div className="prose dark:prose-invert max-w-none text-zinc-300 font-sans text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeAchievement.content_md}</ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/35 border-t border-slate-850 text-[9px] text-zinc-500 font-mono flex justify-between items-center">
              <span>Saved in vault database ID: #{activeAchievement.id}</span>
              <span>Committed: {new Date(activeAchievement.created_at).toLocaleString()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
