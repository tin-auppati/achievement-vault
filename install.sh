#!/usr/bin/env bash
set -e

# Achievement Vault - One-Line Installer Script
# GitHub: https://github.com/tin-auppati/achievement-vault

# Color formatting
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
MAGENTA="\033[1;35m"
RESET="\033[0m"

echo -e "${CYAN}====================================================================${RESET}"
echo -e "${MAGENTA} 🚀 Welcome to the Achievement Vault Automated Installer ${RESET}"
echo -e "${CYAN}====================================================================${RESET}"

# 1. Dependency Checks
echo -e "\n${CYAN}⚡ Verifying system dependencies...${RESET}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ Error: '$1' is required but not installed.${RESET}"
        echo -e "${YELLOW}Please install $1 and re-run this script.${RESET}"
        exit 1
    else
        echo -e "${GREEN}✔ $1 is installed (${RESET}$(command -v "$1")${GREEN})${RESET}"
    fi
}

check_cmd "git"
check_cmd "go"
check_cmd "node"
check_cmd "npm"

# 2. Setup Target Directory
TARGET_DIR="${HOME}/.achievement-vault-src"
REPO_URL="https://github.com/tin-auppati/achievement-vault.git"

if [ -f "./main.go" ] && [ -d "./ui" ]; then
    echo -e "\n${GREEN}✔ Running inside existing repository directory ($(pwd)).${RESET}"
    SRC_DIR=$(pwd)
else
    echo -e "\n${CYAN}⚡ Cloning achievement-vault repository to ${TARGET_DIR}...${RESET}"
    if [ -d "$TARGET_DIR" ]; then
        echo -e "${YELLOW}ℹ Target directory already exists. Pulling latest changes...${RESET}"
        cd "$TARGET_DIR"
        git pull origin main
    else
        git clone "$REPO_URL" "$TARGET_DIR"
        cd "$TARGET_DIR"
    fi
    SRC_DIR="$TARGET_DIR"
fi

cd "$SRC_DIR"

# 3. Build Go Backend
echo -e "\n${CYAN}⚡ Building Go CLI & API Engine...${RESET}"
go mod tidy
go build -o achievement-vault main.go
echo -e "${GREEN}✔ Go backend successfully compiled!${RESET}"

# 4. Build Next.js UI Frontend
echo -e "\n${CYAN}⚡ Building Next.js Web Portal (ui/)...${RESET}"
cd ui
npm install
npm run build
cd ..
echo -e "${GREEN}✔ Next.js frontend successfully built!${RESET}"

# 5. Environment Setup
echo -e "\n${CYAN}⚡ Initializing environment configuration...${RESET}"
CONFIG_DIR="${HOME}/.achievement-vault"
mkdir -p "$CONFIG_DIR"
mkdir -p "${CONFIG_DIR}/data"

ENV_FILE="${CONFIG_DIR}/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "GEMINI_API_KEY=your_gemini_api_key_here" > "$ENV_FILE"
    echo "VAULT_HOME=${SRC_DIR}" >> "$ENV_FILE"
    echo -e "${GREEN}✔ Created default .env template at ${ENV_FILE}${RESET}"
    echo -e "${YELLOW}ℹ Please remember to add your GEMINI_API_KEY to ${ENV_FILE}${RESET}"
else
    echo -e "${GREEN}✔ Existing .env found at ${ENV_FILE}${RESET}"
fi

# 6. Path Configuration
echo -e "\n${CYAN}⚡ Configuring system path & binary access...${RESET}"
BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

# Create symlink or copy binary
ln -sf "${SRC_DIR}/achievement-vault" "${BIN_DIR}/achievement-vault"
ln -sf "${SRC_DIR}/achievement-vault" "${BIN_DIR}/vault"

echo -e "${GREEN}✔ Binary symlinked to ${BIN_DIR}/achievement-vault and ${BIN_DIR}/vault${RESET}"

# Check PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo -e "${YELLOW}ℹ Please add ${BIN_DIR} to your \$PATH variable:${RESET}"
    echo -e "  export PATH=\"\$PATH:${BIN_DIR}\""
    echo -e "${YELLOW}Add this line to your ~/.bashrc or ~/.zshrc profile.${RESET}"
fi

echo -e "\n${CYAN}====================================================================${RESET}"
echo -e "${GREEN} 🎉 Achievement Vault has been successfully installed! ${RESET}"
echo -e "${CYAN}====================================================================${RESET}"
echo -e "To start monitoring your work, run:"
echo -e "  ${MAGENTA}vault serve${RESET}        (Start the UI Web Dashboard & API server)"
echo -e "  ${MAGENTA}vault register${RESET}     (Register a local coding repository)"
echo -e "  ${MAGENTA}vault scan-repo${RESET}    (Instantly scan and profile any local directory)"
echo -e "${CYAN}====================================================================${RESET}\n"
