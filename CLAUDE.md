# HQ base: rules for the AI working in this folder

This folder is a 3D office that runs on this laptop. Everyone starts from the same base;
the owner makes it theirs by changing four files. Keep it that way.

It ships empty on purpose. Always write the owner's own answers into all four files, even
when a file already has something in it. `examples/sunrise-cafe/` is a finished sample to
look at, never a default to keep.

## Change only these

| File | What it holds |
|---|---|
| `company.json` | `name` and a one-line `tagline` |
| `team.json` | one entry per desk: `name`, `job`, `character` (a letter `a` to `h`), `status` (`working`, `idle`, `waiting`, `away`). Leave it as `[]` to use `../roster.json` from /hire instead |
| `accessories.json` | everything added to the office. Every id is in `ACCESSORIES.md` |
| `tasks.md` | the board: lines like `- [ ] Send the quote` and `- [x] Done thing` (up to 8 show) |

A logo goes in this folder as `logo.png` (or .jpg, .svg, .webp), then add `{ "model": "logo" }`.
A model of their own goes in `models/custom/` as a `.glb`, used as `"custom/name.glb"`.

## Do not change

`index.html`, `js/`, `css/`, `server.mjs`, `vendor/`, `models/` (except `models/custom/`).
If the owner asks for something the four files cannot do, say so and suggest the closest
accessory; do not edit the base. A change of colors is the one exception: `css/tokens.css`
and `js/settings.js` hold them, and they must stay in step (`npm test` checks).

## When the owner says "add a ___ to the office"

1. Find the closest id in `ACCESSORIES.md`. A set (`coffee-corner`, `tv-wall`,
   `reading-nook`, `lounge-set`) is usually better than single pieces.
2. Add one entry to `accessories.json`. Prefer `near` (a teammate's name) or `spot`
   (`lounge`, `pantry`, `entrance`, `hub`, `back-left`, `back-right`, `front-left`,
   `front-right`) over `x`/`z` numbers.
3. Keep the file valid JSON. Tell them it will appear in a few seconds, no restart needed.

## Running it

- Start: `node server.mjs` in this folder, then open the address it prints
  (http://127.0.0.1:4747 unless that port is busy). Run it in the background so the
  chat stays usable.
- It only listens on this laptop (127.0.0.1). Never change that to 0.0.0.0.
- Check it is up: `http://127.0.0.1:4747/api/state` returns the four files as JSON.
