package vault

import (
	"fmt"
	"os"
	"path/filepath"
)

// InstallHook writes the generated script to {projectPath}/.git/hooks/post-commit
// and makes it executable (0755).
func InstallHook(projectPath string, projectID int) error {
	// Clean and normalize the project path
	cleanedPath := filepath.Clean(projectPath)

	// Determine the exact path of the post-commit hook
	hookPath := filepath.Join(cleanedPath, ".git", "hooks", "post-commit")

	// Ensure the hooks directory exists
	hooksDir := filepath.Dir(hookPath)
	if err := os.MkdirAll(hooksDir, 0755); err != nil {
		return fmt.Errorf("failed to create hooks directory %q: %w", hooksDir, err)
	}

	// Generate the shell script content
	script := GenerateHookScript(projectID)

	// Write the script to the hook path with executable permissions (0755)
	if err := os.WriteFile(hookPath, []byte(script), 0755); err != nil {
		return fmt.Errorf("failed to write hook file %q: %w", hookPath, err)
	}

	return nil
}
