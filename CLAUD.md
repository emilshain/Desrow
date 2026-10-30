# CLAUD.md — Working notes for Claude-style agents

This file is for an AI coding assistant (Claude, Cursor, Codebuff or similar) operating inside the Desrow repository. Read [AGENT.md](AGENT.md) for the general operating protocol; this file captures project-specific decisions and traps.

---

## 1. What this project is

A Next.js 16 / React 19 / TypeScript studio that turns a spreadsheet plus a designed template into batches of monochrome portrait assets. It is **local-first**: IndexedDB holds the workspace; the only server work is a guarded image proxy and a public Google Sheets → CSV proxy.

Do not “improve” it into a cloud app. There are no accounts, no server database, no analytics and no external inference. Preserve that unless the user explicitly changes the product direction.

## 2. Before editing

```bash
git status --short --branch
npm run typecheck
```

- The repo may have uncommitted work. Never discard or stage changes you did not make.
- Use the project's npm lockfile; do not introduce another package manager.
- Read the relevant docs first: [PRD](docs/PRD.md) for intent, [TRD](docs/TRD.md) for mechanics, [database_schema.md](docs/database_schema.md) for persistence.

## 3. Canonical decisions — do not undo casually

| Decision | Source of truth | Why it matters |
| --- | --- | --- |
| Uploaded master artwork defines the canvas/output size | `src/lib/artwork.ts` → `adoptArtwork` | This was an explicit product requirement. Replacing artwork must scale pixel-based type/radius/border by the width ratio. |
| Positions are normalised 0–1 | `PhotoLayer`, `TextLayer` in `src/lib/types.ts` | Output at 1×/1.5×/2× must preserve composition. |
| Face crop is computed from the face box | `src/lib/crop.ts` | Do not replace with a centered/cover crop; consistency across sources depends on it. |
| Grain is inside the photo frame only | `src/lib/render.ts` | Artwork and type must stay clean. |
| Custom fonts are embedded in the template | `TemplateFont[]`, `src/lib/fonts.ts` | Portability is the point. Do not switch to a path-only reference. |
| Local-first storage | `src/lib/db.ts` | No backend database; the workspace belongs to the browser profile. |
| Tokens resolve mapped aliases | `src/lib/csv.ts` → `tokenValues` | The starter template uses `{{name}}`, `{{title}}`, `{{id}}`, which must work with arbitrary spreadsheet headers. |
| The image proxy is guarded | `src/lib/server/*` | Never relax SSRF/DNS/redirect/content-type limits for convenience. |

## 4. Where things live

- **Routes:** `src/app/*/page.tsx`; API routes under `src/app/api/*/route.ts`.
- **Composition:** `src/lib/render.ts` (background → frame → grade → grain → border → text).
- **Batch job:** `src/lib/job.ts`; progress types are exported from the same file.
- **Text measurement/wrapping:** `src/lib/text-layout.ts`; the editor overlay uses the same layout function so boxes match rendered text.
- **Font plumbing:** `src/lib/fonts.ts`; every new font source must update both CSS/canvas families and `ensureTemplateFonts`.
- **Template editor:** `src/components/templates/template-editor.tsx` (state/autosave), `template-stage.tsx` (direct manipulation), `template-inspector.tsx` (controls).
- **Render bench:** `src/components/render/render-bench.tsx` (state/run), `render-controls.tsx` (settings), `render-preview.tsx` (single-record preview/overrides).
- **UI primitives:** `src/components/ui.tsx`; do not hand-roll a second button/input/slider style.
- **Design tokens:** `src/app/globals.css`.
- **Storage:** `src/lib/db.ts` and `src/lib/settings.ts`.

## 5. Conventions

### Code

- Strict TypeScript; avoid `any`. Prefer discriminated unions and explicit return types for exported functions where it aids readability.
- Keep domain logic in `src/lib` pure and browser-only where appropriate. Do not import React into `src/lib`.
- Use existing helpers (`uid`, `clamp` locally, `getCell`, `tokenValues`, `safeFilename`) instead of duplicating behavior.
- When adding a persisted field, update the TypeScript interface, defaults, any `?? []` fallbacks, the schema doc and the changelog.
- Browser APIs must be feature-detected (see device fonts). Never assume `document` is available during module evaluation in a shared module; guard with `typeof window/document`.
- Canvas text needs fonts loaded before measuring or drawing. Await `ensureTemplateFonts` or `registerFontFace` in any new render path.
- Preserve the serialised face detector queue. It exists because MediaPipe has internal state.

### UI

- Use `Button`, `Field`, `Slider`, `Select`, `Toggle`, `Badge`, `Notice`, `Modal`, `EmptyState` from `ui.tsx`.
- Use the established terminology: master artwork, canvas, photo frame, text layer, record, dataset, template, batch, asset, export.
- Every slider must keep a numeric value input. Units belong in the UI (`px`, `%`, `×`).
- New destructive action → confirmation modal. New empty state → explain the next step.
- If you add a storage or privacy claim, make sure it is true. The current claim is “stays in this browser”; do not weaken it with analytics or remote persistence.
- Match the darkroom palette. Accent is for primary actions/selection, not decoration.

### Dependencies

Confirm a library is already used before adding it. The stack deliberately has few dependencies. Do not add a state manager, UI kit, date library or image library for something the platform already does.

## 6. High-risk areas

1. **Autosave races.** Template edits are debounced and flushed before navigation. If you add a new navigation action, use `flush()` first.
2. **Canvas size adoption.** `adoptArtwork` is partial by design; ensure any new pixel-based layer field is scaled consistently.
3. **Font readiness.** Rendering before `document.fonts.ready` can produce fallback typography in the bitmap; always go through `ensureTemplateFonts`.
4. **Token aliases versus real columns.** Explicit columns must win. Do not let an alias overwrite a real key.
5. **Filename uniqueness.** Run two assets with the same name and ZIP consumers lose data; keep `uniqueFilename`.
6. **SSRF.** `guardedFetch` must re-check DNS on every redirect. Do not accept a URL from a user and fetch it directly.
7. **IndexedDB size.** Full-resolution blobs dominate quota. Avoid accidentally storing both a blob and a duplicate data URL for every item.
8. **Main-thread work.** Preview effects are debounced; don't add synchronous pixel loops on every keystroke.

## 7. Verification

Minimum for any code change:

```bash
npm run typecheck
npm run build
```

For UI/rendering changes, exercise the real flow in a browser:

1. `/source` — import a CSV with mapped name/portrait.
2. `/templates` — create with artwork; confirm 1400 × 1800 canvas adoption.
3. Editor — select the Name layer, upload a test font under 2 MB, set an exact size, verify the canvas updates and persists after reload.
4. `/render` — confirm preview, run the batch, check filenames and full-resolution dimensions.
5. `/exports` — confirm batch counts and metadata.

If you cannot run a browser, state which checks are unverified. Never describe a build exit code as proof that the UI works.

### Testing device fonts

- Chromium's `queryLocalFonts` requires permission and a secure context; localhost qualifies.
- If scanning is denied, manual family entry must still work.
- A requested family may be absent; the canvas then falls back to `ui-sans-serif`. Do not claim the exact installed font was used just because a name was set.

### Testing the image proxy

Use obvious blocked targets (`127.0.0.1`, `localhost`, private ranges) and confirm non-200 responses. Check that valid public images still load. If you change redirect behaviour, test a redirect to a private address, not only a direct URL.

## 8. Docs and changelog

Update the affected docs in the same change:

- Behavior/requirements → `docs/PRD.md`
- Architecture/algorithms/limits → `docs/TRD.md`
- Journeys/states → `docs/App_flow.md`
- Visual/terminology → `docs/Design.md`
- Storage/types → `docs/database_schema.md`
- Build/verification → `BUILD.md`
- Shipped/next → `TODO.md`
- Security posture → `SECURITY.md`
- User-visible change → `CHANGELOG.md`

Do not create new top-level markdown files without a reason; the documentation split is intentional.

## 9. Git

- Focused commits. Stage only the files you changed.
- Follow the existing conventional subject style (`feat:`, `fix:`, `docs:`, `chore:`).
- Do not push, rewrite history, or open a PR unless the user asks.
- Never commit `.next/`, `public/mediapipe/`, `.env*`, logs, screenshots of private data, or IndexedDB exports.

## 10. Known incomplete work

- No automated test suite or CI.
- Render is main-thread only.
- Device font availability is not verified.
- Server-side detection is planned, not built.
- No workspace backup/export.
- Some small mono text is below ideal accessibility sizes.
- Template font arrays are optional and handled defensively, but there is no full normalisation migration.

When asked to “finish” something, check [TODO.md](TODO.md) and these known gaps rather than inventing a larger scope.
