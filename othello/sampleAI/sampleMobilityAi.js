// sampleMobilityAi.js
// 対戦用の候補手数重視のサンプルAI - 序盤は機動力重視、終盤は石数重視
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class MobilityAI {
  constructor() {
    // 角のボーナス値
    this.cornerBonus = 100;

    // C打ち（角の真横や真下）のペナルティ
    this.cornerAdjacentPenalty = -100;

    // X打ち（角の斜め内側）のペナルティ
    this.xSquarePenalty = -200;

    // 角の隣接マス（C打ち）
    this.cornerAdjacent = [
      {x: 0, y: 1}, {x: 1, y: 0}, {x: 1, y: 1}, // 左上
      {x: 6, y: 0}, {x: 7, y: 1}, {x: 6, y: 1}, // 右上
      {x: 0, y: 6}, {x: 1, y: 7}, {x: 1, y: 6}, // 左下
      {x: 7, y: 6}, {x: 6, y: 7}, {x: 6, y: 6}  // 右下
    ];

    // X打ちマス
    this.xSquares = [
      {x: 1, y: 1}, {x: 6, y: 1},
      {x: 1, y: 6}, {x: 6, y: 6}
    ];

    // 角
    this.corners = [
      {x: 0, y: 0}, {x: 7, y: 0},
      {x: 0, y: 7}, {x: 7, y: 7}
    ];

    // 辺（角以外）
    this.edges = [];
    for (let i = 2; i < 6; i++) {
      this.edges.push({x: i, y: 0}); // 上辺
      this.edges.push({x: i, y: 7}); // 下辺
      this.edges.push({x: 0, y: i}); // 左辺
      this.edges.push({x: 7, y: i}); // 右辺
    }
  }

  getMove(board, color) {
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const score = this.evaluateMove(board, move.x, move.y, color);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  evaluateMove(board, x, y, color) {
    const testBoard = board.clone();
    testBoard.applyMove(x, y, color);

    let score = 0;

    const emptyCount = board.countEmpty();
    const gameProgress = (64 - emptyCount) / 64;

    // 位置評価
    score += this.evaluatePosition(x, y, board);

    // ひっくり返す石の数
    const flippedCount = board.getFlippedCount(x, y, color);
    score += flippedCount * 2;

    if (gameProgress < 0.6) {
      // 序盤〜中盤: 機動力
      score += this.evaluateMobility(testBoard, color) * 10;
    } else {
      // 終盤: 石数
      const scoreDiff = testBoard.getScoreDiff();
      const stoneScore = color === 1 ? scoreDiff : -scoreDiff;
      score += stoneScore * 15;
    }

    // 小さなランダム性
    score += Math.floor(Math.random() * 41) - 20;

    return score;
  }

  evaluatePosition(x, y, board) {
    let score = 0;

    if (this.isCorner(x, y)) {
      score += this.cornerBonus;
    } else if (this.isXSquare(x, y)) {
      // X打ちは大きなペナルティ
      score += this.xSquarePenalty;
    } else if (this.isCornerAdjacent(x, y)) {
      // C打ちは角が空いていれば危険
      if (!this.isCornerSafe(x, y, board)) {
        score += this.cornerAdjacentPenalty;
      }
    } else if (this.isEdge(x, y)) {
      score += 10;
    }

    return score;
  }

  evaluateMobility(board, color) {
    const myMoves = board.getValidMoves(color).length;
    const opponentMoves = board.getValidMoves(-color).length;
    return myMoves - opponentMoves;
  }

  isCorner(x, y) {
    return this.corners.some(corner => corner.x === x && corner.y === y);
  }

  isCornerAdjacent(x, y) {
    return this.cornerAdjacent.some(pos => pos.x === x && pos.y === y);
  }

  isXSquare(x, y) {
    return this.xSquares.some(pos => pos.x === x && pos.y === y);
  }

  isEdge(x, y) {
    return this.edges.some(edge => edge.x === x && edge.y === y);
  }

  isCornerSafe(x, y, board) {
    const cornerChecks = [
      {adjacent: [{x: 0, y: 1}, {x: 1, y: 0}, {x: 1, y: 1}], corner: {x: 0, y: 0}},
      {adjacent: [{x: 6, y: 0}, {x: 7, y: 1}, {x: 6, y: 1}], corner: {x: 7, y: 0}},
      {adjacent: [{x: 0, y: 6}, {x: 1, y: 7}, {x: 1, y: 6}], corner: {x: 0, y: 7}},
      {adjacent: [{x: 7, y: 6}, {x: 6, y: 7}, {x: 6, y: 6}], corner: {x: 7, y: 7}}
    ];

    for (const check of cornerChecks) {
      if (check.adjacent.some(adj => adj.x === x && adj.y === y)) {
        return board.get(check.corner.x, check.corner.y) !== 0;
      }
    }

    return true;
  }
}

window.MobilityAI = MobilityAI;