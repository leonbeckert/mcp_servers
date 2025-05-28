#!/usr/bin/env node
// zenrows/index.ts
// A minimal Model Context Protocol server that fetches web pages through ZenRows
// and progressively escalates its bypass level when the cheaper modes fail.
//
// Usage (after build):
//   ZENROWS_API_KEY="zenrw_..." npx -y @modelcontextprotocol/server-zenrows fetch "https://example.com"
//
// Environment variables
//   ZENROWS_API_KEY   Your ZenRows secret key (required)
//
// Input (tool "zenrowsFetch")
//   {
//     "url": "https://example.com",
//     "selector": ".body"        // OPTIONAL – CSS selector to wait for before snapshot
//   }
//
// Output
//   Plain‑text (normally Markdown) representation of the fetched page.
// -----------------------------------------------------------------------------

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	ListToolsRequestSchema,
	CallToolRequestSchema,
	Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ZenRows } from 'zenrows';

/* -------------------------------------------------------------------------- */
/* Configuration helpers                                                      */
/* -------------------------------------------------------------------------- */

/** Mandatory ZenRows secret key */
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;
if (!ZENROWS_API_KEY) {
	console.error('❌  ZENROWS_API_KEY environment variable not set. Exiting…');
	process.exit(1);
}

const client = new ZenRows(ZENROWS_API_KEY);

type ZenRowsParams = Parameters<typeof client.get>[1]; // ← parameter type
type ZenRowsResp = Awaited<ReturnType<typeof client.get>>; // ← return type

/**
 * Cheap‑to‑expensive attempt ladder.  Each step augments the previous one.
 * Costs (per docs, at the time of writing):
 *   basic                €0.00027996
 *   +premium_proxy       ×10
 *   +js_render           ×5 (cumulative ⇒ stealth ×25)
 */
const ATTEMPTS: Record<
	'basic' | 'premium' | 'stealth' | 'wait',
	ZenRowsParams
> = {
	basic: {
		response_type: 'markdown',
	},
	premium: {
		response_type: 'markdown',
		premium_proxy: true,
	},
	stealth: {
		response_type: 'markdown',
		premium_proxy: true,
		js_render: true,
	},
	wait: {
		response_type: 'markdown',
		premium_proxy: true,
		js_render: true,
		wait: 2500,
	},
};

/** Detects if the HTML/text returned by ZenRows is unusable (blocked, error …) */
function bodyLooksBlocked(body: string): boolean {
	return ['access denied', 'forbidden', 'cloudflare', 'captcha'].some((k) =>
		body.toLowerCase().includes(k)
	);
}

/**
 * Try fetching `url` with progressively more expensive strategies until
 * something usable is obtained or the ladder is exhausted.
 */
async function progressiveFetch(url: string, selector?: string) {
	let lastErr: unknown;

	for (const [tier, params] of Object.entries(ATTEMPTS)) {
		try {
			const extra: ZenRowsParams = selector
				? { wait_for: selector, js_render: true }
				: {};
			const response: ZenRowsResp = await client.get(url, {
				...extra,
				...params,
			});

			/* Axios shape → { data, status }  |  Fetch shape → Response */
			const body =
				'data' in response
					? (response as any).data
					: await (response as Response).text();

			const status =
				'status' in response
					? (response as any).status
					: (response as Response).status;

			if (status >= 400 || bodyLooksBlocked(body)) {
				throw new Error(
					`Received unusable response on tier '${tier}'.`
				);
			}
			return { body, costTier: tier };
		} catch (err) {
			lastErr = err; // escalate to next tier
		}
	}
	throw new Error(`All ZenRows strategies failed: ${String(lastErr)}`);
}

/* -------------------------------------------------------------------------- */
/* MCP tool definition                                                        */
/* -------------------------------------------------------------------------- */

const ZENROWS_FETCH_TOOL: Tool = {
	name: 'zenrowsFetch',
	description:
		'Fetch a web page through ZenRows, returning a clean Markdown rendition. Automatically escalates cost tier if the cheaper mode fails.',
	inputSchema: {
		type: 'object',
		properties: {
			url: {
				type: 'string',
				description: 'Fully‑qualified URL to fetch',
			},
			selector: {
				type: 'string',
				description:
					'(Optional) CSS selector ZenRows must wait for before snapshot. Automatically triggers JS rendering.',
			},
		},
		required: ['url'],
	},
};

/* -------------------------------------------------------------------------- */
/* MCP server wiring                                                          */
/* -------------------------------------------------------------------------- */

const server = new Server(
	{ name: 'zenrows-fetch-server', version: '0.1.0' },
	{ capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [ZENROWS_FETCH_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
	if (req.params.name !== 'zenrowsFetch') {
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `Unknown tool: ${req.params.name}`,
				},
			],
		};
	}

	const { url, selector } = req.params.arguments as {
		url: string;
		selector?: string;
	};

	try {
		const { body, costTier } = await progressiveFetch(url, selector);
		return {
			content: [
				{
					type: 'text',
					text: body,
				},
			],
			additionalParams: {
				meta: { costTier },
			},
		};
	} catch (err) {
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `ZenRows fetch failed: ${String(err)}`,
				},
			],
		};
	}
});

async function run() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('ZenRows MCP server running on stdio');
}

run().catch((e) => {
	console.error('Fatal: ', e);
	process.exit(1);
});
