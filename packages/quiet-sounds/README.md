# Quiet FX

72 procedural cues, six meaningful variations, five envelope shapes, 12 keys, three scales and four voices. No recordings, network calls or runtime dependencies. MIT licensed.

## Install and play

Install the local package with `npm install ./packages/quiet-sounds`. This folder can become its own GitHub repository: commit the included `dist`, `src`, `package.json`, README and LICENSE, then install it from your repository URL. The library is released from https://github.com/filipeafns/quiet-fx; it is not published to the npm registry.

```js
import {
  CUES,
  DEFAULTS,
  makePatch,
  renderPatch,
  SoundPlayer,
  wavBytes,
} from 'quiet-fx';
const cue = CUES.find((c) => c.id === 'sparkle');
const patch = makePatch(cue, {
  ...DEFAULTS,
  key: 'C',
  mode: 'Minor',
  voice: 'Felt',
  variant: 'Light',
  shape: 'Natural',
});
const audio = renderPatch(patch);
const player = new SoundPlayer();
button.addEventListener('pointerdown', async () => {
  if (await player.enable()) player.play(audio);
});
// wavBytes(audio) returns a Uint8Array for 16-bit mono WAV, 48 kHz by default.
// player.stop() cancels active sources; player.setVolume(0.35) sets monitor gain.
```

Render and cache on demand. Use one player per app. Browser audio needs a user gesture before playback; do not queue hover sounds across a suspended AudioContext. `player.unlock()` requests a non-blocking resume; `play()` only runs while the context is running. `player.mute()` remains available for host-app preferences and accessibility.

`makePatch` bakes musical choices into an editable JSON recipe. Noise is deterministic per cue/seed. Material partials preserve body-frequency ratios. Pure friction has no musical key, and modes only differ when a cue contains a changed scale degree. Five shapes are Natural, Taper, Swell, Ripple and Double. Tactile sounds are synthesized interpretations, not recordings.

The app's MP3 encoder is a separate LGPL dependency and is not included here. Use lossless WAV for timing-critical microinteractions; MP3 has encoder delay and padding.

## Conversation timelines and sound colors

```js
import {
  buildConversation,
  conversationPose,
  signalColor,
  signalLevel,
} from 'quiet-fx';
const sequence = buildConversation('flow', DEFAULTS, 1, 0);
// Other IDs: new, receive, send, cards, voice, upload, failure, retry.
// Arguments: action, settings, speed, audio offset in ms, optional replacement cue ID.
// Play sequence.rendered with SoundPlayer, then use its AudioContext clock:
const referenceTime =
  sequence.start + Math.max(0, elapsed - sequence.lead) / sequence.scale;
const pose = conversationPose(Math.min(sequence.end, referenceTime));
const color = signalColor(
  signalLevel(sequence.rendered.peak),
  sequence.rendered.toneShare,
);
```

Timelines include dedicated effects and completion accents. The full flow lasts 17.6 seconds at default settings. `conversationPose` supplies normalized animation progress and the reference thread scroll offset. `signalColor` uses a fixed -46 to -24 dBFS design range and tonal energy share; it does not measure perceived loudness. Apply colors on hover, focus or in a detailed editor as appropriate for the host interface.

Clone the complete Quiet FX repository and regenerate this folder from its root with `node scripts/build-runtime.mjs`. Source of truth: the modules in `lib/audio/`.
