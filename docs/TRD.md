# Desrow — Technical Requirements Document

**Version** 0.1.0 · **Date** 30 October 2026 · **Status** Implemented browser application, no automated test suite yet

---

## 1. Overview

Desrow is a Next.js application with a thin server edge and a browser-heavy rendering core. The server exists for two jobs only:

1. Fetch remote images through a guarded proxy so canvas operations are same-origin.
2. Fetch a public Google Sheet as CSV without browser CORS restrictions.

All domain state and image processing live in the client. There is no application database on the server.

### Design constraints

- **Local-first:** datasets, templates, fonts, renders and history are stored in IndexedDB.
- **No accounts:** the workspace belongs to a browser profile.
- **No external inference:** face detection runs locally via MediaPipe.
- **Deterministic art direction:** every processing parameter is stored with the run.
- **Canvas is the renderer:** no server image processing, no WebGL shader pipeline, no native dependencies.
- **Public sources only:** CSV upload, a public Google Sheet link, or a public portrait URL.

## 2. Stack

| Layer | Choice | Installed version |
| --- | --- | --- |
| Framework | Next.js App Router | 16.4.3 |
| UI | React | 19.3.1 |
| Language | TypeScript (strict) | 5.9.3 |
| Styling | Tailwind CSS v4 + CSS custom properties | 4.3.3 |
| Local database | Dexie / IndexedDB | 4.4.7 |
| CSV parsing | Papa Parse | 5.7.0 |
| Face detection | MediaPipe Tasks Vision (BlazeFace short-range) | 1.2.0 |
| ZIP | JSZip | 3.10.2 |
| Bundled fonts | Fontsource variable Inter, JetBrains Mono; Instrument Serif | 5.3.0 |
| Runtime for API routes | Node.js | Next.js default |

The repository contains no test framework, lint configuration, analytics SDK or authentication library.

## 3. System architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[Next.js client UI]
    DB[(IndexedDB / Dexie)]
    LS[(localStorage)]
    MP[MediaPipe BlazeFace]
    R[Canvas compositor + batch engine]
    UI --> DB
    UI --> LS
    R --> MP
    UI --> R
    R --> DB
  end

  subgraph NextServer[Next.js server]
    IMG[/api/image]
    SHT[/api/sheets]
    GUARD[SSRF guard + guardedFetch]
    IMG --> GUARD
    SHT --> GUARD
  end

  IMG <-->|bytes| UI
  SHT <-->|CSV| UI
  GUARD <-->|https| REMOTE[Google Drive / Sheets / image hosts]
```

### Request flow: portrait

1. The user imports a link. `normalizeImageUrl` validates the protocol and converts known Drive links to a thumbnail endpoint.
2. The client requests `/api/image?url=<encoded>`.
3. The route normalises again, then calls `guardedFetch`, which validates the host, DNS answers, ports, credentials, redirects, content type and size.
4. The route streams the bytes back with a one-hour public cache header. It does not write to disk or a database.
5. The client loads the response as an `HTMLImageElement` with `crossOrigin = "anonymous"` and can read its pixels.
6. Drawing, grading, grain and text composition happen on canvas.

### Request flow: Google Sheet

1. `resolveSheetSource` accepts only `docs.google.com/spreadsheets/d/...` or the published `/d/e/...` form, extracts the sheet ID and `gid`, and builds a CSV export URL.
2. `/api/sheets` calls `guardedFetch` with a Google-host predicate and a 15 MB cap.
3. The client parses the CSV with Papa Parse, then discards the raw response.

## 4. Repository map

| Path | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Overview: workspace counts, pipeline status, next actions |
| `src/app/source/page.tsx` | Import and dataset library |
| `src/app/templates/page.tsx` | Template gallery and creation |
| `src/app/templates/[id]/page.tsx` | Template editor route; finds template from workspace state |
| `src/app/render/page.tsx` | Render bench route; chooses dataset/template and guards empty state |
| `src/app/exports/page.tsx` | Saved batch history and downloads |
| `src/app/api/image/route.ts` | Guarded image proxy |
| `src/app/api/sheets/route.ts` | Guarded Google Sheet CSV fetch |
| `src/components/app-shell.tsx` | Sidebar/mobile navigation and workspace provider |
| `src/components/templates/*` | Canvas stage, layer inspector, thumbnail, editor |
| `src/components/render/*` | Controls, curve editor, preview, batch bench |
| `src/components/source/*` | Import, review, dataset browser, portrait thumbnails |
| `src/lib/server/*` | `assertSafeRemoteUrl`, `guardedFetch`, error types |
| `src/lib/*` | Pure domain logic and browser rendering |

## 5. Data model

The canonical types are in `src/lib/types.ts`. The IndexedDB layout is documented in [database_schema.md](database_schema.md).

Core relationships:

- A **Dataset** has columns, a mapping (`nameColumn`, `imageColumn`) and rows.
- A **Template** has a canvas, artwork, an optional embedded font list, one photo frame and many text layers.
- A **RunSummary** snapshots the dataset/template names and processing settings.
- A **RenderItem** belongs to a run and stores one output plus its status and error.

`RunSummary.templateId` and `datasetId` are references for navigation; the run also stores names and settings so history survives deletion of the source or template.

## 6. Processing pipeline

The compositor executes in this order for every record:

```
validate link
  → fetch through /api/image
  → decode image
  → detect face (cached; optional)
  → compute crop window from face + frame aspect + manual controls
  → draw cropped portrait into an offscreen frame canvas
  → convert to monochrome with channel weights
  → apply tone LUT (curve, contrast, brightness)
  → apply seeded grain
  → draw artwork background at output size
  → clip the portrait into the photo frame (rounded corners)
  → draw frame border
  → resolve tokens and lay out text
  → draw text layers
  → encode PNG/JPEG
  → thumbnail + store blob and metadata
```

The template background and text are never graded or grained.

### 6.1 Input and link normalisation

`src/lib/drive.ts`:

- Accepts only `http:` and `https:` URLs.
- Extracts a Drive file ID from `/file/d/<id>`, `?id=<id>`, `/d/<id>` or `/uc?export=view&id=<id>`.
- Converts Drive links to `https://drive.google.com/thumbnail?id=<id>&sz=w2400`.
- The image route also tries `https://lh3.googleusercontent.com/d/<id>=w2400` as a second candidate if the first fails.
- Returns `null` for empty or unparseable values; such rows are skipped with a reason.

### 6.2 CSV and mapping

`parseCsv` uses Papa Parse with `header: true`, trims headers, removes an optional BOM, deduplicates repeated headers (`Name`, `Name (2)`), limits to 5,000 data rows and drops rows whose values are all empty.

`detectMapping` scores headers and sample values:

- Name: exact/contains matches for `full name`, `display name`, `attendee`, `participant`, `employee`, `student`, `member`, `person`, `name`; bonuses for values containing spaces and not looking like URLs; penalty for all-numeric values.
- Portrait: header hints (`headshot`, `portrait`, `photo`, `picture`, `image`, `img`, `drive`, `link`, `url`) plus a ratio of values that look like links; bonus for Drive file URLs.

The user can override both mappings before saving.

### 6.3 Token resolution

`resolveTokens` matches `{{ token }}` case-insensitively to an exact column key or a previously added alias. Unknown tokens resolve to an empty string.

`tokenValues(values, mapping)` adds canonical aliases without overwriting a real column:

- `name` ← mapped name column.
- `photo`, `portrait`, `image` ← mapped portrait column.
- `title` ← a column whose normalised name is or contains `title`, `role`, `position` or `job`.
- `id` ← a column whose normalised name is or contains `id`, `identifier`, `badge`, `number` or `ref`.

Filename patterns are rendered with the same token map plus `index`. Filenames are sanitised for Windows/macOS/Linux-invalid characters and truncated to 120 characters; duplicates within a run receive `-2`, `-3`, etc.

### 6.4 Face detection

`src/lib/face.ts` imports `@mediapipe/tasks-vision` dynamically. It resolves the WASM files from `/mediapipe/wasm` and the model from `/models/blaze_face_short_range.tflite`.

- First tries the GPU delegate, then CPU.
- Uses `runningMode: "IMAGE"` and a minimum detection confidence of 0.5.
- Selects the largest detection by bounding-box area.
- Normalises the box to centre, width and height relative to the natural image.
- Serialises calls through a promise queue because the detector has internal state.
- Caches results by the original portrait URL in a 300-entry map shared by preview and batch.
- Returns `null` when no face or no detector; the crop then uses a neutral fallback box.

The detector is initialised only when needed. GPU/CPU failure is reported to the caller so the batch can fall back and warn once.

### 6.5 Crop maths

Inputs: natural image size, photo-frame pixel size, face box and global/per-record crop settings.

```
faceHeightPx = box.height * imageHeight
frameAspect  = frameWidth / frameHeight
cropHeight   = faceHeightPx / (faceScale / 100)
cropWidth    = cropHeight * frameAspect
fit          = min(1, imageWidth / cropWidth, imageHeight / cropHeight)
cropWidth   *= fit; cropHeight *= fit
sx = box.centerX * imageWidth  - (faceX / 100) * cropWidth
sy = box.centerY * imageHeight - (faceY / 100) * cropHeight
```

The source rect is clamped to the image. `faceScale` is 8–100 (percentage of frame height occupied by the face), `faceX`/`faceY` are 0–100. Larger `faceScale` means a tighter crop. The fallback box is centred at 50% / 43% with 26% × 32% normalized size.

Per-record overrides supply only the changed values; `effectiveCropSettings` clamps them and merges with global settings.

### 6.6 Tone

- Monochrome conversion: `gray = r*wr + g*wg + b*wb`, with weights normalised to sum 1.
- Curve: monotone cubic Hermite interpolation with Fritsch–Carlson-style tangents. Points are clamped to 0–1, sorted, deduplicated and extended to x=0 and x=1.
- LUT: for each of 256 greys, evaluate the curve, apply `contrastFactor = 2^(contrast/50)` around 0.5, add `brightness/200` exposure, clamp, and write one byte.
- The LUT is applied to the frame's pixel buffer with `getImageData`/`putImageData` at frame resolution.
- Contrast and brightness are bounded to −50…+50.

### 6.7 Grain

- A 256 × 256 noise tile is generated with a seeded `mulberry32` PRNG.
- The tile is scaled to `clamp(grain.size, 0.25, 6) × 256` using nearest-neighbour (image smoothing disabled).
- A repeating canvas pattern is composited in `overlay` mode at alpha `amount/100 × 0.92` over the graded frame.
- Amount is exposed as 0–70%, size as 0.4–4 px, seed as 1–999999.
- The same seed reproduces the same pattern for a given frame size.

### 6.8 Text layout

`layoutText`:

1. Resolves tokens and applies uppercase if requested.
2. Builds a canvas font string from weight, pixel size and family.
3. Sets `letterSpacing` when the browser supports it.
4. Wraps each hard-break paragraph to the layer's box width (`layer.width × templateWidth × scale`).
5. Breaks a single overlong word by character.
6. Returns lines, font string, box width, line height and total height.

`drawTextLayers` anchors lines according to left/center/right alignment, uses top baseline, applies opacity, and draws each line at `lineHeight × index`. Text boxes are measured for the editor overlay and for drag bounds.

### 6.9 Fonts

Three font sources share one `FontSelection` union:

- `sans | serif | mono` map to bundled Fontsource families.
- `local:<family>` uses an installed family name, quoted for CSS/canvas.
- `custom:<id>` maps to a template font record; the file is stored as a data URL.

`registerFontFace` creates a `FontFace` named `Desrow <id>`, loads it, and adds it to `document.fonts`. A module-level promise map prevents duplicate registration. `ensureTemplateFonts` registers every embedded file, builds descriptors for each text layer, calls `document.fonts.load` and waits for `document.fonts.ready`. This runs before preview and batch rendering so canvas measurements and paint use the intended face.

Device-font scanning is optional and feature-detected (`window.queryLocalFonts`). When unavailable or denied, the user can type a family name. There is no guarantee that the family exists, so the canvas falls back through the declared stack.

### 6.10 Template compositor

`renderAsset`:

1. Ensures fonts.
2. Creates a canvas at `template.width × scale` by `template.height × scale`.
3. Fills the canvas with `backgroundColor`.
4. Draws the cached background image full-bleed if present.
5. Draws the cropped/graded/grained portrait into a frame canvas, clips it to a rounded rectangle at the frame position and size, then draws it to the template.
6. Strokes the border inside the clip bounds.
7. Draws text layers.
8. Returns the canvas.

Background images are cached by template ID, `updatedAt` and data-URL length, capped at six entries. The editor uses a generated placeholder portrait so the composition can be judged before a dataset exists.

### 6.11 Artwork adoption

`readArtworkFile` accepts PNG, JPEG or WebP up to 8 MB, reads it as a data URL, measures natural dimensions and rejects images above 8,000 px per side.

`adoptArtwork` sets the new canvas dimensions and scales pixel-based type size, tracking, corner radius and border width by `newWidth / oldWidth`. Normalised X/Y/width values are unchanged, so the layout composition survives. The artwork is stored as a base64 data URL in the template record.

### 6.12 Batch engine

`runRenderJob`:

- Clones settings and overrides before starting.
- Runs 1–4 worker loops over a shared cursor.
- Resolves each record's name, portrait link and token map.
- Skips records with no link or an unsupported link, with a specific reason.
- Detects faces unless disabled; detection is serialised inside `face.ts` even when render workers run in parallel.
- On the first detector failure, disables detection for the rest of the run and warns once.
- Renders, encodes and emits each item through `onItem`; updates counts and active labels through `onProgress`.
- Stops claiming new work when the abort signal is set; in-flight work may finish.
- Sorts results back into dataset order.
- Never rejects because one record failed; per-record errors become `failed` or `skipped` items.

A failed portrait fetch is translated to a sharing-oriented message when the error matches load/fetch/network. Other errors surface their message.

### 6.13 Exports

`buildExportZip` stores rendered blobs under their unique filenames, then adds:

- `manifest.csv` with filename, label, status, error, portrait link and every dataset column. Cells containing comma, quote or newline are escaped.
- `desrow-settings.json` with app name, export timestamp, run metadata and the full `ProcessingSettings`.

Compression is `STORE` because images are already compressed. Batches are saved to IndexedDB after rendering; if saving fails, the in-memory results remain available and a non-blocking error is shown.

## 7. API contracts

### `GET /api/image?url=...`

| Case | Response |
| --- | --- |
| Missing URL | `400 {"error":"A url parameter is required."}` |
| URL longer than 4,096 chars | `414` |
| Unsupported value | `400` |
| Fetch/validation failure | `502` (or 400/413/415/508 from the guard) with `error` and a Drive-sharing `hint` |
| Success | `200`, original image content type, inline disposition, one-hour cache |

Limits: 25 MB, 25-second timeout per attempt, four redirects. Only content types starting with `image/` are accepted. The route retries one alternative Google URL for Drive IDs.

### `GET /api/sheets?url=...&gid=...`

| Case | Response |
| --- | --- |
| Missing URL | `400` |
| Non-Sheets URL | `400` |
| Google returns HTML | `502` with a sharing-settings message |
| Success | `200 text/csv; charset=utf-8`, `no-store` |

Limits: 15 MB, 25-second timeout, four redirects, content types `text/csv`, `application/csv`, `text/plain`. The host predicate restricts requests to Google-owned hosts even after redirects.

## 8. State and persistence

- `WorkspaceProvider` loads datasets, templates and run summaries on mount and exposes `refresh()`.
- Template edits are local React state with a 700 ms debounce; a final save runs on unmount and before navigation.
- The selected dataset/template IDs persist in localStorage under `desrow.selection.*`.
- Processing settings persist under `desrow.processing.v1`, with numeric clamping and enum validation on read; malformed storage falls back to defaults.
- Run images are stored as `Blob`s, thumbnails as JPEG data URLs and template artwork/fonts as data URLs.
- There is no sync, export/import of the workspace, or quota management beyond browser defaults.

## 9. Performance and resource behaviour

- Rendering and grading run on the main thread. `willReadFrequently` is enabled for canvases that are read back.
- Template previews are debounced 25 ms; render previews 80 ms.
- Preview render scale is bounded to roughly 1000 × 760 px, not full output resolution.
- Face detection is the serialised bottleneck; rendering runs in parallel around it.
- A 2× 8,000 px template can exceed browser canvas or memory limits; the UI does not preflight canvas allocation.
- Thumbnail cache maps and background-image caches are capped.
- Full-resolution blobs can consume IndexedDB quota quickly; users are told to delete old batches.

## 10. Security architecture

Detailed controls and threat model live in [SECURITY.md](../SECURITY.md). Key points:

- All server-side remote fetches go through `assertSafeRemoteUrl` and `guardedFetch`.
- Every redirect hop is revalidated, including DNS resolution.
- Loopback, private, link-local, multicast and IPv4-mapped private IPv6 addresses are blocked.
- Only `http`/`https`, standard ports and credential-free URLs are allowed.
- Optional `IMAGE_PROXY_ALLOWLIST` restricts hosts in shared deployments.
- Response size, content type and timeout are capped.
- Google Sheets endpoints are host-restricted to Google domains.
- The image proxy is stateless.
- The app has no authentication, CSRF surface or server-side user data in its current form. Do not expose a shared instance without an access layer.

## 11. Testing and verification

Current automated coverage: **none**. TypeScript is the primary static gate (`npm run typecheck`). The production build (`npm run build`) is used as the integration gate.

Implemented manual verification path:

1. Import a 3-row CSV with `Full Name`, `Role`, `ID`, `Portrait`.
2. Create a template, upload 1400 × 1800 artwork, confirm canvas adoption.
3. Upload a local font file, select it, set an exact size, optionally apply a device font.
4. Render a batch and confirm face detection, output dimensions, filenames and statuses.
5. Visit Exports and confirm the batch, individual assets and metadata counts.
6. Test a private Drive link and a missing link to confirm skipped/failed states.

Recommended next tests:

- Unit tests for `computeCrop`, `evaluateCurve`, `resolveTokens`, `tokenValues`, `buildFilename`, `safeFilename` and settings validation.
- Integration tests for `/api/image` and `/api/sheets` guards with mocked DNS/fetch.
- Browser tests with Playwright for the import → template → render → export flow.
- Visual regression of the compositor at 1× and 2×.

## 12. Known technical debt

- All rendering on the main thread; no worker or OffscreenCanvas path yet.
- Template thumbnails re-render on every workspace refresh; no persistent thumbnail cache.
- Template font files and artwork are base64 in IndexedDB; large values inflate reads/writes and memory.
- No schema migration beyond Dexie version 1; missing optional fields are handled defensively in fonts, but a normalisation function would be safer.
- No automated tests, lint script or CI workflow.
- No storage quota indicator or cleanup policy.
- Device-font availability cannot be verified; fallback is silent by design.
- The ZIP has no integrity/progress reporting for very large batches.

## 13. Future server-side path (planned, not implemented)

If Desrow moves beyond the browser:

1. Upload datasets and artwork to object storage; keep a thin local editor.
2. Queue batch jobs and run the same crop/grade/compositor logic in a Node/GPU worker.
3. Store full-resolution outputs in object storage with signed URLs.
4. Keep the existing SSRF guard for any user-supplied image URL.
5. Add authentication, project membership and per-user quotas before accepting remote data.

The current schema and processing settings are designed to be portable to that model, but no server database, queue or detector exists today.
