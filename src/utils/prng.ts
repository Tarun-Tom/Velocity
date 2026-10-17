/**
 * Velocity Deterministic PRNG & Seeding Utilities
 * Implements Mulberry32 for identical field generation across multiplayer peers.
 */

/**
 * Mulberry32 32-bit pseudo-random number generator.
 * Produces uniform distribution in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed * 0xffffffff) || 1;
  return function prng(): number {
    s = (s + 0x6d2d79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffles an array using the provided PRNG.
 * Returns a new shuffled array without mutating the original.
 */
export function seededShuffle<T>(array: T[], prng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
