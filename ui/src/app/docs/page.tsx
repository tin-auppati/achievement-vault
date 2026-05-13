"use client";

import { useState } from "react";
import { Terminal, Search, Code, PlayCircle, BookOpen, ChevronRight } from "lucide-react";

interface CLICommand {
  command: string;
  desc: string;
  category: "setup" | "collect" | "summarize" | "services";
  example: string;
  tags: string[];
}

const CLI_COMMANDS: CLICommand[] = [
  {
    command: "vault init",
    desc: "Initialize a new SQLite database at ./data/vault.db, perform automatic structural migrations, and mount logging schemas.",
    category: "setup",
    example: "vault init",
    tags: ["Setup", "Database Init", "Migrations"]
  },
  {
    command: "vault register <name> <path>",
    desc: "Register a local repository under the specified project name. This enables automatic post-commit interception metrics tracking.",
    category: "setup",
    example: "vault register achievement-vault /home/tin/projects/achievement-vault",
    tags: ["Setup", "Project Config"]
  },
  {
    command: "vault install-hook <project_name>",
    desc: "Dynamically render and install a customized, sandboxed .git/hooks/post-commit shell script inside the local workspace target.",
    category: "setup",
    example: "vault install-hook achievement-vault",
    tags: ["Git Hook", "Automation"]
  },
  {
    command: "vault list-projects",
    desc: "List all registered project folder codebases, checkout paths, origin tags, and current active tracking states.",
    category: "setup",
    example: "vault list-projects",
    tags: ["Listing", "Status Checks"]
  },
  {
    command: "vault collect <project_name> <type> <content> [metadata]",
    desc: "Low-level API tool to manually insert telemetry entries, Git hash hashes, branch tags, or custom commit statistics directly into SQLite.",
    category: "collect",
    example: 'vault collect achievement-vault commit "feat: implemented core AI wrapper" "diff --git a/main.go..."',
    tags: ["Ingestion", "Telemetry", "Git Patch"]
  },
  {
    command: "vault list-logs [limit]",
    desc: "Fetch and display the most recent git logs, file-stats diff patches, and post-commit hook telemetry payloads logged locally.",
    category: "collect",
    example: "vault list-logs 10",
    tags: ["Terminal Log", "Debugging"]
  },
  {
    command: "vault stats",
    desc: "Display high-level counts, parsed commits totals, project summaries, and visual keyword tag distributions across your codebases.",
    category: "collect",
    example: "vault stats",
    tags: ["Metrics", "Statistics"]
  },
  {
    command: "vault summarize [start_date] [end_date]",
    desc: "Trigger the advanced Gemini AI pipeline to inspect raw commit histories, compile accomplishments, and stage a draft weekly report.",
    category: "summarize",
    example: "vault summarize 2026-05-01 2026-05-08",
    tags: ["AI Summary", "Gemini API", "Automation"]
  },
  {
    command: "vault list-achievements",
    desc: "Retrieve and print all approved and database-sealed weekly accomplishments summaries compiled throughout your engineering periods.",
    category: "summarize",
    example: "vault list-achievements",
    tags: ["Achievements Feed", "Markdown"]
  },
  {
    command: "vault start",
    desc: "Launch the local, lightweight REST API server on port 8001 to support dashboard charts, lists, and NextJS UI live-reloading.",
    category: "services",
    example: "vault start",
    tags: ["SaaS Backend", "REST API", "Port 8001"]
  },
  {
    command: "vault test-ui",
    desc: "Run the automated headless test suite using sandboxed chromium and puppeteer to verify web app layout correctness.",
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
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "collect":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "summarize":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "services":
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-mono">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-slate-950/40 p-5 border border-slate-900 rounded-2xl">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-teal-400" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">CLI COMMAND DOCUMENTATION</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">Explore terminal instructions, usage parameters, and shell integrations manuals.</p>
          </div>
        </div>
        <div className="text-[9px] text-zinc-600 bg-slate-900 px-3 py-1.5 border border-slate-800 rounded-lg">
          v1.1 Stable CLI Manual
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
              className={`px-3 py-2 text-[10px] font-bold rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                  : "bg-slate-950 border-slate-900 text-zinc-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Command Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CLI parameters..."
            className="w-full pl-9 pr-3 py-2 text-[11px] bg-slate-950 border border-slate-900 rounded-lg text-slate-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
          />
        </div>

      </div>

      {/* COMMANDS DETAIL GRID */}
      <div className="space-y-4">
        {filteredCommands.length === 0 ? (
          <div className="p-16 border border-dashed border-slate-900 rounded-2xl text-center text-zinc-500 text-xs">
            📭 No matching CLI command signatures found.
          </div>
        ) : (
          filteredCommands.map((cmd) => (
            <div
              key={cmd.command}
              className="bg-slate-950 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 hover:bg-slate-950/50 transition-all duration-300 relative group overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2.5 flex-1">
                  
                  {/* Command Title & Category Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-teal-400 text-xs">$&gt;</span>
                    <h3 className="text-xs font-black text-slate-100 select-all">{cmd.command}</h3>
                    <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded-md border ${getCategoryColor(cmd.category)}`}>
                      {cmd.category}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{cmd.desc}</p>
                  
                  {/* Custom Tags row */}
                  {cmd.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cmd.tags.map((tag) => (
                        <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded border border-slate-900 bg-slate-950 text-zinc-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {/* Example box / run sandbox section */}
                <div className="md:w-96 bg-slate-900/60 border border-slate-900 p-4 rounded-xl space-y-2 relative">
                  <div className="flex justify-between items-center text-[8px] text-zinc-500 uppercase tracking-widest pb-1 border-b border-slate-900">
                    <span className="flex items-center gap-1"><Code className="h-3 w-3" /> Syntax Example</span>
                    <span className="hover:text-white transition-colors cursor-pointer select-none" onClick={() => {
                      navigator.clipboard.writeText(cmd.example);
                    }}>Copy CLI</span>
                  </div>
                  <pre className="text-[10px] text-teal-400 font-mono select-all overflow-x-auto whitespace-pre-wrap leading-relaxed">
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
