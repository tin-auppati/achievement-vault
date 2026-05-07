package main

import (
	"fmt"
	"os"

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

func printUsage() {
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println(" \033[1mAchievement Vault - Local CLI Tool\033[0m")
	fmt.Println("\033[1;36m==================================================================\033[0m")
	fmt.Println("Usage:")
	fmt.Println("  achievement-vault <command> [arguments]")
	fmt.Println()
	fmt.Println("Available Commands:")
	fmt.Println("  \033[32mregister <name> <path> <source>\033[0m   Register a new project into the database")
	fmt.Println("  \033[32mhelp\033[0m                              Display usage and help details")
	fmt.Println()
	fmt.Println("Example:")
	fmt.Println("  ./achievement-vault register \"my-api\" \"/home/user/my-api\" \"github\"")
	fmt.Println("\033[1;36m==================================================================\033[0m")
}
