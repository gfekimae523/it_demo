// myAi.js
// プレイヤーが改造して遊ぶ用の AI クラス MyAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class SuyamaAI {
  constructor() {
    // --- 思考時間の設定 (ミリ秒) ---
    // 1秒の上限に対し、少し余裕を持たせて950msに設定
    this.timeLimit = 950; 
    this.startTime = 0;

    // --- 評価関数で使用するパラメータ ---
    this.evaluationTable = [
      [120, -20,  20,   5,   5,  20, -20, 120],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [  5,  -5,   3,   3,   3,   3,  -5,   5],
      [  5,  -5,   3,   3,   3,   3,  -5,   5],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [120, -20,  20,   5,   5,  20, -20, 120]
    ];
    this.MOBILITY_WEIGHT = 30;
  }

  /**
   * 時間制限をチェックし、超過していれば例外を投げる
   */
  checkTimeLimit() {
    if (performance.now() - this.startTime > this.timeLimit) {
      throw new Error("TimeUp");
    }
  }

  /**
   * 盤面の評価値を計算する
   * @param {Board} board - 評価対象の盤面オブジェクト
   * @param {number} myColor - AI自身の色
   * @returns {number} - 評価値（高いほどAIにとって有利）
   */
  evaluate(board, myColor) {
    if (board.isGameOver()) {
      const scoreDiff = board.getScoreDiff() * myColor; 
      if (scoreDiff > 0) return 10000;
      if (scoreDiff < 0) return -10000;
      return 0;
    }

    let positionalScore = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const stone = board.get(x, y);
        if (stone === myColor) {
          positionalScore += this.evaluationTable[y][x];
        } else if (stone === -myColor) {
          positionalScore -= this.evaluationTable[y][x];
        }
      }
    }

    const myValidMoves = board.getValidMoves(myColor).length;
    const opponentValidMoves = board.getValidMoves(-myColor).length;
    const mobilityScore = myValidMoves - opponentValidMoves;

    return positionalScore + (mobilityScore * this.MOBILITY_WEIGHT);
  }

  /**
   * アルファベータ法による探索
   * @param {Board} board - 現在の盤面
   * @param {number} depth - 読みの深さ
   * @param {number} alpha - アルファ値
   * @param {number} beta - ベータ値
   * @param {number} playerColor - 現在の手番のプレイヤーの色
   * @param {number} myColor - AI自身の色
   * @returns {number} - 探索結果の評価値
   */
  alphaBeta(board, depth, alpha, beta, playerColor, myColor) {
    // 探索の各ノードで時間制限をチェック
    this.checkTimeLimit();

    if (depth === 0 || board.isGameOver()) {
      return this.evaluate(board, myColor);
    }

    const moves = board.getValidMoves(playerColor);
    const isMaximizingPlayer = (playerColor === myColor);

    if (moves.length === 0) {
      return this.alphaBeta(board, depth - 1, alpha, beta, -playerColor, myColor);
    }
    
    if (isMaximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const childBoard = board.clone();
        childBoard.applyMove(move.x, move.y, playerColor);
        const evalScore = this.alphaBeta(childBoard, depth - 1, alpha, beta, -playerColor, myColor);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const childBoard = board.clone();
        childBoard.applyMove(move.x, move.y, playerColor);
        const evalScore = this.alphaBeta(childBoard, depth - 1, alpha, beta, -playerColor, myColor);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * 指定された深さで最善手を探す
   * @param {Board} board - 現在の盤面
   * @param {number} color - 自分の色
   * @param {number} depth - 探索する深さ
   * @returns {{x:number,y:number}} - その深さでの最善手
   */
  findBestMoveAtDepth(board, color, depth) {
    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    const moves = board.getValidMoves(color);

    for (const move of moves) {
      const tempBoard = board.clone();
      tempBoard.applyMove(move.x, move.y, color);
      
      const score = this.alphaBeta(tempBoard, depth - 1, alpha, beta, -color, color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
    }
    return bestMove;
  }

  /**
   * 盤面と自分の色を受け取り、次の一手を返す
   * @param {Board} board - 盤面オブジェクト
   * @param {number} color - 自分の色 (1=黒, -1=白)
   * @returns {{x:number,y:number}} - 着手座標
   */
  getMove(board, color) {
    this.startTime = performance.now(); // 思考開始時間を記録

    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // 時間切れになった場合に備え、最低限の手を確保しておく
    let bestMove = moves[0]; 

    try {
      // 反復深化: 浅い探索から始め、徐々に深くしていく
      // 探索可能な最大深度は盤面の空きマス数
      for (let depth = 1; depth <= board.countEmpty(); depth++) {
        // console.log(`Searching at depth ${depth}...`);
        
        const move = this.findBestMoveAtDepth(board, color, depth);
        
        // 探索が時間内に正常に完了した場合のみ、最善手を更新する
        bestMove = move;
        // console.log(`Depth ${depth} search completed. Best move is now (${bestMove.x}, ${bestMove.y})`);
      }
    } catch (e) {
      if (e.message !== "TimeUp") {
        // 時間切れ以外の予期せぬエラーの場合は、コンソールに出力して処理を続行
        console.error("An unexpected error occurred during search:", e);
      }
      // 時間切れ(TimeUp)の場合は、ループを抜けて、その時点での最善手を使う
      // console.log("Time limit reached. Using best move from previous depth.");
    }

    const thinkingTime = performance.now() - this.startTime;
    // console.log(`Thinking time: ${thinkingTime.toFixed(2)} ms`);

    return bestMove;
  }
}

// グローバルに公開
window.SuyamaAI = SuyamaAI;