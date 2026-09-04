# Quiet FX

**Sound, with a lighter touch.**

An open-source library of gentle sounds for interfaces and motion. Explore the sound field, tune a cue in the studio, or bring the procedural engine into your own app.

[Try Quiet FX](https://quiet-fx.vercel.app) · [Open the studio](https://quiet-fx.vercel.app/studio) · [Contribute](CONTRIBUTING.md)

- **72 original cues**, with six variations each: Light, Normal, Deep, Short, Long and Airy.
- **12 keys, three scales and four voices**, plus five envelope shapes and editable duration, softness and texture.
- **Motion with sound:** eight conversation sequences and six tactile studies, with adjustable speed, offset and cue replacement.
- **WAV and MP3 export** from the studio, including downloadable variation packs.
- **No runtime dependencies in the engine.** Sounds are synthesized locally; no recordings or network calls are needed for playback.

## Install

```sh
npm install github:filipeafns/quiet-fx#v0.4.0
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

Create one player per app. Render and cache sounds on demand. Call `player.stop()` when leaving an interaction, hiding the page or unmounting the host view. Close `player.context` when you no longer need the player. Browser audio requires an initial user gesture; discard blocked hover requests rather than replaying them later.

The default monitor gain is 35%. Use `player.setVolume(0.35)` to set the monitor level, and `player.mute()` for host-app sound preferences. `player.play(sound, 0, false, 0.55)` overlaps a quieter voice; the host should limit polyphony. Ordinary `player.play(sound)` interrupts previous voices.

## Shape and export

`makePatch(cue, settings)` returns an editable, deterministic recipe. `renderPatch(patch)` returns mono PCM, duration, peak, RMS and tonal-energy share. `wavBytes(rendered)` encodes a 48 kHz, 16-bit mono WAV.

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

Open the local address printed by the server. `/` is the homepage; `/studio` is the library and motion sandbox. Hover to audition, click to edit, and press Escape to stop. On the sound field, touch users can tap and keyboard users can explore with arrow keys and Enter. Reduced-motion preferences simplify visual animation.

```sh
npm run typecheck
npm test
npm run build:static
```

The static website is written to `dist/client`. The included Vercel configuration builds and hosts it with clean URLs. Any static host supporting `/studio` → `studio.html` can serve it. The public website retains noindex metadata until indexing is deliberately enabled.

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
