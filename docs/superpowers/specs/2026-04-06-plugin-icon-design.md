# Plugin Icon Design

**Date:** 2026-04-06
**Plugin:** logseq-remember-my-block
**Output file:** `icon.svg` (project root, referenced in `package.json` → `logseq.icon`)

---

## Summary

A single SVG icon for the Logseq plugin marketplace and plugin panel. The base is a Logseq-style graph node icon; the badge in the bottom-right corner signals the plugin's "remember" capability.

---

## Visual Design

### Base icon

- **Shape:** 80×80 rounded square (`rx="18"`), dark navy background `#1a1a2e`
- **Content:** Three hollow circles (graph nodes) in blue `#6e8efb`, connected by lines in a triangle formation
  - Top-left node: center `(26, 26)`, radius 7
  - Top-right node: center `(54, 26)`, radius 7
  - Bottom node: center `(40, 52)`, radius 7
  - Connecting lines: top-left ↔ top-right, top-left ↔ bottom, top-right ↔ bottom
- **Stroke width:** 3 for nodes, 2 for lines

### Badge

- **Position:** Bottom-right corner, centered at `(63, 63)`
- **Shape:** Circle, radius 11, amber fill `#d97706`
- **Separator ring:** Dark `#1a1a2e` ring at radius 13 (creates a 2px gap between badge and base icon)
- **Icon inside badge:** Classic brain outline — two-hemisphere silhouette with a vertical center divider line
  - Outer path: `M57.5 63 Q57 58.5 60.5 58 Q61.5 55.5 63.5 56 Q65.5 55.5 66.5 58 Q70 58.5 69.5 63 Q70 66.5 66.5 67.5 Q64 69.5 63 67.5 Q59.5 69.5 57.5 66.5 Q56.5 65 57.5 63Z`
  - Center divider: vertical line at x=63, from y=56 to y=67.5, 30% opacity
  - Stroke: white, 1.6px (outline), 1.2px (divider)

---

## Sizes

The SVG uses a `viewBox="0 0 80 80"` and scales cleanly. Logseq renders it at:

| Context | Size |
|---|---|
| Plugin panel sidebar | ~20–24px |
| Plugin settings list | ~32px |
| Marketplace tile | ~64px |
| Marketplace detail | ~128px |

No separate raster assets needed — SVG handles all sizes.

---

## Deliverable

One file: `icon.svg` at the project root. No build step required — Logseq reads it directly via the `logseq.icon` field in `package.json`.
