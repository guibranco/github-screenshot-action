[![logo](https://raw.githubusercontent.com/guibranco/github-screenshot-action/main/logo.png)]

# 📸 github-screenshot-action

**Capture, monitor, and version website screenshots — automatically.**

A reusable GitHub Action that takes screenshots of websites from a JSON list, with parallel execution, retry logic, cron scheduling, and automated PR creation.

[![GitHub release](https://img.shields.io/github/v/release/guibranco/github-screenshot-action?color=7c3aed&style=flat-square)](https://github.com/guibranco/github-screenshot-action/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Docker Image](https://img.shields.io/badge/ghcr.io-guibranco%2Fgithub--screenshot--action-0ea5e9?style=flat-square&logo=docker)](https://ghcr.io/guibranco/github-screenshot-action)
[![Maintained](https://img.shields.io/badge/maintained-yes-f59e0b?style=flat-square)](https://github.com/guibranco/github-screenshot-action)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **JSON-driven** | Define all your target sites in a simple JSON file — no code changes needed |
| ⚡ **Parallel execution** | Configurable concurrency to capture multiple sites simultaneously |
| 🔁 **Retry & timeout** | Automatically retries failed captures with configurable limits |
| 🕐 **Cron scheduling** | Run on any schedule to monitor visual changes over time |
| 🌿 **Branch isolation** | Screenshots are committed to a dedicated branch, keeping `main` clean |
| 🔀 **Automated PRs** | Optionally open a pull request automatically after each monitoring run |
| 🐳 **Pre-built Docker image** | No cold build — uses a pre-published image from GHCR for fast startup |
| 🔐 **Chromium-based** | Full Puppeteer + Chromium stack for accurate, real-browser rendering |

---

## 🚀 Quick Start

### 1. Create your sites file

Add a `sites.json` file to your repository:

```json
[
  { "name": "homepage", "url": "https://example.com" },
  { "name": "dashboard", "url": "https://app.example.com/dashboard" },
  { "name": "pricing", "url": "https://example.com/pricing" }
]
```

Each entry requires a `url` and a `name`. The `name` becomes the screenshot filename (e.g. `homepage.png`).

### 2. Create your workflow

```yaml
name: Website monitoring

on:
  schedule:
    - cron: "0 */6 * * *"  # every 6 hours
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run screenshot monitoring
        uses: guibranco/github-screenshot-action@v2.0.9
        with:
          json_file: "sites.json"
          output_dir: "screenshots/"
          concurrency: "5"
          retries: "2"
          timeout_ms: "20000"
          create_pr: "true"
          branch_name: "monitor/screenshots"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## ⚙️ Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `json_file` | ✅ | `screenshots.json` | Path to the JSON file listing sites to capture |
| `output_dir` | ✅ | `screenshots` | Directory where `.png` files will be saved |
| `concurrency` | ❌ | `3` | Number of screenshots to take in parallel |
| `retries` | ❌ | `2` | How many times to retry a failed screenshot |
| `timeout_ms` | ❌ | `30000` | Page load timeout per site in milliseconds |
| `create_pr` | ❌ | `false` | If `true`, opens a PR after committing screenshots |
| `branch_name` | ❌ | `monitor/screenshots` | Branch to commit screenshots to |

---

## 📁 JSON File Format

```json
[
  {
    "name": "landing-page",
    "url": "https://example.com"
  },
  {
    "name": "login",
    "url": "https://example.com/login"
  }
]
```

- **`name`** — used as the output filename (`name.png`). Use lowercase, hyphen-separated values for clean filenames.
- **`url`** — full URL to capture. If the protocol is omitted, `https://` is prepended automatically.

---

## 🔀 PR Automation

When `create_pr: "true"`, the action will:

1. Check out (or create) the branch specified in `branch_name`
2. Capture all screenshots and write them to `output_dir`
3. Commit any changed or new `.png` files with `[skip ci]` to avoid re-triggering workflows
4. Force-push the branch
5. Open a pull request against `main` — or skip silently if a PR already exists

This gives you a clean, reviewable diff of visual changes over time.

> **Note:** The workflow needs `GITHUB_TOKEN` passed via `env` for PR creation and branch push to work.

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 🗓️ Scheduling Examples

```yaml
# Every 6 hours
- cron: "0 */6 * * *"

# Once a day at midnight UTC
- cron: "0 0 * * *"

# Every Monday at 8am UTC
- cron: "0 8 * * 1"

# Every hour during business hours (9–17) on weekdays
- cron: "0 9-17 * * 1-5"
```

---

## 🏗️ Architecture

```
sites.json
    │
    ▼
parser.ts ──► loadItems()
                    │
                    ▼
            screenshot.ts ──► Puppeteer + pLimit (parallel)
                    │              │
                    │         Chromium (headless)
                    │
                    ▼
              output_dir/*.png
                    │
                    ▼
              git.ts ──► checkout branch
                    │    git add -f / commit
                    │    git push --force
                    │    GitHub API PR (optional)
                    ▼
             Pull Request / Branch
```

---

## 🐳 Docker Image

This action uses a **pre-built Docker image** published to GitHub Container Registry, so there is no build step at runtime.

```
ghcr.io/guibranco/github-screenshot-action:<version>
```

The image includes:

- `node:24-slim` base
- Chromium and all required system dependencies
- Pre-compiled TypeScript output in `dist/`

New images are published automatically on every release via the `release.yml` workflow.

---

## 🔒 Permissions

Your workflow needs the following permissions for full functionality:

```yaml
permissions:
  contents: write       # to push the screenshot branch
  pull-requests: write  # to open PRs
```

If you are using a classic `GITHUB_TOKEN` without an explicit `permissions` block, make sure your repository's **Actions settings** allow workflows to create pull requests.

---

## 🛠️ Development

### Prerequisites

- Node.js 24+
- npm

### Setup

```bash
git clone https://github.com/guibranco/github-screenshot-action.git
cd github-screenshot-action
npm install
```

### Build

```bash
npm run build
```

Output is written to `dist/`.

### Project Structure

```
├── src/
│   ├── main.ts          # Entry point — orchestrates the full run
│   ├── parser.ts        # Reads and validates sites.json
│   ├── screenshot.ts    # Puppeteer screenshot logic with concurrency
│   ├── git.ts           # Git operations: commit, branch, PR creation
│   └── logger.ts        # Emoji-prefixed console logger
├── Dockerfile           # Pre-built image definition
├── entrypoint.sh        # Docker entrypoint
├── action.yml           # Action metadata
└── sites.json           # Example sites file
```

### Publishing a new version

1. Merge your changes to `main`
2. The `release.yml` workflow automatically determines the next version via GitVersion
3. It builds and pushes the Docker image to GHCR tagged as `vX.Y.Z` and `latest`
4. It opens a PR updating the `image:` tag in `action.yml` — merge it to complete the release

---

## 📄 License

MIT © [Guilherme Branco Stracini](https://github.com/guibranco)

---

Made with ❤️ and ☕ — contributions welcome via [issues](https://github.com/guibranco/github-screenshot-action/issues) and [pull requests](https://github.com/guibranco/github-screenshot-action/pulls).
