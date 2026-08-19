# HBlobs

A living 2D blob. The website is the engine.

**[Open the live studio →](https://sudopimp.github.io/HBlobs/)** — one blob, full tab, `defineBlob` running. Pointer follow. Click to pose.

[![MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)
[![Hermes](https://img.shields.io/badge/Hermes-%2Fblob-ff5ec8.svg)](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
[![Pages](https://img.shields.io/badge/live-sudopimp.github.io-111827.svg)](https://sudopimp.github.io/HBlobs/)

Independent project. Not affiliated with Nous Research, Hermes Agent, or xAI.

## Quick start

```bash
hermes skills install sudopimp/HBlobs/skills/blob
```

```text
/blob
/blob color teal
/blob fatter
/blob adopt
```

`/blob adopt` copies the pack into **this process’s** `$HERMES_HOME/pets/<slug>/` and selects it. Do **not** run `hermes pets install <your-slug>` — that command is [gallery-only](https://hermes-agent.nousresearch.com/docs/user-guide/features/pets).

Need a TTY for `hermes pets show`. Desktop walk uses the roam rows in the atlas, not `--state run`.

## Surfaces

| You | Open |
| --- | --- |
| Anyone | [Live studio](https://sudopimp.github.io/HBlobs/) — the engine, not a GIF |
| Sculptor | [playground/lab.html](https://sudopimp.github.io/HBlobs/playground/lab.html) — click-add mass, export pack |
| Hermes | `/blob` → 1536×1872 pack → adopt |
| Engineer | `defineBlob(recipe)` · `node bin/hblobs.mjs new --seed sota-demo` |

Local (ES modules; `file://` will not load):

```bash
python3 -m http.server 8765 --directory .
# http://127.0.0.1:8765/          studio
# http://127.0.0.1:8765/playground/lab.html
```

## Atlas loops (Hermes pack, not the product)

The GIFs are Codex-sheet frames for the pet pack. The character on the website is the live custom element.

<p align="center">
  <img src="demos/idle.gif" alt="Pack idle loop" width="160" />
  <img src="demos/walk.gif" alt="Pack roam loop" width="160" />
  <img src="demos/run.gif" alt="Pack CLI run loop" width="160" />
</p>

[wave](demos/wave.gif) · [jump](demos/jump.gif) · [contact sheet](demos/atlas.png) · [static gallery](demos/index.html)

## Why this exists

Fetched 2026-08-19. Full page teardown: [`evidence/research/blob-pages-2026-08-19.md`](evidence/research/blob-pages-2026-08-19.md).

| Product | They win | We occupy |
| --- | --- | --- |
| [Glisten](https://renato.design/glisten/) v00000-248 (2026-08-10) | 3D SDF CSG, click-to-drop, ▸ Demo drives the real UI | 2D capsule / rbox / subtract + springs. Our page mounts `defineBlob`. |
| [KuroBlob-AI](https://github.com/eykicuihb/KuroBlob-AI) (created 2026-08-12) | NL → live Canvas | `/blob` compiles to a recipe table. **Never `eval`** |
| [DiceBear blobs 10.x](https://www.dicebear.com/styles/blobs/) | Instant seed URL | `--seed` + named looks, then a living pack |
| [Blobmaker](https://www.blobmaker.app/) / [Haikei](https://app.haikei.app/?generator=blob) | Homepage is the generator | Same move: live mark first |
| [hatch-pet](https://github.com/openai/skills/blob/main/skills/.curated/hatch-pet/SKILL.md) | Any character from image-gen | Deterministic atlas, no token raster |

Empty cell we ship: **2D SDF recipe + chrome face + springs + slash mutate + Hermes pack.** We do not beat Glisten at CAD. We do not beat hatch-pet at “any otter from a prompt.”

## Locked `/blob` verbs

`new` · `make` · `color` · `fatter` · `thinner` · `taller` · `rounder` · `add` · `undo` · `name` · `export` · `adopt` · `show` · `open`

Unknown looks (`goth-cyber`, …) fail closed. The skill copies only referenced `scripts/` ([Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)).

## Before you paste a fail

- `/blob` is a **skill slash**, not a native `/pet`. A confused model can invent a PNG — the skill says not to; all writes go through `hblobs`.
- Not bundled. Profiles created with `--no-skills` still need the install.
- Do not write `~/.codex/pets`. Hermes will not see it.
- No `createdBy: "generator"` stamp (that is `/hatch`).
- First hub install shows the third-party warning. We are not in official `TRUSTED_REPOS`.

## License

[MIT](LICENSE). Nominative “works with Hermes Agent” only. No Hermes / Nous / xAI logos.
