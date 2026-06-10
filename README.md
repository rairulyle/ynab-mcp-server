[![MseeP.ai Security Assessment Badge](https://mseep.net/mseep-audited.png)](https://mseep.ai/app/calebl-ynab-mcp-server)

# ynab-mcp-server
[![smithery badge](https://smithery.ai/badge/@calebl/ynab-mcp-server)](https://smithery.ai/server/@calebl/ynab-mcp-server)

A Model Context Protocol (MCP) server built with mcp-framework. This MCP provides tools
for interacting with your YNAB budgets setup at https://ynab.com

<a href="https://glama.ai/mcp/servers/@calebl/ynab-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@calebl/ynab-mcp-server/badge" alt="YNAB Server MCP server" />
</a>

In order to have an AI interact with this tool, you will need to get your Personal Access Token
from YNAB: https://api.ynab.com/#personal-access-tokens. When adding this MCP server to any
client, you will need to provide your personal access token as YNAB_API_TOKEN. **This token
is never directly sent to the LLM.** It is stored privately in an environment variable for
use with the YNAB api.

## Setup
Specify env variables:
* YNAB_API_TOKEN (required)
* YNAB_BUDGET_ID (optional)

## Goal
The goal of the project is to be able to interact with my YNAB budget via an AI conversation.
There are a few primary workflows I want to enable:

## Workflows:
### First time setup
* be prompted to select your budget from your available budgets. If you try to use another
tool first, this prompt should happen asking you to set your default budget.
  * Tools needed: ListBudgets
### Manage overspent categories
### Adding new transactions
### Approving transactions
### Check total monthly spending vs total income
### Auto-distribute ready to assign funds based on category targets

## Current state
Available tools:
* ListBudgets - lists available budgets on your account
* BudgetSummary - provides a summary of categories that are underfunded and accounts that are low
* GetUnapprovedTransactions - retrieve all unapproved transactions
* CreateTransaction - creates a transaction for a specified budget and account.
  * example prompt: `Add a transaction to my Ally account for $3.98 I spent at REI today`
  * requires GetBudget to be called first so we know the account id
* ApproveTransaction - approves an existing transaction in your YNAB budget
  * requires a transaction ID to approve
  * can be used in conjunction with GetUnapprovedTransactions to approve pending transactions
  * After calling get unapproved transactions, prompt: `approve the transaction for $6.95 on the Apple Card`

Next:
* be able to approve multiple transactions with 1 call
* updateCategory tool - or updateTransaction more general tool if I can get optional parameters to work correctly with zod & mcp framework
* move off of mcp framework to use the model context protocol sdk directly?


## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

```

## Project Structure

```
ynab-mcp-server/
├── src/
│   ├── tools/        # MCP Tools
│   └── index.ts      # Server entry point
├── .cursor/
│   └── rules/        # Cursor AI rules for code generation
├── package.json
└── tsconfig.json
```

## Adding Components

The YNAB sdk describes the available api endpoints: https://github.com/ynab/ynab-sdk-js.

YNAB open api specification is here: https://api.ynab.com/papi/open_api_spec.yaml. This can
be used to prompt an AI to generate a new tool. Example prompt for Cursor Agent:

```
create a new tool based on the readme and this openapi doc: https://api.ynab.com/papi/open_api_spec.yaml

The new tool should get the details for a single budget
```

You can add more tools using the CLI:

```bash
# Add a new tool
mcp add tool my-tool

# Example tools you might create:
mcp add tool data-processor
mcp add tool api-client
mcp add tool file-handler
```

## Tool Development

Example tool structure:

```typescript
import { MCPTool } from "mcp-framework";
import { z } from "zod";

interface MyToolInput {
  message: string;
}

class MyTool extends MCPTool<MyToolInput> {
  name = "my_tool";
  description = "Describes what your tool does";

  schema = {
    message: {
      type: z.string(),
      description: "Description of this input parameter",
    },
  };

  async execute(input: MyToolInput) {
    // Your tool logic here
    return `Processed: ${input.message}`;
  }
}

export default MyTool;
```

## Publishing to npm

1. Update your package.json:
   - Ensure `name` is unique and follows npm naming conventions
   - Set appropriate `version`
   - Add `description`, `author`, `license`, etc.
   - Check `bin` points to the correct entry file

2. Build and test locally:
   ```bash
   npm run build
   npm link
   ynab-mcp-server  # Test your CLI locally
   ```

3. Login to npm (create account if necessary):
   ```bash
   npm login
   ```

4. Publish your package:
   ```bash
   npm publish
   ```

After publishing, users can add it to their claude desktop client (read below) or run it with npx


## Transports

The server supports two transports:

| Transport | Command | Use case |
|---|---|---|
| stdio (default) | `node dist/index.js` | Local clients that spawn the process (Claude Desktop config, Claude Code) |
| Streamable HTTP | `node dist/index.js --transport http [--port 3000] [--host 127.0.0.1]` | Running as a service (Docker) and connecting by URL |

In HTTP mode the MCP endpoint is served at `http://<host>:<port>/mcp`.

### Authentication (HTTP mode)

Set `MCP_AUTH_TOKEN` to require a credential on every request (generate one with `openssl rand -hex 32`). Clients can present it two ways:

- `Authorization: Bearer <token>` header — for clients that support headers (Claude Code, mcp-remote, MCP Inspector)
- Secret path: `https://your-domain/mcp/<token>` — for clients that can't send custom headers (Claude custom connectors)

Without `MCP_AUTH_TOKEN` the endpoint is open; only run it that way on localhost or a private network.

## Running with Docker

### Using the prebuilt image (GHCR)

Images are published automatically to GHCR on every release/`v*` tag (multi-arch: amd64 + arm64):

```bash
docker run -d \
  --name ynab-mcp \
  -e YNAB_API_TOKEN=your-ynab-token \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/rairulyle/ynab-mcp-server:latest
```

### Building locally

```bash
docker build -t ynab-mcp-server .
docker run -d --name ynab-mcp --env-file .env -p 3000:3000 --restart unless-stopped ynab-mcp-server
```

(`.env` needs `YNAB_API_TOKEN=...`; optionally `YNAB_BUDGET_ID=...`.)

### Verifying it works

```bash
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

You should get back a JSON list of the 16 `ynab_*` tools. For an interactive UI, run `npx @modelcontextprotocol/inspector` and connect to `http://localhost:3000/mcp` with transport "Streamable HTTP".

## Connecting to agents

### Claude Desktop (custom connector, HTTP)

Claude's custom connectors (Settings → Connectors → Add custom connector) are connected **from Anthropic's servers**, not from your machine — so the URL must be publicly reachable over HTTPS. `http://localhost:3000/mcp` will not work there.

The intended setup is to run the Docker container on a server behind a reverse proxy (Caddy, nginx, Traefik, Cloudflare Tunnel, …) that terminates TLS on your own domain, with `MCP_AUTH_TOKEN` set on the container. Since the connector dialog can't send headers, embed the token in the URL:

```
https://ynab.your-domain.com/mcp/<your-MCP_AUTH_TOKEN>
```

> **Security warning:** never expose the endpoint on a public domain without `MCP_AUTH_TOKEN` — anyone who can reach an unauthenticated endpoint can read and modify your budgets. Treat the tokenized URL itself as a secret.

### Claude Desktop (local stdio)

If Claude Desktop runs on the same machine, skip HTTP entirely and let it spawn the server over stdio via `claude_desktop_config.json`:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ynab": {
      "command": "node",
      "args": ["/absolute/path/to/ynab-mcp-server/dist/index.js"],
      "env": { "YNAB_API_TOKEN": "your-ynab-token" }
    }
  }
}
```

**Windows + WSL:** Claude Desktop on Windows can run the server inside WSL by bridging stdio through `wsl.exe`:

```json
{
  "mcpServers": {
    "ynab": {
      "command": "wsl.exe",
      "args": [
        "bash", "-c",
        "YNAB_API_TOKEN=your-ynab-token exec node /home/you/ynab-mcp-server/dist/index.js"
      ]
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add ynab --env YNAB_API_TOKEN=your-ynab-token -- node /absolute/path/to/ynab-mcp-server/dist/index.js
```

## Using with Claude Desktop

### Installing via Smithery

To install YNAB Budget Assistant for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@calebl/ynab-mcp-server):

```bash
npx -y @smithery/cli install @calebl/ynab-mcp-server --client claude
```

### After Publishing

Once published to npm, the stdio config can use `npx` instead of a local path:

```json
{
  "mcpServers": {
    "ynab": {
      "command": "npx",
      "args": ["ynab-mcp-server"],
      "env": { "YNAB_API_TOKEN": "your-ynab-token" }
    }
  }
}
```

### Other MCP Clients
Check https://modelcontextprotocol.io/clients for other available clients.

## Building and Testing

1. Make changes to your tools
2. Run `npm run build` to compile
3. The server will automatically load your tools on startup

## Learn More

- [MCP Framework Github](https://github.com/QuantGeekDev/mcp-framework)
- [MCP Framework Docs](https://mcp-framework.com)
