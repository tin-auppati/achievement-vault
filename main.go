package main

import (
	"fmt"
	"os"
	"strconv"

	"github.com/tin-auppati/achievement-vault/internal/database"
	"github.com/tin-auppati/achievement-vault/internal/vault"
)

const defaultDBPath = "./data/vault.db"

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
	// Total 5 elements in os.Args
	if len(os.Args) != 5 {
		fmt.Fprintln(os.Stderr, "\033[31mError: register command requires exactly 3 arguments: <name> <path> <source>\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault register <name> <path> <source>")
		os.Exit(1)
	}

	name := os.Args[2]
	path := os.Args[3]
	source := os.Args[4]

	// Initialize the DB
	db, err := database.InitDB(defaultDBPath)
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
	db, err := database.InitDB(defaultDBPath)
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
	// Expecting: main collect <project_id> --message <msg> --diff <diff>
	if len(os.Args) < 7 {
		fmt.Fprintln(os.Stderr, "\033[31mError: collect command requires project ID, --message and --diff flags\033[0m")
		fmt.Fprintln(os.Stderr, "Usage: achievement-vault collect <project_id> --message <msg> --diff <diff>")
		os.Exit(1)
	}

	projectIDStr := os.Args[2]
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mError: invalid project ID %q: must be an integer\033[0m\n", projectIDStr)
		os.Exit(1)
	}

	var message, diff string
	for i := 3; i < len(os.Args); i++ {
		if os.Args[i] == "--message" && i+1 < len(os.Args) {
			message = os.Args[i+1]
			i++
		} else if os.Args[i] == "--diff" && i+1 < len(os.Args) {
			diff = os.Args[i+1]
			i++
		}
	}

	if message == "" {
		fmt.Fprintln(os.Stderr, "\033[31mError: --message flag is required and cannot be empty\033[0m")
		os.Exit(1)
	}
	if diff == "" {
		fmt.Fprintln(os.Stderr, "\033[31mError: --diff flag is required and cannot be empty\033[0m")
		os.Exit(1)
	}

	// Initialize the DB
	db, err := database.InitDB(defaultDBPath)
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
	fmt.Println("  \033[32mcollect <project_id> --message <msg> --diff <diff>\033[0m")
	fmt.Println("                                    Collect commit message and diff (Internal/Hook)")
	fmt.Println("  \033[32mhelp\033[0m                              Display usage and help details")
	fmt.Println()
	fmt.Println("Example:")
	fmt.Println("  ./achievement-vault register \"my-api\" \"/home/user/my-api\" \"github\"")
	fmt.Println("  ./achievement-vault install \"my-api\"")
	fmt.Println("\033[1;36m==================================================================\033[0m")
}
