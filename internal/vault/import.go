package vault

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// SaveCustomLog inserts a manual log entry into the raw_logs table.
func SaveCustomLog(db *sql.DB, projectID int64, content string) (int64, error) {
	if content == "" {
		return 0, fmt.Errorf("content cannot be empty")
	}

	query := `INSERT INTO raw_logs (project_id, type, content, metadata) VALUES (?, ?, ?, ?)`
	result, err := db.Exec(query, projectID, "custom", content, "{}")
	if err != nil {
		return 0, fmt.Errorf("failed to insert custom raw log record: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve database insert ID: %w", err)
	}

	return id, nil
}

// ImportGitHistory walks through git commits at targetPath and saves new ones to raw_logs up to limit count.
func ImportGitHistory(db *sql.DB, projectID int64, targetPath string, limit int) (int, error) {
	if targetPath == "" {
		return 0, fmt.Errorf("project path is empty")
	}

	// Clean targetPath
	targetPath = filepath.Clean(targetPath)

	// Verify path exists and is a directory
	info, err := os.Stat(targetPath)
	if err != nil {
		return 0, fmt.Errorf("project directory does not exist: %w", err)
	}
	if !info.IsDir() {
		return 0, fmt.Errorf("project path is not a directory")
	}

	// Verify git is initialized
	gitCheck := exec.Command("git", "rev-parse", "--is-inside-work-tree")
	gitCheck.Dir = targetPath
	if err := gitCheck.Run(); err != nil {
		return 0, fmt.Errorf("path is not a valid Git repository: %w", err)
	}

	// Get N recent commit hashes
	gitLog := exec.Command("git", "log", fmt.Sprintf("-n %d", limit), "--pretty=format:%H")
	gitLog.Dir = targetPath
	out, err := gitLog.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to read git log: %w", err)
	}

	hashesStr := strings.TrimSpace(string(out))
	if hashesStr == "" {
		return 0, nil
	}

	hashes := strings.Split(hashesStr, "\n")
	importedCount := 0

	for _, hash := range hashes {
		hash = strings.TrimSpace(hash)
		if hash == "" {
			continue
		}

		// Check if commit hash already exists in raw_logs for this project
		var exists int
		checkQuery := `SELECT COUNT(*) FROM raw_logs WHERE project_id = ? AND type = 'git' AND metadata LIKE ?`
		err = db.QueryRow(checkQuery, projectID, "%"+hash+"%").Scan(&exists)
		if err != nil {
			continue
		}
		if exists > 0 {
			continue // Skip already imported commits
		}

		// Get commit message
		gitMsg := exec.Command("git", "show", "--no-color", "-s", "--pretty=format:%B", hash)
		gitMsg.Dir = targetPath
		msgOut, err := gitMsg.Output()
		if err != nil {
			continue
		}
		message := strings.TrimSpace(string(msgOut))
		if message == "" {
			continue
		}

		// Get diff
		gitDiff := exec.Command("git", "diff", "--no-color", hash+"^!")
		gitDiff.Dir = targetPath
		diffOut, err := gitDiff.Output()
		if err != nil {
			// Fallback for root commit
			gitDiff = exec.Command("git", "show", "--no-color", "--pretty=format:", hash)
			gitDiff.Dir = targetPath
			diffOut, err = gitDiff.Output()
			if err != nil {
				continue
			}
		}
		diff := strings.TrimSpace(string(diffOut))

		// Get timestamp
		gitTime := exec.Command("git", "show", "--no-color", "-s", "--pretty=format:%cI", hash)
		gitTime.Dir = targetPath
		timeOut, err := gitTime.Output()
		var commitTime time.Time
		if err == nil {
			commitTime, _ = time.Parse(time.RFC3339, strings.TrimSpace(string(timeOut)))
		}
		if commitTime.IsZero() {
			commitTime = time.Now()
		}
		timestampUTC := commitTime.UTC().Format("2006-01-02 15:04:05")

		// Save Git log
		metadata := GitCommitMetadata{
			Message: message,
			Diff:    diff,
			Hash:    hash,
		}

		metadataBytes, err := json.Marshal(metadata)
		if err != nil {
			continue
		}

		insertQuery := `INSERT INTO raw_logs (project_id, type, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?)`
		_, err = db.Exec(insertQuery, projectID, "git", message, string(metadataBytes), timestampUTC)
		if err == nil {
			importedCount++
		}
	}

	return importedCount, nil
}
