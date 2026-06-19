# Design System Master File (Aether)

This is the global source of truth for the Aether design system. All component overrides and custom stylesheets must adhere to these tokens, principles, and accessibility guidelines.

---

## 1. Brand Identity & Persona: "Aether" (Nebula Velvet & Cyber Coral)
- **Vibe:** Sci-Fi spatial computing dashboard, ultra-luxury high-contrast dark space, neon refraction effects, and custom geometric glass nodes.
- **Brand name:** **Aether** (Local Intelligence Workspace)
- **Typography:**
  - **Headings:** Space Grotesk (futuristic, geometric, crisp tech)
  - **Body:** Plus Jakarta Sans (elegant, modern, high legibility)
  - **Code:** JetBrains Mono (high readability monospace)

---

## 2. Color System: "Nebula Velvet" Base & "Cyber Coral" Accent

Our colors are designed to stand completely apart from standard AI platforms (ChatGPT's slate and Claude's paper cream) by using velvet obsidian bases and radiant iridescent cyber-coral highlights.

### 🔴 Dark Theme (Nebula Velvet Space)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#05050A` | Pure obsidian-indigo void |
| `--bg-secondary` | `#0B0C15` | Sidebar, input panels, and modals |
| `--bg-tertiary` | `#131525` | Hover states, button backdrops, active tabs |
| `--text-primary` | `#F0F1FA` | High-luminance lavender white |
| `--text-secondary` | `#8F93B8` | Muted cool-indigo text |
| `--text-tertiary` | `#585C7D` | Secondary support text |
| `--accent-primary` | `#FF007F` | Cyber Orchid-Pink primary accent |
| `--accent-primary-hover` | `#FF6B6B` | Cyber Coral secondary accent |
| `--accent-gradient` | `linear-gradient(135deg, #FF007F 0%, #FF6B6B 50%, #FF8E53 100%)` | Radiant Cyber Coral glow gradient |
| `--accent-glow` | `rgba(255, 0, 127, 0.16)` | Neon coral ambient backlighting |
| `--glass-panel` | `rgba(11, 12, 21, 0.72)` | Translucent glass overlays |
| `--border-subtle` | `rgba(255, 0, 127, 0.05)` | Faint coral-tinted glass border |
| `--border-default` | `rgba(255, 255, 255, 0.08)` | Standard glass border |
| `--border-strong` | `rgba(255, 255, 255, 0.15)` | High contrast lines |

### 🟡 Light Theme (Aurora Quartz)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#F7F8FC` | Crisp ice-white background |
| `--bg-secondary` | `#EDEDF5` | Sidebar and panel backgrounds |
| `--bg-tertiary` | `#DFDFEC` | Hover states and button backdrops |
| `--text-primary` | `#0B0C15` | Deep navy charcoal text |
| `--text-secondary` | `#636780` | Muted slate-blue text |
| `--accent-primary` | `#FF007F` | Cyber Orchid-Pink primary accent |
| `--accent-glow` | `rgba(255, 0, 127, 0.08)` | Ambient shadow overlay |
| `--glass-panel` | `rgba(237, 237, 245, 0.8)` | Translucent overlays |
| `--border-subtle` | `rgba(255, 0, 127, 0.08)` | Faint pink border |
| `--border-default` | `rgba(0, 0, 0, 0.08)` | Standard boundaries |
| `--border-strong` | `rgba(0, 0, 0, 0.14)` | High contrast divisions |

---

## 3. High-Elevation Tactile Shadow System

- **Nebula Glow Shadow (Primary):** Neon-fused drop shadow.
  - Dark: `0 16px 40px rgba(0, 0, 0, 0.5), 0 4px 16px var(--accent-glow)`
  - Light: `0 16px 40px rgba(99, 103, 128, 0.1), 0 4px 16px var(--accent-glow)`
- **Micro-Shadow (Secondary):** Clean border defining wrap.
  - Dark: `0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 4px rgba(0, 0, 0, 0.3)`
  - Light: `0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(99, 103, 128, 0.03)`

---

## 4. Key Layout Spec updates
- **Asymmetric Nebula Welcome Column:** The left column hosts the rotating geometric Double-Ring prism glyph with large brand letters. The right column lists prompt paths vertically.
- **Glassmorphic Floating Pill Input:** Staged with an outline focus gradient that shimmers under active states.
