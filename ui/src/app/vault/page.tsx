"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Award, Search, Calendar, ChevronLeft, Sparkles, X, Folder, Clock, ArrowDownCircle } from "lucide-react";

interface Achievement {
  id: number;
  content_md: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

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
  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/25 selection:text-teal-200">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4.5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-8 w-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shadow-sm"
              title="Return to Main Dashboard"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-teal-400 animate-pulse" />
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-100 font-mono">Weekly Achievements Vault</h1>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">Explore full historic, Gemini AI compiled and approved developer milestones.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
            <span>Database state:</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-zinc-300 uppercase">Synchronized</span>
          </div>
        </div>
      </header>

      {/* FILTER CONTROLS GRID */}
      <section className="bg-slate-900/40 border-b border-slate-900 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* SEARCH BAR */}
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search achievements contents, markdown titles, keywords..."
              className="w-full pl-9 pr-3 py-2 text-[11px] bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-mono transition-all shadow-inner"
            />
          </div>

          {/* DATE RANGE CHANGER */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 text-[11px] bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-mono transition-all cursor-pointer shadow-inner"
            >
              <option value="all">📅 All Approved Periods</option>
              <option value="week">📅 Last 7 Days</option>
              <option value="month">📅 Last 30 Days</option>
              <option value="three_months">📅 Last 3 Months</option>
              <option value="custom">📅 Custom Date Range...</option>
            </select>
          </div>

        </div>

        {/* CUSTOM DATE PICKERS PANEL */}
        {dateRange === "custom" && (
          <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">Start Boundary</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-[10px] bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">End Boundary</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-[10px] bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CORE GALLERY CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        
        <div className="flex justify-between items-center bg-slate-950/40 p-3.5 border border-slate-900 rounded-xl">
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-teal-400" /> Executive Milestones Grid
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-900 text-zinc-400 rounded border border-slate-800">
            Total {achievements.length} loaded records
          </span>
        </div>

        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin" />
            <p className="text-xs text-teal-400 font-mono">Syncing weekly reports with SQLite server...</p>
          </div>
        ) : achievements.length === 0 ? (
          <div className="p-20 border border-dashed border-slate-900 rounded-3xl text-center text-zinc-500 max-w-xl mx-auto">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-sm font-semibold font-mono">Empty Milestone Archive</p>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono">No approved weekly achievements matched the search filters or date range constraints.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((ach) => {
                const tags = extractTechKeywords(ach.content_md);
                return (
                  <div
                    key={ach.id}
                    onClick={() => setActiveAchievement(ach)}
                    className="bg-slate-950 border border-slate-900 p-5 rounded-2xl cursor-pointer flex flex-col justify-between space-y-4 hover:scale-[1.01] hover:border-teal-500 transition-all duration-300 shadow-sm shadow-black/40 relative group overflow-hidden"
                  >
                    {/* Hover Glow Edge effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-teal-500/0 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded text-slate-400 uppercase font-bold">
                          ID: #{ach.id}
                        </span>
                        <StatusBadge status="Approved" />
                      </div>

                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-teal-500" /> {ach.start_date} <span className="text-zinc-600 font-sans font-normal">to</span> {ach.end_date}
                        </h3>
                        <p className="text-[11px] leading-relaxed text-zinc-400 mt-2 line-clamp-3 prose dark:prose-invert font-mono">
                          {ach.content_md.replace(/[#*`>_\-]/g, " ").substring(0, 150)}...
                        </p>
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-900/80">
                        {tags.map((tag, i) => (
                          <TechBadge key={`${tag}-${i}`} tech={tag} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* INFINITE SCROLL / LOAD MORE BUTTON */}
            {hasMore && (
              <div className="flex justify-center pt-4 pb-12">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white font-mono font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <ArrowDownCircle className="h-4 w-4 text-teal-400" />
                  Load More Achievements
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* INDIVIDUAL ACHIEVEMENT FULL VIEW MODAL */}
      {activeAchievement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-900/50">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md font-mono">
                    Milestone Overview
                  </span>
                  <StatusBadge status="Approved" />
                </div>
                <h2 className="text-xs font-bold text-slate-100 mt-2 font-mono flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-teal-500" /> Period: {activeAchievement.start_date} to {activeAchievement.end_date}
                </h2>
                
                {extractTechKeywords(activeAchievement.content_md).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {extractTechKeywords(activeAchievement.content_md).map((tech, i) => (
                      <TechBadge key={`${tech}-${i}`} tech={tech} />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setActiveAchievement(null)}
                className="h-8 w-8 bg-slate-900 hover:bg-slate-800 rounded-full border border-slate-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 shadow-inner flex flex-col">
              <div className="prose dark:prose-invert max-w-none text-zinc-300 font-mono text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeAchievement.content_md}</ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/30 border-t border-slate-900/80 rounded-b-2xl flex justify-between items-center text-[9px] text-zinc-500 font-mono">
              <span>Saved in vault database ID: #{activeAchievement.id}</span>
              <span>Committed: {new Date(activeAchievement.created_at).toLocaleString()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
