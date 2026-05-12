package vault

import (
	"bufio"
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
// It also features a Broken Build Analysis mode, Static Config fallbacks, and a Manual Prompt fallback.
func ScanAndProfileRepository(db *sql.DB, targetPath string, analyzeErrors bool) (projectName string, isNew bool, purpose, techStack, features string, err error) {
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
	
	var gitLog string
	if err != nil || !gitInfo.IsDir() {
		fmt.Println("\033[1;33m⚠️ Warning: Provided path is not a valid git repository. Triggering Static Content Ingestion fallback...\033[0m")
		staticConfigs := readTopLevelConfigs(absPath)
		if staticConfigs == "" {
			gitLog = "No git history found, and no top-level configuration files detected."
		} else {
			gitLog = "No git history. Extracted top-level configuration file contents:\n" + staticConfigs
		}
	} else {
		cmd := exec.Command("git", "log", "--oneline", "--max-count=100")
		cmd.Dir = absPath
		gitBytes, err := cmd.Output()
		if err != nil || len(strings.TrimSpace(string(gitBytes))) == 0 {
			fmt.Println("\033[1;33m⚠️ Warning: Git log is empty or failed. Triggering Static Content Ingestion fallback...\033[0m")
			staticConfigs := readTopLevelConfigs(absPath)
			if staticConfigs == "" {
				gitLog = "Git log empty or failed, and no top-level configuration files detected."
			} else {
				gitLog = "Git log empty or failed. Extracted top-level configuration file contents:\n" + staticConfigs
			}
		} else {
			gitLog = string(gitBytes)
		}
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

	// Broken Build Analysis
	if analyzeErrors {
		fmt.Printf("\033[1;35m🛠️ Running automated compilation check to analyze errors for %q...\033[0m\n", projectName)
		errorOutput, isBroken := checkBuildError(absPath)
		if isBroken {
			fmt.Println("\033[1;31m❌ Project compilation failed! Sending error stream to Gemini Master Debugger...\033[0m")
			analysis, err := AnalyzeBuildError(projectName, errorOutput)
			if err == nil {
				fmt.Println("\n\033[1;35m================================================================================\033[0m")
				fmt.Println("\033[1;35m🔥 GEMINI COBALT ARCHITECTURAL RECOVERY REPORT\033[0m")
				fmt.Println("\033[1;35m================================================================================\033[0m")
				printGlamourReport(analysis)
				fmt.Println("\033[1;35m================================================================================\033[0m")

				// Save this to weekly_achievements
				nowStr := time.Now().Format("2006-01-02")
				SaveWeeklyAchievement(db, analysis, nowStr, nowStr)
				fmt.Println("\033[32m✔ Recovery & debug roadmap saved successfully in weekly achievements database!\033[0m")
			} else {
				fmt.Printf("\033[31mFailed to query compiler advice from Gemini: %v\033[0m\n", err)
			}
		} else {
			fmt.Println("\033[32m✔ Project compiled successfully with zero syntax errors!\033[0m")
		}
	}

	fmt.Printf("\033[1;35m✨ Querying Gemini AI to synthesize architectural profile for %q...\033[0m\n", projectName)
	purpose, techStack, features, err = AnalyzeRepository(projectName, dirTree, gitLog)
	if err != nil {
		purpose, techStack = PromptManualEntry()
		features = "- Manual Ingestion: Registered via emergency developer console fallback."
		err = nil // resolve error gracefully
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

// readTopLevelConfigs returns contents of key setup files if git log fails or is empty.
func readTopLevelConfigs(absPath string) string {
	files := []string{"go.mod", "package.json", "README.md", "Dockerfile"}
	var sb strings.Builder
	for _, fName := range files {
		p := filepath.Join(absPath, fName)
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			data, err := os.ReadFile(p)
			if err == nil {
				sb.WriteString(fmt.Sprintf("\n--- File: %s ---\n", fName))
				content := string(data)
				if len(content) > 4000 {
					content = content[:4000] + "\n... [TRUNCATED] ..."
				}
				sb.WriteString(content)
				sb.WriteString("\n")
			}
		}
	}
	return sb.String()
}

// checkBuildError auto-detects the build environment and runs compilation to detect errors.
func checkBuildError(absPath string) (string, bool) {
	var cmd *exec.Cmd
	if _, err := os.Stat(filepath.Join(absPath, "go.mod")); err == nil {
		cmd = exec.Command("go", "build", "-o", filepath.Join(os.TempDir(), "dummy-build"))
	} else if _, err := os.Stat(filepath.Join(absPath, "package.json")); err == nil {
		cmd = exec.Command("npm", "run", "build")
	} else if _, err := os.Stat(filepath.Join(absPath, "Cargo.toml")); err == nil {
		cmd = exec.Command("cargo", "check")
	} else {
		return "", false
	}

	cmd.Dir = absPath
	output, err := cmd.CombinedOutput()
	if err != nil {
		return string(output), true
	}
	return "", false
}

// PromptManualEntry prompts the user via stdin for project inputs if auto-profiling fails.
func PromptManualEntry() (purpose, techStack string) {
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("\n\033[1;33m⚠️ AUTOMATED AI ARCHITECTURAL PROFILING FAILED!\033[0m")
	fmt.Println("Entering Manual Ingestion Fallback Mode...")
	fmt.Println()

	fmt.Print("\033[1m👉 Enter Project Purpose (1-2 sentences explaining what the project actually does):\033[0m\n  ")
	purpose, _ = reader.ReadString('\n')
	purpose = strings.TrimSpace(purpose)
	if purpose == "" {
		purpose = "A local development repository."
	}

	fmt.Print("\n\033[1m👉 Enter Consolidated Tech Stack (comma-separated, e.g. Go, Next.js, SQLite):\033[0m\n  ")
	techStack, _ = reader.ReadString('\n')
	techStack = strings.TrimSpace(techStack)
	if techStack == "" {
		techStack = "N/A"
	}

	return purpose, techStack
}

// AnalyzeBuildError sends a compiler error output to Gemini to receive a troubleshooting plan.
func AnalyzeBuildError(projectName, errorOutput string) (string, error) {
	apiKey := loadEnvAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not configured")
	}

	prompt := fmt.Sprintf(`You are an expert compiler engineer, senior architect, and master debugger.
The development project named "%s" failed to build or compile successfully.
Here is the raw compiler stdout/stderr compilation error log:

%s

Based on this error log and your technical knowledge, please synthesize a highly comprehensive and beautiful troubleshooting analysis report in Markdown format.
Ensure you strictly answer:
1. **Intended Role & Purpose**: What this project was intended to be (inferred from the directory structure, file names, or error logs).
2. **Current Technical Blockers**: Explain exactly why it won't compile/build (the core causes of the compiler errors).
3. **Step-by-Step Recovery Roadmap**: Provide an actionable, sequential list of instructions/commands to fix the blockers.

Your response MUST be in clean, professional Markdown with bold headers and bullet points.`, projectName, errorOutput)

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
		return "", err
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
		
		req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBytes))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		respBytes, ioErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if ioErr != nil {
			lastErr = ioErr
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("status %d: %s", resp.StatusCode, string(respBytes))
			continue
		}

		var geminiResp geminiResponse
		if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
			lastErr = err
			continue
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("empty candidates")
			continue
		}

		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("failed to contact Gemini: %w", lastErr)
}
