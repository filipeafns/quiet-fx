# Source and license review

Reviewed 2026-10-01. Canonical repository: https://github.com/filipeafns/quiet-fx. Canonical site: https://quietfx.dev. Source commit: `94cb0a0547aa03db30704a9d3a16886a044a47eb`.

The repository LICENSE is MIT, copyright 2026 Quiet Studio contributors. Its THIRD_PARTY_NOTICES.md explicitly covers the original sound recipes, synthesis engine and studio code and states there are no third-party audio recordings. The 72 cues are procedural recipes; this prototype imports those recipes and synthesizes PCM/WAV using the original engine. No additional sampled audio or external sound library is included. No unresolved third-party audio provenance was found in this selected source.

The original LICENSE is included in the plugin and every user sound ZIP. Browser dependency notices are generated from the packages actually bundled by esbuild in `assets/THIRD_PARTY_NOTICES.txt`. Dependencies are pinned in package-lock.json. No MP3 encoder, Jost font, or production PostHog code is bundled. Existing sound-field CSS was copied from app/globals.css; all other wrapper UI is new.

The following files are byte-for-byte copies of the recorded source (verified when writing this report). The button adapter supplies a native button in place of the site design-system dependency; it does not change the field component.

| Plugin file                 | Original file                           | SHA-256                                                            |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `vendor/catalog.js`         | `packages/quiet-sounds/dist/catalog.js` | `fb8fbf2bc5754a1ed18453902469be8818226c238dfb42469e48f9257f816237` |
| `vendor/engine.js`          | `packages/quiet-sounds/dist/engine.js`  | `f9dcfecc20e9fc534cad0881aacd533d4b720729f7cec2df6c8eca59f29c0768` |
| `vendor/color.js`           | `packages/quiet-sounds/dist/color.js`   | `434900a80b134c347d6b1275adbb69c8471b775c6dbb4a54e602646cf1d19fff` |
| `vendor/ui/sound-field.tsx` | `components/sound-field.tsx`            | `db73f664bd35362c7746092e7a0f069bbbe2bee41aab1b916f95b0dae634052a` |
| `vendor/ui/orbit-logo.tsx`  | `components/orbit-logo.tsx`             | `abbfe926e02bace7bff7621c97bbe35de5a34a9406087d00096b9c6975515475` |
| `vendor/ui/orbit-logo.ts`   | `lib/orbit-logo.ts`                     | `b387571c5e77e2facbd11f718ef167f6e6d96c63e3f5cc7fe92b9f9404f57a46` |

The four named collections and extra mood/interaction tags are prototype curation. They are not presented as previously published QuietFX collections. Default duration metadata is derived from the engine; selected export durations derive from the actual voice/variation recipes.

Original checkout inspected read-only: `/Users/filipesoares/Documents/Codex/2026-09-04/https-cuelume-site-pages-dev-https-2/outputs/quiet-fx`. It was clean on inspection. The new checkout was cloned without shared hardlinks, fetched current main, and rebased onto it before adding files. No files in the original checkout were edited.
