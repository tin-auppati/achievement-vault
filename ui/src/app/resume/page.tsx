"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Briefcase, Plus, Sparkles, Save, Trash2, Copy, Award } from "lucide-react";
import { useApp, ResumeModel } from "../context/AppContext";
import TechBadge from "../components/TechBadge";
import StatusBadge from "../components/StatusBadge";
import { extractTechKeywords } from "../utils/techUtils";

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
    <div className="p-8 max-w-7xl mx-auto space-y-6 transition-all">
      
      {/* GRID LAYOUT CONTAINER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1">
        
        {/* Left Side: Workspace Editor & Input Controls (8/12 width) */}
        <div className="xl:col-span-8 space-y-5 flex flex-col">
          
          {/* Workspace Setup Panel */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700 font-mono">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-500" />
                Portfolio Resume Compiler Workbench
              </h3>
              <button
                onClick={handleResetEditor}
                className="text-xs font-bold text-zinc-500 hover:text-rose-555 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> New Version Draft
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 font-mono">
              {/* Version Name input */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500 block">
                  Resume Version Title
                </label>
                <input
                  type="text"
                  value={resumeTitleInput}
                  onChange={(e) => setResumeTitleInput(e.target.value)}
                  placeholder="e.g., Senior Fullstack Engineer Portfolio v1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-855 dark:text-slate-100 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Drafting Options */}
              <div className="flex items-end gap-2.5">
                <button
                  onClick={handleDraftResumeAI}
                  disabled={compilingResumeAI}
                  className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-650 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer h-9"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${compilingResumeAI ? "animate-spin" : ""}`} />
                  {compilingResumeAI ? "Drafting Portfolio..." : "Draft with Gemini AI"}
                </button>
              </div>
            </div>

            {/* MODE TOGGLE SEGMENTED CONTROL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 font-mono">
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                <button
                  type="button"
                  onClick={() => setResumeMode("edit")}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                    resumeMode === "edit"
                      ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
                  }`}
                >
                  Raw Editor
                </button>
                <button
                  type="button"
                  onClick={() => setResumeMode("preview")}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                    resumeMode === "preview"
                      ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355"
                  }`}
                >
                  Document Preview
                </button>
              </div>

              <div className="flex items-center gap-2">
                {resumeMode === "edit" ? (
                  <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">
                    💡 Use Markdown syntax to format your portfolio text
                  </span>
                ) : (
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400/80 tracking-wide uppercase animate-pulse">
                    ✨ Real-time parsed document view active
                  </span>
                )}
              </div>
            </div>

            {/* DYNAMIC CONTENT PANES BASED ON CHOSEN MODE */}
            <div className="pt-3">
              {resumeMode === "edit" ? (
                <div className="space-y-1.5 font-mono">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 block">
                    Raw Markdown Editor
                  </label>
                  <textarea
                    value={resumeContentInput}
                    onChange={(e) => setResumeContentInput(e.target.value)}
                    placeholder="Draft portfolio content or edit here..."
                    className="w-full h-[520px] p-5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none leading-relaxed shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 font-mono">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 block">
                    Live Rendered Document Preview
                  </label>
                  <div className="w-full min-h-[520px] max-h-[600px] p-8 md:p-12 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl overflow-y-auto prose dark:prose-invert prose-base lg:prose-lg max-w-none text-zinc-800 dark:text-zinc-300 font-sans leading-relaxed shadow-inner">
                    {resumeContentInput.trim() === "" ? (
                      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-500 font-mono gap-2 select-none">
                        <span className="text-sm font-bold">Empty State</span>
                        <span className="text-xs text-zinc-650 dark:text-zinc-455">Your resume is blank. Use &quot;Draft with Gemini&quot; or write something to see it here!</span>
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{resumeContentInput}</ReactMarkdown>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Workstation Actions Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center mt-3 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-550 dark:text-zinc-500 uppercase font-bold">Status:</span>
                {activeResumeId !== null ? (
                  <StatusBadge status={`Editing Version #${activeResumeId}`} />
                ) : (
                  <StatusBadge status="New Draft Portfolio" />
                )}
              </div>
              <button
                onClick={handleSaveResume}
                disabled={savingResume}
                className="px-5 py-2 bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 text-xs font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 h-9"
              >
                <Save className="h-4 w-4" />
                {savingResume ? "Saving..." : "Save Portfolio Version"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Saved Portfolio Resumes Versions Gallery (4/12 width) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 font-mono">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Award className="h-4 w-4 text-teal-500" />
              Saved Versions Gallery
            </span>
            <span className="text-xs bg-slate-50 dark:bg-slate-900 px-2.5 py-0.5 border border-slate-200 dark:border-slate-700 rounded-full text-zinc-650 dark:text-zinc-400 font-bold">
              {resumes.length} Saved
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 font-mono">
            {loadingResumes ? (
              <div className="text-center py-12">
                <div className="h-5 w-5 border-t-2 border-teal-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl select-none shadow-inner">
                <p className="text-xs text-zinc-500">No portfolios saved inside SQLite yet.</p>
              </div>
            ) : (
              resumes.map((resItem) => {
                const isActive = activeResumeId === resItem.id;
                return (
                  <div
                    key={resItem.id}
                    className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3.5 transition-all duration-300 relative group ${
                      isActive
                        ? "bg-slate-50 dark:bg-slate-900/30 border-teal-500"
                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center gap-1">
                        <h4 className="text-xs font-extrabold tracking-wide text-zinc-800 dark:text-zinc-200 uppercase line-clamp-1">
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
                      <p className="text-xs text-zinc-500 mt-1">
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
                    <div className="text-xs text-zinc-650 dark:text-zinc-550 line-clamp-3 font-sans leading-relaxed border-t border-b border-slate-200 dark:border-slate-700 py-2.5 max-w-none pointer-events-none prose dark:prose-invert prose-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{resItem.content_md}</ReactMarkdown>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(resItem.content_md);
                          showToast("Markdown copied to clipboard!", "success");
                        }}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-zinc-500 hover:text-teal-500 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        title="Copy Full Markdown"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleLoadResume(resItem)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer text-zinc-700 dark:text-zinc-300 hover:text-slate-850 dark:hover:text-white text-[10px] font-bold uppercase transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resItem.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-950/10 rounded-lg text-rose-500 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Delete version"
                        >
                          <Trash2 className="h-4 w-4" />
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
