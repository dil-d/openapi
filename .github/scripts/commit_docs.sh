#!/bin/bash
set -e

# Only proceed if generated-gitbook folder exists
if [ ! -d generated-gitbook ]; then
  echo "generated-gitbook/ not found, creating placeholder files"
  mkdir -p generated-gitbook
  echo "# API Reference" > generated-gitbook/README.md
fi

# Copy README.md to root
cp generated-gitbook/README.md ./README.md

# Generate simple SUMMARY.md
echo "# Table of contents" > SUMMARY.md
echo "* [Introduction](README.md)" >> SUMMARY.md

# Add files to commit
files_to_add=("README.md" "SUMMARY.md")

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
