import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as ynab from "ynab";

import { startHttpServer } from "../server.js";

const jsonRpcHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

describe("http transport", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = await startHttpServer(new ynab.API("test-token"), 0, "127.0.0.1");
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("responds to initialize", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client", version: "0.0.0" },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("ynab-mcp-server");
  });

  it("lists tools on a separate stateless request", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.tools.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown paths", async () => {
    const res = await fetch(`${baseUrl}/other`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: "{}",
    });

    expect(res.status).toBe(404);
  });
});
