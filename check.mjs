// Run with: node website/check.mjs
// Checks that the site is whole: 8 pages, every local link and image resolves, and the path checker follows the app's rules.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pages = readdirSync(root).filter((name) => name.endsWith('.html'));
assert.equal(pages.length, 8, 'the site has 8 pages');

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  assert.equal(html.match(/<h1[\s>]/g)?.length, 1, `${page} has one h1`);
  assert.match(html, /<title>[^<]+<\/title>/, `${page} has a title`);
  for (const [, url] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (/^(https?:|mailto:)/.test(url)) continue;
    assert.ok(existsSync(join(root, url)), `${page} points at ${url}, which is missing`);
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) assert.match(tag, /\balt="/, `${page}: image without alt: ${tag}`);
}

await import('./assets/site.js');
const judge = globalThis.lightlyJudge;
const expected = {
  '~/Documents/taxes-2026.pdf': 'Never.',
  '/Users/sam/Desktop/a.png': 'Never.',
  '~/Library/Application Support/Google/Chrome/Default': 'Never.',
  '/Volumes/Backup/Photos': 'Never.',
  '/System/Library': 'Never.',
  '/Applications/Safari.app': 'Never.',
  '~/Library/Caches/com.spotify.client': 'Yes, when closed.',
  '~/Library/Caches/com.apple.Safari': 'No.',
  '~/Library/Caches/Homebrew/x': 'Weekly.',
  '~/.npm/_cacache/index': 'Weekly.',
  '~/Library/Developer/Xcode/DerivedData/App-abc': 'After 7 idle days.',
  '~/Library/Logs/Zoom/zoom.log': 'After 7 days.',
  '~/Library/Logs/DiagnosticReports/x.ips': 'No.',
  '~/.Trash/old.pdf': 'After 30 days.',
  '~/Library/Application Support/SomeApp': 'Only if the app is gone.',
  '~/code/project': 'No.',
  '   ': 'Type a path.',
};
for (const [path, word] of Object.entries(expected)) assert.equal(judge(path).word, word, path);
console.log(`ok: ${pages.length} pages, ${Object.keys(expected).length} path rules`);
