#!/usr/bin/env bash
set -euo pipefail

JSON_FILE="${INPUT_JSON_FILE:-screenshots.json}"
OUTPUT_DIR="${INPUT_OUTPUT_DIR:-screenshots}"
RETRIES="${INPUT_RETRIES:-2}"
CONCURRENCY="${INPUT_CONCURRENCY:-3}"
TIMEOUT_MS="${INPUT_TIMEOUT_MS:-30000}"

git config --global --add safe.directory /github/workspace

mkdir -p "$OUTPUT_DIR"

run_screenshot() {
  local attempt=0
  local success=0
  while [ $attempt -le "$RETRIES" ]; do
    attempt=$((attempt + 1))
    echo "Running screenshot script (attempt $attempt)..."
    if node /app/dist/main.js; then
      success=1
      break
    else
      echo "Attempt $attempt failed."
      sleep 1
    fi
  done

  if [ $success -ne 1 ]; then
    echo "All attempts failed."
    exit 1
  fi
}

run_screenshot
