"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.trim().toLowerCase();
  let colorClass = "";
  
  if (
    normalized === "completed" || 
    normalized === "active" || 
    normalized === "sealed" || 
    normalized === "synced" || 
    normalized === "saved"
  ) {
    colorClass = "bg-emerald-50 text-emerald-850 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  } else if (
    normalized === "pending" || 
    normalized === "reviewing" || 
    normalized.startsWith("editing") || 
    normalized.includes("new draft")
  ) {
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
