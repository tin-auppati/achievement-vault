package vault

import (
	"database/sql"
	"fmt"
)

// WeeklyAchievement represents a record in the weekly_achievements table.
type WeeklyAchievement struct {
	ID        int64  `json:"id"`
	ContentMd string `json:"content_md"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	CreatedAt string `json:"created_at"`
}

// SaveWeeklyAchievement inserts a new weekly summary into the weekly_achievements table in SQLite.
// This follows the 'Append-only' methodology, preserving original reports.
func SaveWeeklyAchievement(db *sql.DB, contentMd, startDate, endDate string) (int64, error) {
	query := `
		INSERT INTO weekly_achievements (content_md, start_date, end_date) 
		VALUES (?, ?, ?)`

	result, err := db.Exec(query, contentMd, startDate, endDate)
	if err != nil {
		return 0, fmt.Errorf("failed to insert weekly achievement record: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve last insert ID: %w", err)
	}

	return id, nil
}

// GetWeeklyAchievements retrieves all previously saved weekly achievements.
func GetWeeklyAchievements(db *sql.DB) ([]WeeklyAchievement, error) {
	query := `
		SELECT id, content_md, start_date, end_date, created_at 
		FROM weekly_achievements 
		ORDER BY id ASC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query weekly achievements list: %w", err)
	}
	defer rows.Close()

	var achievements []WeeklyAchievement
	for rows.Next() {
		var wa WeeklyAchievement
		err := rows.Scan(&wa.ID, &wa.ContentMd, &wa.StartDate, &wa.EndDate, &wa.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan weekly achievement: %w", err)
		}
		achievements = append(achievements, wa)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during row scanning: %w", err)
	}

	return achievements, nil
}
