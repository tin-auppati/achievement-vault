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
		now := time.Now()
		endDateStr := now.Format("2006-01-02")
		startDateStr := now.AddDate(0, 0, -days).Format("2006-01-02")

		id, err := vault.SaveWeeklyAchievement(db.DB, summary, startDateStr, endDateStr)
		if err != nil {
			fmt.Fprintf(os.Stderr, "\033[31mError saving summary: %v\033[0m\n", err)
			os.Exit(1)
		}

		fmt.Println("\n\033[32m✔ Summary successfully saved to the vault as an append-only weekly achievement!\033[0m")
		fmt.Printf("  \033[1mAchievement ID:\033[0m  %d\n", id)
		fmt.Printf("  \033[1mPeriod:\033[0m          %s to %s\n", startDateStr, endDateStr)
	} else {
		fmt.Println("\033[33mDraft summary discarded.\033[0m")
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
	fmt.Println("  \033[32mhelp\033[0m                              Display usage and help details")
	fmt.Println()
	fmt.Println("Example:")
	fmt.Println("  ./achievement-vault register \"my-api\" \"/home/user/my-api\" \"github\"")
	fmt.Println("  ./achievement-vault install \"my-api\"")
	fmt.Println("  ./achievement-vault summarize --days 7")
	fmt.Println("  ./achievement-vault history 1")
	fmt.Println("\033[1;36m==================================================================\033[0m")
}
