package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/tin-auppati/achievement-vault/internal/ai"
	"github.com/tin-auppati/achievement-vault/internal/database"
	"github.com/tin-auppati/achievement-vault/internal/vault"
)

func getDBPath() string {
	return filepath.Join("data", "vault.db")
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	switch command {
	case "register":
		handleRegister()
	case "install":
		handleInstall()
	case "collect":
		handleCollect()
	case "summarize":
		handleSummarize()
	case "history":
		handleHistory()
	case "check-pending":
		handleCheckPending()
	case "setup-shell":
		handleSetupShell()
	case "serve":
		handleServe()
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

	// Interactive Approval Prompt
	fmt.Print("\n\033[1;33mDo you want to save this summary to the vault? (y/n): \033[0m")
	reader := bufio.NewReader(os.Stdin)
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))

	if answer == "y" || answer == "yes" {
		id, err := vault.ApproveDraftSummary(db.DB)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError saving/approving summary: %v\033[0m\n", err)
			os.Exit(1)
		}

		fmt.Println("\n\033[32m✔ Summary successfully saved to the vault as an append-only weekly achievement!\033[0m")
		fmt.Printf("  \033[1mAchievement ID:\033[0m  %d\n", id)
		fmt.Printf("  \033[1mPeriod:\033[0m          %s to %s\n", startDateStr, endDateStr)
	} else {
		fmt.Println("\033[33mDraft summary discarded (retained in draft table for web approval until next summary run).\033[0m")
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

		// Display full markdown weekly achievement summary
		fmt.Println("\033[1;36m==================================================================\033[0m")
		fmt.Printf(" \033[1mWeekly Achievement Detail - ID: %d (%s to %s)\033[0m\n", found.ID, found.StartDate, found.EndDate)
		fmt.Println("\033[1;36m==================================================================\033[0m")
		fmt.Println(found.ContentMd)
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
	fmt.Println("\033[33m💡 Tip: Run './achievement-vault history <id>' to view the full markdown summary of an entry.\033[0m")
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
		fmt.Println("\n\033[1;31m⚠️  [VAULT ALERT] Your weekly summary is pending! Run go run main.go summarize to record your impact.\033[0m\n")
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

	port := 8080
	// Optional custom port override
	if len(os.Args) == 3 {
		p, err := strconv.Atoi(os.Args[2])
		if err == nil {
			port = p
		}
	}

	err = vault.StartAPIServer(db.DB, port)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError starting API Server: %v\033[0m\n", err)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println(" \033[1mAchievement Vault - Local CLI Tool\033[0m")
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println("Usage:")
	fmt.Println("  achievement-vault <command> [arguments]")
	fmt.Println()
	fmt.Println("Available Commands:")
	fmt.Println("  \033[32mregister <name> <path> <source>\033[0m   Register a new project into the database")
	fmt.Println("  \033[32minstall <project_name>\033[0m            Install git post-commit hook in registered project")
	fmt.Println("  \033[32mcollect --project-id <id> --message <msg> --diff <diff>\033[0m")
	fmt.Println("                                    Collect commit message and diff (Internal/Hook)")
	fmt.Println("  \033[32msummarize [--days <days>]\033[0m         Generate draft summaries of work from the last N days")
	fmt.Println("  \033[32mhistory [<id>]\033[0m                    List saved weekly summaries or view a specific entry")
	fmt.Println("  \033[32mcheck-pending\033[0m                     Scan and alert if the current week's summary is pending")
	fmt.Println("  \033[32msetup-shell\033[0m                       Install check-pending hook to .bashrc and .zshrc")
	fmt.Println("  \033[32mserve [<port>]\033[0m                    Start REST API backend server (default port 8080)")
	fmt.Println("  \033[32mhelp\033[0m                              Display usage and help details")
	fmt.Println()
	fmt.Println("Example:")
	fmt.Println("  ./achievement-vault register \"my-api\" \"/home/user/my-api\" \"github\"")
	fmt.Println("  ./achievement-vault install \"my-api\"")
	fmt.Println("  ./achievement-vault summarize --days 7")
	fmt.Println("  ./achievement-vault history 1")
	fmt.Println("  ./achievement-vault check-pending")
	fmt.Println("  ./achievement-vault setup-shell")
	fmt.Println("  ./achievement-vault serve 8080")
	fmt.Println("\033[1;36m==================================================================\033[0m")
}
