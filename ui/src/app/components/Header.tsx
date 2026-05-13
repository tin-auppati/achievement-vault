"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Sparkles, RefreshCw, Sun, Moon, Database, CheckCircle, AlertCircle, Award, X, FileText, Copy } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const {
    projects,
    status,
    summarizing,
    checkingPending,
    refreshing,
    loadingProjectSummary,
    projectSummaryContent,
    showProjectSummaryModal,
    setShowProjectSummaryModal,
    fetchAllGlobalData,
    triggerSummarize,
    triggerProjectProfiling,
    triggerProjectSummary,
    showToast
  } = useApp();

  const [selectedProfilingProj, setSelectedProfilingProj] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selected project default once projects are loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProfilingProj) {
      setSelectedProfilingProj(projects[0].id.toString());
    }
  }, [projects, selectedProfilingProj]);

  const handleProfileClick = () => {
    if (!selectedProfilingProj) {
      showToast("Please select a project to profile first", "error");
      return;
    }
    triggerProjectProfiling(parseInt(selectedProfilingProj));
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-900 bg-white/85 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-mono transition-colors">
      
      {/* BRANDING */}
      <div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-teal-500 dark:text-teal-400" />
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
            ACHIEVEMENT VAULT
          </h1>
        </div>
        <p className="text-xs text-zinc-550 dark:text-zinc-400 uppercase tracking-widest mt-0.5 font-bold">
          AI-Powered Engineering Portfolio & SaaS Workspace
        </p>
      </div>

      {/* CORE CONTROLS & STATUS */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        
        {/* Check Pending Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-zinc-500 dark:text-zinc-600 uppercase text-xs tracking-wider font-bold">Status:</span>
          {checkingPending ? (
            <span className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400 font-bold">
              <RefreshCw className="h-3 w-3 animate-spin" /> checking...
            </span>
          ) : status.has_pending_draft ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Pending Review
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Sync Complete
            </span>
          )}
        </div>

        {/* AI SUMMARIZE BUTTON */}
        <button
          onClick={triggerSummarize}
          disabled={summarizing}
          className="h-9 px-4 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:text-teal-750 dark:hover:text-teal-300 font-extrabold rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 text-xs"
          title="Summarize weekly git logs using Gemini AI"
        >
          <Sparkles className={`h-3.5 w-3.5 ${summarizing ? "animate-spin" : ""}`} />
          <span>{summarizing ? "Summarizing..." : "AI Summarize"}</span>
        </button>

        {/* PROJECT SUMMARY BUTTON */}
        <button
          onClick={triggerProjectSummary}
          disabled={loadingProjectSummary}
          className="h-9 px-4 bg-violet-500/10 hover:bg-violet-500/25 border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:text-violet-750 dark:hover:text-violet-300 font-extrabold rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 text-xs"
          title="Compile full achievements portfolio resume using Gemini AI"
        >
          <Award className={`h-3.5 w-3.5 ${loadingProjectSummary ? "animate-spin" : ""}`} />
          <span>{loadingProjectSummary ? "Compiling Resume..." : "Project Summary"}</span>
        </button>


        {/* REFRESH FEED BUTTON */}
        <button
          onClick={async () => {
            if (refreshing) return;
            await fetchAllGlobalData();
            showToast("Global data caches synchronized with SQLite db.", "success");
          }}
          disabled={refreshing}
          className="h-9 w-9 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          title="Refresh Global Feeds"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-teal-500" : ""}`} />
        </button>

        {/* DARK MODE TOGGLE */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        )}

      </div>

      {/* IMMERSIVE GLOBAL PROJECT SUMMARY PORTFOLIO LIGHTBOX */}
      {showProjectSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in font-mono text-left">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-violet-500" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">AI Generated Resume Portfolio</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-1">Compiled from all approved weekly milestones across your repositories.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(projectSummaryContent);
                    showToast("✓ Markdown resume copied to clipboard!", "success");
                  }}
                  className="h-8 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                >
                  <Copy className="h-3.5 w-3.5 text-teal-500" /> Copy Markdown
                </button>
                <button
                  onClick={() => setShowProjectSummaryModal(false)}
                  className="h-8 w-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-zinc-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 shadow-inner flex flex-col">
              <div className="prose dark:prose-invert prose-base lg:prose-lg max-w-none text-zinc-850 dark:text-zinc-300 font-sans leading-relaxed">
                {projectSummaryContent.trim() === "" ? (
                  <p className="text-sm text-zinc-500 text-center font-mono py-12">No project summary data available.</p>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{projectSummaryContent}</ReactMarkdown>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border-t border-slate-200 dark:border-slate-850 text-xs text-zinc-550 dark:text-zinc-500 flex justify-between items-center">
              <span>Source: sqlite://weekly_achievements</span>
              <span>Generated on: {new Date().toLocaleDateString()}</span>
            </div>

          </div>
        </div>
      )}

    </header>
  );
}
