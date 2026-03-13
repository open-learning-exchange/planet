#!/usr/bin/env bash
set -euo pipefail

chrome_cmd=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    chrome_cmd="$candidate"
    break
  fi
done

if [ -z "$chrome_cmd" ]; then
  echo "Could not find a Chrome/Chromium binary on PATH." >&2
  echo "Install Chrome/Chromium, then re-run npm run webdriver-set-version." >&2
  exit 1
fi

chrome_version="$($chrome_cmd --version | sed -E 's/.* ([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+).*/\1/')"
chrome_major="${chrome_version%%.*}"

driver_version="$(curl -fsSL "https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone.json" \
  | node -e "const fs=require('fs'); const milestone=process.argv[1]; const data=JSON.parse(fs.readFileSync(0,'utf8')); const match=data.milestones?.[milestone]?.version; if(!match){process.exit(1);} process.stdout.write(match);" "$chrome_major")"

if [ -z "$driver_version" ]; then
  echo "Could not resolve chromedriver version for Chrome milestone $chrome_major." >&2
  exit 1
fi

echo "Detected $chrome_cmd version: $chrome_version"
echo "Using chromedriver version: $driver_version"

webdriver-manager update --standalone false --gecko false --versions.chrome "$driver_version"
