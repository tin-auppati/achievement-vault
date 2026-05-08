package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/tin-auppati/achievement-vault/internal/vault"
)

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

	// 2. Fallback: Parse local .env manually to avoid dependencies
	data, err := os.ReadFile(".env")
	if err != nil {
		return ""
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

	// Craft prompt template following strict guidelines
	prompt := fmt.Sprintf(`You are an expert technical writer and senior engineering manager.
Analyze the following raw logs from my workspace (commit messages, diffs, types) and generate a premium, professional Weekly Progress Report draft.

Ensure you do the following:
1. **Group Similar Tasks**: Group comparable or related commits and achievements together under cohesive, bold headers or thematic categories.
2. **Key accomplishments**: Generate exactly 3 to 5 high-impact bullet points summarizing what was achieved.
   Each bullet point MUST strictly follow the formula: "Action Verb + Task + Result".
   Example: "Refactored main.go database connection logic to use pooled SQLite connections, reducing connection overhead by 30%%."
3. **Key Technologies Used**: Identify and list the technologies (languages, frameworks, file configurations) used based on the file extensions seen in the diff details (e.g., .go -> Go, .db -> SQLite, .env -> Configuration, .gitignore -> Git).

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

	// Request endpoint for Gemini 2.5 Flash
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

	// Post HTTP Request
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create API HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute Gemini API call: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read API response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini API returned error code %d: %s", resp.StatusCode, string(respBytes))
	}

	// Parse JSON Response
	var geminiResp geminiResponse
	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to deserialize Gemini response: %w", err)
	}

	// Validate candidates in response
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini returned empty results. Complete response: %s", string(respBytes))
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}
