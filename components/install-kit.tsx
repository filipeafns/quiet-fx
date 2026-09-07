'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Check, Code2, Copy, X } from 'lucide-react';
import { CUES, type Settings } from '@/lib/audio/catalog';
import {
  buildInstallSetup,
  buildLibraryJson,
  type LibraryEntry,
} from '@/lib/install-setup';

type InstallKitProps = {
  cueId: string;
  settings: Settings;
  libraryEntries?: readonly LibraryEntry[];
  compact?: boolean;
};

type CopyTarget = 'install' | 'code' | 'codex' | 'claude' | 'library';
type CopyResult = {
  target: CopyTarget;
  value: string;
  state: 'copied' | 'manual';
};

const COPY_NAMES: Record<CopyTarget, string> = {
  install: 'install command',
  code: 'JavaScript code',
  codex: 'Codex prompt',
  claude: 'Claude prompt',
  library: 'library JSON',
};

function HighlightedCode({ code }: { code: string }) {
  const tokens = code.split(
    /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|const|let|export|async|await|function|return|if|else|new|throw|try|catch|finally|typeof|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return (
    <code>
      {tokens.map((token, index) => {
        const kind = token.startsWith('//')
          ? 'comment'
          : /^['"`]/.test(token)
            ? 'string'
            : /^\d/.test(token)
              ? 'number'
              : /^(import|from|const|let|export|async|await|function|return|if|else|new|throw|try|catch|finally|typeof|true|false|null|undefined)$/.test(
                    token,
                  )
                ? 'keyword'
                : null;
        return kind ? (
          <span className={`qfx-install-token-${kind}`} key={index}>
            {token}
          </span>
        ) : (
          token
        );
      })}
    </code>
  );
}

export function InstallKit({
  cueId,
  settings,
  libraryEntries,
  compact = false,
}: InstallKitProps) {
  const setup = useMemo(
    () => buildInstallSetup(cueId, settings),
    [cueId, settings],
  );
  const library = useMemo(
    () =>
      libraryEntries ? buildLibraryJson(libraryEntries, cueId) : undefined,
    [libraryEntries, cueId],
  );
  const values = {
    install: setup.install,
    code: setup.code,
    codex: setup.codexPrompt,
    claude: setup.claudePrompt,
    library: library ?? '',
  };
  return (
    <InstallKitContent
      key={JSON.stringify([cueId, settings, libraryEntries])}
      values={values}
      hasLibrary={libraryEntries !== undefined}
      compact={compact}
    />
  );
}

function InstallKitContent({
  values,
  hasLibrary,
  compact,
}: {
  values: Record<CopyTarget, string>;
  hasLibrary: boolean;
  compact: boolean;
}) {
  const [result, setResult] = useState<CopyResult | null>(null);
  const request = useRef(0);
  const mounted = useRef(true);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualInput = useRef<HTMLTextAreaElement>(null);
  const activeResult = result;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current += 1;
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (activeResult?.state === 'manual') {
      manualInput.current?.focus();
      manualInput.current?.select();
    }
  }, [activeResult]);

  async function copy(target: CopyTarget) {
    const value = values[target];
    const token = ++request.current;
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setResult(null);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (!mounted.current || token !== request.current) {
        return;
      }
      setResult({ target, value, state: 'copied' });
      clearTimer.current = setTimeout(() => setResult(null), 2400);
    } catch {
      if (mounted.current && token === request.current) {
        setResult({ target, value, state: 'manual' });
      }
    }
  }

  function copyButton(target: CopyTarget, label?: string) {
    const copied =
      activeResult?.target === target && activeResult.state === 'copied';
    return (
      <button
        type="button"
        className={label ? 'qfx-install-action' : 'qfx-install-copy'}
        aria-label={
          copied ? `Copied ${COPY_NAMES[target]}` : `Copy ${COPY_NAMES[target]}`
        }
        title={
          copied ? `Copied ${COPY_NAMES[target]}` : `Copy ${COPY_NAMES[target]}`
        }
        onClick={() => void copy(target)}
      >
        {copied ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Copy size={15} aria-hidden="true" />
        )}
        {label ? (
          <span>{copied ? `Copied ${COPY_NAMES[target]}` : label}</span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      className={`qfx-install-kit${compact ? ' qfx-install-kit-compact' : ''}`}
    >
      <div className="qfx-install-surface">
        <div className="qfx-install-terminal">
          <span className="qfx-install-prompt" aria-hidden="true">
            $
          </span>
          <code>{values.install}</code>
          {copyButton('install')}
        </div>
        <div className="qfx-install-code-header">
          <span>JavaScript</span>
          {copyButton('code')}
        </div>
        <pre className="qfx-install-code" aria-label="JavaScript setup">
          <HighlightedCode code={values.code} />
        </pre>
      </div>
      <div className="qfx-install-actions">
        {copyButton('codex', 'Copy Codex prompt')}
        {copyButton('claude', 'Copy Claude prompt')}
        {hasLibrary ? copyButton('library', 'Copy library JSON') : null}
      </div>
      <output className="qfx-install-announcement" aria-live="polite">
        {activeResult?.state === 'copied'
          ? `Copied ${COPY_NAMES[activeResult.target]}.`
          : ''}
      </output>
      {activeResult?.state === 'manual' ? (
        <div className="qfx-install-manual">
          <div className="qfx-install-manual-heading">
            <p role="alert">
              Clipboard unavailable. Copy the selected{' '}
              {COPY_NAMES[activeResult.target]}.
            </p>
            <button
              type="button"
              className="qfx-install-dismiss"
              aria-label="Dismiss manual copy"
              onClick={() => setResult(null)}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <textarea
            ref={manualInput}
            readOnly
            value={activeResult.value}
            aria-label={`Copy ${COPY_NAMES[activeResult.target]} manually`}
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
}

export function StudioSetup({
  cueId,
  settings,
  libraryEntries,
}: Omit<InstallKitProps, 'compact'>) {
  const cueName = CUES.find((cue) => cue.id === cueId)?.name ?? cueId;
  return (
    <Popover.Root modal={false}>
      <div className="qfx-setup-floating">
        <Popover.Trigger className="qfx-setup-trigger">
          <Code2 size={16} aria-hidden="true" />
          <span>Use in your app</span>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Positioner
          className="qfx-setup-positioner"
          side="top"
          align="start"
          sideOffset={12}
          collisionPadding={12}
        >
          <Popover.Popup className="qfx-setup-panel">
            <div className="qfx-setup-heading">
              <div>
                <Popover.Title className="qfx-setup-title">
                  Use in your app
                </Popover.Title>
                <Popover.Description className="qfx-setup-summary">
                  {cueName} · {settings.key} {settings.mode} · {settings.voice}{' '}
                  · {settings.variant}
                </Popover.Description>
              </div>
              <Popover.Close
                className="qfx-setup-close"
                aria-label="Close setup"
              >
                <X size={18} aria-hidden="true" />
              </Popover.Close>
            </div>
            <InstallKit
              cueId={cueId}
              settings={settings}
              libraryEntries={libraryEntries}
              compact
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
