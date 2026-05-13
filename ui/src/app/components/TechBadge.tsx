import React from "react";

export function getBadgeStyle(tech: string): string {
  const normalized = tech.trim().toLowerCase();

  // Cyan/Sky
  if (
    normalized === "react" ||
    normalized === "docker" ||
    normalized === "go" ||
    normalized === "golang" ||
    normalized === "kubernetes" ||
    normalized === "k8s" ||
    normalized === "tailwind" ||
    normalized === "tailwindcss" ||
    normalized === "css" ||
    normalized === "flutter"
  ) {
    return "bg-cyan-50/70 text-cyan-800 border-cyan-200/60 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20";
  }

  // Blue
  if (
    normalized === "typescript" ||
    normalized === "ts" ||
    normalized === "python" ||
    normalized === "postgresql" ||
    normalized === "postgres" ||
    normalized === "mysql" ||
    normalized === "c++" ||
    normalized === "cpp" ||
    normalized === "c#" ||
    normalized === "csharp"
  ) {
    return "bg-blue-50/70 text-blue-800 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  }

  // Yellow/Amber
  if (
    normalized === "javascript" ||
    normalized === "js" ||
    normalized === "rust" ||
    normalized === "html" ||
    normalized === "html5"
  ) {
    return "bg-amber-50/70 text-amber-800 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  }

  // Emerald/Green
  if (
    normalized === "node.js" ||
    normalized === "nodejs" ||
    normalized === "node" ||
    normalized === "vue" ||
    normalized === "vuejs" ||
    normalized === "mongodb" ||
    normalized === "spring" ||
    normalized === "springboot" ||
    normalized === "nginx"
  ) {
    return "bg-emerald-50/70 text-emerald-800 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }

  // Rose/Red
  if (
    normalized === "angular" ||
    normalized === "redis" ||
    normalized === "git" ||
    normalized === "ruby" ||
    normalized === "laravel" ||
    normalized === "java"
  ) {
    return "bg-rose-50/70 text-rose-800 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
  }

  // Purple/Violet
  if (
    normalized === "php" ||
    normalized === "graphql" ||
    normalized === "bootstrap" ||
    normalized === ".net" ||
    normalized === "dotnet"
  ) {
    return "bg-violet-50/70 text-violet-800 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
  }

  // Orange
  if (
    normalized === "aws" ||
    normalized === "svelte" ||
    normalized === "firebase" ||
    normalized === "postman"
  ) {
    return "bg-orange-50/70 text-orange-800 border-orange-200/60 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
  }

  // Slate/Zinc (High Contrast)
  if (
    normalized === "next.js" ||
    normalized === "nextjs" ||
    normalized === "github" ||
    normalized === "vercel" ||
    normalized === "linux" ||
    normalized === "bash" ||
    normalized === "sqlite" ||
    normalized === "jest"
  ) {
    return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
  }

  // Fallback (subtle neutral gray/slate tint)
  return "bg-slate-50/70 text-slate-600 border-slate-200 dark:bg-slate-500/5 dark:text-slate-400 dark:border-slate-500/10";
}

export default function TechBadge({ tech }: { tech: string }) {
  // Strip parenthetical statistics counters (e.g., "Go (14)" -> "Go") for style matching
  const cleanedTech = tech.replace(/\s*\(\d+\)\s*$/, "");
  const colorClass = getBadgeStyle(cleanedTech);

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-md border font-mono tracking-wide transition-colors ${colorClass}`}>
      {tech}
    </span>
  );
}
