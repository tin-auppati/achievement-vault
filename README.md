# 🏆 Achievement Vault

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go)](https://golang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js)](https://nextjs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57?logo=sqlite)](https://sqlite.org/)
[![AI Engine](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google)](https://ai.google.dev/)

**Autonomous Developer Achievement Tracker & Recruiter-Ready Resume Generator**

[Key Features](#-key-features) • [Quick Start](#-quick-start-one-line-installer) • [Tech Stack](#-tech-stack) • [CLI Reference](#-cli-command-reference) • [Docker Compose](#-docker-compose-deployment)

</div>

---

## 🚀 Overview

**Achievement Vault** is an autonomous engineering workflow tool that effortlessly monitors your coding activity across local repositories, synthesizes weekly accomplishments using Google Gemini AI, archives them in an immutable database, and generates recruiter-ready Markdown resumes instantly.

Say goodbye to the stressful "what did I accomplish this quarter?" panic. **Achievement Vault** does the tracking, analysis, and formatting for you.

---

## ✨ Key Features

### 🧠 AI Summarization Engine
Connects to Google Gemini API (with robust fallback models `gemini-3-flash-preview` ➔ `2.5-flash` ➔ `3.1-flash-lite`) to digest hundreds of raw commit diffs and write professional, impactful bullet points following Google’s XYZ resume formula.

### 🖥️ Premium SaaS Web Portal
A stunning Glassmorphism UI built in Next.js + Tailwind CSS featuring High-Contrast Dark Mode. View your weekly progress, review AI drafts, browse accomplishment archives, and monitor API quota limits.

### 🔍 Deep Codebase Scanner
Instantly scan any local directory (`scan-repo`) to map out its directory architecture and commit history, automatically synthesizing a permanent architectural profile of the project.

### 📄 Recruiter-Ready Resume Generator
Synthesizes all approved weekly milestones into a beautifully formatted Markdown resume. Copy with one click to submit to HR or prospective employers.

---

## 📦 Quick Start (One-Line Installer)

Install and run **Achievement Vault** with a single command! Our automated bash script verifies dependencies, clones the source, builds the Go binary, installs Next.js dependencies, and sets up your environment.

```bash
curl -sSL https://raw.githubusercontent.com/tin-auppati/achievement-vault/main/install.sh | bash
```

> **Note**: After installation, remember to add your Google Gemini API Key to `~/.achievement-vault/.env`.

---

## 🏗️ Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Web Portal                   │
│        (TypeScript, Tailwind CSS, Glassmorphism)       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP REST / JSON
┌───────────────────────────▼────────────────────────────┐
│                  Go CLI & API Engine                   │
│        (Subprocess orchestration, Git Hooks)           │
└───────────────────────────┬────────────────────────────┘
                            │ Parameterized SQL
┌───────────────────────────▼────────────────────────────┐
│                    SQLite Database                     │
│         (WAL Journal Mode, Cascading Deletes)          │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ CLI Command Reference

Once installed, use the `vault` command to orchestrate your tracking workflow:

| Command | Description | Example |
| :--- | :--- | :--- |
| `vault start-all` | **Recommended**: Launches both Frontend Dashboard and Backend API concurrently. | `vault start-all` |
| `vault serve` | Launches only the Go REST API server. | `vault serve` |
| `vault register` | Registers the current directory as a monitored project in the SQLite database. | `vault register` |
| `vault collect` | Gathers recent Git commits and diffs into raw activity logs. | `vault collect` |
| `vault summarize` | Triggers Gemini AI to analyze raw logs and generate a weekly draft summary. | `vault summarize` |
| `vault scan-repo` | Scans any local directory layout and synthesizes a permanent architectural profile. | `vault scan-repo ./my-app` |
| `vault history` | Displays past weekly achievements formatted directly in the terminal. | `vault history` |

## 🛠️ Manual Installation (From Source)

If you prefer to set up the repository manually from source:

```bash
# 1. Clone the repository
git clone https://github.com/tin-auppati/achievement-vault.git
cd achievement-vault

# 2. Run the automated setup
chmod +x install.sh
./install.sh
```

The script will verify dependencies, compile the Go binary, build the Next.js frontend, and set up your `.env` configuration in one go.

---

## 🐳 Docker Compose Deployment

Prefer running in isolated containers? **Achievement Vault** comes with multi-stage containerization out of the box.

```bash
# Clone the repository
git clone https://github.com/tin-auppati/achievement-vault.git
cd achievement-vault

# Create your .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start services in detached mode
docker compose up -d
```

Your API server will listen on port `8001` and the stunning Web Portal will be available at `http://localhost:3000`.

---

## 🗑️ Uninstallation

A truly professional open-source project must provide a graceful way to uninstall. To remove **Achievement Vault** cleanly from your system, execute our uninstallation script:

```bash
./uninstall.sh
```

### Uninstallation Workflow:
1. **Docker Cleanup**: Automatically stops and purges associated containers, networks, volumes, and images (`docker compose down -v --rmi all`).
2. **Binary Cleanup**: Removes `vault` and `achievement-vault` executables from your `$PATH` (`~/.local/bin`, `/usr/local/bin`).
3. **Interactive Data Protection**: Prompts you before deleting your database (`vault.db`) and configuration (`.env`). Defaults to `No` to prevent accidental data loss.
4. **Source Teardown**: Removes the cloned source directory cleanly.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Copyright (c) 2026 Tin Auppati.
