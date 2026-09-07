'use client';

import { useEffect, useRef } from 'react';
import { CUES, DEFAULTS, makePatch } from '@/lib/audio/catalog';
import { SoundPlayer, renderPatch, type Rendered } from '@/lib/audio/engine';
import {
  ORBIT_COUNT,
  ORBIT_WIDTH,
  ORBIT_HEIGHT,
  orbitPose,
  orbitHit,
} from '@/lib/orbit-logo';

const CIRCLES = Array.from({ length: ORBIT_COUNT }, (_, index) => index);
const MELODY = [0, 2, 4, 7, 9, 12, 9, 7, 4, 2, 7, 4];
const PEARL = CUES.find(({ id }) => id === 'pearl')!;

export function OrbitLogo({
  player,
  className = '',
  interactive = false,
  musicalKey = 'C',
  mode = 'Pentatonic',
  voice = 'Soft',
}: {
  player: SoundPlayer;
  className?: string;
  interactive?: boolean;
  musicalKey?: string;
  mode?: string;
  voice?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const phase = useRef(0);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ellipses = [...svg.querySelectorAll('ellipse')];
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sounds = new Map<number, Rendered>();
    const entered = new Set<number>();
    const flashes = new Map<number, number>();
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let previous = 0;
    let visible = true;
    let suppressed = false;
    let disposed = false;
    let request = 0;
    let keyboardCircle = 0;
    let lastNote = -Infinity;

    function playNote(index: number, explicit = false) {
      if (document.hidden || !visible || disposed) return;
      const token = ++request;
      const generation = player.generation;
      const play = () => {
        if (
          disposed ||
          token !== request ||
          generation !== player.generation ||
          document.hidden ||
          !visible ||
          suppressed ||
          player.active.size >= 3 ||
          performance.now() - lastNote < 95
        )
          return;
        let sound = sounds.get(index);
        if (!sound) {
          const ratio = 2 ** (MELODY[index] / 12);
          sound = renderPatch(
            makePatch(
              {
                ...PEARL,
                recipe: {
                  ...PEARL.recipe,
                  layers: PEARL.recipe.layers.map((layer) => ({
                    ...layer,
                    frequency: layer.frequency
                      ? layer.frequency * ratio
                      : undefined,
                    glideTo: layer.glideTo ? layer.glideTo * ratio : undefined,
                  })),
                },
              },
              {
                ...DEFAULTS,
                key: musicalKey,
                mode,
                voice,
                variant: 'Light',
                softness: 60,
              },
            ),
          );
          sounds.set(index, sound);
        }
        if (player.play(sound, 0, false, 0.55) !== null) {
          lastNote = performance.now();
          flashes.set(index, lastNote + 220);
          wake();
        }
      };
      if (explicit) {
        suppressed = false;
        void player
          .enable()
          .then((ready) => {
            if (ready) play();
          })
          .catch(() => {});
      } else if (
        !suppressed &&
        player.context?.state === 'running' &&
        !player.muted
      ) {
        play();
      }
    }

    function draw(now: number) {
      frame = 0;
      if (!visible || document.hidden || disposed) {
        previous = 0;
        return;
      }
      if (!media.matches && previous) {
        phase.current =
          (phase.current + Math.min(now - previous, 64) / 14400) % 1;
      }
      previous = now;
      const bounds = pointer ? svg!.getBoundingClientRect() : null;
      const x =
        pointer && bounds
          ? ((pointer.x - bounds.left) / bounds.width) * ORBIT_WIDTH
          : -1;
      const y =
        pointer && bounds
          ? ((pointer.y - bounds.top) / bounds.height) * ORBIT_HEIGHT
          : -1;
      ellipses.forEach((ellipse, index) => {
        const pose = orbitPose(index, media.matches ? 0 : phase.current);
        ellipse.setAttribute('cx', pose.cx.toFixed(3));
        ellipse.setAttribute('cy', pose.cy.toFixed(3));
        ellipse.setAttribute('rx', pose.rx.toFixed(3));
        const inside = !!pointer && orbitHit(x, y, pose);
        if (inside && !entered.has(index)) playNote(index);
        if (inside) entered.add(index);
        else entered.delete(index);
        const sounding = (flashes.get(index) || 0) > now;
        ellipse.style.fill = inside || sounding ? '#be9d9d' : '';
        ellipse.dataset.sounding = String(sounding);
      });
      if (!media.matches || [...flashes.values()].some((end) => end > now))
        wake();
    }
    function wake() {
      if (!frame && visible && !document.hidden && !disposed)
        frame = requestAnimationFrame(draw);
    }
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      suppressed = false;
      wake();
    }
    function leave() {
      pointer = null;
      entered.clear();
      request++;
      wake();
    }
    function cancel() {
      suppressed = true;
      request++;
      flashes.clear();
      wake();
    }
    function click(event: MouseEvent) {
      if (!interactive) return;
      const bounds = svg!.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * ORBIT_WIDTH;
      const y = ((event.clientY - bounds.top) / bounds.height) * ORBIT_HEIGHT;
      const index = CIRCLES.find((i) =>
        orbitHit(x, y, orbitPose(i, media.matches ? 0 : phase.current)),
      );
      playNote(index ?? keyboardCircle, true);
    }
    function key(event: KeyboardEvent) {
      if (!interactive) return;
      if (
        ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)
      ) {
        event.preventDefault();
        keyboardCircle =
          (keyboardCircle +
            (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 11)) %
          ORBIT_COUNT;
        playNote(keyboardCircle, true);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        playNote(keyboardCircle, true);
      }
    }
    function visibility() {
      previous = 0;
      leave();
      if (document.hidden) cancel();
      else wake();
    }
    function motion() {
      previous = 0;
      entered.clear();
      wake();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previous = 0;
      if (!visible) leave();
      else wake();
    });
    observer.observe(svg);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    svg.addEventListener('pointercancel', leave);
    svg.addEventListener('click', click);
    svg.addEventListener('keydown', key);
    svg.addEventListener('blur', leave);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', motion);
    player.stopListeners.add(cancel);
    wake();
    return () => {
      disposed = true;
      request++;
      cancelAnimationFrame(frame);
      observer.disconnect();
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
      svg.removeEventListener('pointercancel', leave);
      svg.removeEventListener('click', click);
      svg.removeEventListener('keydown', key);
      svg.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motion);
      player.stopListeners.delete(cancel);
    };
  }, [player, interactive, musicalKey, mode, voice]);

  return (
    <svg
      ref={svgRef}
      className={`orbit-logo ${className}`}
      viewBox={`0 0 ${ORBIT_WIDTH} ${ORBIT_HEIGHT}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-hidden={interactive ? undefined : true}
      aria-label={
        interactive
          ? 'Play Quiet. Hover the circles, or use arrow keys to play notes.'
          : undefined
      }
    >
      {CIRCLES.map((index) => (
        <ellipse key={index} {...orbitPose(index, 0)} />
      ))}
    </svg>
  );
}
