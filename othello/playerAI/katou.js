// myAi.js

class KatouAI {
  constructor() {
    // 探索設定（より保守的に）
    this.maxDepth = 6;
    this.mctsIterations = 500;
    this.timeLimit = 800;
    this.useNegamax = true;
    this.useMCTS = false;
    
    // 時間管理用
    this.startTime = 0;
    this.timeoutFlag = false;
    
    // トランスポジションテーブル
    this.transTable = new Map();
    
    // 位置価値テーブル
    this.positionValues = [
      [200, -50,  50,  20,  20,  50, -50, 200],
      [-50,-100,  10,   5,   5,  10,-100, -50],
      [ 50,  10,  20,  10,  10,  20,  10,  50],
      [ 20,   5,  10,   5,   5,  10,   5,  20],
      [ 20,   5,  10,   5,   5,  10,   5,  20],
      [ 50,  10,  20,  10,  10,  20,  10,  50],
      [-50,-100,  10,   5,   5,  10,-100, -50],
      [200, -50,  50,  20,  20,  50, -50, 200]
    ];

    this.corners = [{x:0,y:0}, {x:0,y:7}, {x:7,y:0}, {x:7,y:7}];
    this.xSquares = [{x:1,y:1}, {x:1,y:6}, {x:6,y:1}, {x:6,y:6}];
    
    this.weights = {
      position: 1.0,
      mobility: 8.0,
      stability: 12.0,
      parity: 5.0,
      cornerTaken: 25.0
    };
  }

  /**
   * メイン判断ロジック（時間管理付き）
   */
  getMove(board, color) {
    this.startTime = Date.now();
    this.timeoutFlag = false;
    this.transTable.clear(); // メモリ節約
    
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;
    if (moves.length === 1) return moves[0]; // 1手なら即返却

    const totalStones = this.countTotalStones(board);
    
    // 序盤は軽量処理
    if (totalStones <= 12) {
      return this.getOpeningMove(board, color, moves);
    }
    
    // 終盤は深さ調整
    const emptySquares = 64 - totalStones;
    if (emptySquares <= 12) {
      return this.endgameSearch(board, color, moves, emptySquares);
    }
    
    // 中盤は反復深化
    return this.iterativeDeepeningSearch(board, color, moves);
  }

  /**
   * 反復深化探索（時間内に最善手を確実に返す）
   */
  iterativeDeepeningSearch(board, color, moves) {
    let bestMove = moves[0]; // フォールバック
    let currentDepth = 2;
    const maxAllowedDepth = 8;
    
    // 手を事前評価して並び替え
    const orderedMoves = this.orderMoves(board, moves, color);
    
    while (currentDepth <= maxAllowedDepth) {
      if (this.isTimeUp(100)) break; // 100ms余裕を持って終了
      
      const result = this.searchAtDepth(board, color, orderedMoves, currentDepth);
      
      if (result && !this.timeoutFlag) {
        bestMove = result;
      } else {
        break; // タイムアウトしたら前回の結果を使用
      }
      
      currentDepth++;
    }
    
    return bestMove;
  }

  /**
   * 指定深度での探索
   */
  searchAtDepth(board, color, moves, depth) {
    let bestMove = null;
    let bestScore = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
      if (this.isTimeUp(50)) {
        return bestMove; // 時間切れ
      }
      
      const newBoard = this.makeMove(board, move, color);
      const score = -this.negamax(newBoard, depth - 1, -beta, -alpha, -color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * 終盤探索（深さ制限付き）
   */
  endgameSearch(board, color, moves, emptySquares) {
    const searchDepth = Math.min(emptySquares, 10); // 最大10手先まで
    
    let bestMove = moves[0];
    let bestScore = -Infinity;
    
    const orderedMoves = this.orderMoves(board, moves, color);
    
    for (const move of orderedMoves) {
      if (this.isTimeUp(50)) break;
      
      const newBoard = this.makeMove(board, move, color);
      const score = -this.negamax(newBoard, searchDepth - 1, -Infinity, Infinity, -color);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  /**
   * 時間チェック
   */
  isTimeUp(buffer = 0) {
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.timeLimit - buffer) {
      this.timeoutFlag = true;
      return true;
    }
    return false;
  }

  /**
   * ネガマックス実装（時間チェック付き）
   */
  negamax(board, depth, alpha, beta, color) {
    // 時間切れチェック
    if (this.timeoutFlag || this.isTimeUp(20)) {
      return this.quickEval(board, color);
    }

    // トランスポジションテーブル
    const boardKey = this.getBoardKey(board);
    if (this.transTable.has(boardKey)) {
      const entry = this.transTable.get(boardKey);
      if (entry.depth >= depth) {
        return entry.score;
      }
    }

    // 終端条件
    if (depth === 0 || this.isGameOver(board)) {
      const score = this.evaluateBoard(board, color);
      if (this.transTable.size < 100000) { // メモリ制限
        this.transTable.set(boardKey, {score, depth});
      }
      return score;
    }

    const moves = board.getValidMoves(color);
    
    // パス処理
    if (!moves || moves.length === 0) {
      const oppMoves = board.getValidMoves(-color);
      if (!oppMoves || oppMoves.length === 0) {
        return this.evaluateBoard(board, color);
      }
      return -this.negamax(board, depth - 1, -beta, -alpha, -color);
    }

    let bestScore = -Infinity;

    for (const move of moves) {
      if (this.timeoutFlag) break;
      
      const newBoard = this.makeMove(board, move, color);
      const score = -this.negamax(newBoard, depth - 1, -beta, -alpha, -color);
      
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
      
      if (alpha >= beta) break;
    }

    if (this.transTable.size < 100000) {
      this.transTable.set(boardKey, {score: bestScore, depth});
    }
    return bestScore;
  }

  /**
   * 高速評価（タイムアウト時用）
   */
  quickEval(board, color) {
    let score = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (board.board[x][y] === color) {
          score += this.positionValues[x][y];
        } else if (board.board[x][y] === -color) {
          score -= this.positionValues[x][y];
        }
      }
    }
    return score;
  }

  /**
   * 評価関数（軽量化版）
   */
  evaluateBoard(board, color) {
    if (this.isGameOver(board)) {
      const score = this.getFinalScore(board, color);
      if (score > 0) return 100000;
      if (score < 0) return -100000;
      return 0;
    }

    let evaluation = 0;
    const totalStones = this.countTotalStones(board);
    const emptySquares = 64 - totalStones;

    // 位置価値
    evaluation += this.evaluatePosition(board, color) * this.weights.position;

    // モビリティ
    const mobility = this.evaluateMobility(board, color);
    evaluation += mobility * this.weights.mobility * (emptySquares > 20 ? 1 : 0.5);

    // コーナー占有
    evaluation += this.evaluateCorners(board, color) * this.weights.cornerTaken;

    // 終盤は石数重視
    if (emptySquares <= 20) {
      const stoneCount = this.countStones(board, color) - this.countStones(board, -color);
      evaluation += stoneCount * (21 - emptySquares) * 2;
    }

    return evaluation;
  }

  /**
   * 定跡的序盤戦略（高速化）
   */
  getOpeningMove(board, color, moves) {
    // コーナー優先
    for (const corner of this.corners) {
      if (moves.some(m => m.x === corner.x && m.y === corner.y)) {
        return corner;
      }
    }

    // X打ち回避
    const safeFromX = moves.filter(move => 
      !this.xSquares.some(x => x.x === move.x && x.y === move.y)
    );

    const candidates = safeFromX.length > 0 ? safeFromX : moves;

    // 位置価値で選択
    return this.selectByPositionValue(candidates);
  }

  /**
   * 手の順序付け（簡易版）
   */
  orderMoves(board, moves, color) {
    const scored = moves.map(move => ({
      move,
      score: this.positionValues[move.x][move.y] + this.getFlipCount(board, move, color) * 2
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.move);
  }

  // === 評価関数コンポーネント ===
  
  evaluatePosition(board, color) {
    let score = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (board.board[x][y] === color) {
          score += this.positionValues[x][y];
        } else if (board.board[x][y] === -color) {
          score -= this.positionValues[x][y];
        }
      }
    }
    return score;
  }

  evaluateMobility(board, color) {
    const myMoves = board.getValidMoves(color);
    const oppMoves = board.getValidMoves(-color);
    return (myMoves ? myMoves.length : 0) - (oppMoves ? oppMoves.length : 0);
  }

  evaluateCorners(board, color) {
    let score = 0;
    for (const corner of this.corners) {
      if (board.board[corner.x][corner.y] === color) {
        score += 1;
      } else if (board.board[corner.x][corner.y] === -color) {
        score -= 1;
      }
    }
    return score;
  }

  // === ヘルパー関数 ===

  makeMove(board, move, color) {
    const newBoard = this.cloneBoard(board);
    newBoard.board[move.x][move.y] = color;

    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    
    for (const [dx, dy] of directions) {
      const flips = [];
      let x = move.x + dx, y = move.y + dy;
      
      while (x >= 0 && x < 8 && y >= 0 && y < 8 && newBoard.board[x][y] === -color) {
        flips.push({x, y});
        x += dx;
        y += dy;
      }
      
      if (x >= 0 && x < 8 && y >= 0 && y < 8 && newBoard.board[x][y] === color && flips.length > 0) {
        flips.forEach(flip => newBoard.board[flip.x][flip.y] = color);
      }
    }
    
    return newBoard;
  }

  cloneBoard(board) {
    return {
      board: board.board.map(row => [...row]),
      getValidMoves: board.getValidMoves.bind(board)
    };
  }

  getFlipCount(board, move, color) {
    if (board.getFlippedCount) {
      return board.getFlippedCount(move.x, move.y, color);
    }
    
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    let totalFlips = 0;
    
    for (const [dx, dy] of directions) {
      let flips = 0;
      let x = move.x + dx, y = move.y + dy;
      
      while (x >= 0 && x < 8 && y >= 0 && y < 8 && board.board[x][y] === -color) {
        flips++;
        x += dx;
        y += dy;
      }
      
      if (x >= 0 && x < 8 && y >= 0 && y < 8 && board.board[x][y] === color && flips > 0) {
        totalFlips += flips;
      }
    }
    
    return totalFlips;
  }

  isGameOver(board) {
    const blackMoves = board.getValidMoves(1);
    const whiteMoves = board.getValidMoves(-1);
    return (!blackMoves || blackMoves.length === 0) && (!whiteMoves || whiteMoves.length === 0);
  }

  getFinalScore(board, color) {
    return this.countStones(board, color) - this.countStones(board, -color);
  }

  countStones(board, color) {
    let count = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (board.board[x][y] === color) count++;
      }
    }
    return count;
  }

  countTotalStones(board) {
    let count = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (board.board[x][y] !== 0) count++;
      }
    }
    return count;
  }

  getBoardKey(board) {
    return board.board.map(row => row.join('')).join('');
  }

  selectByPositionValue(moves) {
    let bestMove = null;
    let bestValue = -Infinity;
    
    for (const move of moves) {
      const value = this.positionValues[move.x][move.y];
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    }
    
    return bestMove || moves[0];
  }

  // === 設定メソッド ===
  
  setMaxDepth(depth) {
    this.maxDepth = Math.max(2, Math.min(10, depth));
  }

  setTimeLimit(ms) {
    this.timeLimit = Math.max(100, Math.min(900, ms));
  }
}

// グローバルに公開
window.KatouAI = KatouAI;