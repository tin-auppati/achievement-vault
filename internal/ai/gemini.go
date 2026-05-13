package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/tin-auppati/achievement-vault/internal/vault"
)

// Global AI Model fallback chain configured strictly based on current API tier quotas
var modelChain = []string{"gemini-3-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"}

func init() {
	fmt.Println("[AI Engine] Loaded model chain: Gemini 3 Flash -> 2.5 Flash -> 3.1 Flash Lite")
}

// Gemini API REST Structures
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
	// 1. Check system environment
	if val := os.Getenv("GEMINI_API_KEY"); val != "" {
		return val
	}

	// 2. Locate .env path globally
	envPath := ".env"
	if vaultHome := os.Getenv("VAULT_HOME"); vaultHome != "" {
		envPath = filepath.Join(vaultHome, ".env")
	}

	// 3. Fallback / Read file manually to avoid dependencies
	data, err := os.ReadFile(envPath)
	if err != nil {
		// Fallback to relative .env if VAULT_HOME reading fails
		data, err = os.ReadFile(".env")
		if err != nil {
			return ""
		}
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip empty lines or comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 && strings.TrimSpace(parts[0]) == "GEMINI_API_KEY" {
			// Clean any quotes surrounding the key
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			return val
		}
	}

	return ""
}

// SummarizeLogs sends raw logs data to the Google Gemini API to analyze and return a structured summary.
func SummarizeLogs(logs []vault.RawLog) (string, error) {
	if len(logs) == 0 {
		return "No logs found to summarize during this period.", nil
	}

	apiKey := loadEnvAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not configured. Please add it to system environment variables or your local .env file")
	}

	// Build the text payload containing log details
	var logsText strings.Builder
	for i, l := range logs {
		logsText.WriteString(fmt.Sprintf("--- Log #%d ---\n", i+1))
		logsText.WriteString(fmt.Sprintf("Timestamp: %s\n", l.Timestamp))
		logsText.WriteString(fmt.Sprintf("Type: %s\n", l.Type))
		logsText.WriteString(fmt.Sprintf("Content/Message: %s\n", l.Content))
		if l.Metadata != "" {
			logsText.WriteString(fmt.Sprintf("Metadata (Diff details):\n%s\n", l.Metadata))
		}
		logsText.WriteString("\n")
	}

	// Craft result-oriented prompt template using Google XYZ formula and workflow value
	prompt := fmt.Sprintf(`You are an expert senior software engineer and technical portfolio architect.
Analyze the following raw logs from my development workspace (including commit messages, diff summaries, and log types). Use this data to generate a highly professional, result-oriented Weekly Progress Report draft in clean Markdown format, tailored for a professional developer portfolio.

Ensure you fulfill the following criteria:
1. **Group Work Into Thematic Categories**: Organize comparable tasks together under bold, descriptive headings (e.g., "Core Infrastructure", "Automation & Developer Workflows", "Integration Services").
2. **Key Accomplishments (Google XYZ Formula)**: Generate exactly 3 to 5 high-impact bullet points summarizing key achievements.
   Each bullet point MUST strictly follow the Google XYZ Formula:
   "Accomplished [X] as measured by [Y], by doing [Z]"
   
   - **X (Accomplishment)**: The goal achieved (e.g., streamlined commit logging, optimized database transactions).
   - **Y (Measurement/Metrics)**: The measured improvement or inferred metric (e.g., reducing manual effort by 100%%, shrinking code footprint, optimizing latency). You MUST infer realistic metrics from the diff statistics:
     * If there are many line deletions, focus on "reducing code footprint", "simplifying code paths", or "improving maintainability".
     * If there are new tools/scripts (like Git hooks or CLI commands), focus on "automating manual processes" or "reducing developer friction".
   - **Z (Action Taken)**: The technical execution (e.g., by architecting a custom post-commit Git hook installer, by implementing a secure SQLite storage layer).
   
   *CRITICAL: Heavily emphasize and lead with executive-level action verbs like "Architected", "Streamlined", "Optimized", "Automated", "Engineered", or "Pioneered".*
   *Example: "Automated manual commit logging as measured by a 100%% reduction in human intervention, by architecting an intelligent post-commit hook installer in Go."*

3. **Developer Experience (DX) & Workflow Impact**: Include a dedicated section detailing how these achievements specifically improve a developer's daily workflow (e.g., removing manual data entry, providing instant feedback, increasing repository tracking hygiene).
4. **Key Technologies Used**: Summarize the technologies used based on the file extensions and paths seen in the diff details (e.g., .go -> Go, .db -> SQLite, .env -> Security/Configuration, .sh/.hooks -> Shell/Automation).

Here is the log data:
%s`, logsText.String())

	// Build request payload
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
		return "", fmt.Errorf("failed to serialize request content: %w", err)
	}

	var lastErr error
	client := &http.Client{Timeout: 30 * time.Second}

	for _, modelName := range modelChain {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
		
		maxRetries := 3
		backoffDuration := 3 * time.Second

		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBytes))
			if err != nil {
				return "", fmt.Errorf("failed to create API HTTP request: %w", err)
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

			// Handle service overload/limit errors gracefully by retrying
			if resp.StatusCode != http.StatusOK {
				lastErr = fmt.Errorf("[%s] status code %d (attempt %d/%d): %s", modelName, resp.StatusCode, attempt, maxRetries, string(respBytes))
				
				// Retry on temporary server overloads (503) or rate limits (429)
				if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
					fmt.Printf("\033[33m[GEMINI ALERT] Model %s experiencing temporary spikes (code %d). Retrying in %v...\033[0m\n", modelName, resp.StatusCode, backoffDuration)
					time.Sleep(backoffDuration)
					backoffDuration *= 2
					continue
				}
				
				// Break loop immediately on unrecoverable errors (e.g., bad API Key 400, auth issues 403)
				break
			}

			// Parse JSON Response
			var geminiResp geminiResponse
			if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
				lastErr = fmt.Errorf("[%s] failed to deserialize response: %w", modelName, err)
				break
			}

			// Validate candidates in response
			if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
				lastErr = fmt.Errorf("[%s] empty candidate response: %s", modelName, string(respBytes))
				break
			}

			// Success! Inform which model succeeded if we fell back
			if modelName != modelChain[0] {
				fmt.Printf("\033[32m✔ Fallback succeeded! Successfully compiled summary via model: %s\033[0m\n", modelName)
			}
			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}
		
		fmt.Printf("\033[31m[GEMINI ERROR] Model %s failed: %v. Switching...\033[0m\n", modelName, lastErr)
	}

	return "", fmt.Errorf("Gemini API was unavailable across all tested models. Last error received: %w", lastErr)
}

// RefineDraft sends the current draft and a user prompt to Gemini to refine the markdown.
func RefineDraft(currentDraft, userPrompt string) (string, error) {
	apiKey := loadEnvAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not configured. Please add it to system environment variables or your local .env file")
	}

	prompt := fmt.Sprintf(`You are an expert technical editor. Below is a draft summary of a developer's weekly accomplishments in Markdown format.

Your task is to refine, rewrite, or adjust the draft based strictly on the following user request:
"%s"

Here is the current draft:
%s

Return ONLY the refined Markdown content. Do not include any conversational filler or intro/outro text.`, userPrompt, currentDraft)

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
		return "", fmt.Errorf("failed to serialize request content: %w", err)
	}

	var lastErr error
	client := &http.Client{Timeout: 30 * time.Second}

	for _, modelName := range modelChain {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
		
		maxRetries := 3
		backoffDuration := 3 * time.Second

		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBytes))
			if err != nil {
				return "", fmt.Errorf("failed to create API HTTP request: %w", err)
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

			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}
		fmt.Printf("\033[31m[GEMINI ERROR] Model %s failed: %v. Switching...\033[0m\n", modelName, lastErr)
	}

	return "", fmt.Errorf("Gemini API was unavailable for refinement. Last error received: %w", lastErr)
}

// GenerateProjectResume processes all approved weekly achievements and formats them into a professional project resume description.
func GenerateProjectResume(summaries []string) (string, error) {
	if len(summaries) == 0 {
		return "No achievements found to generate a project resume.", nil
	}

	apiKey := loadEnvAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not configured. Please add it to system environment variables or your local .env file")
	}

	// Group the summaries together
	var summariesText strings.Builder
	for i, s := range summaries {
		summariesText.WriteString(fmt.Sprintf("--- Weekly Summary #%d ---\n%s\n\n", i+1, s))
	}

	prompt := fmt.Sprintf(`You are an expert Technical Recruiter and Software Architect.
Analyze the following collective weekly summaries from this project's development history and generate a professional, recruiter-ready, high-impact project description in clean Markdown format suitable for a resume or high-end portfolio.

Ensure your output contains exactly the following sections:

### **Project Purpose**
A 1-2 sentence high-level summary explaining what the project actually does and its core value proposition. Lead with strong, impactful language.

### **Architecture & Features**
A concise summary of key systems built, derived from the logs (e.g., automated hooks, local REST API, web dashboard, state-aware approval systems, persistent storage, process managers, etc.). Format as high-quality descriptions.

### **Resume Bullets (XYZ Formula)**
Provide exactly 3 to 4 highly impactful, result-oriented bullet points summarizing the overarching achievements.
Each bullet point MUST strictly follow the Google XYZ Formula:
"Accomplished [X] as measured by [Y], by doing [Z]"
- **X**: Achievement / Business goal (e.g., eliminated manual tracking, reduced latency, streamlined deployments)
- **Y**: Realistic measurement or inferred metric (e.g., 100%% reduction in manual logging overhead, sub-second update responsiveness, 0%% database corruption risk)
- **Z**: The exact technical action taken (e.g., by building a lightweight Go daemon with background services, by designing a Same-Origin Proxy using Next.js rewrites)

### **Tech Stack**
Provide a consolidated, clean bulleted list of technologies used (e.g., Go, Next.js, SQLite, TypeScript, Gemini API, TailwindCSS v4, Git Hooks, Glamour, etc.).

Here is the weekly achievement data:
%s`, summariesText.String())

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
		return "", fmt.Errorf("failed to serialize request content: %w", err)
	}

	var lastErr error
	client := &http.Client{Timeout: 35 * time.Second}

	for _, modelName := range modelChain {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
		
		maxRetries := 3
		backoffDuration := 3 * time.Second

		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBytes))
			if err != nil {
				return "", fmt.Errorf("failed to create API HTTP request: %w", err)
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

			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}
		fmt.Printf("\033[31m[GEMINI ERROR] Model %s failed: %v. Switching...\033[0m\n", modelName, lastErr)
	}

	return "", fmt.Errorf("Gemini API was unavailable for project resume generation. Last error received: %w", lastErr)
}

// GenerateProjectProfile analyzes all raw logs of a project and compiles them into a structured Project Profile containing Purpose, Tech Stack, and Key Features.
func GenerateProjectProfile(projectName string, logs []string) (purpose, techStack, features string, err error) {
	if len(logs) == 0 {
		return "No logs found for this project.", "N/A", "No features recorded yet.", nil
	}

	apiKey := loadEnvAPIKey()
	if apiKey == "" {
		return "", "", "", fmt.Errorf("GEMINI_API_KEY is not configured. Please add it to system environment variables or your local .env file")
	}

	// Group logs together
	var logsText strings.Builder
	for i, l := range logs {
		logsText.WriteString(fmt.Sprintf("%d. %s\n", i+1, l))
	}

	prompt := fmt.Sprintf(`You are an expert Technical Recruiter and Software Architect.
Analyze the following list of development activity logs for the project named "%s".
Based on these raw logs, generate a high-quality, professional Project Profile.
Your response MUST be in raw, valid JSON format (strictly no markdown code fences, no leading/trailing markdown blocks, no extra leading text or explanation) matching this schema exactly:
{
  "purpose": "A concise 1-2 sentence high-level summary of what the project does and its core value proposition.",
  "tech_stack": "A consolidated list of key technologies, frameworks, or libraries inferred from the logs (comma-separated, e.g. Go, SQLite, Next.js, TailWind v4).",
  "key_features": "- Feature 1: Description\\n- Feature 2: Description\\n- Feature 3: Description"
}

Activity Logs:
%s`, projectName, logsText.String())

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

	var lastErr error
	client := &http.Client{Timeout: 35 * time.Second}

	for _, modelName := range modelChain {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
		
		maxRetries := 3
		backoffDuration := 3 * time.Second

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
				Purpose    string `json:"purpose"`
				TechStack  string `json:"tech_stack"`
				KeyFeatures string `json:"key_features"`
			}

			if err := json.Unmarshal([]byte(cleanText), &result); err != nil {
				lastErr = fmt.Errorf("[%s] failed to parse JSON structure from model text: %w (Raw text: %s)", modelName, err, rawText)
				break
			}

			return result.Purpose, result.TechStack, result.KeyFeatures, nil
		}
		fmt.Printf("\033[31m[GEMINI ERROR] Model %s failed: %v. Switching...\033[0m\n", modelName, lastErr)
	}

	return "", "", "", fmt.Errorf("Gemini API was unavailable for project profile generation. Last error received: %w", lastErr)
}
