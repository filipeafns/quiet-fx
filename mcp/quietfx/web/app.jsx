import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import {
  Play,
  Square,
  Check,
  Plus,
  Download,
  Copy,
  Search,
  X,
  Volume2,
} from 'lucide-react';
import { zipSync, strToU8 } from 'fflate';
import { SoundField } from '../vendor/ui/sound-field.tsx';
import { OrbitLogo } from '../vendor/ui/orbit-logo.tsx';
import {
  CUES,
  DEFAULTS,
  VOICES,
  VARIANTS,
  makePatch,
  renderPatch,
  SoundPlayer,
  waveform,
  wavBytes,
} from '../vendor/index.js';
import { soundStyle } from '../vendor/color.js';
import {
  SOUNDS,
  COLLECTIONS,
  makeCollection,
  integrationGuide,
} from '../src/catalog.mjs';
import license from './license.txt';
import { registerSelectionReader } from './browser-tools.mjs';

const embedded = window.parent !== window;
const host = embedded
  ? new App({ name: 'Quiet FX', version: '0.1.0' }, {}, { autoResize: true })
  : null;
const validIds = new Set(SOUNDS.map((s) => s.id));
function restore() {
  try {
    const raw = embedded
      ? window.openai?.widgetState
      : JSON.parse(localStorage.getItem('quietfx-selection-v1') || 'null');
    return {
      ids: Array.isArray(raw?.ids)
        ? raw.ids.filter((id) => validIds.has(id))
        : [],
      voice: VOICES.includes(raw?.voice) ? raw.voice : 'Soft',
      variant: VARIANTS.includes(raw?.variant) ? raw.variant : 'Normal',
    };
  } catch {
    return { ids: [], voice: 'Soft', variant: 'Normal' };
  }
}
let bridgeReady;
async function requestTool(name, args) {
  let result;
  if (host) {
    await bridgeReady;
    result = await host.callServerTool({ name, arguments: args });
  } else {
    const response = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, arguments: args }),
    });
    if (!response.ok)
      throw new Error('The sound tools are unavailable. Try again.');
    result = await response.json();
  }
  if (result.isError)
    throw new Error(
      result.content?.[0]?.text ||
        'The sound tool could not complete this request.',
    );
  return result.structuredContent;
}
const renderedCache = new Map();
function renderedSound(id, voice, variant) {
  const key = `${id}:${voice}:${variant}`;
  if (!renderedCache.has(key)) {
    if (renderedCache.size >= 128)
      renderedCache.delete(renderedCache.keys().next().value);
    renderedCache.set(
      key,
      renderPatch(
        makePatch(
          CUES.find((c) => c.id === id),
          { ...DEFAULTS, voice, variant },
        ),
      ),
    );
  }
  return renderedCache.get(key);
}
async function saveFile(bytes, type, filename) {
  if (host) {
    await bridgeReady;
    if (!host.getHostCapabilities()?.downloadFile)
      throw new Error(
        'This chat host cannot download files yet. Use Copy for Codex to recreate the exact selected sounds.',
      );
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const result = await host.downloadFile({
      contents: [
        {
          type: 'resource',
          resource: {
            uri: `quietfx://exports/${filename}`,
            mimeType: type,
            blob: btoa(binary),
          },
        },
      ],
    });
    if (result.isError)
      throw new Error(
        'The host cancelled or blocked the download. Your selected sounds are still here.',
      );
    return;
  }
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
function SoundRow({ sound, selected, onSelect, onPlay, voice, variant }) {
  const rendered = renderedSound(sound.id, voice, variant);
  const bars = waveform(rendered.data, 36);
  return (
    <li
      className="sound-row"
      data-selected={selected}
      style={soundStyle(rendered)}
    >
      <button
        className="audition"
        onClick={() => onPlay(sound.id)}
        aria-label={`Preview ${sound.name}`}
      >
        <span className="sound-title">{sound.name}</span>
        <span className="sound-use">{sound.use}</span>
        <span className="wave-line">
          <Play size={12} aria-hidden="true" />
          <svg className="waveform" viewBox="0 0 144 28" aria-hidden="true">
            {bars.map((v, i) => (
              <line
                key={i}
                x1={i * 4 + 2}
                x2={i * 4 + 2}
                y1={14 - Math.max(1, v * 12)}
                y2={14 + Math.max(1, v * 12)}
              />
            ))}
          </svg>
          <span className="duration">{rendered.duration.toFixed(2)}s</span>
        </span>
      </button>
      <button
        className="select-sound icon-button"
        aria-pressed={selected}
        aria-label={`${selected ? 'Remove' : 'Add'} ${sound.name}${selected ? ' from' : ' to'} collection`}
        onClick={() => onSelect(sound.id)}
      >
        {selected ? <Check size={17} /> : <Plus size={17} />}
      </button>
    </li>
  );
}
function QuietPicker() {
  const [initial] = useState(restore);
  const [selected, setSelected] = useState(() => new Set(initial.ids));
  const [voice, setVoice] = useState(initial.voice),
    [variant, setVariant] = useState(initial.variant);
  const [query, setQuery] = useState(''),
    [collectionId, setCollectionId] = useState('');
  const [results, setResults] = useState(SOUNDS),
    [selectedOnly, setSelectedOnly] = useState(false);
  const [current, setCurrent] = useState(null),
    [enabled, setEnabled] = useState(false),
    [volume, setVolume] = useState(35);
  const [error, setError] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(null),
    [copyOk, setCopyOk] = useState(false);
  const [player] = useState(() => new SoundPlayer());
  const selectionSnapshot = useRef(null);
  useEffect(() => {
    selectionSnapshot.current = { ids: [...selected], voice, variant };
  }, [selected, voice, variant]);
  useEffect(() => registerSelectionReader(document.modelContext, () => ({ ...selectionSnapshot.current, ids: [...selectionSnapshot.current.ids] })), []);
  const requestNumber = useRef(0),
    fieldEnabled = useRef(false),
    copyRef = useRef(null),
    copyButtonRef = useRef(null);
  const collection = COLLECTIONS.find((c) => c.id === collectionId);
  const wholeCollectionSelected = collection?.ids.every((id) =>
    selected.has(id),
  );
  const stop = useCallback(() => player.stop(), [player]);
  const syncSelection = useCallback((ids, nextVoice, nextVariant) => {
    const state = { ids: [...ids], voice: nextVoice, variant: nextVariant };
    try {
      if (embedded) window.openai?.setWidgetState?.(state);
      else localStorage.setItem('quietfx-selection-v1', JSON.stringify(state));
    } catch {
      /* Storage may be unavailable in an iframe. In-memory selection still works. */
    }
    if (host && bridgeReady)
      void bridgeReady
        .then(() =>
          host.updateModelContext({
            structuredContent: { quietfxSelection: state },
            content: [
              {
                type: 'text',
                text: `The user explicitly selected Quiet FX sound IDs: ${state.ids.join(', ') || '(none)'}. Voice: ${nextVoice}. Variant: ${nextVariant}. Use these exact IDs for requested exports. No files have been written.`,
              },
            ],
          }),
        )
        .catch(() => {
          setStatus('Selection kept here. Chat context could not be updated.');
        });
  }, []);
  useEffect(() => {
    syncSelection(selected, voice, variant);
  }, [selected, voice, variant, syncSelection]);
  useEffect(() => {
    const key = (event) => {
      if (event.key === 'Escape') {
        stop();
        fieldEnabled.current = false;
        setEnabled(false);
      }
    };
    const visibility = () => {
      if (document.hidden) {
        stop();
        fieldEnabled.current = false;
        setEnabled(false);
      }
    };
    const pagehide = () => {
      stop();
      void player.context?.close();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      pagehide();
    };
  }, [player, stop]);
  useEffect(() => {
    if (!host) return;
    const onToolResult = (result) => {
      const data = result.structuredContent;
      if (data?.kind === 'picker' && Array.isArray(data.sounds)) {
        setResults(data.sounds.filter((s) => validIds.has(s.id)));
        setQuery(data.query || '');
        setCollectionId(data.collection?.id || '');
      }
    };
    host.addEventListener('toolresult', onToolResult);
    bridgeReady = host.connect(undefined, { timeout: 10_000 });
    void bridgeReady.catch(() =>
      setError(
        'Chat host connection unavailable. Reopen the picker to try again.',
      ),
    );
    return () => host.removeEventListener('toolresult', onToolResult);
  }, []);
  useEffect(() => {
    player.setVolume(volume / 100);
  }, [volume, player]);
  useEffect(() => {
    stop();
  }, [voice, variant, stop]);
  const search = async (text = query, group = collectionId) => {
    const ticket = ++requestNumber.current;
    setLoading(true);
    setError('');
    try {
      const data = await requestTool('search_sounds', {
        query: text,
        ...(group ? { collection_id: group } : {}),
        limit: 72,
      });
      if (ticket === requestNumber.current) setResults(data.sounds);
    } catch (e) {
      if (ticket === requestNumber.current) setError(e.message);
    } finally {
      if (ticket === requestNumber.current) setLoading(false);
    }
  };
  const toggle = (id) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const play = async (id) => {
    try {
      if (!(await player.enable()))
        throw new Error('Audio is blocked. Click Preview again to enable it.');
      setError('');
      setCurrent(id);
      player.play(renderedSound(id, voice, variant));
    } catch (e) {
      setError(
        e.message ||
          'Audio is unavailable in this browser. You can still export WAV files.',
      );
    }
  };
  const audition = useCallback(
    (id, takeOver, shouldPlay) => {
      const rendered = renderedSound(id, voice, variant);
      setCurrent(id);
      if (
        !shouldPlay ||
        !fieldEnabled.current ||
        document.hidden ||
        player.context?.state !== 'running'
      )
        return { rendered, at: null };
      if (takeOver) player.stop();
      return {
        rendered,
        at:
          player.active.size < 3 ? player.play(rendered, 0, false, 0.55) : null,
      };
    },
    [player, voice, variant],
  );
  const enableField = async () => {
    if (enabled) {
      fieldEnabled.current = false;
      setEnabled(false);
      stop();
      return;
    }
    try {
      const ready = await player.enable();
      fieldEnabled.current = ready;
      setEnabled(ready);
      if (!ready) setError('Audio is blocked. Try enabling it again.');
    } catch {
      setError(
        'Audio is unavailable. You can still export the selected sounds.',
      );
    }
  };
  const activateField = (event) => {
    if (!event.target.closest('.field-surface')) return;
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
    if (event.type === 'pointerup' && event.pointerType === 'mouse') return;
    if (
      event.type === 'keydown' &&
      ![
        'Enter',
        ' ',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(event.key)
    )
      return;
    try {
      fieldEnabled.current = player.unlock();
      setEnabled(fieldEnabled.current);
    } catch {
      setError('Audio is unavailable. You can still export selected sounds.');
    }
  };
  const prepare = async () => {
    const args = { ids: [...selected], voice, variant };
    const data = await requestTool('get_sound_assets', args);
    return data.collection;
  };
  const exportZip = async () => {
    setBusy(true);
    setError('');
    setStatus('Preparing your selected sounds…');
    stop();
    try {
      const pack = await prepare();
      await new Promise((resolve) => window.setTimeout(resolve, 30));
      const files = {
        'collection.json': strToU8(JSON.stringify(pack, null, 2)),
        LICENSE: strToU8(license),
        'README.md': strToU8(integrationGuide(pack)),
      };
      for (const sound of pack.sounds)
        files[sound.file] = wavBytes(renderPatch(sound.patch, pack.sampleRate));
      await saveFile(
        zipSync(files, { level: 6 }),
        'application/zip',
        'quietfx-collection.zip',
      );
      setStatus(
        `Exported ${pack.sounds.length} WAV files with recipes and MIT license.`,
      );
    } catch (e) {
      setError(e.message);
      setStatus('');
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    // Keep the text visible even when clipboard permission or browser activation is unavailable.
    const pack = makeCollection({ ids: [...selected], voice, variant });
    const text = integrationGuide(pack);
    setCopiedText(text);
    setCopyOk(false);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopyOk(true);
    } catch {
      window.setTimeout(() => {
        copyRef.current?.focus();
        copyRef.current?.select();
      }, 0);
    }
  };
  const closeCopy = () => {
    setCopiedText(null);
    copyButtonRef.current?.focus();
  };
  const visible = selectedOnly
    ? SOUNDS.filter((s) => selected.has(s.id))
    : results;
  const currentSound = SOUNDS.find((s) => s.id === current);
  return (
    <main className="picker">
      <header className="intro">
        <div className="wordmark">
          <OrbitLogo player={player} className="hero-orbit" interactive />
          <span>quiet</span>
        </div>
        <div className="intro-copy">
          <h1>Sound, with a lighter touch.</h1>
          <p>Find a few sounds that feel like your project.</p>
        </div>
      </header>
      <section
        className="explore"
        aria-label="Interactive sound exploration"
        onPointerDownCapture={activateField}
        onPointerUpCapture={activateField}
        onKeyDownCapture={activateField}
      >
        <SoundField player={player} onAudition={audition} onStop={stop} />
        <div className="field-controls">
          <button onClick={enableField} aria-pressed={enabled}>
            {enabled ? <Volume2 size={15} /> : <Play size={15} />}{' '}
            {enabled ? 'Sound field on' : 'Enable sound field'}
          </button>
          <button
            disabled={!current}
            onClick={() => {
              if (current) toggle(current);
            }}
            aria-pressed={current ? selected.has(current) : false}
          >
            {current && selected.has(current) ? (
              <Check size={15} />
            ) : (
              <Plus size={15} />
            )}{' '}
            {currentSound
              ? `${selected.has(current) ? 'Added' : 'Add'} ${currentSound.name}`
              : 'Explore to find a sound'}
          </button>
        </div>
      </section>
      <section className="library" aria-labelledby="library-title">
        <div className="section-title">
          <h2 id="library-title">Make it yours.</h2>
          <div className="monitor">
            <label htmlFor="volume">
              <Volume2 size={15} />
              <span className="sr-only">Preview volume</span>
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(+e.target.value)}
            />
            <button
              className="icon-button"
              onClick={() => {
                stop();
                fieldEnabled.current = false;
                setEnabled(false);
              }}
              aria-label="Stop all sounds"
            >
              <Square size={13} />
            </button>
          </div>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <Search size={17} />
          <input
            aria-label="Search sounds"
            placeholder="Try subtle confirmation, warm, or page turn"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="icon-button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                void search('', collectionId);
              }}
            >
              <X size={16} />
            </button>
          )}
          <button type="submit">Search</button>
        </form>
        <nav className="collections" aria-label="Sound collections">
          <button
            aria-pressed={!collectionId}
            onClick={() => {
              setCollectionId('');
              setSelectedOnly(false);
              void search(query, '');
            }}
          >
            All sounds
          </button>
          {COLLECTIONS.map((c) => (
            <button
              key={c.id}
              aria-pressed={collectionId === c.id}
              onClick={() => {
                setCollectionId(c.id);
                setSelectedOnly(false);
                void search(query, c.id);
              }}
            >
              {c.name}
            </button>
          ))}
        </nav>
        <div className="library-tools">
          <div className="tone-controls">
            <label>
              Voice
              <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                {VOICES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Variation
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              >
                {VARIANTS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          {collection && (
            <button
              onClick={() =>
                setSelected((prev) =>
                  wholeCollectionSelected
                    ? new Set(
                        [...prev].filter((id) => !collection.ids.includes(id)),
                      )
                    : new Set([...prev, ...collection.ids]),
                )
              }
            >
              {wholeCollectionSelected ? (
                <Check size={14} />
              ) : (
                <Plus size={14} />
              )}{' '}
              {wholeCollectionSelected ? 'Remove collection' : 'Add collection'}
            </button>
          )}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button
              onClick={() => {
                void search();
              }}
            >
              Retry search
            </button>
          </div>
        )}
        <div className="results-label">
          <output>
            {loading ? 'Finding sounds…' : `${visible.length} sounds`}
          </output>
          <button
            aria-pressed={selectedOnly}
            onClick={() => setSelectedOnly((v) => !v)}
          >
            {selectedOnly ? 'Show all results' : `Selected (${selected.size})`}
          </button>
        </div>
        {!visible.length && !loading ? (
          <div className="empty">
            <p>
              {selectedOnly ? 'Your collection is empty.' : 'No sounds found.'}
            </p>
            <span>
              {selectedOnly
                ? 'Add a sound or choose a collection.'
                : 'Try “tap”, “warm”, or remove a collection filter.'}
            </span>
          </div>
        ) : (
          <ul
            className="sound-grid"
            aria-label="Sound results"
            aria-busy={loading}
          >
            {visible.map((sound) => (
              <SoundRow
                key={sound.id}
                sound={sound}
                selected={selected.has(sound.id)}
                onSelect={toggle}
                onPlay={play}
                voice={voice}
                variant={variant}
              />
            ))}
          </ul>
        )}
      </section>
      <footer className="selection-bar">
        <div className="selection-summary">
          <strong>
            {selected.size ? `${selected.size} selected` : 'Your collection'}
          </strong>
          <span>
            {selected.size
              ? 'WAV + recipes + MIT license'
              : 'Add sounds individually or from a collection.'}
          </span>
        </div>
        <div className="selection-actions">
          {selected.size > 0 && (
            <button
              className="clear-selection"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          )}
          <button
            ref={copyButtonRef}
            disabled={!selected.size || busy}
            onClick={() => {
              void copy();
            }}
          >
            <Copy size={15} />
            Copy for Codex
          </button>
          <button
            className="primary"
            disabled={!selected.size || busy}
            onClick={() => {
              void exportZip();
            }}
          >
            <Download size={15} />
            {busy ? 'Preparing…' : 'Download ZIP'}
          </button>
        </div>
      </footer>
      <output className="status-message">{status}</output>
      {copiedText !== null && (
        <div className="dialog-backdrop">
          <dialog
            open
            className="copy-dialog"
            aria-modal="true"
            aria-labelledby="copy-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                closeCopy();
                return;
              }
              if (e.key === 'Tab') {
                const items = [
                  ...e.currentTarget.querySelectorAll('button,textarea'),
                ];
                const first = items[0],
                  last = items.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div>
              <h2 id="copy-title">
                {copyOk ? 'Copied for Codex.' : 'Copy your collection.'}
              </h2>
              <button
                className="icon-button"
                autoFocus
                aria-label="Close copy instructions"
                onClick={closeCopy}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              {copyOk
                ? 'Paste this into your coding assistant to recreate the selected sounds in your project.'
                : 'Select the text below and copy it. Your browser did not allow clipboard access.'}
            </p>
            <textarea
              ref={copyRef}
              readOnly
              aria-label="Codex integration instructions"
              value={copiedText}
            />
            <button
              onClick={() => {
                copyRef.current.focus();
                copyRef.current.select();
              }}
            >
              Select all instructions
            </button>
            <small>
              Text includes exact sound recipes. Audio files are in the ZIP.
            </small>
          </dialog>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')).render(<QuietPicker />);
