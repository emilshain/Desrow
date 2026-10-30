# AGENT.md — Operating protocol for coding agents

This repository is worked on by humans and AI coding agents. This file defines how to operate safely, how to verify work and what “done” means. Project-specific context lives in [CLAUD.md](CLAUD.md); build steps live in [BUILD.md](BUILD.md).

---

## 1. Start here

1. Read the request literally. Identify the exact output path, behavior, format or interface it names.
2. Inspect the repository before changing it:
   ```bash
   pwd
   git status --short --branch
   git log --oneline -5
   ```
3. Read only the files needed to ground the change. For Desrow, the canonical product/technical context is in `docs/`. The most useful files are usually `src/lib/types.ts`, the relevant route/page, and the lib or component that owns the behavior.
4. Check whether the work already exists. Do not duplicate a helper, component, store or doc.
5. Size the work to the request. Do not add unrequested features, refactors, dependencies or polish.

## 2. Non-negotiables

### User data and files

- Never destroy, overwrite, stash or commit changes you did not make.
- Never run destructive operations (`git reset --hard`, `git clean -fdx`, force push, mass deletion) without explicit authorization.
- Do not edit files outside the project unless the user provided the exact path.
- Do not commit or print secrets, `.env` contents, session tokens or private user data.
- Do not add analytics, telemetry, remote logging or third-party inference to this app.

### Security

- Treat every URL, CSV cell, filename, font file and image as untrusted input.
- Server-side fetches must go through `src/lib/server/fetch.ts` and `assertSafeRemoteUrl`.
- Never bypass the SSRF guard, DNS re-checks, redirect validation, content-type checks or size caps.
- Render user text to canvas, not `innerHTML`. If HTML is ever needed, use a vetted sanitizer.
- Validate and clamp persisted settings before use.
- Filenames are sanitised; keep it that way.
- Do not add a proxy endpoint that can fetch arbitrary internal resources.

### Product truths

- Storage is local to the browser profile. Do not claim cloud sync, backup or multi-device support.
- Face detection is local. Do not claim server-side detection exists.
- Artwork defines the output canvas. Do not silently change that behavior.
- Device fonts may not exist on another machine. Say so in UI copy.
- If a check cannot run, report it as unverified, not as passing.

## 3. Workflow

### Understand

- Restate the requested outcome in one sentence internally.
- Identify the smallest set of files to change.
- If a request is ambiguous in a way that changes the implementation (scope, data model, privacy), ask. Do not guess on consequential choices.
- If a request is high-level (“improve onboarding”, “make it faster”), propose the smallest version that meets the goal and confirm before building a large version.

### Implement

- Prefer editing existing files over creating new ones.
- Match the project's conventions before introducing your own.
- Use existing dependencies. Verify a library is present before importing it.
- Keep domain logic testable and out of React where practical.
- Add explicit types for new exported APIs.
- Handle empty, loading, error and disabled states.
- Preserve existing behavior unless the request explicitly changes it.

### Verify

Verification must be proportional and real:

- **Small text/config change:** confirm the file content and run the narrowest relevant check.
- **TypeScript change:** `npm run typecheck`.
- **Build-affecting change:** `npm run build`.
- **UI behavior:** drive the actual route in a browser and confirm the rendered DOM/state. A green build does not prove the UI works.
- **Render/export change:** exercise a batch and inspect output dimensions, filenames, statuses and stored items.
- **Security change:** test blocked targets and legitimate targets; preserve exit status when piping output.
- **Performance claim:** measure before/after on a representative input. No claim without a measurement.

After a repair, rerun the affected check. Earlier passing results do not cover later edits.

Report:
- What changed.
- What was verified and how.
- What failed or could not run.
- Any remaining user action (configuration, credentials, browser permission).

### Finish

- Mark todos complete as you go, not all at the end.
- Do not leave background servers running unless the task needs them; inspect listeners before starting another.
- Do not end on a plan sentence. If you say you will run a check, call the tool in the same turn.
- Leave the worktree in a coherent state and list any uncommitted files that remain.

## 4. Definition of done

A change is done when all applicable items are true:

- [ ] The requested behavior is implemented completely, with no unrequested scope.
- [ ] Existing behavior and data remain compatible, or a migration is included.
- [ ] TypeScript passes (`npm run typecheck`).
- [ ] Production build passes (`npm run build`) for build-affecting changes.
- [ ] The affected flow was exercised through its real surface (DOM/HTTP/canvas/IndexedDB).
- [ ] Error and empty states were considered.
- [ ] Accessibility names/labels exist for new controls.
- [ ] Security boundaries remain intact.
- [ ] Relevant docs were updated (PRD/TRD/flow/design/schema/BUILD/TODO/SECURITY/CHANGELOG as applicable).
- [ ] No secrets, generated assets, logs or unrelated files are staged.
- [ ] The final message states outcomes, verification and limitations.

## 5. Commit protocol

Only commit when the user asks.

1. Review `git diff` and `git log`.
2. Stage only files belonging to the change (`git add <paths>`, never `git add -A`).
3. Use a focused conventional subject:
   - `feat: add embedded custom font support`
   - `fix: resolve mapped name tokens in batch output`
   - `docs: document local-first storage limits`
4. Explain the *why* in one or two sentences. Do not narrate every file.
5. Do not include unrelated work.
6. Do not push or open a PR unless explicitly authorized.

## 6. Code review checklist

- Is there a simpler existing helper?
- Are units explicit and ranges clamped?
- Are canvas operations guarded by font/image readiness?
- Could this break at 2× output or an 8,000 px canvas?
- Does this run on the main thread more often than necessary?
- Are IndexedDB records backward-compatible?
- Is any user-supplied string used as HTML, a filename, a URL or a font family without sanitisation?
- Does the UI use the established vocabulary?
- Does the copy promise something the app does not do?
- Are error messages actionable?
- Are colour-only statuses accompanied by text?

## 7. Documentation duties

Desrow uses a deliberate documentation split:

| Change | Update |
| --- | --- |
| Product behavior, scope, limits | `docs/PRD.md` |
| Architecture, algorithms, APIs, security design | `docs/TRD.md` |
| Routes, journeys, states, interactions | `docs/App_flow.md` |
| Visual system, components, terminology | `docs/Design.md` |
| Stores, fields, indexes, migrations | `docs/database_schema.md` |
| Setup/build/verification | `BUILD.md` |
| Shipped/next work | `TODO.md` |
| Agent-facing project notes | `CLAUD.md` |
| Security posture/disclosure | `SECURITY.md` |
| User-visible history | `CHANGELOG.md` |

Keep docs accurate. A smaller accurate document is better than speculative completeness. Mark future work as planned, not implemented.

## 8. Handoff format

When finishing, provide a concise message with:

1. **Outcome** — what now works.
2. **Changes** — the few files/areas that matter, with links.
3. **Verification** — commands and real flows exercised, including results.
4. **Limitations** — checks that could not run, known gaps, required user action.
5. **Next step** — only if the user needs to do something.

Do not end with “let me know if…” filler. Do not claim success you did not verify.
