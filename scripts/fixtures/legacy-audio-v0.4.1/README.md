# Frozen legacy audio baseline

`engine.ts`, `catalog.ts`, and `LICENSE` are verbatim copies from Quiet FX commit
[`6ae9856b943f12f4fb4df5e5aa473e3fb65fe8e9`](https://github.com/filipeafns/quiet-fx/tree/6ae9856b943f12f4fb4df5e5aa473e3fb65fe8e9),
before the material-family expansion. The source paths were `lib/audio/engine.ts`,
`lib/audio/catalog.ts`, and `LICENSE`. These original sources remain MIT licensed;
the copied license retains the copyright and permission notice.

`scripts/test-materials.mjs` transpiles these fixtures and the current audio source
using the same TypeScript compiler, then renders both in the same Node process.
It compares every Float32 PCM byte for all 72 original cues × 6 variants × 4 voices
(1,728 comparisons), plus IDs, ordering, defaults, sample rate and duration. There
is no numeric tolerance. This detects changes to either the current renderer or
the current recipes without depending on platform-specific `Math` output hashes.

Keep these files frozen. Do not regenerate them from the current source or update
them to make a failing regression pass. They are checked in so the test works in
shallow CI checkouts without Git history, network access, or a baseline checkout.
They are test fixtures only and are not part of the browser or exported runtime.
