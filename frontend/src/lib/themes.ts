// ─── Theme Definitions ────────────────────────────────────────────────────────
//
// Each theme carries two things:
//   1. `canvas`  – raw colour values consumed by GraphCanvas's imperative
//                  canvas-drawing code (force-graph renders outside the DOM).
//   2. `cssVars` – CSS custom-property overrides written onto <html>.
//                  In Tailwind v4 every colour utility already resolves through
//                  a var(), so overriding --color-gray-* etc. is enough to
//                  repaint the entire UI without touching a single class name.

// ─── Canvas sub-theme ─────────────────────────────────────────────────────────

export interface CanvasTheme {
    /** Hex string for the force-graph / canvas background */
    background: string;
    /** RGB triple for node ring / border colour */
    nodeRingRgb: [number, number, number];
    /** RGB triple for the label background box */
    labelBgRgb: [number, number, number];
    /** Opacity multiplier applied to the label bg (0-1) */
    labelBgAlpha: number;
    /** Hex string for label text colour */
    labelTextHex: string;
    /** Alpha for fully-dimmed nodes */
    dimAlpha: number;
    /** RGB triple for un-selected links */
    linkRgb: [number, number, number];
    /** RGB triple for selected links */
    linkSelectedRgb: [number, number, number];
    /** Full CSS colour string for the minimap background */
    minimapBg: string;
    /** Full CSS colour string for the minimap outer border */
    minimapBorder: string;
    /** Full CSS colour string for link strokes inside the minimap */
    minimapLinkStroke: string;
    /** Full CSS colour string for the viewport rectangle fill */
    minimapViewportFill: string;
    /** Full CSS colour string for the viewport rectangle stroke */
    minimapViewportStroke: string;
    /** Full CSS colour string for the "MINIMAP" text label */
    minimapLabel: string;
}

// ─── Full theme ───────────────────────────────────────────────────────────────

export interface Theme {
    id: string;
    name: string;
    /** Three representative hex swatches shown in the selector UI */
    swatches: [string, string, string];
    canvas: CanvasTheme;
    /**
     * CSS custom-property overrides written to <html data-theme="…">.
     * Keys are bare property names (without `--`); values are valid CSS values.
     *
     * Tailwind v4 color utilities use var(--color-*) so overriding those
     * keys here automatically repaints every component that uses those classes.
     */
    cssVars: Record<string, string>;
}

// ─── Palette helpers ──────────────────────────────────────────────────────────

/** Build a full set of gray-scale overrides for the "light" theme by
 *  inverting / shifting the Tailwind v4 default gray scale. */
const lightGrays: Record<string, string> = {
    "color-gray-50":  "oklch(0.21 0.006 264.665)",   // was 950
    "color-gray-100": "oklch(0.278 0.033 256.848)",   // was 900→800ish
    "color-gray-200": "oklch(0.373 0.034 259.733)",   // was 700
    "color-gray-300": "oklch(0.446 0.030 256.802)",   // was 600
    "color-gray-400": "oklch(0.551 0.027 264.364)",   // was 500
    "color-gray-500": "oklch(0.707 0.022 261.325)",   // was 400
    "color-gray-600": "oklch(0.872 0.010 258.338)",   // was 300
    "color-gray-700": "oklch(0.928 0.006 264.531)",   // was 200
    "color-gray-800": "oklch(0.962 0.003 264)",        // was 100-ish
    "color-gray-900": "oklch(0.979 0.002 264)",        // near white
    "color-gray-950": "oklch(0.990 0.001 264)",        // near white (app bg)
    "color-white":    "oklch(0.09 0.02 264)",          // text-white → near black
};

// ─── Theme catalogue ──────────────────────────────────────────────────────────

export const THEMES: Theme[] = [
    // ── 1. Space (default) ──────────────────────────────────────────────────
    {
        id: "space",
        name: "Space",
        swatches: ["#030712", "#111827", "#3b82f6"],
        canvas: {
            background: "#030712",
            nodeRingRgb: [255, 255, 255],
            labelBgRgb: [15, 23, 42],
            labelBgAlpha: 0.70,
            labelTextHex: "#ffffff",
            dimAlpha: 0.12,
            linkRgb: [148, 163, 184],
            linkSelectedRgb: [52, 211, 153],
            minimapBg: "rgba(3,7,18,0.90)",
            minimapBorder: "rgba(55,65,81,0.80)",
            minimapLinkStroke: "rgba(148,163,184,0.07)",
            minimapViewportFill: "rgba(148,163,184,0.07)",
            minimapViewportStroke: "rgba(148,163,184,0.55)",
            minimapLabel: "rgba(100,116,139,0.80)",
        },
        cssVars: {
            // Space is the default — no overrides needed; kept as an explicit
            // reset so switching from another theme always lands cleanly.
            "app-bg": "#030712",
            "app-text": "#f1f5f9",
        },
    },

    // ── 2. Light ────────────────────────────────────────────────────────────
    {
        id: "light",
        name: "Light",
        swatches: ["#f8fafc", "#e2e8f0", "#3b82f6"],
        canvas: {
            background: "#f8fafc",
            nodeRingRgb: [30, 41, 59],
            labelBgRgb: [248, 250, 252],
            labelBgAlpha: 0.88,
            labelTextHex: "#0f172a",
            dimAlpha: 0.14,
            linkRgb: [100, 116, 139],
            linkSelectedRgb: [16, 185, 129],
            minimapBg: "rgba(248,250,252,0.96)",
            minimapBorder: "rgba(148,163,184,0.70)",
            minimapLinkStroke: "rgba(71,85,105,0.12)",
            minimapViewportFill: "rgba(71,85,105,0.07)",
            minimapViewportStroke: "rgba(71,85,105,0.50)",
            minimapLabel: "rgba(71,85,105,0.80)",
        },
        cssVars: {
            "app-bg": "#f8fafc",
            "app-text": "#0f172a",
            ...lightGrays,
            // Keep blue/emerald/etc. accent hues at full saturation so
            // badges and highlights still pop on the light background.
        },
    },

    // ── 3. Midnight ─────────────────────────────────────────────────────────
    {
        id: "midnight",
        name: "Midnight",
        swatches: ["#000000", "#0d0d1f", "#6366f1"],
        canvas: {
            background: "#000000",
            nodeRingRgb: [200, 200, 255],
            labelBgRgb: [0, 0, 16],
            labelBgAlpha: 0.82,
            labelTextHex: "#e0e7ff",
            dimAlpha: 0.08,
            linkRgb: [99, 102, 241],
            linkSelectedRgb: [167, 139, 250],
            minimapBg: "rgba(0,0,16,0.95)",
            minimapBorder: "rgba(99,102,241,0.35)",
            minimapLinkStroke: "rgba(99,102,241,0.10)",
            minimapViewportFill: "rgba(99,102,241,0.06)",
            minimapViewportStroke: "rgba(99,102,241,0.55)",
            minimapLabel: "rgba(99,102,241,0.70)",
        },
        cssVars: {
            "app-bg": "#000000",
            "app-text": "#e0e7ff",
            "color-gray-950": "oklch(0.04 0.02 275)",   // #000008
            "color-gray-900": "oklch(0.10 0.025 275)",   // #0d0d1f
            "color-gray-800": "oklch(0.16 0.028 275)",   // #151530
            "color-gray-700": "oklch(0.22 0.030 275)",   // #1e1e40
            "color-gray-600": "oklch(0.38 0.027 272)",
            "color-gray-500": "oklch(0.52 0.025 270)",
            "color-gray-400": "oklch(0.66 0.020 268)",
            "color-gray-300": "oklch(0.78 0.015 266)",
        },
    },

    // ── 4. Forest ───────────────────────────────────────────────────────────
    {
        id: "forest",
        name: "Forest",
        swatches: ["#050d08", "#0a1a0e", "#22c55e"],
        canvas: {
            background: "#050d08",
            nodeRingRgb: [200, 255, 210],
            labelBgRgb: [5, 13, 8],
            labelBgAlpha: 0.82,
            labelTextHex: "#dcfce7",
            dimAlpha: 0.09,
            linkRgb: [74, 222, 128],
            linkSelectedRgb: [134, 239, 172],
            minimapBg: "rgba(5,13,8,0.93)",
            minimapBorder: "rgba(34,197,94,0.30)",
            minimapLinkStroke: "rgba(74,222,128,0.09)",
            minimapViewportFill: "rgba(74,222,128,0.06)",
            minimapViewportStroke: "rgba(74,222,128,0.55)",
            minimapLabel: "rgba(74,222,128,0.65)",
        },
        cssVars: {
            "app-bg": "#050d08",
            "app-text": "#dcfce7",
            "color-gray-950": "oklch(0.07 0.018 155)",  // #050d08
            "color-gray-900": "oklch(0.13 0.022 152)",  // #0a1a0e
            "color-gray-800": "oklch(0.19 0.026 150)",  // #122018
            "color-gray-700": "oklch(0.26 0.028 148)",
            "color-gray-600": "oklch(0.40 0.024 150)",
            "color-gray-500": "oklch(0.54 0.020 152)",
            "color-gray-400": "oklch(0.68 0.016 154)",
            "color-gray-300": "oklch(0.80 0.012 155)",
        },
    },

    // ── 5. Ember ────────────────────────────────────────────────────────────
    {
        id: "ember",
        name: "Ember",
        swatches: ["#100806", "#1e100a", "#f97316"],
        canvas: {
            background: "#100806",
            nodeRingRgb: [255, 220, 180],
            labelBgRgb: [16, 8, 6],
            labelBgAlpha: 0.82,
            labelTextHex: "#fff7ed",
            dimAlpha: 0.09,
            linkRgb: [249, 115, 22],
            linkSelectedRgb: [251, 146, 60],
            minimapBg: "rgba(16,8,6,0.93)",
            minimapBorder: "rgba(249,115,22,0.30)",
            minimapLinkStroke: "rgba(249,115,22,0.09)",
            minimapViewportFill: "rgba(249,115,22,0.06)",
            minimapViewportStroke: "rgba(249,115,22,0.55)",
            minimapLabel: "rgba(249,115,22,0.65)",
        },
        cssVars: {
            "app-bg": "#100806",
            "app-text": "#fff7ed",
            "color-gray-950": "oklch(0.08 0.018 40)",   // #100806
            "color-gray-900": "oklch(0.14 0.024 38)",   // #1e100a
            "color-gray-800": "oklch(0.20 0.028 36)",
            "color-gray-700": "oklch(0.27 0.030 34)",
            "color-gray-600": "oklch(0.41 0.026 35)",
            "color-gray-500": "oklch(0.55 0.022 36)",
            "color-gray-400": "oklch(0.68 0.018 38)",
            "color-gray-300": "oklch(0.80 0.013 40)",
        },
    },
];

export const DEFAULT_THEME = THEMES[0];
export const THEME_STORAGE_KEY = "mbse-theme";

/** Look up a theme by id, falling back to the default. */
export function findTheme(id: string): Theme {
    return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}
