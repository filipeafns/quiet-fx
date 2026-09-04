# Deploy Quiet FX

The public website is [quiet-fx.vercel.app](https://quiet-fx.vercel.app), with the library and motion sandbox at `/studio`.

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

No application secrets or runtime services are needed. Keep local provider metadata, credentials, `.env` files and generated validation artifacts out of Git. The existing noindex metadata and `X-Robots-Tag` header are intentional; change them only when search indexing is approved.

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
