# Changelog

All notable changes to Desrow are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions use [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Photo placement mode **Fit in frame**: the whole portrait is scaled inside the photo frame without cropping, always centred horizontally. Intended for narrow sources or faces detected too tightly for a face-relative crop.
- Per-record vertical placement still applies in fit mode; face detection is skipped because it has no effect.
- **Max lines** per text layer (0 = unlimited). Lines beyond the limit are hidden in the template preview and rendered assets.

### Changed

- Grain is now composited on the portrait before the monochrome conversion and tone curve, so the curve shapes the grain. The UI copy and pipeline documentation reflect the new order.

### Planned

- Automated unit, integration and browser tests
- Web Worker/OffscreenCanvas rendering
- Storage usage indicator and batch pruning
- Multi-weight custom font uploads
- Workspace export/import for backup

---

## [0.1.0] — 2026-10-30

The first complete local-first studio: spreadsheet ingestion, artwork-driven templates, face-aware monochrome rendering with grain, custom/device fonts, batch rendering and ZIP export.

### Added

#### Foundation

- Next.js 16 App Router application with React 19 and strict TypeScript.
- Darkroom design system: ink/paper palette, brass accent, Tailwind v4 tokens and shared primitives (buttons, fields, sliders, toggles, segmented controls, badges, notices, modals, empty states).
- Responsive app shell with Overview, Source, Templates, Render and Exports routes.
- Local-first Dexie workspace storing datasets, templates, runs and render items.
- Persistent last-selected dataset/template and processing settings.
- Bundled Inter, Instrument Serif and JetBrains Mono via Fontsource.
- MediaPipe BlazeFace model plus a predev/prebuild script that syncs the WASM runtime from `node_modules`.
- `npm run typecheck` and production build gates.

#### Source ingestion

- CSV drag-and-drop and file picker with a 10 MB cap.
- Papa Parse header handling, duplicate-header disambiguation, trimming, BOM removal, empty-row filtering and a 5,000-row limit.
- Public Google Sheets import via CSV export with `gid` support and a Google-host-restricted server proxy.
- Automatic name/portrait column detection with manual override.
- Review screen with dataset naming, named/linked counts, warnings and first-record previews.
- Dataset library with selection, metadata and deletion.
- Drive share-link normalisation and same-origin image proxy.
- Guarded remote fetch: protocol/port/credential checks, private-address and DNS validation, redirect revalidation, host allowlist option, byte caps, timeouts and content-type checks.
- Raster-only image responses (SVG excluded), `nosniff`, a restrictive response CSP and private caching.

#### Templates

- Template gallery and creation modal with presets and optional starter text layers.
- Master artwork upload (PNG/JPEG/WebP, 8 MB, 8,000 px per side).
- Uploaded artwork adopts its native pixel size as the canvas and full-bleed background.
- Pixel-based type size, tracking, frame radius and border width scale with the artwork width ratio.
- Live canvas preview using the production compositor and a generated placeholder portrait.
- Draggable/resizable photo frame and text layers with arrow-key nudging.
- Inspector controls for exact normalised placement, frame aspect/radius/border, canvas dimensions/colour, text content, typography and opacity.
- Unlimited text layers with add/delete confirmation.
- Debounced autosave with save-before-navigation and visible save status.
- Template thumbnails and delete confirmation.

#### Typography

- Bundled font selection with weight lists.
- Custom font upload for WOFF2, WOFF, TTF and OTF under 2 MB.
- Embedded font data stored in the template and registered through `FontFace` for both DOM and canvas.
- Device-font family entry with common suggestions.
- Optional Chromium `queryLocalFonts()` scanning with permission/fallback messaging.
- Exact pixel size (6–600), weight, tracking, line height, alignment, opacity, colour and uppercase.
- Token chips, resolved preview, text wrapping, hard line breaks and long-word splitting.
- Canonical token aliases so `{{name}}`, `{{title}}` and `{{id}}` work with ordinary spreadsheet headers.

#### Imaging

- In-browser BlazeFace face detection with GPU-first/CPU fallback.
- Serialised detection queue and 300-entry cache shared by preview and batch.
- Face-relative crop with manual face height and horizontal/vertical placement.
- Neutral fallback crop when detection is disabled, unavailable or empty.
- Per-record crop overrides from the preview and inspector.
- Red/green/blue channel mix for monochrome conversion.
- Five-point monotone cubic tone curve with add/drag/remove points.
- Neutral, Film, Hard and Matte curve presets.
- Contrast and brightness after the curve.
- Seeded film grain with amount, cell size and shuffle, confined to the photo frame.
- Rounded frame corners and border.

#### Render and export

- 1×, 1.5× and 2× output, PNG/JPEG and JPEG quality.
- Tokenised filename patterns with `{{index}}`, sanitisation and duplicate protection.
- Batch engine with 1–4 parallel renders and serialised detection.
- Live progress, active-record labels, cancellation and per-record failure isolation.
- Contact sheet with statuses, warnings/errors and per-asset download.
- Full-resolution blobs, thumbnails and metadata stored in IndexedDB.
- Batch history with counts, stored size, processing metadata and deletion.
- ZIP export containing rendered assets, `manifest.csv` and `desrow-settings.json`.
- Spreadsheet formula neutralisation in manifest cells.

#### Documentation

- README with setup, workflow, limits, architecture and privacy.
- `docs/PRD.md`, `docs/TRD.md`, `docs/App_flow.md`, `docs/Design.md`, `docs/database_schema.md`.
- `BUILD.md`, `TODO.md`, `CLAUD.md`, `AGENT.md`, `SECURITY.md`, `CHANGELOG.md`.

### Changed

- Template artwork now defines the output canvas rather than being stretched into a fixed canvas.
- Template creation copy, header metadata, layer rail and inspector all reflect artwork-driven sizing.
- Typeface selection supports bundled, embedded and device families through a single font-selection model.
- Render filenames include canonical mapped tokens (`name`, `title`, `id`) and the record index.
- Image proxy responses are private and raster-only.

### Fixed

- Google Sheets links without a `gid` no longer force `gid=0`. This caused HTTP 400 rejections for public sheets whose first tab has a different ID; the proxy now lets Google choose the first visible tab and appends `gid` only when the link specifies one.
- Sheet import errors now distinguish refused access (sharing settings), a rejected tab, a missing sheet and rate limiting instead of always blaming public sharing.
- Mapped spreadsheet columns now resolve correctly in the starter template, batch output and filename patterns. Previously `{{name}}`/`{{title}}` could resolve empty when the source used headers such as `Full Name` and `Role`.
- Filename patterns using `{{index}}` now include the 1-based record number.
- Font initialisation tolerates templates with missing optional font/layer arrays.
- Device-font and custom-font selections survive autosave and reload.

### Security

- Added DNS-aware SSRF protection with per-redirect validation.
- Blocked private, loopback, link-local, CGNAT and multicast addresses.
- Added optional outbound host allowlisting.
- Added response size, content-type and timeout enforcement.
- Excluded SVG from the image proxy to prevent inline script execution from the app origin.
- Added `nosniff`, a restrictive image-response CSP and `same-origin` resource policy.
- Mitigated CSV formula injection in the export manifest.
- Documented the absence of authentication/rate limiting and the residual DNS-rebinding risk in [SECURITY.md](SECURITY.md).

### Known limitations

- No automated tests or CI yet.
- Rendering/grading run on the main thread.
- No authentication, cloud storage, sync or workspace backup.
- Device fonts depend on the rendering machine.
- Full-resolution assets consume browser storage quota.
- A server-side detector is planned but not implemented.
