'use client';
/* oxlint-disable next/no-html-link-for-pages -- Document navigation for static hosting. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  Copy,
  FolderOpen,
  CircleDashed,
  Code2,
  Focus,
  Info,
  Waves,
  Sparkles,
  LockKeyhole,
  Play,
  Plus,
  RotateCcw,
  Save,
  Shuffle,
  Square,
  Trash2,
  UnlockKeyhole,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { KitSlider } from '@/components/ui/kit-controls';
import { KitExamples } from '@/components/kit-examples';
import { OrbitLogo } from '@/components/orbit-logo';
import { Wave } from '@/components/signal';
import { CUES, KEYS, MATERIAL_FAMILIES } from '@/lib/audio/catalog';
import {
  createKit,
  getKitPatches,
  KIT_MOODS,
  KIT_ROLES,
  parseKit,
  randomizeKit,
  retuneKit,
  serializeKit,
  updateKitSlot,
  type SoundKit,
  type KitRole,
  type KitMood,
  type KitFamily,
} from '@/lib/audio/kits';
import { SoundPlayer, renderPatch } from '@/lib/audio/engine';
import { downloadKit, downloadRegistryItem } from '@/lib/kit-export';
import './sound-kit-studio.css';

const STORAGE = 'quiet-fx-kits-v1';
const MOOD_COPY: Record<
  KitMood,
  { title: string; description: string; mark: string }
> = {
  calm: { title: 'Calm', description: 'Soft, warm, unhurried.', mark: '◌' },
  focused: {
    title: 'Focused',
    description: 'Precise and understated.',
    mark: '⊞',
  },
  playful: {
    title: 'Playful',
    description: 'A little spring in its step.',
    mark: '⌁',
  },
  expressive: {
    title: 'Expressive',
    description: 'Bright, with personality.',
    mark: '✳',
  },
};
const MOOD_ICONS = {
  calm: CircleDashed,
  focused: Focus,
  playful: Waves,
  expressive: Sparkles,
};
const ROLE_LABELS: Record<KitRole, string> = {
  press: 'Press',
  release: 'Release',
  toggle: 'Toggle',
  confirm: 'Confirm',
  error: 'Error',
  notify: 'Notification',
  transition: 'Transition',
  complete: 'Complete',
};
const ROLE_HELP: Record<KitRole, string> = {
  press: 'A button meets your finger.',
  release: 'A gentle lift.',
  toggle: 'A setting changes state.',
  confirm: 'An action lands.',
  error: 'Something needs attention.',
  notify: 'A quiet interruption.',
  transition: 'Move between places.',
  complete: 'The moment it all comes together.',
};
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const initialKit = () =>
  createKit({ mood: 'calm', seed: 2741, family: 'felt' });
const audioCache = new Map<string, ReturnType<typeof renderPatch>>();
function cachedRender(patch: ReturnType<typeof getKitPatches>[KitRole]) {
  const key = JSON.stringify(patch);
  const cached = audioCache.get(key);
  if (cached) return cached;
  const result = renderPatch(patch);
  if (audioCache.size >= 96) audioCache.delete(audioCache.keys().next().value!);
  audioCache.set(key, result);
  return result;
}

export function SoundKitStudio() {
  const [kit, writeKit] = useState<SoundKit>(initialKit);
  const [nameDraft, setNameDraft] = useState(() => initialKit().name);
  const [saved, setSaved] = useState<SoundKit[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeRole, setActiveRole] = useState<KitRole | ''>('');
  const [editRole, setEditRole] = useState<KitRole | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(35);
  const [panel, setPanel] = useState<'saved' | 'export' | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sequence, setSequence] = useState(false);
  const [undo, setUndo] = useState<SoundKit | null>(null);
  const [player] = useState(() => new SoundPlayer());
  const persistenceBlocked = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playToken = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patches = useMemo(() => getKitPatches(kit), [kit]);
  const rendered = useMemo(
    () =>
      Object.fromEntries(
        KIT_ROLES.map((role) => [role, cachedRender(patches[role])]),
      ) as Record<KitRole, ReturnType<typeof renderPatch>>,
    [patches],
  );
  const isSaved = saved.some(
    (item) => serializeKit(item) === serializeKit(kit),
  );
  const familyName =
    MATERIAL_FAMILIES.find((f) => f.id === kit.family)?.name ?? kit.family;

  const toast = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  }, []);
  const stop = useCallback(() => {
    playToken.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    player.stop();
    setActiveRole('');
    setSequence(false);
  }, [player]);
  const setKit = useCallback(
    (next: SoundKit) => {
      stop();
      setNameDraft(next.name);
      writeKit(next);
    },
    [stop],
  );
  /* oxlint-disable react/react-compiler -- Hydrate and persist this client-only state against external browser storage; error feedback must remain visible. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw && raw.length >= 500_000) throw Error('Saved state is too large');
      if (raw) {
        const state = JSON.parse(raw);
        if (
          state.version !== 1 ||
          !Array.isArray(state.saved) ||
          state.saved.length > 24
        )
          throw Error('Invalid saved state');
        const restored = state.saved.map((item: unknown) =>
          parseKit(JSON.stringify(item)),
        );
        const current = parseKit(JSON.stringify(state.current));
        setSaved(restored);
        setKit(current);
      }
    } catch {
      persistenceBlocked.current = true;
      toast(
        'Saved data could not be restored. It has been preserved; export new kits to keep them.',
      );
    }
    setReady(true);
  }, [toast, setKit]);
  useEffect(() => {
    if (!ready || persistenceBlocked.current) return;
    try {
      localStorage.setItem(
        STORAGE,
        JSON.stringify({ version: 1, current: kit, saved }),
      );
    } catch {
      toast('Browser storage is unavailable. Export your kit to keep it.');
    }
  }, [kit, saved, ready, toast]);
  /* oxlint-enable react/react-compiler */
  useEffect(() => {
    player.setVolume(volume / 100);
  }, [player, volume]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
    };
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('keydown', escape);
      timers.current.forEach(clearTimeout);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      player.stop();
      if (player.context && player.context.state !== 'closed') {
        void player.context.close().catch(() => {
          // A repeated cleanup may finish closing the same context first.
        });
      }
    };
  }, [player, stop]);
  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    if (!panel && dialog.current?.open) dialog.current?.close();
  }, [panel]);

  const playRole = useCallback(
    async (role: KitRole) => {
      stop();
      if (muted) return;
      const token = playToken.current;
      try {
        if (!(await player.enable()) || token !== playToken.current) return;
        player.play(rendered[role]);
        setActiveRole(role);
        timers.current.push(
          setTimeout(
            () => setActiveRole(''),
            Math.max(240, rendered[role].duration * 1000),
          ),
        );
      } catch {
        toast('Audio is unavailable. Try another browser or enable audio.');
      }
    },
    [muted, player, rendered, stop, toast],
  );
  const playSet = async () => {
    if (sequence) {
      stop();
      return;
    }
    stop();
    if (muted) {
      toast('Unmute to preview your kit.');
      return;
    }
    const token = playToken.current;
    try {
      if (!(await player.enable()) || token !== playToken.current) return;
      setSequence(true);
      let offset = 0;
      KIT_ROLES.forEach((role) => {
        player.play(rendered[role], offset, false);
        timers.current.push(
          setTimeout(() => setActiveRole(role), offset * 1000),
        );
        offset += Math.max(0.25, rendered[role].duration) + 0.16;
      });
      timers.current.push(
        setTimeout(() => {
          setActiveRole('');
          setSequence(false);
        }, offset * 1000),
      );
    } catch {
      toast('Audio is unavailable in this browser.');
    }
  };
  const change = (next: SoundKit) => {
    setUndo(kit);
    setKit(next);
  };
  const save = () => {
    if (isSaved) {
      toast('This kit is already saved.');
      return;
    }
    if (saved.length >= 24) {
      toast('Your shelf is full. Export or remove a saved kit first.');
      return;
    }
    setSaved((previous) => [structuredClone(kit), ...previous]);
    toast(
      persistenceBlocked.current
        ? 'Saved for this session. Export your kit to keep it.'
        : 'Kit saved in this browser.',
    );
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 64_000)
        throw Error('Choose a kit JSON file smaller than 64 KB.');
      change(parseKit(await file.text()));
      setPanel(null);
      toast('Kit imported.');
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'This is not a valid Quiet FX kit.',
      );
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const exportFile = async (registry = false) => {
    setBusy(true);
    try {
      if (registry) await downloadRegistryItem(kit);
      else await downloadKit(kit);
      toast(
        registry
          ? 'Editable registry item exported.'
          : 'Kit, WAVs and source exported.',
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Export failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  const integrationCode = `import { createKitPlayer } from './quiet-fx-kit/index.js';\n\nconst sound = createKitPlayer();\nbutton.addEventListener('click', () => sound.play('press'));\n// sound.setMuted(true); sound.dispose();`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(integrationCode);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Select the code below and copy it manually.');
    }
  };

  return (
    <div className="kit-app" data-mood={kit.mood}>
      <header className="kit-header">
        <a className="brand kit-brand" href="/" aria-label="Quiet FX home">
          <OrbitLogo player={player} interactive={false} />
          <span>quiet</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/create" aria-current="page">
            Create a kit
          </a>
          <a href="/studio">Library</a>
          <a href="/studio#sandbox">Sandbox</a>
        </nav>
        <button
          className="kit-primary kit-header-export"
          onClick={() => setPanel('export')}
        >
          <ArrowDownToLine size={15} /> Get the kit
        </button>
      </header>
      <main className="kit-main">
        <div className="kit-intro">
          <div>
            <h1>Create a sound kit.</h1>
            <p>A little character for every interaction.</p>
          </div>
          <button className="kit-text-button" onClick={() => setPanel('saved')}>
            <FolderOpen size={16} />
            My kits{saved.length > 0 && <span>{saved.length}</span>}
          </button>
        </div>
        <section className="kit-direction" aria-label="Sound direction">
          <div className="kit-control-group kit-mood-group">
            <span className="kit-control-label">Mood</span>
            <fieldset className="kit-moods" aria-label="App mood">
              {KIT_MOODS.map((mood) => {
                const MoodIcon = MOOD_ICONS[mood];
                return (
                  <button
                    key={mood}
                    className={kit.mood === mood ? 'is-selected' : ''}
                    aria-pressed={kit.mood === mood}
                    aria-label={`${MOOD_COPY[mood].title} ${MOOD_COPY[mood].description}`}
                    title={MOOD_COPY[mood].description}
                    onClick={() => change(retuneKit(kit, { mood }))}
                  >
                    <MoodIcon size={15} aria-hidden="true" />
                    {MOOD_COPY[mood].title}
                  </button>
                );
              })}
            </fieldset>
          </div>
          <div className="kit-control-group kit-material-group">
            <div className="kit-control-label">
              <div className="kit-material-title">
                <label htmlFor="kit-material">Material</label>
                <details className="kit-material-help">
                  <summary aria-label="About this material">
                    <Info size={13} />
                  </summary>
                  <p>
                    {
                      MATERIAL_FAMILIES.find(
                        (family) => family.id === kit.family,
                      )?.description
                    }
                  </p>
                </details>
              </div>
              <button
                className="kit-icon-button"
                aria-label={
                  kit.locks.family ? 'Unlock material' : 'Lock material'
                }
                aria-pressed={kit.locks.family}
                onClick={() =>
                  setKit({
                    ...kit,
                    locks: { ...kit.locks, family: !kit.locks.family },
                  })
                }
              >
                {kit.locks.family ? (
                  <LockKeyhole size={13} />
                ) : (
                  <UnlockKeyhole size={13} />
                )}
              </button>
            </div>
            <div className="kit-select">
              <select
                id="kit-material"
                value={kit.family}
                title={
                  MATERIAL_FAMILIES.find((family) => family.id === kit.family)
                    ?.description
                }
                onChange={(event) =>
                  change(
                    retuneKit(kit, { family: event.target.value as KitFamily }),
                  )
                }
              >
                {MATERIAL_FAMILIES.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
          <div className="kit-control-group kit-key-group">
            <div className="kit-control-label">
              <label htmlFor="kit-key">Musical key</label>
              <button
                className="kit-icon-button"
                aria-label={kit.locks.key ? 'Unlock key' : 'Lock key'}
                aria-pressed={kit.locks.key}
                onClick={() =>
                  setKit({
                    ...kit,
                    locks: { ...kit.locks, key: !kit.locks.key },
                  })
                }
              >
                {kit.locks.key ? (
                  <LockKeyhole size={13} />
                ) : (
                  <UnlockKeyhole size={13} />
                )}
              </button>
            </div>
            <div className="kit-key-row">
              <div className="kit-select">
                <select
                  id="kit-key"
                  value={kit.key}
                  onChange={(event) =>
                    change(retuneKit(kit, { key: event.target.value }))
                  }
                >
                  {KEYS.map((key) => (
                    <option key={key}>{key}</option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </div>
              <span>{kit.mode}</span>
            </div>
          </div>
          <div className="kit-shuffle-actions">
            <button
              className="kit-shuffle"
              onClick={() => {
                change(randomizeKit(kit, freshSeed()));
                toast('A new set. Your locked sounds stayed.');
              }}
            >
              <Shuffle size={15} /> Shuffle kit
            </button>
            <button
              className="kit-icon-button"
              aria-label="Undo last kit change"
              disabled={!undo}
              onClick={() => {
                if (undo) {
                  setKit(undo);
                  setUndo(null);
                }
              }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </section>
        <div className="kit-workbench">
          <aside className="kit-palette" aria-label="Kit sounds">
            <div className="kit-section-label">
              <h2>
                Your sounds <span className="kit-count">8</span>
              </h2>
              <button
                className="kit-text-button"
                onClick={() => void playSet()}
              >
                {sequence ? <Square size={12} /> : <Play size={12} />}{' '}
                {sequence ? 'Stop' : 'Play all'}
              </button>
            </div>
            <div className="kit-slots">
              {KIT_ROLES.map((role) => {
                const slot = kit.slots[role];
                const cue = CUES.find((c) => c.id === slot.cueId);
                return (
                  <div
                    key={role}
                    className={`kit-slot ${activeRole === role ? 'is-playing' : ''} ${editRole === role ? 'is-editing' : ''}`}
                  >
                    <div className="kit-slot-row">
                      <button
                        className="kit-cue-play"
                        aria-label={`Play ${ROLE_LABELS[role]}`}
                        onClick={() => void playRole(role)}
                      >
                        <Play size={11} fill="currentColor" />
                      </button>
                      <button
                        className="kit-cue-title"
                        aria-expanded={editRole === role}
                        onClick={() =>
                          setEditRole(editRole === role ? null : role)
                        }
                      >
                        <strong>{ROLE_LABELS[role]}</strong>
                        <small>{cue?.name}</small>
                      </button>
                      <div className="kit-wave">
                        <Wave rendered={rendered[role]} />
                      </div>
                      <span
                        className="kit-cue-duration"
                        aria-label={`${ROLE_LABELS[role]} duration`}
                      >
                        {rendered[role].duration.toFixed(2)}s
                      </span>
                      <button
                        className={`kit-icon-button ${slot.locked ? 'is-locked' : ''}`}
                        aria-label={`${slot.locked ? 'Unlock' : 'Lock'} ${ROLE_LABELS[role]}`}
                        aria-pressed={slot.locked}
                        onClick={() =>
                          setKit(
                            updateKitSlot(kit, role, { locked: !slot.locked }),
                          )
                        }
                      >
                        {slot.locked ? (
                          <LockKeyhole size={13} />
                        ) : (
                          <UnlockKeyhole size={13} />
                        )}
                      </button>
                    </div>
                    {editRole === role && (
                      <div className="kit-cue-editor">
                        <div className="kit-select">
                          <select
                            aria-label={`${ROLE_LABELS[role]} sound`}
                            value={slot.cueId}
                            onChange={(e) =>
                              change(
                                updateKitSlot(kit, role, {
                                  cueId: e.target.value,
                                }),
                              )
                            }
                          >
                            {CUES.map((c) => (
                              <option value={c.id} key={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} />
                        </div>
                        <KitSlider
                          label="Softness"
                          value={slot.settings.softness}
                          min={0}
                          max={100}
                          onValueChange={(value) =>
                            setKit(
                              updateKitSlot(kit, role, {
                                settings: { softness: value },
                              }),
                            )
                          }
                        />
                        <KitSlider
                          label="Duration"
                          value={slot.settings.duration}
                          min={0.45}
                          max={2.5}
                          step={0.05}
                          format={(v) => `${v.toFixed(2)}×`}
                          onValueChange={(value) =>
                            setKit(
                              updateKitSlot(kit, role, {
                                settings: { duration: value },
                              }),
                            )
                          }
                        />
                        <button
                          className="kit-text-button"
                          onClick={() => void playRole(role)}
                        >
                          <Play size={12} />
                          Preview changes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
          <section
            className="kit-stage"
            aria-label="Interactive sound examples"
          >
            <KitExamples
              mood={kit.mood}
              activeRole={activeRole}
              onSound={(role) => void playRole(role)}
            />
            <div className="kit-monitor">
              <span>
                <span
                  className={
                    activeRole
                      ? 'kit-status-light is-playing'
                      : 'kit-status-light'
                  }
                />
                {activeRole
                  ? ROLE_HELP[activeRole]
                  : 'Try an interaction to hear your kit.'}
              </span>
              <div>
                <button
                  className="kit-icon-button"
                  aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                  aria-pressed={muted}
                  onClick={() => {
                    stop();
                    setMuted(!muted);
                    if (!muted) player.mute();
                  }}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  aria-label="Monitor volume"
                  min="0"
                  max="70"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
                <output>{volume}%</output>
              </div>
            </div>
          </section>
        </div>
        <footer className="kit-footer">
          <div className="kit-name">
            <label htmlFor="kit-name">Your kit</label>
            <input
              id="kit-name"
              aria-label="Kit name"
              maxLength={64}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                const name =
                  Array.from(nameDraft)
                    .map((character) => {
                      const code = character.charCodeAt(0);
                      return code < 32 || code === 127 ? ' ' : character;
                    })
                    .join('')
                    .trim()
                    .slice(0, 64) || 'Untitled kit';
                setNameDraft(name);
                setKit({ ...kit, name });
              }}
            />
            <span>
              {familyName} · {kit.key} {kit.mode.toLowerCase()}
            </span>
          </div>
          <div className="kit-footer-actions">
            <button className="kit-secondary" onClick={save}>
              {isSaved ? <Check size={15} /> : <Save size={15} />}{' '}
              {isSaved ? 'Saved' : 'Save kit'}
            </button>
          </div>
        </footer>
        <p className="kit-bottom-note">
          Free and open source.{' '}
          <a href="https://github.com/filipeafns/quiet-fx/blob/main/LICENSE">
            MIT licensed.
          </a>
        </p>
      </main>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      <dialog
        ref={dialog}
        className="kit-dialog"
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
        aria-labelledby="kit-dialog-title"
      >
        <div className="kit-dialog-heading">
          <div>
            <h2 id="kit-dialog-title">
              {panel === 'saved'
                ? 'Your saved kits'
                : 'Take your sound with you.'}
            </h2>
            <p>
              {panel === 'saved'
                ? 'Stored in this browser. Export a kit to keep a copy.'
                : 'Eight sounds, their recipes, and the code. All yours.'}
            </p>
          </div>
          <button
            className="kit-icon-button"
            aria-label="Close dialog"
            onClick={() => setPanel(null)}
          >
            <X size={18} />
          </button>
        </div>
        {panel === 'saved' ? (
          <>
            <div className="kit-saved-list">
              {saved.length === 0 ? (
                <div className="kit-empty">
                  <FolderOpen size={28} />
                  <p>Your next favorite set belongs here.</p>
                  <button
                    className="kit-secondary"
                    onClick={() => {
                      save();
                      setPanel(null);
                    }}
                  >
                    <Plus size={14} />
                    Save this kit
                  </button>
                </div>
              ) : (
                saved.map((item, index) => (
                  <div className="kit-saved-row" key={`${item.seed}-${index}`}>
                    <button
                      onClick={() => {
                        change(structuredClone(item));
                        setPanel(null);
                        toast('Saved kit loaded.');
                      }}
                    >
                      <strong>{item.name}</strong>
                      <small>
                        {MOOD_COPY[item.mood].title} · {item.key} {item.mode}
                      </small>
                    </button>
                    <button
                      className="kit-icon-button"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => {
                        setSaved(saved.filter((_, i) => i !== index));
                        toast('Removed from saved kits.');
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              className="kit-secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={14} />
              Import kit JSON
            </button>
          </>
        ) : (
          <>
            <div className="kit-export-summary">
              <span className="kit-mood-mark">{MOOD_COPY[kit.mood].mark}</span>
              <div>
                <strong>{kit.name}</strong>
                <small>8 WAV files · editable source · kit.json</small>
              </div>
            </div>
            <button
              className="kit-primary kit-download"
              disabled={busy}
              onClick={() => void exportFile()}
            >
              <ArrowDownToLine size={16} />
              {busy ? 'Preparing your kit…' : 'Download kit'}
            </button>
            <p className="kit-export-instruction">
              Unzip into your project. Connect sounds to your interactions.
            </p>
            <div className="kit-code">
              <button
                className="kit-icon-button"
                aria-label="Copy integration code"
                onClick={() => void copy()}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <pre>
                <code>{integrationCode}</code>
              </pre>
            </div>
            <details className="kit-advanced-export">
              <summary>Use with shadcn</summary>
              <p>
                Download an editable registry item for this exact kit. Install
                the local file with the shadcn CLI.
              </p>
              <code>npx shadcn@latest add ./quiet-kit.json</code>
              <button
                className="kit-secondary"
                disabled={busy}
                onClick={() => void exportFile(true)}
              >
                <Code2 size={14} />
                Download registry item
              </button>
            </details>
            <button
              className="kit-text-button"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={13} />
              Import another kit
            </button>
          </>
        )}
        {notice && (
          <output className="kit-dialog-notice" aria-live="polite">
            {notice}
          </output>
        )}
      </dialog>
      <output
        className={`kit-toast ${notice ? 'is-visible' : ''}`}
        aria-live="polite"
      >
        {panel ? '' : notice}
      </output>
    </div>
  );
}
