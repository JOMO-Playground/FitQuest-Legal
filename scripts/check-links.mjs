import { existsSync, readFileSync, readdirSync } from 'node:fs';

for (const file of readdirSync('.').filter((name) => name.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
    const href = match[1];
    if (href.includes(':') || href.startsWith('mailto:')) continue;
    if (!existsSync(href)) throw new Error(`${file} links to missing ${href}`);
  }
}

console.log('Legal-site local links passed.');
