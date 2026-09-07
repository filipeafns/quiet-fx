import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import ts from 'typescript';

const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const transpile = (source) =>
  ts.transpile(source, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  });
const policyUrl = moduleUrl(
  transpile(
    await readFile(
      new URL('../lib/analytics-policy.ts', import.meta.url),
      'utf8',
    ),
  ),
);
const {
  ANALYTICS_EVENTS,
  analyticsProperties,
  canCaptureAnalytics,
  sanitizeAnalyticsUrls,
} = await import(policyUrl);
const core = transpile(
  await readFile(new URL('../lib/analytics.ts', import.meta.url), 'utf8'),
).replace("from './analytics-policy'", `from '${policyUrl}'`);
const sdkImport = "import('posthog-js/dist/module.no-external')";
assert.equal(
  core.split(sdkImport).length,
  2,
  'The test replaces only the SDK import; policy and initialization run unchanged',
);

const token = 'phc_AnalyticsTestPublicToken123';
const gateCases = [
  ['quietfx.dev', true, token, true],
  ['quietfx.dev', false, token, false],
  ['localhost', true, token, false],
  ['127.0.0.1', true, token, false],
  ['[::1]', true, token, false],
  ['quiet-fx.vercel.app', true, token, false],
  ['quiet-fx-preview-example.vercel.app', true, token, false],
  ['quietfx.dev.example.com', true, token, false],
  ['www.quietfx.dev', true, token, false],
  ['quiefx.dev', true, token, false],
  ['quietfx.dev', true, undefined, false],
  ['quietfx.dev', true, '', false],
  ['quietfx.dev', true, 'phx_privateApiKey', false],
  ['quietfx.dev', true, 'phc_', false],
  ['quietfx.dev', true, 'phc_ invalid', false],
  ['quietfx.dev', true, `${token}\n`, false],
];
for (const [hostname, production, projectToken, allowed] of gateCases) {
  assert.equal(
    canCaptureAnalytics(hostname, production, projectToken),
    allowed,
    `Capture gate: ${hostname}, production=${production}, token=${JSON.stringify(projectToken)}`,
  );
}

const customProperties = Object.freeze({
  kind: 'sound',
  format: 'mp3',
  sound_id: 'sparkle',
  sound_count: 1,
  key: 'F♯',
  mode: 'Minor',
  voice: 'Glass',
  variant: 'Airy',
  prompt: 'Never send the generated integration prompt',
  code: 'Never send copied code',
  email: 'test@example.invalid',
  $current_url: 'https://quietfx.dev/?secret=private',
});
assert.deepEqual(
  analyticsProperties('qfx_download_started', customProperties),
  {
    kind: 'sound',
    format: 'mp3',
    sound_id: 'sparkle',
    sound_count: 1,
    key: 'F♯',
    mode: 'Minor',
    voice: 'Glass',
    variant: 'Airy',
  },
);
assert.ok('prompt' in customProperties, 'Filtering does not mutate the caller');
assert.deepEqual(analyticsProperties('qfx_setup_copied', customProperties), {});
assert.deepEqual(analyticsProperties('qfx_github_clicked'), {});
for (const invalid of [
  null,
  {},
  [],
  undefined,
  NaN,
  Infinity,
  -Infinity,
  'x'.repeat(81),
]) {
  assert.deepEqual(
    analyticsProperties('qfx_setup_copied', { target: invalid }),
    {},
    `Malformed or unbounded properties are removed: ${String(invalid)}`,
  );
}

const rawUrls = Object.freeze({
  $current_url: 'https://quietfx.dev/studio?prompt=private#sandbox',
  $initial_current_url: 'https://quietfx.dev/?token=private#private',
  $session_entry_url: 'https://quietfx.dev/studio?email=private',
  $referrer: 'https://www.google.com/search?q=private#private',
  $initial_referrer: 'https://example.com/private/path?token=private',
  $session_entry_referrer: 'https://user:password@example.org/private#private',
  $referring_domain: 'www.google.com',
  $pathname: '/studio',
  $session_id: 'synthetic-session',
  sound_id: 'sparkle',
});
const expectedUrls = {
  $current_url: 'https://quietfx.dev/studio',
  $initial_current_url: 'https://quietfx.dev/',
  $session_entry_url: 'https://quietfx.dev/studio',
  $referrer: 'https://www.google.com',
  $initial_referrer: 'https://example.com',
  $session_entry_referrer: 'https://example.org',
  $referring_domain: 'www.google.com',
  $pathname: '/studio',
  $session_id: 'synthetic-session',
  sound_id: 'sparkle',
};
assert.deepEqual(sanitizeAnalyticsUrls(rawUrls), expectedUrls);
assert.ok(rawUrls.$current_url.includes('prompt=private'));
for (const invalid of [
  'not a URL',
  'javascript:private',
  'data:text/plain,private',
  'file:///private',
  { secret: 'private' },
  null,
]) {
  assert.deepEqual(sanitizeAnalyticsUrls({ $current_url: invalid }), {});
}

// The SDK extracts these from URLs before before_send runs. Sanitizing URL
// strings alone would still send search terms, campaign values and click IDs.
const extractedQuery = {};
for (const prefix of ['', '$initial_', '$session_entry_']) {
  for (const key of [
    'ph_keyword',
    'utm_source',
    'utm_content',
    'utm_term',
    'utm_medium',
    'utm_campaign',
    'gad_source',
    'mc_cid',
    'gclid',
    'gclsrc',
    'dclid',
    'gbraid',
    'wbraid',
    'fbclid',
    'msclkid',
    'twclid',
    'li_fat_id',
    'igshid',
    'ttclid',
    'rdt_cid',
    'epik',
    'qclid',
    'sccid',
    'irclid',
    '_kx',
  ]) {
    extractedQuery[`${prefix}${key}`] = 'private-query-value';
  }
}
assert.deepEqual(
  sanitizeAnalyticsUrls({ ...rawUrls, ...extractedQuery }),
  expectedUrls,
  'Separately extracted query values cannot bypass URL sanitization',
);

let sequence = 0;
const stubKeys = [];
const unhandled = [];
const onUnhandled = (error) => unhandled.push(error);
process.on('unhandledRejection', onUnhandled);

async function loadCore(options = {}) {
  const {
    hostname = 'quietfx.dev',
    production = true,
    server = false,
    deferred = false,
    importFails = false,
    initFails = false,
    captureFails = false,
  } = options;
  const projectToken = Object.hasOwn(options, 'projectToken')
    ? options.projectToken
    : token;
  const key = `__quietFxAnalyticsTest${sequence++}`;
  stubKeys.push(key);
  const state = { imports: 0, initializations: [], captures: [] };
  let release;
  const ready = deferred
    ? new Promise((resolve) => {
        release = resolve;
      })
    : Promise.resolve();
  const sdk = {
    init(projectToken, config) {
      state.initializations.push({ projectToken, config });
      if (initFails) throw new Error('Synthetic initialization failure');
    },
    capture(event, properties) {
      state.captures.push({ event, properties });
      if (captureFails) throw new Error('Synthetic blocked capture');
    },
  };
  globalThis[key] = {
    async load() {
      state.imports++;
      await ready;
      if (importFails) throw new Error('Synthetic blocked SDK import');
      return { default: sdk };
    },
  };
  // A fresh module owns its singleton exactly as a fresh browser document does.
  // Browser globals and build-time env are isolated without changing this process.
  const source = [
    `const window = ${server ? 'undefined' : JSON.stringify({ location: { hostname } })};`,
    `const process = ${JSON.stringify({
      env: {
        NEXT_PUBLIC_POSTHOG_KEY: projectToken,
        NODE_ENV: production ? 'production' : 'development',
      },
    })};`,
    core.replace(sdkImport, `globalThis[${JSON.stringify(key)}].load()`),
    `// ${key}`,
  ].join('\n');
  return { ...(await import(moduleUrl(source))), state, release };
}

try {
  for (const [hostname, production, projectToken, allowed] of gateCases) {
    if (allowed) continue;
    const client = await loadCore({
      hostname,
      production,
      projectToken,
    });
    assert.doesNotThrow(() => client.startAnalytics());
    assert.doesNotThrow(() =>
      client.captureAnalytics('qfx_github_clicked', { placement: 'homepage' }),
    );
    await setImmediate();
    assert.equal(
      client.state.imports,
      0,
      'Excluded contexts never load the SDK',
    );
    assert.deepEqual(client.state.captures, []);
  }
  const server = await loadCore({ server: true });
  server.startAnalytics();
  server.captureAnalytics('qfx_setup_opened', { placement: 'studio' });
  await setImmediate();
  assert.equal(
    server.state.imports,
    0,
    'Server rendering does not touch the SDK',
  );

  const client = await loadCore({ deferred: true });
  client.startAnalytics();
  client.startAnalytics();
  client.captureAnalytics('qfx_download_started', customProperties);
  client.captureAnalytics('qfx_setup_copied', {
    target: 'codex',
    placement: 'studio',
    prompt: 'private',
  });
  assert.equal(
    client.state.imports,
    1,
    'Concurrent startup and interactions share one pending import',
  );
  assert.equal(client.state.initializations.length, 0);
  assert.equal(client.state.captures.length, 0);
  client.release();
  await setImmediate();
  client.startAnalytics();
  await setImmediate();
  assert.equal(
    client.state.initializations.length,
    1,
    'Repeated effects cannot initialize twice',
  );
  assert.deepEqual(client.state.captures, [
    {
      event: 'qfx_download_started',
      properties: analyticsProperties('qfx_download_started', customProperties),
    },
    {
      event: 'qfx_setup_copied',
      properties: { target: 'codex', placement: 'studio' },
    },
  ]);
  const { projectToken, config } = client.state.initializations[0];
  assert.equal(projectToken, token);
  assert.equal(config.api_host, 'https://us.i.posthog.com');
  assert.equal(config.ui_host, 'https://us.posthog.com');
  assert.equal(config.person_profiles, 'never');
  assert.equal(config.persistence, 'localStorage');
  assert.equal(config.autocapture, false);
  assert.equal(config.disable_session_recording, true);
  assert.equal(config.disable_surveys, true);
  assert.equal(config.advanced_disable_flags, true);
  assert.equal(
    config.capture_pageview,
    true,
    'Full navigations use SDK pageviews, not history changes',
  );
  assert.ok(
    client.state.captures.every(({ event }) => event !== '$pageview'),
    'Startup emits no duplicate manual pageview',
  );
  for (const name of [
    ...Object.keys(ANALYTICS_EVENTS),
    '$pageview',
    '$pageleave',
  ]) {
    const event = Object.freeze({
      event: name,
      properties: Object.freeze({ ...rawUrls, ...extractedQuery }),
    });
    assert.deepEqual(config.before_send(event), {
      event: name,
      properties: expectedUrls,
    });
  }
  for (const name of [
    '$autocapture',
    '$snapshot',
    '$identify',
    '$exception',
    'unknown',
    'toString',
    '__proto__',
  ]) {
    assert.equal(
      config.before_send({ event: name, properties: {} }),
      null,
      `${name} cannot bypass the event allowlist`,
    );
  }
  assert.equal(config.before_send(null), null);

  for (const failure of ['importFails', 'initFails', 'captureFails']) {
    const client = await loadCore({ [failure]: true });
    assert.doesNotThrow(() => client.startAnalytics());
    assert.doesNotThrow(() =>
      client.captureAnalytics('qfx_github_clicked', { placement: 'homepage' }),
    );
    await setImmediate();
    assert.doesNotThrow(() =>
      client.captureAnalytics('qfx_setup_opened', { placement: 'studio' }),
    );
    await setImmediate();
    assert.equal(
      client.state.imports,
      1,
      'Blocked analytics does not trigger an import retry loop',
    );
    if (failure !== 'captureFails')
      assert.equal(client.state.captures.length, 0);
    else
      assert.equal(
        client.state.captures.length,
        2,
        'A capture exception does not break later application interactions',
      );
  }
  await setImmediate();
  assert.deepEqual(
    unhandled,
    [],
    'SDK import, initialization and capture failures remain isolated',
  );
} finally {
  process.off('unhandledRejection', onUnhandled);
  for (const key of stubKeys) delete globalThis[key];
}

console.log(
  'Analytics passed: production gates, query privacy, controlled events, singleton initialization and failure isolation.',
);
