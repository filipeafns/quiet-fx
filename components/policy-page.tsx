/* oxlint-disable next/no-html-link-for-pages -- Static exports use document navigation. */
/* oxlint-disable next/no-img-element -- The original small SVG is served directly by the static host. */
import type { ReactNode } from 'react';

export function PolicyPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="policy-shell">
      <a className="policy-skip" href="#policy-content">
        Skip to content
      </a>
      <header className="policy-header">
        <a className="policy-brand" href="/" aria-label="Quiet FX home">
          <img src="/favicon.svg" width="36" height="36" alt="" />
          <span>quiet</span>
        </a>
        <a href="/studio">
          Open Studio <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="policy-content" className="policy-content">
        <p className="policy-eyebrow">Quiet FX · Updated October 2, 2026</p>
        <h1>{title}</h1>
        <p className="policy-intro">{intro}</p>
        {children}
      </main>
      <footer className="policy-footer">
        <span>
          Quiet FX · Made by{' '}
          <a href="https://github.com/filipeafns">Filipe Soares</a>
        </span>
        <nav aria-label="Support and policies">
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/licenses/QUIET-MIT.txt">MIT License</a>
        </nav>
      </footer>
    </div>
  );
}
