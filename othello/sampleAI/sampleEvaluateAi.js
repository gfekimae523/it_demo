// sampleEvaluateAi.js
// シンプルな評価関数で判断するサンプルAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class EvaluateAI {
  constructor() {
    // 位置評価テーブル（8x8）
    // 角=100, X打=-50, C打=-20, その他=0
    this.positionValues = [
      [100, -20,   0,   0,   0,   0, -20, 100],
      [-20, -50,   0,   0,   0,   0, -50, -20],
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [-20, -50,   0,   0,   0,   0, -50, -20],
      [100, -20,   0,   0,   0,   0, -20, 100]
    ];
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

    // 各合法手を評価
    for (const move of moves) {
      const score = this.evaluateMove(board, move, color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * 着手を評価する
   * @param {Board} board - 盤面オブジェクト
   * @param {{x:number,y:number}} move - 着手座標
   * @param {number} color - 自分の色
   * @returns {number} - 評価値
   */
  evaluateMove(board, move, color) {
    // 位置の価値を基本点とする
    const positionScore = this.positionValues[move.y][move.x];
    
    // ひっくり返せる石の数もボーナスとして加算（小さな重み）
    const flipCount = board.getFlippedCount(move.x, move.y, color);
    const flipBonus = flipCount * 5;

    // --- ランダム性を加える ---
    // -10〜+10くらいの小さな乱数を追加
    const randomScore = Math.floor(Math.random() * 41) - 20;
    
    return positionScore + flipBonus + randomScore;
  }
}

// グローバルに公開
window.EvaluateAI = EvaluateAI;
