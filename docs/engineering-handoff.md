# Sound-kit builder engineering handoff

## Result and scope

`/create` adds a complete local sound-kit workflow: choose a mood, shuffle a coherent set, lock choices, edit a role, audition realistic interfaces, save/import and export editable source. The catalog grows from 72 to 96 cues. The existing free library, studio, exports and original sound output are preserved. The sandbox ZIP export now uses its selected variant.

This is an unreleased source change. It does not publish a new package/tag, merge production, create accounts, take payments or enforce Pro entitlements. The stable v0.4.1 installation continues to serve its original catalog. New cues use the current exported runtime.

## Setup and commands

Prerequisites: Node.js >=22.13.0, npm and Git. Local verification uses Node 22.22.2; GitHub CI and the existing Vercel project use Node 24. Use the repository root.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4317
# http://localhost:4317/create
npm run typecheck
npm test
npm run build:static
npm run test:discovery
```

Focused checks:

```sh
npm run test:materials
npm run test:kits
npm run test:kit-export
npm run test:install-setup
```

`build:static` regenerates the library and discovery artifacts, then exports the Vinext app to `dist/client`. Commit generated library/public source alongside its inputs. Avoid adding npm prepare/prepack/install hooks: GitHub package consumers should not install the website toolchain.

## Architecture and files

| File                                    | Responsibility                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `app/create/page.tsx`                   | Static route and canonical metadata.                                                                              |
| `components/sound-kit-studio.tsx` / CSS | Kit selection, local saving, role edits, audio ownership, export/import, accessible native dialog and monitor.    |
| `components/kit-examples.tsx` / CSS     | Original simulated workspace, chat and checkout. Own local demo state, delegate sound through semantic roles.     |
| `components/ui/kit-controls.ts`         | App facade over selected free Arc components.                                                                     |
| `components/ui/arc/`                    | Vendored Slider, Segmented Control, motion tokens and MIT notice.                                                 |
| `lib/audio/kits.ts`                     | Versioned kit contract, strict parsing, deterministic generation, retune, lock preservation and resolved patches. |
| `lib/audio/materials.ts`                | Three families × eight roles; independently authored contact/body/tail recipes.                                   |
| `lib/audio/engine.ts`                   | Existing zero-dependency PCM renderer/player plus optional FM-style modulation.                                   |
| `lib/kit-export.ts`                     | Pure package/registry builders and browser download adapters.                                                     |
| `lib/install-setup.ts`                  | Legacy release integration and current-engine export integration for new cues.                                    |
| `scripts/build-runtime.mjs`             | Copies/transpiles engine, materials, catalog, kits, color and sequences, with declarations.                       |

All audio is generated locally. The engine does not depend on Arc, React, Motion, Faust, SuperCollider or an AI service. Those DSP tools were researched in the earlier exploration; they were not integrated. New materials are authored approximations using multiple anchored resonances, contacts, envelopes and optional FM. Old recipes take the same arithmetic path when the optional field is absent.

The existing DialKit dependency remains available for authoring; it was not added to the consumer UI. Free Arc controls provide the kit sliders and example view switcher. `motion@14.3.0` is a website-only devDependency; its related package updates are in the lockfile. No Pro Arc code is copied or exported.

## Contracts and ownership

A `SoundKit` has `type: quiet-fx-kit`, `schemaVersion: 1`, a name, uint32 seed, mood, family/key/mode/voice, global family/key locks and eight semantic slots. Roles are press, release, toggle, confirm, error, notify, transition and complete. Each slot has its cue ID, complete settings and its own lock.

Role identity is independent of cue identity. Multiple roles may deliberately use the same cue. Randomization preserves locked slots in full, including their musical settings; therefore a locked role may differ from the new global palette. An explicit control change retunes unlocked roles even when a global shuffle lock is set. Current valid imported settings are retained.

Imports are bounded by `MAX_KIT_BYTES` and validated against known versions, fields, cues, settings and finite ranges. Unknown fields, prototypes/accessors and invalid data are rejected. No untrusted code or audio is executed. Patches for preview and export come from the same `getKitPatches` function.

Browser storage key: `quiet-fx-kits-v1`, wrapper version 1 with current draft and a shelf of up to 24 kits. Existing legacy `quiet-palette` storage is independent. Storage failure keeps the in-memory workflow usable. Failed restoration preserves the unreadable record instead of silently overwriting it; export a new kit for durable recovery. There is no cloud sync, cross-device account or migration from previous conceptual kit formats.

The UI creates one SoundPlayer owner. Playback requires a user action. Stop/Escape/hide/mute/unmount cancel playback and pending unlock work. Monitor level changes listening gain only; downloaded WAVs retain recipe gain. The kit generator does not autoplay after shuffle. Delayed demo callbacks use the latest sound selection and cancel on hidden page, Escape and unmount.

## Downloads and shadcn

`quiet-fx-kit.zip` includes eight role-named WAVs, editable kit JSON, exact role-keyed patches, a matching standalone engine, player source, README, package metadata, declarations and MIT license. The wrapper exposes `createKitPlayer`, `play`, `stop`, `setVolume`, `setMuted` and `dispose`; it caches renders and bounds overlapping voices. Use one owner per mounted feature; close it on unmount. No external runtime dependency is required.

Unzip into `quiet-fx-kit/`:

```js
import { createKitPlayer } from './quiet-fx-kit/index.js';
const sound = createKitPlayer();
button.addEventListener('click', () => sound.play('press'));
// sound.setMuted(true); sound.dispose();
```

A custom `quiet-kit.json` is a downloadable shadcn registry item containing exactly three files:

| Installed path, relative to the consumer project root | Content                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `lib/quiet-fx/engine.ts`                              | Original standalone renderer and player engine.                          |
| `lib/quiet-fx/kit.ts`                                 | Configured player with the browser's resolved role patches and kit name. |
| `lib/quiet-fx/LICENSE`                                | Complete Quiet FX MIT notice.                                            |

The item has no npm dependencies, website UI, Arc components or binary audio. During the verified install, shadcn 4.18.0 stripped leading TypeScript license comments; the separate plain-text `LICENSE` retained the full notice. Preserve that file when redistributing.

In a consumer project already configured for shadcn, place the downloaded item at its root and run:

```sh
npx shadcn@4.18.0 add ./quiet-kit.json
```

Version 4.18.0 is the tested CLI version; `npx shadcn@latest add ./quiet-kit.json` is the current general installation command. The `~/lib/quiet-fx/` targets refer to the project root, not the user's home directory or `aliases.lib`. Adapt imports to the consumer's alias convention and review before replacing existing files. Only local item installation is implemented and verified; a public hosted namespace and registry authentication are not provided. See [research](SHADCN-RESEARCH.md) and the [export builder](../lib/kit-export.ts).

Browser export fetches public same-origin `/quiet-engine.js`, `/quiet-engine.ts` and `/licenses/QUIET-MIT.txt`. They must be deployed from the same build as the app. Do not cache mismatched releases independently. Export errors are visible and leave the kit intact.

## Services, configuration and secrets

No new environment variables, database, migration, credentials or external API are required for the builder. The website continues using the existing optional PostHog setup documented in [ANALYTICS.md](ANALYTICS.md). Kit names, imported JSON and demo message text are not added to analytics. Existing Vercel and GitHub credentials belong to deployment tooling, not browser bundles; never commit their values.

The existing `quiet-fx` project belongs to `filipeafns-projects`. Repository `vercel.json` uses `npm run build:static`, output `dist/client`, clean URLs and canonical-domain redirects. `/create` maps to `create.html` on static hosting. Keep existing protection on preview deployments. The canonical public site intentionally permits indexing; Vercel controls preview indexing/protection.

## Verification

Numerical audio tests preserve 1,728 legacy PCM comparisons, validate the expanded settings matrix and render representative material combinations. Kit tests cover deterministic output, constrained diversity, locks, import bounds and exact round trips. [Export tests](../scripts/test-kit-export.mjs) verify role mapping, generated runtime behavior, selected-patch parity, the official registry schema and strict compilation of delivered TypeScript.

A separate local consumer was installed using the actual shadcn 4.18.0 CLI and a local JSON item. Its installed player retained the browser export's exact resolved patch metadata and kit name. Rendering those installed patches reproduced all eight downloaded WAVs byte for byte. The installed TypeScript and a typed consumer passed strict `tsc`; the standalone license matched the original, and the CLI added no dependencies to the consumer's existing manifest. This check preserved the browser's resolved numeric literals rather than recomputing patches from the recipe in a different JavaScript engine.

These checks establish export and installation parity. They do not establish perceived loudness, material realism, listening comfort or approval.

Local browser QA also covered mood/material selection, role locks across shuffle, keyboard sliders, save/reload, valid and invalid imports, safe normalization of pasted kit names, demo interactions and actual downloads. A sandbox Deep export retained Deep filenames and settings. The desktop and 390px mobile layouts were reviewed with no horizontal overflow or observed console errors. See the [desktop capture](images/kit-builder-desktop.jpg); hosted-preview evidence belongs in the PR.

Before merging: run the commands above, then exercise all four moods, a locked role across shuffle, editing/import/save/reload, an actual ZIP and registry download, and Workspace/Messages/Checkout. Verify desktop/mobile layout, keyboard slider/segmented navigation, mute, repeated playback, Escape and reduced motion. Decode exported WAVs and confirm their settings match the manifest. Listen on headphones and small speakers before claiming audio approval. See the PR for performed checks and preview evidence.

## Deployment and rollback

1. Create a feature PR plus `deploy/quiet-fx-sound-kits` at the same reviewed commit.
2. Deploy that source to the existing project's preview environment, preserving project protection. Verify `/create`, `/studio`, downloads and the exact source SHA before review.
3. Merge/promote only under release authorization. This work supplies a preview and PR, not an automatic production merge.
4. Roll back via the previous Vercel deployment or revert the PR and redeploy. New local kit data is independent of legacy studio settings; preserve it so users can recover after a forward fix. No server migration needs reversing.
5. A later library release needs an explicit new version/tag, regenerated packages and a clean consumer-install test per [DEPLOYMENT.md](DEPLOYMENT.md). Do not move v0.4.1.

## Deliberate limits and Pro path

- **Local storage only:** saved kits do not follow users to another browser. JSON/ZIP export is the current portable contract. Cloud sync requires an authenticated storage service and conflict/version handling.
- **Simulated examples:** chat replies, task lists and checkout are local interaction studies. No messages are sent, orders placed or payments taken. Real integrations belong to the consumer app.
- **No Pro checkout or entitlements:** all 96 cues and the builder are free. A future Pro collection can use separate pack IDs/metadata, additional authored materials and team workflows. Paid/private delivery requires server-side identity, entitlement checks, billing webhooks and protected asset/registry access. Client-only locks are not security. No owner, price or provider has been selected.
- **No new immutable release:** new materials and kit APIs are in this source/preview and self-contained downloads, not the stable v0.4.1 package.
- **Listening still required:** numerical safety/determinism and browser interaction are separate from sound-design approval and physical-device latency.

Future paid packs must be additive and preserve the existing MIT catalog. Do not mark currently free sounds as unavailable to create a Pro tier.
