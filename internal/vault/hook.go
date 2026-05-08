package vault

import (
	"fmt"
	"os"
)

// GenerateHookScript returns the shell script content for the achievement-vault hook.
// It uses git diff --stat for a short diff summary and executes our binary with CLI flags.
func GenerateHookScript(projectID int) string {
	exePath, err := os.Executable()
	if err != nil {
		exePath = "achievement-vault"
	}

	return fmt.Sprintf(`# achievement-vault hook start
COMMIT_MSG=$(git log -1 --pretty=%%B)
DIFF_SUMMARY=$(git diff --stat HEAD~1 HEAD)

# Call our achievement-vault collect command with proper flags
"%s" collect --project-id %d --message "$COMMIT_MSG" --diff "$DIFF_SUMMARY"
# achievement-vault hook end`, exePath, projectID)
}
