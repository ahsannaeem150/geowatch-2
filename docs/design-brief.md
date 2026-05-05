# GeoWatch Visual Design Brief

## Design Philosophy
GeoWatch is NOT a generic Google Maps clone. It is a **tactical intelligence dashboard** meets **premium newsroom aesthetic**. Think: Bloomberg Terminal + CIA situation room + modern dark-mode SaaS.

## Color Palette
- **Background**: Deep charcoal `#0f1117` (not pure black — softer, premium)
- **Surface**: Dark slate `#1a1d29` (panels, cards, modals)
- **Border**: Subtle grey `#2a2e3b` (dividers, outlines)
- **Text Primary**: Off-white `#e8e9ec` (headlines, labels)
- **Text Secondary**: Muted grey `#8b8f9a` (descriptions, timestamps)
- **Accent**: Electric cyan `#00d4ff` (primary actions, active states, links)
- **Accent Hover**: Bright cyan `#4ce0ff`
- **Danger**: Alert red `#ff4757` (conflicts, high severity, delete actions)
- **Warning**: Amber `#ffa502` (protests, medium severity)
- **Success**: Signal green `#2ed573` (resolved events, positive indicators)
- **Info**: Ice blue `#1e90ff` (diplomacy, neutral events)

## Category Colors (Map Markers)
| Category | Color | Hex |
|----------|-------|-----|
| Conflict | Alert Red | `#ff4757` |
| Protest | Amber | `#ffa502` |
| Disaster | Purple | `#a55eea` |
| Diplomacy | Ice Blue | `#1e90ff` |
| Humanitarian | Teal | `#26de81` |
| Other | Grey | `#778ca3` |

## Typography
- **Headlines**: Inter or Geist (sans-serif), weight 600-700, tight letter-spacing
- **Body**: Inter, weight 400, line-height 1.6
- **Monospace**: JetBrains Mono or SF Mono (for coordinates, timestamps, data)
- **Scale**: 
  - H1: 32px bold
  - H2: 24px semibold
  - H3: 18px medium
  - Body: 14px regular
  - Caption: 12px regular, muted color
  - Data/Coords: 13px monospace

## Map Styling
- **Base map**: Dark vector tiles (not standard OSM bright). Use MapLibre dark style or custom dark style.json
- **Markers**: Custom SVG pulsing dots, NOT default MapLibre circles
  - Idle: solid color circle with subtle glow
  - Hover: scale up 1.3x, brighter glow, show tooltip
  - Selected: ring animation, connect to side panel with thin line
- **Clusters**: Hexagon-shaped cluster counters with gradient fill, not circles
- **Zones/Polygons**: Semi-transparent fills with animated dashed borders (Post-MVP)

## UI Components Style
- **Buttons**: 
  - Primary: Cyan background, dark text, sharp corners (2px radius), no borders
  - Secondary: Transparent with cyan border, cyan text
  - Danger: Red background, white text
  - Hover: Slight lift (translateY -1px), glow effect
- **Inputs**: Dark background `#14161f`, thin border `#2a2e3b`, cyan focus ring, no rounded corners (4px radius max)
- **Cards/Panels**: Dark slate background, 1px border, subtle top-left cyan accent line (2px), soft shadow
- **Modals/Drawers**: Slide in from right, backdrop blur, dark surface
- **Timeline**: Vertical line with cyan nodes, alternating left/right layout, timestamp in monospace

## Animations & Interactions
- **Map fly-to**: Smooth 800ms ease-out camera movement when selecting event
- **Panel open**: Slide from right, 300ms cubic-bezier, content fades in with 100ms stagger
- **Marker appear**: Scale from 0 + fade in, 200ms, slight bounce
- **Data loading**: Skeleton screens (shimmer effect), NOT spinners
- **Hover states**: Instant color shift, 150ms transition
- **Filter changes**: Crossfade between map states, 400ms

## Layout Principles
- **User Website**: 
  - Full-screen map (100vh)
  - Floating top bar: logo left, date picker center, filters right
  - Right-side drawer for event details (400px width, collapsible)
  - Bottom-left: mini legend + scale
  - No sidebars wasting space. Map is king.
- **Admin Dashboard**:
  - Split screen: Map left (60%), form panel right (40%)
  - Form panel: scrollable, sections with accordion behavior
  - Top bar: admin badge, logout, "Add Event" prominent button
  - Event list below map: data table, sortable, searchable

## Unique Elements (Not Generic)
1. **Pulsing marker halo**: Animated CSS/SVG ring around active events
2. **Glassmorphism panels**: Frosted glass effect on floating UI elements (backdrop-filter: blur)
3. **Data ticker**: Optional bottom strip showing "Latest: [Event] in [Location] — [Time]"
4. **Severity glow**: Higher severity = larger glow radius on marker
5. **Category icons**: Small icon inside each marker (crossed swords for conflict, fist for protest, etc.)
6. **Time scrubber**: Horizontal date slider at bottom, like a video timeline, for quick historical navigation

## What to AVOID
- NO default MapLibre blue/white color scheme
- NO Bootstrap-looking buttons or forms
- NO light mode (dark mode only for MVP — it's the brand)
- NO rounded bubbly UI (sharp, tactical, serious)
- NO generic "material design" feel