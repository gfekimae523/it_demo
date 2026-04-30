// sampleAlphaBetaAi.js
// 3手先読み + アルファベータ枝刈りを実装したサンプルAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class AlphaBetaAI {
  constructor() {
    this.maxDepth = 3; // 3手先まで読む
  }

  /**
   * 盤面と自分の色を受け取り、次の一手を返す
   * @param {Board} board - 盤面オブジェクト
   * @param {number} color - 自分の色 (1=黒, -1=白)
   * @returns {{x:number,y:number}} - 着手座標
   */
  getMove(board, color) {
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    // 各合法手について評価
    for (const move of moves) {
      const boardCopy = board.clone();
      boardCopy.applyMove(move.x, move.y, color);
      
      // アルファベータ法で評価値を計算
      const score = this.alphaBeta(boardCopy, this.maxDepth - 1, -Infinity, Infinity, false, color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * アルファベータ法による探索
   * @param {Board} board - 盤面
   * @param {number} depth - 残り探索深度
   * @param {number} alpha - アルファ値
   * @param {number} beta - ベータ値
   * @param {boolean} isMaximizing - 最大化ノードか
   * @param {number} aiColor - AIの色
   * @returns {number} - 評価値
   */
  alphaBeta(board, depth, alpha, beta, isMaximizing, aiColor) {
    // 終了条件：深度0またはゲーム終了
    if (depth === 0 || board.isGameOver()) {
      return this.evaluate(board, aiColor);
    }

    const currentColor = isMaximizing ? aiColor : -aiColor;
    const moves = board.getValidMoves(currentColor);

    // パスの場合（合法手がない）
    if (moves.length === 0) {
      return this.alphaBeta(board, depth - 1, alpha, beta, !isMaximizing, aiColor);
    }

    if (isMaximizing) {
      let maxEv = -Infinity;
      for (const move of moves) {
        const boardCopy = board.clone();
        boardCopy.applyMove(move.x, move.y, currentColor);
        const ev = this.alphaBeta(boardCopy, depth - 1, alpha, beta, false, aiColor);
        maxEv = Math.max(maxEv, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break; // ベータカット
      }
      return maxEv;
    } else {
      let minEv = Infinity;
      for (const move of moves) {
        const boardCopy = board.clone();
        boardCopy.applyMove(move.x, move.y, currentColor);
        const ev = this.alphaBeta(boardCopy, depth - 1, alpha, beta, true, aiColor);
        minEv = Math.min(minEv, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break; // アルファカット
      }
      return minEv;
    }
  }

  /**
   * 盤面の評価関数
   * @param {Board} board - 盤面
   * @param {number} aiColor - AIの色
   * @returns {number} - 評価値
   */
  evaluate(board, aiColor) {
    // ゲーム終了時は石数で判定
    if (board.isGameOver()) {
      const scoreDiff = board.getScoreDiff();
      const finalScore = aiColor === 1 ? scoreDiff : -scoreDiff;
      if (finalScore > 0) return 10000; // 勝利
      if (finalScore < 0) return -10000; // 敗北
      return 0; // 引き分け
    }

    let score = 0;

    // 1. 石数による評価（終盤重視）
    const empty = board.countEmpty();
    if (empty <= 16) { // 終盤では石数を重視
      const scoreDiff = board.getScoreDiff();
      score += (aiColor === 1 ? scoreDiff : -scoreDiff) * 10;
    }

    // 2. 位置による評価（角、辺、内部）
    const positionWeights = [
      [100, -20,  10,   5,   5,  10, -20, 100],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [ 10,  -5,   5,   1,   1,   5,  -5,  10],
      [  5,  -5,   1,   0,   0,   1,  -5,   5],
      [  5,  -5,   1,   0,   0,   1,  -5,   5],
      [ 10,  -5,   5,   1,   1,   5,  -5,  10],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [100, -20,  10,   5,   5,  10, -20, 100]
    ];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const cell = board.get(x, y);
        if (cell !== 0) {
          const weight = positionWeights[y][x];
          if ((cell === 1 && aiColor === 1) || (cell === -1 && aiColor === -1)) {
            score += weight;
          } else {
            score -= weight;
          }
        }
      }
    }

    // 3. 機動力（合法手の数）
    const aiMoves = board.getValidMoves(aiColor).length;
    const opponentMoves = board.getValidMoves(-aiColor).length;
    score += (aiMoves - opponentMoves) * 5;

    // --- ランダム性を加える ---
    // -10〜+10くらいの小さな乱数を追加
    score += Math.floor(Math.random() * 41) - 20;

    return score;
  }
}

// グローバルに公開
window.AlphaBetaAI = AlphaBetaAI;