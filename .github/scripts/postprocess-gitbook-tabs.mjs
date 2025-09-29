import fs from 'fs';

const filePath = './api.md';
if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const specUrl = 'https://github.com/dil-d/openapi/blob/main/openapi.yaml';

const src = fs.readFileSync(filePath, 'utf8');
const lines = src.split(/\r?\n/);

function isFenceStart(line) {
  return /^```(\w[\w+#.-]*)?\s*$/.test(line);
}

function fenceLang(line) {
  const m = line.match(/^```(\w[\w+#.-]*)?\s*$/);
  return m && m[1] ? m[1] : '';
}

function isHttpHeading(line) {
  return /^###\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/.test(line);
}

let out = [];
let i = 0;
while (i < lines.length) {
  // Inject source link under operation headings
  if (isHttpHeading(lines[i])) {
    out.push(lines[i]);
    const next = lines[i + 1] || '';
    if (!/\[View in OpenAPI source\]/.test(next)) {
      out.push(`[View in OpenAPI source](${specUrl})`);
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
console.log('Post-processed api.md: added source links and GitBook tabs'); 