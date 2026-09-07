# Quiet FX: UI sound effects and JavaScript API

Canonical website: https://quiefx.dev/
Studio: https://quiefx.dev/studio
Source: https://github.com/filipeafns/quiet-fx
Library version: 0.4.1
License: MIT for original engine, recipes and studio; separate third-party notices apply to the website's MP3 encoder.

## What it does

Quiet FX is a free, open-source library of gentle procedural sound effects for interfaces, microinteractions and motion design. It includes 72 cues with 6 named variants each (432 variations), 12 keys, 3 scales, 4 voices and 5 envelope shapes. Sounds are synthesized locally from deterministic recipes rather than downloaded recordings.

Useful contexts include button feedback, toggles, confirmations, notifications, loading, card flips, deck shuffles, page turns and short transitions. It suits projects that need subtle, customizable sounds or editable audio paired with UI motion. It is not a recorded foley collection, a music generator or a complete audio workstation. Audition and tune sounds for the context and output device.

## Install

```sh
npm install github:filipeafns/quiet-fx#v0.4.1
```

The import name is `quiet-fx`. The published GitHub tag contains prepared ESM modules, TypeScript sources and declarations. There are no engine runtime dependencies. The full repository includes website dependencies for contributors. The package declares Node.js 22.13 or newer for tooling. Browser playback uses the Web Audio API.

## Play a sound

```js
import { CUES, DEFAULTS, makePatch, renderPatch, SoundPlayer } from 'quiet-fx';

const button = document.createElement('button');
button.textContent = 'Play a gentle sound';
document.body.append(button);

const cue = CUES.find(({ id }) => id === 'sparkle');
if (!cue) throw new Error('Sound not found');
const rendered = renderPatch(makePatch(cue, {
  ...DEFAULTS, key: 'C', mode: 'Minor', voice: 'Felt', variant: 'Light',
}));
const player = new SoundPlayer();
button.addEventListener('click', async () => {
  if (await player.enable()) player.play(rendered);
});
```

Create one player per application. Render and cache sound buffers on demand. `player.enable()` must be called from a user gesture. Hover alone cannot unlock browser audio; discard blocked hover requests rather than replaying them later. Call `player.stop()` when an interaction ends or a page is hidden, and close `player.context` when the player is permanently disposed. Provide an application sound preference and a visual equivalent for important feedback.

## Core exports

- `CUES`: Array of cue objects with `id`, `name`, `category`, `description`, `use` and a synthesis recipe.
- `DEFAULTS`, `KEYS`, `MODES`, `VOICES`, `VARIANTS`, `SHAPES`: Settings and supported options.
- `makePatch(cue, settings)`: Builds a deterministic editable synthesis patch.
- `renderPatch(patch)`: Renders mono PCM and measurements including duration, peak and RMS.
- `wavBytes(rendered)`: Encodes a 16-bit mono WAV at the rendered sample rate, 48 kHz by default; synthesis and WAV encoding also work without browser playback.
- `SoundPlayer`: Web Audio playback. Methods include `enable()`, `play()`, `stop()`, `setVolume()` and `mute()`.
- `buildConversation()`, `conversationPose()`: Render audio and obtain visual state for the included conversation sequences.

## Customize

- Keys: C, C♯, D, E♭, E, F, F♯, G, A♭, A, B♭, B.
- Scales: Major, Minor, Pentatonic.
- Voices: Soft, Felt, Glass, Pluck.
- Variants: Light, Normal, Deep, Short, Long, Airy.
- Envelopes: Natural, Taper, Swell, Ripple, Double.
- Other settings: softness, brightness, duration, texture and deterministic seed.

Key and scale changes affect tonal layers. Pure friction and noise are unpitched; a key change need not sound different for those effects. Meaningful variants change timing, texture, register or shape. The same recipe and seed produce repeatable PCM. Sound-color encoding communicates digital level and tonal character; it is not a measurement of perceived loudness or physical temperature.

## Motion and export

The studio includes eight conversation actions (new, receive, send, cards, voice, upload, failure and retry), a 17.6-second full flow, and six tactile motion studies. Speed, audio offset and replacement cues can be adjusted in the sandbox.

```js
import { buildConversation, conversationPose, DEFAULTS } from 'quiet-fx';

const sequence = buildConversation('flow', DEFAULTS, 1, 0);
// elapsed is seconds since playback started, measured with AudioContext time.
const referenceTime = sequence.start + Math.max(0, elapsed - sequence.lead) / sequence.scale;
const pose = conversationPose(Math.min(sequence.end, referenceTime));
```

Play `sequence.rendered` with `SoundPlayer`. The value returned by `player.play()` is the scheduled AudioContext start time, or null when playback is unavailable. The default monitor level is 35%; `player.setVolume(0.35)` sets it explicitly. Ordinary `player.play(rendered)` interrupts previous voices. `player.play(rendered, 0, false, 0.55)` adds a quieter overlapping voice; the host should limit polyphony.

The studio exports WAV and MP3, including variation packs. The installed engine provides WAV encoding. MP3 encoding is a separate LGPL-3.0 website dependency, `@breezystack/lamejs@1.2.7`, excluded from the engine package. MP3 has encoder delay and padding; prefer WAV for precise motion synchronization. Notices and corresponding encoder source are available at https://quiefx.dev/licenses/MP3-NOTICE.txt.

## Further reference

- Complete cue inventory: https://quiefx.dev/docs/sounds.md
- Structured inventory and defaults: https://quiefx.dev/sounds.json
- Contributing: https://github.com/filipeafns/quiet-fx/blob/main/CONTRIBUTING.md
- License: https://quiefx.dev/licenses/QUIET-MIT.txt
- Issues: https://github.com/filipeafns/quiet-fx/issues
