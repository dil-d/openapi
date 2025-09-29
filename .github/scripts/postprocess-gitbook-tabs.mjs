import fs from 'fs';

const filePath = './api.md';
if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const specUrlBase = 'https://github.com/dil-d/openapi/blob/main/openapi.yaml';
const specPath = './openapi.yaml';
const specText = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : '';
const specLines = specText ? specText.split(/\r?\n/) : [];

const src = fs.readFileSync(filePath, 'utf8');
doubleCrLfToSingle();
const lines = src.split(/\r?\n/);

function doubleCrLfToSingle() {
  // normalize CRLF bursts that can interfere with matching
}

function isFenceStart(line) {
  return /^```(\w[\w+#.-]*)?\s*$/.test(line);
}

function fenceLang(line) {
  const m = line.match(/^```(\w[\w+#.-]*)?\s*$/);
  return m && m[1] ? m[1] : '';
}

function isOperationHeading(line) {
  if (!/^#{2,5}\s+/.test(line)) return false;
  const text = line.replace(/^#{2,5}\s+/, '');
  if (/(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/i.test(text) && /\//.test(text)) return true;
  if (/^\/?[A-Za-z0-9_.:~-]+\//.test(text)) return true;
  if (/^[a-z]+__\S+$/i.test(text)) return true; // e.g., get__users, post__orders
  return false;
}

function headingToMethodPath(line) {
  const text = line.replace(/^#{2,5}\s+/, '').trim();
  let method = '';
  let path = '';
  let m = text.match(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(.+)$/i);
  if (m) {
    method = m[1].toLowerCase();
    path = m[2].trim();
    return { method, path };
  }
  m = text.match(/^([a-z]+)__([\s\S]+)$/i);
  if (m) {
    method = m[1].toLowerCase();
    const raw = m[2];
    // Widdershins encodes path separators as double underscore
    path = '/' + raw.replace(/__/g, '/');
    return { method, path };
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`);
}

function findOperationLine(method, path) {
  if (!specLines.length || !method || !path) return null;
  // Find the path key line
  const pathKeyPattern = new RegExp('^\\s*[\"\']?' + escapeRegex(path) + '[\"\']?\\s*:\\s*$');
  let pathLineIdx = -1;
  for (let i = 0; i < specLines.length; i++) {
    if (pathKeyPattern.test(specLines[i])) { pathLineIdx = i; break; }
  }
  if (pathLineIdx === -1) return null;
  // From path line, scan forward for method:
  const methodPattern = new RegExp('^\\s*' + escapeRegex(method) + '\\s*:\\s*$','i');
  for (let j = pathLineIdx + 1; j < specLines.length; j++) {
    const line = specLines[j];
    if (/^\s*\w/.test(line) && !/^\s/.test(line)) {
      // Likely next top-level section
      break;
    }
    if (methodPattern.test(line)) {
      return j + 1; // GitHub is 1-indexed
    }
  }
  return pathLineIdx + 1;
}

function buildSpecUrl(method, path) {
  const line = findOperationLine(method, path);
  if (line) return `${specUrlBase}#L${line}`;
  return specUrlBase;
}

let out = [];
let i = 0;
while (i < lines.length) {
  // Inject source link under operation headings
  if (isOperationHeading(lines[i])) {
    const methodPath = headingToMethodPath(lines[i]);
    const linkUrl = methodPath ? buildSpecUrl(methodPath.method, methodPath.path) : specUrlBase;
    out.push(lines[i]);
    const next = lines[i + 1] || '';
    if (!/\[View in OpenAPI source\]/.test(next)) {
      out.push(`[View in OpenAPI source](${linkUrl})`);
      out.push('');
    }
    i++;
    continue;
  }

  // Tabs conversion for consecutive fences
  if (!isFenceStart(lines[i])) {
    out.push(lines[i]);
    i++;
    continue;
  }

  const blocks = [];
  let lang = fenceLang(lines[i]);
  i++;
  const code = [];
  while (i < lines.length && lines[i] !== '```') {
    code.push(lines[i]);
    i++;
  }
  if (i < lines.length && lines[i] === '```') i++;
  blocks.push({ lang, code: code.join('\n') });

  while (i < lines.length) {
    const saveI = i;
    while (i < lines.length && lines[i].trim() === '') { i++; }
    if (i < lines.length && isFenceStart(lines[i])) {
      const lang2 = fenceLang(lines[i]);
      i++;
      const code2 = [];
      while (i < lines.length && lines[i] !== '```') {
        code2.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i] === '```') i++;
      blocks.push({ lang: lang2, code: code2.join('\n') });
      continue;
    }
    i = saveI;
    break;
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
console.log('Post-processed api.md: added source links with anchors and GitBook tabs'); 