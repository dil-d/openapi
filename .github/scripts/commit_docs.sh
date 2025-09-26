#!/bin/bash
set -e

files_to_add=()

# Ensure README.md exists
if [ ! -f generated-gitbook/README.md ]; then
  echo "# API Reference" > generated-gitbook/README.md
  echo "" >> generated-gitbook/README.md
  echo "This documentation is generated automatically from OpenAPI spec." >> generated-gitbook/README.md
fi

# Copy generated README.md to repo root
cp generated-gitbook/README.md ./README.md

# Generate simple SUMMARY.md
echo "# Table of contents" > SUMMARY.md
echo "* [Introduction](README.md)" >> SUMMARY.md

# Add files to commit
files_to_add+=("README.md" "SUMMARY.md")

if [ ${#files_to_add[@]} -gt 0 ]; then
    git add "${files_to_add[@]}"
    if git diff --cached --quiet; then
        echo "No changes to commit"
    else
        git commit -m "ci: regenerate docs from OpenAPI"

        # Explicitly handle the docs branch
        git fetch origin docs || true
        git checkout -B docs refs/remotes/origin/docs || git checkout -B docs

        # Force push to remote docs branch
        git push origin HEAD:docs --force
    fi
else
    echo "No files to commit"
fi
