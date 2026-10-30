# TODO — Desrow

Status markers: `[x]` shipped · `[*]` in progress · `[ ]` not started

Last updated: 30 October 2026 · Release 0.1.0

---

## Shipped in 0.1.0

### Foundation

- [x] Next.js App Router scaffold with strict TypeScript
- [x] Darkroom design system, Tailwind v4 tokens, responsive app shell
- [x] Overview dashboard with source/template/export readiness
- [x] Local-first Dexie database for datasets, templates, runs and items
- [x] Persistent dataset/template selection and processing settings
- [x] Fontsource loading for Inter, Instrument Serif and JetBrains Mono
- [x] MediaPipe WASM asset sync script and BlazeFace model

### Source

- [x] CSV drag-and-drop and file picker (10 MB, 5,000 rows)
- [x] Papa Parse header parsing, dedupe, trimming, empty-row removal
- [x] Public Google Sheets link → CSV import with `gid` support
- [x] Auto-detection of name and portrait columns
- [x] Mapping review with named/linked counts and record previews
- [x] Dataset library with selection and deletion
- [x] Guarded Drive/image link normalisation and proxy URLs
- [x] Same-origin image proxy with SSRF/DNS/redirect/size/content-type guards
- [x] Google Sheets proxy with Google-host restriction

### Templates

- [x] Template gallery, creation modal, starter layers or blank canvas
- [x] Master artwork upload (PNG/JPEG/WebP, 8 MB, 8,000 px)
- [x] Artwork native size defines canvas and output size
- [x] Pixel-based type/frame values scale when artwork is adopted
- [x] Live canvas rendered with the production compositor
- [x] Drag-to-move photo frame, four-corner resizing, arrow-key nudging
- [x] Draggable text layers and box-width handle
- [x] Inspector: exact X/Y/width, frame aspect, radius, border width/colour
- [x] Canvas width/height and background colour controls
- [x] Add/delete unlimited text layers
- [x] Autosave with Saved/Unsaved/Saving status and save-before-navigation
- [x] Template thumbnails and delete confirmation

### Typography

- [x] Bundled sans/serif/mono families with weight lists
- [x] Custom font file upload (WOFF2/WOFF/TTF/OTF, 2 MB)
- [x] FontFace registration for DOM and canvas
- [x] Embedded font data stored with the template
- [x] Device font entry by family name
- [x] Optional Chromium `queryLocalFonts` scan with permission/fallback copy
- [x] Exact pixel size, weight, tracking, line height, opacity, alignment, colour, uppercase
- [x] Token insertion and resolved content preview
- [x] Wrapping, hard breaks and long-word breaking

### Imaging

- [x] In-browser BlazeFace detection with GPU → CPU fallback
- [x] Serialised detector queue and 300-entry URL cache
- [x] Face-relative crop with face height and X/Y placement
- [x] Manual fallback crop when detection is off/unavailable/empty
- [x] Per-record crop overrides from sliders and preview drag/scroll
- [x] Channel mix for monochrome conversion
- [x] Five-point monotone tone curve with add/drag/remove and presets
- [x] Contrast and brightness after the curve
- [x] Seeded grain with amount, size and shuffle
- [x] Grain applied to the photo frame only, before template merge

### Render and export

- [x] 1×/1.5×/2× output, PNG/JPEG, quality control
- [x] Tokenised filenames with canonical aliases and `{{index}}`
- [x] Filename sanitisation and duplicate protection
- [x] 1–4 parallel renders with serialised face detection
- [x] Live progress, cancel, contact sheet and per-item statuses
- [x] Per-record failures/skips without aborting the batch
- [x] Full-resolution assets and metadata persisted in IndexedDB
- [x] Batch history, individual downloads, ZIP with `manifest.csv` + recipe
- [x] Batch deletion with cascade to items

### Documentation and quality

- [x] README with setup, workflow, limits and privacy
- [x] PRD, TRD, app flow, design system and database schema
- [x] BUILD, TODO, CLAUD, AGENT, SECURITY and CHANGELOG
- [x] Typecheck and production build gates
- [x] Manual end-to-end verification: CSV → artwork/font → 1400 × 1800 batch → exports

---

## In progress

- [*] Final milestone review, documentation consistency pass and GitHub push

---

## Next

### Quality and reliability

- [ ] Add a test runner and unit tests for crop maths, curve evaluation, token aliases, filenames, ZIP manifest and settings validation
- [ ] Add API integration tests for SSRF/DNS/redirect/size/content-type behavior
- [ ] Add Playwright coverage for import → template → fonts → render → export
- [ ] Add lint/format scripts and a CI workflow running typecheck, build and tests
- [ ] Add regression fixtures for public Sheet and Drive response shapes

### Performance

- [ ] Move rendering/grading into a Web Worker with OffscreenCanvas
- [ ] Add a storage-usage indicator and bulk batch pruning
- [ ] Cache template thumbnails and avoid re-rendering all thumbnails on refresh
- [ ] Reduce base64 artwork/font overhead (Blob storage or object URLs)
- [ ] Preflight canvas allocation and warn before a likely out-of-memory render

### Product

- [ ] Upload multiple weights per custom font and map weight → file
- [ ] Add a workspace export/import for backup and transfer
- [ ] Add per-record text overrides in addition to crop overrides
- [ ] Add shape/image overlay layers
- [ ] Add light theme and reduced-motion support
- [ ] Improve keyboard layer traversal and announce drag/resize coordinates

### Platform

- [ ] Plan and prototype a server-side detector/renderer for scale
- [ ] Add accounts/projects and object storage only after an auth design
- [ ] Optional Google Drive folder sync after export
- [ ] Decide on a license before accepting external contributions

---

## Explicitly not planned for 0.1.0

- [ ] PSD/AI/Figma template import
- [ ] Video or 3D output
- [ ] OAuth access to private Sheets or private Drive files
- [ ] Automatic cloud backup
- [ ] Real-time collaboration
- [ ] Background removal/replacement
