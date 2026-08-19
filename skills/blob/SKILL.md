---
name: blob
description: Make a living 2D blob and adopt it as a Hermes pet. Use when the user types /blob or wants a new blob, a color change, a reshape, export, or adopt. Run the referenced scripts; never invent a PNG.
---

Node must be on PATH. Keep this checkout available so `scripts/hblobs.mjs` can wrap the repo CLI.

Call `scripts/hblobs.mjs`. Never invent a PNG.

| User | Run |
| --- | --- |
| `/blob` · `/blob new` [look\|prompt] | `node scripts/hblobs.mjs new` (`hblobs new`) |
| `/blob make` … | `node scripts/hblobs.mjs make` (`hblobs make`) |
| `/blob color` `<hex\|name>` | `node scripts/hblobs.mjs color` (`hblobs color`) |
| `/blob fatter` | `node scripts/hblobs.mjs fatter` (`hblobs fatter`) |
| `/blob thinner` | `node scripts/hblobs.mjs thinner` (`hblobs thinner`) |
| `/blob taller` | `node scripts/hblobs.mjs taller` (`hblobs taller`) |
| `/blob rounder` | `node scripts/hblobs.mjs rounder` (`hblobs rounder`) |
| `/blob add` hole, ear, or goo | `node scripts/hblobs.mjs add` (`hblobs add`) |
| `/blob undo` | `node scripts/hblobs.mjs undo` (`hblobs undo`) |
| `/blob name` `<slug>` | `node scripts/hblobs.mjs name` (`hblobs name`) |
| `/blob export` | `node scripts/hblobs.mjs export` (`hblobs export`) |
| `/blob adopt` | `node scripts/hblobs.mjs adopt` (`hblobs adopt`) — copy into `$HERMES_HOME/pets/<slug>/` then `hermes pets select <slug>` |
| `/blob show` | `node scripts/hblobs.mjs show` (`hblobs show`) — `hermes pets show --state idle --once`; `--state run` needs a TTY |
| `/blob open` | `node scripts/hblobs.mjs open` (`hblobs open`) — optional `playground/lab.html` |

Independent project — not Nous, Hermes, or xAI.

Do not write `createdBy: generator`.
Never use `~/.codex/pets`.
Do not run `hermes pets install` (gallery-only). Do not follow Hermes' install hint.
