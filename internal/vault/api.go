package vault

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// APILog represents a combined raw log with its parent project name for API returns.
type APILog struct {
	ID          int64  `json:"id"`
	ProjectID   int64  `json:"project_id"`
	ProjectName string `json:"project_name"`
	Type        string `json:"type"`
	Content     string `json:"content"`
	Metadata    string `json:"metadata"`
	Timestamp   string `json:"timestamp"`
}

// StartAPIServer binds and launches the REST API backend server on the specified port.
func StartAPIServer(db *sql.DB, port int, summarizeFn func(days int) (string, error), refineFn func(currentDraft, prompt string) (string, error)) error {
	http.HandleFunc("/api/summarize", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		days := 7
		if r.URL.Query().Get("days") != "" {
			if parsedDays, err := strconv.Atoi(r.URL.Query().Get("days")); err == nil {
				days = parsedDays
			}
		}

		draftContent, err := summarizeFn(days)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"success": true, "draft_content": %q}`, draftContent)
	}))

	http.HandleFunc("/api/draft", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "PUT" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var payload struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
			return
		}

		if err := UpdateDraftSummary(db, payload.Content); err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"success": true}`)
	}))

	http.HandleFunc("/api/draft/refine", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var payload struct {
			Prompt string `json:"prompt"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
			return
		}

		// Fetch current draft
		currentDraft, _, _, exists, err := GetDraftSummary(db)
		if err != nil || !exists {
			http.Error(w, `{"error": "no pending draft to refine"}`, http.StatusNotFound)
			return
		}

		// AI refine
		refinedContent, err := refineFn(currentDraft, payload.Prompt)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		// Update draft in DB
		if err := UpdateDraftSummary(db, refinedContent); err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"success": true, "draft_content": %q}`, refinedContent)
	}))

	http.HandleFunc("/api/logs", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		logs, err := getAPILogs(db)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(logs)
	}))

	http.HandleFunc("/api/achievements", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		achievements, err := GetWeeklyAchievements(db)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(achievements)
	}))

	http.HandleFunc("/api/stats", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		stats, err := getTechStats(db)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}))

	http.HandleFunc("/api/achievements/approve", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		id, err := ApproveDraftSummary(db)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"success": true, "achievement_id": %d}`, id)
	}))

	http.HandleFunc("/api/status", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		now := time.Now()
		weekday := now.Weekday()
		isWeeklyPending := false

		// 1. Calculate check-pending weekly deadline status (after Friday 5 PM through Sunday)
		if weekday == time.Friday || weekday == time.Saturday || weekday == time.Sunday {
			var offset int
			switch weekday {
			case time.Friday:
				offset = 0
			case time.Saturday:
				offset = -1
			case time.Sunday:
				offset = -2
			}

			// Get Friday 5:00 PM of current week
			friday := now.AddDate(0, 0, offset)
			friday5pm := time.Date(friday.Year(), friday.Month(), friday.Day(), 17, 0, 0, 0, now.Location())

			if now.After(friday5pm) {
				// Query DB for latest permanent weekly achievement created_at timestamp
				var createdAtStr string
				err := db.QueryRow(`SELECT created_at FROM weekly_achievements ORDER BY created_at DESC LIMIT 1`).Scan(&createdAtStr)
				if err == sql.ErrNoRows {
					isWeeklyPending = true
				} else if err == nil {
					parsedTime, parseErr := time.Parse("2006-01-02 15:04:05", createdAtStr)
					if parseErr == nil && parsedTime.Before(friday5pm) {
						isWeeklyPending = true
					}
				}
			}
		}

		// 2. Fetch any pending draft summary from draft_summaries table
		draftContent, draftStart, draftEnd, hasPendingDraft, err := GetDraftSummary(db)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		statusMap := map[string]interface{}{
			"is_weekly_pending": isWeeklyPending,
			"has_pending_draft": hasPendingDraft,
			"draft_content":     draftContent,
			"draft_start_date":  draftStart,
			"draft_end_date":    draftEnd,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(statusMap)
	}))

	fmt.Printf("\033[32m✔ REST API Server successfully listening at http://localhost:%d\033[0m\n", port)
	return http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func getAPILogs(db *sql.DB) ([]APILog, error) {
	query := `
		SELECT raw_logs.id, raw_logs.project_id, projects.name, raw_logs.type, raw_logs.content, raw_logs.metadata, raw_logs.timestamp
		FROM raw_logs
		JOIN projects ON projects.id = raw_logs.project_id
		ORDER BY raw_logs.timestamp DESC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve logs: %w", err)
	}
	defer rows.Close()

	var logs []APILog
	for rows.Next() {
		var l APILog
		var metadata sql.NullString

		err := rows.Scan(&l.ID, &l.ProjectID, &l.ProjectName, &l.Type, &l.Content, &metadata, &l.Timestamp)
		if err != nil {
			return nil, fmt.Errorf("failed to scan log row: %w", err)
		}

		if metadata.Valid {
			l.Metadata = metadata.String
		}

		logs = append(logs, l)
	}

	return logs, nil
}

func getTechStats(db *sql.DB) (map[string]int, error) {
	query := `SELECT metadata FROM raw_logs WHERE metadata IS NOT NULL`
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query metadata for tech stats: %w", err)
	}
	defer rows.Close()

	stats := map[string]int{
		"Go":           0,
		"JavaScript":   0,
		"Shell Script": 0,
		"Database":     0,
		"Config/Git":   0,
		"Other":        0,
	}

	totalDetections := 0
	for rows.Next() {
		var metadata string
		if err := rows.Scan(&metadata); err != nil {
			continue
		}

		lowerMeta := strings.ToLower(metadata)
		detected := false

		if strings.Contains(lowerMeta, ".go") {
			stats["Go"]++
			detected = true
		}
		if strings.Contains(lowerMeta, ".js") || strings.Contains(lowerMeta, ".ts") || strings.Contains(lowerMeta, ".jsx") || strings.Contains(lowerMeta, ".tsx") {
			stats["JavaScript"]++
			detected = true
		}
		if strings.Contains(lowerMeta, ".sh") || strings.Contains(lowerMeta, ".hooks") || strings.Contains(lowerMeta, "post-commit") {
			stats["Shell Script"]++
			detected = true
		}
		if strings.Contains(lowerMeta, ".db") || strings.Contains(lowerMeta, ".sql") {
			stats["Database"]++
			detected = true
		}
		if strings.Contains(lowerMeta, ".json") || strings.Contains(lowerMeta, ".env") || strings.Contains(lowerMeta, ".gitignore") || strings.Contains(lowerMeta, ".yml") || strings.Contains(lowerMeta, ".yaml") {
			stats["Config/Git"]++
			detected = true
		}

		if !detected && len(metadata) > 10 {
			stats["Other"]++
			detected = true
		}

		if detected {
			totalDetections++
		}
	}

	// Avoid empty maps in first initialization to give nice dashboard metrics
	if totalDetections == 0 {
		stats["Go"] = 1
		stats["Database"] = 1
		stats["Config/Git"] = 1
	}

	return stats, nil
}
