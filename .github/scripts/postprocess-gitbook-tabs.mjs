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

function doubleCrLfToSingle() {}

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

function trimKey(line) {
  return line.trim().replace(/^['"]|['"]:$/g, '').replace(/['"]:\s*$/, '');
}

function findOperationLine(method, path) {
  if (!specLines.length || !method || !path) return null;
  const pathsIdx = findPathsIndex();
  if (pathsIdx === -1) return null;

  const wantedVariants = new Set([
    `${path}:`, `'${path}':`, `"${path}":`
  ])

  let pathLineIdx = -1;
  for (let i = pathsIdx + 1; i < specLines.length; i++) {
    const t = specLines[i].trim();
    if (!t) continue;
    // If we reached a new top-level key (no indent), stop
    if (!/^\s/.test(specLines[i]) && /:\s*$/.test(specLines[i])) break;
    if (wantedVariants.has(t)) { pathLineIdx = i; break; }
  }
  if (pathLineIdx === -1) return null;

  // Now find the method line directly below
  const methodWanted = new Set([
    `${method}:`, `${method.toLowerCase()}:`, `${method.toUpperCase()}:`
  ]);
  for (let j = pathLineIdx + 1; j < specLines.length; j++) {
    const t = specLines[j].trim();
    if (!t) continue;
    // Stop when we hit a sibling path or leave the paths block
    if (/^\//.test(t) && /:\s*$/.test(t)) break;
    if (!/^\s/.test(specLines[j]) && /:\s*$/.test(specLines[j])) break;
    if (methodWanted.has(t)) return j + 1; // 1-indexed
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