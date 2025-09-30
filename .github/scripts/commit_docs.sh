#!/bin/bash
set -e

# Configure Git author locally
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Ensure we have the latest refs
git fetch --prune --tags --force origin

# Create/update docs branch from origin/main so openapi.yaml exists there
git checkout -B docs origin/main

# Generate per-profile filtered specs and docs
PROFILES=(public partner internal)

# Clean previous generated files
rm -f api.md api-*.md openapi-*.yaml profiles.html profiles.md profile-selector.html

for PROFILE in "${PROFILES[@]}"; do
  OUT_SPEC="openapi-${PROFILE}.yaml"
  OUT_MD="api-${PROFILE}.md"
  node ./.github/scripts/filter-openapi-by-profile.mjs "$PROFILE" "$OUT_SPEC"
  npx widdershins "$OUT_SPEC" -o "$OUT_MD"
  # Post-process: tabs + source links
  cp "$OUT_MD" api.md
  node ./.github/scripts/postprocess-gitbook-tabs.mjs || true
  mv api.md "$OUT_MD"
  git add "$OUT_SPEC" "$OUT_MD"
done

# Also generate a full doc from unfiltered spec
npx widdershins ./openapi.yaml -o api.md
node ./.github/scripts/postprocess-gitbook-tabs.mjs || true

# Hardcoded GitBook base URL
GITBOOK_BASE_URL_CONST="https://thoughtfocus.gitbook.io/openapi-1"

# Generate a static profile selector UI (HTML)
cat > profiles.html << EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Select API Profile</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { color: #4b5563; margin: 0 0 20px; }
    .row { display: flex; gap: 12px; align-items: center; }
    select, button { height: 40px; padding: 0 12px; font-size: 14px; }
    button { background: #111827; color: white; border: none; border-radius: 8px; cursor: pointer; }
    button:hover { background: #0b1220; }
    .muted { color: #6b7280; font-size: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Select API Profile</h1>
    <p>Choose a profile to view documentation filtered by <code>x-profiles</code>.</p>
    <div class="row">
      <select id="profile">
        <option value="public">Public</option>
        <option value="partner">Partner</option>
        <option value="internal">Internal</option>
      </select>
      <button id="go">Go</button>
    </div>
    <p class="muted">You can also view the full API without filtering.</p>
    <div class="row" style="margin-top:8px">
      <button id="full">Full API</button>
    </div>
  </div>
  <script>
    const gitbookBaseUrl = '${GITBOOK_BASE_URL_CONST}';
    const routes = { public: 'api-public', partner: 'api-partner', internal: 'api-internal', full: 'api' };
    function toGitBook(route) {
      if (gitbookBaseUrl) {
        return gitbookBaseUrl.replace(/\/$/, '') + '/' + route;
      }
      return route + '.md';
    }
    function navigate(profile) { const route = routes[profile] || routes.full; window.location.href = toGitBook(route); }
    document.getElementById('go').addEventListener('click', function(){ navigate(document.getElementById('profile').value); });
    document.getElementById('full').addEventListener('click', function(){ navigate('full'); });
  </script>
</body>
</html>
EOF

# Standalone selector for hosting anywhere
cat > profile-selector.html << EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Profile Selector</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { color: #4b5563; margin: 0 0 20px; }
    .row { display: flex; gap: 12px; align-items: center; }
    select, button { height: 40px; padding: 0 12px; font-size: 14px; }
    button { background: #111827; color: white; border: none; border-radius: 8px; cursor: pointer; }
    button:hover { background: #0b1220; }
    .muted { color: #6b7280; font-size: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Choose Profile</h1>
    <p>Select a profile to open in GitBook.</p>
    <div class="row">
      <select id="profile">
        <option value="public">Public</option>
        <option value="partner">Partner</option>
        <option value="internal">Internal</option>
      </select>
      <button id="go">Open</button>
    </div>
    <p class="muted">Or open the full API reference.</p>
    <div class="row" style="margin-top:8px">
      <button id="full">Full API</button>
    </div>
  </div>
  <script>
    const gitbookBaseUrl = '${GITBOOK_BASE_URL_CONST}';
    const routes = { public: 'api-public', partner: 'api-partner', internal: 'api-internal', full: 'api' };
    function toGitBook(route) { return gitbookBaseUrl.replace(/\/$/, '') + '/' + route; }
    function navigate(profile) { const route = routes[profile] || routes.full; window.location.href = toGitBook(route); }
    document.getElementById('go').addEventListener('click', function(){ navigate(document.getElementById('profile').value); });
    document.getElementById('full').addEventListener('click', function(){ navigate('full'); });
  </script>
</body>
</html>
EOF

# GitBook in-repo page with simple profile links (for left nav)
cat > profiles.md << 'EOF'
# Select API Profile

- Public: [api-public](api-public.md)
- Partner: [api-partner](api-partner.md)
- Internal: [api-internal](api-internal.md)
- Full: [api](api.md)
EOF

git add profiles.html profiles.md profile-selector.html

# Markdown-only landing (no JS redirect)
cat > README.md << 'EOF'
# API Reference

> Start here: [Select a Profile](profiles.md)

- Full API: [api.md](api.md)
- Public: [api-public.md](api-public.md)
- Partner: [api-partner.md](api-partner.md)
- Internal: [api-internal.md](api-internal.md)

Standalone selector (outside GitBook): [profile-selector.html](profile-selector.html)
EOF

# Generate SUMMARY.md with Profiles first
echo "# Table of contents" > SUMMARY.md
echo "* [Profiles](profiles.md)" >> SUMMARY.md
echo "* [Full API](api.md)" >> SUMMARY.md
echo "* [API (Public)](api-public.md)" >> SUMMARY.md
echo "* [API (Partner)](api-partner.md)" >> SUMMARY.md
echo "* [API (Internal)](api-internal.md)" >> SUMMARY.md

# Add files to commit
git add api.md README.md SUMMARY.md

# Commit & push to docs branch
if git diff --cached --quiet; then
    echo "No changes to commit"
else
    git commit -m "ci: restore profiles.md to fix add error"
    git push origin HEAD:docs --force
fi
