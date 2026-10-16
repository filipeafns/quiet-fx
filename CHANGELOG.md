# Changelog

## Unreleased

- Preserve the already-deployed public MCP endpoint, host-themed picker and domain-verification proof when releasing the sound-kit website. Keep its pinned 72-cue contract separate from the expanded website catalog.
- Align all three homepage actions with consistent height and padding; keep the primary kit action full-width below the secondary actions on mobile.
- Refine the kit builder to match the homepage and library: open layout, compact direction toolbar, larger waveform rows with durations, neutral app examples and header export action. Improve mobile checkout spacing.
- Keep material help accessible by keyboard/touch and focused controls clear of the sticky header. Guard repeated audio-context cleanup during development refresh.
- Add a mood-based sound-kit builder with constrained seeded shuffle, family/key and role locks, per-role editing, undo, named local saving and JSON import.
- Add 24 original Felt / Wood, Porcelain and Elastic cues. Existing 72 cue renders remain unchanged. Add optional bounded FM-style tone modulation for new recipes.
- Add interactive Workspace, Messages and Checkout examples using the selected kit, with visible feedback, mute/level controls and cancellation.
- Export exact kits as WAVs, recipes and a standalone source package, or an editable shadcn registry item. Keep the current library and all new features free.
- Fix sandbox ZIP exports to use the auditioned variant. New-cue setup uses its exported engine instead of referring to unavailable sounds in the stable v0.4.1 tag.
- Add website-only free Arc controls and Motion 14.3.0, with notices. Expand domain, legacy-audio, export and discovery checks.
