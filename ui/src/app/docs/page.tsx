"use client";

import { useState } from "react";
import { Terminal, Search, Code, BookOpen } from "lucide-react";

interface CLICommand {
  command: string;
  desc: string;
  category: "setup" | "collect" | "summarize" | "services";
  example: string;
  tags: string[];
}

const CLI_COMMANDS: CLICommand[] = [
  {
    command: "vault register <name> <path> <source>",
    desc: "Register a local development project codebase to track its commits in the SQLite database.",
    category: "setup",
    example: 'vault register "my-api" "/home/tin/projects/my-api" "github"',
    tags: ["Setup", "Project Config"]
  },
  {
    command: "vault scan-repo <path> [--analyze-errors]",
    desc: "Deep scan a directory structure and Git history to compile a Project Profile. Fallback to static config scan. '--analyze-errors' diagnoses broken builds.",
    category: "setup",
    example: "vault scan-repo /home/tin/projects/achievement-vault --analyze-errors",
    tags: ["Codebase Profiler", "Deep Diagnostics"]
  },
  {
    command: "vault install <project_name>",
    desc: "Install the Git 'post-commit' hook in the registered project folder to automate future commit log capture.",
    category: "setup",
    example: 'vault install "my-api"',
    tags: ["Git Hook", "Automation"]
  },
  {
    command: "vault setup-shell",
    desc: "Append an alert trigger to your shell config ('.bashrc' / '.zshrc') to warn you on login if weekly summaries are pending.",
    category: "setup",
    example: "vault setup-shell",
    tags: ["Shell Alert", "Workspace Hooks"]
  },
  {
    command: "vault setup-global",
    desc: "Symlink the compiled executable to '/home/tin/go/bin/vault' and configure environment shell exports globally.",
    category: "setup",
    example: "vault setup-global",
    tags: ["Global Setup", "Symlinks"]
  },
  {
    command: "vault collect --project-id <id> --message <msg> --diff <diff>",
    desc: "System-facing backend utility to log code achievements. Automatically triggered by the installed post-commit hook.",
    category: "collect",
    example: 'vault collect --project-id 1 --message "feat: auth" --diff "+ func Login()"',
    tags: ["Ingestion", "Telemetry", "Git Patch"]
  },
  {
    command: "vault summarize [--days <days>]",
    desc: "Gather raw logs from the database, query Gemini AI, and draft a formatted, reviewer-ready Weekly Progress Summary.",
    category: "summarize",
    example: "vault summarize --days 7",
    tags: ["AI Summary", "Gemini API", "Automation"]
  },
  {
    command: "vault summarize-project",
    desc: "Gather all approved achievements in 'weekly_achievements' to compile a professional, recruiter-ready Markdown Resume.",
    category: "summarize",
    example: "vault summarize-project",
    tags: ["AI Resume Compiler", "Portfolios"]
  },
  {
    command: "vault history [<id>]",
    desc: "List saved weekly progress summaries or print a full-fidelity rendered summary by its database ID.",
    category: "summarize",
    example: "vault history 5",
    tags: ["Achievements Feed", "Markdown Render"]
  },
  {
    command: "vault check-pending",
    desc: "Scan the workspace database and output a warning if no summary has been recorded for the current week.",
    category: "summarize",
    example: "vault check-pending",
    tags: ["Status Checks", "Scheduler"]
  },
  {
    command: "vault serve [<port>]",
    desc: "Launch the REST API backend server to expose endpoint data (default port: '8001') for Next.js UI integration.",
    category: "services",
    example: "vault serve 8001",
    tags: ["SaaS Backend", "REST API", "Port 8001"]
  },
  {
    command: "vault start-all",
    desc: "Concurrently launch both the Go API backend ('8001') and the Next.js frontend web interface ('3000') in background sessions.",
    category: "services",
    example: "vault start-all",
    tags: ["SaaS Workspace", "Background Daemon"]
  },
  {
    command: "vault autostart <enable|disable>",
    desc: "Install or remove a persistent Systemd user daemon unit to keep the vault servers running on boot.",
    category: "services",
    example: "vault autostart enable",
    tags: ["Systemd Unit", "Persistency"]
  },
  {
    command: "vault test-ui",
    desc: "Execute headless automated Chrome DOM tests on 'http://localhost:3000' and archive the page state to recovery.",
    category: "services",
    example: "vault test-ui",
    tags: ["QA Testing", "Puppeteer", "Chrome Headless"]
  },
  {
    command: "vault help",
    desc: "Render and present this comprehensive interactive usage manual inside your terminal window.",
    category: "services",
    example: "vault help",
    tags: ["CLI Manual", "Terminal Interactive"]
  }
];

export default function DocsPage() {
  const [activeCategory, setActiveCategory] = useState<"all" | "setup" | "collect" | "summarize" | "services">("all");
  const [search, setSearch] = useState("");

  const filteredCommands = CLI_COMMANDS.filter((cmd) => {
    const matchesCategory = activeCategory === "all" || cmd.category === activeCategory;
    const matchesSearch =
      cmd.command.toLowerCase().includes(search.toLowerCase()) ||
      cmd.desc.toLowerCase().includes(search.toLowerCase()) ||
      cmd.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "setup":
        return "bg-cyan-50/70 text-cyan-800 border-cyan-200/60 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20";
      case "collect":
        return "bg-indigo-50/70 text-indigo-800 border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
      case "summarize":
        return "bg-emerald-50/70 text-emerald-800 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case "services":
        return "bg-violet-50/70 text-violet-850 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
      default:
        return "bg-slate-100 text-slate-800 border-slate-250 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-mono transition-all">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white dark:bg-slate-950/40 p-5 border border-slate-200 dark:border-slate-900 rounded-3xl gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-teal-500" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">CLI COMMAND DOCUMENTATION</h1>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5 font-bold">Explore terminal instructions, usage parameters, and shell integrations manuals.</p>
          </div>
        </div>
        <div className="text-xs text-zinc-650 dark:text-zinc-400 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg font-bold self-start sm:self-auto">
          v1.3 Stable CLI Manual
        </div>
      </div>

      {/* FILTER & SEARCH ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Category Filter Pills */}
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          {["all", "setup", "collect", "summarize", "services"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`px-3 py-2 text-xs font-black rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-455 border-teal-500/30"
                  : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 text-zinc-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-55 dark:hover:bg-slate-900/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Command Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CLI parameters..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-lg text-slate-800 dark:text-slate-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
          />
        </div>

      </div>

      {/* COMMANDS DETAIL GRID */}
      <div className="space-y-4">
        {filteredCommands.length === 0 ? (
          <div className="p-16 border border-dashed border-slate-200 dark:border-slate-900 rounded-3xl text-center text-zinc-500 text-xs">
            📭 No matching CLI command signatures found.
          </div>
        ) : (
          filteredCommands.map((cmd) => (
            <div
              key={cmd.command}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 hover:border-slate-350 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-all duration-300 relative group overflow-hidden shadow-sm"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="space-y-2.5 flex-1">
                  
                  {/* Command Title & Category Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-teal-500 text-sm">$&gt;</span>
                    <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 select-all">{cmd.command}</h3>
                    <span className={`px-2.5 py-0.5 text-xs uppercase tracking-wider font-bold rounded-md border ${getCategoryColor(cmd.category)}`}>
                      {cmd.category}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-zinc-650 dark:text-zinc-400 font-sans leading-relaxed">{cmd.desc}</p>
                  
                  {/* Custom Tags row */}
                  {cmd.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cmd.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 text-zinc-550 dark:text-zinc-500 font-bold shadow-inner">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {/* Example box / run sandbox section */}
                <div className="xl:w-96 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 p-4 rounded-2xl space-y-2 relative">
                  <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-550 uppercase tracking-widest pb-1 border-b border-slate-200 dark:border-slate-900 font-bold">
                    <span className="flex items-center gap-1"><Code className="h-3.5 w-3.5 text-teal-500" /> Syntax Example</span>
                    <span className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer select-none" onClick={() => {
                      navigator.clipboard.writeText(cmd.example);
                    }}>Copy CLI</span>
                  </div>
                  <pre className="text-xs text-teal-700 dark:text-teal-400 font-mono select-all overflow-x-auto whitespace-pre-wrap leading-relaxed font-bold">
                    <code>{cmd.example}</code>
                  </pre>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
