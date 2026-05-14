"use client";

import { useEffect, useState } from "react";
import { Folder, Search, Calendar, ChevronLeft, ChevronRight, Activity, Terminal, Code, Clock } from "lucide-react";
import { useApp, Log } from "../context/AppContext";
import TechBadge from "../components/TechBadge";
import { extractTechKeywords } from "../utils/techUtils";

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
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-mono transition-all">
      
      {/* FILTER CONTROLS GRID */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search logs or diffs..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-150 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-mono"
            />
          </div>

          {/* CODEBASE REPO FILTER */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer font-mono"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📁 All Codebases</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id.toString()} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer font-mono"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📅 All Time</option>
              <option value="week" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📅 Last 7 Days</option>
              <option value="month" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📅 Last 30 Days</option>
              <option value="three_months" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📅 Last 3 Months</option>
              <option value="custom" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📅 Custom Date Range...</option>
            </select>
          </div>

          {/* PAGINATION INFO / CONTROLS */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
            <span className="text-zinc-550 dark:text-zinc-455 font-bold">
              Page <span className="font-black text-slate-800 dark:text-slate-200">{page}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="h-7 px-3 bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400 cursor-pointer transition-colors text-xs font-bold"
              >
                <ChevronLeft className="h-3.5 w-3.5 inline mr-0.5" /> Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={logs.length < limit || loading}
                className="h-7 px-3 bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400 cursor-pointer transition-colors text-xs font-bold"
              >
                Next <ChevronRight className="h-3.5 w-3.5 inline ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* CUSTOM DATE PICKERS POPUP PANEL */}
        {dateRange === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-455 uppercase block">From Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-455 uppercase block">To Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner font-mono"
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
          <div className="flex justify-between items-center bg-white dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-700 rounded-xl">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-teal-500 animate-pulse" /> Ingested Commits
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-slate-50 dark:bg-slate-900 text-zinc-650 dark:text-zinc-500 rounded border border-slate-200 dark:border-slate-700">
              Showing {logs.length} items
            </span>
          </div>

          <div className="space-y-3 pr-1 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="h-40 flex flex-col items-center justify-center space-y-2">
                <div className="h-6 w-6 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin" />
                <p className="text-xs text-teal-600 dark:text-teal-400 font-bold">Querying SQLite backend...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center text-zinc-500 text-xs leading-relaxed">
                📭 No matching commit events found on this page.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setActiveLog(activeLog?.id === log.id ? null : log)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                    activeLog?.id === log.id
                      ? "bg-slate-100/80 dark:bg-slate-900/80 border-teal-500 dark:border-teal-500/80 shadow-md scale-[1.005]"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30 hover:border-slate-350 dark:hover:border-teal-500/30 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 bg-slate-50 dark:bg-slate-900 text-slate-750 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 font-semibold shadow-sm">
                      <Folder className="h-3 w-3 text-teal-500" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-455 dark:text-zinc-550 mr-0.5">Repo:</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{log.project_name}</span>
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-2.5 line-clamp-2 leading-relaxed">{log.content}</p>
                  
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
          <div className="flex justify-between items-center bg-white dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-700 rounded-xl">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase flex items-center gap-1.5">
              <Code className="h-4 w-4 text-teal-500" /> Commit Metadata Inspection
            </span>
          </div>

          {activeLog ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-md space-y-4 animate-fade-in flex flex-col transition-colors">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-teal-650 dark:text-teal-400">Logged Event Details</h3>
                  <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 mt-1.5 font-bold shadow-inner">
                    <Folder className="h-3 w-3 text-teal-500" />
                    <span>Repo: {activeLog.project_name}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500 text-left sm:text-right space-y-0.5 font-semibold">
                  <div>ID: #{activeLog.id}</div>
                  <div>Logged: {new Date(activeLog.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black tracking-widest text-zinc-500 dark:text-zinc-550 uppercase">Commit Message</h4>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 p-4 rounded-xl text-xs font-mono font-bold text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {activeLog.content}
                </div>
              </div>

              {activeLog.metadata ? (
                <div className="flex flex-col flex-1 space-y-1.5">
                  <h4 className="text-xs font-black tracking-widest text-zinc-500 dark:text-zinc-550 uppercase">Git Commit Statistics & Diffs</h4>
                  <pre className="bg-slate-50 dark:bg-slate-900/80 border border-slate-150 dark:border-slate-700 p-4 rounded-xl text-xs font-mono text-teal-700 dark:text-teal-400 overflow-x-auto whitespace-pre leading-relaxed shadow-inner max-h-[45vh] scrollbar-thin">
                    <code>{activeLog.metadata}</code>
                  </pre>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-zinc-500 text-xs">
                  // No advanced patch code or file stats metadata captured for this event.
                </div>
              )}
            </div>
          ) : (
            <div className="h-80 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <span className="text-4xl mb-2">🔍</span>
              <p className="text-sm font-bold">Inspection Terminal Empty</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-455 mt-2 max-w-sm leading-relaxed">Select any log from the left commits ingestion list to inspect file diff changes, branch patches, and tech signatures.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
