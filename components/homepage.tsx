'use client';
/* oxlint-disable next/no-html-link-for-pages -- Static vinext exports use document navigation. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import { InstallKit } from '@/components/install-kit';
import { OrbitLogo } from '@/components/orbit-logo';
import { SoundField } from '@/components/sound-field';
import { CUES, DEFAULTS, makePatch } from '@/lib/audio/catalog';
import { SoundPlayer, renderPatch, type Rendered } from '@/lib/audio/engine';

const REPO = 'https://github.com/filipeafns/quiet-fx';
export function Homepage() {
  const [player] = useState(() => new SoundPlayer());
  const cache = useRef(new Map<string, Rendered>());
  const [blocked, setBlocked] = useState(false);
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
  return (
    <div className="landing">
      <main>
        <header className="landing-intro">
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
            <nav className="landing-actions" aria-label="Main navigation">
              <a className="landing-github-link" href={REPO}>
                <Star size={16} /> Star on GitHub
              </a>
              <a className="landing-studio-link" href="/studio">
                Open Studio <ArrowUpRight size={16} />
              </a>
            </nav>
          </div>
        </header>
        <div className="landing-field">
          <SoundField player={player} onAudition={audition} onStop={stop} />
          {blocked && (
            <p className="field-unlock-note">
              Click anywhere, then explore by hovering.
            </p>
          )}
        </div>
        <section className="landing-install landing-section" id="install">
          <div className="install-heading">
            <h2>Use Quiet FX.</h2>
            <p>Copy the code or bring the setup to your coding assistant.</p>
            <a className="landing-text-link" href={`${REPO}#readme`}>
              Documentation <ArrowUpRight size={15} />
            </a>
          </div>
          <InstallKit cueId="sparkle" settings={DEFAULTS} />
        </section>
      </main>
      <footer className="landing-footer">
        <span>
          Quiet FX · Made by{' '}
          <a href="https://github.com/filipeafns">Filipe Soares</a>
        </span>
        <a href={`${REPO}/blob/main/LICENSE`}>MIT License</a>
      </footer>
    </div>
  );
}
