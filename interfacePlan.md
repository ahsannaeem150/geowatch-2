# GeoWatch Interface Style Implementation Plan

> Document version: 1.0  
> Created: 2026-05-09  
> Scope: Implement three switchable interface styles (Tactical, SaaS, Glass) across superadmin-web, user-web, and admin-web.

---

## 1. Architecture Overview

### 1.1 Two-Dimensional Theme System

GeoWatch uses a **2D theme system** where two settings are completely independent:

| Dimension | Options | Controls |
|-----------|---------|----------|
| **Color Mode** | `light` / `dark` | Background colors, text colors, border colors, badge backgrounds |
| **Interface Style** | `tactical` / `saas` / `glass` | Border radius, shadows, typography case/weight/spacing, background type, grain, glass blur |

The `<html>` element carries **two attributes**:

```html
<html data-theme="dark" data-style="glass">
```

- `data-theme` → handled by existing `ThemeContext` (`@shared/theme-context.jsx`)
- `data-style` → NEW. Must be added to a new or extended context provider.

Both are persisted to `localStorage` and applied on page load.

### 1.2 How It Works

1. **Shared CSS** (`@shared/design-tokens.css`) defines base dark/light tokens.
2. **Per-app CSS** (`src/{app}/src/index.css`) imports the shared tokens and adds app-specific overrides.
3. **Interface style** is applied via **CSS overrides** in each app's `index.css` using `[data-style="saas"]`, `[data-style="glass"]` selectors.
4. **Color mode** is already applied via `[data-theme="light"]` selectors.

### 1.3 Current State

| App | Accent | Current Style | Light Mode |
|-----|--------|---------------|------------|
| `superadmin-web` | Navy Blue (`#2563eb`) | Tactical (military C2) | Implemented |
| `admin-web` | Crimson (`#9f1239`) | Tactical (military C2) | Implemented |
| `user-web` | Crimson (`#9f1239`) | Tactical (military C2) | Implemented |

All three apps currently look Tactical by default. The goal is to let users switch to SaaS or Glass while keeping their color mode preference intact.

---

## 2. The Three Interface Styles

### 2.1 Tactical (Default — Current Look)

**Philosophy:** Military command center. Dense, utilitarian, dramatic.

| Property | Value |
|----------|-------|
| Font | Space Grotesk |
| Labels | UPPERCASE, bold (700), wide tracking (2px) |
| Border Radius | Small: 4–8px, Cards: 14px, Modals: 16px |
| Shadows | Heavy black drops (`0 8px 32px rgba(0,0,0,0.5)`) |
| Background | Radial crimson glow gradient |
| Borders | Subtle dark `#242429` |
| Grain | Yes (film grain overlay) |
| Card Hover | Lift up 2px + shadow deepens |
| Accent | Deep crimson `#5a011c` / `#9f1239` (superadmin: navy) |

### 2.2 SaaS (Clean Modern Dashboard)

**Philosophy:** Linear.app / Vercel-style clean dashboard. Friendly but professional.

| Property | Value |
|----------|-------|
| Font | Inter |
| Labels | Sentence case, semibold (600), subtle tracking (0.3px) |
| Border Radius | Medium: 10px, Cards: 14px, Modals: 18px |
| Shadows | Soft ambient (`0 2px 8px rgba(0,0,0,0.3)`) |
| Background | Radial crimson glow gradient (same as Tactical) |
| Borders | Very subtle `rgba(255,255,255,0.06)` |
| Grain | No |
| Card Hover | Lift up 2px + shadow deepens (same as Tactical) |
| Accent | Deep crimson `#5a011c` / `#9f1239` (superadmin: navy) |
| Spacing | More generous gaps (64px sections vs 52px) |

### 2.3 Glass (Awwards-Style Glassmorphism)

**Philosophy:** Apple Vision Pro / premium glass UI. Frosted glass cards on colorful mesh gradient.

| Property | Value |
|----------|-------|
| Font | Inter |
| Labels | Sentence case, semibold (600), subtle tracking (0.5px) |
| Border Radius | Large: 16px, Cards: 20px, Modals: 24px |
| Shadows | **Glow-based**, no drop shadows. Hover: `0 0 40px rgba(159,18,57,0.2)` |
| Background | **Mesh gradient** — soft crimson & blue blobs on pure black |
| Borders | Glass edge `rgba(255,255,255,0.08)` → brightens to `0.25` on hover |
| Grain | No |
| Card Hover | **No lift**. Border brightens + outer crimson glow |
| Accent | Deep crimson `#5a011c` / `#9f1239` (superadmin: navy) |
| Glass Effect | `backdrop-filter: blur(16px) saturate(1.2)` on cards, inputs, modals, top bar |
| Card Background | `rgba(255,255,255,0.04)` — very subtle white tint |

---

## 3. Token Reference

### 3.1 CSS Custom Properties to Add Per Style

Each app's `index.css` needs `[data-style]` overrides. Below are the values for **crimson-accent apps** (admin-web, user-web). Superadmin-web uses **navy blue** equivalents.

#### Tactical Overrides (Baseline — already exists)

```css
/* Already the default — no overrides needed */
```

#### SaaS Overrides

```css
[data-style="saas"] {
  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --bg-gradient: radial-gradient(ellipse 80% 55% at 50% -5%, #1a0a0e 0%, var(--bg-deep) 55%);
}

[data-style="saas"][data-theme="light"] {
  --bg-gradient: radial-gradient(ellipse 80% 55% at 50% -5%, #f0e8ea 0%, var(--bg-deep) 55%);
}
```

#### Glass Overrides

```css
[data-style="glass"] {
  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --bg-gradient: radial-gradient(ellipse at 15% 25%, rgba(90,1,28,0.3) 0%, transparent 55%),
                 radial-gradient(ellipse at 85% 75%, rgba(159,18,57,0.2) 0%, transparent 50%),
                 radial-gradient(ellipse at 50% 80%, rgba(37,99,235,0.08) 0%, transparent 60%),
                 #050505;
  --bg-surface: rgba(255,255,255,0.04);
  --bg-elevated: rgba(255,255,255,0.07);
  --bg-hover: rgba(255,255,255,0.10);
  --border-subtle: rgba(255,255,255,0.08);
  --border-hover: rgba(255,255,255,0.25);
  --shadow-md: none;
  --shadow-lg: none;
}

[data-style="glass"][data-theme="light"] {
  --bg-gradient: radial-gradient(ellipse at 15% 25%, rgba(90,1,28,0.12) 0%, transparent 55%),
                 radial-gradient(ellipse at 85% 75%, rgba(159,18,57,0.08) 0%, transparent 50%),
                 radial-gradient(ellipse at 50% 80%, rgba(37,99,235,0.04) 0%, transparent 60%),
                 #f8f9fa;
  --bg-surface: rgba(0,0,0,0.03);
  --bg-elevated: rgba(0,0,0,0.05);
  --bg-hover: rgba(0,0,0,0.08);
  --border-subtle: rgba(0,0,0,0.06);
  --border-hover: rgba(0,0,0,0.2);
}
```

### 3.2 Superadmin-Web Navy Blue Variant

Superadmin-web uses **navy blue** (`#2563eb` / `#3b82f6`) instead of crimson. All glass mesh gradients and glows must use navy:

```css
/* Glass style for superadmin — navy variant */
[data-style="glass"] {
  --bg-gradient: radial-gradient(ellipse at 15% 25%, rgba(37,99,235,0.25) 0%, transparent 55%),
                 radial-gradient(ellipse at 85% 75%, rgba(59,130,246,0.18) 0%, transparent 50%),
                 radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.08) 0%, transparent 60%),
                 #050505;
}
```

---

## 4. Component-Level Changes Required

### 4.1 Card / Panel Components

**All apps** have card-like containers. Each must handle:

| Style | Card Behavior |
|-------|---------------|
| Tactical | `background: var(--bg-surface); box-shadow: var(--shadow-lg);` |
| SaaS | Same as Tactical but with larger radius |
| Glass | `background: var(--bg-surface); backdrop-filter: blur(16px) saturate(1.2); border: 1px solid var(--border-subtle);` |

**Implementation:** Use a shared `glass` class or data attribute check. Add `.glass-card` utility class:

```css
.glass-card {
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}

/* Only apply glass effect in Glass style */
[data-style="glass"] .card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  box-shadow: none;
}

[data-style="glass"] .card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 0 40px var(--accent-glow);
}
```

### 4.2 Button Components

| Style | Primary Button |
|-------|----------------|
| Tactical | Sharp/medium radius, heavy shadow on hover |
| SaaS | Medium radius, soft shadow on hover |
| Glass | Large radius, **glow shadow** on hover (`0 0 20px var(--accent-glow-strong)`) |

### 4.3 Input Components

| Style | Input Field |
|-------|-------------|
| Tactical | Dark solid bg, sharp radius |
| SaaS | Dark solid bg, medium radius |
| Glass | **Semi-transparent bg** + `backdrop-filter: blur(12px)`, large radius |

### 4.4 Grain Overlay

Only Tactical shows grain. Remove grain in SaaS and Glass.

**Current:** Admin-web has grain in `index.css` via `body::after`.  
**Fix:** Wrap grain in `[data-style="tactical"]` or remove it and add conditionally via JS.

```css
/* Only show grain in Tactical style */
[data-style="tactical"] body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.022;
  background-image: url("data:image/svg+xml,...");
  background-repeat: repeat;
  background-size: 128px;
}
```

### 4.5 Status Dots / Indicators

All styles keep circular dots. No change needed.

### 4.6 Badges / Pills

All styles keep pill shape (`radius-pill: 999px`). Colors stay the same. No change.

---

## 5. Context / State Management

### 5.1 Extend ThemeContext

The existing `ThemeContext` only handles `light`/`dark`. Extend it to also handle interface style:

```jsx
// @shared/theme-context.jsx — extended version
const THEME_KEY = 'geowatch-theme';
const STYLE_KEY = 'geowatch-style';

export const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  style: 'tactical',
  setStyle: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
  });
  
  const [style, setStyleState] = useState(() => {
    try { return localStorage.getItem(STYLE_KEY) || 'tactical'; } catch { return 'tactical'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-style', style);
    try { localStorage.setItem(STYLE_KEY, style); } catch {}
  }, [style]);

  const setStyle = useCallback((newStyle) => {
    if (['tactical', 'saas', 'glass'].includes(newStyle)) {
      setStyleState(newStyle);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, style, setStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 5.2 Add useStyle Hook (Optional)

```jsx
// @shared/useStyle.js
import { useContext } from 'react';
import { ThemeContext } from './theme-context.jsx';

export function useStyle() {
  const { style, setStyle } = useContext(ThemeContext);
  return { style, setStyle };
}
```

### 5.3 Style Toggle UI

Add a segmented control in each app's settings/profile page:

```
Interface Style: [Tactical] [SaaS] [Glass]
```

Also add a quick-access toggle in the header/top bar (icon button with dropdown).

---

## 6. Per-Website Implementation Roadmap

### 6.1 Phase 1: Shared Infrastructure (Do Once)

1. **Extend `@shared/theme-context.jsx`** — add `style` state + `setStyle` + persistence
2. **Add `@shared/useStyle.js`** — convenience hook
3. **Add Google Font import for Inter** to `design-tokens.css` (already imported for Space Grotesk)
4. **Add `[data-style]` CSS blocks** to each app's `index.css`

### 6.2 Phase 2: superadmin-web (First)

**Why first:** It's the internal operator-facing tool. Fewer users, safer to test. Also uses navy accent instead of crimson, so it tests the color-variant logic.

**Files to modify:**

| File | Changes |
|------|---------|
| `src/superadmin-web/src/index.css` | Add `[data-style="saas"]` and `[data-style="glass"]` overrides. Wrap grain in `[data-style="tactical"]`. Add `.glass-card` utility. |
| `src/superadmin-web/src/components/Layout/TopBar.jsx` | Add style toggle dropdown or settings link. |
| `src/superadmin-web/src/components/Layout/Sidebar.jsx` | Update active item styling for Glass (no shadow, glow instead). |
| `src/superadmin-web/src/components/Layout/Layout.jsx` | Apply `var(--bg-gradient)` to main container background. |
| Card components across pages | Ensure they use CSS vars for radius/shadow/background. |

**Key difference for superadmin:** Navy accent instead of crimson. Glass mesh gradient uses blue/purple blobs.

### 6.3 Phase 3: user-web (Second)

**Why second:** Public-facing site. More visual impact. The hero section and landing pages will look dramatically different in each style.

**Files to modify:**

| File | Changes |
|------|---------|
| `src/user-web/src/index.css` | Add `[data-style]` overrides. Remove hardcoded hero gradients. |
| `src/user-web/src/components/Home/HeroSection.jsx` | Hero background must adapt: Tactical=radial gradient, SaaS=radial gradient, Glass=mesh gradient. |
| `src/user-web/src/components/Home/HeroMap.jsx` | Map style already switches light/dark. No change needed for interface style. |
| `src/user-web/src/pages/HomePage.css` | `[data-style="glass"]` overrides for hero overlay gradients. |
| `src/user-web/src/components/Layout/Navbar.jsx` | Add style toggle. |
| All card components | Add glass support. |

### 6.4 Phase 4: admin-web (Third)

**Why last:** It's the most complex dashboard with the most components (maps, tables, forms, panels, timelines). By this point, the pattern is established.

**Files to modify:**

| File | Changes |
|------|---------|
| `src/admin-web/src/index.css` | Add `[data-style]` overrides. Wrap grain in `[data-style="tactical"]`. |
| `src/admin-web/src/components/Layout/TopBar.jsx` | Add style toggle next to the live/historical mode pill. |
| `src/admin-web/src/components/Layout/DashboardLayout.jsx` | Background gradient from tokens. |
| `src/admin-web/src/components/Map/AdminMap.jsx` | No changes — map is independent of interface style. |
| `src/admin-web/src/components/EventDetail/EventDetailPanel.jsx` | Cards → glass support. |
| `src/admin-web/src/components/EventForm/EventForm.jsx` | Input fields → glass support. |
| `src/admin-web/src/components/EventList/EventTable.jsx` | Table styling → glass support. |
| `src/admin-web/src/components/Login/LoginPage.jsx` | Login card → glass support. |

---

## 7. Critical Implementation Notes

### 7.1 Backdrop-Filter Performance

`backdrop-filter: blur(16px)` is GPU-intensive. Rules:
- Limit to **~10 elements** per viewport (cards, modal, top bar, inputs).
- Do NOT apply to table rows, small badges, or toast notifications.
- Add `will-change: transform` to glass elements for smoother compositing.
- Test on lower-end devices.

### 7.2 Safari Compatibility

Always include `-webkit-backdrop-filter` alongside `backdrop-filter`:

```css
.glass-card {
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
```

### 7.3 Overflow + Backdrop-Filter

`overflow: hidden` on a glass card can clip the blurred edge. If a card looks "cut off" at the corners:
- Either remove `overflow: hidden` (if no child content overflows)
- Or wrap the glass element in a parent with `overflow: hidden` and apply `backdrop-filter` to the child

### 7.4 Superadmin Navy Accent

Superadmin-web uses navy blue as its primary accent. When implementing Glass for superadmin:
- Mesh gradient blobs: blue/purple instead of crimson
- Glow effects: navy glow instead of crimson glow
- All `--accent-*` tokens map to navy values
- The existing `index.css` already defines navy tokens — reuse them

### 7.5 Light Mode + Glass

Glass in light mode is subtle:
- Background blobs are very faint (low opacity)
- Cards use `rgba(0,0,0,0.03)` tint instead of white
- Borders are dark instead of light
- Test this combination thoroughly — it's the most fragile

---

## 8. Testing Checklist (Per Site)

After implementing each site, verify:

- [ ] Tactical style looks **identical** to before (no regressions)
- [ ] SaaS style: Inter font, sentence case labels, no grain, soft shadows
- [ ] Glass style: glass cards, mesh gradient, glowing hover, large radius, no grain
- [ ] Light mode works in all three styles
- [ ] Dark mode works in all three styles
- [ ] Toggle persists across page reloads (localStorage)
- [ ] Toggle syncs across tabs (optional: BroadcastChannel)
- [ ] Map renders correctly in all styles
- [ ] Build passes with zero errors
- [ ] No console warnings

---

## 9. Commit Rules

### 9.1 After Every Task

1. **Update `commit.md`** at the project root with a new section describing what was done.
2. **Provide a one-line summary** to the user in this exact format:

```
feat: implemented {interface-style} look in {site-name} with {key-changes}
```

**Examples:**
- `feat: implemented Tactical, SaaS, and Glass interface styles in superadmin-web with extended ThemeContext, style toggle, and per-style CSS overrides`
- `feat: implemented all three interface styles in user-web with glassmorphism hero, mesh gradient backgrounds, and navbar style switcher`
- `feat: implemented all three interface styles in admin-web with glass dashboard panels, backdrop-filter cards, and top-bar style toggle`

### 9.2 commit.md Format

Append a new section to `commit.md` following the existing pattern:

```markdown
---

## 📅 YYYY-MM-DD — {Brief Title}

### Summary
{2-3 sentence description}

### Changes

| File | Change |
|:--|:--|
| `path/to/file` | Description |

### Git Commit

```
{one-line commit message}
```

*End of session*
```

---

## 10. Resume Prompts (Use After Context Compaction)

### Prompt 1: Implement in superadmin-web

```
Refer to /media/ahsan/Linux_Work/GlassGhost/01-Projects/geowatch/interfacePlan.md and implement the three interface styles (Tactical, SaaS, Glass) in superadmin-web.

Current state: All three websites currently look Tactical by default. The trial page in admin-web already demonstrates the three styles. We need to roll this out to production code.

Order of work:
1. First extend @shared/theme-context.jsx to add style state (tactical/saas/glass) with localStorage persistence and data-style attribute on <html>.
2. Add @shared/useStyle.js hook.
3. Update src/superadmin-web/src/index.css:
   - Add [data-style="saas"] and [data-style="glass"] CSS variable overrides
   - Wrap the existing grain overlay in [data-style="tactical"] so it only shows in Tactical
   - Add .glass-card utility class with backdrop-filter
   - Remember: superadmin uses NAVY BLUE accent (#2563eb), not crimson
4. Update src/superadmin-web/src/components/Layout/TopBar.jsx to add a style toggle (segmented control or dropdown).
5. Update src/superadmin-web/src/components/Layout/Layout.jsx to use var(--bg-gradient) for the main background.
6. Audit all card/panel components across superadmin-web pages to ensure they use CSS vars for radius, shadow, and background.
7. Build and verify.

After completing, update commit.md with the changes and give me a one-line commit summary.
```

### Prompt 2: Implement in user-web

```
Refer to /media/ahsan/Linux_Work/GlassGhost/01-Projects/geowatch/interfacePlan.md and implement the three interface styles (Tactical, SaaS, Glass) in user-web.

Current state: superadmin-web already has the three styles implemented (from previous session). The shared ThemeContext now supports style state. We are now working on user-web.

Order of work:
1. Update src/user-web/src/index.css:
   - Add [data-style="saas"] and [data-style="glass"] CSS variable overrides
   - Add .glass-card utility class with backdrop-filter
   - User-web uses CRIMSON accent (#9f1239)
2. Update the hero section (src/user-web/src/components/Home/HeroSection.jsx and src/user-web/src/pages/HomePage.css):
   - Tactical: existing radial gradient overlay
   - SaaS: same radial gradient but with larger radius, softer typography
   - Glass: mesh gradient background, glass hero card, no heavy overlay gradients
3. Update src/user-web/src/components/Layout/Navbar.jsx to add a style toggle.
4. Audit all page components for card/panel styling consistency.
5. Build and verify.

After completing, update commit.md with the changes and give me a one-line commit summary.
```

### Prompt 3: Implement in admin-web

```
Refer to /media/ahsan/Linux_Work/GlassGhost/01-Projects/geowatch/interfacePlan.md and implement the three interface styles (Tactical, SaaS, Glass) in admin-web.

Current state: superadmin-web and user-web already have the three styles implemented. The shared ThemeContext supports style state. This is the final website.

Order of work:
1. Update src/admin-web/src/index.css:
   - Add [data-style="saas"] and [data-style="glass"] CSS variable overrides
   - Wrap the existing grain overlay in [data-style="tactical"]
   - Add .glass-card utility class with backdrop-filter
   - Admin-web uses CRIMSON accent (#9f1239)
2. Update src/admin-web/src/components/Layout/TopBar.jsx to add a style toggle next to the live/historical mode indicator.
3. Update src/admin-web/src/components/Layout/DashboardLayout.jsx to use var(--bg-gradient) for background.
4. Update card components:
   - EventDetailPanel.jsx — detail cards, timeline cards
   - EventForm.jsx — form inputs (glass inputs in Glass style)
   - EventTable.jsx — table container styling
   - LoginPage.jsx — login card
5. The map (AdminMap.jsx) does NOT need changes — it's independent of interface style.
6. Build and verify all three styles work correctly.

After completing, update commit.md with the changes and give me a one-line commit summary.
```

---

## 11. Quick Reference: Token Values

### Shared Across All Apps (Crimson)

```css
/* Tactical — default, no overrides needed */

/* SaaS */
--font-sans: 'Inter', system-ui, sans-serif;
--radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 18px;

/* Glass */
--font-sans: 'Inter', system-ui, sans-serif;
--radius-sm: 12px; --radius-md: 16px; --radius-lg: 20px; --radius-xl: 24px;
--bg-surface: rgba(255,255,255,0.04);
--bg-elevated: rgba(255,255,255,0.07);
--bg-hover: rgba(255,255,255,0.10);
--border-subtle: rgba(255,255,255,0.08);
--border-hover: rgba(255,255,255,0.25);
```

### Superadmin (Navy Blue)

```css
/* Glass — navy variant */
--bg-gradient: radial-gradient(ellipse at 15% 25%, rgba(37,99,235,0.25) 0%, transparent 55%),
               radial-gradient(ellipse at 85% 75%, rgba(59,130,246,0.18) 0%, transparent 50%),
               radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.08) 0%, transparent 60%),
               #050505;
```

---

*End of Interface Plan*
