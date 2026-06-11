# GeoWatch Visual Design Brief

## Design Philosophy
GeoWatch is NOT a generic Google Maps clone. It is a **tactical intelligence dashboard** meets **premium newsroom aesthetic**. Think: Bloomberg Terminal + CIA situation room + modern dark-mode SaaS.

## Brand: Crimson Seal
The finalized design system uses a **deep maroon** accent on near-black backgrounds, creating a serious, authoritative, premium feel.

## Color Palette

### Dark Mode (Default)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#050505` | Deepest background |
| `--bg-base` | `#0a0a0c` | Page background |
| `--bg-surface` | `#121215` | Cards, panels, modals |
| `--bg-elevated` | `#1a1a1f` | Elevated surfaces |
| `--bg-input` | `#161822` | Input fields |
| `--bg-hover` | `#1e1e24` | Hover states |
| `--border-subtle` | `rgba(148,163,184,0.12)` | Dividers, outlines |
| `--text-primary` | `#e8e9ec` | Headlines, labels |
| `--text-secondary` | `#9a9da8` | Descriptions, timestamps |
| `--text-muted` | `#5a5e6b` | Labels, hints |
| `--accent` | `#5a011c` | Primary accent (deep maroon) |
| `--accent-light` | `#9f1239` | Accent hover, highlights |
| `--accent-glow` | `rgba(159,18,57,0.3)` | Glow effects |
| `--danger` | `#dc2626` | Errors, destructive |
| `--warning` | `#f59e0b` | Warnings, amber |
| `--success` | `#22c55e` | Success, resolved |
| `--info` | `#3b82f6` | Info, neutral |

### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#f8f9fa` | Page background |
| `--bg-base` | `#ffffff` | Cards, panels |
| `--bg-surface` | `#f1f5f9` | Elevated surfaces |
| `--text-primary` | `#0f172a` | Headings |
| `--text-secondary` | `#475569` | Body text |
| `--text-muted` | `#64748b` | Labels |
| `--border-subtle` | `#e2e8f0` | Borders |

### Severity Colors (Domain-agnostic)
| Level | Label | Color |
|:-----:|:------|:------|
| 1 | Minimal | `#4ade80` |
| 2 | Low | `#fbbf24` |
| 3 | Moderate | `#fb923c` |
| 4 | Severe | `#f87171` |
| 5 | Critical | `#dc2626` |

## Typography
- **Headlines**: Space Grotesk, weight 600-700, tight letter-spacing
- **Body**: Space Grotesk, weight 400, line-height 1.6
- **Monospace**: JetBrains Mono or SF Mono (coordinates, timestamps, data)
- **Scale**:
  - H1: 32px bold
  - H2: 24px semibold
  - H3: 18px medium
  - Body: 14px regular
  - Caption: 12px regular, muted color
  - Data/Coords: 13px monospace

## Three Interface Styles

All three frontends support three switchable interface styles via `ThemeContext`:

| Style | Font | Background | Radius | Key Traits |
|-------|------|------------|--------|------------|
| **Tactical** (default) | Space Grotesk | Radial crimson gradient, `#050505` | Sharp (2-6px) | Film grain overlay, uppercase labels, heavy shadows |
| **SaaS** | Inter | Subtle radial gradient | Medium (6-10px) | Clean, more spacing, softer shadows |
| **Glass** | Inter | Mesh gradient | Large (14-20px) | Glassmorphism cards (`backdrop-filter: blur`), glow hover, no shadows |

Switch via TopBar/Header dropdown. Persisted in `localStorage` under `geowatch-style`.

## Map Styling
- **Base map**: Dark vector tiles via Martin + custom `map-style-dark.json`
- **Markers**: Custom DOM-based pulsing dots sized by severity, colored by `domain_color`
- **Hover**: Scale 1.5× + glow + MapLibre popup preview card
- **Selected**: Ring animation + amber highlight
- **Clusters**: Not yet implemented (post-MVP)
- **Zones**: Translucent polygon fills with dashed borders, feature-state hover/selected

## UI Components Style
- **Buttons**:
  - Primary: Maroon background, white text, sharp corners
  - Secondary: Transparent with maroon border
  - Danger: Dark red background
  - Ghost: Transparent, hover background
  - Hover: Slight lift, glow effect
- **Inputs**: Dark background, thin border, maroon focus ring
- **Cards/Panels**: Dark surface, 1px border, subtle top-left accent line, soft shadow
- **Modals/Drawers**: Slide in from right, backdrop blur, dark surface
- **Timeline**: Vertical line with colored nodes, alternating layout

## Animations & Interactions
- **Map fly-to**: Smooth 800ms ease-out camera movement
- **Panel open**: Slide from right, 300ms cubic-bezier
- **Marker appear**: Scale from 0 + fade in, 200ms
- **Data loading**: Skeleton screens (shimmer effect), NOT spinners
- **Hover states**: Instant color shift, 150ms transition
- **Filter changes**: Crossfade between map states, 400ms

## Verification Visual Language
| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| `unverified` | `?` | `#9ca3af` gray | Not yet reviewed |
| `verified` | `✓` | `#22c55e` green | At least 1 verified source |
| `confirmed` | `✓✓` | `#15803d` dark green | 2+ independent verified sources |
| `contested` | `!` | `#ef4444` red | Has disputed or debunked sources |

## What to AVOID
- NO default MapLibre blue/white color scheme
- NO Bootstrap-looking buttons or forms
- NO generic "material design" feel
- NO light mode as default (dark is the brand)
