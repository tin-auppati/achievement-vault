package vault

import (
	"database/sql"
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
