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
import { ListToolsRequestSchema, CallToolRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
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
/**
 * Cheap‑to‑expensive attempt ladder.  Each step augments the previous one.
 * Costs (per docs, at the time of writing):
 *   basic                €0.00027996
 *   +premium_proxy       ×10
 *   +js_render           ×5 (cumulative ⇒ stealth ×25)
 */
const ATTEMPTS = {
    // level 0 – cheapest possible request
    basic: {
        response_type: 'markdown',
    },
    // level 1 – if basic fails, retry with a premium proxy
    premium: {
        response_type: 'markdown',
        premium_proxy: 'true',
    },
    // level 2 – stealth: premium proxy + JavaScript rendering
    stealth: {
        response_type: 'markdown',
        premium_proxy: 'true',
        js_render: 'true',
    },
    // level 3 – stealth with an additional wait time (2.5 s)
    wait: {
        response_type: 'markdown',
        premium_proxy: 'true',
        js_render: 'true',
        wait: '2500',
    },
};
/** Detects if the HTML/text returned by ZenRows is unusable (blocked, error …) */
function bodyLooksBlocked(body) {
    const blockKeywords = [
        'access denied',
        'not allowed',
        'forbidden',
        'cloudflare',
        'captcha',
    ];
    return blockKeywords.some((k) => body.toLowerCase().includes(k));
}
/**
 * Try fetching `url` with progressively more expensive strategies until
 * something usable is obtained or the ladder is exhausted.
 */
async function progressiveFetch(url, selector) {
    let lastErr = undefined;
    for (const [tier, params] of Object.entries(ATTEMPTS)) {
        try {
            const request = await client.get(url, {
                ...(selector ? { wait_for: selector, js_render: 'true' } : {}),
                ...params,
            });
            const body = await request.text();
            if (request.status >= 400 || bodyLooksBlocked(body)) {
                throw new Error(`Received unusable response on tier '${tier}'.`);
            }
            return { body, costTier: tier };
        }
        catch (err) {
            lastErr = err;
            // fallthrough – escalate to next tier
        }
    }
    // If we get here every tier failed.
    throw new Error(`All ZenRows strategies failed: ${String(lastErr)}`);
}
/* -------------------------------------------------------------------------- */
/* MCP tool definition                                                        */
/* -------------------------------------------------------------------------- */
const ZENROWS_FETCH_TOOL = {
    name: 'zenrowsFetch',
    description: 'Fetch a web page through ZenRows, returning a clean Markdown rendition. Automatically escalates cost tier if the cheaper mode fails.',
    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'Fully‑qualified URL to fetch',
            },
            selector: {
                type: 'string',
                description: '(Optional) CSS selector ZenRows must wait for before snapshot. Automatically triggers JS rendering.',
            },
        },
        required: ['url'],
    },
};
/* -------------------------------------------------------------------------- */
/* MCP server wiring                                                          */
/* -------------------------------------------------------------------------- */
const server = new Server({ name: 'zenrows-fetch-server', version: '0.1.0' }, { capabilities: { tools: {} } });
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
    const { url, selector } = req.params.arguments;
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
    }
    catch (err) {
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
