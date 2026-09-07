# Deploy Quiet FX

The canonical website is [quietfx.dev](https://quietfx.dev), with the library and motion sandbox at `/studio`.

## Custom domain

Use `quietfx.dev` for the production environment of the `quiet-fx` Vercel project. Configure `www.quietfx.dev` to redirect permanently to the apex. The checked-in redirects also send the former `quiefx.dev`, `www.quiefx.dev` and `quiet-fx.vercel.app` hostnames directly to the new canonical domain, preserving paths and query strings. Keep legacy domains attached to the project with working DNS and HTTPS so those redirects remain reachable.

DNS is managed at GoDaddy. Use Vercel's current recommended records for each hostname, preserve unrelated mail and verification records, and verify DNS plus trusted public HTTPS for the apex and `www` before promoting the migration. Confirm `/` and `/studio` return 200 on the canonical hostname, and check each alias redirects without a loop.

### Verified DNS, September 7, 2026

`quietfx.dev` and `www.quietfx.dev` are attached to the production environment of the `quiet-fx` Vercel project. The apex serves the site, and `www` redirects permanently to the apex with status 308. Vercel manages HTTPS certificates for both hostnames.

GoDaddy retains the existing nameservers, `ns35.domaincontrol.com` and `ns36.domaincontrol.com`. The parking records were replaced with Vercel's recommended values:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | 600 seconds |
| CNAME | `www` | `3da4a081662cf48e.vercel-dns-017.com` | 1 hour |

Both authoritative nameservers and public resolvers at Cloudflare and Google returned the new records. Trusted public HTTPS returned 200 from the apex and 308 from `www`, preserving paths and query strings. Recheck Vercel's current recommendations before future DNS changes. Other DNS records were preserved.

## Vercel

Import this repository into Vercel. The checked-in `vercel.json` supplies the install command, static build command and output directory. Use Node.js 22.13 or newer; CI uses Node.js 24.

The connected project publishes `main` to production. Pull requests receive separate preview deployments. The `deploy/vercel` branch provides a place to review deployment changes without changing the live site; merge only after the preview and CI have been reviewed.

For a local production build:

```sh
npm ci
npm run typecheck
npm test
npm run build:static
```

The exported files are in `dist/client`. The homepage is `index.html`; the studio is `studio.html`. Vercel's `cleanUrls` setting serves `/studio` without an extension. Other static hosts need the equivalent route mapping. The two pages use document navigation so a static host does not need an RSC response adapter.

No application secrets or runtime services are needed. Keep local provider metadata, credentials, `.env` files and generated validation artifacts out of Git. Public indexing was explicitly enabled on September 6, 2026. Preserve the canonical `quietfx.dev` metadata, permissive robots file and sitemap; preview deployment protection remains managed by Vercel.

## Release the library

The website and the installable library share this repository. Consumers install prepared ESM modules and declarations with no runtime dependencies.

1. Update the version in `package.json`, the lockfile root entries and `scripts/build-runtime.mjs`.
2. Run `npm run build:package` and commit the generated `packages/quiet-sounds` files with the source change.
3. Run type checks, numerical audio/sequence validation and the static build. Listen to changed cues on real hardware.
4. Update the homepage and README installation examples to the intended tag.
5. Publish a new immutable tag, then run the documented GitHub install command in an empty project and verify rendering and exports.
6. Run `npm pack`, attach the resulting tarball to a GitHub release and describe the user-visible changes.

Keep the root package free of `workspaces` and lifecycle scripts that cause npm to prepare Git dependencies: `build`, `prepare`, `prepack`, `preinstall`, `install` and `postinstall`. The explicit `build:package`, `build:studio` and `build:static` commands keep consumer installation lightweight. See [npm's Git dependency documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#git-urls-as-dependencies).

Registry publication is separate from GitHub installation and is not configured. Existing tags should never be moved; use a new version for a correction.
