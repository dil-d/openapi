#!/bin/bash
set -e

files_to_add=()

if [ -f README.md ]; then
    files_to_add+=("README.md")
fi

if [ -f SUMMARY.md ]; then
    files_to_add+=("SUMMARY.md")
fi

if [ ${#files_to_add[@]} -gt 0 ]; then
    git add "${files_to_add[@]}"
    if git diff --cached --quiet; then
        echo "No changes to commit"
    else
        git commit -m "ci: regenerate docs from OpenAPI"

        # ✅ Ensure we're on the docs branch explicitly
        git fetch origin docs || true
        git checkout -B docs origin/docs || git checkout -B docs

        # ✅ Force push to docs branch (avoid conflict with local folder named docs)
        git push origin HEAD:docs --force
    fi
else
    echo "No files to commit"
fi
