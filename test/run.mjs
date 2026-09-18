#!/usr/bin/env node
// npm test: no dependencies. Starts the server on a spare port in a temp copy of the
// student files, then checks the API, static files, path safety, the /hire fallback,
// the catalog against ACCESSORIES.md, and the colour tokens.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { readFileSync, existsSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log(`  ok    ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); } };

async function withServer(dir, fn) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [join(dir, 'server.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  for (let i = 0; i < 50 && !/HQ is running: (\S+)/.test(out); i++) await new Promise((r) => setTimeout(r, 100));
  const base = (out.match(/HQ is running: (\S+)/) || [])[1];
  try { await fn(base, out); } finally { child.kill(); }
}
const get = async (base, path) => { const r = await fetch(base + path); return { status: r.status, type: r.headers.get('content-type') || '', text: await r.text() }; };

// a throwaway copy, so tests never touch the real student files
const tmp = mkdtempSync(join(tmpdir(), 'hq-test-'));
const dir = join(tmp, 'hq');
cpSync(ROOT, dir, { recursive: true, filter: (p) => !p.includes(`${'/'}.git`) && !p.includes('\\.git') });

await withServer(dir, async (base, out) => {
  ok(Boolean(base) && base.startsWith('http://127.0.0.1:'), 'server prints its 127.0.0.1 address', out);
  const s = await get(base, '/api/state');
  let state = null;
  try { state = JSON.parse(s.text); } catch {}
  ok(s.status === 200 && state, '/api/state returns JSON');
  ok(state && state.company.name && Array.isArray(state.team) && Array.isArray(state.accessories) && Array.isArray(state.tasks), 'state carries company, team, accessories, tasks');
  const home = await get(base, '/');
  ok(home.status === 200 && home.type.startsWith('text/html') && home.text.includes('js/main.js'), 'index.html is served');
  const glb = await fetch(base + '/models/characters/character-a.glb');
  ok(glb.status === 200 && glb.headers.get('content-type') === 'model/gltf-binary', 'models are served with the glb type');
  // a raw request, so no client tidies the path first
  const raw = await new Promise((resolve) => {
    const u = new URL(base);
    const sock = (net.connect(Number(u.port), u.hostname, () => sock.write('GET /../../../../etc/hosts HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n')));
    let d = ''; sock.on('data', (c) => { d += c; }); sock.on('end', () => resolve(d)); sock.on('error', () => resolve(''));
  });
  ok(!/localhost/.test(raw) && /^HTTP\/1\.1 (404|400)/.test(raw), 'a raw ../ request cannot leave the folder', raw.split('\r\n')[0]);
  for (const bad of ['/%2e%2e/%2e%2e/etc/passwd', '/..%5c..%5cwindows%5cwin.ini', '/.git/config', '/.gitignore']) {
    const r = await get(base, bad);
    ok(r.status === 404 || r.status === 400, `nothing outside the folder or hidden: ${bad}`, String(r.status));
  }
  const post = await fetch(base + '/api/state', { method: 'POST' });
  ok(post.status === 405, 'the server is read only');
  writeFileSync(join(dir, 'accessories.json'), JSON.stringify([{ model: 'plant', near: 'Maya' }]));
  const after = JSON.parse((await get(base, '/api/state')).text);
  ok(after.accessories.length === 1 && after.accessories[0].model === 'plant', 'an edit to accessories.json shows on the next request, no restart');
  writeFileSync(join(dir, 'accessories.json'), '{ broken');
  const broken = await get(base, '/api/state');
  ok(broken.status === 200 && JSON.parse(broken.text).accessories.length === 0, 'a broken accessories.json does not take the office down');
});

// the /hire fallback: empty team.json + ../roster.json
writeFileSync(join(dir, 'team.json'), '[]');
writeFileSync(join(tmp, 'roster.json'), JSON.stringify({ agents: ['maya', 'nora'], routes: { maya: { label: 'Enquiry Desk' }, nora: { label: 'Page replies' } } }));
await withServer(dir, async (base) => {
  const st = JSON.parse((await get(base, '/api/state')).text);
  ok(st.team.length === 2 && st.team[0].name === 'Maya' && st.team[0].job === 'Enquiry Desk', 'team falls back to ../roster.json from /hire');
});

// catalog: every id is documented, every file exists
const { CATALOG, SPOTS } = await import(pathToFileURL(join(ROOT, 'js', 'catalog.js')).href);
const doc = readFileSync(join(ROOT, 'ACCESSORIES.md'), 'utf8');
const missingDoc = Object.keys(CATALOG).filter((id) => !doc.includes('`' + id + '`'));
ok(missingDoc.length === 0, 'every catalog id is in ACCESSORIES.md', missingDoc.join(', '));
const files = Object.values(CATALOG).flatMap((e) => (e.parts ? e.parts.map((p) => p.file) : e.file ? [e.file] : []));
const missingFiles = files.filter((f) => !existsSync(join(ROOT, 'models', f)));
ok(missingFiles.length === 0, 'every catalog model file exists', missingFiles.join(', '));
ok(SPOTS.every((s) => doc.includes('`' + s + '`')), 'every spot name is documented');

// tokens: the colours the scene and the page share must match
const css = readFileSync(join(ROOT, 'css', 'tokens.css'), 'utf8');
const { SETTINGS } = await import(pathToFileURL(join(ROOT, 'js', 'settings.js')).href);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
for (const [cssVar, key] of [['--bg', 'lawn'], ['--fg', 'ink'], ['--accent', 'accent']]) {
  const m = css.match(new RegExp(cssVar + ':\\s*(#[0-9a-fA-F]{6})'));
  ok(m && m[1].toLowerCase() === hex(SETTINGS.scene[key]), `${cssVar} matches SETTINGS.scene.${key}`, m ? m[1] : 'missing');
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
