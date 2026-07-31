import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
const missing = [];

for (const file of htmlFiles) {
  const source = read(file);
  for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1].split('#')[0].split('?')[0];
    if (
      !target
      || /^(?:https?:|mailto:|fitquest:|data:)/.test(target)
      || target === 'runtime-config.js'
    ) continue;
    if (!fs.existsSync(path.resolve(root, target))) missing.push(`${file} -> ${target}`);
  }
  if (source.includes('class="site-header"')) {
    assert.match(source, /js\/site\.js/, `${file} must load the shared navigation owner`);
  }
}

assert.deepEqual(missing, [], `Missing local references:\n${missing.join('\n')}`);

const index = read('index.html');
const account = read('account.html');
const accountJs = read('js/account.js');
const releases = read('releases.html');
const css = read('css/release.css');
const workflow = read('.github/workflows/deploy-pages.yml');
const runtimeConfig = read('runtime-config.js');
const privacy = read('privacy.html');
const sitemap = read('sitemap.xml');

assert.match(index, /Open My Progress/);
assert.match(index, /One account, continuous evidence/);
assert.match(index, /2\.2\.0 is in internal testing/);
assert.match(account, /Private account portal/);
assert.match(account, /id="portal"/);
assert.match(account, /supabase-js@2\.101\.1/);
assert.match(account, /id="google-sign-in"/);
assert.match(account, /google-signin-dark\.png/);
assert.match(accountJs, /parsed\.user_id !== user\.id/);
assert.match(accountJs, /parsed\.version !== 22/);
assert.match(accountJs, /The website is read-only/);
assert.match(accountJs, /client\.auth\.signUp/);
assert.match(accountJs, /client\.auth\.signInWithOAuth/);
assert.match(accountJs, /provider: 'google'/);
assert.match(accountJs, /client\.auth\.resetPasswordForEmail/);
assert.match(releases, /Version 2\.2\.0 · Android code 7/);
assert.match(css, /@media \(max-width: 860px\)/);
assert.match(css, /\.site-header\.menu-open nav/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(css, /@import\s+url/);
assert.match(workflow, /secrets\.FITQUEST_SUPABASE_ANON_KEY/);
assert.match(workflow, /vars\.FITQUEST_SUPABASE_URL/);
assert.match(workflow, /actions\/deploy-pages@v4/);
assert.match(runtimeConfig, /sb_publishable_/);
assert.doesNotMatch(runtimeConfig, /sb_secret_|service_role/i);
assert.match(privacy, /website account portal stores its session in that browser/);
assert.match(privacy, /Sign in with Google/);
assert.match(privacy, /does not request access to Gmail, contacts, Drive/);
assert.match(privacy, /read-only summary/);
assert.match(sitemap, /releases\.html/);
assert.match(sitemap, /account\.html/);

const trackedSource = [
  ...htmlFiles.map(read),
  read('js/site.js'),
  accountJs,
  workflow,
  read('runtime-config.example.js'),
].join('\n');
assert.doesNotMatch(trackedSource, /eyJ[A-Za-z0-9_-]{80,}\./, 'Supabase JWT-like key must not be committed');
assert.doesNotMatch(trackedSource, /service_role/i, 'service-role credentials must never enter the website');

console.log('FitQuest public website checks passed:', {
  pages: htmlFiles.length,
  localReferences: 'resolved',
  responsiveNavigation: true,
  accountPortal: true,
  releaseCenter: true,
  browserSafeRuntimeConfig: true,
});
