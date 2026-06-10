import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as ynab from "ynab";

import { startHttpServer } from "../server.js";

const jsonRpcHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test-client", version: "0.0.0" },
  },
});

describe("http transport", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = await startHttpServer(new ynab.API("test-token"), {
      port: 0,
      host: "127.0.0.1",
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("responds to initialize", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: initializeBody,
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

  it("annotates tools with read-only and destructive hints", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" }),
    });

    const { tools } = (await res.json()).result;
    const byName = Object.fromEntries(tools.map((t: any) => [t.name, t]));
    expect(byName.ynab_list_budgets.annotations.readOnlyHint).toBe(true);
    expect(byName.ynab_create_transaction.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(byName.ynab_delete_transaction.annotations.destructiveHint).toBe(true);
  });

  it("advertises a server icon", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: initializeBody,
    });

    const { serverInfo } = (await res.json()).result;
    expect(serverInfo.title).toBe("YNAB");
    expect(serverInfo.icons[0].src).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("rejects non-POST requests with 405 instead of holding an SSE stream open", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      headers: { Accept: "text/event-stream" },
    });

    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
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

describe("http transport with auth token", () => {
  const authToken = "test-secret-token";
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = await startHttpServer(new ynab.API("test-token"), {
      port: 0,
      host: "127.0.0.1",
      authToken,
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("rejects requests without credentials", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: initializeBody,
    });

    expect(res.status).toBe(401);
  });

  it("accepts a valid bearer token", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { ...jsonRpcHeaders, Authorization: `Bearer ${authToken}` },
      body: initializeBody,
    });

    expect(res.status).toBe(200);
  });

  it("rejects an invalid bearer token", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { ...jsonRpcHeaders, Authorization: "Bearer wrong-token" },
      body: initializeBody,
    });

    expect(res.status).toBe(401);
  });

  it("accepts the token as a secret path segment", async () => {
    const res = await fetch(`${baseUrl}/mcp/${authToken}`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: initializeBody,
    });

    expect(res.status).toBe(200);
  });

  it("rejects a wrong secret path segment", async () => {
    const res = await fetch(`${baseUrl}/mcp/wrong-token`, {
      method: "POST",
      headers: jsonRpcHeaders,
      body: initializeBody,
    });

    expect(res.status).toBe(401);
  });

  it("still rejects non-POST methods after auth", async () => {
    const res = await fetch(`${baseUrl}/mcp/${authToken}`, {
      headers: { Accept: "text/event-stream" },
    });

    expect(res.status).toBe(405);
  });
});
