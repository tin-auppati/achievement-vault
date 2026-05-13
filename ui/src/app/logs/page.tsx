"use client";

import { useEffect, useState } from "react";
import { Folder, Search, Calendar, ChevronLeft, ChevronRight, Activity, Terminal, Code, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";

interface Log {
  id: number;
  project_id: number;
  project_name: string;
  type: string;
  content: string;
  metadata: string;
  timestamp: string;
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

export default function LogsArchive() {
  const { projects } = useApp();
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<Log | null>(null);

  const limit = 25;

  // Fetch logs when search, page, filters, or date bounds change
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

    const offset = (page - 1) * limit;
    
    // Construct search term to merge search string and selected project if specific project selected
    let queryParam = search.trim();
    if (selectedProject !== "all") {
      const proj = projects.find(p => p.id.toString() === selectedProject);
      if (proj) {
        // If query is empty, filter by project name, else let it filter both in SQL query
        queryParam = queryParam ? `${queryParam} ${proj.name}` : proj.name;
      }
    }

    const params = new URLSearchParams();
    if (queryParam) params.set("q", queryParam);
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());
    if (startStr) params.set("start_date", startStr);
    if (endStr) params.set("end_date", endStr);

    fetch(`/api/logs?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load logs", err);
        setLogs([]);
        setLoading(false);
      });
  }, [search, selectedProject, dateRange, customStartDate, customEndDate, page, projects]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (logs.length === limit) setPage(page + 1);
  };

  // Reset page when search filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleProjectChange = (val: string) => {
    setSelectedProject(val);
    setPage(1);
  };

  const handleDateRangeChange = (val: string) => {
    setDateRange(val);
    setPage(1);
  };

  return (
    <div className="flex flex-col space-y-6">
      
      {/* FILTER CONTROLS GRID */}
      <section className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search logs or diffs..."
              className="w-full pl-9 pr-3 py-2 text-[11px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono transition-all"
            />
          </div>

          {/* CODEBASE REPO FILTER */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 text-[11px] bg-slate-950 border border-slate-900 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono transition-all cursor-pointer"
            >
              <option value="all">📁 All Codebases</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id.toString()}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* DATE RANGE CHANGER */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-full px-3 py-2 text-[11px] bg-slate-950 border border-slate-900 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono transition-all cursor-pointer"
            >
              <option value="all">📅 All Time</option>
              <option value="week">📅 Last 7 Days</option>
              <option value="month">📅 Last 30 Days</option>
              <option value="three_months">📅 Last 3 Months</option>
              <option value="custom">📅 Custom Date Range...</option>
            </select>
          </div>

          {/* PAGINATION INFO / CONTROLS */}
          <div className="flex items-center justify-between gap-2 bg-slate-950 px-4 py-2 border border-slate-900 rounded-lg font-mono text-[10px]">
            <span className="text-zinc-500">
              Page <span className="font-black text-slate-200">{page}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="h-6 px-2 bg-slate-900 border border-slate-800 rounded text-zinc-450 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-500 cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-3 w-3 inline" /> Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={logs.length < limit || loading}
                className="h-6 px-2 bg-slate-900 border border-slate-800 rounded text-zinc-450 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-500 cursor-pointer transition-colors"
              >
                Next <ChevronRight className="h-3 w-3 inline" />
              </button>
            </div>
          </div>

        </div>

        {/* CUSTOM DATE PICKERS POPUP PANEL */}
        {dateRange === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">From Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-[10px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono block">To Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-[10px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CORE WORKSPACE CONTENT AREA */}
      <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT COLUMN: Logs Scrollable Feed (Colspan 2) */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-slate-950/40 p-2 border border-slate-900 rounded-lg">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5 text-teal-500" /> Commits Ingestion List
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-900 text-zinc-450 rounded border border-slate-800">
              Showing {logs.length} on page
            </span>
          </div>

          <div className="space-y-3 pr-1 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="h-40 flex flex-col items-center justify-center space-y-2">
                <div className="h-6 w-6 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin" />
                <p className="text-[9px] text-teal-400 font-mono">Querying SQLite backend...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-900 rounded-2xl text-center text-zinc-500 text-xs font-mono">
                📭 No matching commit events found on this page.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setActiveLog(activeLog?.id === log.id ? null : log)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                    activeLog?.id === log.id
                      ? "bg-slate-900/80 border-teal-500 dark:border-teal-500/80 shadow-md scale-[1.005]"
                      : "bg-slate-950 border-slate-900 hover:bg-slate-900/30 hover:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 bg-slate-900/40 text-slate-300 rounded-md border border-slate-850 font-semibold shadow-sm">
                      <Folder className="h-2.5 w-2.5 text-teal-500" />
                      <span className="text-[7px] uppercase tracking-wider text-zinc-500 mr-0.5">Repo:</span>
                      <span className="text-zinc-200">{log.project_name}</span>
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(log.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  
                  <p className="text-xs font-semibold text-zinc-200 mt-2.5 line-clamp-2">{log.content}</p>
                  
                  {extractTechKeywords(log.content).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3.5">
                      {extractTechKeywords(log.content).map((tech, i) => (
                        <TechBadge key={`${tech}-${i}`} tech={tech} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Log Metadata Diff View (Colspan 3) */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-slate-950/40 p-2 border border-slate-900 rounded-lg">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1">
              <Code className="h-3.5 w-3.5 text-teal-500" /> Commit Metadata Inspection
            </span>
          </div>

          {activeLog ? (
            <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-in flex flex-col">
              <div className="pb-4 border-b border-slate-900 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-teal-400 font-mono">Logged Event Details</h3>
                  <div className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 bg-slate-900/60 text-slate-300 rounded-md border border-slate-800 mt-1 font-semibold">
                    <Folder className="h-2.5 w-2.5 text-teal-500" />
                    <span>Repo: {activeLog.project_name}</span>
                  </div>
                </div>
                <div className="text-[9px] text-zinc-500 font-mono text-left sm:text-right">
                  <div>ID: #{activeLog.id}</div>
                  <div>Logged: {new Date(activeLog.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h4 className="text-[9px] font-black tracking-widest text-zinc-500 uppercase font-mono">Commit Message</h4>
                <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl text-xs font-mono font-bold text-zinc-100 mt-2 whitespace-pre-wrap leading-relaxed">
                  {activeLog.content}
                </div>
              </div>

              {activeLog.metadata ? (
                <div className="flex flex-col flex-1">
                  <h4 className="text-[9px] font-black tracking-widest text-zinc-500 uppercase font-mono">Git Commit Statistics & Diffs</h4>
                  <pre className="bg-slate-900/80 border border-slate-850 p-4 rounded-xl text-[10px] font-mono text-teal-400 mt-2 overflow-x-auto whitespace-pre leading-relaxed shadow-inner max-h-[45vh] scrollbar-thin">
                    <code>{activeLog.metadata}</code>
                  </pre>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-900 rounded-xl text-zinc-500 text-[10px] font-mono">
                  // No advanced patch code or file stats metadata captured for this event.
                </div>
              )}
            </div>
          ) : (
            <div className="h-80 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs font-semibold font-mono">Inspection Terminal Empty</p>
              <p className="text-[10px] text-zinc-655 mt-1 font-mono">Select any log from the left commits ingestion list to inspect file diff changes, branch patches, and tech signatures.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
