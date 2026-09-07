import { CUES, makePatch, type Settings } from './audio/catalog';

const LIBRARY_VERSION = '0.4.1';
const SOURCE = 'https://quietfx.dev';
export const INSTALL_COMMAND = 'npm install github:filipeafns/quiet-fx#v0.4.1';

export type LibraryEntry = { cueId: string; settings: Settings };

function findCue(cueId: string) {
  const cue = CUES.find(({ id }) => id === cueId);
  if (!cue) throw new Error(`Unknown Quiet FX sound: ${cueId}`);
  return cue;
}

// Copy every sound setting explicitly: exports must be independent of later edits.
function copySettings(settings: Settings): Settings {
  return {
    key: settings.key,
    mode: settings.mode,
    voice: settings.voice,
    variant: settings.variant,
    shape: settings.shape,
    softness: settings.softness,
    brightness: settings.brightness,
    duration: settings.duration,
    texture: settings.texture,
    seed: settings.seed,
  };
}

export function buildInstallSetup(cueId: string, settings: Settings) {
  const cue = findCue(cueId);
  const snapshot = copySettings(settings);
  const code = `import { CUES, makePatch, renderPatch, SoundPlayer } from 'quiet-fx';

export const quietCueId = ${JSON.stringify(cue.id)};
export const quietSettings = Object.freeze(${JSON.stringify(snapshot, null, 2)});

const cue = CUES.find(({ id }) => id === quietCueId);
if (!cue) throw new Error('Quiet FX sound not found: ' + quietCueId);
const rendered = renderPatch(makePatch(cue, quietSettings));

// Create one owner per mounted feature; create a fresh owner after remounting.
export function createQuietSound() {
  const player = new SoundPlayer();
  let generation = 0;
  let disposed = false;

  function stopQuiet() {
    generation += 1;
    player.stop();
  }

  // Call directly from an existing click/tap/key handler after checking sound preferences.
  async function playQuiet() {
    if (disposed) return false;
    stopQuiet();
    const request = generation;
    try {
      const enabled = await player.enable();
      if (!enabled || disposed || request !== generation) return false;
      return player.play(rendered, 0, false) !== null;
    } catch {
      return false;
    }
  }

  async function disposeQuiet() {
    if (disposed) return;
    disposed = true;
    stopQuiet();
    const context = player.context;
    if (context && context.state !== 'closed') {
      await context.close().catch(() => {});
    }
  }

  return { play: playQuiet, stop: stopQuiet, dispose: disposeQuiet };
}
`;
  const prompt = (assistant: string) =>
    `${assistant}, integrate the following configured Quiet FX sound into the existing project: ${cue.name} (${cue.id}). Preserve all settings in the setup; they are the current studio values, including the deterministic seed.

Install this exact GitHub release dependency (the import name is quiet-fx):

\`\`\`sh
${INSTALL_COMMAND}
\`\`\`

Use the complete setup below as one module. Instantiate const sound = createQuietSound() once per mounted feature lifecycle, adapting ownership to the existing framework. Create a fresh owner after remounting; do not create a player on every render or interaction. Connect sound.play() to an appropriate existing user interaction and honor the application's sound preference. It returns false when playback is blocked, cancelled or disposed. Do not invent new interface elements or autoplay audio. Hover alone must never unlock audio or queue sounds for later.

Call sound.stop() on cancellation, Escape and when the page becomes hidden. Call sound.dispose() when the owner is removed, and remove any event listeners you add. Keep important feedback visible without sound. Preserve the project's existing layout and behavior.

\`\`\`js
${code}\`\`\`

Use the current official documentation to verify the integration: ${SOURCE}/docs/index.md
Source repository: https://github.com/filipeafns/quiet-fx
`;
  return {
    install: INSTALL_COMMAND,
    code,
    codexPrompt: prompt('Codex'),
    claudePrompt: prompt('Claude'),
  };
}

export function buildLibraryJson(
  entries: readonly LibraryEntry[],
  selectedCueId: string,
): string {
  const ids = new Set<string>();
  const patches = entries.map(({ cueId, settings }) => {
    const cue = findCue(cueId);
    if (ids.has(cueId)) throw new Error(`Duplicate Quiet FX sound: ${cueId}`);
    ids.add(cueId);
    const snapshot = copySettings(settings);
    return makePatch(cue, snapshot);
  });
  if (!ids.has(selectedCueId))
    throw new Error('The selected Quiet FX sound must be in the library.');
  const selected = patches.find(({ id }) => id === selectedCueId)!;
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        name: 'Quiet FX',
        version: LIBRARY_VERSION,
        source: SOURCE,
        repository: 'https://github.com/filipeafns/quiet-fx',
        install: INSTALL_COMMAND,
        selectedCueId,
        selectedCue: {
          id: selected.id,
          name: selected.name,
          settings: selected.settings,
        },
        patches,
      },
      null,
      2,
    ) + '\n'
  );
}
