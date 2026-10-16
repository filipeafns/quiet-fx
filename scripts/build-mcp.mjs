import { build } from 'esbuild';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve('mcp/quietfx');
const out = resolve(root, 'dist');
mkdirSync(out, { recursive: true });
const bundle = await build({
  entryPoints: [resolve(root, 'web/app.jsx')],
  bundle: true,
  format: 'iife',
  outfile: resolve(out, 'app.js'),
  minify: true,
  metafile: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    '@/lib/audio/catalog': resolve(root, 'vendor/catalog.js'),
    '@/lib/audio/engine': resolve(root, 'vendor/engine.js'),
    '@/lib/audio/color': resolve(root, 'vendor/color.js'),
    '@/lib/orbit-logo': resolve(root, 'vendor/ui/orbit-logo.ts'),
    '@/components/ui/button': resolve(root, 'web/button.jsx'),
  },
  loader: { '.txt': 'text' },
});
const js = readFileSync(resolve(out, 'app.js'), 'utf8').replaceAll('</script', '<\\/script');
const css = readFileSync(resolve(root, 'web/style.css'), 'utf8');
const icon = encodeURIComponent(readFileSync(resolve(root, 'assets/icon.svg'), 'utf8'));

const packages = new Map();
for (const input of Object.keys(bundle.metafile.inputs).filter(path => path.includes('node_modules/'))) {
  let dir = dirname(resolve(input));
  while (!existsSync(resolve(dir, 'package.json')) && dir !== dirname(dir)) dir = dirname(dir);
  let pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
  while (!pkg.name && dir !== dirname(dir)) {
    dir = dirname(dir);
    if (existsSync(resolve(dir, 'package.json')))
      pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
  }
  if (!pkg.name || packages.has(pkg.name)) continue;
  const licenses = readdirSync(dir).filter(file => /^(licen[cs]e|copying|notice)(\.|$)/i.test(file));
  if (!licenses.length) throw new Error(`Review missing bundled license: ${pkg.name}`);
  packages.set(pkg.name, `${pkg.name}@${pkg.version} (${pkg.license})\n${licenses.map(file => readFileSync(resolve(dir, file), 'utf8')).join('\n')}`);
}
const notices = [...packages.values()].join('\n\n--------------------\n\n');
writeFileSync(resolve(out, 'THIRD_PARTY_NOTICES.txt'), notices);
const escapedNotices = notices.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
writeFileSync(resolve(out, 'widget.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Quiet FX · Sound picker</title><link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${icon}"><style>${css}</style></head><body><div id="root"></div><script>${js}</script><template id="quietfx-third-party-notices">${escapedNotices}</template></body></html>`);
await build({
  entryPoints: [resolve(root, 'src/public-server.mjs')],
  outfile: resolve(out, 'server.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  loader: { '.html': 'text' },
});
console.log('Built public MCP function with the original self-contained Quiet FX picker.');
