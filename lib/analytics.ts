import type { PostHog } from 'posthog-js/dist/module.no-external';
import {
  ANALYTICS_EVENTS,
  analyticsProperties,
  canCaptureAnalytics,
  sanitizeAnalyticsUrls,
  type AnalyticsEvent,
  type AnalyticsProperties,
} from './analytics-policy';

const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let loading: Promise<PostHog | null> | undefined;

function getAnalytics(): Promise<PostHog | null> {
  if (
    typeof window === 'undefined' ||
    !canCaptureAnalytics(
      window.location.hostname,
      process.env.NODE_ENV === 'production',
      token,
    )
  )
    return Promise.resolve(null);

  loading ??= import('posthog-js/dist/module.no-external')
    .then(({ default: posthog }) => {
      posthog.init(token!, {
        api_host: 'https://us.i.posthog.com',
        ui_host: 'https://us.posthog.com',
        defaults: '2026-05-30',
        person_profiles: 'never',
        persistence: 'localStorage',
        save_campaign_params: false,
        respect_dnt: true,
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
        disable_surveys: true,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_performance: false,
        rageclick: false,
        advanced_disable_flags: true,
        before_send: (event) => {
          if (
            !event ||
            !(
              Object.hasOwn(ANALYTICS_EVENTS, event.event) ||
              ['$pageview', '$pageleave'].includes(event.event)
            )
          )
            return null;
          return {
            ...event,
            properties: sanitizeAnalyticsUrls(event.properties),
          };
        },
      });
      return posthog;
    })
    .catch(() => null);
  return loading;
}

export function startAnalytics() {
  void getAnalytics();
}

export function captureAnalytics(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
) {
  // Analytics must never interrupt playback, file exports, navigation, or copying.
  void getAnalytics()
    .then((posthog) => {
      try {
        posthog?.capture(event, analyticsProperties(event, properties));
      } catch {
        /* A blocked analytics request cannot affect the interaction. */
      }
    })
    .catch(() => {});
}
