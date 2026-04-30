// myAi.js（強化版：外周条件＋X未支配C禁止＋外周挟み込み優先：1石でも優先）
// - 角は最優先
// - X/C 打ちは通常避けるが、外周で相手の石を挟める場合は優先（1つでも）
// - 一番外の辺に相手の石があり、その隣（危険C）は避ける
// - X に自分の石がないとき、その隣の C には置かない（角が埋まっていても適用）
// - 外周で相手の石を挟み込める場合は優先（1石以上でボーナス）

class NakagawaAI {
  constructor() {
    this.baseWeights = [
      [120, -20,  20,   5,   5,  20, -20, 120],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [ 20,  -5,  15,   8,   8,  15,  -5,  20],
      [  5,  -5,   8,  10,  10,   8,  -5,   5],
      [  5,  -5,   8,  10,  10,   8,  -5,   5],
      [ 20,  -5,  15,   8,   8,  15,  -5,  20],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [120, -20,  20,   5,   5,  20, -20, 120],
    ];

    this.xPenalty = -100;
    this.cPenalty = -60;

    this.flipCoeff = 0.4;
    this.mobilityCoeff = 3.0;
    this.oppMobilityCoeff = -3.5;

    this.innerCoeff = 15;
    this.edgePenalty = -15;
    this.safeEdgeBonus = 30;
    this.surroundCoeff = 2.0;
    this.outerBlockPenalty = -40;
    this.edgeTrapBonus = 50; // 外周で相手を挟み込める場合のボーナス
  }

  getMove(board, color) {
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;

    for (const m of moves) if (this.isCorner(m.x, m.y)) return m;

    let best = null;
    let bestScore = -Infinity;

    for (const m of moves) {
      const sim = board.clone();
      sim.applyMove(m.x, m.y, color);
      const score = this.evaluate(sim, color) + this.localMoveBonus(board, m.x, m.y, color);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best ?? moves[0];
  }

  evaluate(simBoard, me) {
    let v = 0;

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const cell = simBoard.get(x, y);
        if (cell === 0) continue;
        const w = this.baseWeights[y][x];
        v += (cell === me ? w : -w);

        if (cell === me && x >= 2 && x <= 5 && y >= 2 && y <= 5) v += this.innerCoeff;
        if (cell === me && this.isEdge(x, y) && !this.isCorner(x, y)) v += this.edgePenalty;
      }
    }

    const myMoves = simBoard.getValidMoves(me).length;
    const oppMoves = simBoard.getValidMoves(-me).length;
    v += myMoves * this.mobilityCoeff + oppMoves * this.oppMobilityCoeff;

    return v;
  }

  localMoveBonus(board, x, y, me) {
    let v = 0;

    const cornerOwner = (cx, cy) => board.get(cx, cy);
    const xMap = { '1,1': [0,0], '6,1': [7,0], '1,6': [0,7], '6,6': [7,7] };
    const key = `${x},${y}`;
    if (xMap[key]) {
      const [cx, cy] = xMap[key];
      if (cornerOwner(cx, cy) === 0) v += this.xPenalty;
    }

    const cGroups = [
      { c: [0,0], cells: [[1,0],[0,1]] },
      { c: [7,0], cells: [[6,0],[7,1]] },
      { c: [0,7], cells: [[0,6],[1,7]] },
      { c: [7,7], cells: [[6,7],[7,6]] },
    ];
    for (const g of cGroups) {
      for (const [cx, cy] of g.cells) {
        if (x === cx && y === cy && cornerOwner(g.c[0], g.c[1]) === 0) v += this.cPenalty;
      }
    }

    // 新規ルール: X に自分の石がないとき、その隣の C には置かない
    const xToC = {
      '1,0': [1,1], '0,1': [1,1],
      '6,0': [6,1], '7,1': [6,1],
      '0,6': [1,6], '1,7': [1,6],
      '6,7': [6,6], '7,6': [6,6]
    };
    const k2 = `${x},${y}`;
    if (xToC[k2]) {
      const [xx, yy] = xToC[k2];
      if (board.get(xx, yy) !== me) v -= 80;
    }

    const empties = board.countEmpty();
    const flipWeight = empties > 40 ? this.flipCoeff * 0.6 : empties > 15 ? this.flipCoeff : this.flipCoeff * 1.5;
    v += board.getFlippedCount(x, y, me) * flipWeight;

    const flips = board.getFlippedDiscs(x, y, me);
    for (const f of flips) {
      let surround = 0;
      for (let dx=-1; dx<=1; dx++) {
        for (let dy=-1; dy<=1; dy++) {
          if (dx===0 && dy===0) continue;
          const nx=f.x+dx, ny=f.y+dy;
          if (nx>=0 && nx<8 && ny>=0 && ny<8) {
            if (board.get(nx, ny) === -me) surround++;
          }
        }
      }
      v += surround * this.surroundCoeff;
    }

    const sim = board.clone();
    sim.applyMove(x, y, me);
    const oppMoves = sim.getValidMoves(-me);
    for (const move of oppMoves) {
      if (this.isEdge(move.x, move.y)) v += this.outerBlockPenalty;
    }

    const nearCornerDiag = [[1,1],[6,1],[1,6],[6,6]];
    for (const [dx, dy] of nearCornerDiag) if (x === dx && y === dy) v -= 10;

    // 新規: 外周で相手の石を1つ以上挟める場合はボーナス
    if (this.isEdge(x, y) && !this.isCorner(x, y)) {
      const flipped = board.getFlippedDiscs(x, y, me);
      let edgeFlips = 0;
      for (const f of flipped) {
        if (this.isEdge(f.x, f.y)) edgeFlips++;
      }
      if (edgeFlips >= 1) v += this.edgeTrapBonus;
    }

    return v;
  }

  isCorner(x, y) {
    return (x === 0 && y === 0) || (x === 7 && y === 0) || (x === 0 && y === 7) || (x === 7 && y === 7);
  }

  isEdge(x, y) {
    return x === 0 || x === 7 || y === 0 || y === 7;
  }
}

window.NakagawaAI = NakagawaAI;
