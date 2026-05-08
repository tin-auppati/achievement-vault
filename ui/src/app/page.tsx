"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, RotateCw, Activity, Award, BarChart3, AlertTriangle, Sparkles, X, ChevronRight } from "lucide-react";

interface Log {
  id: number;
  project_id: number;
  project_name: string;
  type: string;
  content: string;
  metadata: string;
  timestamp: string;
}

interface Achievement {
  id: number;
  content_md: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface TechStats {
  [key: string]: number;
}

interface VaultStatus {
  is_weekly_pending: boolean;
  has_pending_draft: boolean;
  draft_content: string;
  draft_start_date: string;
  draft_end_date: string;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<TechStats>({});
  const [status, setStatus] = useState<VaultStatus>({
    is_weekly_pending: false,
    has_pending_draft: false,
    draft_content: "",
    draft_start_date: "",
    draft_end_date: "",
  });
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [activeLog, setActiveLog] = useState<Log | null>(null);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch concurrently from Go API
      const [logsRes, achievementsRes, statsRes, statusRes] = await Promise.all([
        fetch("http://localhost:8001/api/logs").then((r) => r.json()).catch(() => []),
        fetch("http://localhost:8001/api/achievements").then((r) => r.json()).catch(() => []),
        fetch("http://localhost:8001/api/stats").then((r) => r.json()).catch(() => ({})),
        fetch("http://localhost:8001/api/status").then((r) => r.json()).catch(() => ({
          is_weekly_pending: false,
          has_pending_draft: false,
          draft_content: "",
          draft_start_date: "",
          draft_end_date: "",
        })),
      ]);

      setLogs(logsRes || []);
      setAchievements(achievementsRes || []);
      setStats(statsRes || {});
      setStatus(statusRes);
    } catch (err) {
      console.error("Failed to fetch dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveDraft = async () => {
    try {
      setApproving(true);
      const res = await fetch("http://localhost:8001/api/achievements/approve", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to approve draft summary");
      }

      // Success - Refresh dashboard data to reflect newly added achievements and removed drafts
      await fetchDashboardData();
    } catch (err) {
      console.error("Error approving weekly draft:", err);
    } finally {
      setApproving(false);
    }
  };

  const totalLogs = logs.length;
  const totalAchievements = achievements.length;
  const uniqueProjects = Array.from(new Set(logs.map((l) => l.project_name))).length;
  const totalStatPoints = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col p-6 md:p-8 selection:bg-cyan-500 selection:text-black transition-colors duration-300">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-900 relative">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-pulse" />
            <h1 className="text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 dark:from-cyan-400 dark:via-indigo-400 dark:to-purple-500 uppercase">
              ACHIEVEMENT VAULT
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            Automated Git Hook Collector & AI-Powered Executive Summarization Engine
          </p>
        </div>
        
        {/* ACTION BUTTONS & THEME TOGGLE */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-start">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:border-cyan-500 dark:hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-all duration-300 shadow-sm"
          >
            <RotateCw className="h-3 w-3 animate-spin" style={{ animationDuration: "10s" }} />
            Refresh Feed
          </button>

          {/* THEME SWITCHER BUTTON */}
          {mounted && (
            <div className="flex items-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md transition-all ${
                  theme === "light"
                    ? "bg-zinc-100 text-amber-500 shadow-inner"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                title="Light Mode"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md transition-all ${
                  theme === "dark"
                    ? "bg-zinc-800 text-indigo-400 shadow-inner"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
                title="Dark Mode"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-md transition-all ${
                  theme === "system"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-inner"
                    : "text-zinc-450 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                title="System Mode"
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {loading && !approving ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-t-2 border-r-2 border-cyan-500 dark:border-cyan-400 rounded-full animate-spin" />
          <p className="text-xs text-cyan-600 dark:text-cyan-450 font-mono">Syncing with local vault database...</p>
        </div>
      ) : (
        <div className="space-y-8 flex-1 flex flex-col">
          
          {/* STATE-AWARE ACTION CENTER (TOP BANNER) */}
          {(status.has_pending_draft || status.is_weekly_pending) && (
            <section className="animate-slide-down">
              {status.has_pending_draft ? (
                // 1. Pending Draft Ready for Review Option
                <div className="border border-purple-300 dark:border-purple-900/60 bg-gradient-to-br from-purple-50 via-white to-cyan-50/20 dark:from-purple-950/15 dark:via-zinc-900/90 dark:to-cyan-950/5 p-6 rounded-2xl shadow-lg dark:shadow-purple-950/10 space-y-5 transition-colors duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                      <div>
                        <h2 className="text-xs font-black tracking-wider text-purple-700 dark:text-purple-400 uppercase">
                          Action Center: Weekly Summary Ready for Review
                        </h2>
                        <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Date Period: {status.draft_start_date} to {status.draft_end_date}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleApproveDraft}
                      disabled={approving}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 text-white dark:text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 dark:shadow-emerald-950/20 hover:scale-[1.02] disabled:opacity-50 transition-all duration-300"
                    >
                      {approving ? "⏳ Saving to Vault..." : "✓ Approve & Save to Vault"}
                    </button>
                  </div>
                  
                  <div className="bg-zinc-100/50 dark:bg-black/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl max-h-[250px] overflow-y-auto text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {status.draft_content}
                  </div>
                </div>
              ) : (
                // 2. No Draft but Weekly Summary is past-due (check-pending)
                <div className="border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 via-white to-amber-50/10 dark:from-amber-950/10 dark:via-zinc-900/90 dark:to-amber-950/5 p-5 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300">
                  <div className="flex items-center gap-3.5">
                    <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Action Required: Your Weekly Summary is Pending!
                      </h3>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                        It's past Friday 5:00 PM and no summary exists for the current week.
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    Run <code className="text-amber-600 dark:text-amber-400 font-bold font-mono">vault summarize</code> in CLI to compile
                  </div>
                </div>
              )}
            </section>
          )}

          {/* STATS OVERVIEW CARDS & TECH METRICS */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 grid grid-cols-3 gap-4">
              <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5 text-cyan-500" /> Projects
                </span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{uniqueProjects}</span>
              </div>
              <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                  <BarChart3 className="h-2.5 w-2.5 text-indigo-500" /> Raw Logs
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalLogs}</span>
              </div>
              <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                  <Award className="h-2.5 w-2.5 text-purple-500" /> Summaries
                </span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalAchievements}</span>
              </div>
            </div>

            <div className="lg:col-span-2 glass-glow p-5 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-mono">Technology Impact Footprint</span>
                <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500">Inferred from commit changesets</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(stats).map(([lang, count]) => {
                  const pct = Math.round((count / totalStatPoints) * 100);
                  if (count === 0) return null;
                  return (
                    <div key={lang} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-600 dark:text-zinc-300 font-semibold">{lang}</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 dark:from-cyan-400 dark:to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* MAIN COLUMN CONTENT */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 flex-1">
            
            {/* LEFT COLUMN: Scrollable Raw Logs Feed */}
            <section className="xl:col-span-2 flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-2 font-mono">
                  <span>📥</span> Raw Log Feed
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-200 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded border border-zinc-300 dark:border-zinc-800">
                  {logs.length} logged events
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-3">
                {logs.length === 0 ? (
                  <div className="h-40 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs font-mono">
                    No commit events recorded yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setActiveLog(activeLog?.id === log.id ? null : log)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                        activeLog?.id === log.id
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-500/80 shadow-md"
                          : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-900 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-800"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 rounded border border-zinc-200 dark:border-zinc-700 uppercase font-semibold">
                          {log.project_name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                          {new Date(log.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mt-2 line-clamp-2">{log.content}</p>
                      
                      {activeLog?.id === log.id && log.metadata && (
                        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[10px] font-mono bg-zinc-50 dark:bg-black/60 p-2.5 rounded-lg text-emerald-700 dark:text-emerald-400 overflow-x-auto whitespace-pre">
                          <div className="text-zinc-400 dark:text-zinc-600 mb-1 font-semibold">// Git commit diff stats</div>
                          {log.metadata}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* RIGHT COLUMN: Achievement Cards Grid */}
            <section className="xl:col-span-3 flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold tracking-wider uppercase text-purple-600 dark:text-purple-400 flex items-center gap-2 font-mono">
                  <span>🏆</span> Weekly Achievements Vault
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-200 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded border border-zinc-300 dark:border-zinc-800">
                  {achievements.length} approved periods
                </span>
              </div>

              {achievements.length === 0 ? (
                <div className="h-[350px] border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-zinc-400 dark:text-zinc-500">
                  <span className="text-3xl mb-3 animate-bounce">📭</span>
                  <p className="text-xs font-semibold">No summaries approved yet.</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1 font-mono">Run "vault summarize" to compile logs!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[500px] pr-2">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      onClick={() => setActiveAchievement(ach)}
                      className="glass-glow p-5 rounded-xl cursor-pointer flex flex-col justify-between space-y-4 hover:scale-[1.01] hover:border-purple-400 dark:hover:border-purple-800 transition-all animate-fade-in"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] font-bold tracking-widest text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-full">
                            ID: {ach.id}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-450 dark:text-zinc-500">
                            {new Date(ach.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200">Weekly Progress Report</h3>
                        <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                          Period: {ach.start_date} to {ach.end_date}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-zinc-150 dark:border-zinc-850 text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed font-mono whitespace-pre-wrap">
                        {ach.content_md}
                      </div>

                      <div className="text-right text-[9px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center justify-end gap-1">
                        Read full report <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* FULL MD MODAL WINDOW FOR SELECTED ACHIEVEMENT */}
      {activeAchievement && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl transition-colors duration-300">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 rounded-t-2xl">
              <div>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 rounded-full">
                  Achievement Details
                </span>
                <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 mt-2 font-mono">
                  Period: {activeAchievement.start_date} to {activeAchievement.end_date}
                </h2>
              </div>
              <button
                onClick={() => setActiveAchievement(null)}
                className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950/20">
              {activeAchievement.content_md}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 rounded-b-2xl text-right flex justify-between items-center text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
              <span>Saved in vault at: {new Date(activeAchievement.created_at).toLocaleString()}</span>
              <button
                onClick={() => setActiveAchievement(null)}
                className="px-4 py-1.5 bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-black font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
