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
//
// The state also carries the desk's brain/ (Day 2) and the newest files made in the desk.
// /api/team/<id> is a teammate's job card: docs/team/<id>.md one folder up (written by
// /hire), plus whether roster.json and the agent file have them. Read only, and only
// those three places.

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
const UP = join(ROOT, '..');
const ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const idOf = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '-');
function readRoster() {
  try { return JSON.parse(readFileSync(join(UP, 'roster.json'), 'utf8')); } catch { return null; }
}
function teamFromHire() {
  const roster = readRoster();
  if (!roster || !Array.isArray(roster.agents)) return [];
  return roster.agents.map((id) => ({
    id: idOf(id),
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

// The desk's brain (Day 2: brain/ one folder up) and whether CLAUDE.md or AGENTS.md
// tells the team to read it before every task.
const BRAIN = ['company.md', 'desk.md', 'process.md', 'examples.md', 'rules.md'];
function brain() {
  const files = BRAIN.map((name) => {
    try { return { name, present: true, lines: readFileSync(join(UP, 'brain', name), 'utf8').split(/\r?\n/).filter((l) => l.trim()).length }; }
    catch { return { name, present: false, lines: 0 }; }
  });
  let rules = [];
  try {
    rules = readFileSync(join(UP, 'brain', 'rules.md'), 'utf8').split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '').trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('<!--')).slice(0, 8).map((l) => l.slice(0, 160));
  } catch { /* no rules yet */ }
  const reads = ['CLAUDE.md', 'AGENTS.md'].some((f) => { try { return /brain\//i.test(readFileSync(join(UP, f), 'utf8')); } catch { return false; } });
  return { files, rules, reads };
}

// The newest files the team made in the desk folder, names only, two levels deep.
// Only in a real desk folder (one with roster.json), so a clone in the wrong place
// never lists someone's home folder.
const SKIP = new Set(['hq', 'node_modules', 'docs', 'brain']);
const NOT_WORK = new Set(['roster.json', 'CLAUDE.md', 'AGENTS.md', 'hire.config.json']);
function work() {
  if (!existsSync(join(UP, 'roster.json'))) return [];
  const out = [];
  let seen = 0;
  const walk = (rel, depth) => {
    let entries;
    try { entries = readdirSync(join(UP, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (++seen > 600) return;
      if (e.name.startsWith('.') || (depth === 0 && SKIP.has(e.name))) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (depth < 2) walk(r, depth + 1); continue; }
      if (!/\.(md|html|csv|xlsx|txt|json|pdf|png|jpe?g)$/i.test(e.name) || NOT_WORK.has(r)) continue;
      try { out.push({ path: r, when: statSync(join(UP, r)).mtimeMs }); } catch { /* gone */ }
    }
  };
  walk('', 0);
  return out.sort((a, b) => b.when - a.when).slice(0, 8);
}

function customModels() {
  try { return readdirSync(join(ROOT, 'models', 'custom')).filter((f) => /\.(glb|gltf)$/i.test(f)); } catch { return []; }
}

function state() {
  const company = readJSON('company.json', { name: 'My Company', tagline: '' });
  let team = readJSON('team.json', []);
  if (!Array.isArray(team) || team.length === 0) team = teamFromHire();
  else team = team.map((m) => (m && typeof m === 'object' ? { ...m, id: idOf(m.id || m.name) } : m));
  const accessories = readJSON('accessories.json', []);
  let tasks = [];
  try { tasks = tasksFrom(readFileSync(join(ROOT, 'tasks.md'), 'utf8')); } catch { /* no board yet */ }
  return {
    company,
    team: Array.isArray(team) ? team.slice(0, 24) : [],
    accessories: Array.isArray(accessories) ? accessories.slice(0, 200) : [],
    tasks: tasks.slice(0, 8),
    custom: customModels(),
    brain: brain(),
    work: work(),
    logo: ['logo.png', 'logo.jpg', 'logo.svg', 'logo.webp'].find((f) => existsSync(join(ROOT, f))) || null,
  };
}

function member(id) {
  const roster = readRoster();
  const agent = [join('.claude', 'agents', id + '.md'), join('.codex', 'agents', id + '.toml')].find((f) => existsSync(join(UP, f)));
  let doc = null;
  try { doc = readFileSync(join(UP, 'docs', 'team', id + '.md'), 'utf8').slice(0, 20000); } catch { /* not hired with /hire */ }
  return {
    id,
    roster: Boolean(roster && Array.isArray(roster.agents) && roster.agents.map(idOf).includes(id)),
    agent: agent ? agent.split(sep).join('/') : null,
    doc,
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
  if (path.startsWith('/api/team/')) {
    const id = path.slice('/api/team/'.length);
    return ID.test(id) ? send(res, 200, JSON.stringify(member(id)), TYPES['.json']) : send(res, 404, 'not found', 'text/plain');
  }
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
