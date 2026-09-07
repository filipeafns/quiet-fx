'use client';
/* oxlint-disable next/no-html-link-for-pages -- Static vinext exports use document navigation. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, Copy, CodeXml } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrbitLogo } from '@/components/orbit-logo';
import { SoundField } from '@/components/sound-field';
import { CUES, DEFAULTS, makePatch } from '@/lib/audio/catalog';
import { SoundPlayer, renderPatch, type Rendered } from '@/lib/audio/engine';

const REPO = 'https://github.com/filipeafns/quiet-fx';
const INSTALL = 'npm install github:filipeafns/quiet-fx#v0.4.1';
const EXAMPLE = `import { CUES, DEFAULTS, makePatch, renderPatch, SoundPlayer } from 'quiet-fx';

const button = document.createElement('button');
button.textContent = 'Play a little sound';
document.body.append(button);
const player = new SoundPlayer();
const cue = CUES.find(({ id }) => id === 'sparkle');
const sound = renderPatch(makePatch(cue, DEFAULTS));

button.addEventListener('click', async () => {
  if (await player.enable()) player.play(sound);
});`;
export function Homepage() {
  const [player] = useState(() => new SoundPlayer());
  const cache = useRef(new Map<string, Rendered>());
  const [copied, setCopied] = useState(false),
    [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => player.stop(), [player]);
  useEffect(() => {
    const gesture = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.ctrlKey || e.metaKey || e.altKey))
        return;
      if (
        e instanceof PointerEvent &&
        ((e.type === 'pointerdown' && e.pointerType !== 'mouse') ||
          (e.type === 'pointerup' && e.pointerType === 'mouse'))
      )
        return;
      try {
        if (player.unlock()) setBlocked(false);
      } catch {}
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('pointerdown', gesture, true);
    document.addEventListener('pointerup', gesture, true);
    document.addEventListener('keydown', gesture, true);
    document.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('pointerdown', gesture, true);
      document.removeEventListener('pointerup', gesture, true);
      document.removeEventListener('keydown', gesture, true);
      document.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      stop();
      void player.context?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [player, stop]);
  const audition = useCallback(
    (id: string, takeOver: boolean, play: boolean) => {
      let rendered = cache.current.get(id);
      if (!rendered) {
        rendered = renderPatch(
          makePatch(
            CUES.find((c) => c.id === id)!,
            DEFAULTS,
          ),
        );
        cache.current.set(id, rendered);
      }
      if (!play || document.hidden) return { rendered, at: null };
      try {
        player.unlock();
      } catch {
        return { rendered, at: null };
      }
      if (player.context?.state !== 'running') {
        setBlocked(true);
        return { rendered, at: null };
      }
      setBlocked(false);
      if (takeOver) stop();
      return {
        rendered,
        at:
          player.active.size < 3 ? player.play(rendered, 0, false, 0.55) : null,
      };
    },
    [player, stop],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      const command = document.querySelector('.install-command');
      if (command) {
        const range = document.createRange();
        range.selectNodeContents(command);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }
  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="brand" href="/" aria-label="Quiet FX home">
          <OrbitLogo player={player} />
          <span>quiet</span>
        </a>
        <nav aria-label="Main navigation">
          <a href={REPO}>
            <CodeXml size={16} />
            <span>GitHub</span>
          </a>
          <a className="landing-studio-link" href="/studio">
            Open studio <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      <main>
        <section className="landing-intro">
          <div className="landing-wordmark" aria-label="Quiet FX">
            <OrbitLogo player={player} className="hero-orbit" interactive />
            <span>quiet</span>
          </div>
          <div className="landing-intro-copy">
            <h1>Sound, with a lighter touch.</h1>
            <p>
              Gentle, open-source UI sound effects
              <br className="wide-break" /> for interfaces that feel good to
              use.
            </p>
          </div>
        </section>
        <div className="landing-field">
          <SoundField player={player} onAudition={audition} onStop={stop} />
          {blocked && (
            <p className="field-unlock-note">
              Click anywhere, then explore by hovering.
            </p>
          )}
        </div>
        <section className="landing-library landing-section">
          <div>
            <p className="landing-eyebrow">A small library. Room to play.</p>
            <h2>
              A tap. A turn.
              <br />A tiny bit of delight.
            </h2>
          </div>
          <div className="landing-library-detail">
            <p>
              72 original sounds, each with six variations. Change the key,
              soften the texture, stretch the moment. Then hear it with motion.
            </p>
            <div className="landing-actions">
              <a className="landing-studio-link" href="/studio">
                Open studio <ArrowRight size={17} />
              </a>
              <button
                className="landing-tap"
                onClick={() => {
                  void player
                    .enable()
                    .then((ready) => {
                      if (ready) audition('tap', true, true);
                    })
                    .catch(() => {});
                }}
                aria-label="Tap to hear a Quiet sound"
              >
                Tap
              </button>
            </div>
            <div className="landing-facts">
              <span>432 variations</span>
              <span>WAV + MP3</span>
              <span>MIT licensed</span>
            </div>
          </div>
        </section>
        <section className="landing-install landing-section" id="install">
          <div className="install-heading">
            <div>
              <p className="landing-eyebrow">Yours to build with</p>
              <h2>
                Small enough to
                <br />
                go anywhere.
              </h2>
            </div>
            <p>
              Procedural audio. No recordings to load.
              <br />
              A JavaScript library with no runtime dependencies.
            </p>
            <a className="landing-text-link" href={`${REPO}#readme`}>
              Read the documentation <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="install-example">
            <div className="install-command-row">
              <code className="install-command">{INSTALL}</code>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  copied ? 'Copied install command' : 'Copy install command'
                }
                onClick={() => void copy()}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </Button>
            </div>
            <pre>
              <code>{EXAMPLE}</code>
            </pre>
            <p className="install-footnote">
              Install directly from GitHub. Works with Web Audio in modern
              browsers.
            </p>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>
          Quiet FX · Made by{' '}
          <a href="https://github.com/filipeafns">Filipe Soares</a>
        </span>
        <a href={`${REPO}/blob/main/LICENSE`}>
          Open source, by design. <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
