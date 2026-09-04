# Contributing to Quiet FX

Quiet FX explores how small sounds can make interfaces feel more responsive without demanding attention. Contributions can improve a cue, add a meaningful motion sequence, fix a bug, or make the studio easier to use.

## Design principles

- Give each sound a purpose and a clear relationship to an interaction.
- Prefer gentle attacks, clean tails and restrained intensity.
- Make variations perceptually useful: lighter, deeper, shorter, longer or airier.
- Keep the interface neutral; reserve hue for sound information.
- Support keyboard input, stop behavior and reduced-motion preferences.
- Keep the synthesis engine dependency-free and deterministic.

## Development

Use Node.js 22.13+ and run `npm ci`, then `npm run dev`. Edit the sound engine and recipes in `lib/audio/`; do not hand-edit generated files in `packages/quiet-sounds` or `public/quiet-engine.js`.

Before opening a pull request:

```sh
npm run build:package
npm run typecheck
npm test
npm run build:static
```

For a new cue, add it to the catalog, update intentional catalog-count checks, and listen to every variation. Check quiet and louder monitoring levels, headphones and small speakers. Describe the interaction the sound supports and how it was evaluated. For a motion change, check the actual animation with sound, interrupted playback and reduced motion.

Open a focused pull request with the resulting behavior and relevant validation. Include any attribution or license required for contributed material. Do not include credentials, private deployment metadata or personal recordings without authorization.

Bug reports are welcome in GitHub Issues. Include the browser, device, selected cue/settings, expected behavior and steps to reproduce. Please avoid posting private data.
