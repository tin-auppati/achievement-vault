package vault

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Gemini API REST Structures for Standalone Scanner
type geminiRequest struct {
	Contents []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
}

// loadEnvAPIKey manually searches for GEMINI_API_KEY in system env first, then parses the local .env file.
func loadEnvAPIKey() string {
	if val := os.Getenv("GEMINI_API_KEY"); val != "" {
		return val
	}

	envPath := ".env"
	if vaultHome := os.Getenv("VAULT_HOME"); vaultHome != "" {
		envPath = filepath.Join(vaultHome, ".env")
	}

	data, err := os.ReadFile(envPath)
	if err != nil {
		data, err = os.ReadFile(".env")
		if err != nil {
			return ""
		}
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 && strings.TrimSpace(parts[0]) == "GEMINI_API_KEY" {
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			return val
		}
	}

	return ""
}

// AnalyzeRepository calls Gemini API directly to compile codebase structural analysis.
func AnalyzeRepository(projectName, dirTree, gitLog string) (purpose, techStack, features string, err error) {
	apiKey := loadEnvAPIKey()
	if apiKey == "" {
		return "", "", "", fmt.Errorf("GEMINI_API_KEY is not configured. Please add it to system environment variables or your local .env file")
	}

	prompt := fmt.Sprintf(`You are an expert Technical Recruiter and Software Architect.
Analyze the following local repository's directory layout structure and its recent git commit history for the project named "%s".
Based on these resources, generate a comprehensive, highly-professional Project Profile.
Your response MUST be in raw, valid JSON format (strictly no markdown code fences, no leading/trailing markdown blocks, no extra leading text or explanation) matching this schema exactly:
{
  "purpose": "A concise 1-2 sentence high-level summary of what the project does and its core value proposition.",
  "tech_stack": "A consolidated list of key technologies, frameworks, or libraries inferred from the structure and logs (comma-separated, e.g. Go, SQLite, Next.js, TailWind v4).",
  "key_features": "- System Component 1: Architectural description and role.\\n- System Component 2: Architectural description and role.\\n- System Component 3: Architectural description and role."
}

Repository Directory Map:
%s

Recent Git Commit History (git log --oneline):
%s`, projectName, dirTree, gitLog)

	reqPayload := geminiRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{
					{Text: prompt},
				},
			},
		},
	}

	reqBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to serialize request content: %w", err)
	}

	modelsToTry := []string{
		"gemini-2.5-flash",
		"gemini-1.5-flash",
		"gemini-1.5-pro",
	}

	var lastErr error
	client := &http.Client{Timeout: 35 * time.Second}

	for _, modelName := range modelsToTry {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
		
		maxRetries := 3
		backoffDuration := 2 * time.Second

		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBytes))
			if err != nil {
				return "", "", "", fmt.Errorf("failed to create API HTTP request: %w", err)
			}
			req.Header.Set("Content-Type", "application/json")

			resp, err := client.Do(req)
			if err != nil {
				lastErr = fmt.Errorf("[%s] network error (attempt %d/%d): %w", modelName, attempt, maxRetries, err)
				time.Sleep(backoffDuration)
				backoffDuration *= 2
				continue
			}

			respBytes, ioErr := io.ReadAll(resp.Body)
			resp.Body.Close()
			if ioErr != nil {
				lastErr = fmt.Errorf("[%s] failed to read API response body: %w", modelName, ioErr)
				time.Sleep(backoffDuration)
				backoffDuration *= 2
				continue
			}

			if resp.StatusCode != http.StatusOK {
				lastErr = fmt.Errorf("[%s] status code %d (attempt %d/%d): %s", modelName, resp.StatusCode, attempt, maxRetries, string(respBytes))
				if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
					time.Sleep(backoffDuration)
					backoffDuration *= 2
					continue
				}
				break
			}

			var geminiResp geminiResponse
			if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
				lastErr = fmt.Errorf("[%s] failed to deserialize response: %w", modelName, err)
				break
			}

			if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
				lastErr = fmt.Errorf("[%s] empty candidate response: %s", modelName, string(respBytes))
				break
			}

			rawText := geminiResp.Candidates[0].Content.Parts[0].Text
			
			// Clean up potential markdown wrapper code block (```json ... ```)
			cleanText := strings.TrimSpace(rawText)
			if strings.HasPrefix(cleanText, "```json") {
				cleanText = strings.TrimPrefix(cleanText, "```json")
				cleanText = strings.TrimSuffix(cleanText, "```")
				cleanText = strings.TrimSpace(cleanText)
			} else if strings.HasPrefix(cleanText, "```") {
				cleanText = strings.TrimPrefix(cleanText, "```")
				cleanText = strings.TrimSuffix(cleanText, "```")
				cleanText = strings.TrimSpace(cleanText)
			}

			var result struct {
				Purpose     string `json:"purpose"`
				TechStack   string `json:"tech_stack"`
				KeyFeatures string `json:"key_features"`
			}

			if err := json.Unmarshal([]byte(cleanText), &result); err != nil {
				lastErr = fmt.Errorf("[%s] failed to parse JSON structure from model text: %w (Raw text: %s)", modelName, err, rawText)
				break
			}

			return result.Purpose, result.TechStack, result.KeyFeatures, nil
		}
	}

	return "", "", "", fmt.Errorf("Gemini API was unavailable for repo scanning profile generation. Last error received: %w", lastErr)
}

// MapDirectory walks the project path and constructs a clean text-based directory tree representation.
// It ignores build, package, and cache artifacts (e.g. node_modules, .git) up to depth maxDepth.
func MapDirectory(root string, maxDepth int) (string, error) {
	var builder strings.Builder
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}

	ignoreDirs := map[string]bool{
		".git":         true,
		"node_modules": true,
		"dist":         true,
		"build":        true,
		".next":        true,
		"vendor":       true,
		"target":       true,
		".venv":        true,
		"bin":          true,
		"obj":          true,
		"out":          true,
		"cache":        true,
	}

	err = filepath.WalkDir(absRoot, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		rel, err := filepath.Rel(absRoot, path)
		if err != nil {
			return err
		}

		if rel == "." {
			builder.WriteString("/\n")
			return nil
		}

		parts := strings.Split(rel, string(filepath.Separator))
		depth := len(parts)

		if depth > maxDepth {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		for _, part := range parts {
			if ignoreDirs[part] {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		indent := strings.Repeat("  ", depth-1)
		prefix := "├── "
		if d.IsDir() {
			builder.WriteString(fmt.Sprintf("%s%s%s/\n", indent, prefix, d.Name()))
		} else {
			ext := filepath.Ext(d.Name())
			if ext == "" {
				ext = "no-ext"
			}
			builder.WriteString(fmt.Sprintf("%s%s%s (%s)\n", indent, prefix, d.Name(), ext))
		}

		return nil
	})

	return builder.String(), err
}

// ScanAndProfileRepository executes git log and directory structure mapping, automatically registers
// the project in the SQLite database if missing, compiles a permanent Gemini AI profile, and saves it.
func ScanAndProfileRepository(db *sql.DB, targetPath string) (projectName string, isNew bool, purpose, techStack, features string, err error) {
	absPath, err := filepath.Abs(targetPath)
	if err != nil {
		return "", false, "", "", "", fmt.Errorf("failed to resolve absolute path of project: %w", err)
	}

	info, err := os.Stat(absPath)
	if err != nil || !info.IsDir() {
		return "", false, "", "", "", fmt.Errorf("provided path %q is not a valid directory", targetPath)
	}

	gitPath := filepath.Join(absPath, ".git")
	gitInfo, err := os.Stat(gitPath)
	if err != nil || !gitInfo.IsDir() {
		return "", false, "", "", "", fmt.Errorf("provided path %q is not a valid git repository (no .git folder found)", targetPath)
	}

	cmd := exec.Command("git", "log", "--oneline", "--max-count=100")
	cmd.Dir = absPath
	gitBytes, err := cmd.Output()
	if err != nil {
		return "", false, "", "", "", fmt.Errorf("failed to execute 'git log': %w (please verify you have commits inside the project)", err)
	}
	gitLog := string(gitBytes)
	if strings.TrimSpace(gitLog) == "" {
		gitLog = "No recent git commit log history found."
	}

	dirTree, err := MapDirectory(absPath, 4)
	if err != nil {
		return "", false, "", "", "", fmt.Errorf("failed to scan project layout map: %w", err)
	}

	folderName := filepath.Base(absPath)
	var projectID int64

	query := `SELECT id, name FROM projects WHERE path = ?`
	err = db.QueryRow(query, absPath).Scan(&projectID, &projectName)
	if err == sql.ErrNoRows {
		isNew = true
		projectName = folderName
		
		projectID, err = RegisterProject(db, projectName, absPath, "local-scan")
		if err != nil {
			projectName = fmt.Sprintf("%s-scan", folderName)
			projectID, err = RegisterProject(db, projectName, absPath, "local-scan")
			if err != nil {
				return "", false, "", "", "", fmt.Errorf("failed to auto-register new scanned project path: %w", err)
			}
		}
	} else if err != nil {
		return "", false, "", "", "", fmt.Errorf("failed database project query: %w", err)
	}

	fmt.Printf("\033[1;35m✨ Querying Gemini AI to synthesize architectural profile for %q...\033[0m\n", projectName)
	purpose, techStack, features, err = AnalyzeRepository(projectName, dirTree, gitLog)
	if err != nil {
		return projectName, isNew, "", "", "", fmt.Errorf("Gemini AI failed to synthesize codebase architectural details: %w", err)
	}

	err = UpdateProjectProfile(db, projectID, purpose, techStack, features)
	if err != nil {
		return projectName, isNew, purpose, techStack, features, fmt.Errorf("failed to persist compiled project profile to database: %w", err)
	}

	// Format and save Project Profile to weekly_achievements table as a permanent weekly summary!
	markdownProfile := fmt.Sprintf(`### 🏆 **Scanned Project Profile: %s**

#### **Purpose**
%s

#### **Architecture & Key Features**
%s

#### **Tech Stack**
%s`, projectName, purpose, features, techStack)

	nowStr := time.Now().Format("2006-01-02")
	_, err = SaveWeeklyAchievement(db, markdownProfile, nowStr, nowStr)
	if err != nil {
		fmt.Printf("\033[33m[Warning] Failed to save project profile as weekly achievement summary: %v\033[0m\n", err)
	} else {
		fmt.Println("\033[32m✔ Successfully recorded project profile as a permanent Weekly Achievement!\033[0m")
	}

	return projectName, isNew, purpose, techStack, features, nil
}
