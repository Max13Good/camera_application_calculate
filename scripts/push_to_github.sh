#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Max13Good/camera_application_calculate.git"
BRANCH="sandbox-sync"

echo "Preparing Git repo..."
git init >/dev/null 2>&1 || true
git add -A
if ! git diff --cached --quiet; then
  git commit -m "sync: latest calculator (links + tooltips + split)" || true
fi

if git remote | grep -q "^origin$"; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git checkout -B "$BRANCH"

echo "Pushing to $REPO_URL (branch: $BRANCH)..."
git push -u origin "$BRANCH"

echo "Done. Open CodeSandbox:"
echo "https://codesandbox.io/p/github/Max13Good/camera_application_calculate/tree/$BRANCH?file=/src/App.tsx"

