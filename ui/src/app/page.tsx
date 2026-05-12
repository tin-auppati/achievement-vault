"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Sun, Moon, Laptop, RotateCw, Activity, Award, BarChart3, AlertTriangle, Sparkles, X, ChevronRight, Eye, Code, Search, Copy, Check, Folder, Briefcase, Save, Trash2, Plus, Terminal } from "lucide-react";

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

function TechBadge({ tech }: { tech: string }) {
  const normalized = tech.trim().toLowerCase();
  
  // Choose color configuration
  let colorClass = "";
  if (normalized === "go" || normalized === "golang") {
    // Cyan
    colorClass = "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20";
  } else if (normalized === "typescript" || normalized === "ts") {
    // Blue
    colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  } else if (normalized === "python") {
    // Yellow
    colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
  } else if (normalized === "docker" || normalized === "dockerfile") {
    // Sky Blue
    colorClass = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20";
  } else if (normalized === "react" || normalized === "next.js" || normalized === "nextjs" || normalized === "javascript" || normalized === "js") {
    // Indigo
    colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
  } else if (normalized === "tailwind" || normalized === "tailwindcss" || normalized === "css" || normalized === "sass") {
    // Teal
    colorClass = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20";
  } else if (normalized === "sqlite" || normalized === "sql" || normalized === "postgres" || normalized === "postgresql" || normalized === "database" || normalized === "db") {
    // Violet
    colorClass = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
  } else if (normalized === "git" || normalized === "github") {
    // Rose
    colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
  } else if (normalized === "rust") {
    // Orange
    colorClass = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
  } else {
    // Fallback: neutral Slate/Gray
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
  
  if (
    normalized.includes("pending") || 
    normalized.includes("in progress") || 
    normalized.includes("draft") ||
    normalized.includes("editing")
  ) {
    // Amber / Orange
    colorClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  } else if (
    normalized.includes("approved") || 
    normalized.includes("completed") || 
    normalized.includes("active") || 
    normalized.includes("success") || 
    normalized.includes("saved")
  ) {
    // Emerald / Green
    colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  } else {
    // Neutral Slate/Gray
    colorClass = "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border font-mono ${colorClass}`}>
      {status}
    </span>
  );
}

function parseTechTags(techStackStr: string): string[] {
  if (!techStackStr) return [];
  const items = techStackStr.split(/[\n,;•\-*]+/);
  return items
    .map(t => t.replace(/[`*_\s]+/g, " ").trim())
    .filter(t => t.length > 0 && t.length < 30);
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

const CLI_COMMANDS = [
  {
    command: "vault register <name> <path> <source>",
    desc: "Register a new local development project to track its commits in the SQLite database.",
    category: "setup",
    example: "vault register \"my-api\" \"/home/tin/projects/my-api\" \"github\"",
    tags: ["CLI", "Config", "DB Init"]
  },
  {
    command: "vault scan-repo <path> [--analyze-errors]",
    desc: "Deep scan codebase layout & git history to compile a Project Profile. Safe fallback to static configs, with optional '--analyze-errors' for compiler troubleshooting.",
    category: "setup",
    example: "vault scan-repo /home/tin/projects/achievement-vault --analyze-errors",
    tags: ["Scanner", "Git", "AI Summary"]
  },
  {
    command: "vault install <project_name>",
    desc: "Install Git post-commit hook automatically in the registered project to capture active logs on every commit.",
    category: "setup",
    example: "vault install \"my-api\"",
    tags: ["Git Hook", "Automation"]
  },
  {
    command: "vault setup-shell",
    desc: "Append pending report check trigger to your shell config file (.bashrc or .zshrc) so you get alerts on login.",
    category: "setup",
    example: "vault setup-shell",
    tags: ["Shell", "DX", "Alert"]
  },
  {
    command: "vault setup-global",
    desc: "Configure global 'vault' command alias and export VAULT_HOME so it is accessible from anywhere.",
    category: "setup",
    example: "vault setup-global",
    tags: ["Shell", "Environment"]
  },
  {
    command: "vault collect --project-id <id> --message <msg> --diff <diff>",
    desc: "Backend hook utility to ingest activities into the SQLite database. Used automatically by post-commit hooks.",
    category: "collect",
    example: "vault collect --project-id 1 --message \"feat: add auth API\" --diff \"+ func Authenticate...\"",
    tags: ["Ingest", "Hooks", "SQLite"]
  },
  {
    command: "vault summarize [--days <days>]",
    desc: "Analyze recent git logs via Gemini AI and generate a pending executive weekly progress summary.",
    category: "summarize",
    example: "vault summarize --days 7",
    tags: ["AI", "Gemini", "Markdown"]
  },
  {
    command: "vault summarize-project",
    desc: "Analyze all approved achievements in weekly_achievements and generate a comprehensive recruiter-ready markdown resume.",
    category: "summarize",
    example: "vault summarize-project",
    tags: ["AI", "Portfolio", "Compiler"]
  },
  {
    command: "vault history [<id>]",
    desc: "List saved weekly achievement summaries or view a detailed entry by SQLite ID in terminal.",
    category: "summarize",
    example: "vault history 5",
    tags: ["CLI History", "Markdown"]
  },
  {
    command: "vault check-pending",
    desc: "Scan the database and warn in terminal if a weekly executive summary is due or pending for the current week.",
    category: "summarize",
    example: "vault check-pending",
    tags: ["Scheduler", "DX", "Alert"]
  },
  {
    command: "vault serve [<port>]",
    desc: "Launch the REST API backend server to handle database requests from the web UI (default port 8001).",
    category: "services",
    example: "vault serve 8001",
    tags: ["HTTP Server", "REST API", "Port 8001"]
  },
  {
    command: "vault start-all",
    desc: "Start both the Go REST API server and Next.js Dev Web Server concurrently for full workstation access.",
    category: "services",
    example: "vault start-all",
    tags: ["DevOps", "Launcher"]
  },
  {
    command: "vault autostart <enable|disable>",
    desc: "Configure or remove Systemd background service to automatically boot the vault servers on system startup.",
    category: "services",
    example: "vault autostart enable",
    tags: ["Systemd", "Background", "Linux"]
  },
  {
    command: "vault test-ui",
    desc: "Execute the automated Next.js headless browser test runner using optimized Chrome flags and capture DOM states to data/test-ui-recovery.html.",
    category: "services",
    example: "vault test-ui",
    tags: ["QA Testing", "Puppeteer", "Chrome Headless"]
  },
  {
    command: "vault help",
    desc: "Display the premium terminal usage manual and interactive dashboard inside your command line.",
    category: "services",
    example: "vault help",
    tags: ["Manual", "Terminal UI"]
  }
];

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [activeCliCategory, setActiveCliCategory] = useState<"all" | "setup" | "collect" | "summarize" | "services">("all");
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
  const [isEditingAchievement, setIsEditingAchievement] = useState(false);
  const [editedAchievementContent, setEditedAchievementContent] = useState("");
  const [savingAchievement, setSavingAchievement] = useState(false);
  const [deletingAchievement, setDeletingAchievement] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draftViewMode, setDraftViewMode] = useState<"preview" | "raw">("preview");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // States for manual editing & AI refinement
  const [editedDraft, setEditedDraft] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [refining, setRefining] = useState(false);

  // --- NEW WORKSPACE TABS & VERSION CONTROL STATES ---
  const [currentTab, setCurrentTab] = useState<"dashboard" | "projects" | "resumes">("dashboard");

  interface ProjectModel {
    id: number;
    name: string;
    path: string;
    source: string;
    created_at: string;
    profile_purpose: string;
    profile_tech_stack: string;
    profile_key_features: string;
  }

  interface ResumeModel {
    id: number;
    version_name: string;
    content_md: string;
    created_at: string;
  }

  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [resumes, setResumes] = useState<ResumeModel[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Resume builder active editing workbench states
  const [activeResumeId, setActiveResumeId] = useState<number | null>(null);
  const [resumeTitleInput, setResumeTitleInput] = useState("");
  const [resumeContentInput, setResumeContentInput] = useState("");
  const [savingResume, setSavingResume] = useState(false);
  const [compilingResumeAI, setCompilingResumeAI] = useState(false);
  const [projectProfilingId, setProjectProfilingId] = useState<number | null>(null);
  const [resumeMode, setResumeMode] = useState<"edit" | "preview">("edit");

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5500);
  };

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await fetch(`/api/projects?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load projects list");
      const data = await res.json();
      setProjects(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load projects list.", "error");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchResumes = async () => {
    try {
      setLoadingResumes(true);
      const res = await fetch(`/api/resumes?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load resumes list");
      const data = await res.json();
      setResumes(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load saved resumes list.", "error");
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleGenerateProjectProfile = async (projectId: number) => {
    try {
      setProjectProfilingId(projectId);
      showToast("✨ Gemini is analyzing project logs to compile permanent Project Profile...", "info");
      
      const res = await fetch(`/api/projects/profile?id=${projectId}`, {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate project profile");
      }

      showToast("✓ Permanent Project Profile saved successfully!", "success");
      await fetchProjects();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to compile project profile.", "error");
    } finally {
      setProjectProfilingId(null);
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

  const handleFetchProjectResume = async () => {
    setCurrentTab("resumes");
    await handleDraftResumeAI();
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

  const handleLoadResume = (resume: ResumeModel) => {
    setActiveResumeId(resume.id);
    setResumeTitleInput(resume.version_name);
    setResumeContentInput(resume.content_md);
    showToast(`Loaded version: ${resume.version_name}`, "info");
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

  const handleResetEditor = () => {
    setActiveResumeId(null);
    setResumeTitleInput("");
    setResumeContentInput("");
    showToast("Editor cleared! Ready to draft a new version.", "info");
  };

  const { theme, setTheme } = useTheme();
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);



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
        fetch(`/api/logs?_t=${t}`, headersOption).then((r) => r.json()).catch(() => []),
        fetch(`/api/achievements?_t=${t}`, headersOption).then((r) => r.json()).catch(() => []),
        fetch(`/api/stats?_t=${t}`, headersOption).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/status?_t=${t}`, headersOption).then((r) => r.json()).catch(() => ({
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

      // Trigger parallel silent loading for Projects & Resumes versions
      fetchProjects();
      fetchResumes();
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
      const res = await fetch("/api/draft", {
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
      
      const res = await fetch("/api/draft/refine", {
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
      const res = await fetch("/api/achievements/approve", {
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

  const handleStartEditAchievement = () => {
    if (!activeAchievement) return;
    setEditedAchievementContent(activeAchievement.content_md);
    setIsEditingAchievement(true);
  };

  const handleSaveAchievement = async () => {
    if (!activeAchievement) return;
    try {
      setSavingAchievement(true);
      const res = await fetch(`/api/achievements/${activeAchievement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_md: editedAchievementContent }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to update achievement");

      showToast("Achievement updated successfully!", "success");
      
      // Update local state dynamically
      setActiveAchievement(prev => prev ? { ...prev, content_md: editedAchievementContent } : null);
      setAchievements(prev => prev.map(a => a.id === activeAchievement.id ? { ...a, content_md: editedAchievementContent } : a));
      setIsEditingAchievement(false);
    } catch (err) {
      console.error("Error saving achievement content:", err);
      showToast("Failed to save achievement content.", "error");
    } finally {
      setSavingAchievement(false);
    }
  };

  const handleDeleteAchievement = async () => {
    if (!activeAchievement) return;
    if (!window.confirm("Are you sure you want to permanently delete this weekly achievement summary? This cannot be undone.")) return;

    try {
      setDeletingAchievement(true);
      const res = await fetch(`/api/achievements/${activeAchievement.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to delete achievement");

      showToast("Achievement summary permanently deleted.", "success");
      
      // Update local state dynamically
      setAchievements(prev => prev.filter(a => a.id !== activeAchievement.id));
      setActiveAchievement(null);
      setIsEditingAchievement(false);
    } catch (err) {
      console.error("Error deleting achievement:", err);
      showToast("Failed to delete achievement summary.", "error");
    } finally {
      setDeletingAchievement(false);
    }
  };

  const handleTriggerSummarize = async () => {
    try {
      setSummarizing(true);
      showToast("Compiling logs and generating draft with Gemini AI...", "info");
      
      const res = await fetch("/api/summarize", {
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
      const res = await fetch(`/api/status?_t=${t}`, {
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
    <div className="min-h-screen flex flex-col p-6 md:p-8 selection:bg-teal-500 selection:text-black">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-900 relative">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-teal-500 dark:bg-teal-400 rounded-full animate-pulse" />
            <h1 className="text-2xl font-black tracking-wider text-slate-900 dark:text-slate-100 uppercase">
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
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg hover:border-teal-500 dark:hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <Search className={`h-3.5 w-3.5 ${checkingPending ? "animate-bounce" : ""}`} />
            {checkingPending ? "Scanning..." : "Check Pending"}
          </button>

          {/* AI Summarize Button */}
          <button
            onClick={handleTriggerSummarize}
            disabled={summarizing || loading || checkingPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/15 text-teal-700 dark:text-teal-400 rounded-lg hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-100/30 dark:hover:bg-teal-950/30 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${summarizing ? "animate-spin" : "animate-pulse"}`} />
            {summarizing ? "Generating AI Draft..." : "AI Summarize"}
          </button>
 
          {/* Project Resume Button */}
          <button
            onClick={handleFetchProjectResume}
            disabled={compilingResumeAI || loading || summarizing || checkingPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/15 text-teal-700 dark:text-teal-400 rounded-lg hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-100/30 dark:hover:bg-teal-950/30 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <Award className={`h-3.5 w-3.5 ${compilingResumeAI ? "animate-spin" : ""}`} />
            {compilingResumeAI ? "Compiling Resume..." : "Project Resume"}
          </button>
 
          {/* Refresh Feed Button */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading || summarizing || checkingPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg hover:border-teal-500 dark:hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 disabled:opacity-40 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh Feed
          </button>
 
          {/* PREMIUM TWO-STATE EXPLICIT THEME SWITCHER */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg hover:border-teal-500 dark:hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-300 shadow-sm cursor-pointer"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500 animate-spin-slow" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>
 
 
      {/* TABS NAVIGATION */}
      {mounted && (
        <div className="flex border-b border-slate-200 dark:border-slate-900 mb-6 gap-2">
          <button
            onClick={() => setCurrentTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all duration-300 cursor-pointer ${
              currentTab === "dashboard"
                ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-teal-500" />
            Weekly Achievements
          </button>
          <button
            onClick={() => setCurrentTab("projects")}
            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all duration-300 cursor-pointer ${
              currentTab === "projects"
                ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Folder className="h-3.5 w-3.5 text-teal-500" />
            Project Profiles
          </button>
          <button
            onClick={() => setCurrentTab("resumes")}
            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all duration-300 cursor-pointer ${
              currentTab === "resumes"
                ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5 text-teal-500" />
            Resume Workstation
          </button>
        </div>
      )}

      {loading && !approving ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-t-2 border-r-2 border-teal-500 rounded-full animate-spin" />
          <p className="text-xs text-teal-600 dark:text-teal-400 font-mono">Syncing with local vault database...</p>
        </div>
      ) : (
        <div className="space-y-8 flex-1 flex flex-col">
          
          {/* DASHBOARD TAB CONTENT */}
          {currentTab === "dashboard" && (
            <div className="space-y-8 flex-1 flex flex-col animate-fade-in">
              {/* STATE-AWARE ACTION CENTER (TOP BANNER) */}
              {(status.has_pending_draft || status.is_weekly_pending) && (
                <section className="animate-slide-down">
                  {status.has_pending_draft ? (
                    // 1. Pending Draft Ready for Review Option
                    <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-2xl shadow-lg space-y-5 transition-colors duration-300">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-teal-500 dark:text-teal-400 animate-pulse" />
                            <div>
                              <h2 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase">
                                Action Center: Weekly Summary Ready for Review
                              </h2>
                              <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Period: {status.draft_start_date} to {status.draft_end_date}
                              </p>
                            </div>
                          </div>
 
                          {/* View Mode Switcher */}
                          <div className="flex items-center border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg text-[9px] font-mono shadow-inner">
                            <button
                              onClick={() => setDraftViewMode("preview")}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-bold cursor-pointer ${
                                draftViewMode === "preview"
                                  ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-750 dark:hover:text-zinc-300"
                              }`}
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </button>
                            <button
                              onClick={() => setDraftViewMode("raw")}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-bold cursor-pointer ${
                                draftViewMode === "raw"
                                  ? "bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-750 dark:hover:text-zinc-300"
                              }`}
                            >
                              <Code className="h-3 w-3" /> Raw Markdown
                            </button>
                          </div>
                        </div>
 
                        <button
                          onClick={handleApproveDraft}
                          disabled={approving}
                          className="px-5 py-2.5 bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md hover:bg-teal-500 dark:hover:bg-teal-400 hover:scale-[1.02] disabled:opacity-50 transition-all duration-300 self-end md:self-auto cursor-pointer"
                        >
                          {approving ? "⏳ Saving to Vault..." : "✓ Approve & Save to Vault"}
                        </button>
                      </div>
                      
                      <div className="bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-5 rounded-xl max-h-[250px] overflow-y-auto text-xs leading-relaxed shadow-inner font-mono text-slate-700 dark:text-slate-300">
                        {draftViewMode === "preview" ? (
                          <div className="prose dark:prose-invert prose-xs max-w-none text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{status.draft_content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <textarea
                              value={editedDraft}
                              onChange={(e) => setEditedDraft(e.target.value)}
                              className="w-full min-h-[150px] p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs resize-y animate-fade-in"
                              placeholder="Edit your draft here..."
                            />
                            <button
                              onClick={handleSaveDraft}
                              disabled={savingDraft || editedDraft === status.draft_content}
                              className="self-end px-4 py-2 bg-slate-850 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-750 dark:hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {savingDraft ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        )}
                      </div>
 
                      {/* AI Refine Prompt Bar */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Prompt AI to refine this draft (e.g., 'Make it more professional', 'Add emojis')"
                          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !refining && aiPrompt.trim()) {
                                handleRefineDraft();
                            }
                          }}
                        />
                        <button
                          onClick={handleRefineDraft}
                          disabled={refining || !aiPrompt.trim()}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-[10px] uppercase rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-teal-500 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Sparkles className={`h-3 w-3 ${refining ? "animate-spin" : ""}`} />
                          {refining ? "Refining..." : "AI Refine"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 2. No Draft but Weekly Summary is past-due (check-pending)
                    <div className="border border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300">
                      <div className="flex items-center gap-3.5">
                        <AlertTriangle className="h-6 w-6 text-teal-500 dark:text-teal-400" />
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
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
                          className="px-4 py-2 bg-teal-600 dark:bg-teal-500 hover:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                        >
                          {summarizing ? "⏳ Compiling..." : "⚡ Summarize Now"}
                        </button>
                        <div className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 hidden md:block">
                          or run <code className="text-teal-600 dark:text-teal-400 font-bold font-mono">vault summarize</code> in terminal
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
                      <Activity className="h-2.5 w-2.5 text-teal-500" /> Projects
                    </span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{uniqueProjects}</span>
                  </div>
                  <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                      <BarChart3 className="h-2.5 w-2.5 text-teal-500" /> Raw Logs
                    </span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalLogs}</span>
                  </div>
                  <div className="glass-glow p-4 rounded-xl flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                      <Award className="h-2.5 w-2.5 text-teal-500" /> Summaries
                    </span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalAchievements}</span>
                  </div>
                </div>
 
                <div className="lg:col-span-2 glass-glow p-5 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">Technology Impact Footprint</span>
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
                            <span className="text-slate-600 dark:text-slate-400 font-bold">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full transition-all duration-500"
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
                    <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2 font-mono">
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
                              ? "bg-slate-100 dark:bg-slate-800/40 border-teal-500 dark:border-teal-500/80 shadow-md"
                              : "bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-slate-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/80 hover:border-slate-300 dark:hover:border-slate-750"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded border border-zinc-200 dark:border-zinc-700 uppercase font-semibold">
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
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[10px] font-mono bg-zinc-50 dark:bg-black/60 p-2.5 rounded-lg text-teal-700 dark:text-teal-400 overflow-x-auto whitespace-pre">
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
                    <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2 font-mono">
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
                      {achievements.map((ach) => {
                        const tags = extractTechKeywords(ach.content_md);
                        return (
                          <div
                            key={ach.id}
                            onClick={() => setActiveAchievement(ach)}
                            className="glass-glow p-5 rounded-xl cursor-pointer flex flex-col justify-between space-y-4 hover:scale-[1.01] hover:border-teal-500 dark:hover:border-teal-500 transition-all animate-fade-in"
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold tracking-widest text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                                    ID: {ach.id}
                                  </span>
                                  <StatusBadge status="Approved" />
                                </div>
                                <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-300">
                                  {new Date(ach.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200">Weekly Progress Report</h3>
                              <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">
                                Period: {ach.start_date} to {ach.end_date}
                              </p>
 
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {tags.map((tag, tagIdx) => (
                                    <TechBadge key={`${tag}-${tagIdx}`} tech={tag} />
                                  ))}
                                </div>
                              )}
                            </div>
 
                            {/* Rendered markdown instead of raw text inside gallery previews */}
                            <div className="pt-3 border-t border-zinc-150 dark:border-zinc-850 text-[10px] text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed font-sans prose dark:prose-invert prose-xs max-w-none pointer-events-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{ach.content_md}</ReactMarkdown>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
 
              {/* INTERACTIVE CLI QUICK REFERENCE GUIDE */}
              <section className="glass-glow p-6 rounded-2xl border border-slate-200 dark:border-slate-900 mt-6 space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <div className="flex items-center gap-2.5">
                    <Terminal className="h-5 w-5 text-teal-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
                        Vault CLI Quick-Reference Manual
                      </h3>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                        Interactive console instructions for configuring hooks, collecting logs, and querying Gemini AI
                      </p>
                    </div>
                  </div>
 
                  {/* Category filter tabs */}
                  <div className="flex flex-wrap gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-850 self-start sm:self-auto">
                    {(["all", "setup", "collect", "summarize", "services"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCliCategory(cat)}
                        className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                          activeCliCategory === cat
                            ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
 
                {/* Commands listing grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CLI_COMMANDS.filter(cmd => activeCliCategory === "all" || cmd.category === activeCliCategory).map((cmd, i) => {
                    const badgeColors = {
                      setup: "text-cyan-600 bg-cyan-50 border-cyan-200/50 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/20",
                      collect: "text-indigo-600 bg-indigo-50 border-indigo-200/50 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20",
                      summarize: "text-emerald-600 bg-emerald-50 border-emerald-200/50 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
                      services: "text-violet-600 bg-violet-50 border-violet-200/50 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20"
                    }[cmd.category as "setup" | "collect" | "summarize" | "services"];
 
                    return (
                      <div key={i} className="bg-zinc-50/50 dark:bg-black/40 border border-zinc-150 dark:border-zinc-850 p-4.5 rounded-xl flex flex-col justify-between gap-3 shadow-inner hover:scale-[1.005] hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeColors}`}>
                              {cmd.category}
                            </span>
                            {cmd.tags && (
                              <div className="flex flex-wrap gap-1">
                                {cmd.tags.map((tag, tagIdx) => (
                                  <TechBadge key={`${tag}-${tagIdx}`} tech={tag} />
                                ))}
                              </div>
                            )}
                          </div>
                          <code className="text-[10px] font-bold font-mono text-zinc-850 dark:text-zinc-200 block break-all bg-white dark:bg-zinc-900/80 p-2.5 rounded border border-zinc-200 dark:border-zinc-850">
                            {cmd.command}
                          </code>
                          <p className="text-[9.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-sans">
                            {cmd.desc}
                          </p>
                        </div>

                        {cmd.example && (
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between gap-3 text-[9px] font-mono">
                            <div className="text-zinc-400 dark:text-zinc-500 truncate">
                              e.g., <span className="text-zinc-600 dark:text-zinc-300 select-all">{cmd.example}</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(cmd.example);
                                showToast("Example command copied!", "success");
                              }}
                              className="text-zinc-400 hover:text-teal-500 transition-colors shrink-0 cursor-pointer"
                              title="Copy example to clipboard"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
 
          {/* PROJECTS TAB CONTENT */}
          {currentTab === "projects" && (
            <div className="space-y-6 flex-1 flex flex-col animate-fade-in">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-900">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2 font-mono">
                    <Folder className="h-4 w-4 text-teal-500" />
                    Registered Projects & Profiles
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    Permanent architectural profiles built directly from hooks databases
                  </p>
                </div>
                <span className="text-[9px] bg-zinc-150 dark:bg-zinc-900 px-2.5 py-0.5 rounded-full font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-250 dark:border-zinc-800">
                  {projects.length} Active
                </span>
              </div>
 
              {loadingProjects ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-16">
                  <div className="h-6 w-6 border-t-2 border-teal-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-mono text-teal-500">Querying registered targets...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-950/15 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-850 text-center max-w-xl mx-auto my-12">
                  <span className="text-4xl mb-4">📂</span>
                  <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 font-mono uppercase tracking-wide">No Registered Projects</h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono leading-relaxed">
                    Vault has not registered any active Git repo hooks yet. Run 'vault register' inside terminal to begin monitoring logs automatically!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {projects.map((proj) => {
                    const hasProfile = proj.profile_purpose || proj.profile_tech_stack || proj.profile_key_features;
                    const isCompiling = projectProfilingId === proj.id;
                    return (
                      <div key={proj.id} className="glass-glow p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 flex flex-col gap-5 transition-all">
                        {/* Project Title / Hook Metadata Bar */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">🚀</span>
                              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">
                                {proj.name}
                              </h3>
                              <StatusBadge status={hasProfile ? "Completed" : "Pending"} />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
                              <span>
                                Path: <code className="bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-850 font-bold">{proj.path}</code>
                              </span>
                              <span>
                                Source: <code className="bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-850 font-bold">{proj.source}</code>
                              </span>
                            </div>
                          </div>
 
                          <button
                            onClick={() => handleGenerateProjectProfile(proj.id)}
                            disabled={isCompiling}
                            className="px-4 py-2 bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 self-end md:self-auto cursor-pointer hover:scale-[1.01]"
                          >
                            <Sparkles className={`h-3.5 w-3.5 ${isCompiling ? "animate-spin" : ""}`} />
                            {isCompiling ? "Compiling Profile..." : hasProfile ? "Re-Compile with AI" : "AI Compile Profile"}
                          </button>
                        </div>
 
                        {/* Profile Information Sub-Sections */}
                        {hasProfile ? (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Project Purpose */}
                            <div className="space-y-2">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" />
                                Project Purpose
                              </h4>
                              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-150 dark:border-zinc-850 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-350 prose dark:prose-invert prose-xs max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{proj.profile_purpose}</ReactMarkdown>
                              </div>
                            </div>
 
                            {/* Tech Stack */}
                            <div className="space-y-2">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" />
                                Inferred Tech Stack
                              </h4>
                              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-150 dark:border-zinc-850 space-y-3">
                                {parseTechTags(proj.profile_tech_stack).length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {parseTechTags(proj.profile_tech_stack).map((tag, tagIdx) => (
                                      <TechBadge key={`${tag}-${tagIdx}`} tech={tag} />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-350 font-mono prose dark:prose-invert prose-xs max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{proj.profile_tech_stack}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            </div>
 
                            {/* Key Features */}
                            <div className="space-y-2">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" />
                                Key Systems & Features
                              </h4>
                              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-150 dark:border-zinc-850 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-350 prose dark:prose-invert prose-xs max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{proj.profile_key_features}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-950/15 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl max-w-xl mx-auto w-full">
                            <p className="text-[10px] text-zinc-500 font-mono">
                              Permanent architectural description has not been compiled yet.
                            </p>
                            <p className="text-[9px] text-zinc-400 mt-1 font-mono">
                              Press "AI Compile Profile" above to trigger Gemini multi-source semantic synthesis.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RESUMES TAB CONTENT */}
          {currentTab === "resumes" && (
            <div className="space-y-6 flex-1 flex flex-col animate-fade-in">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1">
                
                {/* Left Side: Workspace Editor & Input Controls (8/12 width) */}
                <div className="xl:col-span-8 space-y-5 flex flex-col">
                  
                  {/* Workspace Setup Panel */}
                  <div className="glass-glow p-5 rounded-2xl border border-zinc-200 dark:border-zinc-900 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-150 dark:border-zinc-850">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-teal-500" />
                        Portfolio Resume Compiler Workbench
                      </h3>
                      <button
                        onClick={handleResetEditor}
                        className="text-[8px] font-bold text-zinc-400 hover:text-rose-500 font-mono uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> New Version Draft
                      </button>
                    </div>
 
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Version Name input */}
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono block">
                          Resume Version Title
                        </label>
                        <input
                          type="text"
                          value={resumeTitleInput}
                          onChange={(e) => setResumeTitleInput(e.target.value)}
                          placeholder="e.g., Senior Fullstack Engineer Portfolio v1"
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none font-sans"
                        />
                      </div>
 
                      {/* Drafting Options */}
                      <div className="flex items-end gap-2.5">
                        <button
                          onClick={handleDraftResumeAI}
                          disabled={compilingResumeAI}
                          className="px-4 py-2 bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 hover:bg-teal-500 dark:hover:bg-teal-400 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                        >
                          <Sparkles className={`h-3.5 w-3.5 ${compilingResumeAI ? "animate-spin" : ""}`} />
                          {compilingResumeAI ? "Drafting Portfolio..." : "Draft with Gemini AI"}
                        </button>
                      </div>
                    </div>
 
                    {/* MODE TOGGLE SEGMENTED CONTROL */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                      <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 w-fit">
                        <button
                          type="button"
                          onClick={() => setResumeMode("edit")}
                          className={`px-4 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                            resumeMode === "edit"
                              ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-sm animate-fade-in"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          Raw Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setResumeMode("preview")}
                          className={`px-4 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                            resumeMode === "preview"
                              ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-sm animate-fade-in"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          Document Preview
                        </button>
                      </div>
 
                      <div className="flex items-center gap-2">
                        {resumeMode === "edit" ? (
                          <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wide uppercase">
                            💡 Use Markdown syntax to format your portfolio text
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-teal-600/80 dark:text-teal-400/80 font-mono tracking-wide uppercase animate-pulse">
                            ✨ Real-time parsed document view active
                          </span>
                        )}
                      </div>
                    </div>
 
                    {/* DYNAMIC CONTENT PANES BASED ON CHOSEN MODE */}
                    <div className="pt-3">
                      {resumeMode === "edit" ? (
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono block">
                            Raw Markdown Editor
                          </label>
                          <textarea
                            value={resumeContentInput}
                            onChange={(e) => setResumeContentInput(e.target.value)}
                            placeholder="Draft portfolio content or edit here..."
                            className="w-full h-[450px] p-5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-mono text-xs rounded-xl border border-zinc-300 dark:border-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none leading-relaxed shadow-inner transition-colors duration-300"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono block">
                            Live Rendered Document Preview
                          </label>
                          <div className="w-full min-h-[450px] max-h-[600px] p-8 md:p-12 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-y-auto prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-100 font-sans leading-relaxed shadow-inner transition-colors duration-300">
                            {resumeContentInput.trim() === "" ? (
                              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 font-mono gap-2">
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
                    <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-between items-center mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 font-mono uppercase">Status:</span>
                        {activeResumeId !== null ? (
                          <StatusBadge status={`Editing Version #${activeResumeId}`} />
                        ) : (
                          <StatusBadge status="New Draft Portfolio" />
                        )}
                      </div>
                      <button
                        onClick={handleSaveResume}
                        disabled={savingResume}
                        className="px-5 py-2 bg-teal-600 text-white dark:bg-teal-500 dark:text-black hover:bg-teal-500 dark:hover:bg-teal-400 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingResume ? "Saving..." : "Save Portfolio Version"}
                      </button>
                    </div>
                  </div>
                </div>
 
                {/* Right Side: Saved Portfolio Resumes Versions Gallery (4/12 width) */}
                <div className="xl:col-span-4 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-900">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2 font-mono">
                      <Award className="h-4 w-4 text-teal-500" />
                      Saved Versions Gallery
                    </span>
                    <span className="text-[9px] bg-zinc-150 dark:bg-zinc-900 px-2.5 py-0.5 rounded-full font-mono text-zinc-500 dark:text-zinc-400">
                      {resumes.length} Saved
                    </span>
                  </div>
 
                  <div className="space-y-3 max-h-[570px] overflow-y-auto pr-2">
                    {loadingResumes ? (
                      <div className="text-center py-12">
                        <div className="h-5 w-5 border-t-2 border-teal-500 rounded-full animate-spin mx-auto" />
                      </div>
                    ) : resumes.length === 0 ? (
                      <div className="text-center py-12 bg-white dark:bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <p className="text-[10px] text-zinc-400 font-mono">No portfolios saved inside SQLite yet.</p>
                      </div>
                    ) : (
                      resumes.map((resItem) => {
                        const isActive = activeResumeId === resItem.id;
                        return (
                          <div
                            key={resItem.id}
                            className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3.5 transition-all duration-300 relative group ${
                              isActive
                                ? "bg-slate-100/50 dark:bg-slate-900/30 border-teal-500 dark:border-teal-500/50"
                                : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-center gap-1">
                                <h4 className="text-[10px] font-extrabold tracking-wide text-zinc-800 dark:text-zinc-100 uppercase line-clamp-1">
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
                              <p className="text-[8px] text-zinc-400 dark:text-zinc-500 font-mono mt-1">
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
                            <div className="text-[9px] text-zinc-500 dark:text-zinc-400 line-clamp-3 font-sans leading-relaxed border-t border-b border-zinc-150 dark:border-zinc-850 py-2.5 prose dark:prose-invert prose-xs max-w-none pointer-events-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{resItem.content_md}</ReactMarkdown>
                            </div>
 
                            {/* Actions Bar */}
                            <div className="flex justify-between items-center">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(resItem.content_md);
                                  showToast("Markdown copied to clipboard!", "success");
                                }}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors cursor-pointer"
                                title="Copy Full Markdown"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleLoadResume(resItem)}
                                  className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 text-[8px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-850 rounded-md cursor-pointer transition-colors"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => handleDeleteResume(resItem.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 rounded-lg text-rose-500 dark:text-rose-400 transition-colors cursor-pointer"
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
          )}

        </div>
      )}

      {/* FULL MD MODAL WINDOW FOR ACTIVE LOGS */}
      {activeLog && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50">
              <div>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-md font-mono">
                  LOG DETAILS: ID #{activeLog.id}
                </span>
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 mt-2 font-mono">
                  Project: {activeLog.project_name}
                </h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 bg-zinc-50/20 dark:bg-zinc-950/15 overflow-y-auto max-h-[60vh]">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 font-mono block">Content Commit Message</span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 font-sans leading-relaxed whitespace-pre-wrap">{activeLog.content}</p>
              </div>

              {activeLog.metadata && (
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 font-mono block">Git Metadata Payload</span>
                  <pre className="text-[10px] p-3 bg-zinc-950 text-zinc-300 rounded-xl border border-zinc-850 font-mono leading-relaxed mt-1.5 overflow-x-auto whitespace-pre-wrap">
                    {activeLog.metadata}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 text-right flex justify-between items-center text-[8px] text-zinc-500 font-mono">
              <span>Logged at: {new Date(activeLog.timestamp).toLocaleString()}</span>
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-1.5 bg-teal-600 dark:bg-teal-500 hover:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-black font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* FULL MD MODAL WINDOW FOR ACTIVE WEEKLY ACHIEVEMENT DETAILS */}
      {activeAchievement && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl transition-colors duration-300">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-md font-mono">
                    {isEditingAchievement ? "Editing Achievement Summary" : "Achievement Details"}
                  </span>
                  <StatusBadge status={isEditingAchievement ? "Editing" : "Approved"} />
                </div>
                <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 mt-2 font-mono">
                  Period: {activeAchievement.start_date} to {activeAchievement.end_date}
                </h2>
                
                {/* Dynamically Extracted Tech Badges in Detail view */}
                {!isEditingAchievement && extractTechKeywords(activeAchievement.content_md).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {extractTechKeywords(activeAchievement.content_md).map((tech, techIdx) => (
                      <TechBadge key={`${tech}-${techIdx}`} tech={tech} />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveAchievement(null);
                  setIsEditingAchievement(false);
                }}
                className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
 
            <div className="p-6 overflow-y-auto flex-1 bg-zinc-50 dark:bg-zinc-950/20 border-b border-zinc-200 dark:border-zinc-800 shadow-inner flex flex-col">
              {isEditingAchievement ? (
                <textarea
                  value={editedAchievementContent}
                  onChange={(e) => setEditedAchievementContent(e.target.value)}
                  className="w-full flex-1 min-h-[350px] p-4 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-mono text-[11px] leading-relaxed border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner resize-none"
                  placeholder="Type your markdown achievement accomplishments here..."
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 font-sans text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{activeAchievement.content_md}</ReactMarkdown>
                </div>
              )}
            </div>
 
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-b-2xl flex flex-wrap justify-between items-center gap-4 text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
              <div>
                {isEditingAchievement ? (
                  <span className="text-teal-500 dark:text-teal-400 font-bold">⚠️ Warning: Unsaved edits will be lost on cancel.</span>
                ) : (
                  <span>Saved in vault at: {new Date(activeAchievement.created_at).toLocaleString()}</span>
                )}
              </div>
 
              <div className="flex items-center gap-2">
                {isEditingAchievement ? (
                  <>
                    <button
                      onClick={() => setIsEditingAchievement(false)}
                      className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-300 font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAchievement}
                      disabled={savingAchievement}
                      className="px-4 py-1.5 bg-teal-600 dark:bg-teal-500 hover:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-[10px] flex items-center gap-1.5"
                    >
                      {savingAchievement && <RotateCw className="h-3 w-3 animate-spin" />}
                      {savingAchievement ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleDeleteAchievement}
                      disabled={deletingAchievement}
                      className="px-4 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-bold rounded-lg transition-colors cursor-pointer text-[10px] flex items-center gap-1.5"
                    >
                      {deletingAchievement && <RotateCw className="h-3 w-3 animate-spin" />}
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                    <button
                      onClick={handleStartEditAchievement}
                      className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-750 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-750 font-bold rounded-lg transition-colors cursor-pointer text-[10px] flex items-center gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Edit Content
                    </button>
                    <button
                      onClick={() => {
                        setActiveAchievement(null);
                        setIsEditingAchievement(false);
                      }}
                      className="px-4 py-1.5 bg-teal-600 dark:bg-teal-500 hover:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM DYNAMIC TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-slide-up text-[10px] font-mono font-semibold transition-all max-w-xs md:max-w-sm ${
          toast.type === "success"
            ? "bg-teal-50 dark:bg-teal-950/80 border-teal-300 dark:border-teal-800/80 text-teal-850 dark:text-teal-300"
            : toast.type === "error"
            ? "bg-rose-50 dark:bg-rose-950/80 border-rose-350 dark:border-rose-800/80 text-rose-800 dark:text-rose-300"
            : "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300"
        }`}>
          <div className="h-2 w-2 rounded-full bg-current animate-pulse shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

