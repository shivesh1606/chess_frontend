# Chess Game — Improvements & Roadmap

Codebase analysis + research-backed improvement plan for this vanilla JS chess game.
Sources: [Chessprogramming Wiki](https://www.chessprogramming.org), [PeSTO Evaluation](https://www.chessprogramming.org/PeSTO%27s_Evaluation_Function), [Wikipedia — Chess](https://en.wikipedia.org/wiki/Chess).

---

## 1. Bug Fixes (Must-Fix)

### 1.1 — `makeMove` copies `blackKingMoved` when white king moves

**File:** [js/game.js:127](js/game.js#L127)

```js
// BUG: both lines check `!game.whiteKingMoved` and update different flags
if (!game.whiteKingMoved && ... king) game.whiteKingMoved = true;
if (!game.whiteKingMoved && ... king) game.blackKingMoved = true;  // ← wrong flag
```

The second condition should check `!game.blackKingMoved` and be guarded by the black king icon:

```js
if (!game.whiteKingMoved && board[...].icon === ICONS.white.king) game.whiteKingMoved = true;
if (!game.blackKingMoved && board[...].icon === ICONS.black.king) game.blackKingMoved = true;
```

**Impact:** Black can castle even after its king has moved.

---

### 1.2 — `isIllegalMove` computes `opponentColor` from `.color` of a string

**File:** [js/validators.js:357](js/validators.js#L357)

```js
let currentPlayer = game.board.board[move.fromRow][move.fromCol].color  // string e.g. "white"
let opponentColor = currentPlayer.color === "white" ? "black" : "white"; // .color on a string → undefined
```

`currentPlayer` is already the color string, not an object. Fix:

```js
let currentPlayer = game.board.board[move.fromRow][move.fromCol].color;
let opponentColor = currentPlayer === "white" ? "black" : "white";
```

**Impact:** `opponentColor` is always `"white"` (undefined === "white" is false), causing illegal-move checks to use the wrong attacker side.

---

### 1.3 — Castling is declared but never validated or executed

**File:** [js/game.js:108–113](js/game.js#L108) — flags tracked but never used  
**File:** [js/validators.js:152–163](js/validators.js#L152) — `isValidKingMove` only allows 1-square moves

Castling requires:
- King and relevant rook have not moved (`*KingMoved`, `*RookMoved` flags).
- Squares between them are empty.
- King does not pass through or land on a square attacked by the opponent.
- King is not currently in check.

Add castling as a special case in `isValidKingMove` and execute the rook teleport inside `makeMove`.

---

### 1.4 — En Passant stub never implemented

**File:** [js/game.js:104](js/game.js#L104) — `this.lastMove = null` exists but is unused  
**File:** [js/validators.js:166–199](js/validators.js#L166) — pawn validator ignores `lastMove`

En passant rule: a pawn that just advanced two squares can be captured diagonally by an adjacent enemy pawn on the very next move. The captured pawn is removed from its original square, not the destination.

**Required changes:**
1. Store the en passant target square in `ChessGame` (or use `lastMove`).
2. In `isValidPawnMove`, add a fourth check: if `lastMove` was a two-square pawn advance and `toCol` is the en passant file, allow the diagonal capture.
3. In `makeMove`, when the move is an en passant capture, remove the captured pawn from `lastMove.toRow` / `toCol` (not from the destination square).

---

## 2. AI Engine Improvements

### 2.1 — Add Piece-Square Tables (PST) to Board Evaluation

**File:** [js/engine.js:34–48](js/engine.js#L34)

The current `evaluateBoard` only sums material. Adding piece-square tables gives each piece positional value (e.g., knights penalised on the rim, rooks rewarded on open files). This alone is the single largest strength improvement for a fixed-depth engine — references: [PST wiki](https://www.chessprogramming.org/Piece-Square_Tables), [PeSTO](https://www.chessprogramming.org/PeSTO%27s_Evaluation_Function).

**Implementation outline:**

```js
// PST for white pawns (row 0 = rank 8, row 7 = rank 1)
const PST_PAWN_WHITE = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0]
];

// Mirror for black: PST_PAWN_BLACK[r][c] = PST_PAWN_WHITE[7-r][c]

// In evaluateBoard, replace:
//   whiteScore += weights[piece.icon]
// with:
//   whiteScore += weights[piece.icon] + pstValue(piece, row, col)
```

Provide separate PST tables for: pawn, knight, bishop, rook, queen, king (opening), king (endgame). Mirror horizontally for black.

**Estimated strength gain:** +50–100 Elo equivalent at depth 3.

---

### 2.2 — Move Ordering for Better Alpha-Beta Pruning

**File:** [js/engine.js:90](js/engine.js#L90)

Currently moves are shuffled randomly:

```js
children.sort(function (a, b) { return 0.5 - Math.random() });
```

Random ordering provides almost no alpha-beta benefit. Replace with **MVV-LVA** (Most Valuable Victim — Least Valuable Aggressor):

```js
function mvvLvaScore(game, move) {
    const victim = game.board.board[move.toRow][move.toCol];
    const aggressor = game.board.board[move.fromRow][move.fromCol];
    if (!victim) return 0;
    return 10 * weights[victim.icon] - weights[aggressor.icon];
}

// Sort: captures first (descending MVV-LVA score), quiet moves last
children.sort((a, b) => mvvLvaScore(game, b) - mvvLvaScore(game, a));
```

Keep a small random tiebreak among equal-score moves to avoid repetitive play.

**Estimated impact:** Doubles effective search depth for the same node budget. References: [MVV-LVA](https://www.chessprogramming.org/MVV-LVA), [Move Ordering](https://www.chessprogramming.org/Move_Ordering).

---

### 2.3 — Replace Fixed-Depth Search with Iterative Deepening

**File:** [js/computer.js](js/computer.js) — calls `minimax(..., 3, ...)`

Iterative deepening runs depth-1 through depth-N searches successively. Each completed depth gives a valid best move; the deepest completed search wins. This enables time-based cutoffs (stop after N ms and return the last complete result).

```js
let bestMove = null;
const deadline = Date.now() + 2000; // 2-second think time
for (let depth = 1; depth <= 6; depth++) {
    if (Date.now() > deadline) break;
    const [move] = minimax(game, depth, -Infinity, +Infinity, true);
    if (move) bestMove = move;
}
return bestMove;
```

**Benefit:** Naturally handles varying position complexity; never returns null if at least depth-1 finishes. References: [Iterative Deepening](https://www.chessprogramming.org/Iterative_Deepening).

---

### 2.4 — Transposition Table (Position Cache)

**File:** [js/engine.js:65](js/engine.js#L65)

The engine re-evaluates identical positions reached via different move orders. A transposition table caches results by position hash.

**Zobrist hashing:**

```js
// Pre-generate at startup: 64 squares × 12 piece types
const zobristTable = Array.from({length: 64}, () =>
    Array.from({length: 12}, () => BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)))
);
const transpositionTable = new Map();
```

On each node: compute hash, look up table; if hit with sufficient depth, return cached score. On exit: store `{depth, score, flag: 'exact'|'lower'|'upper'}`.

**Estimated speedup:** 30–50% fewer nodes at depth 4+. References: [Transposition Table](https://www.chessprogramming.org/Transposition_Table).

---

### 2.5 — Quiescence Search

**File:** [js/engine.js:94–95](js/engine.js#L94)

At depth 0 the engine immediately calls `evaluateBoard`. This causes the **horizon effect** — the engine might stop searching just before a piece is captured.

Quiescence search extends the search at leaf nodes, but only considers captures, until the position is "quiet":

```js
function quiesce(game, alpha, beta) {
    const stand_pat = evaluateBoard(game);
    if (stand_pat >= beta) return beta;
    if (stand_pat > alpha) alpha = stand_pat;

    const captures = allMoves(game).filter(m => isCapture(game, m));
    for (const move of captures) {
        const child = applyMove(game, move);
        const score = -quiesce(child, -beta, -alpha);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }
    return alpha;
}
```

Call `quiesce` instead of `evaluateBoard` when `depth === 0`. References: [Quiescence Search](https://www.chessprogramming.org/Quiescence_Search).

---

## 3. Missing Game Rules

### 3.1 — 50-Move Rule

Add a `halfmoveClock` counter to `ChessGame` ([js/game.js:98](js/game.js#L98)):

```js
this.halfmoveClock = 0;
```

In `makeMove` ([js/game.js:122](js/game.js#L122)):
- Reset to 0 on any pawn move or capture.
- Otherwise increment by 1.

Declare draw when `halfmoveClock >= 100` (50 full moves). References: [Fifty-move Rule](https://www.chessprogramming.org/Fifty-move_Rule).

---

### 3.2 — Threefold Repetition

Track a history of position hashes after each move. A draw can be claimed if the same position (same board + same player to move + same castling rights + same en passant target) occurs three times.

```js
// In ChessGame constructor
this.positionHistory = [];

// In makeMove, after updating board state
const hash = computePositionHash(game);
game.positionHistory.push(hash);
const count = game.positionHistory.filter(h => h === hash).length;
if (count >= 3) game.draw = true;
```

Reset history after irreversible moves (pawn advance or capture) to bound memory. References: [Repetitions](https://www.chessprogramming.org/Repetitions).

---

### 3.3 — Insufficient Material Draw

Declare a draw automatically when neither side has enough material to checkmate:
- King vs King
- King + Bishop vs King
- King + Knight vs King
- King + Bishop vs King + Bishop (same-colored bishops)

---

## 4. UX Improvements

### 4.1 — Drag-and-Drop Piece Movement

Currently pieces are selected and placed by two separate clicks. Drag-and-drop is the standard UX for web chess boards.

**Recommended approach — mouse/pointer events** (more responsive than HTML5 Drag API):

```js
piece.addEventListener('pointerdown', startDrag);
document.addEventListener('pointermove', dragPiece);
document.addEventListener('pointerup', dropPiece);
```

On `pointerdown`: lift piece, highlight valid destination squares.  
On `pointermove`: follow cursor (absolute positioning).  
On `pointerup`: snap to target square if legal, snap back if not.

Using `PointerEvents` (instead of separate mouse/touch handlers) gives free mobile/tablet support.

---

### 4.2 — Move History Panel with Algebraic Notation

Display a scrollable move list in Standard Algebraic Notation (SAN) alongside the board:

```
1. e4   c5
2. Nf3  d6
3. d4   cxd4
4. Nxd4
```

SAN format rules:
- Pawn moves: destination only (`e4`, `exd5`)
- Piece moves: piece letter + destination (`Nf3`, `Bxc6`)
- Castling: `O-O` (kingside), `O-O-O` (queenside)
- Promotion: `e8=Q`
- Check: `+`, Checkmate: `#`
- Disambiguate by file/rank when two identical pieces can reach the same square

Store SAN strings in an array on `ChessGame`; render into a `<div>` after each move.

---

### 4.3 — Visual Highlights

- **Last move:** shade the from/to squares of the previous move (light yellow).
- **Legal moves:** show dots or rings on valid destination squares after selecting a piece.
- **Check indicator:** tint the king's square red when in check.
- **Captured pieces:** already shown — consider grouping by piece type.

These are purely CSS class additions on board cells.

---

### 4.4 — Board Themes and Piece Styles

The game currently uses Unicode chess symbols. Consider adding:
- CSS variables for board colors (e.g., classic brown, green felt, blue ocean presets).
- An optional SVG piece set alongside the Unicode default (Lichess open-source piece sets are freely available).

---

### 4.5 — AI Difficulty Levels

Expose a `<select>` on `computer.html` for difficulty:

| Level  | Depth | Think Time |
|--------|-------|------------|
| Easy   | 1–2   | instant    |
| Medium | 3     | ~0.5 s     |
| Hard   | 4–5   | ~2 s       |

Pass the chosen depth / time budget into the `minimax` call.

---

### 4.6 — Sound Effects

Add short audio cues via the Web Audio API or pre-loaded `<audio>` elements:
- Move sound (piece placed)
- Capture sound
- Check alert
- Game-end fanfare

Keep files small (< 50 KB each) and default to muted; provide a toggle button.

---

## 5. Code Quality & Performance

### 5.1 — Replace Deep JSON Clone with Structured Clone or Incremental State

**File:** [js/engine.js:111](js/engine.js#L111), [js/validators.js:354](js/validators.js#L354)

Both `minimax` and `isIllegalMove` clone the entire game state per node via `JSON.parse(JSON.stringify(game))`. This is slow and triggers full garbage-collection pressure at depth 3.

**Option A — `structuredClone` (modern browsers):**
```js
const dummy = structuredClone(game); // faster built-in, no JSON serialization
```

**Option B — make/unmake moves (fastest):**
Store only a diff (captured piece + flags changed), apply the move, recurse, then undo the move. No allocation at all.

---

### 5.2 — `getValidMoves` is O(64) per piece

**File:** [js/game.js:41–51](js/game.js#L41)

It tries all 64 squares for every piece to find valid moves. For pieces like the knight and king whose move set is a fixed small list, generate candidate squares directly instead of checking all 64.

---

### 5.3 — `calls` DOM Query Inside Minimax

**File:** [js/engine.js:26](js/engine.js#L26), [js/engine.js:67](js/engine.js#L67)

```js
const calls = document.querySelector(".calls") // module-level, fine
calls.innerHTML = parseInt(calls.innerHTML) + 1; // called millions of times
```

Parsing and writing innerHTML on every minimax call adds DOM overhead. Use a module-level integer counter and write to the DOM once after the search completes.

---

### 5.4 — Remove Dead `old.html`

[old.html](old.html) is an unreferenced legacy file with an alternate single-file implementation. It creates confusion and should be deleted or moved to a `/archive` folder.

---

### 5.5 — Add a `package.json` and Bundle for Production

The project loads libraries from CDN (Axios, Socket.IO). Adding a minimal `package.json` + a bundler (Vite is zero-config and fast) would:
- Enable local installs without CDN dependency.
- Allow tree-shaking and minification.
- Enable hot-reload during development.

```bash
npm create vite@latest chess_game -- --template vanilla
```

---

## 6. Multiplayer / Backend

### 6.1 — Validate Moves Server-Side

**File:** [js/index.js](js/index.js) — all validation is client-only

Currently the server trusts the client to only emit legal moves. A malicious client can emit any move. Server-side validation (running the same validator logic in Node.js) should be the authority.

---

### 6.2 — Handle Disconnection Gracefully

If a player disconnects mid-game, show a "Opponent disconnected" banner and allow the remaining player to claim a win or wait for reconnection within a time window.

---

### 6.3 — Game Clock / Time Controls

Add optional time controls (rapid: 10 min, blitz: 3 min, bullet: 1 min). Display a countdown clock per player. On timeout, declare the opponent winner. This requires both frontend (display + local countdown) and backend (authoritative timer).

---

## 7. Priority Summary

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Fix `blackKingMoved` bug ([game.js:127](js/game.js#L127)) | Trivial | Correctness |
| P0 | Fix `opponentColor` bug ([validators.js:357](js/validators.js#L357)) | Trivial | Correctness |
| P0 | Implement en passant | Medium | Correctness |
| P0 | Implement castling validation & execution | Medium | Correctness |
| P1 | Move ordering (MVV-LVA) | Small | +AI strength |
| P1 | Piece-square tables | Medium | +AI strength |
| P1 | 50-move rule | Small | Correctness |
| P1 | Threefold repetition | Medium | Correctness |
| P2 | Drag-and-drop | Medium | UX |
| P2 | Move history / SAN panel | Medium | UX |
| P2 | Iterative deepening | Medium | AI flexibility |
| P2 | Visual highlights (last move, legal moves, check) | Small | UX |
| P3 | Transposition table | Large | AI speed |
| P3 | Quiescence search | Medium | AI accuracy |
| P3 | Server-side move validation | Large | Security |
| P3 | Difficulty levels | Small | UX |
| P3 | Insufficient material draw | Small | Correctness |
