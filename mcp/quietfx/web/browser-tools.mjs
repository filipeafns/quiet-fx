export function registerSelectionReader(context, readSelection) {
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tool = {
    name: 'read_quietfx_selection',
    title: 'Read selected QuietFX sounds',
    description: 'Read the sound IDs, voice and variation currently selected in the visible QuietFX picker. Does not play audio, change selection, export files or write to a project.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length)
        throw new Error('Expected an empty object.');
      return readSelection();
    },
  };
  try {
    Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {
      lifecycle.abort(); // Optional browser capability; the visible picker stays usable.
    });
  } catch { lifecycle.abort(); }
  return () => lifecycle.abort();
}
