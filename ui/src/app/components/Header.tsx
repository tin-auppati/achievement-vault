"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sparkles, RefreshCw, Sun, Moon, Database, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const {
    projects,
    status,
    summarizing,
    checkingPending,
    fetchAllGlobalData,
    triggerSummarize,
    triggerProjectProfiling,
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
        <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5 font-bold">
          AI-Powered Engineering Portfolio & SaaS Workspace
        </p>
      </div>

      {/* CORE CONTROLS & STATUS */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        
        {/* Check Pending Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg">
          <span className="text-zinc-500 dark:text-zinc-600 uppercase text-xs tracking-wider font-bold">Status:</span>
          {checkingPending ? (
            <span className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400">
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
          className="h-9 px-4 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:text-teal-550 dark:hover:text-teal-300 font-extrabold rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 text-xs"
          title="Summarize weekly git logs using Gemini AI"
        >
          <Sparkles className={`h-3.5 w-3.5 ${summarizing ? "animate-spin" : ""}`} />
          <span>{summarizing ? "Summarizing..." : "AI Summarize"}</span>
        </button>

        {/* PROJECT PROFILE WORKBENCH TRIGGER */}
        {projects.length > 0 && (
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-9">
            <select
              value={selectedProfilingProj}
              onChange={(e) => setSelectedProfilingProj(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 text-zinc-700 dark:text-zinc-300 px-2.5 h-full border-none focus:outline-none cursor-pointer font-sans text-xs shadow-inner"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleProfileClick}
              className="px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 h-full border-l border-slate-200 dark:border-slate-800 text-zinc-650 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white font-bold transition-all cursor-pointer shadow-sm text-xs"
              title="Profile project architectural stack"
            >
              Profile Stack
            </button>
          </div>
        )}

        {/* REFRESH FEED BUTTON */}
        <button
          onClick={() => {
            fetchAllGlobalData();
            showToast("Global data caches synchronized with SQLite db.", "success");
          }}
          className="h-9 w-9 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
          title="Refresh Global Feeds"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* DARK MODE TOGGLE */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
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

    </header>
  );
}
