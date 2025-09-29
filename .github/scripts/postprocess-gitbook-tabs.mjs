import fs from 'fs';

const filePath = './api.md';
if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const specUrlBase = 'https://github.com/dil-d/openapi/blob/main/openapi.yaml';
const redocUrlBase = null; // e.g., 'https://redocly.github.io/redoc/?url=https://raw.githubusercontent.com/dil-d/openapi/main/openapi.yaml'
const specPath = './openapi.yaml';
const specText = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : '';
const specLines = specText ? specText.split(/\r?\n/) : [];

const src = fs.readFileSync(filePath, 'utf8');
const lines = src.split(/\r?\n/);

function isFenceStart(line) { return /^```(\w[\w+#.-]*)?\s*$/.test(line); }
function fenceLang(line) { const m = line.match(/^```(\w[\w+#.-]*)?\s*$/); return m && m[1] ? m[1] : ''; }

function isOperationHeading(line) {
  if (!/^#{2,5}\s+/.test(line)) return false;
  const text = line.replace(/^#{2,5}\s+/, '');
  if (/(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/i.test(text) && /\//.test(text)) return true;
  if (/^\/?[A-Za-z0-9_.:~-]+\//.test(text)) return true;
  if (/^[a-z]+__\S+$/i.test(text)) return true;
  return false;
}

function headingToMethodPath(line) {
  const text = line.replace(/^#{2,5}\s+/, '').trim();
  let m = text.match(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(.+)$/i);
  if (m) return { method: m[1].toLowerCase(), path: m[2].trim() };
  m = text.match(/^([a-z]+)__([\s\S]+)$/i);
  if (m) return { method: m[1].toLowerCase(), path: '/' + m[2].replace(/__/g, '/') };
  return null;
}

function findPathsIndex() {
  for (let i = 0; i < specLines.length; i++) {
    if (/^\s*paths:\s*$/.test(specLines[i])) return i;
  }
  return -1;
}

function leadingSpaces(line) { const m = line.match(/^(\s*)/); return m ? m[1].length : 0; }

function findPathAndMethodIndexes(method, path) {
  const pathsIdx = findPathsIndex();
  if (pathsIdx === -1) return null;

  const wanted = new Set([ `${path}:`, `'${path}':`, `"${path}":` ]);
  let pathIdx = -1;
  let pathIndent = 0;
  for (let i = pathsIdx + 1; i < specLines.length; i++) {
    const line = specLines[i];
    const t = line.trim();
    if (!t) continue;
    if (!/^\s/.test(line) && /:\s*$/.test(line)) break;
    if (wanted.has(t)) { pathIdx = i; pathIndent = leadingSpaces(line); break; }
  }
  if (pathIdx === -1) return null;

  let methodIdx = -1;
  for (let j = pathIdx + 1; j < specLines.length; j++) {
    const line = specLines[j];
    const t = line.trim();
    if (!t) continue;
    const ind = leadingSpaces(line);
    if (ind === pathIndent && /^\//.test(t) && /:\s*$/.test(t)) break;
    if (!/^\s/.test(line) && /:\s*$/.test(line)) break;
    if (new RegExp('^\s*' + method + '\\s*:\\s*(#.*)?$','i').test(line)) { methodIdx = j; break; }
  }

  return { pathIdx, methodIdx };
}

function findOperationId(methodIdx) {
  if (methodIdx < 0) return null;
  const methodIndent = leadingSpaces(specLines[methodIdx]);
  for (let k = methodIdx + 1; k < specLines.length; k++) {
    const line = specLines[k];
    const t = line.trim();
    if (!t) continue;
    const ind = leadingSpaces(line);
    if (ind <= methodIndent && /:\s*$/.test(line)) break;
    const m = t.match(/^operationId:\s*(\S+)/);
    if (m) return m[1];
  }
  return null;
}

function buildSpecUrl(method, path) {
  const idxs = findPathAndMethodIndexes(method, path);
  if (!idxs) return specUrlBase;
  const { pathIdx, methodIdx } = idxs;
  const opId = findOperationId(methodIdx);
  if (redocUrlBase && opId) return `${redocUrlBase}#operation/${opId}`;
  if (methodIdx >= 0) return `${specUrlBase}#L${methodIdx + 1}`;
  return `${specUrlBase}#L${pathIdx + 1}`;
}

let out = [];
let i = 0;
while (i < lines.length) {
  if (isOperationHeading(lines[i])) {
    const mp = headingToMethodPath(lines[i]);
    const linkUrl = mp ? buildSpecUrl(mp.method, mp.path) : specUrlBase;
    out.push(lines[i]);
    const next = lines[i + 1] || '';
    if (!/\[View in OpenAPI source\]/.test(next)) {
      out.push(`[View in OpenAPI source](${linkUrl})`);
      out.push('');
    }
    i++;
    continue;
  }

  if (!isFenceStart(lines[i])) { out.push(lines[i]); i++; continue; }

  const blocks = [];
  let lang = fenceLang(lines[i]);
  i++;
  const code = [];
  while (i < lines.length && lines[i] !== '```') { code.push(lines[i]); i++; }
  if (i < lines.length && lines[i] === '```') i++;
  blocks.push({ lang, code: code.join('\n') });

  while (i < lines.length) {
    const saveI = i;
    while (i < lines.length && lines[i].trim() === '') { i++; }
    if (i < lines.length && isFenceStart(lines[i])) {
      const lang2 = fenceLang(lines[i]);
      i++;
      const code2 = [];
      while (i < lines.length && lines[i] !== '```') { code2.push(lines[i]); i++; }
      if (i < lines.length && lines[i] === '```') i++;
      blocks.push({ lang: lang2, code: code2.join('\n') });
      continue;
    }
    i = saveI; break;
  }

  if (blocks.length >= 2) {
    out.push('{% tabs %}');
    for (const b of blocks) {
      const title = (b.lang || 'Code')
        .replace(/^node$/, 'Node.js')
        .replace(/^javascript$/, 'Node.js')
        .replace(/^csharp$/i, 'C#')
        .replace(/^java$/i, 'Java');
      out.push(`{% tab title="${title}" %}`);
      out.push('```' + (b.lang || ''));
      out.push(b.code);
      out.push('```');
      out.push('{% endtab %}');
    }
    out.push('{% endtabs %}');
  } else {
    out.push('```' + (blocks[0].lang || ''));
    if (blocks[0].code) out.push(blocks[0].code);
    out.push('```');
  }
}

fs.writeFileSync(filePath, out.join('\n'), 'utf8');
console.log('Post-processed api.md: added source links (prefer operationId) and GitBook tabs'); 