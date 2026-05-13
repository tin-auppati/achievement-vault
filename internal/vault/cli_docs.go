package vault

import (
	"fmt"
	"strings"
)

// Version represents the centralized single source of truth for the CLI, docs, and website version.
const Version = "1.3"

// CLICommand represents the schema of a registered CLI command.
type CLICommand struct {
	Command  string   `json:"command"`
	Desc     string   `json:"desc"`
	Category string   `json:"category"` // "setup" | "collect" | "summarize" | "services"
	Example  string   `json:"example"`
	Tags     []string `json:"tags"`
}

// GetCLICommands returns the consolidated array of all supported Vault CLI commands.
func GetCLICommands() []CLICommand {
	return []CLICommand{
		{
			Command:  "vault register <name> <path> <source>",
			Desc:     "Register a local development project codebase to track its commits in the SQLite database.",
			Category: "setup",
			Example:  `vault register "my-api" "/home/tin/projects/my-api" "github"`,
			Tags:     []string{"Setup", "Project Config"},
		},
		{
			Command:  "vault scan-repo <path> [--analyze-errors]",
			Desc:     "Deep scan a directory structure and Git history to compile a Project Profile. Fallback to static config scan. '--analyze-errors' diagnoses broken builds.",
			Category: "setup",
			Example:  "vault scan-repo /home/tin/projects/achievement-vault --analyze-errors",
			Tags:     []string{"Codebase Profiler", "Deep Diagnostics"},
		},
		{
			Command:  "vault install <project_name>",
			Desc:     "Install the Git 'post-commit' hook in the registered project folder to automate future commit log capture.",
			Category: "setup",
			Example:  `vault install "my-api"`,
			Tags:     []string{"Git Hook", "Automation"},
		},
		{
			Command:  "vault setup-shell",
			Desc:     "Append an alert trigger to your shell config ('.bashrc' / '.zshrc') to warn you on login if weekly summaries are pending.",
			Category: "setup",
			Example:  "vault setup-shell",
			Tags:     []string{"Shell Alert", "Workspace Hooks"},
		},
		{
			Command:  "vault setup-global",
			Desc:     "Symlink the compiled executable to '/home/tin/go/bin/vault' and configure environment shell exports globally.",
			Category: "setup",
			Example:  "vault setup-global",
			Tags:     []string{"Global Setup", "Symlinks"},
		},
		{
			Command:  "vault collect --project-id <id> --message <msg> --diff <diff>",
			Desc:     "System-facing backend utility to log code achievements. Automatically triggered by the installed post-commit hook.",
			Category: "collect",
			Example:  `vault collect --project-id 1 --message "feat: auth" --diff "+ func Login()"`,
			Tags:     []string{"Ingestion", "Telemetry", "Git Patch"},
		},
		{
			Command:  "vault summarize [--days <days>]",
			Desc:     "Gather raw logs from the database, query Gemini AI, and draft a formatted, reviewer-ready Weekly Progress Summary.",
			Category: "summarize",
			Example:  "vault summarize --days 7",
			Tags:     []string{"AI Summary", "Gemini API", "Automation"},
		},
		{
			Command:  "vault summarize-project",
			Desc:     "Gather all approved achievements in 'weekly_achievements' to compile a professional, recruiter-ready Markdown Resume.",
			Category: "summarize",
			Example:  "vault summarize-project",
			Tags:     []string{"AI Resume Compiler", "Portfolios"},
		},
		{
			Command:  "vault history [<id>]",
			Desc:     "List saved weekly progress summaries or print a full-fidelity rendered summary by its database ID.",
			Category: "summarize",
			Example:  "vault history 5",
			Tags:     []string{"Achievements Feed", "Markdown Render"},
		},
		{
			Command:  "vault check-pending",
			Desc:     "Scan the workspace database and output a warning if no summary has been recorded for the current week.",
			Category: "summarize",
			Example:  "vault check-pending",
			Tags:     []string{"Status Checks", "Scheduler"},
		},
		{
			Command:  "vault serve [<port>]",
			Desc:     "Launch the REST API backend server to expose endpoint data (default port: '8001') for Next.js UI integration.",
			Category: "services",
			Example:  "vault serve 8001",
			Tags:     []string{"SaaS Backend", "REST API", "Port 8001"},
		},
		{
			Command:  "vault start-all",
			Desc:     "Concurrently launch both the Go API backend ('8001') and the Next.js frontend web interface ('3000') in background sessions.",
			Category: "services",
			Example:  "vault start-all",
			Tags:     []string{"SaaS Workspace", "Background Daemon"},
		},
		{
			Command:  "vault autostart <enable|disable>",
			Desc:     "Install or remove a persistent Systemd user daemon unit to keep the vault servers running on boot.",
			Category: "services",
			Example:  "vault autostart enable",
			Tags:     []string{"Autostart Daemon", "Systemd Setup"},
		},
		{
			Command:  "vault test-ui",
			Desc:     "Execute headless automated Chrome DOM tests on 'http://localhost:3000' and archive the page state to recovery.",
			Category: "services",
			Example:  "vault test-ui",
			Tags:     []string{"automated-testing", "browser-sandbox"},
		},
	}
}

// GetManualMarkdown builds a beautifully formatted Glamour-compatible terminal usage manual.
func GetManualMarkdown() string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# 🏆 ACHIEVEMENT VAULT - PREMIUM CLI TOOL v%s\n\n", Version))
	sb.WriteString("Welcome to the **Achievement Vault** developer workstation control center. This CLI manages automated collection, intelligent profiling, and resume synthesis of your codebase accomplishments.\n\n")
	sb.WriteString("---\n\n")

	// Categories map
	categories := []struct {
		Key   string
		Title string
	}{
		{"setup", "📁 1. SETUP & CONFIGURATION"},
		{"collect", "📥 2. ACTIVITY LOG COLLECTION"},
		{"summarize", "✨ 3. AI SUMMARIZATION & REPORTS"},
		{"services", "⚙ 4. SERVICES & WEB PORTAL"},
	}

	for _, cat := range categories {
		sb.WriteString(fmt.Sprintf("## %s\n\n", cat.Title))
		sb.WriteString("| Command | Description | Example |\n")
		sb.WriteString("| :--- | :--- | :--- |\n")

		for _, cmd := range GetCLICommands() {
			if cmd.Category == cat.Key {
				// Strip "vault " prefix from command column to make it match previous layout if needed
				displayCmd := strings.TrimPrefix(cmd.Command, "vault ")
				// Escape pipe characters to avoid breaking Markdown tables
				descEscaped := strings.ReplaceAll(cmd.Desc, "|", "\\|")
				sb.WriteString(fmt.Sprintf("| **%s** | %s | '%s' |\n", displayCmd, descEscaped, cmd.Example))
			}
		}
		sb.WriteString("\n---\n\n")
	}

	sb.WriteString("> [!NOTE]\n")
	sb.WriteString("> Database file location defaults to '~/.achievement-vault/data/vault.db' unless specified by the 'VAULT_HOME' environment variable.\n")

	return sb.String()
}
