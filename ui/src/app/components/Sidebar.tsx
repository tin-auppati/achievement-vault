"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Activity, Award, Briefcase, Terminal, ShieldAlert, FolderOpen } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { status } = useApp();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Codebases Catalog", href: "/workspaces", icon: FolderOpen },
    { label: "Logs Ingestion", href: "/logs", icon: Activity },
    { label: "Milestones Vault", href: "/vault", icon: Award },
    { label: "Resume Workstation", href: "/resume", icon: Briefcase },
    { label: "CLI Command Manual", href: "/docs", icon: Terminal },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex flex-col justify-between h-screen sticky top-0 font-mono z-20 transition-colors">
      
      {/* Sidebar Navigation */}
      <div className="p-6 flex-1 flex flex-col space-y-8">
        
        {/* Branding Title */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h1 className="text-sm font-black tracking-widest text-slate-800 dark:text-slate-100 uppercase">Vault Console</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">SaaS Platform v{status.version || "1.3"}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-650 uppercase tracking-widest mb-3 pl-3">Menu Controls</div>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/5 dark:hover:bg-teal-500/5 border border-transparent hover:border-teal-500/10 dark:hover:border-teal-500/10"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-teal-500 dark:text-teal-400" : "text-zinc-500 group-hover:text-teal-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pending Banner Alert inside Sidebar */}
        {status.is_weekly_pending && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2.5 animate-pulse mt-4">
            <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Weekly End Reached</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-1 leading-relaxed">Committed changes are ready. Trigger AI summarizer to review achievements.</p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 text-xs text-zinc-550 dark:text-zinc-500 flex flex-col space-y-1">
        <div>Logged in developer workspace:</div>
        <div className="font-bold text-zinc-700 dark:text-zinc-400 select-all">tin@projects/achievement-vault</div>
        <div className="pt-2 text-[10px] text-zinc-450 dark:text-zinc-550 select-none">Powered by Gemini Pro 1.5</div>
      </div>

    </aside>
  );
}
