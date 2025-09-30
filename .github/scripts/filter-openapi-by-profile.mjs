import fs from 'fs';
import yaml from 'js-yaml';

if (process.argv.length < 4) {
  console.error('Usage: node filter-openapi-by-profile.mjs <profile> <outPath>');
  process.exit(1);
}

const [,, rawProfile, outPath] = process.argv;
const profile = String(rawProfile).toLowerCase().trim();
const specPath = './openapi.yaml';
const text = fs.readFileSync(specPath, 'utf8');
const spec = yaml.load(text);

// If profile is "public", do not filter — keep everything
if (profile === 'public') {
  fs.writeFileSync(outPath, yaml.dump(spec, { lineWidth: -1 }), 'utf8');
  console.log(`Wrote unfiltered spec for profile '${profile}' to ${outPath}`);
  process.exit(0);
}

function includesProfile(value) {
  if (!value) return false;
  if (Array.isArray(value)) return value.map(v => String(v).toLowerCase().trim()).includes(profile);
  if (typeof value === 'string') return value.split(',').map(s => s.toLowerCase().trim()).includes(profile);
  return false;
}

const filtered = JSON.parse(JSON.stringify(spec));
filtered.paths = {};

for (const [p, pathItem] of Object.entries(spec.paths || {})) {
  const methods = ['get','post','put','delete','patch','options','head','trace'];
  const newPathItem = {};
  for (const m of methods) {
    const op = pathItem[m];
    if (!op) continue;
    const opProfiles = op['x-profiles'];
    // For non-public profiles: keep only operations explicitly tagged with the selected profile
    if (includesProfile(opProfiles)) {
      newPathItem[m] = op;
    }
  }
  if (Object.keys(newPathItem).length > 0) {
    filtered.paths[p] = newPathItem;
  }
}

fs.writeFileSync(outPath, yaml.dump(filtered, { lineWidth: -1 }), 'utf8');
console.log(`Wrote filtered spec for profile '${profile}' to ${outPath}`); 