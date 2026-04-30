// myAi.js
// プレイヤーが改造して遊ぶ用の AI クラス MyAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class HayashiYukiAI {
  constructor() {
    // 盤面の各マスの戦略的価値を定義
     this.weights = [
      [120, -20, 20, 5, 5, 20, -20, 120],
      [-20, -40, -5, -5, -5, -5, -40, -20],
      [20, -5, 15, 3, 3, 15, -5, 20],
      [5, -5, 3, 3, 3, 3, -5, 5],
      [5, -5, 3, 3, 3, 3, -5, 5],
      [20, -5, 15, 3, 3, 15, -5, 20],
      [-20, -40, -5, -5, -5, -5, -40, -20],
      [120, -20, 20, 5, 5, 20, -20, 120]
    ];
     this.originalColor = null; // 自分の色を保持
  }

  /**
   * 盤面と自分の色を受け取り、次の一手を返す
   * @param {Board} board - 盤面オブジェクト
   * @param {number} color - 自分の色 (1=黒, -1=白)
   * @returns {{x:number,y:number}} - 着手座標
   */

  getMove(board, color) {
    this.originalColor = color; // 自分の色を記録
    const validMoves = board.getValidMoves(color);
    if (!validMoves || validMoves.length === 0) {
      return null;
    }

    let bestMove = null;
    let bestScore = -Infinity;

    // ゲームの進行度に応じて探索の深さを調整
    const emptyCount = board.countEmpty();
    let searchDepth = 3; // 序盤〜中盤の標準的な深さ
   
    // 終盤の探索深度を細かく調整して高速化
    if (emptyCount <= 20) {
        searchDepth = 4;
    }
    if (emptyCount <= 16) {
        searchDepth = 5;
    }
    if (emptyCount <= 12) {
        searchDepth = 7;
    }
    if (emptyCount <= 8) {
        searchDepth = 6;
    }

    for (const move of validMoves) {
      const nextBoard = board.clone();
      nextBoard.applyMove(move.x, move.y, color);

      // Minimax探索を実行
      const score = this.minimax(nextBoard, searchDepth, -Infinity, +Infinity, -color);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    // 最適な手が見つからなかった場合の安全策
    if (!bestMove) {
      return validMoves[0];
    }
    
    return bestMove;
  }

  // Minimaxアルゴリズム
  minimax(board, depth, alpha, beta, color) {
    // 探索の終了条件
    if (depth === 0 || board.isGameOver()) {
      return this.evaluateBoard(board);
    }
    
    const validMoves = board.getValidMoves(color);
    if (validMoves.length === 0) {
      // パスの場合、相手の色で再帰呼び出し
      return this.minimax(board, depth - 1, alpha, beta, -color);
    }

    if (color === this.originalColor) {
      // Maximizing Player (自分のターン)
      let maxEval = -Infinity;
      for (const move of validMoves) {
        const nextBoard = board.clone();
        nextBoard.applyMove(move.x, move.y, color);
        const evaluation = this.minimax(nextBoard, depth - 1, alpha, beta, -color);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          break;
        }
      }
      return maxEval;
    } else {
      // Minimizing Player (相手のターン)
      let minEval = +Infinity;
      for (const move of validMoves) {
        const nextBoard = board.clone();
        nextBoard.applyMove(move.x, move.y, color);
        const evaluation = this.minimax(nextBoard, depth - 1, alpha, beta, -color);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          break;
        }
      }
      return minEval;
    }
  }

  // 盤面評価関数
  evaluateBoard(board) {
    // 終局判定
    if (board.isGameOver()) {
      const { black, white } = board.countDiscs();
      if (black > white) return this.originalColor === 1 ? 1000 : -1000;
      if (white > black) return this.originalColor === -1 ? 1000 : -1000;
      return 0; // 引き分け
    }
    
    let score = 0;
    const emptyCount = board.countEmpty();
    
    // 1. 位置の評価
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (board.get(x, y) === this.originalColor) {
          score += this.weights[y][x];
        } else if (board.get(x, y) === -this.originalColor) {
          score -= this.weights[y][x];
        }
      }
    }
    
    // 2. 着手可能数の評価 (機動力)
    const myMobility = board.getValidMoves(this.originalColor).length;
    const opponentMobility = board.getValidMoves(-this.originalColor).length;
    // 序盤では重みを高くし、終盤に近づくにつれて下げる
    const mobilityWeight = (emptyCount / 64) * 20;
    score += (myMobility - opponentMobility) * mobilityWeight;

    // 3. 確定石の評価 (高速化のため追加)
    score += this.countStableDiscs(board, this.originalColor) * 100;
    score -= this.countStableDiscs(board, -this.originalColor) * 100;

    // 4. フロンティアディスクの評価（応用）
    const myFrontier = this.countFrontierDiscs(board, this.originalColor);
    const opponentFrontier = this.countFrontierDiscs(board, -this.originalColor);
    score -= (myFrontier - opponentFrontier) * 10;
    return score;
  }

  // 確定石の数を数える関数 (角と辺の確定石)
 countStableDiscs(board, color) {
    let stableCount = 0;
    const isStable = new Set();

    const corners = [
      [0, 0], [0, 7], [7, 0], [7, 7]
    ];
    const directions = [
      [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
 
    for (const [cx, cy] of corners) {
      if (board.get(cx, cy) === color) {
        for (const [dx, dy] of directions) {
          const stableLine = [];
          let x = cx + dx, y = cy + dy;
          while (board.inBounds(x, y) && board.get(x, y) === color) {
            stableLine.push(`${x},${y}`);
            x += dx;
            y += dy;
          }
          if (!board.inBounds(x, y) || board.get(x, y) === color) {

            stableLine.forEach(pos => isStable.add(pos));
          }
        }
       isStable.add(`${cx},${cy}`);
      }
    }

    return isStable.size;
  }


  // フロンティアディスクの数を数える関数（新規追加）
  countFrontierDiscs(board, color) {
    let frontierCount = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (board.get(x, y) === color) {
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (board.inBounds(nx, ny) && board.get(nx, ny) === 0) {
              frontierCount++;
              break; // 隣接する空きマスが1つでもあればカウント
            }
          }
        }
      }
    }
    return frontierCount;
 }
}

// グローバルに公開
window.HayashiYukiAI = HayashiYukiAI;


