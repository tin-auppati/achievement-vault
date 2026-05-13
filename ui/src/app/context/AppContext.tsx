"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Log {
  id: number;
  project_id: number;
  project_name: string;
  type: string;
  content: string;
  metadata: string;
  timestamp: string;
}

export interface Achievement {
  id: number;
  content_md: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ProjectModel {
  id: number;
  name: string;
  path: string;
  source: string;
  created_at: string;
  profile_purpose: string;
  profile_tech_stack: string;
  profile_key_features: string;
}

export interface ResumeModel {
  id: number;
  version_name: string;
  content_md: string;
  created_at: string;
}

export interface TechStats {
  [tech: string]: number;
}

export interface VaultStatus {
  is_weekly_pending: boolean;
  has_pending_draft: boolean;
  draft_content: string;
  draft_start_date: string;
  draft_end_date: string;
}

interface AppContextType {
  projects: ProjectModel[];
  resumes: ResumeModel[];
  stats: TechStats;
  status: VaultStatus;
  loadingProjects: boolean;
  loadingResumes: boolean;
  summarizing: boolean;
  refining: boolean;
  approving: boolean;
  checkingPending: boolean;
  savingDraft: boolean;
  toast: { message: string; type: "success" | "error" | "info" } | null;
  
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
  fetchProjects: () => Promise<void>;
  fetchResumes: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  fetchAllGlobalData: () => Promise<void>;
  
  triggerSummarize: () => Promise<void>;
  triggerRefine: (prompt: string) => Promise<void>;
  saveDraftChanges: (content: string) => Promise<void>;
  approveDraft: (content: string, startDate: string, endDate: string) => Promise<void>;
  deleteAchievement: (id: number) => Promise<void>;
  triggerProjectProfiling: (projectId: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [resumes, setResumes] = useState<ResumeModel[]>([]);
  const [stats, setStats] = useState<TechStats>({});
  const [status, setStatus] = useState<VaultStatus>({
    is_weekly_pending: false,
    has_pending_draft: false,
    draft_content: "",
    draft_start_date: "",
    draft_end_date: "",
  });

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [approving, setApproving] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5500);
  };

  const hideToast = () => setToast(null);

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
      if (!res.ok) throw new Error("Failed to load resumes folder");
      const data = await res.json();
      setResumes(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to retrieve resumes versions list.", "error");
    } finally {
      setLoadingResumes(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data || {});
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const fetchStatus = async () => {
    try {
      setCheckingPending(true);
      const res = await fetch(`/api/status?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data || {
          is_weekly_pending: false,
          has_pending_draft: false,
          draft_content: "",
          draft_start_date: "",
          draft_end_date: "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch pending status", err);
    } finally {
      setCheckingPending(false);
    }
  };

  const fetchAllGlobalData = async () => {
    await Promise.all([
      fetchProjects(),
      fetchResumes(),
      fetchStats(),
      fetchStatus()
    ]);
  };

  // Run initial data loading
  useEffect(() => {
    fetchAllGlobalData();
  }, []);

  const triggerSummarize = async () => {
    try {
      setSummarizing(true);
      showToast("Triggering Gemini AI weekly summaries compilation...", "info");
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Summarization command failure");
      }
      showToast("Weekly summaries compiled successfully! Reviewing draft...", "success");
      await fetchStatus();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to run Gemini summarizer.", "error");
    } finally {
      setSummarizing(false);
    }
  };

  const triggerRefine = async (prompt: string) => {
    if (!prompt.trim()) return;
    try {
      setRefining(true);
      showToast("Refining achievements draft with AI...", "info");
      const res = await fetch("/api/draft/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, current_draft: status.draft_content })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Refinement failed");
      }
      const data = await res.json();
      setStatus(prev => ({
        ...prev,
        draft_content: data.refined_content
      }));
      showToast("Draft refined successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to refine draft with AI.", "error");
    } finally {
      setRefining(false);
    }
  };

  const saveDraftChanges = async (content: string) => {
    try {
      setSavingDraft(true);
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_md: content,
          start_date: status.draft_start_date,
          end_date: status.draft_end_date
        })
      });
      if (!res.ok) throw new Error("Failed to save draft edits");
      setStatus(prev => ({
        ...prev,
        draft_content: content
      }));
      showToast("Draft changes saved locally in vault.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save draft content.", "error");
    } finally {
      setSavingDraft(false);
    }
  };

  const approveDraft = async (content: string, startDate: string, endDate: string) => {
    try {
      setApproving(true);
      showToast("Approving and sealing milestone in database...", "info");
      const res = await fetch("/api/achievements/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_md: content,
          start_date: startDate,
          end_date: endDate
        })
      });
      if (!res.ok) throw new Error("Failed to approve achievements");
      showToast("Weekly achievements approved and sealed into vault!", "success");
      await fetchAllGlobalData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to approve draft.", "error");
    } finally {
      setApproving(false);
    }
  };

  const deleteAchievement = async (id: number) => {
    try {
      const res = await fetch(`/api/achievements/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete achievement");
      showToast("Achievement summary deleted from vault.", "success");
      await fetchAllGlobalData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to delete achievement", "error");
    }
  };

  const triggerProjectProfiling = async (projectId: number) => {
    try {
      showToast("Generating AI architectural project profile...", "info");
      const res = await fetch(`/api/projects/profile?id=${projectId}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to compile project profile");
      showToast("Project profile built successfully!", "success");
      await fetchProjects();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Profiling command failed.", "error");
    }
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        resumes,
        stats,
        status,
        loadingProjects,
        loadingResumes,
        summarizing,
        refining,
        approving,
        checkingPending,
        savingDraft,
        toast,
        showToast,
        hideToast,
        fetchProjects,
        fetchResumes,
        fetchStats,
        fetchStatus,
        fetchAllGlobalData,
        triggerSummarize,
        triggerRefine,
        saveDraftChanges,
        approveDraft,
        deleteAchievement,
        triggerProjectProfiling,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
