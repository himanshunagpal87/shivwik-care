#!/usr/bin/env node
// Tells the IndexNow search engines (Bing, Yandex, Seznam, Naver) which pages changed, so they refetch within minutes.
// Google does not use IndexNow; it reads sitemap.xml.
//   node tools/indexnow.mjs CHANGED_FILES.txt [--dry-run]     one repo path per line, e.g. articles/<slug>/index.html
import { readFileSync, readdirSync } from 'node:fs';

const SITE = 'https://www.shivwikholisticcare.com';
const keyFile = readdirSync(new URL('..', import.meta.url)).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
const toUrl = (f) => {
  if (f === 'index.html') return `${SITE}/`;
  if (/^[a-z0-9-]+\.html$/.test(f)) return ['404.html', 'article.html'].includes(f) ? null : `${SITE}/${f}`;
  const m = f.match(/^([a-z0-9/-]+)\/index\.html$/);
  return m ? `${SITE}/${m[1]}/` : null;
};
const urlList = [...new Set(readFileSync(process.argv[2], 'utf8').split(/\r?\n/).map((l) => toUrl(l.trim())).filter(Boolean))];
const body = { host: new URL(SITE).host, key: keyFile.slice(0, 32), keyLocation: `${SITE}/${keyFile}`, urlList };
if (!urlList.length) console.log('no page changed; nothing to submit');
else if (process.argv.includes('--dry-run')) console.log(JSON.stringify(body, null, 1));
else {
  // A failed ping must never fail the build: the sitemap still carries the change.
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
    console.log(`IndexNow answered ${res.status} for ${urlList.length} page(s)`);
  } catch (err) {
    console.log(`IndexNow could not be reached: ${err.message}`);
  }
}
