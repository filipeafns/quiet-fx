# Third-party notices

Quiet FX's original sound recipes, synthesis engine and studio code are covered by the root MIT license. Third-party dependencies remain under their respective licenses.

## MP3 export

The studio lazily loads unmodified `@breezystack/lamejs@1.2.7` under LGPL-3.0. It is a website development dependency and is not part of the dependency-free installed synthesis package. The exact release source archive, original copyright notice, GPL/LGPL license texts, and replacement/build instructions are included in `public/licenses/`. The dependency is pinned to the version represented by that source archive.

## Interface dependencies

React, Vite/vinext, Base UI, shadcn components, Lucide, DialKit, fflate, Tailwind and other website tooling retain their original licenses. `package-lock.json` pins the complete development dependency graph. The studio uses no third-party audio recordings.

## Free Arc controls

The kit builder includes the free Arc Slider, Segmented Control and motion tokens from [uiarc.dev](https://uiarc.dev/), copyright 2026 Elia Kuratli, under MIT. The complete notice is in [components/ui/arc/LICENSE](components/ui/arc/LICENSE). Upstream source was retrieved from the component registries; internal imports are localized and feature code uses `components/ui/kit-controls.ts`. No Arc Pro source is included.

`motion@14.3.0` is pinned as a website-only development dependency for these controls. It does not enter the exported sound engine, kit ZIP or shadcn item. The kit route supplies scoped Arc semantic CSS variables to preserve the existing website's style.
