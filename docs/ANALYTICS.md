# Website analytics

The Quiet FX website uses PostHog for anonymous product analytics. The installable sound engine contains no analytics or PostHog dependency.

## Configuration

Set `NEXT_PUBLIC_POSTHOG_KEY` to the public project token from the PostHog project's onboarding page in the Vercel **Production** environment, then build and deploy. Do not use a personal API key. Vinext embeds this public value in the static client build.

The SDK sends to the US ingestion endpoint, `https://us.i.posthog.com`. Collection is enabled only in production builds served from `quietfx.dev`; local development, forks, and Vercel preview hostnames do not load the SDK or send events. An absent or malformed token also disables analytics.

## Events

| Event                     | Trigger                                             | Custom properties                                                                                                           |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `$pageview`               | Initial load of each document                       | Standard page, referral, session, and browser properties                                                                    |
| `$pageleave`              | Leaving a document                                  | Standard page/session properties                                                                                            |
| `qfx_github_clicked`      | Clicking the homepage GitHub link                   | `placement`                                                                                                                 |
| `qfx_studio_view_changed` | Selecting a different Library or Motion Sandbox tab | `view`                                                                                                                      |
| `qfx_download_started`    | Starting a generated audio or ZIP download          | `kind`, `format`, `sound_id` when applicable, `sound_count` for batches, and the relevant `key`, `mode`, `voice`, `variant` |
| `qfx_setup_opened`        | Opening the studio setup panel                      | `placement`                                                                                                                 |
| `qfx_setup_copied`        | A clipboard write succeeds                          | `target` (`install`, `code`, `codex`, `claude`, or `library`), `placement`                                                  |

The home and studio links load separate documents, so the SDK owns page-view capture. Hash changes between studio tabs do not create duplicate page views. Download events report that the browser was asked to download a file, not that the user saved it.

## Data handling

Visitors receive an anonymous identifier stored in localStorage. Person profiles, session replay, autocapture, surveys, heatmaps, performance capture, and exception capture are disabled. The SDK respects Do Not Track. URL queries, fragments, credentials, extracted search terms, and campaign query values are removed from outgoing events; referral origins remain available.

No copied code, prompts, search input, file contents, or hover playback are captured. Explicit event properties use a small allowlist. SDK loading and capture errors do not interrupt sound playback or other interactions.

## Verification

Run `npm run test:analytics` for production gating, payload filtering, initialization, and failure-isolation tests. The full `npm test` command includes these checks.

After a production deployment, use a normal browser with Do Not Track disabled and analytics requests allowed. Visit the homepage, open the studio, change its tab, copy setup code, and download a sound. Confirm those events in the project's PostHog activity view and check that each document load creates one `$pageview`. Preview and localhost visits should produce no events. Automated browsers and browser privacy settings may suppress analytics.
