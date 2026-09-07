import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.QUIET_STATIC_DIR || 'dist/client');
const read = (file) => readFileSync(resolve(output, file), 'utf8');
const attrs = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
const descriptions = [];
for (const [file, path] of [
  ['index.html', '/'],
  ['studio.html', '/studio'],
]) {
  const html = read(file);
  const titlesOnPage = [...html.matchAll(/<title>(.*?)<\/title>/gs)].map(
    (m) => m[1],
  );
  assert.equal(titlesOnPage.length, 1, `${file}: exactly one title`);
  assert.equal(titlesOnPage[0], 'Quiet FX');
  const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0]));
  assert.deepEqual(
    links.filter((a) => a.rel === 'canonical').map((a) => new URL(a.href).href),
    [`https://quietfx.dev${path}`],
  );
  assert.equal(meta.filter((a) => a.name === 'description').length, 1);
  const description = meta.find((a) => a.name === 'description')?.content;
  assert.ok(description.length > 80);
  descriptions.push(description);
  assert.match(
    meta.find((a) => a.property === 'og:title')?.content,
    /UI Sound/,
  );
  assert.ok(
    meta.some(
      (a) =>
        a.name === 'robots' &&
        /index/.test(a.content) &&
        !/noindex|nofollow/.test(a.content),
    ),
  );
  assert.equal(
    new URL(meta.find((a) => a.property === 'og:url')?.content).href,
    `https://quietfx.dev${path}`,
  );
  assert.equal(
    meta.find((a) => a.name === 'twitter:card')?.content,
    'summary_large_image',
  );
  assert.ok(
    meta.some(
      (a) =>
        a.property === 'og:image' &&
        a.content === 'https://quietfx.dev/og-image.png',
    ),
  );
  assert.ok(
    links.some((a) => a.rel === 'describedby' && a.href === '/llms.txt'),
  );
  const json = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs,
    ),
  ];
  assert.equal(json.length, 1);
  const graph = JSON.parse(json[0][1])['@graph'];
  assert.ok(
    graph.some(
      (n) => n['@type'] === 'WebSite' && n.url === 'https://quietfx.dev/',
    ),
  );
  assert.ok(
    graph.some(
      (n) =>
        n['@type'] === 'SoftwareSourceCode' &&
        n.codeRepository === 'https://github.com/filipeafns/quiet-fx',
    ),
  );
  assert.ok(
    graph.some(
      (n) =>
        n['@type'] === 'WebApplication' &&
        n.url === 'https://quietfx.dev/studio',
    ),
  );
}
assert.equal(
  new Set(descriptions).size,
  2,
  'Routes need distinct descriptions',
);
const robots = read('robots.txt');
assert.doesNotMatch(robots, /Disallow:\s*\//i);
assert.match(robots, /Sitemap: https:\/\/quietfx.dev\/sitemap.xml/);
for (const bot of [
  '*',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
])
  assert.ok(robots.includes(`User-agent: ${bot}\nAllow: /`));
const sitemap = [...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (m) => m[1],
);
assert.deepEqual(sitemap, [
  'https://quietfx.dev/',
  'https://quietfx.dev/studio',
]);
assert.equal(read('llm.txt'), read('llms.txt'));
for (const file of ['llms.txt', 'llms-full.txt', 'docs/index.md'])
  assert.match(read(file), /npm install github:filipeafns\/quiet-fx#v0\.4\.1/);
const data = JSON.parse(read('sounds.json'));
assert.equal(data.count, data.sounds.length);
assert.equal(data.variationCount, data.count * data.options.variants.length);
assert.equal(new Set(data.sounds.map((c) => c.id)).size, data.count);
assert.equal((read('docs/sounds.md').match(/^## /gm) || []).length, data.count);
for (const cue of data.sounds)
  assert.ok(read('docs/sounds.md').includes(`ID: \`${cue.id}\``));
const image = readFileSync(resolve(output, 'og-image.png'));
assert.equal(image.toString('hex', 0, 8), '89504e470d0a1a0a');
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const aliases = [
  'www.quietfx.dev',
  'quiefx.dev',
  'www.quiefx.dev',
  'quiet-fx.vercel.app',
];
for (const hostname of aliases) {
  const redirects = config.redirects.filter((rule) =>
    rule.has?.some(
      (condition) => condition.type === 'host' && condition.value === hostname,
    ),
  );
  assert.equal(
    redirects.length,
    1,
    `${hostname}: exactly one canonical redirect`,
  );
  assert.equal(
    redirects[0].source,
    '/:path*',
    'Alias redirects preserve nested paths',
  );
  assert.equal(redirects[0].destination, 'https://quietfx.dev/:path*');
  assert.equal(redirects[0].permanent, true);
}
assert.ok(
  config.redirects.every((rule) =>
    rule.has?.some(
      (condition) =>
        condition.type === 'host' && aliases.includes(condition.value),
    ),
  ),
  'Canonical redirects must only match known aliases, never the destination hostname',
);
for (const file of [
  'index.html',
  'studio.html',
  'robots.txt',
  'sitemap.xml',
  'llm.txt',
  'llms.txt',
  'llms-full.txt',
  'docs/index.md',
  'docs/sounds.md',
  'sounds.json',
  'og-image.svg',
]) {
  assert.doesNotMatch(
    read(file),
    /quiefx\.dev/,
    `${file}: no former canonical domain`,
  );
}
assert.ok(
  !config.headers.some((rule) =>
    rule.headers.some(
      (h) => /x-robots-tag/i.test(h.key) && /noindex/i.test(h.value),
    ),
  ),
);
console.log(
  'Discovery checks passed: unique route metadata, canonical URLs, JSON-LD, crawl rules, sitemap, LLM docs, catalog and social image.',
);
