# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Developers, designers, and keyboard typing enthusiasts who want to train spatial motor memory and keyboard speed. They seek a flow-inducing training environment.

## Product Purpose
Velocity is a typing game that blends spatial mouse positioning (target acquisition) with tactile touch typing (keystroke input) to establish a fluid motor-memory training flow state.

## Positioning
Trains muscle memory by combining spatial coordinate navigation (mouse hovering) with immediate touch typing feedback in a high-fidelity visual and audio interface.

## Operating Context
Web browsers on desktop computers with high-precision mouse tracking and physical keyboards.

## Capabilities and Constraints
- Proximity-based target locking (focus radius: 150px)
- Kinetic audio feedback (woody click for keystrokes, deep low-pass thud for completed words)
- Multi-layered parallax drift (Layer 0 Static, Layer 1 Forewords, Layer 2 Grid, Layer 3 Ghost HUD)
- Multiple gameplay modes: Chrono (60s limit), Overdrive (time bonuses), Terminal (dynamic word scaling)
- Score calculations incorporating WPM, Synergy transit time bonuses, and accuracy penalties
- React + TypeScript frontend built with Vite and Framer Motion.

## Brand Commitments
Name: Velocity. Tone is minimalist, responsive, industrial-brutalist, and high-fidelity. Uses gold (#D4AF37) accent highlights on dark/light backdrops.

## Evidence on Hand
Incumbent implementation in `src/` directory containing operational typing interactive layouts, audio oscillators, and custom coordinate quadrant calculations.

## Product Principles
- **Flow Preservation**: The user should never feel standard typing latency; micro-animations and sound guide continuous input.
- **Physical Integration**: Interlace hand-eye coordination (mouse) with tactile finger typing seamlessly.
- **Responsive Feedback**: Instantly reflect mistakes as visual heavy friction and correctness as spring dynamics.
