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
rm -f api.md api-*.md openapi-*.yaml profiles.html profiles.md

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

# Generate a static profile selector UI (HTML and MD wrapper)
cat > profiles.html << 'EOF'
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
    function navigate(profile) {
      var target = 'api-' + profile + '.md';
      window.location.href = target;
    }
    document.getElementById('go').addEventListener('click', function(){
      var p = document.getElementById('profile').value;
      navigate(p);
    });
    document.getElementById('full').addEventListener('click', function(){
      window.location.href = 'api.md';
    });
  </script>
</body>
</html>
EOF

cat > profiles.md << 'EOF'
# Select API Profile

<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px">
  <p>Choose a profile to view documentation filtered by <code>x-profiles</code>.</p>
  <select id="profile" style="height:36px;padding:0 8px">
    <option value="public">Public</option>
    <option value="partner">Partner</option>
    <option value="internal">Internal</option>
  </select>
  <button id="go" style="height:36px;padding:0 12px;margin-left:8px">Go</button>
  <button id="full" style="height:36px;padding:0 12px;margin-left:8px">Full API</button>
</div>

<script>
(function(){
  function navigate(profile){ window.location.href = 'api-' + profile + '.md'; }
  document.getElementById('go').addEventListener('click', function(){
    var p = document.getElementById('profile').value; navigate(p);
  });
  document.getElementById('full').addEventListener('click', function(){ window.location.href = 'api.md'; });
})();
</script>
EOF

git add profiles.html profiles.md

# Make Profiles the landing page by redirecting README.md to profiles.md
cat > README.md << 'EOF'
# API Reference

If you are not redirected automatically, use the Profiles link in the left menu.

<script>
  // Redirect to Profiles page inside GitBook
  window.location.href = 'profiles.md';
</script>
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
    git commit -m "ci: set Profiles as landing page"
    git push origin HEAD:docs --force
fi
