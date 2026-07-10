#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toVsCodeTemplate(value) {
  if (typeof value === "string") {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, "${env:$1}");
  }
  if (Array.isArray(value)) {
    return value.map(toVsCodeTemplate);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toVsCodeTemplate(v);
    }
    return out;
  }
  return value;
}

function normalizeServer(server) {
  const out = {};

  if (server.type === "http" || (!!server.url && !server.command)) {
    out.type = "http";
    if (server.url) {
      out.url = server.url;
    }
    if (server.headers) {
      out.headers = toVsCodeTemplate(server.headers);
    }
    return out;
  }

  out.type = "stdio";
  if (server.command) {
    out.command = server.command;
  }
  if (server.args) {
    out.args = toVsCodeTemplate(server.args);
  }
  if (server.env) {
    out.env = toVsCodeTemplate(server.env);
  }
  return out;
}

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, ".mcp.json");
const vscodePath = path.join(repoRoot, ".vscode", "mcp.json");

const source = readJson(sourcePath, { mcpServers: {} });
const current = readJson(vscodePath, { servers: {}, inputs: [] });

const sourceServers = source.mcpServers ?? {};
const nextServers = { ...(current.servers ?? {}) };

for (const [name, server] of Object.entries(sourceServers)) {
  nextServers[name] = normalizeServer(server);
}

const next = {
  servers: nextServers,
  inputs: Array.isArray(current.inputs) ? current.inputs : [],
};

fs.mkdirSync(path.dirname(vscodePath), { recursive: true });
fs.writeFileSync(vscodePath, `${JSON.stringify(next, null, "\t")}\n`, "utf8");

const managed = Object.keys(sourceServers).sort();
const allVsCode = Object.keys(nextServers).sort();

console.log(`Synced ${managed.length} server(s) from .mcp.json to .vscode/mcp.json`);
console.log(`Managed servers: ${managed.join(", ")}`);
console.log(`VS Code servers now: ${allVsCode.join(", ")}`);