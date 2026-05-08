package vault

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// InstallHook writes or appends the generated post-commit hook script to {projectPath}/.git/hooks/post-commit.
// It detects existing files, appends our logic cleanly, and sets permissions to 0755 using os.Chmod.
func InstallHook(projectPath string, projectID int) error {
	// Clean and normalize the project path
	cleanedPath := filepath.Clean(projectPath)

	// Locate .git/hooks directory using filepath.Join for cross-platform support
	hookDir := filepath.Join(cleanedPath, ".git", "hooks")
	hookPath := filepath.Join(hookDir, "post-commit")

	// Ensure the hooks directory exists
	if err := os.MkdirAll(hookDir, 0755); err != nil {
		return fmt.Errorf("failed to create hooks directory %q: %w", hookDir, err)
	}

	// Generate hook script
	hookCode := GenerateHookScript(projectID)

	// Check if post-commit file already exists
	var contentToWrite []byte
	if _, err := os.Stat(hookPath); err == nil {
		// File exists, read current content
		existingContent, err := os.ReadFile(hookPath)
		if err != nil {
			return fmt.Errorf("failed to read existing hook file %q: %w", hookPath, err)
		}

		// Check if our hook is already installed to prevent duplicate appends
		if strings.Contains(string(existingContent), "# achievement-vault hook start") {
			// Intelligently replace the existing block to keep it clean and up to date
			startIdx := strings.Index(string(existingContent), "# achievement-vault hook start")
			endIdx := strings.Index(string(existingContent), "# achievement-vault hook end")
			if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
				replaced := string(existingContent)[:startIdx] + hookCode + string(existingContent)[endIdx+len("# achievement-vault hook end"):]
				contentToWrite = []byte(replaced)
			} else {
				// Fallback to append if block boundaries are somehow corrupted
				contentToWrite = append(existingContent, []byte("\n"+hookCode+"\n")...)
			}
		} else {
			// Append our script to the existing hook
			contentToWrite = append(existingContent, []byte("\n"+hookCode+"\n")...)
		}
	} else if os.IsNotExist(err) {
		// File does not exist, create a new one with a shebang
		shebang := "#!/bin/sh\n"
		contentToWrite = []byte(shebang + hookCode + "\n")
	} else {
		return fmt.Errorf("failed to check hook file status %q: %w", hookPath, err)
	}

	// Write content to the hook file
	if err := os.WriteFile(hookPath, contentToWrite, 0644); err != nil {
		return fmt.Errorf("failed to write hook file %q: %w", hookPath, err)
	}

	// Explicitly set file permissions to 0755 (executable) using os.Chmod
	if err := os.Chmod(hookPath, 0755); err != nil {
		return fmt.Errorf("failed to set executable permissions (0755) on hook file %q: %w", hookPath, err)
	}

	return nil
}
