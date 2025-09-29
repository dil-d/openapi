#!/bin/bash
set -e

# Configure Git author locally
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Ensure we have the latest refs
git fetch --prune --tags --force origin

# Create/update docs branch from origin/main so openapi.yaml exists there
git checkout -B docs origin/main

# Inject multi-language code samples into the OpenAPI spec
node ./.github/scripts/inject-code-samples.mjs || true

# Generate markdown directly at root using Widdershins
npx widdershins ./openapi.yaml -o api.md

# Convert code samples to GitBook tabs
node ./.github/scripts/postprocess-gitbook-tabs.mjs || true

# Ensure README.md exists
if [ ! -f README.md ]; then
  echo "# API Reference" > README.md
  echo "" >> README.md
  echo "This documentation is generated automatically from OpenAPI spec." >> README.md
fi

# Generate SUMMARY.md with custom labels
echo "# Table of contents" > SUMMARY.md
echo "* [Overview](README.md)" >> SUMMARY.md
echo "* [API](api.md)" >> SUMMARY.md

# Add files to commit
git add api.md README.md SUMMARY.md

# Commit & push to docs branch
if git diff --cached --quiet; then
    echo "No changes to commit"
else
    git commit -m "ci: regenerate docs from OpenAPI"
    git push origin HEAD:docs --force
fi
