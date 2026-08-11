# DESIGN SYSTEM — VELOCITY (RESONANT STARK)

## Design Identity & Color Hierarchy
- **Aesthetic:** Resonant Stark Minimalist. High-density, utilitarian, architectural contrast.
- **Palette:**
  - Pitch Black: `#000000` (Dark background void)
  - Bone White: `#FDFDFB` (Telemetry data, charts, stats, modes, corner brackets, and hairline dividers)
  - Gold Accent: `#C5A059` (Status & Action — Main title, primary CTA, active target node, hero SVG signature)
  - Muted Hairline Borders: `rgba(253, 253, 251, 0.18)` (Dark mode) / `rgba(0, 0, 0, 0.15)` (Light mode)

## Precise Color Roles
- **Gold (`#C5A059`) — Status & Primary Action:**
  1. Main `VELOCITY` title heading
  2. Primary `[ BEGIN_SESSION ]` CTA button
  3. Active word target node (`isFocused`)
  4. Hero 'Mouse Path' SVG signature centerpiece on score screen
- **Bone White (`#FDFDFB`) — Data & Telemetry:**
  1. Mode Selectors (`Chrono`, `Overdrive`, `Zen`)
  2. Telemetry & HUD Stats (`WPM`, `ACC`, `WORDS`, `TIME`, `SCORE`)
  3. Session Archive telemetry data, numbers, charts, and metrics
  4. Architectural viewfinder corner brackets & 1px hairline dividers

## Grid & Typography Tokens
- **Baseline Grid:** Strict 8px architectural baseline (`8px`, `16px`, `24px`, `32px`, `40px`).
- **Spatial Clearing:** 290px magnetic repulsion void with high-order perimeter edge compression.
- **Neural Tether:** 7 captured grid dots snapped inward from the void boundary with 0.5px Gold hairline connections.
- **Borders:** Constant 1px hairline (`border: 1px solid`).
- **Border Radius:** `0px` (Absolute sharp across all modules, buttons, nodes, and boxes).
- **Variable Typography:** Framer Motion `useSpring` and `useTransform` mapping cursor proximity to `font-weight` (100 to 900) over text center.
