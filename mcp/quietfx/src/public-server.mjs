import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { toolDefinitions, callTool } from './tools.mjs';
import { outputSchemas } from './schemas.mjs';
import widget from '../dist/widget.html';

export const resourceUri = 'ui://quietfx/picker-v1.html';
const securitySchemes = [{ type: 'noauth' }];
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};
const json = (value, status = 200, extraHeaders = {}) =>
  Response.json(value, { status, headers: { ...headers, ...extraHeaders } });

export function createPublicMcpServer() {
  const server = new McpServer({ name: 'quietfx', version: '0.1.4' }, {
    instructions: 'Search or browse collections before choosing IDs. Open show_sound_picker when the user wants to preview or select sounds. Call get_sound_assets only for explicit selections. All sounds are public MIT procedural recipes. Playback requires user interaction; tools never write into projects.',
  });
  registerAppResource(server, 'Quiet FX sound picker', resourceUri, {}, async () => ({
    contents: [{
      uri: resourceUri,
      mimeType: RESOURCE_MIME_TYPE,
      text: widget,
      _meta: { ui: {
        domain: 'https://quietfx.dev',
        prefersBorder: true,
        csp: { connectDomains: [], resourceDomains: [], frameDomains: [] },
      } },
    }],
  }));
  for (const [name, definition] of Object.entries(toolDefinitions)) {
    const config = {
      title: definition.title,
      description: definition.description,
      inputSchema: z.object(definition.input).strict(),
      outputSchema: outputSchemas[name],
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        securitySchemes,
        ...(definition.ui ? { ui: { resourceUri, visibility: ['model', 'app'] } } : {}),
      },
    };
    const handler = async (args) => {
      try { return await callTool(name, args); }
      catch (error) {
        return { isError: true, content: [{ type: 'text', text: error.message }] };
      }
    };
    if (definition.ui) registerAppTool(server, name, config, handler);
    else server.registerTool(name, config, handler);
  }
  return server;
}

async function parseBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw Object.assign(new Error('Use application/json'), { status: 415 });
  if (Number(request.headers.get('content-length')) > 65536)
    throw Object.assign(new Error('Request too large'), { status: 413 });
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw Object.assign(new Error('Request too large'), { status: 413 });
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw Object.assign(new Error('Expected valid JSON'), { status: 400 }); }
}

const publicMcp = {
  async fetch(request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = new Set([new URL(request.url).origin, 'https://quietfx.dev', 'https://chatgpt.com']);
    if (origin && !allowedOrigins.has(origin))
      return json({ error: 'Cross-origin request refused' }, 403);
    if (request.method !== 'POST')
      return json({ error: 'Use MCP POST' }, 405, { Allow: 'POST' });
    let server;
    try {
      const body = await parseBody(request);
      server = createPublicMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
        maxRequestBodySize: 65536,
      });
      await server.connect(transport);
      let response = await transport.handleRequest(request, { parsedBody: body });
      const listsTools = (Array.isArray(body) ? body : [body]).some(message => message?.method === 'tools/list');
      if (listsTools && response.ok) {
        // SDK 1.31 drops top-level securitySchemes when registering a tool.
        // Preserve its generated schemas and add the documented auth extension
        // at the protocol boundary, alongside the backward-compatible _meta.
        const result = await response.json();
        for (const message of Array.isArray(result) ? result : [result]) {
          if (Array.isArray(message.result?.tools)) {
            for (const tool of message.result.tools) tool.securitySchemes = securitySchemes;
          }
        }
        response = new Response(JSON.stringify(result), response);
      }
      const secured = new Response(response.body, response);
      for (const [key, value] of Object.entries(headers)) secured.headers.set(key, value);
      return secured;
    } catch (error) {
      return json({ error: error.message || 'Request could not be completed' }, error.status || 400);
    } finally {
      await server?.close();
    }
  },
};

export default publicMcp;
