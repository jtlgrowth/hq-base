#!/usr/bin/env node
// HQ base server: serves this folder and /api/state on your own laptop only.
// Node standard library, no installs. Start it with:  node server.mjs
// Then open the address it prints (http://127.0.0.1:4747 unless that port is busy).
//
// It reads four plain files fresh on every request, so an edit shows up in the page
// within a few seconds with no restart:
//   company.json      name and one-line tagline
//   team.json         who sits at which desk (falls back to ../roster.json from /hire)
//   accessories.json  everything you add to the office
//   tasks.md          the board on the right (lines starting with "- [ ]" or "- [x]")

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1'; // local only: nothing outside this laptop can reach it
const FIRST_PORT = Number(process.env.PORT) || 4747;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

function readJSON(file, fallback) {
  try { return JSON.parse(readFileSync(join(ROOT, file), 'utf8')); } catch { return fallback; }
}

const titleCase = (s) => String(s).replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

// /hire writes roster.json (agents + routes) and docs/team/<name>.md one folder up.
function teamFromHire() {
  const roster = (() => { try { return JSON.parse(readFileSync(join(ROOT, '..', 'roster.json'), 'utf8')); } catch { return null; } })();
  if (!roster || !Array.isArray(roster.agents)) return [];
  return roster.agents.map((id) => ({
    name: titleCase(id),
    job: roster.routes?.[id]?.label || 'AI employee',
    status: 'working',
    source: 'roster.json',
  }));
}

function tasksFrom(md) {
  return md.split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((m) => ({ done: m[1].toLowerCase() === 'x', text: m[2] }));
}

function customModels() {
  try { return readdirSync(join(ROOT, 'models', 'custom')).filter((f) => /\.(glb|gltf)$/i.test(f)); } catch { return []; }
}

function state() {
  const company = readJSON('company.json', { name: 'My Company', tagline: '' });
  let team = readJSON('team.json', []);
  if (!Array.isArray(team) || team.length === 0) team = teamFromHire();
  const accessories = readJSON('accessories.json', []);
  let tasks = [];
  try { tasks = tasksFrom(readFileSync(join(ROOT, 'tasks.md'), 'utf8')); } catch { /* no board yet */ }
  return {
    company,
    team: Array.isArray(team) ? team.slice(0, 24) : [],
    accessories: Array.isArray(accessories) ? accessories.slice(0, 200) : [],
    tasks: tasks.slice(0, 8),
    custom: customModels(),
    logo: ['logo.png', 'logo.jpg', 'logo.svg', 'logo.webp'].find((f) => existsSync(join(ROOT, f))) || null,
  };
}

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'read only', 'text/plain');
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(res, 400, 'bad path', 'text/plain'); }
  if (path === '/api/state') return send(res, 200, JSON.stringify(state()), TYPES['.json']);
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(ROOT, '.' + path);
  // Never serve anything outside this folder, and never hidden files.
  if (!(file === ROOT || file.startsWith(ROOT + sep)) || path.split('/').some((p) => p.startsWith('.'))) {
    return send(res, 404, 'not found', 'text/plain');
  }
  if (!existsSync(file) || !statSync(file).isFile()) return send(res, 404, 'not found', 'text/plain');
  send(res, 200, req.method === 'HEAD' ? '' : readFileSync(file), TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
});

// Busy port? Try the next ones, and say which address it landed on.
function listen(port, tries = 10) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && tries > 0) return listen(port + 1, tries - 1);
    console.error(`could not start: ${e.message}`);
    process.exit(1);
  });
  server.listen(port, HOST, () => {
    console.log(`HQ is running: http://127.0.0.1:${port}`);
    console.log('Leave this window open. Press Ctrl+C to stop it.');
  });
}
listen(FIRST_PORT);
