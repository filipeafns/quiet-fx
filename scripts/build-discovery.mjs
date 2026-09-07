import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  CUES,
  KEYS,
  MODES,
  VOICES,
  VARIANTS,
  SHAPES,
  DEFAULTS,
} from '../packages/quiet-sounds/dist/index.js';

const site = 'https://quiefx.dev';
const repo = 'https://github.com/filipeafns/quiet-fx';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const install = `npm install github:filipeafns/quiet-fx#v${version}`;
const count = CUES.length;
const variations = count * VARIANTS.length;
const code = `import { CUES, DEFAULTS, makePatch, renderPatch, SoundPlayer } from 'quiet-fx';

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
});`;

const index = `# Quiet FX

> Free, MIT-licensed, open-source UI sound effects and a JavaScript sound library for interfaces and motion.

Quiet FX provides ${count} original procedural sounds and ${variations} named variations. The browser studio previews, customizes and exports sounds as WAV or MP3. The installable engine has zero runtime dependencies and TypeScript declarations. Canonical website: ${site}/. Author: Filipe Soares. Library release: v${version}.

Install from the GitHub release tag: \`${install}\`. This is a GitHub dependency, not a published npm-registry package.

## Documentation
- [Getting started and API](${site}/docs/index.md): Verified installation, examples, customization, playback lifecycle, motion and licensing.
- [Sound catalog](${site}/docs/sounds.md): Every sound ID, name, category, description and intended interaction.
- [Structured sound catalog](${site}/sounds.json): Machine-readable sound inventory, options and defaults.
- [Complete reference](${site}/llms-full.txt): The getting-started guide and sound catalog in one plain-text file.

## Project
- [Homepage](${site}/): Interactive sound field and library overview.
- [Sound studio](${site}/studio): Audition, shape and export sounds; test motion sequences.
- [Source repository](${repo}): Source, contribution guide and issue tracker.
- [Release v${version}](${repo}/releases/tag/v${version}): Prepared library package and release notes.
- [MIT license](${site}/licenses/QUIET-MIT.txt): License for the original engine, recipes and studio.
- [MP3 notices](${site}/licenses/MP3-NOTICE.txt): The studio's separate LGPL MP3 encoder and corresponding source.
`;

const guide = `# Quiet FX: UI sound effects and JavaScript API

Canonical website: ${site}/
Studio: ${site}/studio
Source: ${repo}
Library version: ${version}
License: MIT for original engine, recipes and studio; separate third-party notices apply to the website's MP3 encoder.

## What it does

Quiet FX is a free, open-source library of gentle procedural sound effects for interfaces, microinteractions and motion design. It includes ${count} cues with ${VARIANTS.length} named variants each (${variations} variations), ${KEYS.length} keys, ${MODES.length} scales, ${VOICES.length} voices and ${SHAPES.length} envelope shapes. Sounds are synthesized locally from deterministic recipes rather than downloaded recordings.

Useful contexts include button feedback, toggles, confirmations, notifications, loading, card flips, deck shuffles, page turns and short transitions. It suits projects that need subtle, customizable sounds or editable audio paired with UI motion. It is not a recorded foley collection, a music generator or a complete audio workstation. Audition and tune sounds for the context and output device.

## Install

\`\`\`sh
${install}
\`\`\`

The import name is \`quiet-fx\`. The published GitHub tag contains prepared ESM modules, TypeScript sources and declarations. There are no engine runtime dependencies. The full repository includes website dependencies for contributors. The package declares Node.js 22.13 or newer for tooling. Browser playback uses the Web Audio API.

## Play a sound

\`\`\`js
${code}
\`\`\`

Create one player per application. Render and cache sound buffers on demand. \`player.enable()\` must be called from a user gesture. Hover alone cannot unlock browser audio; discard blocked hover requests rather than replaying them later. Call \`player.stop()\` when an interaction ends or a page is hidden, and close \`player.context\` when the player is permanently disposed. Provide an application sound preference and a visual equivalent for important feedback.

## Core exports

- \`CUES\`: Array of cue objects with \`id\`, \`name\`, \`category\`, \`description\`, \`use\` and a synthesis recipe.
- \`DEFAULTS\`, \`KEYS\`, \`MODES\`, \`VOICES\`, \`VARIANTS\`, \`SHAPES\`: Settings and supported options.
- \`makePatch(cue, settings)\`: Builds a deterministic editable synthesis patch.
- \`renderPatch(patch)\`: Renders mono PCM and measurements including duration, peak and RMS.
- \`wavBytes(rendered)\`: Encodes a 16-bit mono WAV at the rendered sample rate, 48 kHz by default; synthesis and WAV encoding also work without browser playback.
- \`SoundPlayer\`: Web Audio playback. Methods include \`enable()\`, \`play()\`, \`stop()\`, \`setVolume()\` and \`mute()\`.
- \`buildConversation()\`, \`conversationPose()\`: Render audio and obtain visual state for the included conversation sequences.

## Customize

- Keys: ${KEYS.join(', ')}.
- Scales: ${MODES.join(', ')}.
- Voices: ${VOICES.join(', ')}.
- Variants: ${VARIANTS.join(', ')}.
- Envelopes: ${SHAPES.join(', ')}.
- Other settings: softness, brightness, duration, texture and deterministic seed.

Key and scale changes affect tonal layers. Pure friction and noise are unpitched; a key change need not sound different for those effects. Meaningful variants change timing, texture, register or shape. The same recipe and seed produce repeatable PCM. Sound-color encoding communicates digital level and tonal character; it is not a measurement of perceived loudness or physical temperature.

## Motion and export

The studio includes a full-width motion playground with nine draggable components: a simulated conversation, card flip, deck riffle, page turn, panel reveal, book close, switch, button and video player. The conversation supports eight actions (new, receive, send, cards, voice, upload, failure and retry) and a 17.6-second full flow. Components use dedicated procedural cues controlled by shared key, scale, voice and six sound variants. Free placement, a grid view, reset and keyboard removal are available. Messages and video playback are local simulations.

\`\`\`js
import { buildConversation, conversationPose, DEFAULTS } from 'quiet-fx';

const sequence = buildConversation('flow', DEFAULTS, 1, 0);
// elapsed is seconds since playback started, measured with AudioContext time.
const referenceTime = sequence.start + Math.max(0, elapsed - sequence.lead) / sequence.scale;
const pose = conversationPose(Math.min(sequence.end, referenceTime));
\`\`\`

Play \`sequence.rendered\` with \`SoundPlayer\`. The value returned by \`player.play()\` is the scheduled AudioContext start time, or null when playback is unavailable. The default monitor level is 35%; \`player.setVolume(0.35)\` sets it explicitly. Ordinary \`player.play(rendered)\` interrupts previous voices. \`player.play(rendered, 0, false, 0.55)\` adds a quieter overlapping voice; the host should limit polyphony.

The studio exports WAV and MP3, including variation packs. The installed engine provides WAV encoding. MP3 encoding is a separate LGPL-3.0 website dependency, \`@breezystack/lamejs@1.2.7\`, excluded from the engine package. MP3 has encoder delay and padding; prefer WAV for precise motion synchronization. Notices and corresponding encoder source are available at ${site}/licenses/MP3-NOTICE.txt.

## Further reference

- Complete cue inventory: ${site}/docs/sounds.md
- Structured inventory and defaults: ${site}/sounds.json
- Contributing: ${repo}/blob/main/CONTRIBUTING.md
- License: ${site}/licenses/QUIET-MIT.txt
- Issues: ${repo}/issues
`;

const catalog =
  `# Quiet FX sound catalog

${count} original sounds, each available in ${VARIANTS.join(', ')} variations.
Audition and export: ${site}/studio

` +
  CUES.map(
    (cue) => `## ${cue.name}

- ID: \`${cue.id}\`
- Category: ${cue.category}
- Sound: ${cue.description}
- Intended use: ${cue.use}
`,
  ).join('\n');

mkdirSync('public/docs', { recursive: true });
writeFileSync('public/llms.txt', index);
writeFileSync('public/llm.txt', index);
writeFileSync('public/llms-full.txt', `${guide}\n\n${catalog}`);
writeFileSync('public/docs/index.md', guide);
writeFileSync('public/docs/sounds.md', catalog);
writeFileSync(
  'public/sounds.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      name: 'Quiet FX',
      url: site,
      repository: repo,
      version,
      license: 'MIT',
      licenseUrl: `${site}/licenses/QUIET-MIT.txt`,
      install,
      count,
      variationCount: variations,
      runtimeDependencies: [],
      options: {
        keys: KEYS,
        scales: MODES,
        voices: VOICES,
        variants: VARIANTS,
        envelopes: SHAPES,
      },
      defaults: DEFAULTS,
      sounds: CUES.map(({ id, name, category, description, use }) => ({
        id,
        name,
        category,
        description,
        use,
      })),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Generated discovery documentation for ${count} sounds and ${variations} variations.`,
);
