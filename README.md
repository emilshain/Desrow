# Desrow

**Spreadsheet rows in. Graded, template-perfect portrait assets out.**

Desrow is a local-first studio for turning a CSV or public Google Sheet of names and portrait links into batches of designed assets. It detects faces in the browser, crops to the template's photo frame, converts portraits to a controllable monochrome grade, adds film grain, merges typography and artwork, then exports full-resolution files and a ZIP manifest.

Everything — datasets, templates, embedded fonts, rendered frames and batch history — lives in this browser. There is no account, no backend database and no third-party inference call.

---

## Why it exists

A portrait archive is usually a spreadsheet plus a folder of inconsistent photos plus a design file. Producing hundreds of named, consistently cropped assets by hand is slow and error-prone. Desrow treats the spreadsheet as the source of truth, the template as the layout contract, and the browser as the render engine.

Core promises:

- **The artwork defines the output.** Upload master artwork and its native pixel size becomes the canvas and export size. The artwork is the full-bleed background.
- **Every control is manual.** Crop scale and placement, channel mix, tone curve, contrast, brightness, grain amount/size/seed, font, size, weight, tracking, line height, alignment, opacity, frame position, corner radius and border are all editable. Per-record crop overrides sit on top of global defaults.
- **Type belongs to the layout.** Use bundled Inter, Instrument Serif and JetBrains Mono, upload WOFF2/WOFF/TTF/OTF files that travel with the template, or call an installed device font by family name.
- **Nothing leaves the browser.** Source photos pass through a guarded same-origin image proxy only so the canvas can read them; rendered files and history stay in IndexedDB.

## Feature set

| Area | What is implemented |
| --- | --- |
| Source | CSV drag-and-drop or file picker; public Google Sheets import by link; automatic column-mapping suggestions; up to 5,000 rows; per-row portrait previews; dataset library |
| Templates | Artwork upload adopts native dimensions; blank or starter-layer presets; draggable/resizable photo frame; unlimited text layers; exact width/height fields; canvas colour |
| Typography | Bundled fonts; custom font-file upload embedded in the template; device-font family picker with optional Chromium local-font scan; exact pixel size entry; weight, tracking, line height, alignment, opacity, uppercase, colour |
| Imaging | MediaPipe BlazeFace face detection in-browser; face-relative crop; manual fallback crop; per-record overrides; channel mix; monotone cubic tone curve; contrast and brightness; seeded grain |
| Output | 1× / 1.5× / 2× scale; PNG or JPEG; JPEG quality; tokenised filename pattern with duplicate protection |
| Batch | 1–4 parallel renders; live progress and contact sheet; failures/skips reported per row; cancel; batches persisted |
| Exports | Full-resolution assets in IndexedDB; individual downloads; ZIP with assets, `manifest.csv` and `desrow-settings.json`; batch history and deletion |
| Privacy | Local-first IndexedDB; no account; no analytics; no cloud persistence; no external ML service |

## Quick start

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first `dev`/`build` runs `scripts/sync-face-assets.mjs`, which copies the MediaPipe WASM runtime from `node_modules` into `public/mediapipe/` and checks for the BlazeFace model at `public/models/blaze_face_short_range.tflite`.

Production check:

```bash
npm run typecheck
npm run build
npm run start
```

## The workflow

1. **Source** — drop a CSV or paste a public Google Sheet link. Map the name column and the portrait-link column. Every other column becomes a `{{token}}`.
2. **Templates** — upload master artwork (the canvas adopts its pixel size) or choose a fallback size. Place the photo frame and text layers directly on the canvas or with exact inspector values.
3. **Render** — choose the dataset and template, set the crop, tone, grain and output controls, inspect a record, optionally save a per-record crop override, then run the batch.
4. **Export** — download individual frames or the whole ZIP. Batches remain in **Exports** until deleted.

### Tokens

Text layers and filename patterns accept `{{column}}` tokens. Matching is case-insensitive. Canonical aliases are added from the mapping so the starter template works with ordinary spreadsheet headers:

- `{{name}}` → the mapped name column (explicit `name` columns win)
- `{{title}}` → a column such as `Role`, `Title`, `Position` or `Job Title`
- `{{id}}` → a column such as `ID`, `Identifier`, `Badge` or `Number`
- `{{photo}}`, `{{portrait}}`, `{{image}}` → the mapped portrait column
- `{{index}}` → the record's 1-based position, available in filename patterns

Any real column can also be used directly, e.g. `{{Full Name}}`.

### Supported portrait links

- Direct public image URLs (`https://…/photo.jpg`)
- Google Drive share links (`https://drive.google.com/file/d/<id>/view…`)
- Google Drive `open?id=` and thumbnail-style links

The file must be shared so that anyone with the link can view it. Private Drive files cannot be fetched by the proxy. Images are capped at 25 MB and must return an image content type.

## Project structure

```
src/
  app/                 Next.js routes: overview, source, templates, render, exports, API
  components/          App shell, shared UI, source/template/render panels
  lib/
    csv.ts             CSV parsing, mapping detection, token aliases
    sheets.ts          Google Sheets link → CSV export resolution
    drive.ts           Drive link normalisation and same-origin image proxy URLs
    face.ts            MediaPipe BlazeFace loader, queue and cache
    crop.ts            Face-relative crop maths
    curve.ts           Monotone curve, LUT, contrast/brightness
    image.ts           Canvas grading, seeded grain, encoding helpers
    text-layout.ts     Token resolution, wrapping, font metrics
    fonts.ts           Bundled, embedded and device font plumbing
    render.ts          Template compositor
    job.ts             Concurrent batch engine
    db.ts              Dexie/IndexedDB persistence
    zip.ts             Export archive and manifest
  lib/server/          SSRF guard and guarded fetch used by API routes
public/models/         BlazeFace model
public/mediapipe/      Generated WASM runtime (git-ignored)
scripts/               Face-asset sync
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js with the asset sync pre-step |
| `npm run build` | Production build with the asset sync pre-step |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript without emitting |
| `npm run sync:assets` | Copy MediaPipe WASM and validate the face model |

## Configuration

No secrets are required.

| Variable | Default | Purpose |
| --- | --- | --- |
| `IMAGE_PROXY_ALLOWLIST` | empty | Optional comma-separated host allowlist for `/api/image` and `/api/sheets` (subdomains included). Example: `docs.google.com,drive.google.com,googleusercontent.com,images.unsplash.com`. Set it in shared deployments to narrow outbound access. |

The image proxy resolves DNS on every redirect and blocks loopback, link-local, private and metadata-style addresses. See [SECURITY.md](SECURITY.md).

## Documentation

**Product and engineering**

- [PRD](docs/PRD.md) — product definition, users, requirements, scope
- [TRD](docs/TRD.md) — architecture, algorithms, APIs, trade-offs
- [App flow](docs/App_flow.md) — routes, journeys, states and interactions
- [Design](docs/Design.md) — visual system, terminology, components, accessibility
- [Database schema](docs/database_schema.md) — IndexedDB stores, relationships and lifecycle

**Working with the codebase**

- [BUILD.md](BUILD.md) — setup, build, verification and troubleshooting
- [TODO.md](TODO.md) — shipped work and next milestones
- [CLAUD.md](CLAUD.md) — project-specific working notes for AI coding agents
- [AGENT.md](AGENT.md) — agent operating protocol and definition of done
- [SECURITY.md](SECURITY.md) — threat model, controls and disclosure
- [CHANGELOG.md](CHANGELOG.md) — release history

## Status and limitations

Desrow is early software (`0.1.0`) and intentionally browser-only.

- Face detection runs in the browser today. A server-side detector is a planned option, not implemented.
- The full-resolution render runs on the main thread; very large batches will make the UI less responsive. The detector is serialised and cached, while image rendering runs with 1–4 workers.
- Data is per-browser and per-profile. Clearing site data deletes the workspace. There is no sync, backup or cloud storage yet.
- Device fonts depend on the machine that renders the asset. Upload a font file instead when the layout must be portable.
- Exports are generated client-side; closing the tab during a batch cancels it.

## License

No license file has been added to this repository yet. Treat the source as all rights reserved until one is chosen.
