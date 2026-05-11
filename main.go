package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/charmbracelet/glamour"
	"github.com/tin-auppati/achievement-vault/internal/ai"
	"github.com/tin-auppati/achievement-vault/internal/database"
	"github.com/tin-auppati/achievement-vault/internal/vault"
)

func GetVaultHome() string {
	vaultHome := os.Getenv("VAULT_HOME")
	if vaultHome != "" {
		return vaultHome
	}

	// Fallback 1: directory where the binary is located
	execPath, err := os.Executable()
	if err == nil {
		execDir := filepath.Dir(execPath)
		// Check if data directory or config exists in binary folder
		if _, err := os.Stat(filepath.Join(execDir, "data")); err == nil {
			return execDir
		}
	}

	// Fallback 2: ~/.achievement-vault config dir in user home
	home, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	return filepath.Join(home, ".achievement-vault")
}

func getDBPath() string {
	vh := GetVaultHome()
	dbDir := filepath.Join(vh, "data")
	os.MkdirAll(dbDir, 0755)
	return filepath.Join(dbDir, "vault.db")
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(0)
	}

	command := os.Args[1]
	switch command {
	case "register":
		handleRegister()
	case "scan-repo":
		handleScanRepo()
	case "install":
		handleInstall()
	case "collect":
		handleCollect()
	case "summarize":
		handleSummarize()
	case "summarize-project":
		handleSummarizeProject()
	case "history":
		handleHistory()
	case "check-pending":
		handleCheckPending()
	case "setup-shell":
		handleSetupShell()
	case "setup-global":
		handleSetupGlobal()
	case "serve":
		handleServe()
	case "start-all":
		handleStartAll()
	case "autostart":
		handleAutostart()
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Fprintf(os.Stderr, "\033[31mError: unknown command %q\033[0m\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func handleRegister() {
	// Expecting: main register <name> <path> <source>
	if len(os.Args) != 5 {
		fmt.Fprintln(os.Stderr, "\033[31mError: register command requires exactly 3 arguments: <name> <path> <source>\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault register <name> <path> <source>")
		os.Exit(1)
	}

	name := os.Args[2]
	path := os.Args[3]
	source := os.Args[4]

	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// Register project
	id, err := vault.RegisterProject(db.DB, name, path, source)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Pretty premium output
	fmt.Println("\033[32m✔ Project successfully registered in vault!\033[0m")
	fmt.Printf("  \033[1mID:\033[0m      %d\n", id)
	fmt.Printf("  \033[1mName:\033[0m    %s\n", name)
	fmt.Printf("  \033[1mPath:\033[0m    %s\n", path)
	fmt.Printf("  \033[1mSource:\033[0m  %s\n", source)
}

func handleScanRepo() {
	// Expecting: main scan-repo <path_to_project>
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "\033[31mError: scan-repo command requires exactly 1 argument: <path_to_project>\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault scan-repo <path_to_project>")
		os.Exit(1)
	}

	targetPath := os.Args[2]

	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	fmt.Println("\033[1;36m┌────────────────────────────────────────────────────────────────────────────────────────┐\033[0m")
	fmt.Println("\033[1;36m│                       🔍 DEEP CODEBASE ARCHITECTURAL SCANNING ENGINE                   │\033[0m")
	fmt.Println("\033[1;36m└────────────────────────────────────────────────────────────────────────────────────────┘\033[0m")
	fmt.Printf("📂 Target Directory:  \033[1m%s\033[0m\n", targetPath)
	fmt.Println("🚀 Starting walk and code history semantic compilation...")

	projectName, isNew, purpose, techStack, features, err := vault.ScanAndProfileRepository(db.DB, targetPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n\033[31m❌ Scanning failed: %v\033[0m\n", err)
		os.Exit(1)
	}

	fmt.Println("\n\033[1;32m✔ Codebase scanned and profile retroactively compiled successfully!\033[0m")
	if isNew {
		fmt.Printf("  ⭐ \033[1mAuto-Registered Project:\033[0m %s (Source: local-scan)\n", projectName)
	} else {
		fmt.Printf("  ⭐ \033[1mUpdated Existing Project:\033[0m %s\n", projectName)
	}
	fmt.Println()

	fmt.Println("\033[1;35m📝 SYNTHESIZED PROJECT ARCHITECTURAL PROFILE\033[0m")
	fmt.Println("\033[1;36m========================================================================================\033[0m")
	fmt.Printf("\033[1mProject Name:\033[0m   %s\n", projectName)
	fmt.Printf("\033[1mPurpose:\033[0m        %s\n\n", purpose)
	fmt.Printf("\033[1mConsolidated Tech Stack:\033[0m\n  %s\n\n", techStack)
	fmt.Printf("\033[1mArchitectural Systems & Key Features:\033[0m\n%s\n", features)
	fmt.Println("\033[1;36m========================================================================================\033[0m")
}

func handleInstall() {
	// Expecting: main install <project_name>
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "\033[31mError: install command requires exactly 1 argument: <project_name>\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault install <project_name>")
		os.Exit(1)
	}

	projectName := os.Args[2]

	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// Query project details
	project, err := vault.GetProjectByName(db.DB, projectName)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Install post-commit hook
	err = vault.InstallHook(project.Path, int(project.ID))
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError installing hook: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Premium output
	fmt.Printf("\033[32m✔ Git hook successfully installed for project %q!\033[0m\n", projectName)
	fmt.Printf("  \033[1mHook Path:\033[0m  %s/.git/hooks/post-commit\n", project.Path)
}

func handleCollect() {
	// Expecting: main collect --project-id <id> --message <msg> --diff <diff>
	if len(os.Args) < 8 {
		fmt.Fprintln(os.Stderr, "\033[31mError: collect command requires --project-id, --message and --diff flags\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault collect --project-id <id> --message <msg> --diff <diff>")
		os.Exit(1)
	}

	var projectIDStr, message, diff string
	for i := 2; i < len(os.Args); i++ {
		if os.Args[i] == "--project-id" && i+1 < len(os.Args) {
			projectIDStr = os.Args[i+1]
			i++
		} else if os.Args[i] == "--message" && i+1 < len(os.Args) {
			message = os.Args[i+1]
			i++
		} else if os.Args[i] == "--diff" && i+1 < len(os.Args) {
			diff = os.Args[i+1]
			i++
		}
	}

	if projectIDStr == "" {
		fmt.Fprintln(os.Stderr, "\033[31mError: --project-id flag is required and cannot be empty\033[0m")
		os.Exit(1)
	}
	if message == "" {
		fmt.Fprintln(os.Stderr, "\033[31mError: --message flag is required and cannot be empty\033[0m")
		os.Exit(1)
	}
	if diff == "" {
		fmt.Fprintln(os.Stderr, "\033[31mError: --diff flag is required and cannot be empty\033[0m")
		os.Exit(1)
	}

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError: invalid --project-id %q: must be an integer\033[0m\n", projectIDStr)
		os.Exit(1)
	}

	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// Save git log
	id, err := vault.SaveGitLog(db.DB, projectID, message, diff)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Premium output
	fmt.Printf("\033[32m✔ Git log successfully collected and saved!\033[0m\n")
	fmt.Printf("  \033[1mLog ID:\033[0m      %d\n", id)
	fmt.Printf("  \033[1mProject ID:\033[0m  %d\n", projectID)
}

func handleSummarize() {
	// Expecting: main summarize [--days <n>]
	days := 7
	var err error

	for i := 2; i < len(os.Args); i++ {
		if os.Args[i] == "--days" && i+1 < len(os.Args) {
			days, err = strconv.Atoi(os.Args[i+1])
			if err != nil {
				fmt.Fprintf(os.Stderr, "\033[31mError: invalid value for --days %q: must be an integer\033[0m\n", os.Args[i+1])
				os.Exit(1)
			}
			i++
		}
	}

	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	fmt.Printf("\033[36m⚡ Fetching raw logs from the last %d days...\033[0m\n", days)

	logs, err := vault.GetLogsFromLastDays(db.DB, days)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError retrieving logs: %v\033[0m\n", err)
		os.Exit(1)
	}

	if len(logs) == 0 {
		fmt.Printf("\033[33m⚠ No logs registered in the database for the last %d days. Try committing code first!\033[0m\n", days)
		return
	}

	fmt.Printf("\033[36m⚡ Sending %d logs to Gemini AI to generate draft summary report...\033[0m\n", len(logs))

	summary, err := ai.SummarizeLogs(logs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError generating summary: %v\033[0m\n", err)
		os.Exit(1)
	}

	now := time.Now()
	endDateStr := now.Format("2006-01-02")
	startDateStr := now.AddDate(0, 0, -days).Format("2006-01-02")

	// Save draft state in SQLite database for state-aware Web Dashboard access
	err = vault.SaveDraftSummary(db.DB, summary, startDateStr, endDateStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[33m⚠ Warning: failed to save draft to database: %v\033[0m\n", err)
	}

	// Premium Report Output
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Printf(" \033[1m🚀 Gemini Weekly Summarizer Draft (Last %d Days Preview)\033[0m\n", days)
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println(summary)
	fmt.Println("\033[1;36m==================================================================\033[0m")

	// Interactive Approval Prompt with Glamour Markdown Preview Renderer
	for {
		fmt.Print("\n\033[1;33mDo you want to save this summary to the vault? (y/n/r for Render Review): \033[0m")
		reader := bufio.NewReader(os.Stdin)
		answer, _ := reader.ReadString('\n')
		answer = strings.TrimSpace(strings.ToLower(answer))

		if answer == "r" || answer == "review" {
			rendered, err := glamour.Render(summary, "dark")
			if err != nil {
				fmt.Fprintf(os.Stderr, "\033[31mError rendering preview: %v\033[0m\n", err)
				fmt.Println(summary)
			} else {
				fmt.Println("\n\033[1;35m✨ --- Beautiful Rendered Markdown Preview --- ✨\033[0m")
				fmt.Println(rendered)
				fmt.Println("\033[1;35m---------------------------------------------------\033[0m")
			}
			continue
		}

		if answer == "y" || answer == "yes" {
			id, err := vault.ApproveDraftSummary(db.DB)
			if err != nil {
				fmt.Fprintf(os.Stderr, "\033[31mError saving/approving summary: %v\033[0m\n", err)
				os.Exit(1)
			}

			fmt.Println("\n\033[32m✔ Summary successfully saved to the vault as an append-only weekly achievement!\033[0m")
			fmt.Printf("  \033[1mAchievement ID:\033[0m  %d\n", id)
			fmt.Printf("  \033[1mPeriod:\033[0m          %s to %s\n", startDateStr, endDateStr)
			break
		} else {
			fmt.Println("\033[33mDraft summary discarded (retained in draft table for web approval until next summary run).\033[0m")
			break
		}
	}
}

func handleSummarizeProject() {
	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	fmt.Println("\033[36m⚡ Fetching all approved weekly achievements from the vault...\033[0m")

	achievements, err := vault.GetWeeklyAchievements(db.DB)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError retrieving weekly achievements: %v\033[0m\n", err)
		os.Exit(1)
	}

	if len(achievements) == 0 {
		fmt.Println("\033[33m⚠ No weekly achievements registered in the vault yet.\033[0m")
		fmt.Println("\033[33m💡 Please run 'vault summarize' or approve drafts to create weekly achievements first!\033[0m")
		return
	}

	fmt.Printf("\033[36m⚡ Sending %d weekly summaries to Gemini AI to generate a recruiter-ready project resume...\033[0m\n", len(achievements))

	var summaries []string
	for _, ach := range achievements {
		summaries = append(summaries, ach.ContentMd)
	}

	resume, err := ai.GenerateProjectResume(summaries)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError generating project resume: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Render output with Glamour
	rendered, err := glamour.Render(resume, "dark")
	if err != nil {
		fmt.Println("\n\033[1;35m✨ --- Project Resume Summary (Raw) --- ✨\033[0m")
		fmt.Println(resume)
		fmt.Println("\033[1;35m----------------------------------------\033[0m")
	} else {
		fmt.Println("\n\033[1;35m✨ --- Beautiful Rendered Project Resume --- ✨\033[0m")
		fmt.Println(rendered)
		fmt.Println("\033[1;35m---------------------------------------------\033[0m")
	}
}

func handleHistory() {
	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// If ID is specified (e.g., main history <id>)
	if len(os.Args) == 3 {
		idStr := os.Args[2]
		id, err := strconv.Atoi(idStr)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError: invalid achievement ID %q: must be an integer\033[0m\n", idStr)
			os.Exit(1)
		}

		achievements, err := vault.GetWeeklyAchievements(db.DB)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError retrieving history: %v\033[0m\n", err)
			os.Exit(1)
		}

		var found *vault.WeeklyAchievement
		for _, ach := range achievements {
			if ach.ID == int64(id) {
				found = &ach
				break
			}
		}

		if found == nil {
			fmt.Fprintf(os.Stderr, "\033[31mError: weekly achievement with ID %d not found\033[0m\n", id)
			os.Exit(1)
		}

		// Display full markdown weekly achievement summary rendered via Glamour
		fmt.Println("\033[1;36m==================================================================\033[0m")
		fmt.Printf(" \033[1mWeekly Achievement Detail - ID: %d (%s to %s)\033[0m\n", found.ID, found.StartDate, found.EndDate)
		fmt.Println("\033[1;36m==================================================================\033[0m")
		
		rendered, err := glamour.Render(found.ContentMd, "dark")
		if err != nil {
			fmt.Println(found.ContentMd)
		} else {
			fmt.Println(rendered)
		}
		
		fmt.Println("\033[1;36m==================================================================\033[0m")
		return
	}

	// List all achievements
	achievements, err := vault.GetWeeklyAchievements(db.DB)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError retrieving weekly achievements: %v\033[0m\n", err)
		os.Exit(1)
	}

	if len(achievements) == 0 {
		fmt.Println("\033[33m⚠ No weekly achievements registered in the vault yet.\033[0m")
		return
	}

	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println(" \033[1m📜 Previously Saved Weekly Achievements History\033[0m")
	fmt.Println("\033[1;36m==================================================================\033[0m")
	for _, ach := range achievements {
		fmt.Printf("  \033[32m✔ ID: %d\033[0m\n", ach.ID)
		fmt.Printf("    \033[1mPeriod:\033[0m   %s to %s\n", ach.StartDate, ach.EndDate)
		fmt.Printf("    \033[1mSaved At:\033[0m %s\n\n", ach.CreatedAt)
	}
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println("\033[33m💡 Tip: Run 'vault history <id>' to view the full markdown summary of an entry.\033[0m")
}

func handleCheckPending() {
	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	now := time.Now()
	weekday := now.Weekday()

	// Only alert on Friday, Saturday, or Sunday
	if weekday != time.Friday && weekday != time.Saturday && weekday != time.Sunday {
		return
	}

	var offset int
	switch weekday {
	case time.Friday:
		offset = 0
	case time.Saturday:
		offset = -1
	case time.Sunday:
		offset = -2
	}

	// Calculate Friday 5:00 PM of the current week
	friday := now.AddDate(0, 0, offset)
	friday5pm := time.Date(friday.Year(), friday.Month(), friday.Day(), 17, 0, 0, 0, now.Location())

	// If it's not Friday 5 PM yet, do nothing
	if now.Before(friday5pm) {
		return
	}

	// Fetch latest achievement date from database
	latestDate, err := db.GetLatestWeeklyAchievementDate()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError checking pending status: %v\033[0m\n", err)
		os.Exit(1)
	}

	// If there's no achievement yet, or the latest achievement was created before Friday 5 PM
	if latestDate.IsZero() || latestDate.Before(friday5pm) {
		fmt.Println("\n\033[1;31m⚠️  [VAULT ALERT] Your weekly summary is pending! Run vault summarize to record your impact.\033[0m")
	}
}

func handleSetupShell() {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError getting user home directory: %v\033[0m\n", err)
		os.Exit(1)
	}

	wd, err := os.Getwd()
	if err != nil {
		wd = "/home/tin/projects/achievement-vault"
	}
	mainPath := filepath.Join(wd, "main.go")

	cmdStr := fmt.Sprintf("\ngo run %s check-pending\n", mainPath)

	shellConfigs := []string{
		filepath.Join(home, ".bashrc"),
		filepath.Join(home, ".zshrc"),
	}

	installedCount := 0
	for _, configPath := range shellConfigs {
		// Check if file exists
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			continue
		}

		// Read file content
		data, err := os.ReadFile(configPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError reading %s: %v\033[0m\n", configPath, err)
			continue
		}

		// Check if check-pending command is already installed to maintain idempotency
		content := string(data)
		if strings.Contains(content, "check-pending") {
			fmt.Printf("\033[33mℹ check-pending is already installed in %s\033[0m\n", filepath.Base(configPath))
			installedCount++
			continue
		}

		// Append command to shell configuration
		f, err := os.OpenFile(configPath, os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError opening %s: %v\033[0m\n", configPath, err)
			continue
		}
		defer f.Close()

		if _, err := f.WriteString(cmdStr); err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError writing to %s: %v\033[0m\n", configPath, err)
			continue
		}

		fmt.Printf("\033[32m✔ Successfully installed check-pending to %s!\033[0m\n", filepath.Base(configPath))
		installedCount++
	}

	if installedCount == 0 {
		fmt.Println("\033[33m⚠ No active .bashrc or .zshrc found in home directory. No shell configs updated.\033[0m")
	} else {
		fmt.Println("\033[32m✔ Shell startup hooks successfully configured!\033[0m")
	}
}

func handleServe() {
	// Initialize the DB
	db, err := database.InitDB(getDBPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mDatabase initialization failed: %v\033[0m\n", err)
		os.Exit(1)
	}
	defer db.Close()

	port := 8001
	// Optional custom port override
	if len(os.Args) == 3 {
		p, err := strconv.Atoi(os.Args[2])
		if err == nil {
			port = p
		}
	}

	// Dynamic summarize callback function using Dependency Injection Pattern to avoid circular packages dependency
	summarizeFn := func(days int) (string, error) {
		logs, err := vault.GetLogsFromLastDays(db.DB, days)
		if err != nil {
			return "", fmt.Errorf("failed to retrieve logs: %w", err)
		}

		if len(logs) == 0 {
			return "", fmt.Errorf("no logs registered in the database for the last %d days", days)
		}

		summary, err := ai.SummarizeLogs(logs)
		if err != nil {
			return "", fmt.Errorf("failed to generate AI summary: %w", err)
		}

		now := time.Now()
		endDateStr := now.Format("2006-01-02")
		startDateStr := now.AddDate(0, 0, -days).Format("2006-01-02")

		err = vault.SaveDraftSummary(db.DB, summary, startDateStr, endDateStr)
		if err != nil {
			return "", fmt.Errorf("failed to save draft summary to database: %w", err)
		}

		return summary, nil
	}

	refineFn := func(currentDraft, prompt string) (string, error) {
		refined, err := ai.RefineDraft(currentDraft, prompt)
		if err != nil {
			return "", fmt.Errorf("failed to refine draft: %w", err)
		}
		return refined, nil
	}

	resumeFn := func() (string, error) {
		achievements, err := vault.GetWeeklyAchievements(db.DB)
		if err != nil {
			return "", fmt.Errorf("failed to retrieve achievements: %w", err)
		}

		if len(achievements) == 0 {
			return "", fmt.Errorf("no weekly achievements registered in the vault yet")
		}

		var summaries []string
		for _, ach := range achievements {
			summaries = append(summaries, ach.ContentMd)
		}

		resume, err := ai.GenerateProjectResume(summaries)
		if err != nil {
			return "", fmt.Errorf("failed to generate project resume: %w", err)
		}

		return resume, nil
	}

	generateProfileFn := func(projectName string, logs []string) (string, string, string, error) {
		purpose, techStack, features, err := ai.GenerateProjectProfile(projectName, logs)
		if err != nil {
			return "", "", "", fmt.Errorf("failed to generate project profile: %w", err)
		}
		return purpose, techStack, features, nil
	}

	err = vault.StartAPIServer(db.DB, port, summarizeFn, refineFn, resumeFn, generateProfileFn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError starting API Server: %v\033[0m\n", err)
		os.Exit(1)
	}
}

func handleStartAll() {
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println(" \033[1m🚀 Launching Achievement Vault Stack Concurrently...\033[0m")
	fmt.Println("\033[1;36m==================================================================\033[0m")

	vh := GetVaultHome()

	// 1. Prepare Backend Server process with absolute binary path
	backendBin := filepath.Join(vh, "achievement-vault")
	if _, err := os.Stat(backendBin); os.IsNotExist(err) {
		// Fallback to compiled global binary if present
		backendBin = filepath.Join(vh, "vault")
		if _, err := os.Stat(backendBin); os.IsNotExist(err) {
			backendBin = "go"
		}
	}

	var backendCmd *exec.Cmd
	if backendBin == "go" {
		backendCmd = exec.Command("go", "run", filepath.Join(vh, "main.go"), "serve")
	} else {
		backendCmd = exec.Command(backendBin, "serve")
	}
	backendCmd.Stdout = os.Stdout
	backendCmd.Stderr = os.Stderr

	// 2. Prepare Frontend Dev Server process using absolute directory target
	frontendCmd := exec.Command("npm", "run", "dev")
	frontendCmd.Dir = filepath.Join(vh, "ui")
	frontendCmd.Stdout = os.Stdout
	frontendCmd.Stderr = os.Stderr

	// Set process group so we can signal/kill child groups on unix
	backendCmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	frontendCmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	// Start Backend
	fmt.Println("\033[36m⚡ Starting Go REST API Backend on port 8001...\033[0m")
	if err := backendCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError starting backend: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Start Frontend
	fmt.Println("\033[36m⚡ Starting Next.js Dev Server on http://localhost:3000...\033[0m")
	if err := frontendCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError starting frontend: %v\033[0m\n", err)
		// Clean up backend
		syscall.Kill(-backendCmd.Process.Pid, syscall.SIGKILL)
		os.Exit(1)
	}

	// Signal handling for graceful Ctrl+C terminates
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n\033[33m⚡ Shutdown signal received. Terminating both child processes gracefully...\033[0m")

		// Kill the process groups
		syscall.Kill(-backendCmd.Process.Pid, syscall.SIGINT)
		syscall.Kill(-frontendCmd.Process.Pid, syscall.SIGINT)

		// Wait briefly
		time.Sleep(1500 * time.Millisecond)

		// Hard kill fallback
		syscall.Kill(-backendCmd.Process.Pid, syscall.SIGKILL)
		syscall.Kill(-frontendCmd.Process.Pid, syscall.SIGKILL)

		fmt.Println("\033[32m✔ Both processes successfully shut down. Goodbye!\033[0m")
		os.Exit(0)
	}()

	// Wait for commands to exit
	backendCmd.Wait()
	frontendCmd.Wait()
}

func handleAutostart() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "\033[31mError: autostart requires a subcommand (enable or disable)\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault autostart [enable|disable]")
		os.Exit(1)
	}

	sub := os.Args[2]
	switch sub {
	case "enable":
		handleAutostartEnable()
	case "disable":
		handleAutostartDisable()
	default:
		fmt.Fprintf(os.Stderr, "\033[31mError: unknown autostart subcommand %q: must be enable or disable\033[0m\n", sub)
		os.Exit(1)
	}
}

func handleAutostartEnable() {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError getting user home directory: %v\033[0m\n", err)
		os.Exit(1)
	}

	wd, err := os.Getwd()
	if err != nil {
		wd = "/home/tin/projects/achievement-vault"
	}
	binaryPath := filepath.Join(wd, "achievement-vault")

	// Ensure the binary is compiled and built first
	fmt.Println("\033[36m⚡ Guaranteeing compiled achievement-vault binary is fresh...\033[0m")
	buildCmd := exec.Command("go", "build", "-o", "achievement-vault", "main.go")
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError compiling binary: %v\033[0m\n", err)
		os.Exit(1)
	}

	systemdDir := filepath.Join(home, ".config", "systemd", "user")
	if err := os.MkdirAll(systemdDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError creating systemd user directory: %v\033[0m\n", err)
		os.Exit(1)
	}

	serviceFile := filepath.Join(systemdDir, "achievement-vault.service")
	serviceContent := fmt.Sprintf(`[Unit]
Description=Achievement Vault Service (start-all Stack)
After=network.target

[Service]
Type=simple
WorkingDirectory=%s
ExecStart=%s start-all
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`, wd, binaryPath)

	err = os.WriteFile(serviceFile, []byte(serviceContent), 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError writing systemd service file: %v\033[0m\n", err)
		os.Exit(1)
	}

	// Reload daemon, enable service, and start it
	fmt.Println("\033[36m⚡ Registering Systemd user service entries...\033[0m")
	
	exec.Command("systemctl", "--user", "daemon-reload").Run()
	
	err = exec.Command("systemctl", "--user", "enable", "achievement-vault.service").Run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError enabling service: %v\033[0m\n", err)
		os.Exit(1)
	}

	err = exec.Command("systemctl", "--user", "start", "achievement-vault.service").Run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError starting service: %v\033[0m\n", err)
		os.Exit(1)
	}

	fmt.Println("\033[32m✔ Achievement Vault Autostart successfully configured & started!\033[0m")
	fmt.Printf("  \033[1mService File:\033[0m  %s\n", serviceFile)
	fmt.Println("  \033[1mDetails:\033[0m       The Go backend and Next.js frontend will now run concurrently in the background automatically on boot.")
}

func handleAutostartDisable() {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError getting user home directory: %v\033[0m\n", err)
		os.Exit(1)
	}

	serviceFile := filepath.Join(home, ".config", "systemd", "user", "achievement-vault.service")

	fmt.Println("\033[36m⚡ Stopping and disabling systemd user service...\033[0m")
	
	exec.Command("systemctl", "--user", "stop", "achievement-vault.service").Run()
	exec.Command("systemctl", "--user", "disable", "achievement-vault.service").Run()

	if _, err := os.Stat(serviceFile); err == nil {
		err = os.Remove(serviceFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError removing service file: %v\033[0m\n", err)
		}
	}

	exec.Command("systemctl", "--user", "daemon-reload").Run()

	fmt.Println("\033[32m✔ Autostart successfully disabled and entries removed!\033[0m")
}

func handleSetupGlobal() {
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println(" \033[1m🌍 Configuring Achievement Vault for Global Directory Execution...\033[0m")
	fmt.Println("\033[1;36m==================================================================\033[0m")

	vh := GetVaultHome()

	// 1. Ask/Instruct the user to compile the binary using 'go build -o vault main.go'
	fmt.Println("\033[36m⚡ Phase 1: Compiling fresh global binary 'vault'...\033[0m")
	buildCmd := exec.Command("go", "build", "-o", "vault", "main.go")
	buildCmd.Dir = vh // Always execute inside the workspace folder where go.mod resides!
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError compiling vault binary: %v\033[0m\n", err)
		os.Exit(1)
	}
	fmt.Println("\033[32m✔ Global binary 'vault' compiled successfully!\033[0m")

	// 2. Provide instructions and copy to global bins (~/go/bin/ or ~/.local/bin/)
	fmt.Println("\n\033[36m⚡ Phase 2: Copying global binary to user's PATH...\033[0m")
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError getting user home directory: %v\033[0m\n", err)
		os.Exit(1)
	}

	localBin := filepath.Join(home, ".local", "bin")
	goBin := filepath.Join(home, "go", "bin")

	targetDir := ""
	if _, err := os.Stat(goBin); err == nil {
		targetDir = goBin
	} else if _, err := os.Stat(localBin); err == nil {
		targetDir = localBin
	} else {
		os.MkdirAll(localBin, 0755)
		targetDir = localBin
	}

	targetPath := filepath.Join(targetDir, "vault")
	
	input, err := os.ReadFile(filepath.Join(vh, "vault")) // Read from workspace directory where go compiled it!
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError reading compiled binary: %v\033[0m\n", err)
		os.Exit(1)
	}

	err = os.WriteFile(targetPath, input, 0755)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError copying binary to %s: %v\033[0m\n", targetPath, err)
		fmt.Println("\033[33m💡 Please manually copy the compiled binary 'vault' to your global PATH, e.g.:\033[0m")
		fmt.Println("   sudo cp vault /usr/local/bin/")
	} else {
		fmt.Printf("\033[32m✔ Successfully installed global 'vault' command into %s!\033[0m\n", targetPath)
	}

	// 3. Ensure .bashrc and .zshrc have VAULT_HOME and PATH exported pointing to appropriate directories
	fmt.Println("\n\033[36m⚡ Phase 3: Exporting VAULT_HOME and PATH extensions to shell...\033[0m")
	
	envStr := fmt.Sprintf("\n# Achievement Vault Global Workspace Config\nexport VAULT_HOME=\"%s\"\nexport PATH=\"$PATH:%s\"\n", vh, targetDir)
	
	shellConfigs := []string{
		filepath.Join(home, ".bashrc"),
		filepath.Join(home, ".zshrc"),
	}

	configuredCount := 0
	for _, configPath := range shellConfigs {
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			continue
		}

		data, err := os.ReadFile(configPath)
		if err != nil {
			continue
		}

		content := string(data)
		if strings.Contains(content, "export VAULT_HOME") && strings.Contains(content, "export PATH") && strings.Contains(content, targetDir) {
			fmt.Printf("\033[33mℹ VAULT_HOME & PATH are already configured in %s (skipping write to maintain idempotency)\033[0m\n", filepath.Base(configPath))
			configuredCount++
			continue
		}

		f, err := os.OpenFile(configPath, os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			continue
		}
		defer f.Close()

		if _, err := f.WriteString(envStr); err == nil {
			fmt.Printf("\033[32m✔ Exported VAULT_HOME and PATH variables successfully to %s!\033[0m\n", filepath.Base(configPath))
			configuredCount++
		}
	}

	fmt.Println("\n\033[32m✔ Global Environment Setup Complete!\033[0m")
	fmt.Println("  \033[1;33m💡 To enable the 'vault' command in your CURRENT terminal session, run:\033[0m")
	fmt.Printf("     \033[1;32mexport PATH=\"$PATH:%s\"\033[0m\n\n", targetDir)
	fmt.Println("  \033[1mTo enable it permanently, reload your terminal session by running:\033[0m")
	fmt.Println("     \033[1;32msource ~/.bashrc\033[0m (or \033[1;32msource ~/.zshrc\033[0m if using Zsh)")
	fmt.Println("\n  You can then run \033[32mvault\033[0m from absolutely ANY directory globally!")
}

func printUsage() {
	fmt.Println("\033[1;36m┌────────────────────────────────────────────────────────────────────────────────────────┐\033[0m")
	fmt.Println("\033[1;36m│                       🏆  ACHIEVEMENT VAULT - PREMIUM CLI TOOL v1.2                     │\033[0m")
	fmt.Println("\033[1;36m└────────────────────────────────────────────────────────────────────────────────────────┘\033[0m")
	fmt.Println("Usage:")
	fmt.Println("  \033[1;32mvault\033[0m \033[36m<command> [arguments]\033[0m")
	fmt.Println()

	// 1. REPOSITORY SETUP & HOOKS (Green)
	fmt.Println("\033[1;32m📁 REPOSITORY SETUP & HOOKS\033[0m")
	fmt.Println("  \033[32mregister\033[0m <name> <path> <source>         Register a new local development project")
	fmt.Println("  \033[32mscan-repo\033[0m <path_to_project>             Deep scan codebase layout & git logs to compile profile")
	fmt.Println("  \033[32minstall\033[0m <project_name>                  Install Git post-commit hook automatically")
	fmt.Println("  \033[32msetup-shell\033[0m                             Append pending report check trigger to .bashrc/.zshrc")
	fmt.Println("  \033[32msetup-global\033[0m                            Configure global 'vault' command and export VAULT_HOME")
	fmt.Println()

	// 2. ACTIVITY LOG COLLECTION (Cyan)
	fmt.Println("\033[1;36m📥 GIT COMMIT LOG COLLECTION\033[0m")
	fmt.Println("  \033[36mcollect\033[0m --project-id <id> --message <msg> --diff <diff>")
	fmt.Println("                                          Collect activities to SQLite database (Hook backend)")
	fmt.Println()

	// 3. AI SUMMARIZATION & APPROVAL WORKFLOWS (Purple)
	fmt.Println("\033[1;35m✨ AI SUMMARIZATION & EXECUTIVE APPROVALS\033[0m")
	fmt.Println("  \033[35msummarize\033[0m [--days <days>]               Generate draft weekly summaries via Gemini API")
	fmt.Println("  \033[35msummarize-project\033[0m                       Generate recruiter-ready project resume from achievements")
	fmt.Println("  \033[35mhistory\033[0m [<id>]                          List saved weekly achievement summaries or view an entry")
	fmt.Println("  \033[35mcheck-pending\033[0m                           Scan and warn if weekly summary is due/pending")
	fmt.Println()

	// 4. SERVICES & PERSISTENT DEPLOYMENTS (Yellow)
	fmt.Println("\033[1;33m⚙ SERVICES & BACKGROUND PERSISTENT DEPLOYMENTS\033[0m")
	fmt.Println("  \033[33mserve\033[0m [<port>]                          Start REST API backend server (default port 8001)")
	fmt.Println("  \033[33mstart-all\033[0m                               Run both Go REST API and Next.js Web UI concurrently")
	fmt.Println("  \033[33mautostart\033[0m <enable|disable>              Configure Systemd Service to boot stack on startup")
	fmt.Println()

	// 5. META SYSTEM INFO (Gray)
	fmt.Println("\033[1;30m📚 SYSTEM SUPPORT & HELP\033[0m")
	fmt.Println("  \033[1;30mhelp\033[0m                                    Show this premium help dashboard interface")
	fmt.Println()
	fmt.Println("\033[1;36m┌────────────────────────────────────────────────────────────────────────────────────────┐\033[0m")
	fmt.Println("\033[1;36m│ Example:                                                                               │\033[0m")
	fmt.Println("\033[1;36m│   vault register \"my-api\" \"/absolute/path/my-api\" \"github\"                             │\033[0m")
	fmt.Println("\033[1;36m│   vault install \"my-api\"                                                               │\033[0m")
	fmt.Println("\033[1;36m│   vault start-all                                                                      │\033[0m")
	fmt.Println("\033[1;36m└────────────────────────────────────────────────────────────────────────────────────────┘\033[0m")
}
