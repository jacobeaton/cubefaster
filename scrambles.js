/* ============================================================
   CASE DATABASE
   ============================================================
   Each case has:
     - id: matches the data-case attribute on alg cards
     - name: display name
     - group: 'oll-edges' | 'oll-corners' | 'pll-corners' | 'pll-edges'
     - alg: the canonical solving algorithm
     - setup: optional pre-rotation that gets baked into the scramble
              so the case appears in standard orientation
   ============================================================ */
const CASES = {
  // ===== OLL EDGES (3) =====
  'dot':       { name: 'Dot',       group: 'oll-edges',   alg: "F (R U R' U') F' f (R U R' U') f'" },
  'i-shape':   { name: 'I-Shape',   group: 'oll-edges',   alg: "F (R U R' U') F'" },
  'l-shape':   { name: 'L-Shape',   group: 'oll-edges',   alg: "f (R U R' U') f'" },

  // ===== OLL CORNERS (7) =====
  'sune':      { name: 'Sune',      group: 'oll-corners', alg: "(R U R' U) (R U2 R')" },
  'antisune':  { name: 'Antisune',  group: 'oll-corners', alg: "(R U2 R' U') (R U' R')" },
  'h-oll':     { name: 'H',         group: 'oll-corners', alg: "(R U R' U) (R U' R' U) (R U2 R')" },
  'pi':        { name: 'Pi',        group: 'oll-corners', alg: "R U2 (R2 U' R2 U' R2) U2 R" },
  't-oll':     { name: 'T',         group: 'oll-corners', alg: "(r U R' U') (r' F R F')" },
  'l-oll':     { name: 'L',         group: 'oll-corners', alg: "(F R' F' r) (U R U' r')" },
  'u-oll':     { name: 'U',         group: 'oll-corners', alg: "R2 D (R' U2 R) D' (R' U2 R')" },

  // ===== PLL CORNERS (2) =====
  'headlights': { name: 'Headlights', group: 'pll-corners', alg: "(R U R' U') R' F (R2 U' R' U') (R U R') F'" },
  'diagonal':   { name: 'Diagonal',   group: 'pll-corners', alg: "F (R U' R' U') (R U R') F' (R U R' U') (R' F R F')" },

  // ===== PLL EDGES (4) =====
  'ua-perm':   { name: 'Ua Perm',   group: 'pll-edges', alg: "R U' (R U R U) (R U' R' U') R2" },
  'ub-perm':   { name: 'Ub Perm',   group: 'pll-edges', alg: "R2 U (R U R' U') (R' U' R' U) R'" },
  'h-perm':    { name: 'H Perm',    group: 'pll-edges', alg: "M2 U M2 U2 M2 U M2" },
  'z-perm':    { name: 'Z Perm',    group: 'pll-edges', alg: "M' U (M2 U M2 U) M' U2 M2" }
};

/* ============================================================
   SCRAMBLE GENERATION
   ============================================================
   Algorithm:
     1. Take the solving alg
     2. Invert it (reverse order, flip each move's direction)
        -> applying this to a solved cube produces the case
     3. Prepend a random AUF (U, U', U2, or nothing)
     4. Prepend a random y-rotation (rotates the case so it's not
        always in the same AUF orientation)
     5. Optionally prepend scrambling moves that don't affect the
        case state (random R/L/F/B moves before the U layer is
        affected) - we skip this for simplicity since #3+#4 give
        plenty of variety
     6. Clean up redundant moves (U U' -> nothing, U U -> U2, etc.)
   ============================================================ */

function parseAlg(algStr) {
  // Strip parens, normalize whitespace, split into moves
  return algStr.replace(/[()]/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
}

function invertMove(move) {
  // M2 -> M2, M' -> M, M -> M', Rw' -> Rw, etc.
  if (move.endsWith('2')) return move; // 180° is its own inverse
  if (move.endsWith("'")) return move.slice(0, -1);
  return move + "'";
}

function invertAlg(algStr) {
  return parseAlg(algStr).reverse().map(invertMove).join(' ');
}

function randomAUF() {
  const choices = ['', 'U', "U'", 'U2'];
  return choices[Math.floor(Math.random() * 4)];
}

function randomYRotation() {
  const choices = ['', 'y', "y'", 'y2'];
  return choices[Math.floor(Math.random() * 4)];
}

// Cancel adjacent same-face moves: U U' -> nothing, U U -> U2, U2 U -> U', etc.
function simplifyU(moves) {
  const out = [];
  for (const m of moves) {
    if (m === '') continue;
    const last = out[out.length - 1];
    if (!last) { out.push(m); continue; }
    // Same face cancellation only for U here (good enough since AUF only adds U moves)
    if (last[0] === 'U' && m[0] === 'U' && last.length <= 2 && m.length <= 2 && !last.includes('w')) {
      const v1 = moveValue(last);
      const v2 = moveValue(m);
      const sum = ((v1 + v2) % 4 + 4) % 4;
      out.pop();
      if (sum === 1) out.push('U');
      else if (sum === 2) out.push('U2');
      else if (sum === 3) out.push("U'");
      // sum === 0: cancel completely
    } else {
      out.push(m);
    }
  }
  return out;
}

function moveValue(m) {
  if (m.endsWith('2')) return 2;
  if (m.endsWith("'")) return 3;
  return 1;
}

/* Apply a y-rotation to the entire alg, so the case ends up
   facing a different direction. We do this by transforming
   each face letter:
     y:  F->R, R->B, B->L, L->F
     y': F->L, L->B, B->R, R->F
     y2: F<->B, L<->R
   U/D and slice moves stay the same.
*/
function rotateAlg(algStr, yMove) {
  if (!yMove) return algStr;
  const map = {
    "y":  { F: 'R', R: 'B', B: 'L', L: 'F' },
    "y'": { F: 'L', L: 'B', B: 'R', R: 'F' },
    "y2": { F: 'B', B: 'F', L: 'R', R: 'L' }
  }[yMove];
  if (!map) return algStr;

  return parseAlg(algStr).map(move => {
    // Capture the face letter (might be lowercase = wide move)
    const upperFirst = move[0].toUpperCase();
    if (map[upperFirst]) {
      const newFace = map[upperFirst];
      // Preserve case (lowercase = wide move)
      const wasLower = move[0] !== upperFirst;
      return (wasLower ? newFace.toLowerCase() : newFace) + move.slice(1);
    }
    return move;
  }).join(' ');
}

function generateScramble(caseId) {
  const c = CASES[caseId];
  if (!c) return null;

  // 1. Invert the solving alg -> produces the case from solved
  let scramble = invertAlg(c.alg);

  // 2. Apply a random y-rotation to the inverted alg so the case
  //    appears facing a different direction (visually rotates it)
  const y = randomYRotation();
  scramble = rotateAlg(scramble, y);

  // 3. Random AUF before the case-producing moves
  const auf = randomAUF();
  const fullMoves = simplifyU([auf, ...parseAlg(scramble)]);

  return fullMoves.join(' ');
}

// Get a case ID from a list of allowed cases (or all cases if none specified)
function pickRandomCase(allowedIds) {
  const pool = allowedIds && allowedIds.length > 0 ? allowedIds : Object.keys(CASES);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Public API exposed to the timer
window.CubeScrambleGenerator = {
  CASES,
  generateScramble,
  pickRandomCase,
  // Generate a scramble + return both the scramble and which case it represents
  generate(allowedIds) {
    const caseId = pickRandomCase(allowedIds);
    return {
      caseId,
      caseName: CASES[caseId].name,
      caseGroup: CASES[caseId].group,
      alg: CASES[caseId].alg,
      scramble: generateScramble(caseId)
    };
  }
};
