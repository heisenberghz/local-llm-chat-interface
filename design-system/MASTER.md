# Design System Master File (Aether)

This is the global source of truth for the Aether design system. All component overrides and custom stylesheets must adhere to these tokens, principles, and accessibility guidelines.

---

## 1. Brand Identity: "Architectural Precision"
- **Style Concept:** Heavyweight desktop workspace, sharp 90-degree lines, minimal 2px corner radii, structural grids, double-border divisions, and high-contrast drafting board layouts.
- **Brand name:** **Aether** (Local Intelligence Workspace)
- **Typography:**
  - **Headings & Logo:** Cormorant Garamond (Sophisticated, elegant editorial serif)
  - **UI Controls & Labels:** Inter (Neutral, precise, readable sans-serif)
  - **Chat Streams & Code:** JetBrains Mono (High readability monospace)

---

## 2. Color System: "Obsidian & Oxidized Metal"

Designed to replicate the matte textures of graphite, oxidized copper, and industrial metals.

### 🔴 Dark Theme (Obsidian & Copper-Zinc)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#0E0F11` | Obsidian matte charcoal background |
| `--bg-secondary` | `#15171B` | Sidebar, input panels, and modals (Zinc graphite) |
| `--bg-tertiary` | `#1C1F24` | Hover states, button backdrops, active tabs |
| `--text-primary` | `#ECEFF4` | Brushed silver / platinum text |
| `--text-secondary` | `#8C95A5` | Muted Industrial Zinc gray |
| `--text-tertiary` | `#4E5563` | Dark iron gray |
| `--accent-primary` | `#3FA396` | Muted, desaturated Oxidized Copper (Teal-green) |
| `--accent-primary-hover` | `#4FB5A8` | Bright Oxidized Copper |
| `--accent-glow` | `rgba(63, 163, 150, 0.1)` | Soft copper ambient outlines |
| `--glass-panel` | `rgba(21, 23, 27, 0.95)` | Command Center opaque backdrop |
| `--border-subtle` | `#1F2228` | Fine structural grid line |
| `--border-default` | `#2D323C` | Standard division boundary |
| `--border-strong` | `#3F4654` | Accent borders (e.g., active elements) |

### 🟡 Light Theme (Brushed Limestone & Iron)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#EBEAE5` | Matte limestone/paper background |
| `--bg-secondary` | `#DFDED7` | Sidebar & input panel background |
| `--bg-tertiary` | `#D2D1CA` | Hover states and button backdrops |
| `--text-primary` | `#161719` | Dark charcoal / carbon text |
| `--text-secondary` | `#585C66` | Iron-gray secondary text |
| `--accent-primary` | `#1D6B60` | Deep oxidized copper green |
| `--accent-glow` | `rgba(29, 107, 96, 0.08)` | Soft outline highlight |
| `--glass-panel` | `rgba(223, 222, 215, 0.96)` | Full width background panel |
| `--border-subtle` | `#D2D1CA` | Fine division |
| `--border-default` | `#C6C5BD` | Standard border line |
| `--border-strong` | `#94938C` | Strong frame boundary |

---

## 3. Structural Spec Update
- **Full-Width "Command Center" Input:** The input container spans 100% of the main workspace panel, defined by sharp horizontal boundaries rather than floating round pills.
- **Architectural Grid Blueprint:** Uses sharp corners (`border-radius: 2px` max) and double-borders (`border: 1px solid var(--border-default)`) on buttons and container boundaries.
- **Asymmetric Sidebar Welcome:** Left panel contains the abstract draft grid icon, and the right panel lists prompts in a structured drafting list.
