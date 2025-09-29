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
    path = '/' + raw.replace(/__/g, '/');
    return { method, path };
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`);
}

function leadingSpaces(line) {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function findPathsSectionStart() {
  for (let i = 0; i < specLines.length; i++) {
    if (/^\s*paths:\s*$/.test(specLines[i])) return { idx: i, indent: leadingSpaces(specLines[i]) };
  }
  return null;
}

function findOperationLine(method, path) {
  if (!specLines.length || !method || !path) return null;
  const pathsSection = findPathsSectionStart();
  if (!pathsSection) return null;
  const { idx: pathsIdx, indent: pathsIndent } = pathsSection;

  // Find the specific path key under paths:
  const pathKeyPattern = new RegExp('^(\\s*)(["\']?' + escapeRegex(path) + '["\']?):\\s*$');
  let pathLineIdx = -1;
  let pathIndent = 0;
  for (let i = pathsIdx + 1; i < specLines.length; i++) {
    const line = specLines[i];
    const ind = leadingSpaces(line);
    // Stop if we return to same or less indent than paths (end of paths section)
    if (ind <= pathsIndent && /:\s*$/.test(line)) break;
    const m = line.match(pathKeyPattern);
    if (m) {
      pathLineIdx = i;
      pathIndent = m[1].length; // indent of the path key
      break;
    }
  }
  if (pathLineIdx === -1) return null;

  // Now scan for method under this path, must be more indented than pathIndent
  const methodPattern = new RegExp('^(\\s*)' + escapeRegex(method) + '\\s*:\\s*$','i');
  for (let j = pathLineIdx + 1; j < specLines.length; j++) {
    const line = specLines[j];
    const ind = leadingSpaces(line);
    // If indentation is <= pathIndent and looks like a new key, we've left this path block
    if (ind <= pathIndent && /:\s*$/.test(line)) break;
    const mm = line.match(methodPattern);
    if (mm && mm[1].length > pathIndent) {
      return j + 1; // 1-indexed for GitHub anchors
    }
  }
  // Fallback to the path key line if method not found
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