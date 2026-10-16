import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import api from '../../../api/mcp.js';
import { SOUNDS, makeCollection, searchSounds } from '../src/catalog.mjs';
import { callTool } from '../src/tools.mjs';
import { renderPatch, wavBytes, VOICES, VARIANTS } from '../vendor/index.js';
import { outputSchemas } from '../src/schemas.mjs';

const origin = 'https://quietfx.dev';
const request = (path = '/mcp', init = {}) => api.fetch(new Request(origin + path, init));
const post = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify(body),
});
const rpc = (method, params = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params });
async function connect() {
  const client = new Client({ name: 'quietfx-public-qa', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(origin + '/mcp'), {
    fetch: (input, init) => api.fetch(new Request(input, init)),
  });
  await client.connect(transport);
  return client;
}

test('pinned original recipes and engine retain exact source provenance', () => {
  const hashes = {
    'vendor/catalog.js': 'fb8fbf2bc5754a1ed18453902469be8818226c238dfb42469e48f9257f816237',
    'vendor/engine.js': 'f9dcfecc20e9fc534cad0881aacd533d4b720729f7cec2df6c8eca59f29c0768',
    'vendor/color.js': '434900a80b134c347d6b1275adbb69c8471b775c6dbb4a54e602646cf1d19fff',
    'vendor/ui/sound-field.tsx': 'db73f664bd35362c7746092e7a0f069bbbe2bee41aab1b916f95b0dae634052a',
    'vendor/ui/orbit-logo.tsx': 'abbfe926e02bace7bff7621c97bbe35de5a34a9406087d00096b9c6975515475',
    'vendor/ui/orbit-logo.ts': 'b387571c5e77e2facbd11f718ef167f6e6d96c63e3f5cc7fe92b9f9404f57a46',
  };
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(createHash('sha256').update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex'), expected, file);
  assert.equal(SOUNDS.length, 72);
  assert.equal(new Set(SOUNDS.map(sound => sound.id)).size, 72);
  assert.ok(SOUNDS.every(sound => sound.license === 'MIT' && sound.provenance.includes('94cb0a0')));
});

test('wire metadata declares exactly five anonymous read-only tools on both Vercel paths', async () => {
  for (const path of ['/mcp', '/api/mcp']) {
    const response = await request(path, post(rpc('tools/list')));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const tools = (await response.json()).result.tools;
    assert.deepEqual(tools.map(tool => tool.name).sort(), ['get_collection', 'get_sound_assets', 'list_collections', 'search_sounds', 'show_sound_picker']);
    for (const tool of tools) {
      assert.deepEqual(tool.securitySchemes, [{ type: 'noauth' }]);
      assert.deepEqual(tool._meta.securitySchemes, [{ type: 'noauth' }]);
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.destructiveHint, false);
      assert.equal(tool.annotations.openWorldHint, false);
      assert.equal(tool.inputSchema.additionalProperties, false);
      assert.ok(Object.keys(tool.outputSchema.properties).length > 1);
    }
    assert.equal(tools.find(tool => tool.name === 'show_sound_picker')._meta.ui.resourceUri, 'ui://quietfx/picker-v1.html');
  }
});

test('SDK-accepted batch discovery retains anonymous metadata on every tools/list response', async () => {
  const response = await request('/mcp', post([rpc('tools/list', {}, 1), rpc('ping', {}, 2), rpc('tools/list', {}, 3)]));
  assert.equal(response.status, 200);
  const messages = await response.json();
  assert.equal(messages.length, 3);
  for (const message of messages.filter(message => [1, 3].includes(message.id)))
    assert.ok(message.result.tools.every(tool => tool.securitySchemes[0].type === 'noauth'));
});

test('real SDK client initializes anonymously, calls all five tools and reads embedded picker', async () => {
  const client = await connect();
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 5);
    const invoke = (name, args = {}) => client.callTool({ name, arguments: args });
    const search = await invoke('search_sounds', { query: 'subtle confirmation', max_duration: 1 });
    assert.ok(search.structuredContent.sounds.length > 0);
    assert.ok(search.structuredContent.sounds.every(sound => sound.duration <= 1 && sound.tags.includes('confirmation')));
    const warm = await invoke('search_sounds', { mood: 'warm' });
    assert.ok(warm.structuredContent.sounds.some(sound => sound.id === 'wood-tap'));
    const collections = await invoke('list_collections');
    assert.equal(collections.structuredContent.collections.length, 4);
    const conversation = await invoke('get_collection', { collection_id: 'conversation' });
    assert.equal(conversation.structuredContent.sounds.length, 8);
    const picker = await invoke('show_sound_picker', { collection_id: 'essentials' });
    assert.equal(picker.structuredContent.sounds.length, 6);
    const assets = await invoke('get_sound_assets', { ids: ['tap', 'confirm', 'tap'], voice: 'Felt', variant: 'Long' });
    assert.equal(assets.isError, undefined);
    assert.deepEqual(assets.structuredContent.collection.sounds.map(sound => sound.id), ['tap', 'confirm']);
    assert.equal(assets.structuredContent.collection.settings.voice, 'Felt');
    assert.equal(assets.structuredContent.collection.settings.variant, 'Long');
    for (const sound of assets.structuredContent.collection.sounds)
      assert.ok(Math.abs(sound.duration - renderPatch(sound.patch).duration) < 0.001);
    assert.match(assets.structuredContent.integration, /Clipboard text does not transfer WAV files/);
    const resource = await client.readResource({ uri: 'ui://quietfx/picker-v1.html' });
    const content = resource.contents[0];
    assert.equal(content.mimeType, 'text/html;profile=mcp-app');
    assert.equal(content._meta.ui.domain, origin);
    assert.deepEqual(content._meta.ui.csp, { connectDomains: [], resourceDomains: [], frameDomains: [] });
    assert.ok(content.text.length > 500000);
    assert.match(content.text, /Download ZIP/);
    assert.match(content.text, /Copy for Codex/);
    assert.match(content.text, /quietfx-third-party-notices/);
    assert.doesNotMatch(content.text, /your private QuietFX website/);
  } finally { await client.close(); }
});

test('remote tool validation rejects imports, unrecognized inputs, unsupported settings and IDs', async () => {
  const client = await connect();
  try {
    for (const [name, args] of [
      ['get_sound_assets', { ids: ['../../etc/passwd'] }],
      ['get_sound_assets', { ids: [] }],
      ['get_sound_assets', { ids: ['tap'], voice: 'Loud' }],
      ['get_sound_assets', { ids: ['tap'], arbitrary_url: 'https://example.com/audio.wav' }],
      ['list_collections', { arbitrary_url: 'https://example.com/audio.wav' }],
      ['search_sounds', { query: 'x'.repeat(301) }],
      ['search_sounds', { limit: 999 }],
      ['get_collection', { collection_id: 'missing' }],
      ['delete_project_files', {}],
    ]) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, JSON.stringify({ name, args }));
    }
  } finally { await client.close(); }
});

test('all source cues render finite non-silent PCM and valid selected-only WAV files', () => {
  const collection = makeCollection({ ids: SOUNDS.map(sound => sound.id) });
  for (const sound of collection.sounds) {
    const rendered = renderPatch(sound.patch);
    const bytes = wavBytes(rendered);
    assert.ok(rendered.data.every(Number.isFinite), sound.id);
    assert.ok(rendered.peak > 0 && rendered.peak <= 1, sound.id);
    assert.ok(Math.abs(sound.duration - rendered.duration) < 0.001, sound.id);
    assert.equal(Buffer.from(bytes.slice(0, 4)).toString(), 'RIFF');
    assert.equal(Buffer.from(bytes.slice(8, 12)).toString(), 'WAVE');
    assert.equal(new DataView(bytes.buffer, bytes.byteOffset).getUint32(24, true), 48000);
  }
});

test('exact output schemas cover all voice/variation recipes and selection remains stateless', async () => {
  for (const voice of VOICES) for (const variant of VARIANTS) {
    const result = await callTool('get_sound_assets', { ids: SOUNDS.map(sound => sound.id), voice, variant });
    assert.doesNotThrow(() => outputSchemas.get_sound_assets.parse(result.structuredContent), `${voice}/${variant}`);
  }
  const a = await callTool('get_sound_assets', { ids: ['tap', 'confirm'] });
  const b = await callTool('get_sound_assets', { ids: ['mist'] });
  assert.deepEqual(b.structuredContent.collection.sounds.map(sound => sound.id), ['mist']);
  assert.deepEqual(await callTool('get_sound_assets', { ids: ['tap', 'confirm'] }), a);
  assert.equal(searchSounds({ query: 'unmatchable-xyz' }).total, 0);
});

test('HTTP boundary rejects malformed and oversized requests without exposing auth or browser APIs', async () => {
  const foreignOrigin = post(rpc('tools/list'));
  foreignOrigin.headers.Origin = 'https://unrelated.example';
  assert.equal((await request('/mcp', foreignOrigin)).status, 403);
  const ownOrigin = post(rpc('tools/list'));
  ownOrigin.headers.Origin = origin;
  assert.equal((await request('/mcp', ownOrigin)).status, 200);
  assert.equal((await request('/mcp')).status, 405);
  assert.equal((await request('/mcp', { method: 'DELETE' })).status, 405);
  assert.equal((await request('/mcp', { ...post({}), body: '{broken' })).status, 400);
  assert.equal((await request('/mcp', { ...post({}), body: 'x'.repeat(65537) })).status, 413);
  const declared = post(rpc('ping'));
  declared.headers['Content-Length'] = '65537';
  assert.equal((await request('/mcp', declared)).status, 413);
  assert.equal((await request('/mcp', { method: 'POST', body: '{}' })).status, 415);
  const response = await request('/mcp', post(rpc('tools/list')));
  assert.equal(response.headers.get('www-authenticate'), null);
  assert.equal(response.headers.get('set-cookie'), null);
});
