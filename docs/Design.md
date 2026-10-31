# Desrow — Design

**Version** 0.1.0 · **Date** 30 October 2026

---

## 1. Design idea

Desrow should feel like a darkroom contact sheet crossed with a precise editorial layout tool: warm paper against near-black ink, a restrained brass accent, serif display type for the human side, mono type for the machine side.

The interface is intentionally quiet. The user's artwork and portraits are the loudest things on screen; chrome recedes. Controls are dense but labelled, with exact values available wherever a slider exists.

**Keywords:** archival, precise, tactile, monochrome, editorial, local, calm.

**Avoid:** glossy gradients, neon accents, playful illustration, dashboard chart clutter, rounded-pill excess, generic “AI” visual language, hidden auto-magic.

## 2. Brand

- **Name:** Desrow (capital D, one word).
- **Tagline:** “Rows in. Portraits out.”
- **Descriptor:** Spreadsheet portrait automation.
- **Voice:** concise, confident, specific. Tell the user what will happen and what went wrong.
- **Tone:** craftsman, not marketer. No exclamation marks. No “magic”.

### Copy rules

- Name the object: “master artwork”, “photo frame”, “text layer”, “record”, “batch”, “asset”.
- Name the unit: px, %, ×, MB.
- Prefer “portrait” for the source photo and “asset” for the rendered output.
- Say “this browser” when discussing storage; never imply cloud sync.
- Explain a failure with its remedy: sharing settings, supported formats, size limits.
- Use sentence case for headings and labels; uppercase mono is reserved for eyebrows and field labels.

## 3. Colour

All values are CSS custom properties in `src/app/globals.css` and are exposed to Tailwind via `@theme`.

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#08090b` | Page background |
| `ink-2` | `#0c0d10` | Deep wells, canvas surround |
| `panel` | `#111317` | Cards, sidebars, inspector |
| `panel-2` | `#0e1013` | Secondary surfaces |
| `line` | `#24272d` | Default border |
| `line-soft` | `#1a1d22` | Hairline dividers |
| `paper` | `#f1ede4` | Primary text, warm white |
| `paper-dim` | `#d8d3c6` | Secondary text |
| `muted` | `#9a958b` | Supporting text |
| `muted-2` | `#6f6c65` | Labels, metadata, disabled-ish text |
| `accent` | `#e5d3ae` | Brass accent, selection, primary CTA |
| `accent-strong` | `#f6e8ca` | Hover on primary CTA |
| `danger` | `#e07a5f` | Errors, destructive actions |
| `ok` | `#9dbe98` | Success, detected face, saved |
| `warn` | `#d9ae63` | Warnings, fallbacks |

The body also has two very low-opacity radial washes (warm upper-right, cool lower-left) and a fixed 3.5% SVG noise overlay. These create the paper/film texture without competing with the canvas.

Chart-like data (counts, dimensions, seeds, statuses) uses mono and muted tones; never color alone. Accent is scarce: primary actions, active nav icons, selected layer outlines, focus rings.

## 4. Typography

### Families

| Role | Family | Stack |
| --- | --- | --- |
| UI / body | Inter Variable | `"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif` |
| Display / editorial | Instrument Serif | `"Instrument Serif", "Times New Roman", Georgia, serif` |
| Machine / labels | JetBrains Mono Variable | `"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace` |

Fontsource packages load these locally; there is no Google Fonts request at runtime.

### Scale

| Role | Size | Notes |
| --- | --- | --- |
| Hero display | `clamp(3.1rem, 7.3vw, 6rem)` | Instrument Serif, line-height 0.94, tight tracking |
| Page title | 28–38 px | Instrument Serif / medium sans depending on surface |
| Section heading | 16–19 px | Inter medium |
| Body | 12–14 px | Inter, muted |
| Small body | 10.5–12 px | Explanatory copy |
| Field label | 10 px mono | Uppercase, 0.13em tracking |
| Eyebrow | 10 px mono | Uppercase, 0.18em tracking |
| Mono metadata | 9–11 px | Dimensions, status, counts |

### Rules

- Numeric values in controls use the `.num-input` style: mono, right-aligned, transparent until hover/focus.
- Do not use serif for controls or body copy; it is a display voice.
- Headings avoid full stops except when the phrase is a deliberate statement (“The photographic pass.”).
- Letter spacing is positive for mono labels, slightly negative for display and medium sans headings.

## 5. Spacing, shape and surface

- Base spacing unit: 4 px. Common gaps: 8, 12, 16, 20, 24, 32, 36, 44 px.
- Panel radius: 16 px. Flat cards: 12 px. Inputs/buttons: 9–10 px. Small chips: 5–7 px. Pills: 999 px.
- Panel border: 1 px `line`; inner top highlight at 2.5% white.
- Surface gradient: subtle 180° white 2.2% → transparent, over `panel`.
- Shadowing is reserved for the live canvas and modal, not for every card.
- Hairline dividers use `line-soft`; avoid heavy boxes around every section.
- Canvas surrounds use a darker well (`ink-2`/`#0a0b0e`) so artwork edges are legible.

### Layout widths

- App max width: 1480 px, side padding 16/28/36 px.
- Sidebar: 252 px on `lg+`.
- Template editor: `192px | fluid canvas | 336px` above `xl`.
- Render bench: `328px | fluid preview + batch` above `xl`.
- Exports: `310px | fluid batch` above `lg`.

## 6. Components

### Shell

- Sidebar: brand mark, workspace nav with counts, local-workspace card, GitHub link, version.
- Mobile top bar: brand, “Local” label, horizontally scrollable nav.
- Nav active state: 5.5% white fill, accent icon, paper text.

### Panels and cards

- `.panel` for primary surfaces.
- `.panel-flat` for nested stats and read-only blocks.
- `.checker` for transparency behind artwork thumbnails.
- Avoid nesting more than two bordered surfaces.

### Buttons

| Variant | Appearance | Use |
| --- | --- | --- |
| Primary | Brass fill, dark text | Main forward action (Import, Render, Download ZIP) |
| Secondary | Translucent white, line border | Alternate actions (Upload, Edit, Use in render) |
| Ghost | Transparent, muted text | Tertiary actions, back, clear |
| Danger | Muted red tint | Destructive confirmation |

Sizes: 30/38/45 px heights (`sm`/`md`/`lg`). Buttons always have an icon when it clarifies the action; icon-only buttons require an `aria-label`.

### Inputs

- 38 px height, dark `#0a0b0e` fill, 1 px line border, 9 px radius.
- Hover border lightens; focus uses brass border plus a 3 px 9% brass halo.
- Labels sit above, mono uppercase. Hints sit below, 10.5–11.5 px muted.
- Selects use a custom chevron and keep native semantics.
- Sliders pair a 3 px track with a 14 px brass thumb and always expose a numeric field with the same range.

### Badges and status

- Pills, 22 px height, mono 10 px.
- Tones: neutral (line), accent (brass), ok (green), warn (amber), danger (red).
- Status dots accompany words such as “Saved”, “Detected”, “Rendered”; colour is secondary.
- Uppercase is used for status metadata, not for sentences.

### Notices

- Full-width inline block with a tinted background and border matching the tone.
- Info: neutral. Success: ok. Warn: amber. Error: danger.
- Copy should include the cause and the next action.

### Modals

- Centered, max width 36–42 rem, dimmed backdrop, 1 px border.
- Header with title/description; footer with a ghost cancel and a primary/danger confirm.
- Destructive copy states what will be removed and that it cannot be undone.

### Canvas handles

- Photo frame and text boxes use a 1 px brass outline when selected.
- Resize handles are 9 px brass squares with a dark border; text width handle is a 7 × 16 px bar.
- Labels above selected layers use black/70 background, brass mono uppercase.
- Selection is also reflected in the Layers rail and inspector heading.

## 7. Terminology

Consistency matters more than synonyms. Use these exact terms in UI copy.

| Term | Definition | Avoid |
| --- | --- | --- |
| **Source** | The imported CSV or Google Sheet | Upload, list |
| **Dataset** | A saved source with columns, mapping and rows | Table, file |
| **Record** | One row / one person | Entry, item, contact |
| **Column** | A source field; becomes a token | Header, attribute |
| **Mapping** | Which column supplies the name and portrait | Binding |
| **Token** | `{{column}}` placeholder resolved per record | Variable, merge field |
| **Master template** | The artwork, photo frame and text layout | Design, layout, preset |
| **Master artwork** | The background image whose native size defines the canvas | Background, BG, backdrop |
| **Canvas** | The template's pixel dimensions | Artboard, page |
| **Photo frame** | The normalised rectangle the portrait is cropped into | Image box, mask, avatar |
| **Crop window** | The source rectangle selected from the portrait | Zoom box |
| **Face height in frame** | Percentage of frame height occupied by the detected face | Zoom, scale |
| **Face X / Face Y** | Where the face centre lands in the frame | Offset, position |
| **Detection** | Local BlazeFace face finding | Recognition, AI scan |
| **Tone curve** | Input/output luminance curve | Filter, LUT (in UI) |
| **Channel mix** | Red/green/blue weights for monochrome conversion | Grayscale, saturation |
| **Grain** | Seeded noise applied to the photo frame | Noise, texture |
| **Render** | Process one record or a batch into an asset | Generate, export (until download) |
| **Batch** | A saved render run with settings and items | Job, export (before saving) |
| **Asset** | A rendered full-resolution image | Output, file, frame |
| **Exports** | The history surface for saved batches | Downloads |
| **Manifest** | `manifest.csv` inside the ZIP | Report |
| **Embedded font** | A font file stored inside the template | Custom font (in explanatory copy) |
| **Device font** | An installed family referenced by name | Local font (except API internals) |

### Preferred microcopy

- “Upload master artwork” not “Choose background”.
- “The artwork sets the canvas and output size.”
- “Detected face · 95%” / “No face · fallback crop”.
- “Rendered 3 of 3 · 0 failed · 0 skipped”.
- “Saved locally in this browser. Nothing leaves this browser.”
- “This browser does not expose device fonts. Type an installed family name instead.”
- “Keep embedded font files under 2 MB.”
- “Use a PNG, JPEG or WebP image.”
- “Portraits are fetched through the local image proxy, graded on canvas and merged into the selected template.”

## 8. Interaction design

### Direct manipulation first, inspector second

Every layer can be moved on canvas. The inspector mirrors the same values exactly. Users should never need to guess a coordinate; they can drag to explore and type to finish.

### Visibility of state

- Save status is always visible in the editor.
- Batch progress is persistent, with counts and active labels.
- Error text is attached to the affected record, not only a global toast.
- Warnings remain attached to rendered items (for example, no face detected).

### Reversibility

- Deleting a layer or template asks for confirmation.
- Deleting a batch is irreversible and says so.
- Resetting processing parameters clears stored settings and restores documented defaults.
- Overrides can be reset per record without touching global settings, including switching a single portrait between fit and face crop.

### Manual control

No automatic “best” crop replaces the user's settings. The single automatic decision is placement: Auto may choose fit when a face-relative crop would exceed the source, because no valid crop exists for that framing. The preview names that decision and offers a per-record override; face height/placement, grade, grain and typography remain explicit. If detection fails, the app falls back and tells the user rather than failing the batch.

### Performance feel

- Use optimistic local updates; do not block typing on IndexedDB writes.
- Debounce expensive preview work.
- Keep controls responsive while a batch runs, even though rendering is main-thread.
- Show progress as soon as the job starts, not only after the first item completes.

## 9. Accessibility

### Implemented

- Semantic buttons, labels, fieldsets-ish groups, `role="switch"` toggles with `aria-checked`.
- Sliders have both a range input and a labelled numeric input; both share min/max/step.
- Icon-only actions have `aria-label`.
- Canvas previews have descriptive labels (“Founder portrait canvas preview”, “Preview for Avery Sinclair”).
- Visible focus ring: 2 px brass at 65%, 2 px offset.
- Status uses text plus dot/colour.
- Tab order follows the visual reading order on desktop; stacked order on mobile is canvas → layers → inspector.
- Contrast: primary paper text on ink has strong contrast. Small muted metadata (9–11 px) can fall below 4.5:1, so critical values are repeated in brighter text or accompanied by a label rather than relying on the muted tone alone.

### Known gaps

- Canvas layers are pointer-driven; there is no full keyboard layer traversal beyond arrow nudging of the selected layer.
- Drag/resize lacks a screen-reader announcement of changing coordinates.
- The fixed noise overlay and smooth scrolling are not reduced-motion aware.
- Some very small mono metadata (8–9 px) is below a comfortable minimum for low-vision users.
- No high-contrast theme or light theme.

## 10. Motion

- Transitions are short (100–300 ms) and limited to colour, border, opacity, transform and progress width.
- Buttons press down 1 px; nav arrows shift 2 px on hover.
- No entrance animations, parallax or spring physics.
- The progress bar eases width over 300 ms.
- Smooth scrolling is used when staging an import or selecting a result row.

## 11. Imagery and iconography

- Icons are a custom 1.5 px stroke set (overview, source, templates, crop, render, exports, archive, upload, link, image, text, plus, trash, check, alert, arrow, chevron, search, refresh, play, stop, download, external).
- Icons are decorative unless they carry the only label; then an accessible name is required.
- Portrait thumbnails are object-cover in fixed aspect boxes with a dark placeholder.
- The overview “specimen” is a CSS-built abstract portrait, not a stock photo; it demonstrates the visual language without implying a real person.
- No icon should be filled unless it represents an active toggle.

## 12. Responsive and content density

- Desktop is the primary composition surface; the layout deliberately gives the canvas the largest column.
- On narrow screens, the editor becomes a vertical flow: canvas, layers, inspector. The canvas remains usable but precision work is slower.
- Tables become stacked rows; metadata wraps rather than truncating critical values.
- Long dataset/template names truncate in navigation and cards but remain available via `title`.
- Avoid horizontal scrolling outside the mobile nav and wide data grids.

## 13. Design QA checklist

- Does the screen use one primary action?
- Are all values expressed with units?
- Does every slider have an exact numeric counterpart?
- Is selection visible in both canvas and layer rail?
- Does an empty state explain the next step?
- Does an error explain a remedy?
- Are destructive actions confirmed in a modal?
- Is storage described as local to this browser?
- Does the layout hold at 1280 px, 1024 px and 390 px?
- Are focus states visible without a mouse?
- Is colour ever the only carrier of status?
