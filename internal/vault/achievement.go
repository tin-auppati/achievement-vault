package vault

import (
	"database/sql"
	"fmt"
	"strings"
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
	return GetWeeklyAchievementsFiltered(db, "", 0, 0, "", "")
}

// GetWeeklyAchievementsFiltered retrieves weekly achievements matching search queries, pagination, and date constraints.
func GetWeeklyAchievementsFiltered(db *sql.DB, q string, limit, offset int, startDate, endDate string) ([]WeeklyAchievement, error) {
	query := `
		SELECT id, content_md, start_date, end_date, created_at 
		FROM weekly_achievements`

	var conditions []string
	var args []interface{}

	if q != "" {
		conditions = append(conditions, "content_md LIKE ?")
		args = append(args, "%"+q+"%")
	}

	if startDate != "" {
		conditions = append(conditions, "(start_date >= ? OR created_at >= ?)")
		args = append(args, startDate, startDate)
	}

	if endDate != "" {
		conditions = append(conditions, "(end_date <= ? OR created_at <= ?)")
		args = append(args, endDate, endDate)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY id DESC"

	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
		if offset > 0 {
			query += " OFFSET ?"
			args = append(args, offset)
		}
	}

	rows, err := db.Query(query, args...)
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

// SaveDraftSummary deletes any existing draft and saves the latest generated draft in the database.
func SaveDraftSummary(db *sql.DB, contentMd, startDate, endDate string) error {
	// Delete any old draft
	_, err := db.Exec("DELETE FROM draft_summaries")
	if err != nil {
		return fmt.Errorf("failed to clean up old draft summaries: %w", err)
	}

	query := `INSERT INTO draft_summaries (content_md, start_date, end_date) VALUES (?, ?, ?)`
	_, err = db.Exec(query, contentMd, startDate, endDate)
	if err != nil {
		return fmt.Errorf("failed to save new draft summary: %w", err)
	}

	return nil
}

// UpdateDraftSummary updates the content_md of the most recent draft summary.
func UpdateDraftSummary(db *sql.DB, newContent string) error {
	query := `UPDATE draft_summaries SET content_md = ? WHERE id = (SELECT id FROM draft_summaries ORDER BY id DESC LIMIT 1)`
	_, err := db.Exec(query, newContent)
	if err != nil {
		return fmt.Errorf("failed to update draft summary: %w", err)
	}
	return nil
}

// GetDraftSummary returns the latest draft summary if one exists.
func GetDraftSummary(db *sql.DB) (contentMd, startDate, endDate string, exists bool, err error) {
	query := `SELECT content_md, start_date, end_date FROM draft_summaries ORDER BY id DESC LIMIT 1`
	err = db.QueryRow(query).Scan(&contentMd, &startDate, &endDate)
	if err == sql.ErrNoRows {
		return "", "", "", false, nil
	}
	if err != nil {
		return "", "", "", false, fmt.Errorf("failed to retrieve draft summary: %w", err)
	}
	return contentMd, startDate, endDate, true, nil
}

// ApproveDraftSummary moves the draft summary content to the weekly_achievements table and deletes the draft.
func ApproveDraftSummary(db *sql.DB) (int64, error) {
	contentMd, startDate, endDate, exists, err := GetDraftSummary(db)
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, fmt.Errorf("no pending draft summary found to approve")
	}

	// Save permanently
	id, err := SaveWeeklyAchievement(db, contentMd, startDate, endDate)
	if err != nil {
		return 0, fmt.Errorf("failed to save draft permanently: %w", err)
	}

	// Delete draft
	_, err = db.Exec("DELETE FROM draft_summaries")
	if err != nil {
		return 0, fmt.Errorf("failed to clean up draft summaries after approval: %w", err)
	}

	return id, nil
}

// RejectDraftSummary deletes the current draft summary from the database.
func RejectDraftSummary(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM draft_summaries")
	if err != nil {
		return fmt.Errorf("failed to delete draft summary: %w", err)
	}
	return nil
}
