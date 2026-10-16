# Public Quiet FX MCP

The production endpoint is intended to be `https://quietfx.dev/mcp`. It exposes only the public MIT catalog, five read-only tools and the original interactive picker. It stores no accounts or selections, imports no remote sounds, and writes no project files. The picker synthesizes previews and selected WAV ZIPs locally from the same pinned recipes used by the tool manifests.

`src/catalog.mjs`, `src/tools.mjs`, `vendor/`, and the picker originate from the existing tested QuietFX sandbox. `PROVENANCE.md` records the source commit and licenses. The public wrapper is separate; no private Sites deployment or access policy is changed.

Run `npm run build:mcp`, `npm run test:mcp` and `npm run lint:mcp`. The regular static build also builds the MCP function. `api/mcp.js` exports the embedded Node handler; Vercel maps `/mcp` to it while continuing to serve `dist/client` for the website. No application credentials or runtime services are required. The immutable vendor snapshots are checked with their original TypeScript configuration and byte hashes; the application linter checks the public adapter, builder and picker wrapper.

Each tool advertises `noauth` at the top level and in `_meta.securitySchemes`. The adapter adds the top-level field to `tools/list` because the pinned SDK drops this extension during registration. The picker resource uses the unique `https://quietfx.dev` UI origin and an empty external-domain CSP.

The MCP server is stateless and accepts POST requests up to 64 KB. GET and DELETE return 405. These choices keep each request independent on serverless functions. Local protocol checks do not establish successful portal verification, real ChatGPT behavior or production availability; those must be checked after deployment. The domain-verification challenge token is not included here.
