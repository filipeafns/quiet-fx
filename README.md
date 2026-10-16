# Quiet FX

**Sound, with a lighter touch.**

An open-source library of gentle sounds for interfaces and motion. Explore the sound field, tune a cue in the studio, or bring the procedural engine into your own app.

[Try Quiet FX](https://quietfx.dev) · [Create a kit](https://quietfx.dev/create) · [Open the studio](https://quietfx.dev/studio) · [Contribute](CONTRIBUTING.md)

- **96 original cues in this source tree**, with six variations each: Light, Normal, Deep, Short, Long and Airy.
- **12 keys, three scales and four voices**, plus five envelope shapes and editable duration, softness and texture.
- **Motion with sound:** a full-width playground with nine draggable components, including a simulated conversation, tactile card and book studies, a switch, button and video player. Arrange them freely or in a grid, then explore shared keys, scales, voices and six sound variants.
- **WAV and MP3 export** from the studio, including downloadable variation packs.
- **No runtime dependencies in the engine.** Sounds are synthesized locally; no recordings or network calls are needed for playback.

## Create a sound kit

At `/create`, choose Calm, Focused, Playful or Expressive, then shuffle a coordinated eight-role kit. Lock individual sounds, material or key; customize a role; audition Workspace, Messages and Checkout examples; and save up to 24 kits locally. The current draft also survives reload. No accounts or server storage are involved.

The builder shares the library's open white layout and centered navigation: direction controls in one toolbar, full sound rows with waveforms and durations, and an adjacent interactive app preview. Use **Get the kit** in the header to export; on smaller screens the sound list and preview stack.

Three new families add 24 cues: Felt / Wood, Porcelain and Elastic. The original 72 cues remain unchanged and free. The full current library, kit creation and exports remain MIT licensed.

**Get the kit** downloads `quiet-fx-kit.zip`: eight WAVs, editable `kit.json`, role-keyed patches and a dependency-free player. Import the extracted `kit.json` through My kits to continue editing. The shadcn option downloads `quiet-kit.json`, an editable registry item containing the exact kit and engine:

```sh
npx shadcn@latest add ./quiet-kit.json
```

The generated files live at `lib/quiet-fx/engine.ts`, `lib/quiet-fx/kit.ts` and `lib/quiet-fx/LICENSE` relative to the consumer project root. Review changes before overwriting a previously installed kit. The export includes original Quiet FX code, not Arc interface components.

The new material cues and kit API are **not in the existing v0.4.1 tag**. Use a kit download or a local build of this source tree for these features. The website's new-cue integration instructions use the matching exported engine. The install below remains valid for the original released catalog. No new npm package or immutable release tag was published by this change.

See the [engineering handoff](docs/engineering-handoff.md) for architecture, exact validation, package contracts and planned Pro boundaries, and the [shadcn research](docs/SHADCN-RESEARCH.md) for the source-ownership and curated-shuffle model.

## Install

```sh
npm install github:filipeafns/quiet-fx#v0.4.1
```

This installs the prepared sound library directly from the GitHub release tag. It is not an npm-registry package. The repository includes the full website for contributors; the installed package contains the synthesis modules, source and type definitions.

## Play a sound

```js
import { CUES, DEFAULTS, makePatch, renderPatch, SoundPlayer } from 'quiet-fx';

const button = document.createElement('button');
button.textContent = 'Play a little sound';
document.body.append(button);
const cue = CUES.find(({ id }) => id === 'sparkle');
const sound = renderPatch(
  makePatch(cue, {
    ...DEFAULTS,
    key: 'C',
    mode: 'Minor',
    voice: 'Felt',
    variant: 'Light',
  }),
);
const player = new SoundPlayer();

button.addEventListener('click', async () => {
  if (await player.enable()) player.play(sound);
});
```

The studio’s **Use in your app** panel copies runnable JavaScript or a Codex/Claude integration prompt using the selected sound and every current setting. **Copy library JSON** includes all 96 sounds with per-sound edits in `library.patches`, ready for `renderPatch(library.patches[0])`. In Motion sandbox, it uses the shared key, scale, voice and variant. For released cues the install command stays pinned to v0.4.1; new material cues use the matching exported library. The copied setup carries your configuration.

Create one player per app. Render and cache sounds on demand. Call `player.stop()` when leaving an interaction, hiding the page or unmounting the host view. Close `player.context` when you no longer need the player. Browser audio requires an initial user gesture; discard blocked hover requests rather than replaying them later.

The default monitor gain is 35%. Use `player.setVolume(0.35)` to set the monitor level, and `player.mute()` for host-app sound preferences. `player.play(sound, 0, false, 0.55)` overlaps a quieter voice; the host should limit polyphony. Ordinary `player.play(sound)` interrupts previous voices.

## Shape and export

`makePatch(cue, settings)` returns an editable, deterministic recipe. `renderPatch(patch)` returns mono PCM, duration, peak, RMS and tonal-energy share. `wavBytes(rendered)` encodes a 16-bit mono WAV at the rendered sample rate, 48 kHz by default.

The studio exposes Natural, Taper, Swell, Ripple and Double envelopes. Its waveform heights are normalized for comparison; color uses a fixed digital-level scale and tonal character. Color is a design encoding, not a measurement of perceived loudness or physical temperature. Pure friction is unpitched, and scale changes only affect notes that differ between those scales. Tactile effects are synthesized interpretations, not recorded foley.

The studio's MP3 encoder is a separate LGPL dependency, excluded from the installed engine. MP3 has encoder delay and padding; use WAV for precise motion synchronization.

## Build a sequence

```js
import { buildConversation, conversationPose, DEFAULTS } from 'quiet-fx';

const sequence = buildConversation('flow', DEFAULTS, 1, 0);
// Other actions: new, receive, send, cards, voice, upload, failure, retry.
// Arguments: action, settings, speed, audio offset in ms, replacement cue ID.

const referenceTime =
  sequence.start + Math.max(0, elapsed - sequence.lead) / sequence.scale;
const pose = conversationPose(Math.min(sequence.end, referenceTime));
```

Play `sequence.rendered` with `SoundPlayer`. Derive `elapsed` from the player's AudioContext clock minus the value returned by `player.play()`. The default full flow is 17.6 seconds; upload completion and retry recovery have dedicated accents.

## Run the website locally

Use Node.js 22.13 or newer and npm.

```sh
git clone https://github.com/filipeafns/quiet-fx.git
cd quiet-fx
npm ci
npm run dev
```

Open the local address printed by the server. `/` is the homepage; `/create` is the sound-kit builder; `/studio` is the library and motion sandbox. Hover to audition, click to edit, and press Escape to stop. On the sound field, touch users can tap and keyboard users can explore with arrow keys and Enter. In Motion sandbox, drag or click a shelf component to add it. Drag its name to move it, or focus the name and use arrow keys (Shift for larger steps). Select a piece and press Delete, or use its remove button. Grid view preserves the free-canvas positions; Reset restores the starting arrangement. Phone messages and video playback are simulations. Reduced-motion preferences simplify visual animation.

```sh
npm run typecheck
npm test
npm run build:static
```

The static website is written to `dist/client`. The included Vercel configuration builds and hosts it with clean URLs. Any static host supporting `/studio` → `studio.html` can serve it. The public website permits indexing and uses canonical URLs on `quietfx.dev`. Search metadata, structured data, a sitemap and AI-readable documentation are included.

See the [deployment and release guide](docs/DEPLOYMENT.md) for Vercel previews and publishing new library versions. [Search and assistant discovery](docs/DISCOVERY.md) describes the public metadata, crawl rules and generated documentation.

## Repository layout

```text
app/                     Homepage and studio routes
components/              Sound field, visualizers and motion scenes
lib/audio/               Engine, catalog, sequences and sound-color utilities
packages/quiet-sounds/   Generated ESM library, TypeScript sources and declarations
scripts/                 Build and numerical audio checks
public/licenses/         Third-party notices and MP3 corresponding source
```

The source of truth is `lib/audio`. Run `npm run build:package` to regenerate the distributable modules. `npm pack` creates the installable root library package. All website dependencies are development dependencies; the engine's runtime dependency set is empty. Test artifacts are written into ignored `work/` folders inside the checkout.

## Contributing

Small, purposeful sounds are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the design principles and validation steps. The engine is deterministic, but subjective sound quality and device latency still require listening on real hardware. Numerical tests do not substitute for that review.

## License

Quiet FX's original engine, sound recipes and studio code are [MIT licensed](LICENSE). Third-party packages retain their own licenses. The studio's MP3 export uses `@breezystack/lamejs@1.2.7` under LGPL-3.0; its notices, exact source archive and replacement instructions are included. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Made by [Filipe Soares](https://github.com/filipeafns).
