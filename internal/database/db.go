package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

// DB wraps a sql.DB connection.
type DB struct {
	*sql.DB
}

// InitDB ensures the directory for the database exists, opens the SQLite database,
// configures essential PRAGMAs (WAL mode, foreign keys), and runs initial migrations
// to create the necessary tables if they do not exist.
func InitDB(dbPath string) (*DB, error) {
	// Ensure the parent directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory %s: %w", dir, err)
	}

	// Open the database connection
	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database at %s: %w", dbPath, err)
	}

	// Enable Write-Ahead Logging (WAL) for better concurrent performance
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	// Enable Foreign Key constraint enforcement
	if _, err := db.Exec("PRAGMA foreign_keys=ON;"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to enable foreign key support: %w", err)
	}

	// Create tables if they do not exist
	if err := createTables(db); err != nil {
		db.Close()
		return nil, err
	}

	return &DB{db}, nil
}

// createTables initializes the SQLite database schema if not already present.
func createTables(db *sql.DB) error {
	projectsSchema := `
	CREATE TABLE IF NOT EXISTS projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		path TEXT NOT NULL,
		source TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	rawLogsSchema := `
	CREATE TABLE IF NOT EXISTS raw_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		type TEXT NOT NULL,
		content TEXT NOT NULL,
		metadata TEXT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);`

	weeklyAchievementsSchema := `
	CREATE TABLE IF NOT EXISTS weekly_achievements (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		content_md TEXT NOT NULL,
		start_date TEXT NOT NULL,
		end_date TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(projectsSchema); err != nil {
		return fmt.Errorf("failed to create projects table: %w", err)
	}

	if _, err := db.Exec(rawLogsSchema); err != nil {
		return fmt.Errorf("failed to create raw_logs table: %w", err)
	}

	if _, err := db.Exec(weeklyAchievementsSchema); err != nil {
		return fmt.Errorf("failed to create weekly_achievements table: %w", err)
	}

	return nil
}
