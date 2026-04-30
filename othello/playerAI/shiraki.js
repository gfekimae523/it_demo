// myAi.js
// 改善版 AI クラス MyAI（開放度理論を追加）
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class ShirakiAI {
  constructor() {
    // 位置評価テーブル（序盤～中盤）
    this.positionValue = [
      [100, -20, 10,  5,  5, 10, -20, 100],
      [-20, -50, -2, -2, -2, -2, -50, -20],
      [ 10,  -2, 10,  2,  2, 10,  -2,  10],
      [  5,  -2,  2,  1,  1,  2,  -2,   5],
      [  5,  -2,  2,  1,  1,  2,  -2,   5],
      [ 10,  -2, 10,  2,  2, 10,  -2,  10],
      [-20, -50, -2, -2, -2, -2, -50, -20],
      [100, -20, 10,  5,  5, 10, -20, 100]
    ];

    // 角の座標
    this.corners = [
      {x: 0, y: 0}, {x: 7, y: 0},
      {x: 0, y: 7}, {x: 7, y: 7}
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

    const emptyCount = board.countEmpty();
    
    // 終盤（空きマス15以下）は完全読み切り
    if (emptyCount <= 15) {
      return this.getBestMoveEndgame(board, color, emptyCount);
    }
    
    // 中盤以降（空きマス30以下）は深い読み
    if (emptyCount <= 30) {
      return this.getBestMoveMidgame(board, color);
    }
    
    // 序盤は位置評価重視
    return this.getBestMoveOpening(board, color);
  }

  /**
   * 序盤の手（位置評価と確定石、開放度を重視）
   */
  getBestMoveOpening(board, color) {
    const moves = board.getValidMoves(color);
    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const testBoard = board.clone();
      testBoard.applyMove(move.x, move.y, color);
      
      let score = 0;
      
      // 位置評価
      score += this.positionValue[move.y][move.x] * 3;
      
      // 着手後の確定石の差
      const stableDiscs = this.countStableDiscs(testBoard, color) - 
                         this.countStableDiscs(testBoard, -color);
      score += stableDiscs * 50;
      
      // ★開放度評価（序盤で最も重要）
      const myOpenness = this.calculateTotalOpenness(testBoard, color);
      const opOpenness = this.calculateTotalOpenness(testBoard, -color);
      // 自分の開放度は低く、相手の開放度は高くしたい
      score -= myOpenness * 15;  // 自分の開放度ペナルティ
      score += opOpenness * 10;   // 相手の開放度ボーナス
      
      // 着手位置自体の開放度（その位置に置いた時の開放度）
      const moveOpenness = this.calculateOpenness(board, move.x, move.y);
      score -= moveOpenness * 20; // 開放度が高い位置は避ける
      
      // 相手の手数を減らす
      const opponentMoves = testBoard.getValidMoves(-color).length;
      score -= opponentMoves * 5;
      
      // 自分の手数を増やす
      const myMoves = testBoard.getValidMoves(color).length;
      score += myMoves * 3;
      
      // 序盤は取る石を少なめに（ただし開放度も考慮）
      const flipped = board.getFlippedCount(move.x, move.y, color);
      score -= flipped * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  /**
   * 開放度を計算（その位置の周囲8マスの空きマス数）
   * @param {Board} board - 盤面
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @returns {number} 開放度（0-8）
   */
  calculateOpenness(board, x, y) {
    let openness = 0;
    const dirs = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];
    
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      
      // 盤面外は開放度に含めない
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        if (board.get(nx, ny) === 0) {
          openness++;
        }
      }
    }
    
    return openness;
  }

  /**
   * 全体の開放度を計算（自分の石の開放度の合計）
   * @param {Board} board - 盤面
   * @param {number} color - 色
   * @returns {number} 開放度の合計
   */
  calculateTotalOpenness(board, color) {
    let totalOpenness = 0;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (board.get(x, y) === color) {
          totalOpenness += this.calculateOpenness(board, x, y);
        }
      }
    }
    
    return totalOpenness;
  }

  /**
   * 加重開放度を計算（位置の重要度で重み付け）
   * 内側の石ほど開放度が重要
   * @param {Board} board - 盤面
   * @param {number} color - 色
   * @returns {number} 加重開放度
   */
  calculateWeightedOpenness(board, color) {
    let weightedOpenness = 0;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (board.get(x, y) === color) {
          const openness = this.calculateOpenness(board, x, y);
          const weight = this.getOpennessWeight(x, y);
          weightedOpenness += openness * weight;
        }
      }
    }
    
    return weightedOpenness;
  }

  /**
   * 位置に応じた開放度の重み
   * 内側ほど重要（開放度を避けたい）
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @returns {number} 重み
   */
  getOpennessWeight(x, y) {
    // 角は開放度無関係（確定石）
    if ((x === 0 || x === 7) && (y === 0 || y === 7)) {
      return 0;
    }
    
    // 辺は開放度の影響が小さい
    if (x === 0 || x === 7 || y === 0 || y === 7) {
      return 0.5;
    }
    
    // 内側ほど開放度の影響が大きい
    const distFromEdge = Math.min(x, 7 - x, y, 7 - y);
    
    if (distFromEdge === 1) return 2.0;  // 2列目・7列目
    if (distFromEdge === 2) return 3.0;  // 3列目・6列目
    return 4.0;                           // 中央部分
  }

  /**
   * 中盤の手（ミニマックス探索 + 開放度）
   */
  getBestMoveMidgame(board, color) {
    const moves = board.getValidMoves(color);
    let bestMove = null;
    let bestScore = -Infinity;
    const depth = 4; // 探索深さ

    for (const move of moves) {
      const testBoard = board.clone();
      testBoard.applyMove(move.x, move.y, color);
      
      const score = this.minimax(testBoard, depth - 1, -Infinity, Infinity, false, color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  /**
   * 終盤の手（完全読み切り）
   */
  getBestMoveEndgame(board, color, emptyCount) {
    const moves = board.getValidMoves(color);
    let bestMove = null;
    let bestScore = -Infinity;
    const depth = Math.min(emptyCount, 8); // 最大8手先まで

    for (const move of moves) {
      const testBoard = board.clone();
      testBoard.applyMove(move.x, move.y, color);
      
      const score = this.minimax(testBoard, depth - 1, -Infinity, Infinity, false, color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  /**
   * ミニマックス法（アルファベータ枝刈り付き）
   */
  minimax(board, depth, alpha, beta, isMaximizing, myColor) {
    if (depth === 0 || board.isGameOver()) {
      return this.evaluateBoard(board, myColor);
    }

    const color = isMaximizing ? myColor : -myColor;
    const moves = board.getValidMoves(color);

    // パスの場合
    if (moves.length === 0) {
      return this.minimax(board, depth - 1, alpha, beta, !isMaximizing, myColor);
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const testBoard = board.clone();
        testBoard.applyMove(move.x, move.y, color);
        const score = this.minimax(testBoard, depth - 1, alpha, beta, false, myColor);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // ベータカット
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        const testBoard = board.clone();
        testBoard.applyMove(move.x, move.y, color);
        const score = this.minimax(testBoard, depth - 1, alpha, beta, true, myColor);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // アルファカット
      }
      return minScore;
    }
  }

  /**
   * 盤面評価関数（開放度を含む）
   */
  evaluateBoard(board, myColor) {
    const emptyCount = board.countEmpty();
    
    // 終盤は石数で評価
    if (emptyCount <= 10) {
      const scoreDiff = myColor === 1 ? board.getScoreDiff() : -board.getScoreDiff();
      return scoreDiff * 1000;
    }
    
    let score = 0;
    
    // 確定石の差
    const stableDiscs = this.countStableDiscs(board, myColor) - 
                       this.countStableDiscs(board, -myColor);
    score += stableDiscs * 100;
    
    // 位置評価
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const disc = board.get(x, y);
        if (disc === myColor) {
          score += this.positionValue[y][x];
        } else if (disc === -myColor) {
          score -= this.positionValue[y][x];
        }
      }
    }
    
    // ★開放度評価（序盤～中盤で重要）
    if (emptyCount > 15) {
      const myOpenness = this.calculateWeightedOpenness(board, myColor);
      const opOpenness = this.calculateWeightedOpenness(board, -myColor);
      
      // ゲームが進むほど開放度の重要性は下がる
      const opennessWeight = emptyCount / 64.0; // 序盤ほど重要
      
      score -= myOpenness * 8 * opennessWeight;  // 自分の開放度は低く
      score += opOpenness * 6 * opennessWeight;  // 相手の開放度は高く
    }
    
    // 着手可能数の差（モビリティ）
    const myMoves = board.getValidMoves(myColor).length;
    const opMoves = board.getValidMoves(-myColor).length;
    score += (myMoves - opMoves) * 10;
    
    return score;
  }

  /**
   * 確定石（もう取られない石）を数える
   */
  countStableDiscs(board, color) {
    let count = 0;
    
    // 角の確定石をチェック
    for (const corner of this.corners) {
      if (board.get(corner.x, corner.y) === color) {
        count += this.countStableFromCorner(board, corner.x, corner.y, color);
      }
    }
    
    return count;
  }

  /**
   * 角から確定している石を数える
   */
  countStableFromCorner(board, cx, cy, color) {
    let count = 0;
    const visited = Array.from({length: 8}, () => Array(8).fill(false));
    const queue = [{x: cx, y: cy}];
    visited[cy][cx] = true;
    
    while (queue.length > 0) {
      const {x, y} = queue.shift();
      count++;
      
      // 隣接マスをチェック
      const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && 
            !visited[ny][nx] && board.get(nx, ny) === color) {
          
          // 辺に沿っているか、既に確定している石に隣接しているか
          if (this.isStablePosition(board, nx, ny, color, visited)) {
            visited[ny][nx] = true;
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
    
    return count;
  }

  /**
   * その位置が確定しているかチェック
   */
  isStablePosition(board, x, y, color, visited) {
    // 辺にあるか
    if (x === 0 || x === 7 || y === 0 || y === 7) {
      // 辺に沿って既に確定石があるか
      const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && visited[ny][nx]) {
          return true;
        }
      }
    }
    return false;
  }
}

// グローバルに公開
window.ShirakiAI = ShirakiAI;