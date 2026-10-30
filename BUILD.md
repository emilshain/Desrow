# BUILD — Desrow

How to set up, run, verify and ship the Desrow studio.

**Version** 0.1.0 · **Verified on** Windows 11, Node 24.21.0, npm 11.19.0

---

## 1. Prerequisites

- Node.js **20.9+** and npm.
- A modern browser with Canvas 2D and IndexedDB.
- Network access for portrait URLs and public Google Sheets at runtime.
- No API keys, accounts or cloud services.

The face-detection model is committed at `public/models/blaze_face_short_range.tflite`. The MediaPipe WASM runtime is not committed; it is copied from `node_modules` automatically.

## 2. Install

```bash
npm install
```

This installs Next.js, React, MediaPipe Tasks Vision, Dexie, Papa Parse, JSZip, Tailwind and the bundled Fontsource families. Do not switch package managers without regenerating a lockfile; the repository currently uses `package-lock.json`.

## 3. Run locally

```bash
npm run dev
```

`predev` runs `node scripts/sync-face-assets.mjs`. Open <http://localhost:3000>.

Use a different port if another project already owns 3000:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Workspace data is origin-scoped. A different port or hostname is a different IndexedDB workspace.

## 4. Production build

```bash
npm run typecheck
npm run build
npm run start
```

`prebuild` repeats the face-asset sync. `typecheck` must exit 0 before shipping. The app uses API routes and Node-only modules (`node:dns`, `node:net`) in the image proxy, so it **cannot be exported as a static site**. Deploy it to a Node-capable host, or adapt the guard before targeting an Edge runtime.

## 5. Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Syncs face assets, then starts `next dev` |
| `npm run build` | Syncs face assets, then builds for production |
| `npm run start` | Starts the production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run sync:assets` | Copies MediaPipe WASM and checks the model |

There is no `lint` script, test runner or CI workflow yet.

## 6. Generated assets

`scripts/sync-face-assets.mjs`:

- Source: `node_modules/@mediapipe/tasks-vision/wasm`
- Destination: `public/mediapipe/wasm`
- Requires `vision_wasm_internal.wasm` to exist; otherwise prints a warning and exits successfully.
- Warns if `public/models/blaze_face_short_range.tflite` is missing.

`public/mediapipe/` is git-ignored. Do not commit the generated WASM. The model file **is** tracked; keep it in the repository so production builds have a detector.

If detection fails at runtime, first confirm both the model and `public/mediapipe/wasm` exist in the running deployment.

## 7. Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `IMAGE_PROXY_ALLOWLIST` | no | empty | Comma-separated host allowlist for `/api/image` and `/api/sheets`. Subdomains are included. Example: `drive.google.com,googleusercontent.com,images.unsplash.com` |

Rules:

- Never commit `.env` files or secrets.
- There are no client-side secrets.
- The allowlist is read on the server at request time; restart the server after changing it.
- Setting the allowlist can break legitimate host mirrors — verify import and render before shipping.

## 8. Project map

```text
src/app/                  Routes + API
  api/image/              Guarded portrait proxy
  api/sheets/             Guarded public Sheet CSV proxy
  source/                 Import + dataset library
  templates/[id]/         Template editor
  render/                 Render bench
  exports/                Batch history
src/components/           UI surfaces and shared primitives
src/lib/                  Parsing, crop, curve, grain, fonts, compositor, jobs, ZIP
src/lib/server/           SSRF validation and guarded fetch
public/models/            BlazeFace model (tracked)
public/mediapipe/         Generated WASM (ignored)
docs/                     Product, technical, flow, design and schema docs
```

## 9. Verification checklist

Run the static gates:

```bash
npm run typecheck
npm run build
```

Then exercise the application in a browser. A minimal end-to-end pass:

1. **Source:** import a CSV with `Full Name`, `Role`, `ID`, `Portrait`; confirm the mapping auto-selects name and portrait; save the dataset.
2. **Template:** create a template, upload 1400 × 1800 PNG artwork; confirm the header and Layers rail show 1400 × 1800; confirm artwork appears full-bleed.
3. **Fonts:** upload a `Georgia.ttf`/WOFF2 under 2 MB; confirm it appears under Uploaded and becomes the selected typeface; set an exact size; select a text layer and confirm the canvas re-renders.
4. **Device font:** type an installed family (for example `Georgia`), press **Use**, confirm the message and persistence after reload. If `queryLocalFonts` is available, test **Scan** and a permission denial.
5. **Tokens:** confirm `{{name}}` resolves the mapped name, `{{title}}` resolves a Role column, and `{{index}}` appears in filenames.
6. **Render:** run a 3-record batch; expect 3 rendered items, 1400 × 1800 assets, unique filenames such as `Avery-Sinclair-1.png`.
7. **Override:** change face height for one record; confirm only that record's result changes.
8. **Failure:** add a record with a broken portrait URL; confirm it is skipped/failed with a reason and does not stop the batch.
9. **Exports:** open Exports, confirm counts, download one asset, generate a ZIP, then delete the batch and confirm items disappear.
10. **Reload:** refresh after saving; confirm datasets, template, embedded font and history persist.
11. **Privacy:** confirm no analytics requests and no external inference calls in the network panel.

Optional security checks:

- `curl -i "http://localhost:3000/api/image?url=http://127.0.0.1/"` → 400/502, never local content.
- `curl -i "http://localhost:3000/api/sheets?url=https://example.com/"` → 400.
- With an allowlist set, request a host outside it → 400.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| “Face detection could not start” / detector unavailable | Missing model, WASM, or WebGL context | Run `npm run sync:assets`; confirm `public/models/blaze_face_short_range.tflite` and `public/mediapipe/wasm/vision_wasm_internal.wasm`; try CPU fallback by disabling hardware acceleration or restarting the browser |
| Drive link fails | File not public, wrong link form, or quota page | Share “Anyone with the link”; use a `/file/d/...` or `open?id=...` link; verify the image opens in a private window |
| Google Sheet returns HTML | Sheet is private or the wrong tab/gid | Set “Anyone with the link can view”; include the correct `gid`; use the published CSV form if needed |
| “Google rejected that sheet tab” | Stale or invalid `gid` in the copied URL | Open the sheet, select the tab, copy a fresh link; or remove the `gid` fragment to import the first visible tab |
| Canvas is blank after artwork upload | Very large artwork exceeded memory, or the image is still decoding | Keep artwork ≤ 8,000 px per side; reload and retry |
| Custom font does not apply | File over 2 MB, unsupported format, corrupt/DRM font | Use WOFF2/WOFF/TTF/OTF under 2 MB; test in a fresh template |
| Device font looks different on another machine | Device fonts are machine-specific | Upload and embed the font instead |
| Batch freezes or tab crashes | Main-thread render at 2× with many records | Lower concurrency/scale, split the source, delete older batches to free memory |
| “The batch could not be saved to history” | IndexedDB quota/write failure | Delete old batches, free disk space, retry; files remain downloadable from the current view |
| Workspace appears empty | Different origin/port/profile, private window, or site data cleared | Use the original origin/profile; restore from a backup if one exists |
| `next dev` port conflict | Another process owns 3000 | Use `--port 3100` (remember it is a separate workspace) |

## 11. Deployment notes

- Deploy the Next.js server, not a static export.
- Use HTTPS; `queryLocalFonts` and some browser APIs require a secure context (localhost is treated as secure).
- Set a narrow `IMAGE_PROXY_ALLOWLIST` if the instance is shared.
- Put an access layer in front of any shared deployment: the app has no accounts, so anyone who can reach it can use the proxy.
- Do not add analytics or external font requests without updating the privacy documentation and user-facing copy.
- Browser storage is per user and per origin; there is no central backup.
- Review [SECURITY.md](SECURITY.md) before exposing the app publicly.

## 12. Contribution workflow

1. Read [AGENT.md](AGENT.md) and [CLAUD.md](CLAUD.md).
2. Inspect `git status` before editing; never stage unrelated changes.
3. Keep the local-first model and privacy copy intact.
4. Update the relevant docs and [CHANGELOG.md](CHANGELOG.md) with behavior changes.
5. Run `npm run typecheck` and `npm run build`.
6. Exercise the affected flow in the browser.
7. Commit in focused, feature-sized commits. Do not commit generated WASM, `.next`, local env files or workspace artifacts.
