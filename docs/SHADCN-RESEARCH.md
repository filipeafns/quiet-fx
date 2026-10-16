# Sound kits: shadcn and Arc research

Verified against official sources on October 16, 2026. This document separates upstream behavior, the implemented local Quiet FX export and future service proposals. No public hosted registry is provided.

## What is useful from shadcn

- **Source ownership.** shadcn distributes editable component source, rather than requiring a hosted renderer. Its source is MIT licensed; preserve notices when redistributing it. [Architecture](https://ui.shadcn.com/docs), [license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).
- **Curated Shuffle.** The current official Create implementation selects from `SHUFFLE_PRESETS`, avoids the current preset, and preserves locked settings. Its older true-random function remains in source but is not wired to Shuffle. This supports curated sound palettes with locks; it does not establish a seeded audio-generation algorithm. [Create](https://ui.shadcn.com/create), [implementation](https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/%28app%29/%28create%29/hooks/use-random.tsx).
- **Local workflow.** Current CLI supports `add --dry-run`, `add --diff`, `apply <preset> --only theme`, and `preset decode <code> --json`. Quiet FX already has `components.json` and shadcn; reinitializing or applying a global preset would risk changing existing UI. [CLI](https://ui.shadcn.com/docs/cli).
- **Theme contract.** Semantic CSS variables separate background, foreground, accent, border and other roles. Sound mood and visual theme need not be coupled. [Theming](https://ui.shadcn.com/docs/theming).

## Packaging that preserves ownership

The implemented ZIP carries a versioned kit manifest, exact settings/seed, resolved role patches, the matching standalone runtime, integration source and WAVs. Role identity is independent of cue identity: different roles may intentionally use the same cue. The existing single-cue installation flow and free catalog remain available.

The downloadable `quiet-kit.json` is a local registry item, built directly with inlined source by [lib/kit-export.ts](../lib/kit-export.ts). Its name is `quiet-kit`, its type is `registry:lib`, its `dependencies` array is empty, and its three file entries are:

| File                 | File type       | Target                     |
| -------------------- | --------------- | -------------------------- |
| `quiet-fx/engine.ts` | `registry:lib`  | `~/lib/quiet-fx/engine.ts` |
| `quiet-fx/kit.ts`    | `registry:lib`  | `~/lib/quiet-fx/kit.ts`    |
| `quiet-fx/LICENSE`   | `registry:file` | `~/lib/quiet-fx/LICENSE`   |

```sh
npx shadcn@4.18.0 add ./quiet-kit.json
```

The command above was tested in a separate shadcn-configured consumer. Version 4.18.0 preserved the browser's exact resolved patch metadata and kit name, and the installed runtime reproduced all eight browser-downloaded WAVs byte for byte. The installed TypeScript and typed consumer passed strict `tsc`. The CLI added no dependencies to the consumer's existing manifest. It stripped leading TypeScript license comments, so the separate `LICENSE` is essential; the installed file matched the full original notice. [Automated export coverage](../scripts/test-kit-export.mjs), [engineering handoff](engineering-handoff.md).

Official CLI documentation supports local JSON paths and hosted URLs. `~` in these targets means the consumer project root; `@lib/` is an alternative that follows `aliases.lib`. Binary audio remains in the ZIP, while the local registry item contains original source only. [CLI](https://ui.shadcn.com/docs/cli), [item schema](https://ui.shadcn.com/docs/registry/registry-item-json).

A later hosted registry could use a root manifest with `$schema`, `name`, `homepage` and `items`; `npx shadcn@latest build` emits items to `public/r`. That publication workflow and any `@quietfx` namespace are future work. The current local item requires no hosted registry or authentication. [Registry manifest](https://ui.shadcn.com/docs/registry/registry-json).

The inspected stable release continues to install from GitHub: `npm install github:filipeafns/quiet-fx#v0.4.1`. No new npm publication or release tag is claimed. New kit downloads include their own matching runtime.

Future paid services could add saved team palettes, private brand packs or collaboration without withdrawing the existing free engine/catalog. The official registry supports bearer-token headers for separate private namespaces, but a server must validate authentication and item entitlements. No billing, account service or private registry is implied by this implementation. [Registry authentication](https://ui.shadcn.com/docs/registry/authentication).

## Free Arc controls

Arc uses React 19, CSS Modules and CSS variables. Add `"@uiarc": "https://uiarc.dev/r/{name}.json"` to `components.json` registries. In an unconfigured project the documented acquisition sequence is:

```sh
npx shadcn@latest add @uiarc/arc-foundation
npx shadcn@latest add @uiarc/button @uiarc/slider @uiarc/segmented-control
```

Import the installed foundation CSS at the application root. Default generated locations use `@/components/arc/`; this project deliberately exposes selected controls through `@/components/ui/kit-controls`, so feature code should use that facade. CLI installation rewrites upstream internal imports. [Installation](https://uiarc.dev/docs/installation).

| Free component    | Acquisition URL                                                      | Useful API                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button            | [button.json](https://uiarc.dev/r/button.json)                       | Named `Button`; native button props; `variant`: primary/secondary/ghost/danger; `size`: sm/md/lg; `loading`.                                               |
| Slider            | [slider.json](https://uiarc.dev/r/slider.json)                       | Required `label`; `value` number or tuple; `onValueChange`, `onValueCommit`, min/max/step. Expensive rendering belongs at commit or in a bounded debounce. |
| Segmented control | [segmented-control.json](https://uiarc.dev/r/segmented-control.json) | Default export; controlled `value` / `onValueChange`; `options: {value,label,accessory?}[]`; accessible `label`.                                           |

Source docs: [Button](https://uiarc.dev/components/button), [Slider](https://uiarc.dev/components/slider), [Segmented control](https://uiarc.dev/components/segmented-control). The control registries include `motion` and Arc motion-token dependencies. Foundation has its own token dependency. Acquire only the needed controls. Keep those website dependencies out of the exported sound engine and integration hook.

Free Arc source is MIT, copyright 2026 Elia Kuratli; preserve its copyright and permission notice. This project's copy is at [components/ui/arc/LICENSE](../components/ui/arc/LICENSE). Arc's current Pro license is explicitly marked draft (September 26, 2026), and excludes redistribution of Pro source as kits, packages, registries or public code generators. Only free Arc controls are used here. [License](https://uiarc.dev/license).

## Implementation direction

Use coherent mood presets, seeded constrained variation, per-role locks and explicit audition. Let users download the exact selected sound recipe and integration rather than requiring a service to keep playback working. The three original interactive demos exercise task completion, simulated messaging and a simulated order. They have no network, payment or account integration and delegate sound playback to the host callback. They do not autoplay on mount.

Research checked upstream source and documentation, not a rendered comparison with the Create website. No third-party preset generator is represented as official shadcn functionality.
