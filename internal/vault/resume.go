package vault

import (
	"database/sql"
	"fmt"
)

// Resume represents a version of a resume stored in the resumes table.
type Resume struct {
	ID          int64  `json:"id"`
	VersionName string `json:"version_name"`
	ContentMd   string `json:"content_md"`
	CreatedAt   string `json:"created_at"`
}

// GetResumes retrieves all saved resumes from the database.
func GetResumes(db *sql.DB) ([]Resume, error) {
	query := `SELECT id, version_name, content_md, created_at FROM resumes ORDER BY id DESC`
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query resumes: %w", err)
	}
	defer rows.Close()

	var list []Resume
	for rows.Next() {
		var r Resume
		if err := rows.Scan(&r.ID, &r.VersionName, &r.ContentMd, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan resume: %w", err)
		}
		list = append(list, r)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return list, nil
}

// SaveResume inserts a new resume into the database.
func SaveResume(db *sql.DB, versionName, contentMd string) (int64, error) {
	query := `INSERT INTO resumes (version_name, content_md) VALUES (?, ?)`
	result, err := db.Exec(query, versionName, contentMd)
	if err != nil {
		return 0, fmt.Errorf("failed to insert resume: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to fetch resume insert ID: %w", err)
	}

	return id, nil
}

// UpdateResume edits the title and content of an existing saved resume version.
func UpdateResume(db *sql.DB, id int64, versionName, contentMd string) error {
	query := `UPDATE resumes SET version_name = ?, content_md = ? WHERE id = ?`
	_, err := db.Exec(query, versionName, contentMd, id)
	if err != nil {
		return fmt.Errorf("failed to update resume id %d: %w", id, err)
	}
	return nil
}

// DeleteResume deletes a saved resume version by its unique ID.
func DeleteResume(db *sql.DB, id int64) error {
	query := `DELETE FROM resumes WHERE id = ?`
	_, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete resume id %d: %w", id, err)
	}
	return nil
}
