package vault

import (
	"os"
	"path/filepath"
	"strings"
)

// GetDataHome returns the absolute path to the global configuration and data directory.
// It prioritizes VAULT_HOME, then checks if a "data" directory exists in the source home,
// and finally falls back to ~/.achievement-vault.
func GetDataHome() string {
	// 1. Explicit environment override
	if vh := os.Getenv("VAULT_HOME"); vh != "" {
		return vh
	}

	// 2. Check if a local "data" directory exists in the source home (Development / Local mode)
	sh := GetSourceHome()
	if _, err := os.Stat(filepath.Join(sh, "data")); err == nil {
		return sh
	}

	// 3. Fallback to ~/.achievement-vault config dir in user home
	home, err := os.UserHomeDir()
	if err != nil {
		return ".achievement-vault"
	}
	return filepath.Join(home, ".achievement-vault")
}

// GetSourceHome returns the absolute path to the source repository / installation root.
// It prioritizes VAULT_HOME env, then detects if running from a directory containing the ui/ folder.
func GetSourceHome() string {
	// 1. Explicit environment override
	if vh := os.Getenv("VAULT_HOME"); vh != "" {
		return vh
	}

	// 2. Check current working directory for ui/ folder (Development mode)
	if _, err := os.Stat("ui"); err == nil {
		if cwd, err := os.Getwd(); err == nil {
			return cwd
		}
	}

	// 3. Check directory of the executable
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		if _, err := os.Stat(filepath.Join(execDir, "ui")); err == nil {
			return execDir
		}
		
		// Handle potential symlinks (e.g., in ~/.local/bin)
		if realPath, err := filepath.EvalSymlinks(execPath); err == nil {
			realDir := filepath.Dir(realPath)
			if _, err := os.Stat(filepath.Join(realDir, "ui")); err == nil {
				return realDir
			}
		}
	}

	// 4. Default to current directory if all fails
	return "."
}

// LoadEnv searches for .env files in standard locations and populates the process environment.
func LoadEnv() {
	locations := []string{
		".env",                                   // Current directory
		filepath.Join(GetDataHome(), ".env"),     // Global config dir
	}

	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			parseAndSetEnv(loc)
		}
	}
}

func parseAndSetEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)

			// Only set if not already present in environment to allow shell overrides
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

// GetAPIKey retrieves the Gemini API Key from environment variables.
func GetAPIKey() string {
	return os.Getenv("GEMINI_API_KEY")
}
