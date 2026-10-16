import { renderPatch, wavBytes } from './audio/engine';
import {
  KIT_ROLES,
  getKitPatches,
  serializeKit,
  validateKit,
  type SoundKit,
} from './audio/kits';

export type KitPackageFiles = Record<string, string | Uint8Array>;
export type KitRegistryItem = {
  $schema: string;
  name: string;
  type: 'registry:lib';
  title: string;
  description: string;
  author: string;
  dependencies: string[];
  files: {
    path: string;
    type: 'registry:lib' | 'registry:file';
    target: string;
    content: string;
  }[];
  docs: string;
};

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

/** The exported package and registry use the same player and frozen patches. */
export function buildKitPlayerSource(
  kit: SoundKit,
  options: { typescript?: boolean; engineImport?: string } = {},
): string {
  const saved = validateKit(kit);
  const typed = options.typescript === true;
  const type = (value: string) => (typed ? value : '');
  const engineImport =
    options.engineImport ?? (typed ? './engine' : './quiet-engine.js');
  return `import { renderPatch, SoundPlayer${type(', type Patch, type Rendered')} } from ${JSON.stringify(engineImport)};

export const kitName = ${JSON.stringify(saved.name)};
export const kitRoles = ${json(KIT_ROLES)}${type(' as const')};
${type(`export type KitRole = (typeof kitRoles)[number];
export type KitPlayerOptions = { volume?: number; muted?: boolean; maxVoices?: number };
export type KitPlayOptions = { interrupt?: boolean };
`)}
function deepFreeze${type('<T>')}(value${type(': T')})${type(': T')} {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const kitPatches = deepFreeze(${json(getKitPatches(saved))}${type(' as Record<KitRole, Patch>')});

/** Create once per app or mounted feature; dispose when that owner is removed. */
export function createKitPlayer(options${type(': KitPlayerOptions')} = {}) {
  const player = new SoundPlayer();
  const cache = new Map${type('<KitRole, Rendered>')}();
  const maxVoices = options.maxVoices ?? 3;
  if (!Number.isInteger(maxVoices) || maxVoices < 1 || maxVoices > 8) {
    throw new RangeError('maxVoices must be an integer from 1 to 8.');
  }
  let muted = options.muted ?? false;
  if (typeof muted !== 'boolean') throw new TypeError('muted must be a boolean.');
  let disposed = false;
  let generation = 0;
  let disposal${type(': Promise<void> | null')} = null;
  let enabling${type(': Promise<boolean> | null')} = null;
  const doc = typeof document === 'undefined' ? null : document;

  function setVolume(value${type(': number')}) {
    if (!Number.isFinite(value)) throw new TypeError('volume must be finite.');
    player.setVolume(Math.max(0, Math.min(1, value)));
  }
  setVolume(options.volume ?? 0.35);

  function stop() {
    generation += 1;
    enabling = null;
    player.stop();
  }

  function setMuted(value${type(': boolean')}) {
    if (typeof value !== 'boolean') throw new TypeError('muted must be a boolean.');
    muted = value;
    if (muted) {
      stop();
      player.mute();
    } else {
      player.muted = false;
      player.setVolume(player.volume);
    }
    // Unmuting changes preference only; it never creates a context or plays audio.
  }

  // The first call must come directly from a click, tap or keyboard handler.
  // A blocked request is discarded, never saved for a later gesture.
  async function play(role${type(': KitRole')}, playOptions${type(': KitPlayOptions')} = {})${type(': Promise<boolean>')} {
    if (disposed || muted || doc?.hidden || !Object.hasOwn(kitPatches, role)) return false;
    if (player.context?.state !== 'running' && typeof navigator !== 'undefined' &&
        navigator.userActivation && !navigator.userActivation.isActive) return false;
    if (playOptions.interrupt) stop();
    if (player.active.size >= maxVoices) return false;
    const token = generation;
    try {
      if (enabling || player.context?.state !== 'running' || player.muted) {
        if (!enabling) {
          const attempt${type(': Promise<boolean>')} = player.enable().finally(() => {
            if (enabling === attempt) enabling = null;
          });
          enabling = attempt;
        }
        if (!(await enabling)) return false;
      }
      if (disposed || muted || doc?.hidden || token !== generation) return false;
      if (player.active.size >= maxVoices) return false;
      let rendered = cache.get(role);
      if (!rendered) {
        rendered = renderPatch(kitPatches[role]);
        cache.set(role, rendered);
      }
      return player.play(rendered, 0, false) !== null;
    } catch {
      return false;
    }
  }

  const onVisibility = () => { if (doc?.hidden) stop(); };
  const onKey = (event${type(': KeyboardEvent')}) => { if (event.key === 'Escape') stop(); };
  doc?.addEventListener('visibilitychange', onVisibility);
  doc?.addEventListener('keydown', onKey);

  function dispose()${type(': Promise<void>')} {
    if (disposal) return disposal;
    disposed = true;
    stop();
    doc?.removeEventListener('visibilitychange', onVisibility);
    doc?.removeEventListener('keydown', onKey);
    cache.clear();
    const context = player.context;
    disposal = context && context.state !== 'closed'
      ? context.close().catch(() => {})
      : Promise.resolve();
    return disposal;
  }

  return { play, stop, setVolume, setMuted, dispose };
}
`;
}

function declarations() {
  return `export type KitRole = ${KIT_ROLES.map((role) => JSON.stringify(role)).join(' | ')};
export type KitPlayerOptions = { volume?: number; muted?: boolean; maxVoices?: number };
export type KitPlayOptions = { interrupt?: boolean };
export declare const kitName: string;
export declare const kitRoles: readonly KitRole[];
export declare const kitPatches: Readonly<Record<KitRole, Readonly<Record<string, unknown>>>>;
export declare function createKitPlayer(options?: KitPlayerOptions): {
  play(role: KitRole, options?: KitPlayOptions): Promise<boolean>;
  stop(): void;
  setVolume(value: number): void;
  setMuted(value: boolean): void;
  dispose(): Promise<void>;
};
`;
}

function runtimeSource(source: string) {
  if (
    typeof source !== 'string' ||
    !source.includes('export class SoundPlayer') ||
    !source.includes('export function renderPatch')
  )
    throw new Error('Quiet FX engine source is unavailable. Please try again.');
  return source;
}

function licenseSource(license: string) {
  if (typeof license !== 'string' || !license.includes('MIT License'))
    throw new Error('Quiet FX license is unavailable. Please try again.');
  return license;
}

/** Build every file from the exact same validated kit. No filesystem or DOM. */
export function buildKitPackageFiles(
  kit: SoundKit,
  assets: { engineJs: string; license: string },
): KitPackageFiles {
  const saved = validateKit(kit);
  const patches = getKitPatches(saved);
  const files: KitPackageFiles = {
    'kit.json': serializeKit(saved),
    'patches.json': `${json(patches)}\n`,
    'quiet-engine.js': runtimeSource(assets.engineJs),
    'index.js': buildKitPlayerSource(saved),
    'index.d.ts': declarations(),
    LICENSE: licenseSource(assets.license),
    'package.json': `${json({
      name: 'quiet-fx-kit',
      version: '0.0.0',
      private: true,
      type: 'module',
      main: './index.js',
      types: './index.d.ts',
      exports: { '.': { types: './index.d.ts', import: './index.js' } },
      files: [
        'index.js',
        'index.d.ts',
        'quiet-engine.js',
        'sounds',
        'kit.json',
        'patches.json',
        'LICENSE',
        'README.md',
      ],
      sideEffects: false,
      license: 'MIT',
    })}\n`,
    'README.md': `# Quiet FX sound kit

This folder contains your exact saved settings, role mapping, rendered WAVs and a dependency-free player. The eight filenames follow interaction roles, so two roles may use the same cue without overwriting each other.

## Use the player

Copy this folder into your project. Import its index.js directly, or install the local folder with npm install ./quiet-fx-kit. There is no runtime npm dependency or network request for playback.

\`\`\`js
import { createKitPlayer } from './quiet-fx-kit/index.js';

// Create one owner per app or mounted feature. Supply your app's sound preference.
const sound = createKitPlayer({ volume: 0.35, muted: false });
button.addEventListener('click', () => { void sound.play('confirm'); });

// sound.setMuted(true); // persist this preference in your app
// sound.stop(); // cancel an interaction
// await sound.dispose(); // on unmount; create a fresh owner after remount
\`\`\`

Roles: ${KIT_ROLES.join(', ')}.

The first play must run directly from a click, tap or keyboard event. Blocked requests return false and are never queued for a later gesture. Keep essential feedback visible without sound. Muting cancels pending and active sounds; unmuting does not autoplay. Escape and hiding the page stop playback. The player caches rendered roles and allows at most three simultaneous voices by default (maxVoices accepts 1–8); further requests return false. Pass { interrupt: true } as play's second argument to replace active sounds. Remove your own interaction listeners on unmount; dispose removes the player's listeners and closes its AudioContext.

## Files

- kit.json: editable Quiet FX kit, including locked roles and all settings. Import it back into Quiet FX.
- patches.json: exact, role-keyed synthesis recipes used for preview and export.
- sounds/{role}.wav: 48 kHz, 16-bit mono audio at recipe gain.
- index.js and quiet-engine.js: the same recipes with a portable player.

The Studio monitor defaults to 35% gain. WAVs retain recipe gain; match levels when comparing them. This export contains sounds and integration code, not the Studio interface or demo components. It includes no UI Arc, Pro or other third-party component source.

Original Quiet FX code and recipes are MIT licensed. Retain LICENSE when redistributing. https://quietfx.dev
`,
  };
  for (const role of KIT_ROLES)
    files[`sounds/${role}.wav`] = wavBytes(renderPatch(patches[role]));
  return files;
}

/** shadcn-compatible, fully inlined original source. ~ targets the project root. */
export function buildRegistryItem(
  kit: SoundKit,
  engineTs: string,
  license: string,
): KitRegistryItem {
  const saved = validateKit(kit);
  const notice = licenseSource(license)
    .split('\n')
    .map((line) => `// ${line}`)
    .join('\n');
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'quiet-kit',
    type: 'registry:lib',
    title: saved.name,
    description:
      'Eight configured Quiet FX interaction sounds and an original dependency-free player.',
    author: 'Filipe Soares',
    dependencies: [],
    files: [
      {
        path: 'quiet-fx/engine.ts',
        type: 'registry:lib',
        target: '~/lib/quiet-fx/engine.ts',
        content: `${notice}\n\n${runtimeSource(engineTs)}`,
      },
      {
        path: 'quiet-fx/kit.ts',
        type: 'registry:lib',
        target: '~/lib/quiet-fx/kit.ts',
        content: `${notice}\n\n${buildKitPlayerSource(saved, { typescript: true })}`,
      },
      {
        path: 'quiet-fx/LICENSE',
        type: 'registry:file',
        target: '~/lib/quiet-fx/LICENSE',
        // The CLI can strip leading source comments during import rewriting.
        content: licenseSource(license),
      },
    ],
    docs: 'Installed at lib/quiet-fx relative to the project root. Import createKitPlayer from that kit.ts using your project alias or a relative path. Create one owner per app or mounted feature; call play(role) from a click/tap/key handler, honor the app sound preference with setMuted, and call dispose() on unmount. No UI components, npm runtime dependencies or external audio requests are included. Preserve the installed LICENSE file when redistributing. Review existing files before replacing a previously installed kit.',
  };
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error(`Could not load ${path}. Please try again.`);
  return response.text();
}

function downloadFile(
  data: string | Uint8Array,
  filename: string,
  mime: string,
) {
  const body = typeof data === 'string' ? data : new Uint8Array(data).buffer;
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function downloadKit(kit: SoundKit): Promise<void> {
  // Capture before asynchronous fetches so edits during a download cannot leak in.
  const saved = validateKit(kit);
  const [engineJs, license, { zipSync, strToU8 }] = await Promise.all([
    fetchText('/quiet-engine.js'),
    fetchText('/licenses/QUIET-MIT.txt'),
    import('fflate'),
  ]);
  const files = buildKitPackageFiles(saved, { engineJs, license });
  const encoded = Object.fromEntries(
    Object.entries(files).map(([path, content]) => [
      path,
      typeof content === 'string' ? strToU8(content) : content,
    ]),
  );
  downloadFile(
    zipSync(encoded, { level: 6 }),
    'quiet-fx-kit.zip',
    'application/zip',
  );
}

export async function downloadRegistryItem(kit: SoundKit): Promise<void> {
  const saved = validateKit(kit);
  const [engineTs, license] = await Promise.all([
    fetchText('/quiet-engine.ts'),
    fetchText('/licenses/QUIET-MIT.txt'),
  ]);
  downloadFile(
    `${json(buildRegistryItem(saved, engineTs, license))}\n`,
    'quiet-kit.json',
    'application/json',
  );
}
