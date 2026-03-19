# github-screenshot-action

📸 A reusable GitHub Action to capture, monitor, and version website screenshots from a JSON list with parallel execution, retries, and cron-based change detection

## Features

- Batch screenshots from JSON
- Parallel execution
- Retry & timeout handling
- Cron monitoring
- Commit or PR automation

## Usage

```yaml
- uses: guibranco/github-screenshot-action@v1
  with:
    json_file: sites.json
    output_dir: screenshots
```