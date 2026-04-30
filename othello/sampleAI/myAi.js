// myAi.js
// プレイヤーが改造して遊ぶ用の AI クラス MyAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class MyAI {
  constructor() {
    // 必要に応じて内部状態を持たせられる
  }

  /**
   * 盤面と自分の色を受け取り、次の一手を返す
   * @param {Board} board - 盤面オブジェクト
   * @param {number} color - 自分の色 (1=黒, -1=白)
   * @returns {{x:number,y:number}} - 着手座標
   */
  getMove(board, color) {
    // 現状は単純にランダム手を返す
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;
    const choice = moves[Math.floor(Math.random() * moves.length)];
    return choice;
  }
}

// グローバルに公開
window.MyAI = MyAI;

