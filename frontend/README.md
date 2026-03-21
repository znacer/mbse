# MBSE Dashboard Frontend

A **SvelteKit 2** application for visualizing, exploring, and managing **Model-Based Systems Engineering (MBSE)** files. Features an interactive force-directed graph with dynamic UAF type coloring.

![MBSE Dashboard](https://placehold.co/800x400?text=MBSE+Dashboard)

## Features

- **Interactive Force-Directed Graph** - D3.js-powered visualization with pan, zoom, and drag
- **Dynamic UAF Type Coloring** - Nodes colored by UAF domain based on runtime-parsed `UAF.xmi`
- **Project Management** - Create, save, load, and delete projects with local storage persistence
- **Node & Edge Inspection** - Click nodes/edges to view metadata in a slide-out panel
- **Search & Filter** - Search nodes by name or type
- **File Import/Export** - Drag-and-drop JSON file loading and export functionality
- **Modern UI** - Built with shadcn-svelte components and Tailwind CSS v4

## Tech Stack

| Concern | Technology |
|---------|------------|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/) runes |
| Build Tool | [Vite 8](https://vite.dev/) |
| Graph Rendering | [D3.js](https://d3js.org/) (force-directed simulation) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [shadcn-svelte](https://www.shadcn-svelte.com/) |
| Icons | [lucide-svelte](https://lucide.dev/) |
| Language | TypeScript (strict) |
| Storage | LocalStorage for project persistence |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Bun (recommended) or npm

### Installation

```bash
cd frontend
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
bun run build
bun run preview
```

### Type Checking

```bash
bun run check
```

## Project Structure

```
frontend/
├── static/
│   └── UAF.xmi                 # UAF stereotype definitions
├── src/
│   ├── routes/
│   │   ├── +page.svelte        # Dashboard / project list
│   │   ├── +layout.svelte      # Root layout
│   │   └── editor/
│   │       └── [id]/
│   │           └── +page.svelte  # Graph editor view
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn-svelte components
│   │   │   ├── FileLoader.svelte
│   │   │   ├── GraphCanvas.svelte
│   │   │   ├── NodeDetailSlider.svelte
│   │   │   ├── Toolbar.svelte
│   │   │   └── TypeLegend.svelte
│   │   ├── state/
│   │   │   └── app.svelte.ts   # Global state (Svelte 5 runes)
│   │   ├── types/
│   │   │   └── mbse.ts         # TypeScript interfaces
│   │   └── utils/
│   │       ├── uafParser.ts    # Parses UAF.xmi at runtime
│   │       └── graphTransform.ts
│   ├── app.css                 # Tailwind v4 styles
│   └── app.html
├── vite.config.ts
├── svelte.config.js
└── tsconfig.json
```

## Usage

### Loading MBSE Data

1. Click **"New Project"** or the upload icon in the toolbar
2. Drag and drop a `.json` file or click to browse
3. Enter a project name and click **"Load File"**

### Navigating the Graph

- **Pan**: Click and drag on empty space
- **Zoom**: Scroll wheel or pinch gesture
- **Select Node**: Click on a node
- **Select Edge**: Click on a connection line
- **Drag Node**: Click and drag a node to reposition

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close detail panel |
| `Escape` (in search) | Clear search query |

## MBSE File Format

The application accepts `.json` files with the following schema:

```json
{
  "entities": [
    {
      "name": "Air Operations Center",
      "uuid": "ent-001",
      "description": "Primary command and control node...",
      "type": "OperationalPerformer"
    }
  ],
  "relationships": [
    {
      "name": "Commands",
      "uuid": "rel-001",
      "description": "AOC commands the Strike Package...",
      "source": "ent-001",
      "target": "ent-005"
    }
  ]
}
```

### Field Descriptions

| Field | Description |
|-------|-------------|
| `entities[].uuid` | Unique identifier (used as graph node `id`) |
| `entities[].name` | Display name for the node |
| `entities[].description` | Optional description |
| `entities[].type` | UAF stereotype name (e.g., `OperationalPerformer`) |
| `relationships[].source` | UUID of source entity |
| `relationships[].target` | UUID of target entity |

## UAF Color Mapping

Nodes are colored based on their UAF domain:

| Domain | Color |
|--------|-------|
| Operational | `#3B82F6` (blue) |
| Services | `#22C55E` (green) |
| Resources | `#F97316` (orange) |
| Strategic | `#A855F7` (purple) |
| Personnel | `#EAB308` (yellow) |
| Security | `#EF4444` (red) |
| Projects | `#14B8A6` (teal) |
| Architecture Management | `#6366F1` (indigo) |
| Standards | `#6B7280` (gray) |
| Actual Resources | `#F59E0B` (amber) |
| Summary and Overview | `#06B6D4` (cyan) |
| Parameters | `#64748B` (slate) |

Colors are determined by parsing `static/UAF.xmi` at runtime, with fallback defaults for common stereotypes.

## Architecture

### State Management

Global state is managed via a singleton class (`src/lib/state/app.svelte.ts`) using Svelte 5 runes:

- `$state` - Reactive state (e.g., `selectedNode`, `searchQuery`, `graphNodes`)
- `$derived` - Computed values (e.g., `matchingNodeIds`, `activeDomain`)

Import directly in components to avoid prop drilling:

```ts
import { appState } from "$lib/state/app.svelte.js";
```

### Graph Implementation

The force-directed graph uses D3.js:

- `d3.forceSimulation` - Physics-based layout
- `d3.forceManyBody` - Node repulsion
- `d3.forceLink` - Edge constraints
- `d3.forceCenter` - Centering force
- `d3.forceCollide` - Collision detection
- `d3.drag` - Node drag interactions
- `d3.zoom` - Pan and zoom

## Sample Data

A sample MBSE file is provided at `static/sample-mbse.json` for testing.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run check` to verify types
5. Submit a pull request

## License

MIT
