package vault

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
func StartAPIServer(db *sql.DB, port int, summarizeFn func(days int) (string, error), refineFn func(currentDraft, prompt string) (string, error), resumeFn func() (string, error), generateProfileFn func(projectName string, logs []string) (string, string, string, error)) error {
	http.HandleFunc("/api/resumes", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			resumes, err := GetResumes(db)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resumes)
		case "POST":
			var payload struct {
				VersionName string `json:"version_name"`
				ContentMd   string `json:"content_md"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
				return
			}
			id, err := SaveResume(db, payload.VersionName, payload.ContentMd)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"success": true, "id": %d}`, id)
		default:
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}))

	http.HandleFunc("/api/resumes/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			http.Error(w, `{"error": "invalid path format"}`, http.StatusBadRequest)
			return
		}
		idStr := parts[3]
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, `{"error": "invalid resume ID"}`, http.StatusBadRequest)
			return
		}

		switch r.Method {
		case "PUT":
			var payload struct {
				VersionName string `json:"version_name"`
				ContentMd   string `json:"content_md"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
				return
			}
			if err := UpdateResume(db, id, payload.VersionName, payload.ContentMd); err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"success": true}`)
		case "DELETE":
			if err := DeleteResume(db, id); err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"success": true}`)
		default:
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}))

	http.HandleFunc("/api/projects", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		projects, err := GetProjects(db)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(projects)
	}))

	http.HandleFunc("/api/projects/profile", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		idStr := r.URL.Query().Get("id")
		if idStr == "" {
			http.Error(w, `{"error": "missing project id query parameter"}`, http.StatusBadRequest)
			return
		}

		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, `{"error": "invalid project ID"}`, http.StatusBadRequest)
			return
		}

		var projectName, projectPath string
		err = db.QueryRow("SELECT name, path FROM projects WHERE id = ?", id).Scan(&projectName, &projectPath)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, `{"error": "project not found"}`, http.StatusNotFound)
			} else {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			}
			return
		}

		analyzeErrors := r.URL.Query().Get("analyze_errors") == "true"

		var purpose, techStack, features string

		// If project has a local path registered, execute our premium deep directory mapping scanner!
		if projectPath != "" {
			if info, sErr := os.Stat(projectPath); sErr == nil && info.IsDir() {
				_, _, purpose, techStack, features, err = ScanAndProfileRepository(db, projectPath, analyzeErrors)
				if err != nil {
					http.Error(w, fmt.Sprintf(`{"error": "AI scan-repo profiling failed: %s"}`, err.Error()), http.StatusInternalServerError)
					return
				}

				w.Header().Set("Content-Type", "application/json")
				fmt.Fprintf(w, `{"success": true, "profile_purpose": %q, "profile_tech_stack": %q, "profile_key_features": %q}`, purpose, techStack, features)
				return
			}
		}

		// Fallback to legacy raw commits parsing if folder is remote/absent
		rows, err := db.Query("SELECT content FROM raw_logs WHERE project_id = ? ORDER BY timestamp DESC", id)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var logs []string
		for rows.Next() {
			var c string
			if err := rows.Scan(&c); err == nil {
				logs = append(logs, c)
			}
		}

		purpose, techStack, features, err = generateProfileFn(projectName, logs)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": "AI profile generation failed: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		if err := UpdateProjectProfile(db, id, purpose, techStack, features); err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"success": true, "profile_purpose": %q, "profile_tech_stack": %q, "profile_key_features": %q}`, purpose, techStack, features)
	}))

	http.HandleFunc("/api/resume", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		resumeContent, err := resumeFn()
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"success": true, "resume_content": %q}`, resumeContent)
	}))

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
		q := r.URL.Query().Get("q")
		
		limitStr := r.URL.Query().Get("limit")
		limit := 0
		if limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil {
				limit = l
			}
		}

		offsetStr := r.URL.Query().Get("offset")
		offset := 0
		if offsetStr != "" {
			if o, err := strconv.Atoi(offsetStr); err == nil {
				offset = o
			}
		}

		startDate := r.URL.Query().Get("start_date")
		endDate := r.URL.Query().Get("end_date")

		logs, err := getAPILogs(db, q, limit, offset, startDate, endDate)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(logs)
	}))

	http.HandleFunc("/api/achievements", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		
		limitStr := r.URL.Query().Get("limit")
		limit := 0
		if limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil {
				limit = l
			}
		}

		offsetStr := r.URL.Query().Get("offset")
		offset := 0
		if offsetStr != "" {
			if o, err := strconv.Atoi(offsetStr); err == nil {
				offset = o
			}
		}

		startDate := r.URL.Query().Get("start_date")
		endDate := r.URL.Query().Get("end_date")

		achievements, err := GetWeeklyAchievementsFiltered(db, q, limit, offset, startDate, endDate)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(achievements)
	}))

	http.HandleFunc("/api/achievements/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/achievements/")
		if idStr == "" || idStr == "approve" {
			http.Error(w, `{"error": "invalid achievement path"}`, http.StatusBadRequest)
			return
		}

		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, `{"error": "invalid achievement ID"}`, http.StatusBadRequest)
			return
		}

		switch r.Method {
		case "GET":
			var ach WeeklyAchievement
			err = db.QueryRow("SELECT id, content_md, start_date, end_date, created_at FROM weekly_achievements WHERE id = ?", id).
				Scan(&ach.ID, &ach.ContentMd, &ach.StartDate, &ach.EndDate, &ach.CreatedAt)
			if err != nil {
				if err == sql.ErrNoRows {
					http.Error(w, `{"error": "achievement not found"}`, http.StatusNotFound)
				} else {
					http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				}
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(ach)

		case "PUT":
			var payload struct {
				ContentMd string `json:"content_md"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, `{"error": "invalid json payload"}`, http.StatusBadRequest)
				return
			}

			_, err = db.Exec("UPDATE weekly_achievements SET content_md = ? WHERE id = ?", payload.ContentMd, id)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"success": true}`)

		case "DELETE":
			_, err = db.Exec("DELETE FROM weekly_achievements WHERE id = ?", id)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"success": true}`)

		default:
			http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		}
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

func getAPILogs(db *sql.DB, q string, limit, offset int, startDate, endDate string) ([]APILog, error) {
	query := `
		SELECT raw_logs.id, raw_logs.project_id, projects.name, raw_logs.type, raw_logs.content, raw_logs.metadata, raw_logs.timestamp
		FROM raw_logs
		JOIN projects ON projects.id = raw_logs.project_id`

	var conditions []string
	var args []interface{}

	if q != "" {
		conditions = append(conditions, "(raw_logs.content LIKE ? OR raw_logs.metadata LIKE ? OR projects.name LIKE ? OR raw_logs.type LIKE ?)")
		searchPattern := "%" + q + "%"
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if startDate != "" {
		conditions = append(conditions, "raw_logs.timestamp >= ?")
		args = append(args, startDate)
	}

	if endDate != "" {
		conditions = append(conditions, "raw_logs.timestamp <= ?")
		args = append(args, endDate)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY raw_logs.timestamp DESC"

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
