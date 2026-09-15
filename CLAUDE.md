# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

JSON Ninja — a client-side JSON editor/formatter/validator (Vite + React + TypeScript + Tailwind). All
data processing happens in the browser; documents and preferences persist to IndexedDB
(`src/lib/db.ts`), not a server. `@supabase/supabase-js` is a declared dependency but is not currently
wired up anywhere in `src/`.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run typecheck` — `tsc --noEmit` against `tsconfig.app.json`

There is no test runner configured in this repo.

## Architecture

**State lives in `App.tsx`**, not in the individual panel/editor components. `App` owns `layout`,
`theme`, and the `panels` array (`PanelState[]`), and passes callbacks down; components are largely
controlled/presentational. Panel state and app preferences are debounced (800ms) and persisted to
IndexedDB via `persistPrefs` → `savePreferences`.

**Panel model**: up to 4 panels exist at once, but only a subset are rendered depending on `layout`
(`single` / `horizontal` / `vertical` / `grid`, mapped to counts via `MAX_PANELS` in `src/types.ts`).
Panels are addressed by a fixed `PanelId` (`0 | 1 | 2 | 3`), so switching layouts doesn't discard the
other panels' content — it just changes which are visible.

**Rendering pipeline**: `PanelGrid` picks a layout-specific arrangement and renders `Panel` components
with resizable dividers (drag state tracked via refs + raw `mousemove`/`mouseup` listeners, not a
library). `Panel` wraps `JSONEditorWrapper`, which is a thin imperative bridge to the `vanilla-jsoneditor`
web component: it creates the editor once in a mount-only `useEffect`, then pushes content/mode/theme
updates into it imperatively via refs (`lastContentRef`, `editorRef`) to avoid feedback loops between
React state and the editor's own internal state.

**JSON operations** (`src/lib/json-utils.ts`) are pure string-in/string-out functions — `formatJson`,
`compactJson`, `sortJsonKeys`, `repairJson` (best-effort fixups for trailing commas, single quotes,
unquoted keys), `tryParseJson`, `countItems`, `byteSize`. These are used directly by toolbar/panel
actions rather than going through any editor API.

**Persistence** (`src/lib/db.ts`): a single IndexedDB database (`json-editor-db`) with two object
stores — `documents` (saved JSON documents, keyed by `id`) and `preferences` (a single record keyed
`'app'` holding layout/theme/panel state). All access goes through the small `tx()` helper that wraps
an `IDBRequest` in a Promise.

## Conventions

- Import project modules via the `@/` path alias (maps to `src/`, configured in both `vite.config.ts`
  and `tsconfig.app.json`) instead of relative paths like `../../lib/foo`.
- Icons come from `lucide-react` only — don't add another icon set.
- Don't introduce new UI/theming/icon libraries; this is a Tailwind + lucide-react project by design
  (see `.bolt/prompt`).
