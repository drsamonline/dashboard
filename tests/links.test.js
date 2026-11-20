'use strict';
/**
 * Link integrity test for the published pages.
 *
 * Twice now a page was deleted by the 2026-11-05 page audit and something kept
 * linking it: first the service worker shell (a 404 in cache.addAll() stops the
 * whole worker from installing), now the console's own repo rows, which pointed
 * every click at repo.html?name=… and answered 404.
 *
 * PAGES.json is the authority on what the site publishes. A page listed there as
 * `deleted` must not be linked from anywhere, and every relative link must point
 * at a file that actually exists under the Pages source directory.
 *
 * The hrefs are read out of the raw file, so links built inside inline scripts
 * (`'<a href="repo.html?name='`) are covered too - those are the ones that broke.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = JSON.parse(fs.readFileSync(path.join(root, 'PAGES.json'), 'utf8'));
const sourceDir = pages.app ? path.dirname(path.join(root, pages.app)) : path.join(root, 'docs', 'play');
const deleted = new Set((pages.deleted || []).map((d) => d.path));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  cond ? (pass++, console.log('PASS  ' + name))
       : (fail++, console.log('FAIL  ' + name + (extra ? '\n        ' + extra : '')));
};

function htmlFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlFiles(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// href="…" and src="…", including the ones written inside inline script strings.
function targets(html) {
  const out = [];
  const re = /\b(?:href|src)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

const files = htmlFiles(sourceDir);
ok('the Pages source directory has at least one page', files.length > 0);

for (const file of files) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  const missing = [];
  const linksDeleted = [];

  for (const raw of targets(html)) {
    // Skip anything that is not a plain relative path: absolute URLs, anchors,
    // protocol links, and hrefs assembled by concatenation inside a script.
    if (!raw || raw[0] === '#' || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    // A link built inside a script is a literal prefix plus concatenation:
    //   href="repo.html?name='+encodeURIComponent(r.name)+'"
    // The prefix is what a browser resolves, so check the prefix. This is the
    // shape that broke, so it must not be skipped.
    const clean = raw.split(/[?#']/)[0].split('+')[0];
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(file), clean);
    const fromRoot = path.relative(root, resolved);
    const fromSource = path.relative(sourceDir, resolved);
    if (deleted.has(fromRoot) || deleted.has(fromSource)) { linksDeleted.push(raw); continue; }
    if (!fs.existsSync(resolved)) missing.push(raw);
  }

  ok(rel + ': every relative link resolves to a file that exists',
     missing.length === 0, missing.join(', '));
  ok(rel + ': nothing links a page PAGES.json marks as deleted',
     linksDeleted.length === 0, linksDeleted.join(', '));
}

// The console is the entry point; if it stops existing every other check is moot.
ok('PAGES.json names the console as the app', /docs\/play\/index\.html$/.test(pages.app || ''));
ok('the console page exists', fs.existsSync(path.join(root, pages.app)));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
