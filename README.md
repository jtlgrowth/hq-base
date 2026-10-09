# HQ base

Your AI team's office, in 3D, running on your own laptop. One desk per teammate, a
board for today, and a lounge you fill with whatever you like: plants, a coffee corner,
a cat, your logo on the wall.

Everyone starts from this same base. You make it yours by changing four small files,
usually by just telling Claude Code what you want ("add a plant next to Maya").

## Start it

You need Node.js 20 or newer (`node --version`). Nothing else to install.

```bash
git clone --depth 1 https://github.com/jtlgrowth/hq-base hq
cd hq
node server.mjs
```

Open the address it prints, usually http://127.0.0.1:4747. Leave that terminal open;
Ctrl+C stops it. It only listens on your own laptop.

It starts empty on purpose: every office is the owner's own. To see a finished one first,
copy the four files from `examples/sunrise-cafe/` over the ones here.

## Make it yours

| File | What to change |
|---|---|
| `company.json` | your company name, one-line tagline, and the room's `look` (walls, floor, outside) |
| `team.json` | who sits where (or leave `[]` and it reads `../roster.json` from the /hire skill) |
| `accessories.json` | what is in the office; every option is in [ACCESSORIES.md](ACCESSORIES.md) |
| `tasks.md` | the board on the right, one `- [ ] task` per line |

Click a name to open that teammate's job card: what /hire wrote about them, whether they
are wired in (roster.json, the agent file, the job card, the brain), and a brief ready to
paste. The panel on the right shows Today (tasks.md), Brain (your `../brain/` files and
rules) and Work (the newest files your team made). An LED screen on the wall can show any
of them, live.

The page picks up changes within a few seconds, no restart. Drag to turn the office,
scroll to zoom. "Pause motion" stops the animation, and it stays off if your system asks
for reduced motion.

## Quick settings

Colors and type: `css/tokens.css`. The 3D colors: `js/settings.js` (`SETTINGS.scene`),
kept in step with the CSS by `npm test`.

## Tests

```bash
npm test
```

Starts the server on a spare port and checks the API, the static files, that nothing
outside this folder can be read, the /hire fallback, the catalog against ACCESSORIES.md,
and the color tokens.

## Credits and license

Code: MIT, see [LICENSE](LICENSE). Models: CC0 by Kenney, see [CREDITS.md](CREDITS.md).
Three.js: MIT. Made by [JTL Growth](https://jtlgrowth.com).
