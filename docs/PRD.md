# Desrow — Product Requirements Document

**Version** 0.1.0 · **Date** 30 October 2026 · **Status** Implemented as a local-first browser studio

---

## 1. Product definition

Desrow is an end-to-end automation engine that transforms messy spreadsheet rows into polished, consistently formatted visual assets at scale. It takes names and raw portrait links from a CSV or public Google Sheet, detects and crops faces, applies a custom black-and-white grade with grain, merges the portrait and text variables into a master template, and exports the batch.

The product is built for people who already have a spreadsheet and a design template, and who are tired of repeating the same photo-editing and layout steps for every record. Desrow keeps all controls in the user's hands: nothing about the crop, grade, type or placement is a hidden preset.

## 2. Problem

Producing a set of personalised portraits — conference passes, team pages, cast cards, certificates, editorial indexes — usually means:

1. Reformatting a spreadsheet into a usable list.
2. Finding each linked portrait, often in Drive, and downloading it.
3. Cropping each face to a consistent size by hand.
4. Converting each photo to the same monochrome look.
5. Placing each photo and each name into a design file.
6. Exporting hundreds of files with consistent names.

This is repetitive, hard to keep consistent, and easy to get wrong when the source data changes. Generic batch editors do not understand face-relative crops, custom tone curves and a designed template together.

## 3. Goals

### Product goals

- Turn a spreadsheet plus artwork into a complete set of export-ready assets in one session.
- Keep faces framed consistently across wildly different source photos.
- Give art direction to a non-developer without requiring Photoshop or a script.
- Keep source data, photos and outputs private by default.
- Make the result reproducible: the exported ZIP includes the exact processing recipe.

### Experience goals

- A first-time user can import a source, create a template and render a batch without documentation.
- A power user can set exact values instead of fighting a canvas.
- Failure is visible and specific: a bad link, a private Drive file, an unusable crop or an encoding failure should name the record and the reason.

### Non-goals for 0.1.0

- Collaborative editing, accounts or cloud sync.
- Server-side rendering at scale.
- Automated upload back to Google Drive or another cloud destination.
- Video, 3D or non-portrait subject detection.
- On-canvas vector editing, masking or multi-page layouts.
- Design template import from PSD, AI or Figma.

## 4. Users

### Primary — programme or people-operations lead

Has a spreadsheet of names, roles, IDs and portrait links. Needs a branded portrait pack for a cohort, conference or internal directory. Cares about consistency and not manually editing 300 photos.

### Secondary — designer or creative operator

Owns the master artwork and typography. Wants precise placement, a repeatable monochrome look, grain control and font fidelity. Will inspect the result at 1× and 2×.

### Tertiary — developer or operator

Self-hosts the app, may set an outbound host allowlist, and needs a clear security and data-retention story.

## 5. Jobs to be done

- “When I have a spreadsheet of people and portrait links, I want to turn it into a branded set of images so that I can deliver the pack without editing each photo.”
- “When source photos have different framing, I want the face to land in the same place every time so that the set feels designed.”
- “When the art direction changes, I want to adjust the crop, grade and grain once and re-render the whole batch.”
- “When one record is badly framed, I want to fix only that record.”
- “When I hand off the result, I want the files, a manifest and the recipe together.”

## 6. Functional requirements

Priorities: **P0** required for a usable release, **P1** valuable, **P2** later.

### 6.1 Source ingestion — P0

- Import a `.csv` by file picker or drag-and-drop.
- Parse a header row, preserve column names, deduplicate duplicate headings, trim values and ignore empty rows.
- Cap imports at 5,000 rows and warn when truncating.
- Import a public Google Sheets link by converting it to its CSV export; honour the `gid` tab parameter.
- Clearly reject private or non-CSV responses with a sharing-instructions message.
- Detect the likely name and portrait columns from headers and value patterns; let the user override both.
- Report counts of named records and usable portrait links before saving.
- Save datasets locally with a user-editable name.
- Show a library of saved datasets with record counts, column summaries and delete actions.

**Acceptance:** a 3-row CSV with `Full Name`, `Role`, `ID`, `Portrait` maps correctly and renders a named preview for every row.

### 6.2 Master templates — P0

- Create a template from a preset fallback size or from uploaded artwork.
- When artwork is uploaded, adopt its native pixel dimensions as the canvas and output size; draw it full-bleed as the background.
- Preserve the visual composition when artwork replaces a template: scale pixel-based type size, tracking, frame radius and border width by the width ratio.
- Allow manual width and height entry when no artwork is used.
- Include optional starter text layers (`{{name}}`, `{{title}}`, footer) or start blank.
- Direct manipulation on the canvas: move the photo frame, resize it from four corners, move text boxes, resize text box width, nudge with arrow keys.
- Inspector controls for exact normalised X/Y/width, frame aspect, corner radius, border width and border colour.
- Add and delete unlimited text layers.
- Autosave edits to IndexedDB and show Saved / Unsaved / Saving state.
- Warn when artwork aspect ratio differs from the canvas.

**Acceptance:** uploading 1400 × 1800 artwork updates the canvas from 900 × 1200 to 1400 × 1800, retains the layer composition and renders the artwork behind the photo.

### 6.3 Typography — P0

- Bundled fonts: Inter (variable), Instrument Serif and JetBrains Mono.
- Upload WOFF2, WOFF, TTF or OTF files up to 2 MB per file.
- Embed uploaded font files in the template so reopening and rendering them does not depend on the original file path.
- Register embedded fonts with both the DOM and canvas renderer.
- Use installed device fonts by family name, with common suggestions and an optional Chromium `queryLocalFonts()` scan.
- Warn that device fonts may fall back on another machine.
- Per text layer: typeface, weight, exact pixel size, tracking, line height, alignment, opacity, colour, uppercase, content and token insertion.
- Allow exact numeric size through the value box (6–600 px, same range as the slider).
- Wrap text to the layer's box width, including character-level breaks for long unbroken words.
- Render hard line breaks.

**Acceptance:** an uploaded TTF becomes selectable as “Uploaded”, is embedded in the saved template, and renders in preview and batch output. A device font can be applied by name and persists in the workspace.

### 6.4 Face detection and crop — P0

- Detect the largest face using MediaPipe BlazeFace inside the browser.
- Use GPU with a CPU fallback; serialise detection calls and cache results by source URL.
- Compute the crop from the face box, not the full image, so head size stays consistent.
- Global controls: detection on/off, face height as a percentage of the frame, horizontal face placement, vertical face placement.
- Manual fallback crop when detection is disabled, unavailable or finds no face.
- Per-record overrides for face height and X/Y, settable with sliders or by dragging/scrolling the frame preview.
- Show detection status and confidence per record.
- Never send a portrait to a third-party inference service.

**Acceptance:** three different Unsplash portraits render face-framed at the same relative size; turning detection off still produces a usable manual crop; a per-record override affects only that record.

### 6.5 Monochrome grade — P0

- Channel mix controls for red, green and blue, normalised before conversion.
- A five-point editable tone curve with monotone cubic interpolation.
- Presets: Neutral, Film, Hard, Matte.
- Contrast and brightness after the curve.
- Apply the grade only to the photo frame, never the artwork or typography.

**Acceptance:** changing channel weights, curve points, contrast or brightness visibly changes the portrait in preview and output without altering the template background.

### 6.6 Grain — P1

- Grain amount from 0–70%.
- Cell size from 0.4–4 px at output resolution.
- Reproducible seed with a shuffle action.
- Apply after grading, before compositing into the template; artwork and type stay clean.
- Zero amount disables the grain pass.

**Acceptance:** the same seed yields the same pattern across exports; changing size changes the grain structure; grain is confined to the photo frame.

### 6.7 Output and batch — P0

- Output scale 1×, 1.5× or 2× of the template's native canvas.
- PNG or JPEG with quality control for JPEG.
- Tokenised filename pattern using row values, canonical aliases and `{{index}}`; sanitise unsafe filename characters; guarantee unique filenames within a batch.
- Batch concurrency from 1–4; face detection stays serialised.
- Live progress with completed/total, rendered/failed/skipped counts and active labels.
- Contact sheet of results with success/failure/skipped status and per-item download.
- Cancel a running batch without losing completed frames.
- Persist the batch summary and full-resolution blobs in IndexedDB.
- Store the processing settings used for the run.

**Acceptance:** a 3-record cohort renders 3 full-resolution PNGs at 1400 × 1800 with filenames `Avery-Sinclair-1.png`, `Marcus-Vale-2.png`, `Jonah-Reed-3.png`; batch history shows 3/3.

### 6.8 Exports — P0

- List every saved batch with status, counts, stored size, format, scale, face-detection state, grain amount and curve point count.
- Download individual rendered assets.
- Download a ZIP containing all rendered assets, `manifest.csv` and `desrow-settings.json`.
- Manifest includes filename, label, status, error, portrait link and all source columns.
- Delete a batch and its stored items together.
- State clearly that files are stored in the browser and can be removed by clearing site data.

**Acceptance:** the ZIP contains each rendered PNG plus both metadata files; deleting the batch removes its items from IndexedDB.

### 6.9 Local workspace — P0

- Store datasets, templates, runs and items in IndexedDB.
- Store last-selected dataset/template IDs and processing settings in localStorage.
- Restore the workspace after a reload.
- Provide a guarded server-side image proxy so cross-origin portraits can be read by canvas without CORS failures.
- Do not require login, analytics or a backend database.

### 6.10 Error handling and empty states — P1

- Invalid CSV: explain the required header row and data rows.
- Oversized file: name the limit.
- Private Drive link: explain sharing settings.
- Unsupported URL: mark the record skipped with a reason.
- No face: warn that the fallback crop was used.
- Detector failure: disable detection for the rest of the batch and warn once.
- Storage failure: keep rendered results available in memory and explain that history could not be saved.
- Empty states for source, templates, render and exports must explain the next action.

## 7. Non-functional requirements

### Privacy

- Source data, portraits, template artwork, embedded fonts, outputs and history remain in the browser's storage.
- The server proxy is stateless and does not persist fetched images or CSVs.
- No analytics, tracking pixels or third-party inference.

### Performance targets

- First interactive render of a 3-record batch on a typical laptop: under 30 seconds.
- Face detection is performed once per portrait URL per session; cached for up to 300 entries.
- Template preview updates are debounced by 25 ms; render preview by 80 ms.
- The app remains usable with 5,000 records, though large templates and 2× output can exhaust browser memory.

### Capacity and limits

| Limit | Value |
| --- | --- |
| CSV records | 5,000 |
| CSV file size | 10 MB |
| Portrait image | 25 MB |
| Google Sheet CSV response | 15 MB |
| Master artwork | 8 MB, max 8,000 px per side |
| Embedded font file | 2 MB |
| Canvas fallback dimensions | 200–8,000 px per side |
| Batch concurrency | 1–4 |
| Output scales | 1×, 1.5×, 2× |

### Compatibility

- Modern Chromium, Firefox and Safari with Canvas 2D support.
- Device-font scanning requires the Chromium Local Font Access API and permission; manual family entry works elsewhere.
- Google Sheets import requires the sheet to be public.
- The app is designed desktop-first; the shell and controls adapt to tablet/mobile widths, while precision editing is best on a wide screen.

### Accessibility

- All controls have labels or accessible names.
- Keyboard focus is visible.
- Arrow keys nudge selected layers when focus is not in a form control.
- Status is conveyed with text, not colour alone.
- Canvas previews have descriptive `aria-label`s.
- Reduced-motion preference is not yet specifically handled.

## 8. Product principles

1. **The template is a contract.** Positions are normalised; artwork defines the pixel canvas. Scaling output must not break the layout.
2. **Faces, not rectangles.** Crop around the detected face so source framing differences disappear.
3. **No invisible art direction.** Every effect has a named control, a unit and a recoverable default.
4. **Local by default.** The user should never wonder where their data went.
5. **Failure is a state, not a dead end.** Each record can fail independently with a reason.

## 9. Success measures

For a future instrumented release (none of these are collected today):

- Percentage of new users who import a source and create a template in one session.
- Percentage of started batches that finish with at least one rendered asset.
- Median time from import to first exported asset.
- Percentage of records that fail for reasons other than a missing/invalid portrait link.
- Repeat use: second batch within seven days.

## 10. Roadmap

### Now (0.1.0)

The browser studio described above, documented, typechecked and built.

### Next

- Automated tests for crop maths, token resolution, ZIP manifest and settings validation.
- Web Worker rendering to keep the interface responsive on large batches.
- Multi-weight font uploads with explicit weight mapping.
- Storage usage indicator and batch pruning.
- Optional Google Drive folder sync after export.

### Later

- Server-side detector/rendering service for scale and consistent output across machines.
- Accounts, project sharing and cloud storage.
- More layout tools (shape layers, image overlays, masks).
- Background replacement or cut-out controls.
- Template interchange and versioning.

## 11. Decisions and open questions

### Decided

- **Face detection:** in-browser MediaPipe for 0.1.0; a server-side detector is planned but not built.
- **Sheets:** public link converted to CSV, no OAuth.
- **Storage:** local-first IndexedDB; no backend database.
- **Artwork:** native pixel size defines the output canvas and background.
- **Fonts:** bundled, embedded custom files and device families; embedded files are the portable path.

### Open

- Should a future server render use the same TypeScript compositor or a GPU pipeline?
- How should font-weight families be grouped when a user uploads several files?
- What is the right retention default for full-resolution blobs in a browser with limited quota?
- Should exports optionally write back to a Drive folder, and if so with what permission model?
