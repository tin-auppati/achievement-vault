package vault

import (
	"database/sql"
	"fmt"
	"time"
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

// GetLogsBetweenTimestamps fetches all raw logs created between the start and end UTC timestamps (inclusive).
func GetLogsBetweenTimestamps(db *sql.DB, startUTC, endUTC string) ([]RawLog, error) {
	query := `
		SELECT id, project_id, type, content, metadata, timestamp 
		FROM raw_logs 
		WHERE timestamp >= ? AND timestamp <= ?
		ORDER BY timestamp DESC`

	rows, err := db.Query(query, startUTC, endUTC)
	if err != nil {
		return nil, fmt.Errorf("failed to query raw logs between %s and %s: %w", startUTC, endUTC, err)
	}
	defer rows.Close()

	var logs []RawLog
	for rows.Next() {
		var l RawLog
		var metadata sql.NullString

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

// GetFridayEndingWeekBounds computes the Saturday 00:00:00 to Friday 23:59:59 bounds
// for the week containing refTime, in Bangkok Time (Asia/Bangkok), and returns
// the start and end of the week as time.Time objects in Bangkok time, and as UTC format strings
// for SQL querying.
func GetFridayEndingWeekBounds(refTime time.Time) (time.Time, time.Time, string, string) {
	loc := time.FixedZone("Asia/Bangkok", 7*60*60)
	refBangkok := refTime.In(loc)

	// Calculate Saturday to Friday range
	weekday := refBangkok.Weekday()
	daysToAdd := (5 - int(weekday) + 7) % 7
	endFriday := refBangkok.AddDate(0, 0, daysToAdd)

	// Set end to Friday 23:59:59.999 Bangkok time
	endFridayTime := time.Date(endFriday.Year(), endFriday.Month(), endFriday.Day(), 23, 59, 59, 999999999, loc)

	// Set start to Saturday 00:00:00 Bangkok time (which is 6 days before endFriday)
	startSaturdayTime := time.Date(endFriday.Year(), endFriday.Month(), endFriday.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, -6)

	startUTC := startSaturdayTime.UTC().Format("2006-01-02 15:04:05")
	endUTC := endFridayTime.UTC().Format("2006-01-02 15:04:05")

	return startSaturdayTime, endFridayTime, startUTC, endUTC
}

// GetLogsForFridayEndingWeek retrieves raw logs for the Bangkok Friday-ending week containing refTime.
func GetLogsForFridayEndingWeek(db *sql.DB, refTime time.Time) ([]RawLog, time.Time, time.Time, error) {
	startSat, endFri, startUTC, endUTC := GetFridayEndingWeekBounds(refTime)
	logs, err := GetLogsBetweenTimestamps(db, startUTC, endUTC)
	if err != nil {
		return nil, time.Time{}, time.Time{}, err
	}
	return logs, startSat, endFri, nil
}
