#!/usr/bin/env bash
set -e

# Achievement Vault - Graceful Uninstallation Script
# GitHub: https://github.com/tin-auppati/achievement-vault

CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
MAGENTA="\033[1;35m"
RESET="\033[0m"

echo -e "${CYAN}====================================================================${RESET}"
echo -e "${MAGENTA} 🗑️ Achievement Vault Automated Uninstallation Script ${RESET}"
echo -e "${CYAN}====================================================================${RESET}\n"

# 1. Docker Cleanup
echo -e "${CYAN}⚡ Checking for active Docker container deployments...${RESET}"
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}ℹ Found Docker Compose deployment. Teaming down containers, networks, volumes, and images...${RESET}"
    docker compose down -v --rmi all 2>/dev/null || true
    echo -e "${GREEN}✔ Docker resources successfully purged.${RESET}\n"
else
    echo -e "${GREEN}✔ No active Docker Compose deployment detected.${RESET}\n"
fi

# 2. Binary Cleanup
echo -e "${CYAN}⚡ Removing system binaries and symlinks...${RESET}"

remove_bin() {
    if [ -f "$1" ] || [ -L "$1" ]; then
        rm -f "$1"
        echo -e "${GREEN}✔ Removed binary/symlink: $1${RESET}"
    fi
}

remove_bin "${HOME}/.local/bin/achievement-vault"
remove_bin "${HOME}/.local/bin/vault"
remove_bin "/usr/local/bin/achievement-vault"
remove_bin "/usr/local/bin/vault"
echo -e "${GREEN}✔ Binary cleanup completed.${RESET}\n"

# 3. Interactive Data Protection
echo -e "${CYAN}⚡ Checking configuration and database archives (${HOME}/.achievement-vault)...${RESET}"
if [ -d "${HOME}/.achievement-vault" ]; then
    echo -e "${RED}⚠️ WARNING: This directory contains your local SQLite database (vault.db) and API keys (.env).${RESET}"
    
    # Prompt interactively, defaulting to No
    read -p "$(echo -e "${MAGENTA}👉 Do you want to completely delete your database and API keys? (y/N): ${RESET}")" CONFIRM
    CONFIRM=${CONFIRM:-N}

    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        rm -rf "${HOME}/.achievement-vault"
        echo -e "${GREEN}✔ Configuration and database archives permanently deleted.${RESET}\n"
    else
        echo -e "${GREEN}✔ Database and API keys preserved at ${HOME}/.achievement-vault.${RESET}\n"
    fi
else
    echo -e "${GREEN}✔ No database directory found.${RESET}\n"
fi

# 4. Directory Teardown
echo -e "${CYAN}⚡ Cleaning up cloned source code directory...${RESET}"
TARGET_DIR="${HOME}/.achievement-vault-src"
if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
    echo -e "${GREEN}✔ Removed source directory: ${TARGET_DIR}${RESET}\n"
else
    echo -e "${GREEN}✔ No external cloned source directory found.${RESET}\n"
fi

echo -e "${CYAN}====================================================================${RESET}"
echo -e "${GREEN} 🎉 Uninstallation complete! Achievement Vault has been removed. ${RESET}"
echo -e "${CYAN}====================================================================${RESET}\n"
