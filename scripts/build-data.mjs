// Pulls every product's GitHub releases and writes site/data/releases.json for the release page.
// Usage: node scripts/build-data.mjs   (GITHUB_TOKEN optional; it only raises the API rate limit)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(root, 'products.json'), 'utf8'));
const token = process.env.GITHUB_TOKEN;

async function fetchReleases(repo) {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'alayagear-releases',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`${repo}: GitHub API ${res.status} ${await res.text()}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

// notes/<product id>/<tag>.md replaces a release's notes on the page, e.g. a translation of notes
// published before the product wrote them in English. The GitHub release itself is left as it is.
async function notesFor(release, product) {
  const override = join(root, 'notes', product.id, `${release.tag_name}.md`);
  const body = existsSync(override) ? await readFile(override, 'utf8') : release.body;
  return cleanNotes(body, product);
}

function cleanNotes(body, product) {
  let notes = (body || '').replace(/\r\n/g, '\n');
  for (const re of product.notesStrip) notes = notes.replace(new RegExp(re), '');
  notes = notes.trim();
  if (product.boilerplate.some((re) => new RegExp(re).test(notes))) return '';
  return notes;
}

const products = [];
for (const product of config.products) {
  const rules = product.assets.map((a) => ({ ...a, re: new RegExp(a.pattern) }));
  const published = (await fetchReleases(product.repo)).filter((r) => !r.draft && !product.skipTags.includes(r.tag_name));
  const releases = (await Promise.all(published.map(async (r) => ({
      tag: r.tag_name,
      version: r.tag_name.replace(/^v/, ''),
      publishedAt: r.published_at,
      prerelease: r.prerelease,
      url: r.html_url,
      notes: await notesFor(r, product),
      // Only user-facing installers; updater bundles, .sig files and latest.json are left out.
      assets: r.assets.flatMap((a) => {
        const rule = rules.find((x) => x.re.test(a.name));
        if (!rule) return [];
        return [{ name: a.name, os: rule.os, label: rule.label, format: rule.format, primary: !!rule.primary, size: a.size, url: a.browser_download_url }];
      }),
    }))))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const { assets, notesStrip, boilerplate, skipTags, ...meta } = product;
  products.push({ ...meta, releases });
  console.log(`${product.name}: ${releases.length} releases, latest ${releases.find((r) => r.assets.length)?.tag ?? 'none'}`);
}

const outFile = join(root, 'site', 'data', 'releases.json');
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify({ title: config.title, org: config.org, generatedAt: new Date().toISOString(), products }, null, 2) + '\n');
