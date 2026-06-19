# Design System Master File (LocalChat)

This is the global source of truth for the design system. All component overrides and custom stylesheets must adhere to these tokens, principles, and accessibility guidelines.

---

## 1. Design Persona: "Luxury Analytical" (Liquid Glass)
- **Style Concept:** Flowing glass panels, translucent overlays, deep slate spaces, metallic copper actions, high depth tactile shadows, and smooth curves.
- **Typography:** Inter (System sans-serif) + JetBrains Mono (for code blocks).

---

## 2. Color System: "Electric Slate" Base & "Copper" Accent

We utilize a custom palette inspired by deep electric-slate tones and rich metallic copper details.

### 🔴 Dark Theme (Deep Space Electric Slate)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#090A0F` | Deepest electric slate black |
| `--bg-secondary` | `#12141F` | Sidebar, input panels, and modals |
| `--bg-tertiary` | `#1B1E2E` | Card backdrops, hover states |
| `--text-primary` | `#F1F3F9` | High-contrast slate white |
| `--text-secondary` | `#94A3B8` | Cool slate gray |
| `--text-tertiary` | `#4A5568` | Muted support text |
| `--accent-primary` | `#D97706` | Metallic Copper Accent (Dark) |
| `--accent-primary-hover` | `#F59E0B` | Bright Copper Hover |
| `--accent-glow` | `rgba(217, 119, 6, 0.18)` | Soft copper ambient shadows |
| `--glass-panel` | `rgba(18, 20, 31, 0.7)` | Floating glass backdrop panel |
| `--border-subtle` | `rgba(255, 255, 255, 0.04)` | Ultra-fine glass border |
| `--border-default` | `rgba(255, 255, 255, 0.08)` | Standard glass border |
| `--border-strong` | `rgba(255, 255, 255, 0.14)` | Strong division boundaries |

### 🟡 Light Theme (Warm Alabaster & Ochre Copper)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#FAF9F6` | Alabaster warm paper background |
| `--bg-secondary` | `#F3EFE7` | Sidebar & input panel background |
| `--bg-tertiary` | `#EAE4D5` | Card backdrops, hover states |
| `--text-primary` | `#1D1C1A` | Deep charcoal primary text |
| `--text-secondary` | `#6C6A65` | Muted brown-gray support text |
| `--accent-primary` | `#B45309` | Deep copper-ochre accent |
| `--accent-glow` | `rgba(180, 83, 9, 0.12)` | Soft ochre drop shadows |
| `--glass-panel` | `rgba(243, 239, 231, 0.78)` | Translucent overlays |
| `--border-subtle` | `rgba(0, 0, 0, 0.05)` | Faint glass borders |
| `--border-default` | `rgba(0, 0, 0, 0.1)` | Standard glass borders |
| `--border-strong` | `rgba(0, 0, 0, 0.16)` | Strong division boundaries |

---

## 3. Tactile Material Depth System
To move away from flat UI patterns, all floating elements (modals, context menus, and the input container) must use a high-depth shadow pair:

- **Soft Depth Shadow (Primary):** Large, low-opacity drop shadow providing global elevation.
  - Dark: `0 12px 36px rgba(0, 0, 0, 0.4)`
  - Light: `0 12px 36px rgba(29, 28, 26, 0.08)`
- **Micro-Shadow (Secondary):** A tight, high-opacity border definition shadow.
  - Dark: `0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 4px rgba(0, 0, 0, 0.2)`
  - Light: `0 0 0 1px rgba(0, 0, 0, 0.03), 0 2px 4px rgba(29, 28, 26, 0.03)`

---

## 4. Layout Specifications
- **Bespoke Asymmetric Hero:** The welcome/setup screens should not use centered grids. The layout should split dynamically into an informational column (left) and a quick action panel (right).
- **Floating Input Pill:** The message input area floats in the main chat space, separated from the edges, styled as a capsule rather than a static text block.
