# Blob maker pages — 2026-08-19

Access date: 2026-08-19 (local 2026-08-18 −03). Cursor-native web (WebSearch + WebFetch). No Grok Build.

The question was not “who else has metaballs.” It was: what do shipped blob products put on a **webpage**, and what does a 2026 visitor see first.

## Pattern (every live page we opened)

The website **is** the product. README GIFs are a fallback for GitHub’s feed, not the demo.

| Product | First screen | Updated / fetched | URL |
|---|---|---|---|
| Glisten | Editorial landing, then ▶ launch the real SDF studio. ▸ Demo drives the live UI with a visible cursor. | **v00000-248 · 2026-08-10** | https://renato.design/glisten/ · https://renato.design/glisten-app/ |
| Blobmaker | Homepage **is** the generator: live SVG, complexity/contrast, dice, download / copy. Now a door into Haikei. | Live 2026-08-19 (origin 2019) | https://www.blobmaker.app/ |
| Haikei blobs | Full playground: canvas, variants, color, SVG/PNG download. | Live 2026-08-19 | https://app.haikei.app/?generator=blob |
| DiceBear | Homepage **is** the playground. Seed → SVG. Style page for `blobs` 10.x with presets + HTTP API. | API **10.x** live 2026-08-19 | https://www.dicebear.com/ · https://www.dicebear.com/styles/blobs/ |
| KuroBlob-AI | Repo README. Homepage field is `http://localhost:3000`. The product is a 60 FPS Canvas app, not a GIF strip. | Created **2026-08-12**, 24★ on fetch | https://github.com/eykicuihb/KuroBlob-AI |
| 2D SDF blobs v.2 | Research page: live GPU refraction, not a contact sheet. | Page still up 2026-08-19 (post 2019-05-16) | https://poniesandlight.co.uk/research/2d_sdf_blobs_2/ |
| HBlobs (before this change) | GitHub Pages rendered **README.md**. First paint = badges + atlas GIFs. | Pages `built`, source `/` on `main` | https://sudopimp.github.io/HBlobs/ |

## What Glisten actually does (steal the move, not the app)

Fetched https://renato.design/glisten/ and https://renato.design/glisten-app/ on 2026-08-19.

- One-line value: “a metaball-first blobjectery.”
- ▶ launch opens the **real** modeler (one HTML file, WebGL2).
- “it demos itself”: ▸ Demo is a guided autopilot that drives the **real UI** with a visible cursor, then cleans up.
- Version stamp on the page (`v00000-248 · last updated 2026-08-10`).
- Honest caveats: research, not product; Windows/Chrome note; Rendre needs WebGPU.
- IBM Plex Mono. Dark studio. Chrome finish named as a shader, not a screenshot of a jiggle.

License on the app (https://renato.design/glisten-app/LICENSE.txt): non-commercial research; do not rehost the app. We do not copy their file, shaders, SEATL environment, or Designo dialect.

## What we must not claim

- We do not beat Glisten at 3D SDF CAD, path tracing, or jewelry builders.
- We do not beat hatch-pet at “any character from image-gen” (https://github.com/openai/skills/blob/main/skills/.curated/hatch-pet/SKILL.md, accessed 2026-08-19).
- We do not beat DiceBear at instant seed URLs for profile icons.
- KuroBlob’s NL → Canvas path is a different cell; we compile locked verbs and **never `eval`**.

## Empty cell we occupy

2D SDF recipe + chrome face (stadium holes, held lean) + 2nd-order springs + slash mutate + Hermes pack. The public site has to **run that cell**, or we are a GIF of a lesser product.

## Decision taken from this fetch

Replace the Pages README render with a root `index.html` that mounts `defineBlob` (`.nojekyll` so Jekyll does not eat the modules). Demo clicks the real chips. Maker stays `playground/lab.html`. Atlas GIFs stay in `demos/` as pack loops, not the hero.
