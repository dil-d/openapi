import fs from 'fs';
import yaml from 'js-yaml';

if (process.argv.length < 4) {
  console.error('Usage: node filter-openapi-by-profile.mjs <profile> <outPath>');
  process.exit(1);
}

const [,, profile, outPath] = process.argv;
const specPath = './openapi.yaml';
const text = fs.readFileSync(specPath, 'utf8');
const spec = yaml.load(text);

function includesProfile(value) {
  if (!value) return false;
  if (Array.isArray(value)) return value.includes(profile);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).includes(profile);
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
    if (!opProfiles || includesProfile(opProfiles)) {
      newPathItem[m] = op;
    }
  }
  if (Object.keys(newPathItem).length > 0) {
    filtered.paths[p] = newPathItem;
  }
}

fs.writeFileSync(outPath, yaml.dump(filtered, { lineWidth: -1 }), 'utf8');
console.log(`Wrote filtered spec for profile '${profile}' to ${outPath}`); 