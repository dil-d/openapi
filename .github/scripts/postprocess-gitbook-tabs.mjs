import fs from 'fs';

const filePath = './api.md';
if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const src = fs.readFileSync(filePath, 'utf8');
const lines = src.split(/\r?\n/);

function isHeading(line) {
  return /^#{1,6} /.test(line);
}

function isFenceStart(line) {
  return /^```(\w[\w+#.-]*)\s*$/.test(line);
}

function fenceLang(line) {
  const m = line.match(/^```(\w[\w+#.-]*)\s*$/);
  return m ? m[1] : '';
}

let out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  // Detect the "### Code samples" section
  if (/^### Code samples\s*$/.test(line)) {
    const section = [line];
    i++;
    // Capture lines until next heading at same or higher level
    while (i < lines.length && !/^(### |## |# )/.test(lines[i])) {
      section.push(lines[i]);
      i++;
    }

    // Within the section, detect consecutive fenced code blocks and transform to tabs
    let j = 1; // skip the heading itself inside section
    const tabs = [];
    while (j < section.length) {
      // skip blank lines
      while (j < section.length && section[j].trim() === '') j++;
      if (j >= section.length) break;

      if (isFenceStart(section[j])) {
        const lang = fenceLang(section[j]);
        j++;
        const code = [];
        while (j < section.length && section[j] !== '```') {
          code.push(section[j]);
          j++;
        }
        // consume closing fence if present
        if (j < section.length && section[j] === '```') j++;
        tabs.push({ lang, code: code.join('\n') });
        // continue to collect additional fenced blocks
        continue;
      }
      // If it's not a fence, just push through and stop tabbing
      tabs.length = 0;
      break;
    }

    if (tabs.length >= 2) {
      // Build GitBook tabs block
      out.push('{% tabs %}');
      for (const tab of tabs) {
        // Normalize language title for tab
        const title = (tab.lang || 'Code').replace(/^node$/, 'Node.js').replace(/^csharp$/i, 'C#').replace(/^java$/i, 'Java');
        out.push(`{% tab title="${title}" %}`);
        out.push('```' + (tab.lang || '') );
        out.push(tab.code);
        out.push('```');
        out.push('{% endtab %}');
      }
      out.push('{% endtabs %}');
    } else {
      // Fallback: write original section unchanged
      out.push(...section);
    }
    continue;
  }

  out.push(line);
  i++;
}

fs.writeFileSync(filePath, out.join('\n'), 'utf8');
console.log('Post-processed api.md to add GitBook tabs for code samples'); 