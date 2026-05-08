"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import { Sun, Moon, Laptop, RotateCw, Activity, Award, BarChart3, AlertTriangle, Sparkles, X, ChevronRight, Eye, Code, Search } from "lucide-react";

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
  const [summarizing, setSummarizing] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);
  const [activeLog, setActiveLog] = useState<Log | null>(null);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [draftViewMode, setDraftViewMode] = useState<"preview" | "raw">("preview");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // States for manual editing & AI refinement
  const [editedDraft, setEditedDraft] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [refining, setRefining] = useState(false);

  const { theme, setTheme } = useTheme();
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5500);
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Use active cache-busting timestamp parameters and no-store rules to prevent NextJS data fetch caching
      const t = Date.now();
      const headersOption = {
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
        cache: "no-store" as RequestCache,
      };

      const [logsRes, achievementsRes, statsRes, statusRes] = await Promise.all([
        fetch(`http://localhost:8001/api/logs?_t=${t}`, headersOption).then((r) => r.json()).catch(() => []),
        fetch(`http://localhost:8001/api/achievements?_t=${t}`, headersOption).then((r) => r.json()).catch(() => []),
        fetch(`http://localhost:8001/api/stats?_t=${t}`, headersOption).then((r) => r.json()).catch(() => ({})),
        fetch(`http://localhost:8001/api/status?_t=${t}`, headersOption).then((r) => r.json()).catch(() => ({
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
      showToast("Failed to connect to local database backend server.", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    setEditedDraft(status.draft_content);
  }, [status.draft_content]);

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      const res = await fetch("http://localhost:8001/api/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedDraft }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to save draft");
      
      showToast("Manual edits saved successfully!", "success");
      await fetchDashboardData(true);
    } catch (err) {
      console.error("Error saving manual edits:", err);
      showToast("Failed to save edits.", "error");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleRefineDraft = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setRefining(true);
      showToast("✨ AI is refining your draft...", "info");
      
      const res = await fetch("http://localhost:8001/api/draft/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to refine draft");
      }

      showToast("✨ Draft refined successfully!", "success");
      setAiPrompt("");
      await fetchDashboardData(true);
    } catch (err: any) {
      console.error("Error refining draft:", err);
      showToast(err.message || "Failed to refine draft.", "error");
    } finally {
      setRefining(false);
    }
  };

  const handleApproveDraft = async () => {
    try {
      setApproving(true);
      const res = await fetch("http://localhost:8001/api/achievements/approve", {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to approve draft summary");
      }

      showToast("✓ Weekly summary successfully saved and approved into the vault!", "success");
      // Refresh dashboard data to reflect newly added achievements and removed drafts
      await fetchDashboardData(true);
    } catch (err) {
      console.error("Error approving weekly draft:", err);
      showToast("Error saving summary to vault.", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleTriggerSummarize = async () => {
    try {
      setSummarizing(true);
      showToast("Compiling logs and generating draft with Gemini AI...", "info");
      
      const res = await fetch("http://localhost:8001/api/summarize", {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: "Server experienced high demand." }));
        throw new Error(errJson.error || "Failed to generate summary");
      }

      showToast("⚡ Draft summary compiled successfully! Review it in Action Center below.", "success");
      
      // Instantly query API status using absolute cache-bust triggers to enforce immediate UI update
      await fetchDashboardData(true);
    } catch (err: any) {
      console.error("Error generating summary via API:", err);
      showToast(err.message || "Failed to generate AI summary draft.", "error");
    } finally {
      setSummarizing(false);
    }
  };

  const handleCheckPendingStatus = async () => {
    try {
      setCheckingPending(true);
      showToast("Scanning repository databases for pending weekly deadlines...", "info");
      
      const t = Date.now();
      const res = await fetch(`http://localhost:8001/api/status?_t=${t}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Unable to check status");
      }

      const freshStatus = await res.json();
      setStatus(freshStatus);

      if (freshStatus.is_weekly_pending) {
        showToast("⚠️ Weekly summary is pending! Press 'Generate AI Summary' to create the draft.", "info");
      } else if (freshStatus.has_pending_draft) {
        showToast("⚡ Found a pending draft summary ready for review!", "success");
      } else {
        showToast("✓ All quiet: No pending summaries detected. Vault is up to date!", "success");
      }
    } catch (err) {
      console.error("Error scanning pending status:", err);
      showToast("Failed to run pending target scanning.", "error");
    } finally {
      setCheckingPending(false);
    }
  };

  const totalLogs = logs.length;
  const totalAchievements = achievements.length;
  const uniqueProjects = Array.from(new Set(logs.map((l) => l.project_name))).length;
  const totalStatPoints = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8 selection:bg-cyan-500 selection:text-black">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-900 relative">
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
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
          
          {/* Check Pending Button */}
          <button
            onClick={handleCheckPendingStatus}
            disabled={checkingPending || loading || summarizing}
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/15 text-amber-700 dark:text-amber-400 rounded-lg hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-100/30 dark:hover:bg-amber-950/30 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <Search className={`h-3.5 w-3.5 ${checkingPending ? "animate-bounce" : ""}`} />
            {checkingPending ? "Scanning..." : "Check Pending"}
          </button>

          {/* AI Summarize Button */}
          <button
            onClick={handleTriggerSummarize}
            disabled={summarizing || loading || checkingPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/15 text-purple-700 dark:text-purple-400 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-100/30 dark:hover:bg-purple-950/30 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${summarizing ? "animate-spin" : "animate-pulse"}`} />
            {summarizing ? "Generating AI Draft..." : "AI Summarize"}
          </button>

          {/* Refresh Feed Button */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading || summarizing || checkingPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:border-cyan-500 dark:hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh Feed
          </button>

          {/* PREMIUM TWO-STATE EXPLICIT THEME SWITCHER */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:border-cyan-500 dark:hover:border-cyan-400 text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-300 shadow-sm cursor-pointer"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500 animate-spin-slow" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-450 dark:text-indigo-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
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
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                        <div>
                          <h2 className="text-xs font-black tracking-wider text-purple-700 dark:text-purple-400 uppercase">
                            Action Center: Weekly Summary Ready for Review
                          </h2>
                          <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Period: {status.draft_start_date} to {status.draft_end_date}
                          </p>
                        </div>
                      </div>

                      {/* View Mode Switcher */}
                      <div className="flex items-center border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg text-[9px] font-mono shadow-inner">
                        <button
                          onClick={() => setDraftViewMode("preview")}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-bold cursor-pointer ${
                            draftViewMode === "preview"
                              ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
                          }`}
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </button>
                        <button
                          onClick={() => setDraftViewMode("raw")}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-bold cursor-pointer ${
                            draftViewMode === "raw"
                              ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          <Code className="h-3 w-3" /> Raw Markdown
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleApproveDraft}
                      disabled={approving}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 text-white dark:text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 dark:shadow-emerald-950/20 hover:scale-[1.02] disabled:opacity-50 transition-all duration-300 self-end md:self-auto cursor-pointer"
                    >
                      {approving ? "⏳ Saving to Vault..." : "✓ Approve & Save to Vault"}
                    </button>
                  </div>
                  
                  <div className="bg-zinc-100/50 dark:bg-black/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl max-h-[250px] overflow-y-auto text-xs leading-relaxed shadow-inner font-mono text-zinc-700 dark:text-zinc-300">
                    {draftViewMode === "preview" ? (
                      <div className="prose dark:prose-invert prose-xs max-w-none text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed">
                        <ReactMarkdown>{status.draft_content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={editedDraft}
                          onChange={(e) => setEditedDraft(e.target.value)}
                          className="w-full min-h-[150px] p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs resize-y"
                          placeholder="Edit your draft here..."
                        />
                        <button
                          onClick={handleSaveDraft}
                          disabled={savingDraft || editedDraft === status.draft_content}
                          className="self-end px-4 py-2 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black font-bold text-[10px] uppercase rounded-lg hover:bg-zinc-700 dark:hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {savingDraft ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Refine Prompt Bar */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-purple-200 dark:border-purple-900/60">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Prompt AI to refine this draft (e.g., 'Make it more professional', 'Add emojis')"
                      className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800/50 text-zinc-800 dark:text-zinc-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !refining && aiPrompt.trim()) {
                          handleRefineDraft();
                        }
                      }}
                    />
                    <button
                      onClick={handleRefineDraft}
                      disabled={refining || !aiPrompt.trim()}
                      className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold text-[10px] uppercase rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800/50 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className={`h-3 w-3 ${refining ? "animate-spin" : ""}`} />
                      {refining ? "Refining..." : "AI Refine"}
                    </button>
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTriggerSummarize}
                      disabled={summarizing}
                      className="px-4 py-2 bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                    >
                      {summarizing ? "⏳ Compiling..." : "⚡ Summarize Now"}
                    </button>
                    <div className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 hidden md:block">
                      or run <code className="text-amber-600 dark:text-amber-400 font-bold font-mono">vault summarize</code> in terminal
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* STATS OVERVIEW CARDS & TECH METRICS */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 grid grid-cols-3 gap-4">
              <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5 text-cyan-500" /> Projects
                </span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{uniqueProjects}</span>
              </div>
              <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <BarChart3 className="h-2.5 w-2.5 text-indigo-500" /> Raw Logs
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalLogs}</span>
              </div>
              <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <Award className="h-2.5 w-2.5 text-purple-500" /> Summaries
                </span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalAchievements}</span>
              </div>
            </div>

            <div className="lg:col-span-2 glass-glow p-5 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-mono">Technology Impact Footprint</span>
                <span className="text-[8px] font-mono text-zinc-500 dark:text-zinc-400">Inferred from commit changesets</span>
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
                        <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-300">
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
                          <div className="text-zinc-400 dark:text-zinc-400 mb-1 font-semibold">// Git commit diff stats</div>
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
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1 font-mono">Run "vault summarize" or press "AI Summarize"!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[500px] pr-2">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      onClick={() => setActiveAchievement(ach)}
                      className="glass-glow p-5 rounded-xl cursor-pointer flex flex-col justify-between space-y-4 hover:scale-[1.01] hover:border-purple-400 dark:hover:border-purple-850 transition-all animate-fade-in"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] font-bold tracking-widest text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-full">
                            ID: {ach.id}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-300">
                            {new Date(ach.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200">Weekly Progress Report</h3>
                        <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                          Period: {ach.start_date} to {ach.end_date}
                        </p>
                      </div>

                      {/* Rendered markdown instead of raw text inside gallery previews */}
                      <div className="pt-3 border-t border-zinc-150 dark:border-zinc-850 text-[10px] text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed font-sans prose dark:prose-invert prose-xs max-w-none pointer-events-none">
                        <ReactMarkdown>{ach.content_md}</ReactMarkdown>
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
                className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body - Rendered beautifully via Markdown rendering with Tailwind prose style */}
            <div className="p-6 overflow-y-auto flex-1 bg-zinc-50 dark:bg-zinc-950/20 border-b border-zinc-200 dark:border-zinc-800 shadow-inner">
              <div className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 font-sans text-sm leading-relaxed">
                <ReactMarkdown>{activeAchievement.content_md}</ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-b-2xl text-right flex justify-between items-center text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
              <span>Saved in vault at: {new Date(activeAchievement.created_at).toLocaleString()}</span>
              <button
                onClick={() => setActiveAchievement(null)}
                className="px-4 py-1.5 bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-black font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM DYNAMIC TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-slide-up text-[10px] font-mono font-semibold transition-all max-w-xs md:max-w-sm ${
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300"
            : toast.type === "error"
            ? "bg-rose-50 dark:bg-rose-950/80 border-rose-350 dark:border-rose-800/80 text-rose-800 dark:text-rose-300"
            : "bg-cyan-50 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-800/80 text-cyan-800 dark:text-cyan-300"
        }`}>
          <div className="h-2 w-2 rounded-full bg-current animate-pulse shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
