// ─── Global Application State ─────────────────────────────────────────────────
//
// A single Svelte 5 reactive class that holds every piece of shared state.
// Components import the singleton `app` and read/write it directly —
// no prop-drilling, no context providers, no stores.
//
// Because this is a .svelte.ts file, Svelte 5 runes ($state, $derived) are
// compiled here just as they would be inside a .svelte component file.

import { loadUAFDefinitions, getDomainLegend } from "$lib/utils/uafParser";
import { transformMBSEToGraph, parseMBSEFile } from "$lib/utils/graphTransform";
import { findTheme, DEFAULT_THEME, THEME_STORAGE_KEY } from "$lib/themes";
import type {
  GraphData,
  MBSEFile,
  SelectedItem,
  UAFDefinitions,
} from "$lib/types/mbse";
import type { Theme } from "$lib/themes";

export type GraphLayout =
  | "force"
  | "hierarchical-td"
  | "hierarchical-lr"
  | "radial";

class AppState {
  // ── Theme ────────────────────────────────────────────────────────────────────
  theme = $state<Theme>(DEFAULT_THEME);

  // ── UAF definitions ──────────────────────────────────────────────────────────
  uafStatus = $state<"loading" | "ready" | "error">("loading");
  uafDefinitions = $state<UAFDefinitions>(new Map());
  uafError = $state("");

  // ── Loaded MBSE model ────────────────────────────────────────────────────────
  graphData = $state<GraphData | null>(null);
  fileName = $state("");

  // ── Interaction ──────────────────────────────────────────────────────────────
  selectedItem = $state<SelectedItem>(null);
  searchQuery = $state("");
  domainFilter = $state(new Set<string>());
  graphLayout = $state<GraphLayout>("force");

  // ── Derived (auto-tracks, no dependency array needed) ────────────────────────
  activeDomain = $derived(
    this.selectedItem?.kind === "node"
      ? (this.uafDefinitions.get(this.selectedItem.data.type)?.domain ?? "")
      : "",
  );

  domainLegend = $derived(getDomainLegend(this.uafDefinitions));

  matchingNodeIds = $derived.by((): Set<string> => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return new Set();
    return new Set(
      (this.graphData?.nodes ?? [])
        .filter((n) => n.name.toLowerCase().includes(q))
        .map((n) => n.id),
    );
  });

  matchingNodes = $derived.by(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return [];
    return (this.graphData?.nodes ?? []).filter((n) =>
      n.name.toLowerCase().includes(q),
    );
  });

  matchCount = $derived(this.matchingNodes.length);

  // ── Domain filter ─────────────────────────────────────────────────────────────
  // Filter keys are either "Domain" (all sub-packages) or "Domain::Package".
  filteredNodeIds = $derived.by((): Set<string> => {
    if (this.domainFilter.size === 0) return new Set();
    return new Set(
      (this.graphData?.nodes ?? [])
        .filter((n) => {
          const def = this.uafDefinitions.get(n.type);
          if (!def) return false;
          return (
            this.domainFilter.has(def.domain) ||
            this.domainFilter.has(`${def.domain}::${def.packageName}`)
          );
        })
        .map((n) => n.id),
    );
  });

  isFiltered = $derived(this.domainFilter.size > 0);

  // ── Actions ──────────────────────────────────────────────────────────────────

  // ── Theme actions ─────────────────────────────────────────────────────────────

  setTheme(id: string) {
    const t = findTheme(id);
    this.theme = t;
    localStorage.setItem(THEME_STORAGE_KEY, id);
    this.applyThemeToDom(t);
  }

  applyThemeToDom(t: Theme = this.theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", t.id);
    // Write every CSS-variable override directly onto :root so Tailwind
    // utilities that resolve through var(--color-*) pick them up immediately.
    for (const [key, value] of Object.entries(t.cssVars)) {
      root.style.setProperty(`--${key}`, value);
    }
    // Clear any keys that were set by a previous theme but are absent here,
    // so we always land in a clean state when switching themes.
    const allKeys = new Set([
      "app-bg",
      "app-text",
      "color-white",
      ...Array.from(
        { length: 10 },
        (_, i) =>
          `color-gray-${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950][i]}`,
      ),
    ]);
    for (const key of allKeys) {
      if (!(key in t.cssVars)) {
        root.style.removeProperty(`--${key}`);
      }
    }
  }

  initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const t = saved ? findTheme(saved) : DEFAULT_THEME;
    this.theme = t;
    this.applyThemeToDom(t);
  }

  async loadUAF(path = "/UAF.xmi") {
    this.uafStatus = "loading";
    try {
      this.uafDefinitions = await loadUAFDefinitions(path);
      this.uafStatus = "ready";
    } catch (e) {
      this.uafError = e instanceof Error ? e.message : String(e);
      this.uafStatus = "error";
    }
  }

  toggleDomainFilter(key: string) {
    const next = new Set(this.domainFilter);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.domainFilter = next;
  }

  clearDomainFilter() {
    this.domainFilter = new Set();
  }

  selectFirstMatch() {
    const first = this.matchingNodes[0];
    if (first) {
      this.selectedItem = { kind: "node", data: first };
    }
  }

  loadFile(raw: unknown, name: string) {
    const parsed = parseMBSEFile(raw);
    this.graphData = transformMBSEToGraph(parsed);
    this.fileName = name;
    this.selectedItem = null;
    this.searchQuery = "";
    this.domainFilter = new Set();
  }

  reset() {
    this.graphData = null;
    this.fileName = "";
    this.selectedItem = null;
    this.searchQuery = "";
    this.domainFilter = new Set();
  }
}

// Singleton — import { app } from '$lib/state/app.svelte';
export const app = new AppState();
