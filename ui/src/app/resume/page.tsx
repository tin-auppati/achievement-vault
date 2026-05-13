"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Briefcase, Plus, Sparkles, Save, Trash2, Copy, Award } from "lucide-react";
import { useApp, ResumeModel } from "../context/AppContext";

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
  let colorClass = "";
  if (normalized.includes("active") || normalized.includes("saved") || normalized.includes("compiled")) {
    colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  } else {
    colorClass = "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }
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

export default function ResumePage() {
  const {
    resumes,
    loadingResumes,
    fetchResumes,
    showToast
  } = useApp();

  const [activeResumeId, setActiveResumeId] = useState<number | null>(null);
  const [resumeTitleInput, setResumeTitleInput] = useState("");
  const [resumeContentInput, setResumeContentInput] = useState("");
  const [savingResume, setSavingResume] = useState(false);
  const [compilingResumeAI, setCompilingResumeAI] = useState(false);
  const [resumeMode, setResumeMode] = useState<"edit" | "preview">("edit");

  const handleResetEditor = () => {
    setActiveResumeId(null);
    setResumeTitleInput("");
    setResumeContentInput("");
    showToast("Editor cleared! Ready to draft a new version.", "info");
  };

  const handleLoadResume = (resume: ResumeModel) => {
    setActiveResumeId(resume.id);
    setResumeTitleInput(resume.version_name);
    setResumeContentInput(resume.content_md);
    showToast(`Loaded version: ${resume.version_name}`, "info");
  };

  const handleSaveResume = async () => {
    if (!resumeTitleInput.trim() || !resumeContentInput.trim()) {
      showToast("Please provide both a Title and Content for your resume version.", "error");
      return;
    }

    try {
      setSavingResume(true);
      const isEdit = activeResumeId !== null;
      const url = isEdit ? `/api/resumes/${activeResumeId}` : "/api/resumes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_name: resumeTitleInput,
          content_md: resumeContentInput,
        }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to save resume");
      
      const resData = await res.json().catch(() => ({}));
      if (!isEdit && resData.id) {
        setActiveResumeId(resData.id);
      }
      
      showToast(isEdit ? "✓ Resume version updated successfully!" : "✓ New resume version saved successfully!", "success");
      await fetchResumes();
    } catch (err) {
      console.error(err);
      showToast("Failed to save resume version.", "error");
    } finally {
      setSavingResume(false);
    }
  };

  const handleDeleteResume = async (id: number) => {
    if (!confirm("Are you sure you want to delete this resume version? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to delete resume");

      showToast("✓ Resume version deleted successfully.", "success");
      if (activeResumeId === id) {
        setActiveResumeId(null);
        setResumeTitleInput("");
        setResumeContentInput("");
      }
      await fetchResumes();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete resume version.", "error");
    }
  };

  const handleDraftResumeAI = async () => {
    try {
      setCompilingResumeAI(true);
      showToast("✨ Pulling weekly summaries to draft full portfolio resume with Gemini...", "info");
      
      const res = await fetch("/api/resume", { cache: "no-store" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to draft resume");
      }
      
      const data = await res.json();
      setResumeContentInput(data.resume_content);
      if (!resumeTitleInput) {
        setResumeTitleInput(`AI Portfolio Draft - ${new Date().toLocaleDateString()}`);
      }
      showToast("✓ AI Resume compiled! Edit and Polish inside the workstation.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to draft resume with Gemini.", "error");
    } finally {
      setCompilingResumeAI(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* GRID LAYOUT CONTAINER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1">
        
        {/* Left Side: Workspace Editor & Input Controls (8/12 width) */}
        <div className="xl:col-span-8 space-y-5 flex flex-col">
          
          {/* Workspace Setup Panel */}
          <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-900 font-mono">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-500" />
                Portfolio Resume Compiler Workbench
              </h3>
              <button
                onClick={handleResetEditor}
                className="text-[8px] font-bold text-zinc-400 hover:text-rose-500 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" /> New Version Draft
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 font-mono">
              {/* Version Name input */}
              <div className="flex-1 space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                  Resume Version Title
                </label>
                <input
                  type="text"
                  value={resumeTitleInput}
                  onChange={(e) => setResumeTitleInput(e.target.value)}
                  placeholder="e.g., Senior Fullstack Engineer Portfolio v1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Drafting Options */}
              <div className="flex items-end gap-2.5">
                <button
                  onClick={handleDraftResumeAI}
                  disabled={compilingResumeAI}
                  className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 hover:text-teal-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${compilingResumeAI ? "animate-spin" : ""}`} />
                  {compilingResumeAI ? "Drafting Portfolio..." : "Draft with Gemini AI"}
                </button>
              </div>
            </div>

            {/* MODE TOGGLE SEGMENTED CONTROL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-900 font-mono">
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setResumeMode("edit")}
                  className={`px-4 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                    resumeMode === "edit"
                      ? "bg-slate-950 text-teal-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Raw Editor
                </button>
                <button
                  type="button"
                  onClick={() => setResumeMode("preview")}
                  className={`px-4 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                    resumeMode === "preview"
                      ? "bg-slate-950 text-teal-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Document Preview
                </button>
              </div>

              <div className="flex items-center gap-2">
                {resumeMode === "edit" ? (
                  <span className="text-[8px] font-bold text-zinc-500 tracking-wide uppercase">
                    💡 Use Markdown syntax to format your portfolio text
                  </span>
                ) : (
                  <span className="text-[8px] font-bold text-teal-400/80 tracking-wide uppercase animate-pulse">
                    ✨ Real-time parsed document view active
                  </span>
                )}
              </div>
            </div>

            {/* DYNAMIC CONTENT PANES BASED ON CHOSEN MODE */}
            <div className="pt-3">
              {resumeMode === "edit" ? (
                <div className="space-y-1.5 font-mono">
                  <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                    Raw Markdown Editor
                  </label>
                  <textarea
                    value={resumeContentInput}
                    onChange={(e) => setResumeContentInput(e.target.value)}
                    placeholder="Draft portfolio content or edit here..."
                    className="w-full h-[520px] p-5 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none leading-relaxed shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 font-mono">
                  <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                    Live Rendered Document Preview
                  </label>
                  <div className="w-full min-h-[520px] max-h-[600px] p-8 md:p-12 bg-slate-900/40 border border-slate-900 rounded-xl overflow-y-auto prose dark:prose-invert max-w-none text-zinc-300 font-sans leading-relaxed shadow-inner">
                    {resumeContentInput.trim() === "" ? (
                      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-500 font-mono gap-2 select-none">
                        <span className="text-sm">Empty State</span>
                        <span className="text-[10px]">Your resume is blank. Use &quot;Draft with Gemini&quot; or write something to see it here!</span>
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{resumeContentInput}</ReactMarkdown>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Workstation Actions Footer */}
            <div className="pt-4 border-t border-slate-900 flex justify-between items-center mt-3 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-[8.5px] text-zinc-500 uppercase">Status:</span>
                {activeResumeId !== null ? (
                  <StatusBadge status={`Editing Version #${activeResumeId}`} />
                ) : (
                  <StatusBadge status="New Draft Portfolio" />
                )}
              </div>
              <button
                onClick={handleSaveResume}
                disabled={savingResume}
                className="px-5 py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 hover:text-teal-300 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                {savingResume ? "Saving..." : "Save Portfolio Version"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Saved Portfolio Resumes Versions Gallery (4/12 width) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 font-mono">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Award className="h-4 w-4 text-teal-500" />
              Saved Versions Gallery
            </span>
            <span className="text-[9px] bg-slate-900 px-2.5 py-0.5 border border-slate-800 rounded-full text-zinc-400">
              {resumes.length} Saved
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 font-mono">
            {loadingResumes ? (
              <div className="text-center py-12">
                <div className="h-5 w-5 border-t-2 border-teal-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12 bg-slate-950 border border-dashed border-slate-900 rounded-2xl select-none">
                <p className="text-[10px] text-zinc-500">No portfolios saved inside SQLite yet.</p>
              </div>
            ) : (
              resumes.map((resItem) => {
                const isActive = activeResumeId === resItem.id;
                return (
                  <div
                    key={resItem.id}
                    className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3.5 transition-all duration-300 relative group ${
                      isActive
                        ? "bg-slate-900/30 border-teal-500"
                        : "bg-slate-950 border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center gap-1">
                        <h4 className="text-[10px] font-extrabold tracking-wide text-zinc-200 uppercase line-clamp-1">
                          {resItem.version_name}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {isActive ? (
                            <StatusBadge status="Active" />
                          ) : (
                            <StatusBadge status="Saved" />
                          )}
                        </div>
                      </div>
                      <p className="text-[8px] text-zinc-500 mt-1">
                        Compiled: {new Date(resItem.created_at).toLocaleString()}
                      </p>
                      
                      {/* Extracted Tech Keywords as tags */}
                      {extractTechKeywords(resItem.content_md).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {extractTechKeywords(resItem.content_md).map((tech, techIdx) => (
                            <TechBadge key={`${tech}-${techIdx}`} tech={tech} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Render preview snippet */}
                    <div className="text-[9px] text-zinc-500 line-clamp-3 font-sans leading-relaxed border-t border-b border-slate-900 py-2.5 max-w-none pointer-events-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{resItem.content_md}</ReactMarkdown>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(resItem.content_md);
                          showToast("Markdown copied to clipboard!", "success");
                        }}
                        className="p-1.5 hover:bg-slate-900 rounded-lg text-zinc-500 hover:text-teal-400 transition-colors cursor-pointer"
                        title="Copy Full Markdown"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleLoadResume(resItem)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-md cursor-pointer text-zinc-300 hover:text-white text-[8px] font-bold uppercase transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resItem.id)}
                          className="p-1.5 bg-rose-950/20 hover:bg-rose-950/60 border border-rose-950/10 rounded-lg text-rose-400 transition-colors cursor-pointer"
                          title="Delete version"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
