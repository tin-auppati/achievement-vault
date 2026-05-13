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
  X,
  Trash2,
  Edit3,
  Save,
  Laptop
} from "lucide-react";
import { useApp, Log, Achievement } from "./context/AppContext";
import TechBadge from "./components/TechBadge";
import StatusBadge from "./components/StatusBadge";
import { extractTechKeywords, parseTechTags } from "./utils/techUtils";

function calculateWorkspaceQualityScore(proj: any): number {
  let score = 0;
  
  const hasProfile = proj.profile_purpose || proj.profile_tech_stack || proj.profile_key_features;
  if (!hasProfile) {
    return 0;
  }
  
  // Base score for having a profile compiled
  score += 100;
  
  // Scoring by Purpose detail length
  if (proj.profile_purpose) {
    const purposeLen = proj.profile_purpose.trim().length;
    score += Math.min(purposeLen, 150);
    if (purposeLen > 40) {
      score += 50; // Bonus for thorough descriptive overview
    }
  }
  
  // Scoring by Tech Stack diversity
  if (proj.profile_tech_stack) {
    const tags = parseTechTags(proj.profile_tech_stack);
    score += tags.length * 20;
  }
  
  // Scoring by Key Features richness and bullet items
  if (proj.profile_key_features) {
    const featuresLen = proj.profile_key_features.trim().length;
    score += Math.min(featuresLen, 150);
    
    // Count bullets/key points
    const bulletCount = (proj.profile_key_features.match(/[-*•]/g) || []).length;
    score += bulletCount * 15;
  }
  
  return score;
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
    deleteAchievement,
    updateAchievement,
  } = useApp();

  const sortedStats = Object.entries(stats || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tech, count]) => `${tech} (${count})`);

  const sortedProjects = [...projects].sort((a, b) => {
    return calculateWorkspaceQualityScore(b) - calculateWorkspaceQualityScore(a);
  });

  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [totalAchievementsCount, setTotalAchievementsCount] = useState(0);
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

  // States for dynamic drill-down modal editing
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [isEditingAchievement, setIsEditingAchievement] = useState(false);
  const [editedAchievementContent, setEditedAchievementContent] = useState("");

  // Sync draft local state once draft changes globally
  useEffect(() => {
    setEditedDraftInput(status.draft_content || "");
  }, [status.draft_content]);

  // Fetch compact top 5 feeds for logs & approved achievements
  const fetchCompactFeeds = async () => {
    try {
      setLoadingFeed(true);
      const [logsRes, achievementsRes, allAchievementsRes] = await Promise.all([
        fetch(`/api/logs?limit=5&_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/achievements?limit=5&_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/achievements?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json())
      ]);
      setRecentLogs(Array.isArray(logsRes) ? logsRes : []);
      setRecentAchievements(Array.isArray(achievementsRes) ? achievementsRes : []);
      setTotalAchievementsCount(Array.isArray(allAchievementsRes) ? allAchievementsRes.length : 0);
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

  // Lightbox editing methods
  const handleDashboardDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this milestone from the Vault permanently?")) return;
    try {
      await deleteAchievement(id);
      setActiveAchievement(null);
      setIsEditingAchievement(false);
      fetchCompactFeeds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDashboardSaveEdit = async () => {
    if (!activeAchievement) return;
    try {
      await updateAchievement(activeAchievement.id, editedAchievementContent);
      setActiveAchievement(prev => prev ? { ...prev, content_md: editedAchievementContent } : null);
      setIsEditingAchievement(false);
      fetchCompactFeeds();
    } catch (err) {
      console.error(err);
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
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-880 shadow-inner">
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
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-805 border border-slate-200 dark:border-slate-850 rounded text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer"
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
                    className="w-full py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-extrabold uppercase rounded-lg shadow-sm text-xs disabled:opacity-45 mt-4 cursor-pointer transition-all"
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
                className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 font-extrabold uppercase text-xs rounded-xl tracking-wider shadow-sm animate-pulse disabled:opacity-40 cursor-pointer"
              >
                {summarizing ? "Drafting..." : "Compile Weekly Draft Report"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 2. EXECUTIVE METRICS BOARD */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-800 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Folder className="h-4 w-4 text-teal-500 animate-pulse" /> Active Codebases
          </span>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{projects.length}</div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold">Git hooks targets</p>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-800 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-teal-500" /> Total Raw Commits
          </span>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {Object.values(stats).reduce((a, b) => a + b, 0)}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold">Ingested Telemetry</p>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-800 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-teal-500 animate-pulse" /> Milestones Vaulted
          </span>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {totalAchievementsCount}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold">Approved Summaries</p>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-2 hover:border-slate-350 dark:hover:border-slate-800 transition-colors shadow-sm">
          <span className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-550 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-teal-500" /> Primary Tech stack
          </span>
          <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex flex-wrap gap-1.5 mt-1">
            {sortedStats.slice(0, 3).map(techWithCount => (
              <TechBadge key={techWithCount} tech={techWithCount} />
            ))}
            {sortedStats.length === 0 && (
              <span className="text-xs text-zinc-400 dark:text-zinc-650 font-bold">N/A</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-650 uppercase tracking-widest font-bold mt-1.5">Captured Dialect metrics</p>
        </div>

      </section>

      {/* CODEBASE WORKSPACE CATALOG OVERVIEW */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Laptop className="h-4 w-4 text-teal-500" /> Codebase Workspace Catalog
          </h3>
          <Link href="/workspaces" className="text-xs text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-0.5 uppercase tracking-wider font-bold transition-all">
            Manage Workspaces <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingProjects ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Loading workspaces catalog...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-3xl text-center text-zinc-500 text-xs">
            📭 No workspace codebases registered yet. Go to Workspaces to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProjects.slice(0, 3).map((proj, idx) => {
              const hasProfile = proj.profile_purpose || proj.profile_tech_stack || proj.profile_key_features;
              const score = calculateWorkspaceQualityScore(proj);
              const isTop = idx === 0 && score > 0;
              return (
                <div
                  key={proj.id}
                  className={`bg-white dark:bg-slate-950 border rounded-3xl p-5 space-y-3.5 shadow-sm transition-all duration-300 relative group overflow-hidden ${
                    isTop 
                      ? "border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-100/50 dark:ring-amber-500/5 hover:border-amber-350 dark:hover:border-amber-500/50" 
                      : "border-slate-200 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800"
                  }`}
                >
                  {isTop && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-[9px] text-white font-black px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1 font-mono">
                      <span>👑</span> PRIME CODEBASE
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-zinc-700 dark:text-zinc-400 truncate max-w-[150px]">📁 {proj.name}</span>
                    {!isTop ? (
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                        hasProfile 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                          : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                      }`}>
                        {hasProfile ? "Profiled" : "Pending"}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-md">
                        Score: {score}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <code className="text-[10px] bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-150 dark:border-slate-880 text-zinc-500 dark:text-zinc-450 block truncate select-all font-bold font-mono">
                      {proj.path}
                    </code>
                    {hasProfile ? (
                      <p className="text-xs text-zinc-650 dark:text-zinc-400 line-clamp-2 leading-relaxed font-sans font-semibold">
                        {proj.profile_purpose}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-450 dark:text-zinc-600 font-sans italic leading-relaxed">
                        No AI compiled profile description. Visit Workspaces route to scan.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
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
                    <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-555 font-mono">
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
                  <div
                    key={ach.id}
                    onClick={() => {
                      setActiveAchievement(ach);
                      setEditedAchievementContent(ach.content_md);
                      setIsEditingAchievement(false);
                    }}
                    className="p-4 bg-slate-50 dark:bg-slate-900/25 border border-slate-150 dark:border-slate-900 rounded-xl space-y-2 hover:border-slate-350 dark:hover:border-slate-800 transition-colors cursor-pointer"
                  >
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

      {/* 6. WEEKLY MILESTONE DRILL-DOWN LIGHTBOX FOR DASHBOARD FEEDS */}
      {activeAchievement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono text-left">
            
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
                {isEditingAchievement ? (
                  <button
                    onClick={handleDashboardSaveEdit}
                    className="h-8 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-650 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <Save className="h-3.5 w-3.5 text-emerald-500" /> Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingAchievement(true)}
                    className="h-8 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-teal-500" /> Edit Milestone
                  </button>
                )}

                {isEditingAchievement && (
                  <button
                    onClick={() => setIsEditingAchievement(false)}
                    className="h-8 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={() => handleDashboardDelete(activeAchievement.id)}
                  className="h-8 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete
                </button>

                <button
                  onClick={() => {
                    setActiveAchievement(null);
                    setIsEditingAchievement(false);
                  }}
                  className="h-8 w-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-500 dark:text-zinc-450 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 shadow-inner flex flex-col">
              {isEditingAchievement ? (
                <div className="flex-1 flex flex-col h-full space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Edit3 className="h-3.5 w-3.5 text-teal-500" /> Markdown Source Editor
                  </div>
                  <textarea
                    value={editedAchievementContent}
                    onChange={(e) => setEditedAchievementContent(e.target.value)}
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
