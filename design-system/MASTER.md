# Design System Master File (LocalChat)

This is the global source of truth for the design system. All component overrides and custom stylesheets must adhere to these tokens, principles, and accessibility guidelines.

---

## 1. Design Persona & Theme: "Liquid Glass"
- **Style Concept:** Flowing glass, morphing, translucent panels, fluid micro-interactions, subtle iridescent glows, and gold accents.
- **Vibe:** High-end, premium, offline-first developer tool. Refuses typical slate-gray AI chatbot aesthetics.
- **Typography:** Inter (System-optimized sans-serif) + JetBrains Mono (for code blocks).

---

## 2. Color System

We use a dual-theme system based on **Warm Alabaster** (Light Mode, paper-like luxury) and **Deep Space Navy & Gold** (Dark Mode, high contrast space tech).

### 🔴 Dark Theme (Deep Space Navy & Gold)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#0A0B10` | Deepest space background |
| `--bg-secondary` | `#11131C` | Sidebar & input panel background |
| `--bg-tertiary` | `#181B28` | Hover states, button backdrops |
| `--text-primary` | `#FAF9F6` | Off-white warm text |
| `--text-secondary` | `#A0A5C0` | Cool gray-blue support text |
| `--accent-primary` | `#D97706` | Rich metallic gold / amber accent |
| `--accent-glow` | `rgba(217, 119, 6, 0.15)` | Glowing border shadows |
| `--glass-panel` | `rgba(17, 19, 28, 0.65)` | Translucent overlays |
| `--border-subtle` | `rgba(255, 255, 255, 0.05)` | Faint glass borders |
| `--border-strong` | `rgba(255, 255, 255, 0.15)` | Visible boundaries |

### 🟡 Light Theme (Warm Alabaster & Ochre)
| Token Name | Color Value | Role |
|------------|-------------|------|
| `--bg-primary` | `#FAF9F6` | Alabaster warm paper background |
| `--bg-secondary` | `#F3EFE7` | Sidebar & input panel background |
| `--bg-tertiary` | `#EAE4D5` | Hover states, button backdrops |
| `--text-primary` | `#1D1C1A` | Deep charcoal-brown primary text |
| `--text-secondary` | `#6C6A65` | Muted brown-gray support text |
| `--accent-primary` | `#B45309` | Deep golden ochre accent |
| `--accent-glow` | `rgba(180, 83, 9, 0.1)` | Soft ochre drop shadows |
| `--glass-panel` | `rgba(243, 239, 231, 0.75)` | Translucent overlays |
| `--border-subtle` | `rgba(0, 0, 0, 0.06)` | Faint glass borders |
| `--border-strong` | `rgba(0, 0, 0, 0.12)` | Visible boundaries |

---

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```
- Heading: `font-family: 'Inter', sans-serif; font-weight: 700;`
- Body Text: `font-family: 'Inter', sans-serif; font-weight: 400;`
- Code / Data: `font-family: 'JetBrains Mono', monospace;`

---

## 4. Spacing System

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps (badges, inner metadata) |
| `--space-sm` | `8px` / `0.5rem` | Standard gaps (icons, text labels) |
| `--space-md` | `16px` / `1rem` | Content padding (lists, sidebars) |
| `--space-lg` | `24px` / `1.5rem` | Standard section padding (messages) |
| `--space-xl` | `32px` / `2rem` | Page margins |

---

## 5. Pre-Delivery & Accessibility Checklist
- [x] **No emojis as icons** (strictly SVG icons from Lucide/Heroicons).
- [x] **Stable hover states** (use color transitions instead of transforms that cause layout shifts).
- [x] **Cursor interaction** (`cursor-pointer` explicitly added to all buttons and interactive cards).
- [x] **Text contrast** (light mode body text has a contrast ratio of > 4.5:1 against alabaster backgrounds).
- [x] **No content clipping** (ensure inputs are scrollable, and sidebars collapse cleanly).
- [x] **Responsive breakpoints** (verify layout rendering at 375px, 768px, 1024px, and 1440px).
