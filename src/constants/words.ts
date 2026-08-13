/**
 * Velocity Design Dictionary
 * Curated 150+ words across Design, Architecture, Physics, and Digital Logic.
 */
export const DESIGN_DICTIONARY: string[] = [
  // ── Typography & Design ───────────────────────────────────────────────
  'Minimalism', 'Brutalism', 'Kerning', 'Serif', 'Ligature', 'Ascender',
  'Descender', 'Tracking', 'Leading', 'Bezier', 'Vector', 'Raster',
  'Opacity', 'Gradient', 'Monochrome', 'Vellum', 'Palimpsest', 'Glyph',
  'Hierarchy', 'Alignment', 'Padding', 'Margin', 'Skeuomorphism', 'Neumorphism',
  'Bauhaus', 'Geometric', 'Humanist', 'Didone', 'Slab', 'Calibrate',
  'Contrast', 'Wireframe', 'Prototype', 'Responsive', 'Typography', 'Baseline',
  'Asymmetry', 'Modernism', 'Aesthetic', 'Folio', 'Gutter', 'Bleed',
  'Saturation', 'Grid', 'Layout', 'Flexbox', 'Resolution', 'Navigation',

  // ── Architecture & Space ──────────────────────────────────────────────
  'Nucleus', 'Archive', 'Blueprint', 'Structure', 'Foundation', 'Framework',
  'Monolith', 'Void', 'Zenith', 'Nadir', 'Celestial', 'Orbital',
  'Gravity', 'Stasis', 'Terminal', 'Velocity', 'Axis', 'Dimension',
  'Isometric', 'Perspective', 'Silhouette', 'Aperture', 'Prism', 'Sphere',
  'Vault', 'Portal', 'Tectonics', 'Cantilever', 'Brutalist', 'Facade',
  'Column', 'Atrium', 'Dome', 'Spire', 'Corridor', 'Spatial', 'Matrix',
  'Pavilion', 'Rotunda',

  // ── Physics & Motion ──────────────────────────────────────────────────
  'Kinetic', 'Momentum', 'Inertia', 'Friction', 'Damping', 'Tension',
  'Elastic', 'Fluid', 'Viscosity', 'Torque', 'Acceleration', 'Displacement',
  'Parallax', 'Oscillation', 'Ripple', 'Pulse', 'Frequency', 'Amplitude',
  'Waveform', 'Signal', 'Resonance', 'Harmonic', 'Entropy', 'Equilibrium',
  'Impulse', 'Mass', 'Density', 'Centrifugal', 'Inertial', 'Trajectory',
  'Continuum', 'Spectrum', 'Dynamic', 'Easing', 'Kinematics', 'Quantum',

  // ── Digital & Logic ───────────────────────────────────────────────────
  'React', 'Component', 'Fragment', 'State', 'Effect', 'Hook',
  'Callback', 'Promise', 'Async', 'Mutation', 'Protocol', 'Interface',
  'Syntax', 'Console', 'Buffer', 'Cache', 'Latency', 'Bitrate',
  'Pixel', 'Render', 'Compile', 'Deploy', 'Initialize', 'Execute',
  'Sequence', 'Algorithm', 'Binary', 'Hex', 'Cipher', 'Encryption',
  'Metadata', 'Deployment', 'Keyframes', 'Subgrid', 'Microtask', 'Runtime',
  'Telemetry', 'Node', 'WebGL', 'Stateful', 'Immutable'
];

/**
 * Fisher-Yates (Knuth) Shuffle Algorithm
 * Shuffles an array in place or returns a shuffled copy.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
