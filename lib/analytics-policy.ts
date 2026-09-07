export const ANALYTICS_EVENTS = {
  qfx_github_clicked: ['placement'],
  qfx_studio_view_changed: ['view'],
  qfx_download_started: [
    'kind',
    'format',
    'sound_id',
    'sound_count',
    'key',
    'mode',
    'voice',
    'variant',
  ],
  qfx_setup_opened: ['placement'],
  qfx_setup_copied: ['target', 'placement'],
} as const;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;
export type AnalyticsProperties = Record<string, string | number | boolean>;

export function canCaptureAnalytics(
  hostname: string,
  production: boolean,
  token?: string,
) {
  return (
    production &&
    hostname === 'quietfx.dev' &&
    token === token?.trim() &&
    /^phc_[A-Za-z0-9]+$/.test(token ?? '')
  );
}

export function analyticsProperties(
  event: AnalyticsEvent,
  properties: AnalyticsProperties = {},
) {
  const allowed: readonly string[] = ANALYTICS_EVENTS[event];
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        allowed.includes(key) &&
        ((typeof value === 'string' && value.length <= 80) ||
          (typeof value === 'number' && Number.isFinite(value)) ||
          typeof value === 'boolean'),
    ),
  );
}

// PostHog extracts these query values before before_send runs, including
// $initial_ and $session_entry_ copies. Keep attribution to pages and domains.
const QUERY_PROPERTIES = new Set([
  'ph_keyword',
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
]);

/** Retain page/referral attribution without forwarding URL query data. */
export function sanitizeAnalyticsUrls(properties: Record<string, unknown>) {
  const clean = { ...properties };
  for (const key of Object.keys(clean)) {
    const unprefixed = key.replace(/^\$(?:initial|session_entry)_/, '');
    if (unprefixed.startsWith('utm_') || QUERY_PROPERTIES.has(unprefixed)) {
      delete clean[key];
    }
  }
  for (const key of [
    '$current_url',
    '$initial_current_url',
    '$referrer',
    '$initial_referrer',
    '$session_entry_url',
    '$session_entry_referrer',
  ]) {
    if (typeof clean[key] !== 'string') {
      delete clean[key];
      continue;
    }
    try {
      const url = new URL(clean[key]);
      if (!['http:', 'https:'].includes(url.protocol)) {
        delete clean[key];
        continue;
      }
      clean[key] = key.includes('referrer')
        ? url.origin
        : `${url.origin}${url.pathname}`;
    } catch {
      delete clean[key];
    }
  }
  return clean;
}
