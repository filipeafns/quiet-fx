'use client';
/* oxlint-disable next/no-html-link-for-pages -- Static vinext exports use document navigation. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Search,
  Play,
  MoveHorizontal,
  Download,
  Check,
  PackageOpen,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Segments, Range } from '@/components/studio-controls';
import { Wave, Spectrum } from '@/components/signal';
import { MotionSandbox } from '@/components/motion-sandbox';
import { OrbitLogo } from '@/components/orbit-logo';
import { SoundField } from '@/components/sound-field';
import {
  CUES,
  CATEGORIES,
  KEYS,
  MODES,
  VOICES,
  VARIANTS,
  SHAPES,
  DEFAULTS,
  makePatch,
  type Settings,
} from '@/lib/audio/catalog';
import {
  SoundPlayer,
  renderPatch,
  wavBytes,
  type Rendered,
  type Patch,
} from '@/lib/audio/engine';
import { soundStyle } from '@/lib/audio/color';
import type { CSSProperties } from 'react';
import { mp3Bytes } from '@/lib/audio/export';
import { zipSync, strToU8 } from 'fflate';
const CACHE = new Map<string, Rendered>();
function renderCached(p: Patch) {
  const key = JSON.stringify(p);
  const old = CACHE.get(key);
  if (old) return old;
  const result = renderPatch(p);
  if (CACHE.size > 220) CACHE.delete(CACHE.keys().next().value!);
  CACHE.set(key, result);
  return result;
}
function download(data: Uint8Array | string, name: string, type: string) {
  const url = URL.createObjectURL(
    new Blob([typeof data === 'string' ? data : new Uint8Array(data)], {
      type,
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}
export default function Home() {
  const [view, setView] = useState('library'),
    [sandboxVariant, setSandboxVariant] = useState('Normal'),
    [selected, setSelected] = useState('sparkle'),
    [category, setCategory] = useState('All'),
    [query, setQuery] = useState(''),
    [palette, setPalette] = useState({
      key: 'C',
      mode: 'Major',
      voice: 'Soft',
    }),
    [edits, setEdits] = useState<Record<string, Partial<Settings>>>({}),
    [playing, setPlaying] = useState(''),
    [playingToneShare, setPlayingToneShare] = useState(0.5),
    [format, setFormat] = useState('WAV'),
    [busy, setBusy] = useState(''),
    [notice, setNotice] = useState(''),
    [blocked, setBlocked] = useState(false),
    [ready, setReady] = useState(false),
    [thumbs, setThumbs] = useState<Record<string, Rendered>>({});
  const [engine] = useState(() => new SoundPlayer());
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    playTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    previewToken = useRef(0),
    drag = useRef<{ x: number; duration: number; width: number } | null>(null),
    live = useRef({ selected, view });
  useEffect(() => {
    live.current = { selected, view };
  }, [selected, view]);
  const cue = CUES.find((c) => c.id === selected) || CUES[0];
  const settings = useMemo<Settings>(
    () => ({ ...DEFAULTS, ...palette, ...edits[selected] }),
    [palette, edits, selected],
  );
  const sandboxSettings = useMemo<Settings>(
    () => ({ ...DEFAULTS, ...palette, variant: sandboxVariant }),
    [palette, sandboxVariant],
  );
  const patch = useMemo(() => makePatch(cue, settings), [cue, settings]);
  const rendered = useMemo(() => renderCached(patch), [patch]);
  const variationRenders = useMemo(
    () =>
      VARIANTS.map((variant) => ({
        variant,
        r: renderCached(makePatch(cue, { ...settings, variant })),
      })),
    [cue, settings],
  );
  const referenceSpan = useMemo(
    () =>
      renderCached(
        makePatch(cue, {
          ...settings,
          duration: 1,
          variant: 'Normal',
          shape: 'Natural',
        }),
      ).duration * 2.7,
    [cue, settings],
  );
  const variantsSpan = Math.max(...variationRenders.map((v) => v.r.duration));
  const filtered = useMemo(
    () =>
      CUES.filter(
        (c) =>
          (category === 'All' || c.category === category) &&
          `${c.name} ${c.description} ${c.use}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  );
  const stop = useCallback(() => {
    previewToken.current++;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    engine.stop();
    setPlaying('');
    if (playTimer.current) clearTimeout(playTimer.current);
  }, [engine]);
  const unlock = useCallback(() => {
    try {
      const running = engine.unlock();
      if (running) setBlocked(false);
      return running;
    } catch {
      return false;
    }
  }, [engine]);
  const toast = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3400);
  }, []);
  useEffect(() => {
    const gesture = (e: Event) => {
      if (
        e instanceof PointerEvent &&
        e.type === 'pointerdown' &&
        e.pointerType !== 'mouse'
      )
        return;
      if (
        e instanceof PointerEvent &&
        e.type === 'pointerup' &&
        e.pointerType === 'mouse'
      )
        return;
      if (e instanceof KeyboardEvent && (e.ctrlKey || e.metaKey || e.altKey))
        return;
      unlock();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    const ended = () => {
      setPlaying('');
      if (playTimer.current) clearTimeout(playTimer.current);
    };
    document.addEventListener('pointerdown', gesture, true);
    document.addEventListener('pointerup', gesture, true);
    document.addEventListener('keydown', gesture, true);
    document.addEventListener('visibilitychange', visibility);
    engine.stopListeners.add(ended);
    return () => {
      stop();
      document.removeEventListener('pointerdown', gesture, true);
      document.removeEventListener('pointerup', gesture, true);
      document.removeEventListener('keydown', gesture, true);
      document.removeEventListener('visibilitychange', visibility);
      engine.stopListeners.delete(ended);
      engine.stop();
      void engine.context?.close();
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (playTimer.current) clearTimeout(playTimer.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [engine, unlock, stop]);
  // Hydrate browser-only editing preferences after SSR.
  /* oxlint-disable react/react-compiler -- Browser preferences have no server snapshot. */
  useEffect(() => {
    if (window.location.hash === '#sandbox') setView('sandbox');
    try {
      const p = JSON.parse(localStorage.getItem('quiet-v2') || '{}');
      if (
        KEYS.includes(p.key) &&
        MODES.includes(p.mode) &&
        VOICES.includes(p.voice)
      )
        setPalette(p);
    } catch {}
    setReady(true);
  }, []);
  /* oxlint-enable react/react-compiler */
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('quiet-v2', JSON.stringify(palette));
      } catch {}
  }, [ready, palette]);
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const result: Record<string, Rendered> = {};
      for (const c of CUES) {
        if (cancelled) return;
        result[c.id] = renderCached(
          makePatch(c, { ...DEFAULTS, ...palette, ...edits[c.id] }),
        );
        if (Object.keys(result).length % 8 === 0)
          await new Promise<void>((r) => setTimeout(r, 0));
      }
      if (!cancelled) setThumbs(result);
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [palette, edits]);
  const signal = useCallback((id: string, r: Rendered) => {
    setPlaying(id);
    setPlayingToneShare(r.toneShare ?? 0.5);
    if (playTimer.current) clearTimeout(playTimer.current);
    playTimer.current = setTimeout(
      () => setPlaying(''),
      r.duration * 1000 + 30,
    );
  }, []);
  const preview = useCallback(
    (id: string, variant?: string) => {
      const token = ++previewToken.current;
      const c = CUES.find((c) => c.id === id);
      if (!c) return;
      const p = makePatch(c, {
        ...DEFAULTS,
        ...palette,
        ...edits[id],
        ...(variant ? { variant } : {}),
      });
      unlock();
      const play = () => {
        if (token !== previewToken.current) return;
        if (engine.context?.state !== 'running') {
          setBlocked(true);
          return;
        }
        setBlocked(false);
        const r = renderCached(p);
        if (engine.play(r) !== null) signal(id, r);
      };
      if (engine.context?.state === 'running') play();
      else setTimeout(play, 60);
    },
    [palette, edits, engine, unlock, signal],
  );
  const hoverPreview = (id: string, variant?: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => preview(id, variant), 80);
  };
  const auditionField = useCallback(
    (id: string, takeOver: boolean, audition: boolean) => {
      const c = CUES.find((c) => c.id === id)!;
      const r = renderCached(
        makePatch(c, { ...DEFAULTS, ...palette, ...edits[id] }),
      );
      if (!audition || document.hidden) return { rendered: r, at: null };
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      previewToken.current++;
      unlock();
      if (engine.context?.state !== 'running') {
        setBlocked(true);
        return { rendered: r, at: null };
      }
      if (takeOver) stop();
      setBlocked(false);
      const at = engine.active.size < 3 ? engine.play(r, 0, false, 0.55) : null;
      return { rendered: r, at };
    },
    [palette, edits, engine, unlock, stop],
  );
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    previewToken.current++;
  };
  const selectCue = (id: string) => {
    setSelected(id);
    preview(id);
  };
  const edit = (key: keyof Settings, value: string | number) =>
    setEdits((e) => ({ ...e, [selected]: { ...e[selected], [key]: value } }));
  const editVariant = (variant: string) => {
    edit('variant', variant);
    preview(selected, variant);
  };
  async function exportOne() {
    setBusy('Exporting');
    try {
      download(
        format === 'MP3' ? await mp3Bytes(rendered) : wavBytes(rendered),
        `quiet-${selected}-${settings.variant.toLowerCase()}.${format.toLowerCase()}`,
        format === 'MP3' ? 'audio/mpeg' : 'audio/wav',
      );
      toast(`${cue.name} exported`);
    } catch {
      toast('Export failed. Please try again.');
    } finally {
      setBusy('');
    }
  }
  async function exportPack(variants = false) {
    setBusy('Preparing download');
    try {
      const files: Record<string, Uint8Array> = {},
        patches: Patch[] = [];
      const list = variants ? [cue] : filtered;
      for (const c of list) {
        for (const variant of variants
          ? VARIANTS
          : [edits[c.id]?.variant || 'Normal']) {
          const p = makePatch(c, {
            ...DEFAULTS,
            ...palette,
            ...edits[c.id],
            variant,
          });
          const r = renderCached(p);
          const name = `${c.id}-${variant.toLowerCase()}`;
          files[`sounds/${name}.${format.toLowerCase()}`] =
            format === 'MP3' ? await mp3Bytes(r) : wavBytes(r);
          files[`recipes/${name}.json`] = strToU8(JSON.stringify(p, null, 2));
          patches.push(p);
        }
        await new Promise<void>((r) => setTimeout(r, 0));
      }
      const urls = ['/quiet-engine.js', '/licenses/QUIET-MIT.txt'];
      const resources = await Promise.all(
        urls.map(async (url) => {
          const r = await fetch(url);
          if (!r.ok) throw Error('Download unavailable');
          return r.text();
        }),
      );
      files['index.js'] = strToU8(resources[0]);
      files['LICENSE'] = strToU8(resources[1]);
      files['library.json'] = strToU8(
        JSON.stringify({ name: 'Quiet', version: 3, patches }, null, 2),
      );
      files['package.json'] = strToU8(
        JSON.stringify(
          {
            name: 'quiet-sound-palette',
            version: '0.4.0',
            type: 'module',
            main: './index.js',
            exports: { '.': './index.js', './library.json': './library.json' },
            license: 'MIT',
            files: [
              'index.js',
              'library.json',
              'sounds',
              'recipes',
              'LICENSE',
              'README.md',
            ],
          },
          null,
          2,
        ),
      );
      files['README.md'] = strToU8(
        '# Quiet palette\n\nInstall this folder with npm install ./quiet-sound-palette, or commit it to your own GitHub repository.\n\n```js\nimport { SoundPlayer, renderPatch } from "quiet-sound-palette";\nimport library from "quiet-sound-palette/library.json" with {type:"json"};\nconst player = new SoundPlayer();\nbutton.addEventListener("pointerdown", async () => {\n  await player.enable();\n  player.play(renderPatch(library.patches[0]));\n});\n```\n\nUse one player. player.stop() cancels playback; player.setVolume(0.35) sets output gain. Browsers require an initial user gesture. The exported sound files use recipe gain; the app previews at 35% monitor gain.\n',
      );
      download(
        zipSync(files, { level: 6 }),
        variants ? `quiet-${selected}-variations.zip` : 'quiet-palette.zip',
        'application/zip',
      );
      toast(`${patches.length} sounds and a reusable package exported`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy('');
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('input,button,[role=slider],[role=combobox]')) return;
      if (e.key === '/') {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>('[aria-label="Search sounds"]')
          ?.focus();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        preview(selected);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [selected, preview, stop]);
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (t: unknown, o: unknown) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const controller = new AbortController();
    const tools = [
      {
        name: 'quiet_list_sounds',
        description: 'List Quiet sounds and current selection.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          selected: live.current.selected,
          sounds: CUES.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
          })),
        }),
      },
      {
        name: 'quiet_select_sound',
        description:
          'Select a Quiet sound for inspection, without playing audio.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', enum: CUES.map((c) => c.id) } },
          required: ['id'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: unknown) => {
          const id = (input as { id?: string })?.id;
          if (!CUES.some((c) => c.id === id)) throw Error('Unknown sound ID');
          setSelected(id!);
          setView('library');
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          return { selected: id };
        },
      },
    ];
    for (const t of tools)
      void Promise.resolve(
        ctx.registerTool(t, { signal: controller.signal }),
      ).catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <Tabs
      value={view}
      onValueChange={(v) => {
        stop();
        setView(String(v));
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${v === 'sandbox' ? '#sandbox' : ''}`,
        );
      }}
      className={`quiet-app${view === 'sandbox' ? ' sandbox-open' : ''}`}
    >
      <header className="app-header">
        <a className="brand" href="/" aria-label="Quiet FX home">
          <OrbitLogo
            player={engine}
            musicalKey={palette.key}
            mode={palette.mode}
            voice={palette.voice}
          />
          <span>quiet</span>
        </a>
        <TabsList className="main-nav" aria-label="Workspace">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="sandbox">Motion sandbox</TabsTrigger>
        </TabsList>
        <button
          className="header-export"
          onClick={() => void exportPack()}
          disabled={!!busy || !filtered.length}
        >
          <Download size={16} />
          <span>Export library</span>
        </button>
      </header>
      {view === 'library' && (
        <SoundField player={engine} onAudition={auditionField} onStop={stop} />
      )}
      <div className="app-body">
        <div className="palette-bar">
          <div className="palette-group key-group">
            <span className="control-label">Key</span>
            <Segments
              label="Musical key"
              value={palette.key}
              options={KEYS}
              className="key-segments"
              onChange={(key) => {
                stop();
                setPalette((p) => ({ ...p, key }));
              }}
            />
          </div>
          <div className="palette-group">
            <span className="control-label">Scale</span>
            <Segments
              label="Musical scale"
              value={palette.mode}
              options={MODES}
              onChange={(mode) => {
                stop();
                setPalette((p) => ({ ...p, mode }));
              }}
            />
          </div>
          <div className="palette-group">
            <span className="control-label">Voice</span>
            <Segments
              label="Instrument voice"
              value={palette.voice}
              options={VOICES}
              onChange={(voice) => {
                stop();
                setPalette((p) => ({ ...p, voice }));
              }}
            />
          </div>
        </div>
        <TabsContent value="library">
          <div className="library-layout">
            <section className="collection">
              <div className="collection-header">
                <div className="category-list">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      className={category === c ? 'selected' : ''}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="search-wrap">
                  <Search size={16} />
                  <Input
                    aria-label="Search sounds"
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="sound-grid">
                {filtered.map((c) => (
                  <button
                    className={
                      'sound-item ' +
                      (c.id === selected ? 'selected ' : '') +
                      (playing === c.id ? 'playing' : '')
                    }
                    key={c.id}
                    style={soundStyle(thumbs[c.id]) as CSSProperties}
                    aria-label={`Preview ${c.name}`}
                    onClick={() => selectCue(c.id)}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse') hoverPreview(c.id);
                    }}
                    onPointerLeave={cancelHover}
                  >
                    <Wave rendered={thumbs[c.id]} />
                    <div className="sound-name">
                      <span>{c.name}</span>
                      <Play size={12} />
                    </div>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <p>No sounds found.</p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setCategory('All');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>
            <aside
              className="sound-editor"
              style={soundStyle(rendered) as CSSProperties}
            >
              <div className="editor-title">
                <div>
                  <h1>{cue.name}</h1>
                  <p>{cue.use}</p>
                </div>
                <button
                  className={
                    'play-button ' + (playing === selected ? 'playing' : '')
                  }
                  aria-label={`Play ${cue.name}`}
                  onClick={() => preview(selected)}
                >
                  <Play size={19} fill="currentColor" />
                </button>
              </div>
              <div className="editable-wave">
                <Wave rendered={rendered} large spanSeconds={referenceSpan} />
                <button
                  className="stretch-handle"
                  style={{
                    left: `calc(${Math.min(0.96, rendered.duration / referenceSpan) * 100}% - 12px)`,
                    right: 'auto',
                  }}
                  aria-label="Stretch sound duration"
                  title="Drag to stretch the sound"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = {
                      x: e.clientX,
                      duration: settings.duration,
                      width:
                        e.currentTarget.parentElement!.getBoundingClientRect()
                          .width,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (drag.current)
                      edit(
                        'duration',
                        Math.round(
                          Math.max(
                            0.45,
                            Math.min(
                              2.5,
                              drag.current.duration +
                                ((e.clientX - drag.current.x) /
                                  drag.current.width) *
                                  2,
                            ),
                          ) * 100,
                        ) / 100,
                      );
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                    preview(selected);
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      edit(
                        'duration',
                        Math.max(
                          0.45,
                          Math.min(
                            2.5,
                            settings.duration +
                              (e.key === 'ArrowRight' ? 0.05 : -0.05),
                          ),
                        ),
                      );
                    }
                  }}
                >
                  <MoveHorizontal size={15} />
                </button>
                <span className="wave-duration">
                  {rendered.duration.toFixed(2)} s
                </span>
              </div>
              <div className="editor-spectrum">
                <Spectrum
                  player={engine}
                  active={!!playing}
                  toneShare={playingToneShare}
                />
              </div>
              <div className="editor-section">
                <h2>Variations</h2>
                <div className="variation-grid">
                  {variationRenders.map(({ variant, r }) => (
                    <button
                      key={variant}
                      style={soundStyle(r) as CSSProperties}
                      className={
                        'variation ' +
                        (settings.variant === variant ? 'selected' : '')
                      }
                      aria-pressed={settings.variant === variant}
                      onClick={() => editVariant(variant)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === 'mouse')
                          hoverPreview(selected, variant);
                      }}
                      onPointerLeave={cancelHover}
                    >
                      <Wave rendered={r} spanSeconds={variantsSpan} />
                      <span>{variant}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="editor-section shape-section">
                <h2>Shape</h2>
                <Segments
                  label="Envelope shape"
                  value={settings.shape}
                  options={SHAPES}
                  onChange={(value) => edit('shape', value)}
                  className="shape-segments"
                />
              </div>
              <div className="editor-ranges">
                <Range
                  label="Duration"
                  value={settings.duration}
                  min={0.45}
                  max={2.5}
                  step={0.05}
                  suffix="×"
                  onChange={(value) => edit('duration', value)}
                />
                <Range
                  label="Softness"
                  value={settings.softness}
                  onChange={(value) => edit('softness', value)}
                />
                <Range
                  label="Texture"
                  value={settings.texture}
                  onChange={(value) => edit('texture', value)}
                  disabled={!patch.layers.some((l) => l.kind === 'noise')}
                />
              </div>
              <div className="export-area">
                <div className="export-format">
                  <Segments
                    label="Audio format"
                    value={format}
                    options={['WAV', 'MP3']}
                    onChange={setFormat}
                  />
                  <span>48 kHz</span>
                </div>
                <button
                  className="download-button"
                  disabled={!!busy}
                  onClick={() => void exportOne()}
                >
                  <ArrowDownToLine size={16} />
                  {busy || `Download ${format}`}
                </button>
                <button
                  className="subtle-action"
                  disabled={!!busy}
                  onClick={() => void exportPack(true)}
                >
                  <PackageOpen size={15} />
                  All six variations
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="sandbox">
          <MotionSandbox
            settings={sandboxSettings}
            player={engine}
            onVariant={setSandboxVariant}
            onEnable={async () => {
              unlock();
              if (engine.context?.state === 'running') return true;
              await new Promise<void>((r) => setTimeout(r, 60));
              const ok = unlock();
              setBlocked(!ok);
              return ok;
            }}
            onSignal={(name, r) =>
              signal(CUES.find((c) => c.name === name)?.id || name, r)
            }
          />
        </TabsContent>
      </div>
      {blocked && (
        <output className="unlock-hint">
          Click anywhere once to start hover previews.
          <button
            aria-label="Dismiss audio hint"
            onClick={() => setBlocked(false)}
          >
            <X size={13} />
          </button>
        </output>
      )}
      {notice && (
        <output className="toast" aria-live="polite">
          <Check size={15} />
          {notice}
        </output>
      )}
    </Tabs>
  );
}
