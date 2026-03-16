# MBSE Explorer

An interactive browser-based tool for visualising and exploring **Model-Based Systems Engineering (MBSE)** files as a force-directed network graph. Node types are colour-coded according to the **Unified Architecture Framework (UAF)** profile, which is loaded dynamically at runtime — no code changes needed when the UAF definition evolves.

---

## Screenshots

| File loader | Graph view | Detail slider |
|---|---|---|
| Drop or browse a `.json` file | Force-directed network with UAF colours | Click any node to inspect its metadata |

---

## Features

- **Force-directed graph** — interactive pan, zoom, and drag using [`force-graph`](https://github.com/vasturiano/force-graph)
- **UAF type colouring** — nodes are coloured by their UAF domain (Operational, Services, Resources, …) derived dynamically from `resources/UAF.xmi`
- **Detail slider** — click any node or relationship to slide open a panel showing its name, description, UUID, UAF stereotype definition, and domain
- **Search** — the toolbar search box dims non-matching nodes and highlights matches with an amber ring
- **Relationship inspection** — click an edge to see its name, description, and source → target endpoints
- **Domain legend** — collapsible legend in the bottom-left corner, auto-generated from the loaded UAF profile
- **Live UAF binding** — `public/UAF.xmi` is a symlink to `resources/UAF.xmi`; updating the source file is enough to reflect new stereotypes on the next page load

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | [Svelte 5](https://svelte.dev/) with runes (`$state`, `$derived`, `$effect`) |
| Build tool | [Vite 8](https://vite.dev/) |
| Graph rendering | [`force-graph`](https://github.com/vasturiano/force-graph) (vanilla JS, Canvas 2D) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Icons | [`lucide-svelte`](https://lucide.dev/) |
| Language | TypeScript (strict) |

---

## Project structure

```
frontend/
├── public/
│   ├── UAF.xmi              → symlink to ../../resources/UAF.xmi
│   └── sample-mbse.json     # example file you can load straight away
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   └── mbse.ts              # TypeScript interfaces for the MBSE schema
│   │   ├── utils/
│   │   │   ├── uafParser.ts         # Fetches & parses UAF.xmi at runtime
│   │   │   └── graphTransform.ts    # Converts MBSE JSON → force-graph nodes/links
│   │   ├── state/
│   │   │   └── app.svelte.ts        # Global reactive singleton (Svelte 5 runes)
│   │   └── components/
│   │       ├── FileLoader.svelte    # Drag-and-drop / browse JSON loader
│   │       ├── GraphCanvas.svelte   # force-graph canvas + all drawing logic
│   │       ├── NodeDetailSlider.svelte  # Right-side slide-over panel
│   │       ├── Toolbar.svelte       # Top bar: filename, stats, search, buttons
│   │       └── TypeLegend.svelte    # Bottom-left UAF domain colour legend
│   ├── App.svelte            # Root layout shell
│   ├── app.css               # Tailwind v4 import + base resets
│   └── main.ts               # Svelte mount entry point
├── index.html
├── vite.config.ts
├── svelte.config.js
└── tsconfig.app.json
```

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- The repository root must contain `resources/UAF.xmi` (already present)

### Install & run

```bash
cd frontend
npm install
npm run dev          # dev server on http://localhost:5173
```

### Production build

```bash
npm run build        # output in dist/
npm run preview      # serve the production build locally
```

### Type-check

```bash
npm run check        # svelte-check + tsc
```

---

## MBSE file format

The application accepts a `.json` file with the following schema:

```json
{
  "entities": [
    {
      "name":        "Air Operations Center",
      "uuid":        "ent-001",
      "description": "Primary command and control node …",
      "type":        "OperationalPerformer"
    }
  ],
  "relationships": [
    {
      "name":        "Commands",
      "uuid":        "rel-001",
      "description": "AOC commands the Strike Package …",
      "source":      "ent-001",
      "target":      "ent-005"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `entities[].uuid` | `string` | Unique identifier — used as the graph node `id` |
| `entities[].type` | `string` | UAF stereotype name (e.g. `OperationalPerformer`, `Capability`) |
| `relationships[].source` | `string` | UUID of the source entity |
| `relationships[].target` | `string` | UUID of the target entity |

A ready-to-use example is available at `public/sample-mbse.json`.

---

## UAF type colouring

Node colours are derived **entirely at runtime** from `resources/UAF.xmi`. The file is served as a static asset via a symlink (`public/UAF.xmi → ../../resources/UAF.xmi`) and parsed by `uafParser.ts` using the browser's built-in `DOMParser`.

The parser walks every `uml:Stereotype` element in the XMI, groups them by their top-level UAF package (domain), and assigns a colour per domain:

| Domain | Colour |
|---|---|
| Operational | ![#3B82F6](https://placehold.co/12x12/3B82F6/3B82F6.png) `#3B82F6` blue |
| Services | ![#22C55E](https://placehold.co/12x12/22C55E/22C55E.png) `#22C55E` green |
| Resources | ![#F97316](https://placehold.co/12x12/F97316/F97316.png) `#F97316` orange |
| Strategic | ![#A855F7](https://placehold.co/12x12/A855F7/A855F7.png) `#A855F7` purple |
| Personnel | ![#EAB308](https://placehold.co/12x12/EAB308/EAB308.png) `#EAB308` yellow |
| Security | ![#EF4444](https://placehold.co/12x12/EF4444/EF4444.png) `#EF4444` red |
| Projects | ![#14B8A6](https://placehold.co/12x12/14B8A6/14B8A6.png) `#14B8A6` teal |
| Architecture Management | ![#6366F1](https://placehold.co/12x12/6366F1/6366F1.png) `#6366F1` indigo |
| Standards | ![#6B7280](https://placehold.co/12x12/6B7280/6B7280.png) `#6B7280` gray |
| Actual Resources | ![#F59E0B](https://placehold.co/12x12/F59E0B/F59E0B.png) `#F59E0B` amber |
| Summary and Overview | ![#06B6D4](https://placehold.co/12x12/06B6D4/06B6D4.png) `#06B6D4` cyan |
| Parameters | ![#64748B](https://placehold.co/12x12/64748B/64748B.png) `#64748B` slate |

**To update the UAF definition:** edit or replace `resources/UAF.xmi` and reload the page. No code changes are needed.

---

## State management

All shared state lives in a single Svelte 5 reactive class (`src/lib/state/app.svelte.ts`):

```ts
// Every component imports this singleton directly — no prop drilling.
import { app } from '$lib/state/app.svelte';

app.selectedItem    // SelectedItem | null  ($state)
app.searchQuery     // string               ($state)
app.graphData       // GraphData | null     ($state)
app.uafDefinitions  // UAFDefinitions       ($state)
app.activeDomain    // string               ($derived)
app.matchingNodeIds // Set<string>          ($derived)
```

Reactive derivations (`$derived`, `$derived.by`) automatically re-compute when their dependencies change, eliminating the need for `useMemo`, `useCallback`, or explicit dependency arrays.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Escape` | Close the detail slider |
| `Escape` (in search box) | Clear the search query |

---

## Architecture notes

### Why `force-graph` instead of a Svelte-specific wrapper?

`force-graph` is the canonical vanilla-JS D3 force-directed graph library. There is no official Svelte wrapper, and none is needed: the library attaches itself to a plain `<div>` via `new ForceGraph(containerEl)`, which maps cleanly to Svelte's `bind:this` pattern. All canvas drawing callbacks are plain functions that close over nothing — they read the latest state from `app` at draw time.

### Why a `.svelte.ts` state file instead of stores?

Svelte 5 runes work in `.svelte.ts` files, enabling a class-based reactive singleton that is simpler, more co-located, and more TypeScript-friendly than the Svelte 4 `writable`/`readable` store pattern. The `$derived` fields replace both `$:` reactive declarations and `useMemo`.

### UAF symlink

```
frontend/public/UAF.xmi  →  ../../resources/UAF.xmi
```

Vite serves `public/` as static assets. The symlink means the production `dist/` folder will contain a copy of the XMI file at build time, while the dev server always reads the live file from `resources/`.