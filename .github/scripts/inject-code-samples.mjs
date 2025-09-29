import fs from 'fs';
import yaml from 'js-yaml';
import OpenAPISnippet from 'openapi-snippet';

const specPath = './openapi.yaml';
const specText = fs.readFileSync(specPath, 'utf8');
const spec = yaml.load(specText);

const targets = [
  'node_native',
  'java_okhttp',
  'csharp_httpclient'
];

if (!spec.paths || typeof spec.paths !== 'object') {
  console.error('No paths found in openapi.yaml');
  process.exit(0);
}

for (const [path, pathItem] of Object.entries(spec.paths)) {
  if (!pathItem || typeof pathItem !== 'object') continue;
  for (const method of Object.keys(pathItem)) {
    const operation = pathItem[method];
    if (!operation || typeof operation !== 'object') continue;
    try {
      const { snippets } = OpenAPISnippet.getEndpointSnippets(spec, path, method, targets);
      if (snippets && snippets.length) {
        operation['x-codeSamples'] = snippets.map(s => {
          let langTitle = s.title;
          if (langTitle.startsWith('node_')) langTitle = 'Node.js';
          if (langTitle.startsWith('java_')) langTitle = 'Java';
          if (langTitle.startsWith('csharp_')) langTitle = 'C#';
          return {
            lang: langTitle,
            source: s.content
          };
        });
      }
    } catch (e) {
      // Ignore endpoints that cannot be converted
    }
  }
}

fs.writeFileSync(specPath, yaml.dump(spec, { lineWidth: -1 }), 'utf8');
console.log('Injected x-codeSamples into openapi.yaml'); 