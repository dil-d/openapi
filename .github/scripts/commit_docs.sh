#!/bin/bash
set -e

# Configure Git author locally
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Generate markdown directly at root using Widdershins
npx widdershins ./openapi.yaml -o api.md

# Ensure README.md exists
if [ ! -f README.md ]; then
  echo "# API Reference" > README.md
  echo "" >> README.md
  echo "This documentation is generated automatically from OpenAPI spec." >> README.md
fi

# Generate SUMMARY.md dynamically
echo "# Table of contents" > SUMMARY.md
for f in *.md; do
  [[ "$f" == "SUMMARY.md" ]] && continue
  echo "* [$f]($f)" >> SUMMARY.md
done

# Add files to commit
git add api.md README.md SUMMARY.md

# Commit & push to docs branch
if git diff --cached --quiet; then
    echo "No changes to commit"
else
    git commit -m "ci: regenerate docs from OpenAPI"

    # Stash local changes before switching branches
    git stash push -u -m "temp stash before switching branch" || true

    # Checkout docs branch safely
    git fetch origin docs || true
    git checkout -B docs refs/remotes/origin/docs || git checkout -B docs
    git stash pop || true

    # Force push to remote docs branch
    git push origin HEAD:docs --force
fi
