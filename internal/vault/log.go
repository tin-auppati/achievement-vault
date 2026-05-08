package vault

import (
	"database/sql"
	"fmt"
)

// RawLog represents a log record stored in the raw_logs table.
type RawLog struct {
	ID        int64  `json:"id"`
	ProjectID int64  `json:"project_id"`
	Type      string `json:"type"`
	Content   string `json:"content"`
	Metadata  string `json:"metadata"`
	Timestamp string `json:"timestamp"`
}

// GetLogsFromLastDays fetches all logs from the raw_logs table created within the last N days.
// Logs are returned in descending chronological order (most recent first).
func GetLogsFromLastDays(db *sql.DB, days int) ([]RawLog, error) {
	// Query to get logs within the specified day window using SQLite date/time math
	query := `
		SELECT id, project_id, type, content, metadata, timestamp 
		FROM raw_logs 
		WHERE timestamp >= datetime('now', '-' || ? || ' day')
		ORDER BY timestamp DESC`

	rows, err := db.Query(query, days)
	if err != nil {
		return nil, fmt.Errorf("failed to query raw logs from the last %d days: %w", days, err)
	}
	defer rows.Close()

	var logs []RawLog
	for rows.Next() {
		var l RawLog
		var metadata sql.NullString // Handle potential NULL in metadata safely

		err := rows.Scan(&l.ID, &l.ProjectID, &l.Type, &l.Content, &metadata, &l.Timestamp)
		if err != nil {
			return nil, fmt.Errorf("failed to scan raw log: %w", err)
		}

		if metadata.Valid {
			l.Metadata = metadata.String
		}

		logs = append(logs, l)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error occurred during row iteration: %w", err)
	}

	return logs, nil
}
