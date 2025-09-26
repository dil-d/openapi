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

        # ✅ Avoid ambiguity between branch "docs" and folder "docs/"
        git fetch origin docs || true
        git checkout -B docs origin/docs --no-guess || git checkout -B docs

        # ✅ Force push to remote docs branch
        git push origin HEAD:docs --force
    fi
else
    echo "No files to commit"
fi
