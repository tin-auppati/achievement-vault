package vault

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

// Project represents a workspace or code project monitored by the achievement vault.
type Project struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	Source    string `json:"source"`
	CreatedAt string `json:"created_at"`
}

// RegisterProject validates the input and inserts a new project into the SQLite database.
// It returns the ID of the newly inserted project, or an error if the validation
// fails or a database error occurs (e.g., name uniqueness violation).
func RegisterProject(db *sql.DB, name, path, source string) (int64, error) {
	name = strings.TrimSpace(name)
	path = strings.TrimSpace(path)
	source = strings.TrimSpace(source)

	// Validate inputs
	if name == "" {
		return 0, errors.New("project name cannot be empty")
	}
	if path == "" {
		return 0, errors.New("project path cannot be empty")
	}
	if source == "" {
		return 0, errors.New("project source cannot be empty")
	}

	query := `INSERT INTO projects (name, path, source) VALUES (?, ?, ?)`
	result, err := db.Exec(query, name, path, source)
	if err != nil {
		// Provide clean, specialized errors for SQLite constraint failures
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return 0, fmt.Errorf("project with name %q is already registered", name)
		}
		return 0, fmt.Errorf("failed to insert project record: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve database insert ID: %w", err)
	}

	return id, nil
}

// GetProjectByName retrieves a project from the SQLite database by its name.
// If no project is found, it returns a descriptive error.
func GetProjectByName(db *sql.DB, name string) (*Project, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("project name cannot be empty")
	}

	query := `SELECT id, name, path, source, created_at FROM projects WHERE name = ?`
	row := db.QueryRow(query, name)

	var p Project
	err := row.Scan(&p.ID, &p.Name, &p.Path, &p.Source, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("project with name %q is not registered", name)
		}
		return nil, fmt.Errorf("failed to retrieve project by name: %w", err)
	}

	return &p, nil
}

// GitCommitMetadata represents the JSON structure for storing git logs in the metadata column.
type GitCommitMetadata struct {
	Message string `json:"message"`
	Diff    string `json:"diff"`
}

// SaveGitLog saves a git commit log in raw_logs.
// The log type is identified as 'git' and stores the commit info in the metadata column as JSON.
func SaveGitLog(db *sql.DB, projectID int, message, diff string) (int64, error) {
	metadata := GitCommitMetadata{
		Message: message,
		Diff:    diff,
	}

	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal commit metadata to JSON: %w", err)
	}

	// Use commit message as primary content
	content := message

	query := `INSERT INTO raw_logs (project_id, type, content, metadata) VALUES (?, ?, ?, ?)`
	result, err := db.Exec(query, projectID, "git", content, string(metadataBytes))
	if err != nil {
		return 0, fmt.Errorf("failed to insert git raw log record: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve database insert ID for log: %w", err)
	}

	return id, nil
}
