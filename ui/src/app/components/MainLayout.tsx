"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { AppProvider, useApp } from "../context/AppContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { toast } = useApp();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-teal-500/25 selection:text-teal-200">
      {/* PERSISTENT SIDEBAR */}
      <Sidebar />
      
      {/* PERSISTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* PERSISTENT HEADER */}
        <Header />
        
        {/* DYNAMIC PAGE */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* GLOBAL TOAST SYSTEM */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border animate-slide-up text-[10px] font-mono font-bold ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : toast.type === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
            : "bg-teal-500/10 border-teal-500/30 text-teal-400"
        }`}>
          <span className="text-sm">{toast.type === "success" ? "✓" : toast.type === "error" ? "✗" : "ℹ"}</span>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <LayoutContent>{children}</LayoutContent>
    </AppProvider>
  );
}
