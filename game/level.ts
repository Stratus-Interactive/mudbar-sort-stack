/**
 * Sort Stack — core game logic.
 *
 * Tube model: each tube holds up to CAPACITY balls. A tube is an array of
 * color indices, bottom → top. A move picks a source tube and a destination
 * tube; all contiguous same-color balls on top of the source pour into the
 * destination (if it has room and its top matches or it's empty).
 *
 * Generation is GUARANTEED solvable via reverse-generation: start from a
 * solved state, apply random valid forward moves to scramble. The scramble
 * sequence reversed is a valid solution, so a solution always exists.
 * A bounded solver sanity-checks every generated level before shipping it.
 */

export const TUBE_CAPACITY = 4;
export const NARROW_CAPACITY = 2;

export type Tube = number[]; // color indices, bottom → top

export interface LevelData {
  level: number;
  tubes: Tube[];
  /** Per-tube capacity (narrow tubes hold 2). */
  capacities: number[];
  /** Indices of tubes locked until `unlockAfterMoves` successful pours. */
  lockedTubes: number[];
  unlockAfterMoves: number;
  /** Par move count for 3 stars (the scramble length). */
  par: number;
  /** Colors used this level (indices into the palette). */
  colors: number[];
  seed: number;
}

/* ── Seeded RNG (mulberry32) ─────────────────────────────────────── */

export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ── Move logic ──────────────────────────────────────────────────── */

export interface Move {
  from: number;
  to: number;
  /** Number of balls poured. */
  count: number;
}

/** Balls that would pour from tube t (contiguous top color), or 0. */
export function pourCount(tube: Tube): number {
  if (tube.length === 0) return 0;
  const top = tube[tube.length - 1];
  let n = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === top; i--) n++;
  return n;
}

/** Is moving from→to legal? Locked tubes and capacities respected. */
export function canPour(
  tubes: Tube[],
  capacities: number[],
  locked: Set<number>,
  from: number,
  to: number,
): boolean {
  if (from === to) return false;
  if (locked.has(from) || locked.has(to)) return false;
  const src = tubes[from];
  const dst = tubes[to];
  if (src.length === 0) return false;
  if (dst.length >= capacities[to]) return false;
  const color = src[src.length - 1];
  if (dst.length > 0 && dst[dst.length - 1] !== color) return false;
  return true;
}

/**
 * Apply a pour. Returns the balls moved (colors) or null if illegal.
 * Mutates a copy — the input tubes are not modified.
 */
export function applyPour(
  tubes: Tube[],
  capacities: number[],
  locked: Set<number>,
  from: number,
  to: number,
): { tubes: Tube[]; move: Move } | null {
  if (!canPour(tubes, capacities, locked, from, to)) return null;
  const next = tubes.map((t) => [...t]);
  const color = next[from][next[from].length - 1];
  const room = capacities[to] - next[to].length;
  let count = 0;
  while (
    count < room &&
    next[from].length > 0 &&
    next[from][next[from].length - 1] === color
  ) {
    next[to].push(next[from].pop() as number);
    count++;
  }
  return { tubes: next, move: { from, to, count } };
}

/** Level is complete when every tube is empty or full of one color. */
export function isComplete(tubes: Tube[], capacities: number[]): boolean {
  return tubes.every((t, i) => {
    if (t.length === 0) return true;
    if (t.length !== capacities[i]) return false;
    return t.every((c) => c === t[0]);
  });
}

/** True if any legal pour exists. Used for deadlock detection. */
export function hasValidMove(
  tubes: Tube[],
  capacities: number[],
  locked: Set<number>,
): boolean {
  for (let from = 0; from < tubes.length; from++) {
    if (locked.has(from) || tubes[from].length === 0) continue;
    for (let to = 0; to < tubes.length; to++) {
      if (canPour(tubes, capacities, locked, from, to)) return true;
    }
  }
  return false;
}

/* ── Bounded solver (sanity check for generated levels) ──────────── */

function stateKey(tubes: Tube[]): string {
  return tubes.map((t) => t.join(',')).join('|');
}

/* ── Solver with heuristic move ordering ──────────────────────────── */

function isUniform(tube: Tube): boolean {
  return tube.length > 0 && tube.every((c) => c === tube[0]);
}

/**
 * Heuristic DFS solver. Returns a solution depth, or null if none found
 * within maxDepth. Move ordering + pruning make this fast enough for
 * generation-time verification.
 *
 * Pruning (sound — never removes a needed move):
 * - Never pour FROM a completed (full, uniform) tube.
 * - Never pour a uniform tube into an empty tube (pure relocation).
 */
export function solveDepth(
  tubes: Tube[],
  capacities: number[],
  maxDepth: number,
): number | null {
  const seen = new Set<string>();

  function orderedMoves(cur: Tube[]): Array<[number, number]> {
    const scored: Array<{ from: number; to: number; score: number }> = [];
    for (let from = 0; from < cur.length; from++) {
      const src = cur[from];
      if (src.length === 0) continue;
      if (src.length === capacities[from] && isUniform(src)) continue; // completed
      for (let to = 0; to < cur.length; to++) {
        if (from === to) continue;
        const dst = cur[to];
        if (dst.length >= capacities[to]) continue;
        if (dst.length > 0 && dst[dst.length - 1] !== src[src.length - 1]) continue;
        if (dst.length === 0 && isUniform(src)) continue; // pointless relocate
        let score = 1;
        if (dst.length > 0) score += 5; // consolidating
        // Completing a tube?
        const room = capacities[to] - dst.length;
        const pc = pourCount(src);
        if (dst.length + Math.min(room, pc) === capacities[to]) score += 10;
        scored.push({ from, to, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => [s.from, s.to] as [number, number]);
  }

  function dfs(cur: Tube[], depth: number): number | null {
    if (isComplete(cur, capacities)) return depth;
    if (depth >= maxDepth) return null;
    const key = stateKey(cur);
    if (seen.has(key)) return null;
    seen.add(key);
    for (const [from, to] of orderedMoves(cur)) {
      const r = applyPour(cur, capacities, EMPTY_LOCKED, from, to);
      if (!r) continue;
      const res = dfs(r.tubes, depth + 1);
      if (res !== null) return res;
    }
    return null;
  }

  return dfs(tubes.map((t) => [...t]), 0);
}

const EMPTY_LOCKED = new Set<number>();

/**
 * Legacy bounded solver kept for API compatibility.
 * Prefer solveDepth for new code.
 */
export function isSolvable(
  tubes: Tube[],
  capacities: number[],
  _locked: Set<number>,
  maxDepth: number,
  _maxNodes = 150000,
): boolean {
  return solveDepth(tubes, capacities, maxDepth) !== null;
}

/* ── Difficulty curve ────────────────────────────────────────────── */

export interface Difficulty {
  colors: number;
  tubes: number;
  emptyExtra: number; // empty tubes beyond the filled ones
  narrowTubes: number; // capacity-2 tubes
  lockedTube: boolean;
}

export function difficultyForLevel(level: number): Difficulty {
  // First 3 levels ARE the tutorial: hand-tuned in tutorialLevel().
  if (level <= 10) {
    return { colors: 3, tubes: 5, emptyExtra: 1, narrowTubes: 0, lockedTube: false };
  }
  if (level <= 30) {
    return { colors: 4, tubes: 6, emptyExtra: 1, narrowTubes: 0, lockedTube: level >= 15 };
  }
  if (level <= 60) {
    return { colors: 5, tubes: 7, emptyExtra: 1, narrowTubes: level >= 45 ? 1 : 0, lockedTube: true };
  }
  if (level <= 120) {
    return { colors: 6, tubes: 8, emptyExtra: 0, narrowTubes: 1, lockedTube: true };
  }
  return { colors: 7, tubes: 9, emptyExtra: 0, narrowTubes: 2, lockedTube: true };
}

/* ── Generator ───────────────────────────────────────────────────── */

/**
 * Generate a level by dealing shuffled balls into tubes, then verifying
 * solvability with the heuristic solver. Dealing is the standard approach
 * for this genre: with 1-2 spare tubes, the vast majority of deals are
 * solvable, and the solver rejects the rest.
 *
 * Twists (locked / narrow tubes) are applied to empty tubes after dealing,
 * so they never affect the ball layout.
 */
export function generateLevel(level: number, seed?: number): LevelData {
  // Tutorial: the first 3 levels are hand-tuned, teaching by playing.
  if (level >= 1 && level <= 3) return tutorialLevel(level);

  const d = difficultyForLevel(level);
  const actualSeed = seed ?? ((level * 2654435761) >>> 0);

  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = seededRng((actualSeed + attempt * 1013904223) >>> 0);
    const totalTubes = d.tubes + d.emptyExtra;

    // Build and shuffle the ball list: 4 of each color.
    const balls: number[] = [];
    for (let c = 0; c < d.colors; c++) {
      for (let k = 0; k < TUBE_CAPACITY; k++) balls.push(c);
    }
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }

    // Deal 4 balls into each of the first `colors` tubes; rest empty.
    const tubes: Tube[] = [];
    let bi = 0;
    for (let t = 0; t < totalTubes; t++) {
      if (t < d.colors) {
        tubes.push([balls[bi], balls[bi + 1], balls[bi + 2], balls[bi + 3]]);
        bi += 4;
      } else {
        tubes.push([]);
      }
    }

    // Reject deals that are already solved or trivially one move away.
    if (isComplete(tubes, tubes.map(() => TUBE_CAPACITY))) continue;

    // Capacities: narrow tubes (capacity 2) chosen from empty tubes.
    const capacities = tubes.map(() => TUBE_CAPACITY);
    const emptyIdx = tubes.map((_, i) => i).filter((i) => tubes[i].length === 0);
    // Shuffle empty indices for narrow/locked selection.
    for (let i = emptyIdx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [emptyIdx[i], emptyIdx[j]] = [emptyIdx[j], emptyIdx[i]];
    }
    let ei = 0;
    for (let n = 0; n < d.narrowTubes && ei < emptyIdx.length; n++) {
      capacities[emptyIdx[ei++]] = NARROW_CAPACITY;
    }

    // Locked tube: an empty tube, locked for the first few pours.
    const lockedTubes: number[] = [];
    let unlockAfterMoves = 0;
    if (d.lockedTube && ei < emptyIdx.length) {
      lockedTubes.push(emptyIdx[ei++]);
      unlockAfterMoves = 5;
    }

    // Verify solvable. Depth cap scales with difficulty; the solver is
    // heuristic so this is fast. Par = solution depth found.
    const maxDepth = Math.min(24 + d.colors * 4, 60);
    const solutionDepth = solveDepth(tubes, capacities, maxDepth);
    if (solutionDepth === null) continue;
    if (solutionDepth < 3) continue; // too trivial

    return {
      level,
      tubes,
      capacities,
      lockedTubes,
      unlockAfterMoves,
      par: Math.max(4, solutionDepth),
      colors: Array.from({ length: d.colors }, (_, i) => i),
      seed: actualSeed,
    };
  }

  // Fallback (should never happen): simple 2-color level.
  const tubes: Tube[] = [[0, 1, 0, 1], [1, 0, 1, 0], [], []];
  return {
    level,
    tubes,
    capacities: [TUBE_CAPACITY, TUBE_CAPACITY, TUBE_CAPACITY, TUBE_CAPACITY],
    lockedTubes: [],
    unlockAfterMoves: 0,
    par: 8,
    colors: [0, 1],
    seed: actualSeed,
  };
}

/**
 * Hand-tuned tutorial levels. Pars are solver-verified minimums
 * (verified 2026-10-18 — the old pars were wrong and L3 was unsolvable).
 * No text, just play.
 */
function tutorialLevel(level: number): LevelData {
  const layouts: Tube[][] = [
    // L1: 3 pours. Teaches tap-source → tap-destination.
    [[0, 0, 1, 1], [1, 1, 0, 0], [], []],
    // L2: 6 pours. Teaches using empty tubes as buffer space.
    [[1, 1, 0, 1], [0, 0, 1, 0], [], []],
    // L3: 7 pours. Introduces a third color.
    [[0, 0, 1, 1], [1, 2, 2, 1], [2, 0, 0, 2], [], []],
  ];
  const tubes = layouts[level - 1].map((t) => [...t]);
  const par = [3, 6, 7][level - 1];
  return {
    level,
    tubes,
    capacities: tubes.map(() => TUBE_CAPACITY),
    lockedTubes: [],
    unlockAfterMoves: 0,
    par,
    colors: [0, 1],
    seed: level,
  };
}

/** Daily challenge level: deterministic seed from the date. */
export function dailyLevelNumber(date: Date = new Date()): number {
  return seedFromString(
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
  );
}

export function generateDailyLevel(date: Date = new Date()): LevelData {
  const seed = dailyLevelNumber(date);
  // Daily is mid-difficulty: 5 colors, 7 tubes — same every day for everyone.
  const base = generateLevel(45, seed);
  return { ...base, level: -1, seed };
}

/** Star rating from move count vs par. */
export function starsForMoves(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.6)) return 2;
  return 1;
}
