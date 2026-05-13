"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  Sparkles,
  Eye,
  Code,
  Folder,
  Activity,
  Award,
  ChevronRight,
  Clock,
  Terminal,
  Layers,
  Database,
  PlusCircle,
  FileText,
  X
} from "lucide-react";
import { useApp, Log, Achievement } from "./context/AppContext";

function TechBadge({ tech }: { tech: string }) {
  const normalized = tech.trim().toLowerCase();
  let colorClass = "";
  if (normalized === "go" || normalized === "golang") {
    colorClass = "bg-cyan-50/70 text-cyan-800 border-cyan-200/60 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20";
  } else if (normalized === "typescript" || normalized === "ts") {
    colorClass = "bg-blue-50/70 text-blue-800 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  } else if (normalized === "python") {
    colorClass = "bg-yellow-50/70 text-yellow-800 border-yellow-200/60 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
  } else if (normalized === "docker" || normalized === "dockerfile") {
    colorClass = "bg-sky-50/70 text-sky-800 border-sky-200/60 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20";
  } else if (normalized === "react" || normalized === "next.js" || normalized === "nextjs" || normalized === "javascript" || normalized === "js") {
    colorClass = "bg-indigo-50/70 text-indigo-800 border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
  } else if (normalized === "tailwind" || normalized === "tailwindcss" || normalized === "css" || normalized === "sass") {
    colorClass = "bg-teal-50/70 text-teal-800 border-teal-200/60 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20";
  } else if (normalized === "sqlite" || normalized === "sql" || normalized === "postgres" || normalized === "postgresql" || normalized === "database" || normalized === "db") {
    colorClass = "bg-violet-50/70 text-violet-800 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
  } else if (normalized === "git" || normalized === "github") {
    colorClass = "bg-rose-50/70 text-rose-800 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
  } else if (normalized === "rust") {
    colorClass = "bg-orange-50/70 text-orange-800 border-orange-200/60 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
  } else {
    colorClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-md border font-mono tracking-wide ${colorClass}`}>
      {tech}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  let colorClass = "";
  if (normalized === "completed" || normalized === "active" || normalized === "sealed" || normalized === "synced") {
    colorClass = "bg-emerald-50 text-emerald-850 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  } else if (normalized === "pending" || normalized === "reviewing") {
    colorClass = "bg-amber-50 text-amber-850 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  } else {
    colorClass = "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border font-mono ${colorClass}`}>
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

function parseTechTags(tagStr: string): string[] {
  if (!tagStr) return [];
  return tagStr
    .split(/[,\n]/)
    .map((s) => s.replace(/^[-*•\s]+/, "").trim())
    .filter((s) => s.length > 0 && s.length < 30);
}

export default function DashboardHome() {
  const {
    projects,
    stats,
    status,
    loadingProjects,
    summarizing,
    refining,
    approving,
    savingDraft,
    showToast,
    fetchProjects,
    triggerRefine,
    saveDraftChanges,
    approveDraft,
    triggerProjectProfiling
  } = useApp();

  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [draftViewMode, setDraftViewMode] = useState<"preview" | "raw">("preview");

  const [editedDraftInput, setEditedDraftInput] = useState("");
  const [aiRefinePrompt, setAiRefinePrompt] = useState("");

  const [activeProject, setActiveProject] = useState<any | null>(null);

  // States for manual repository registration modal/form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPath, setRegPath] = useState("");
  const [regSource, setRegSource] = useState("github");
  const [registering, setRegistering] = useState(false);

  // Sync draft local state once draft changes globally
  useEffect(() => {
    setEditedDraftInput(status.draft_content || "");
  }, [status.draft_content]);

  // Fetch compact top 5 feeds for logs & approved achievements
  const fetchCompactFeeds = async () => {
    try {
      setLoadingFeed(true);
      const [logsRes, achievementsRes] = await Promise.all([
        fetch(`/api/logs?limit=5&_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/achievements?limit=5&_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json())
      ]);
      setRecentLogs(Array.isArray(logsRes) ? logsRes : []);
      setRecentAchievements(Array.isArray(achievementsRes) ? achievementsRes : []);
    } catch (err) {
      console.error("Failed to fetch dashboard preview feeds", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchCompactFeeds();
  }, [status.has_pending_draft]);

  const handleManualDraftSave = async () => {
    await saveDraftChanges(editedDraftInput);
  };

  const handleAIRefinement = async () => {
    if (!aiRefinePrompt.trim()) return;
    await triggerRefine(aiRefinePrompt);
    setAiRefinePrompt("");
  };

  const handleMilestoneApproval = async () => {
    await approveDraft(editedDraftInput, status.draft_start_date, status.draft_end_date);
    fetchCompactFeeds();
  };

  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPath.trim()) {
      showToast("Please specify both name and path targets.", "error");
      return;
    }
    try {
      setRegistering(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, path: regPath, source: regSource }),
        cache: "no-store"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to register workspace target.");
      }
      showToast("✓ Repository registered and post-commit hook interceptor installed!", "success");
      setRegName("");
      setRegPath("");
      setShowRegForm(false);
      await fetchProjects();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Registration failed.", "error");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-8 font-mono pb-12 p-8 max-w-7xl mx-auto animate-fade-in transition-all">
      
      {/* 1. STATE-AWARE ACTION CENTER (GEMINI WEEKLY summaries WORKBENCH) */}
      {(status.has_pending_draft || status.is_weekly_pending) && (
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-xl animate-slide-down space-y-6">
          {status.has_pending_draft ? (
            <>
              {/* Draft Ready for Approval Panel */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-250 dark:border-slate-900">
                <div className="space-y-1">
                  <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1.5 uppercase font-bold animate-pulse">
                    <Sparkles className="h-4 w-4" /> Action Center: Weekly Summary Compiled
                  </span>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase mt-1">
                    Review Milestones Period: {status.draft_start_date} to {status.draft_end_date}
                  </div>
                </div>

                {/* Switcher Mode / Approve Action Row */}
                <div className="flex flex-wrap items-center gap-3 self-end md:self-auto text-xs">
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                    <button
                      onClick={() => setDraftViewMode("preview")}
                      className={`px-3 py-1.5 rounded-md transition-all font-bold cursor-pointer ${
                        draftViewMode === "preview"
                          ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-zinc-550 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setDraftViewMode("raw")}
                      className={`px-3 py-1.5 rounded-md transition-all font-bold cursor-pointer ${
                        draftViewMode === "raw"
                          ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-zinc-550 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      Markdown Source
                    </button>
                  </div>

                  <button
                    onClick={handleMilestoneApproval}
                    disabled={approving}
                    className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 font-extrabold uppercase rounded-lg shadow-sm disabled:opacity-40 cursor-pointer transition-all"
                  >
                    {approving ? "Sealing..." : "Approve & Seal Vault"}
                  </button>
                </div>
              </div>

              {/* Edit / View Area */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Draft Content Panel (8/12) */}
                <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black tracking-widest text-zinc-500 uppercase pb-2 border-b border-slate-250 dark:border-slate-900">Milestone Report Draft</h4>
                    <div className="pt-4 max-h-[350px] overflow-y-auto text-base font-sans leading-relaxed text-zinc-800 dark:text-zinc-300">
                      {draftViewMode === "preview" ? (
                        <div className="prose dark:prose-invert prose-base max-w-none text-zinc-800 dark:text-zinc-300">
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editedDraftInput}</ReactMarkdown>
                        </div>
                      ) : (
                        <textarea
                          value={editedDraftInput}
                          onChange={(e) => setEditedDraftInput(e.target.value)}
                          className="w-full h-72 p-4 bg-white dark:bg-slate-950 text-zinc-800 dark:text-zinc-100 font-mono text-sm rounded-xl border border-slate-200 dark:border-slate-900 focus:ring-1 focus:ring-teal-500 outline-none leading-relaxed"
                          placeholder="Edit report draft..."
                        />
                      )}
                    </div>
                  </div>

                  {/* Manual Save Draft Trigger */}
                  {draftViewMode === "raw" && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-900 flex justify-end mt-4">
                      <button
                        onClick={handleManualDraftSave}
                        disabled={savingDraft}
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer"
                      >
                        {savingDraft ? "Saving..." : "Save Draft Changes"}
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Instruction / Refine Panel (4/12) */}
                <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 p-6 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black tracking-widest text-zinc-500 uppercase pb-2 border-b border-slate-200 dark:border-slate-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" /> Refine Draft with Gemini AI
                    </h4>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 font-sans leading-relaxed">
                      Instruct Gemini to tailor this draft report summary. E.g., &quot;reformat as bullet points, highlight PostgreSQL migrations, make it more recruiter-friendly.&quot;
                    </p>
                    <textarea
                      value={aiRefinePrompt}
                      onChange={(e) => setAiRefinePrompt(e.target.value)}
                      placeholder="e.g. rewrite in a professional tone, focusing on backend refactors..."
                      className="w-full h-32 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-zinc-800 dark:text-zinc-300 placeholder-zinc-450 focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                    />
                  </div>

                  <button
                    onClick={handleAIRefinement}
                    disabled={refining || !aiRefinePrompt.trim()}
                    className="w-full py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-extrabold uppercase rounded-lg shadow-sm text-xs disabled:opacity-45 mt-4 cursor-pointer transition-all"
                  >
                    {refining ? "Refining..." : "Apply AI Instructions"}
                  </button>
                </div>

              </div>
            </>
          ) : (
            // 2. No Draft, but Weekly End Reached, prompt to trigger AI summaries
            <div className="p-8 text-center max-w-xl mx-auto space-y-4">
              <span className="text-4xl">🔔</span>
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200">Weekly Milestones Completed!</h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 font-sans leading-relaxed">
                Raw Git hook activities are captured and waiting inside the database. Launch Gemini pipeline to compile weekly accomplishment report draft now!
              </p>
              <button
                onClick={useApp().triggerSummarize}
                disabled={summarizing}
                className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 font-extrabold uppercase text-xs rounded-xl tracking-wider shadow-sm animate-pulse disabled:opacity-40 cursor-pointer"
              >
                {summarizing ? "Drafting..." : "Compile Weekly Draft Report"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 2. EXECUTIVE METRICS BOARD */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Folder className="h-4 w-4 text-teal-500 animate-pulse" /> Active Codebases
          </span>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{projects.length}</div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold">Git hooks targets</p>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-teal-500" /> Total Raw Commits
          </span>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {Object.values(stats).reduce((a, b) => a + b, 0)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold">Ingested Telemetry</p>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-teal-500 animate-pulse" /> Milestones Vaulted
          </span>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {recentAchievements.length ? `${recentAchievements.length}+` : "0"}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold">Approved Summaries</p>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-teal-500" /> Primary Tech stack
          </span>
          <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex flex-wrap gap-1.5 mt-1">
            {Object.keys(stats).slice(0, 3).map(tech => (
              <TechBadge key={tech} tech={`${tech} (${stats[tech]})`} />
            ))}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold mt-1.5">Captured Dialect metrics</p>
        </div>

      </section>

      {/* 3. SPLIT columns: COmpact Logs (5 items) & Compact achievements (5 items) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Recent Ingestion Logs (Colspan 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 p-6 rounded-3xl flex flex-col justify-between gap-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-900">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-400 flex items-center gap-2 uppercase">
                <Activity className="h-4 w-4 text-teal-500" /> Recent Ingestion Activity
              </span>
              <Link href="/logs" className="text-xs text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-0.5 uppercase tracking-wider font-bold transition-all">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3.5 overflow-y-auto max-h-[320px]">
              {loadingFeed ? (
                <div className="py-12 text-center text-zinc-500 text-xs">Loading feeds...</div>
              ) : recentLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 dark:text-zinc-650 text-xs">No telemetry logged.</div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/25 border border-slate-150 dark:border-slate-900 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-550 font-mono">
                      <span className="font-bold text-zinc-700 dark:text-zinc-400">📁 {log.project_name}</span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-zinc-800 dark:text-zinc-300 font-sans font-semibold leading-relaxed line-clamp-2">{log.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Approved Achievements Milestones (Colspan 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 p-6 rounded-3xl flex flex-col justify-between gap-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-900">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-400 flex items-center gap-2 uppercase">
                <Award className="h-4 w-4 text-teal-500 animate-pulse" /> Approved Milestones Vault
              </span>
              <Link href="/vault" className="text-xs text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-0.5 uppercase tracking-wider font-bold transition-all">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3.5 overflow-y-auto max-h-[320px]">
              {loadingFeed ? (
                <div className="py-12 text-center text-zinc-500 text-xs">Loading feeds...</div>
              ) : recentAchievements.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 dark:text-zinc-650 text-xs">No approved milestones stored.</div>
              ) : (
                recentAchievements.map((ach) => (
                  <div key={ach.id} className="p-4 bg-slate-50 dark:bg-slate-900/25 border border-slate-150 dark:border-slate-900 rounded-xl space-y-2 hover:border-slate-300 dark:hover:border-slate-800 transition-colors">
                    <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-500">
                      <span className="font-bold text-teal-600 dark:text-teal-400">
                        🗓️ {new Date(ach.start_date).toLocaleDateString()} - {new Date(ach.end_date).toLocaleDateString()}
                      </span>
                      <span>ID: #{ach.id}</span>
                    </div>
                    <div className="text-xs font-sans text-zinc-700 dark:text-zinc-400 line-clamp-2 leading-relaxed border-t border-slate-200 dark:border-slate-900/80 pt-2 prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{ach.content_md}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </section>

      {/* 4. ACTIVE REPOSITORY PROJECT PROFILER & REGISTRATION */}
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-6 shadow-sm">
        
        {/* Profile Section header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-900">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <Folder className="h-4 w-4 text-teal-500" /> Workspace Codebases Profiles
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-bold">AI-generated architectural catalogs and repository dependency profiles</p>
          </div>
          <button
            onClick={() => setShowRegForm(!showRegForm)}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-zinc-650 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white font-bold uppercase transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm"
          >
            <PlusCircle className="h-4 w-4" /> Register Repository
          </button>
        </div>

        {/* Repository manual registration form */}
        {showRegForm && (
          <form onSubmit={handleRegisterProject} className="p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-down">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block">Workspace Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. core-auth-service"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block">Absolute Path</label>
              <input
                type="text"
                value={regPath}
                onChange={(e) => setRegPath(e.target.value)}
                placeholder="e.g. /home/tin/projects/core-auth-service"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                required
              />
            </div>
            <div className="space-y-1.5 flex items-end">
              <button
                type="submit"
                disabled={registering}
                className="w-full py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 font-bold uppercase rounded text-xs shadow-sm cursor-pointer disabled:opacity-40 transition-all"
              >
                {registering ? "Registering..." : "Mount Git Interceptors"}
              </button>
            </div>
          </form>
        )}

        {/* Profiles Grid list */}
        {loadingProjects ? (
          <div className="py-8 text-center text-zinc-500 text-xs">Loading projects profile...</div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-900 rounded-2xl text-zinc-550 dark:text-zinc-650 text-xs">No workspace codebases registered yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const hasProfile = proj.profile_purpose || proj.profile_tech_stack || proj.profile_key_features;
              return (
                <div
                  key={proj.id}
                  onClick={() => setActiveProject(proj)}
                  className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800 rounded-2xl p-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase text-zinc-850 dark:text-zinc-200 truncate pr-2">{proj.name}</h4>
                      <StatusBadge status={hasProfile ? "Completed" : "Pending"} />
                    </div>
                    <code className="text-xs bg-white dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-150 dark:border-slate-900 text-zinc-500 dark:text-zinc-500 truncate block select-all font-bold">
                      {proj.path}
                    </code>
                    {hasProfile ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed font-sans pt-1.5 border-t border-slate-200 dark:border-slate-900">
                        {proj.profile_purpose}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 dark:text-zinc-600 font-sans italic leading-relaxed pt-1.5 border-t border-slate-200 dark:border-slate-900">
                        No AI compiled profile description. Click to generate stack details.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {hasProfile && parseTechTags(proj.profile_tech_stack).slice(0, 3).map((tag, i) => (
                      <TechBadge key={`${tag}-${i}`} tech={tag} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* 5. DEEP WORKSPACE PROFILING MODAL */}
      {activeProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in font-mono">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Folder className="h-5 w-5 text-teal-500 dark:text-teal-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-850 dark:text-slate-100">{activeProject.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 select-all">Path: {activeProject.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={async () => {
                    const projId = activeProject.id;
                    setActiveProject(null);
                    await triggerProjectProfiling(projId);
                  }}
                  className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> AI Compile Stack
                </button>
                <button
                  onClick={() => setActiveProject(null)}
                  className="h-8 w-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 shadow-inner space-y-6">
              
              {activeProject.profile_purpose || activeProject.profile_tech_stack || activeProject.profile_key_features ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
                  
                  {/* Purpose */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-550 font-mono flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-900 pb-2">
                      <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" /> Project Purpose
                    </h4>
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-900 text-sm leading-relaxed text-zinc-700 dark:text-zinc-350 prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeProject.profile_purpose}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Tech stack */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-550 font-mono flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-900 pb-2">
                      <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" /> Architectural Tech Stack
                    </h4>
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-900 space-y-4">
                      {parseTechTags(activeProject.profile_tech_stack).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {parseTechTags(activeProject.profile_tech_stack).map((tag, i) => (
                            <TechBadge key={`${tag}-${i}`} tech={tag} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-350 prose dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeProject.profile_tech_stack}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-550 font-mono flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-900 pb-2">
                      <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" /> Key Subsystems & Features
                    </h4>
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-900 text-sm leading-relaxed text-zinc-700 dark:text-zinc-350 prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeProject.profile_key_features}</ReactMarkdown>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-16 text-center max-w-lg mx-auto space-y-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                    This project codebase profile has not been compiled yet. Run AI Compile Stack to trace folders, scan file definitions, and generate architectural summaries.
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border-t border-slate-200 dark:border-slate-850 text-xs text-zinc-500 flex justify-between items-center">
              <span>Register Source: {activeProject.source}</span>
              <span>Enrolled: {new Date(activeProject.created_at).toLocaleString()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
