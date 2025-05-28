# ZenRows Fetch MCP Server

An **M**odel **C**ontext **P**rotocol (MCP) server that retrieves web pages through [ZenRows](https://www.zenrows.com/) and returns a clean, Markdown‑formatted snapshot—while automatically escalating from the cheapest request mode to more advanced (and expensive) bypass levels only when needed.

---

## ✨ Features

-   **Cost‑aware escalation** – starts with the base ZenRows request and retries with Premium Proxy → Stealth (Premium + JS) → Stealth + Wait (2 .5 s) until useful content is obtained.
-   **LLM‑ready output** – delivers Markdown/text instead of raw HTML, ideal for downstream summarisation or analysis.
-   **Optional selector wait** – pass a CSS selector to wait for (implies JS rendering) when working with SPAs or late‑loading content.
-   **Blocked‑page detection** – heuristically recognises captchas/forbidden responses and escalates automatically.
-   **Cost tier metadata** – the final tier used (`basic`, `premium`, `stealth`, or `wait`) is returned in `additionalParams.meta.costTier`.
-   **Zero‑config runtime** – ship as an `npx` one‑liner, a slim Docker image, or run directly on Node 22+.

---

## 🛠️ Tool

### `zenrowsFetch`

Fetches a web page through ZenRows and returns its Markdown rendition.

| Input      | Type     | Required | Description                                                                              |
| ---------- | -------- | -------- | ---------------------------------------------------------------------------------------- |
| `url`      | `string` | ✅       | Fully‑qualified URL to fetch.                                                            |
| `selector` | `string` |          | CSS selector ZenRows must wait for before snapshot (automatically enables JS rendering). |

> **Output** – Plain‑text (Markdown) content of the page. The enclosing MCP response includes `additionalParams.meta.costTier`.

---

## 🚀 Usage

Use `zenrowsFetch` whenever you need a lightweight, resilient webpage retriever that:

-   Minimises cost by default but adapts when the target site blocks basic scraping.
-   Produces clean, LLM‑friendly Markdown with no extra parsing steps.
-   Works equally well for simple HTML pages and heavy JavaScript single‑page apps.

Typical scenarios include web‑content summarisation, ad‑hoc research pipelines, and programmatic ingestion of news/article sites.

---

## ⚙️ Configuration

### Claude Desktop

#### `npx`

```jsonc
{
	"mcpServers": {
		"zenrows-fetch": {
			"command": "npx",
			"args": ["-y", "@leonbeckert/server-zenrows"],
			"env": {
				"ZENROWS_API_KEY": "zenrw_…"
			}
		}
	}
}
```

#### `docker`

```jsonc
{
	"mcpServers": {
		"zenrows-fetch": {
			"command": "docker",
			"args": [
				"run",
				"--rm",
				"-i",
				"-e",
				"ZENROWS_API_KEY=zenrw_…",
				"leonbeckert/mcp-zenrows"
			]
		}
	}
}
```

### VS Code / VS Code Insiders (one‑click)

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=zenrows-fetch&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40leonbeckert%2Fserver-zenrows%22%5D%2C%22env%22%3A%7B%22ZENROWS_API_KEY%22%3A%22zenrw_%E2%80%A6%22%7D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=zenrows-fetch&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40leonbeckert%2Fserver-zenrows%22%5D%2C%22env%22%3A%7B%22ZENROWS_API_KEY%22%3A%22zenrw_%E2%80%A6%22%7D%7D&quality=insiders)

[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=zenrows-fetch&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22--rm%22%2C%22-i%22%2C%22-e%22%2C%22ZENROWS_API_KEY%3Dzenrw_%E2%80%A6%22%2C%22mcp%2Fzenrows%22%5D%7D) [![Install with Docker in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Docker-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=zenrows-fetch&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22--rm%22%2C%22-i%22%2C%22-e%22%2C%22ZENROWS_API_KEY%3Dzenrw_%E2%80%A6%22%2C%22mcp%2Fzenrows%22%5D%7D&quality=insiders)

#### Manual JSON (user settings)

```jsonc
{
	"mcp": {
		"servers": {
			"zenrows-fetch": {
				"command": "npx",
				"args": ["-y", "@leonbeckert/mcp-zenrows"],
				"env": {
					"ZENROWS_API_KEY": "zenrw_…"
				}
			}
		}
	}
}
```

Or, for Docker:

```jsonc
{
	"mcp": {
		"servers": {
			"zenrows-fetch": {
				"command": "docker",
				"args": [
					"run",
					"--rm",
					"-i",
					"-e",
					"ZENROWS_API_KEY=zenrw_…",
					"leonbeckert/mcp-zenrows"
				]
			}
		}
	}
}
```

---

## 🏗️ Building

```bash
# Build minimal production image
docker build -t mcp/zenrows .
```

---

## 🪪 License

This project is licensed under the **MIT License**—see the `LICENSE` file for details.
