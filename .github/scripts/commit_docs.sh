#!/bin/bash
set -e

# Configure Git author
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Run the OpenAPI autodoc generator
npx github:GitbookIO/openapi-autodoc -f ./openapi.yaml || true

# Ensure generated-gitbook exists
if [ ! -d generated-gitbook ]; then
  echo "generated-gitbook/ not found, creating placeholder"
  mkdir -p generated-gitbook
  echo "# API Reference" > generated-gitbook/README.md
fi

# Copy all generated MD files to repo root
cp -r generated-gitbook/* .

# Ensure README.md exists
if [ ! -f README.md ]; then
  echo "# API Reference" > README.md
  echo "" >> README.md
  echo "This documentation is generated automatically from OpenAPI spec." >> README.md
fi

# Generate simple SUMMARY.md
echo "# Table of contents" > SUMMARY.md
for f in *.md; do
  [[ "$f" == "SUMMARY.md" ]] && continue
  echo "* [$f]($f)" >> SUMMARY.md
done

# Add files to commit
git add README.md SUMMARY.md *.md

# Commit & push to docs branch
if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "ci: regenerate docs from OpenAPI"
  git fetch origin docs || true
  git checkout -B docs refs/remotes/origin/docs || git checkout -B docs
  git push origin HEAD:docs --force
fi
