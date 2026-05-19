"use client";

import { useEffect, useState } from "react";
import { Folder, PlusCircle, Sparkles, X, ChevronRight, Laptop, Cpu, Settings, Copy, Code, Layers, FileCode, CheckCircle, AlertTriangle, Trash2, Database, History, Plus, RefreshCw, Save } from "lucide-react";
import { useApp, ProjectModel } from "../context/AppContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import TechBadge from "../components/TechBadge";
import StatusBadge from "../components/StatusBadge";
import { parseTechTags } from "../utils/techUtils";

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

export default function WorkspacesPage() {
  const { projects, loadingProjects, fetchProjects, deleteProject, showToast } = useApp();

  // Registration states
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPath, setRegPath] = useState("");
  const [regSource, setRegSource] = useState("github");
  const [registering, setRegistering] = useState(false);

  // Active workspace profile details modal states
  const [activeProject, setActiveProject] = useState<ProjectModel | null>(null);
  const [profilingMode, setProfilingMode] = useState<"none" | "standard" | "deep">("none");

  // Historic git import and custom log states
  const [importLimit, setImportLimit] = useState<number>(50);
  const [importingGit, setImportingGit] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const [customLogContent, setCustomLogContent] = useState("");
  const [savingCustomLog, setSavingCustomLog] = useState(false);
  const [customLogResult, setCustomLogResult] = useState<string | null>(null);

  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPath.trim()) {
      showToast("Please specify both workspace name and absolute directory target.", "error");
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
        throw new Error(data.error || "Failed to register target codebase.");
      }
      showToast("✓ Codebase registered! SQLite database records created & pre-commit trigger hooked.", "success");
      setRegName("");
      setRegPath("");
      setShowRegForm(false);
      await fetchProjects();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Repository registration failure.", "error");
    } finally {
      setRegistering(false);
    }
  };

  const triggerProfilingWithOption = async (projectId: number, deepScan: boolean) => {
    try {
      setProfilingMode(deepScan ? "deep" : "standard");
      showToast(
        deepScan
          ? "🚀 Running deep structural codebase Scan & AI diagnostic build mapping..."
          : "✨ Generating standard commit activity AI profile summary...",
        "info"
      );

      const params = new URLSearchParams();
      params.set("id", projectId.toString());
      if (deepScan) params.set("analyze_errors", "true");

      const res = await fetch(`/api/projects/profile?${params.toString()}`, {
        method: "POST"
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to compile AI codebase profile");
      }

      const updatedProj = await res.json();
      showToast(
        deepScan
          ? "✓ Deep codebase structural analysis and diagnostics compiled!"
          : "✓ Project log-based AI profile built successfully!",
        "success"
      );

      // Refresh project list and re-sync active model fields
      await fetchProjects();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "AI Profiling command failed.", "error");
    } finally {
      setProfilingMode("none");
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (window.confirm(`Are you sure you want to permanently delete the project "${activeProject.name}"? This action cannot be undone and will remove all associated AI profile data.`)) {
      await deleteProject(activeProject.id);
      setActiveProject(null);
    }
  };

  const handleImportGitHistory = async () => {
    if (!activeProject) return;
    try {
      setImportingGit(true);
      setImportResult(null);
      const res = await fetch("/api/projects/import-git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: activeProject.id, limit: importLimit }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import commits.");
      }
      setImportResult(`✓ Success: imported ${data.imported} new commit logs.`);
      showToast(`✓ Git history imported: ${data.imported} commits loaded!`, "success");
    } catch (err: any) {
      console.error(err);
      setImportResult(`❌ Error: ${err.message}`);
      showToast(err.message || "Failed to import git commits.", "error");
    } finally {
      setImportingGit(false);
    }
  };

  const handleSaveCustomLog = async () => {
    if (!activeProject || !customLogContent.trim()) return;
    try {
      setSavingCustomLog(true);
      setCustomLogResult(null);
      const res = await fetch("/api/projects/custom-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: activeProject.id, content: customLogContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save log entry.");
      }
      setCustomLogResult(`✓ Log entry successfully saved!`);
      setCustomLogContent("");
      showToast("✓ Custom achievement log added successfully!", "success");
    } catch (err: any) {
      console.error(err);
      setCustomLogResult(`❌ Error: ${err.message}`);
      showToast(err.message || "Failed to add manual log.", "error");
    } finally {
      setSavingCustomLog(false);
    }
  };

  // Keep the active project modal details synchronized when projects refresh
  useEffect(() => {
    if (activeProject) {
      const refreshed = projects.find(p => p.id === activeProject.id);
      if (refreshed) {
        setActiveProject(refreshed);
      }
    }
  }, [projects, activeProject]);

  return (
    <div className="space-y-8 font-mono pb-12 p-8 max-w-7xl mx-auto animate-fade-in transition-colors">
      
      {/* 1. HEADER SECTION */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="space-y-1">
          <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1.5 uppercase font-bold tracking-wider">
            <Cpu className="h-4 w-4 animate-pulse" /> Codebases Architecture Profiles
          </span>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase">
            Workspace Catalog
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-450 font-sans leading-relaxed">
            Manage development filesystems, run deep structural scans, and compile detailed architectural reports of framework libraries and sub-modules.
          </p>
        </div>
        <button
          onClick={() => setShowRegForm(!showRegForm)}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-zinc-650 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <PlusCircle className="h-4 w-4" /> Register Repository
        </button>
      </section>

      {/* 2. REPOSITORY REGISTRATION DRAWER */}
      {showRegForm && (
        <form
          onSubmit={handleRegisterProject}
          className="p-6 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-700 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-down shadow-xl"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block">Workspace Title</label>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. core-auth-service"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans shadow-inner"
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block">Absolute Folder Path</label>
            <input
              type="text"
              value={regPath}
              onChange={(e) => setRegPath(e.target.value)}
              placeholder="e.g. /home/tin/projects/core-auth-service"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans shadow-inner"
              required
            />
          </div>
          <div className="space-y-1.5 flex items-end">
            <button
              type="submit"
              disabled={registering}
              className="w-full py-2.5 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 font-extrabold uppercase rounded-xl text-xs shadow-sm cursor-pointer disabled:opacity-40 transition-all"
            >
              {registering ? "Registering..." : "Mount Git Interceptors"}
            </button>
          </div>
        </form>
      )}

      {/* 3. PROFILES GRID LIST */}
      <section className="space-y-6">
        {loadingProjects ? (
          <div className="py-24 text-center space-y-3">
            <div className="h-6 w-6 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-teal-600 dark:text-teal-400 font-bold">Querying enrolled workspaces...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-24 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-center text-zinc-500 text-sm leading-relaxed max-w-4xl mx-auto">
            📭 No workspace codebases registered yet. Use the registration panel to mount interceptor hooks.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {projects.map((proj) => {
              const hasProfile = proj.profile_purpose || proj.profile_tech_stack || proj.profile_key_features;
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    setActiveProject(proj);
                    setProfilingMode("none");
                  }}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-teal-500/30 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-teal-500/5 rounded-3xl p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-all duration-300 flex flex-col justify-between gap-5 shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-xs text-zinc-500 dark:text-zinc-450 flex items-center gap-1.5 uppercase font-black">
                        <Laptop className="h-3.5 w-3.5" /> Workspace Base
                      </span>
                      <StatusBadge status={hasProfile ? "Completed" : "Pending"} />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-slate-850 dark:text-zinc-100 truncate uppercase tracking-wider">{proj.name}</h4>
                      <code className="text-xs bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-150 dark:border-slate-700 text-zinc-550 dark:text-zinc-400 truncate block select-all font-bold">
                        {proj.path}
                      </code>
                    </div>

                    {hasProfile ? (
                      <p className="text-xs text-zinc-650 dark:text-zinc-400 line-clamp-3 leading-relaxed font-sans pt-3 border-t border-slate-150 dark:border-slate-700">
                        {proj.profile_purpose}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-450 dark:text-zinc-600 font-sans italic leading-relaxed pt-3 border-t border-slate-150 dark:border-slate-700">
                        No AI compiled profile description. Click card to run Standard Profile or deep filesystem Directory Scans.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {hasProfile && parseTechTags(proj.profile_tech_stack).slice(0, 4).map((tag, i) => (
                      <TechBadge key={`${tag}-${i}`} tech={tag} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. IMMERSIVE LIGHTBOX DEEP PROFILE VIEW WITH DUAL PROFILING CHANNELS */}
      {activeProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in font-mono">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Folder className="h-5 w-5 text-teal-500 dark:text-teal-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-855 dark:text-zinc-100">{activeProject.name}</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1 select-all">Path: {activeProject.path}</p>
                </div>
              </div>
              
              {/* Dual-Mode compilation controllers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerProfilingWithOption(activeProject.id, false)}
                  disabled={profilingMode !== "none"}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-700 text-zinc-650 dark:text-zinc-350 hover:text-slate-800 dark:hover:text-white font-extrabold text-xs uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Generate profile based solely on SQLite commit logs"
                >
                  <FileCode className={`h-3.5 w-3.5 ${profilingMode === "standard" ? "animate-spin text-teal-500" : "text-teal-500"}`} />
                  <span>{profilingMode === "standard" ? "Compiling Logs..." : "Standard Profile"}</span>
                </button>

                <button
                  onClick={() => triggerProfilingWithOption(activeProject.id, true)}
                  disabled={profilingMode !== "none"}
                  className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-extrabold text-xs uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer animate-pulse"
                  title="Run deep directory file system scanning, framework mappings and AI build analysis"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${profilingMode === "deep" ? "animate-spin text-teal-400" : "text-teal-400"}`} />
                  <span>{profilingMode === "deep" ? "Deep Scanning Repo..." : "Deep Scan (Diagnostics)"}</span>
                </button>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                <button
                  onClick={handleDeleteProject}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-650 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-extrabold text-xs uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  title="Permanently remove project from vault"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  onClick={() => setActiveProject(null)}
                  className="h-8 w-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-700 text-zinc-500 dark:text-zinc-450 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-950 flex flex-col space-y-6 text-left">
              
              {/* Path and Score Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-700 rounded-2xl">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black font-mono">Workspace path</span>
                  <code className="text-xs text-zinc-650 dark:text-zinc-300 block font-bold select-all break-all font-mono">
                    {activeProject.path}
                  </code>
                </div>
                {calculateWorkspaceQualityScore(activeProject) > 0 && (
                  <div className="flex flex-col items-center justify-center bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-xl text-center min-w-[100px] font-mono">
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest">Profile Score</span>
                    <span className="text-lg font-black text-amber-500">{calculateWorkspaceQualityScore(activeProject)}</span>
                  </div>
                )}
              </div>

              {/* Log Ingestion & Import History Section */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-700 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-teal-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-850 dark:text-zinc-200 font-mono">Telemetry & Log Injection</h4>
                      <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-sans mt-0.5">Ingest missing commits or add manual achievements easily</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {/* Left Column: Import Git History */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                      <History className="h-3.5 w-3.5 text-teal-500" /> Git Commit Importer
                    </h5>
                    <p className="text-[11px] text-zinc-550 dark:text-zinc-400 font-sans leading-relaxed">
                      Clone got done *before* setting up the vault hook? Import your existing commit history directly from the git database to record past accomplishments.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[120px]">
                        <input
                          type="number"
                          value={importLimit}
                          onChange={(e) => setImportLimit(parseInt(e.target.value) || 50)}
                          placeholder="Limit"
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold font-mono focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <button
                        onClick={handleImportGitHistory}
                        disabled={importingGit}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-extrabold text-xs uppercase rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${importingGit ? "animate-spin" : ""}`} />
                        <span>{importingGit ? "Importing..." : "Scan & Import"}</span>
                      </button>
                    </div>
                    {importResult && (
                      <p className={`text-[11px] font-bold ${importResult.includes("Success") ? "text-emerald-500" : "text-amber-500"}`}>
                        {importResult}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Custom Log Addition */}
                  <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-150 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Plus className="h-3.5 w-3.5 text-teal-500" /> Manual Achievement Log
                    </h5>
                    <p className="text-[11px] text-zinc-550 dark:text-zinc-400 font-sans leading-relaxed">
                      Completed an architectural planning session, whiteboard design, or offline code review? Inject it as a custom accomplishment.
                    </p>
                    <div className="flex gap-2 items-start">
                      <textarea
                        value={customLogContent}
                        onChange={(e) => setCustomLogContent(e.target.value)}
                        placeholder="E.g. Completed advanced security authentication audit..."
                        rows={2}
                        className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500 resize-none font-sans"
                      />
                      <button
                        onClick={handleSaveCustomLog}
                        disabled={savingCustomLog || !customLogContent.trim()}
                        className="px-4 py-2 bg-slate-950 dark:bg-zinc-100 hover:bg-slate-850 dark:hover:bg-white disabled:opacity-40 text-white dark:text-slate-950 font-extrabold text-xs uppercase rounded-xl shadow-sm transition-all h-[36px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{savingCustomLog ? "Saving..." : "Save"}</span>
                      </button>
                    </div>
                    {customLogResult && (
                      <p className={`text-[11px] font-bold ${customLogResult.includes("successfully") ? "text-emerald-500" : "text-red-500"}`}>
                        {customLogResult}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {activeProject.profile_purpose || activeProject.profile_tech_stack || activeProject.profile_key_features ? (
                <div className="space-y-6">
                  
                  {/* Profile Purpose */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono">
                      <Laptop className="h-4 w-4 text-teal-500" /> Workspace Purpose
                    </h4>
                    {activeProject.profile_purpose ? (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed bg-slate-50/50 dark:bg-slate-900/10 p-4 border border-slate-150 dark:border-slate-700 rounded-2xl font-semibold">
                        {activeProject.profile_purpose}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 dark:text-zinc-650 italic leading-relaxed font-sans">
                        No purpose description compiled for this repository.
                      </p>
                    )}
                  </div>

                  {/* Profile Tech Stack */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono">
                      <Code className="h-4 w-4 text-teal-500" /> Tech Stack & Dialects
                    </h4>
                    {activeProject.profile_tech_stack ? (
                      <div className="flex flex-wrap gap-1.5 p-4 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-700 rounded-2xl">
                        {parseTechTags(activeProject.profile_tech_stack).map((tag, i) => (
                          <TechBadge key={`${tag}-${i}`} tech={tag} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 dark:text-zinc-650 italic leading-relaxed font-sans">
                        No tech stack identified yet.
                      </p>
                    )}
                  </div>

                  {/* Profile Key Features */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono">
                      <Layers className="h-4 w-4 text-teal-500" /> Key Features & Architecture
                    </h4>
                    {activeProject.profile_key_features ? (
                      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-700 rounded-2xl prose dark:prose-invert max-w-none text-xs font-sans text-zinc-700 dark:text-zinc-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeProject.profile_key_features}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 dark:text-zinc-650 italic leading-relaxed font-sans">
                        No key architectural features compiled yet. Run a Deep Scan to extract them.
                      </p>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-20 text-center max-w-xl mx-auto space-y-4 font-sans">
                  <div className="text-4xl">🤖</div>
                  <h3 className="text-sm font-black uppercase font-mono text-slate-850 dark:text-slate-100">AI Profile Summary Pending</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    This project codebase profile has not been compiled yet. Click <strong>Standard Profile</strong> above to scan git commit logs, or run <strong>Deep Scan (Diagnostics)</strong> to run structural folder maps & configuration scanners.
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border-t border-slate-200 dark:border-slate-700 text-xs text-zinc-550 dark:text-zinc-500 flex justify-between items-center">
              <span>Register Source: {activeProject.source}</span>
              <span>Enrolled: {new Date(activeProject.created_at).toLocaleString()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
