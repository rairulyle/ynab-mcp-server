#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Command } from "commander";
import * as ynab from "ynab";
import { createServer, startHttpServer } from "./server.js";
const program = new Command()
    .name("ynab-mcp-server")
    .option("--transport <type>", "transport type: stdio or http", "stdio")
    .option("--port <port>", "port to listen on (http transport only)", "3000")
    .option("--host <host>", "host to bind to (http transport only)", "127.0.0.1");
const main = async () => {
    const { transport, port, host } = program.parse().opts();
    const api = new ynab.API(process.env.YNAB_API_TOKEN || "");
    if (transport === "http") {
        const authToken = process.env.MCP_AUTH_TOKEN || undefined;
        await startHttpServer(api, { port: Number(port), host, authToken });
        console.error(`YNAB MCP server running at http://${host}:${port}/mcp (auth ${authToken ? "enabled" : "disabled"})`);
        return;
    }
    const server = createServer(api);
    await server.connect(new StdioServerTransport());
    console.error("YNAB MCP server running on stdio");
};
main().catch(console.error);
