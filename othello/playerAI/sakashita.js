// claude.js
// 白番強化版オセロAI - 黒番の強さを維持しつつ白番を改良
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class SakashitaAI {
  constructor() {
    // 基本位置評価（黒番用）
    this.weightsBlack = [
      [100, -25, 10,  5,  5, 10, -25, 100],
      [-25, -25,  2,  2,  2,  2, -25, -25],
      [ 10,   2,  5,  1,  1,  5,   2,  10],
      [  5,   2,  1,  0,  0,  1,   2,   5],
      [  5,   2,  1,  0,  0,  1,   2,   5],
      [ 10,   2,  5,  1,  1,  5,   2,  10],
      [-25, -25,  2,  2,  2,  2, -25, -25],
      [100, -25, 10,  5,  5, 10, -25, 100]
    ];
    
    // 白番用位置評価（守備的・角重視）
    this.weightsWhite = [
      [120, -30, 15,  8,  8, 15, -30, 120],
      [-30, -30,  3,  3,  3,  3, -30, -30],
      [ 15,   3,  8,  2,  2,  8,   3,  15],
      [  8,   3,  2,  1,  1,  2,   3,   8],
      [  8,   3,  2,  1,  1,  2,   3,   8],
      [ 15,   3,  8,  2,  2,  8,   3,  15],
      [-30, -30,  3,  3,  3,  3, -30, -30],
      [120, -30, 15,  8,  8, 15, -30, 120]
    ];
    
    this.timeLimit = 900;
    this.startTime = 0;
    this.tt = new Map();
    this.nodeCount = 0;
    this.myColor = 0;  // 現在の手番の色を記憶
  }
  
  getMove(board, color) {
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;
    if (moves.length === 1) return moves[0];
    
    this.startTime = Date.now();
    this.nodeCount = 0;
    this.tt.clear();
    this.myColor = color;  // 自分の色を記憶
    
    const empty = board.countEmpty();
    
    // 深さ決定（白番は+1深く読む）
    let depth;
    if (empty <= 10) {
      depth = empty;
    } else if (empty <= 20) {
      depth = color === -1 ? 9 : 8;  // 白番は深く
    } else if (empty <= 40) {
      depth = color === -1 ? 7 : 6;  // 白番は深く
    } else {
      depth = color === -1 ? 6 : 5;  // 白番は深く
    }
    
    let bestMove = moves[0];
    let bestScore = -999999;
    
    // 手を評価順にソート（色によって異なる戦略）
    const orderedMoves = this.orderMoves(moves, board, color);
    
    // 反復深化探索
    for (let d = Math.min(4, depth); d <= depth; d++) {
      if (Date.now() - this.startTime > this.timeLimit) break;
      
      let iterBest = null;
      let iterScore = -999999;
      
      for (const move of orderedMoves) {
        if (Date.now() - this.startTime > this.timeLimit) break;
        
        const newBoard = board.clone();
        const success = newBoard.applyMove(move.x, move.y, color);
        if (!success) continue;
        
        const score = -this.negamax(newBoard, -color, d - 1, -999999, -iterScore, empty - 1);
        
        if (score > iterScore) {
          iterScore = score;
          iterBest = move;
        }
      }
      
      if (iterBest && !this.isTimeUp()) {
        bestMove = iterBest;
        bestScore = iterScore;
      }
    }
    
    return bestMove;
  }
  
  negamax(board, color, depth, alpha, beta, empty) {
    this.nodeCount++;
    
    if (this.nodeCount % 1000 === 0 && this.isTimeUp()) {
      return this.evaluate(board, color);
    }
    
    const hash = this.hashBoard(board, color);
    const ttEntry = this.tt.get(hash);
    if (ttEntry && ttEntry.depth >= depth) {
      return ttEntry.score;
    }
    
    if (board.isGameOver()) {
      const score = this.evaluateFinal(board, color);
      this.tt.set(hash, { depth: 100, score });
      return score;
    }
    
    if (depth <= 0) {
      const score = this.evaluate(board, color);
      this.tt.set(hash, { depth: 0, score });
      return score;
    }
    
    const moves = board.getValidMoves(color);
    
    if (moves.length === 0) {
      return -this.negamax(board, -color, depth - 1, -beta, -alpha, empty);
    }
    
    let best = -999999;
    const orderedMoves = this.orderMovesSimple(moves, board, color);
    
    for (const move of orderedMoves) {
      const newBoard = board.clone();
      newBoard.applyMove(move.x, move.y, color);
      
      const score = -this.negamax(newBoard, -color, depth - 1, -beta, -alpha, empty - 1);
      
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      
      if (alpha >= beta) {
        break;
      }
      
      if (this.isTimeUp()) break;
    }
    
    if (!this.isTimeUp() && this.tt.size < 50000) {
      this.tt.set(hash, { depth, score: best });
    }
    
    return best;
  }
  
  evaluate(board, color) {
    let score = 0;
    
    // 使用する評価テーブルを選択（自分の元の色に基づく）
    const weights = this.myColor === -1 ? this.weightsWhite : this.weightsBlack;
    
    // 1. 位置評価
    let position = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const disc = board.get(x, y);
        if (disc !== 0) {
          position += disc * color * weights[y][x];
        }
      }
    }
    
    // 2. モビリティ（白番は重視）
    const myMoves = board.getValidMoves(color).length;
    const oppMoves = board.getValidMoves(-color).length;
    const mobilityWeight = this.myColor === -1 ? 15 : 10;
    const mobility = (myMoves - oppMoves) * mobilityWeight;
    
    // 3. 安定石
    let stable = 0;
    const corners = [[0,0], [7,0], [0,7], [7,7]];
    for (const [cx, cy] of corners) {
      if (board.get(cx, cy) === color) {
        stable += 50;
        // 白番は安定石をより重視
        if (this.myColor === -1) stable += 20;
      } else if (board.get(cx, cy) === -color) {
        stable -= 50;
        if (this.myColor === -1) stable -= 20;
      }
    }
    
    // 4. フロンティア（白番は防御的に）
    let myFrontier = 0;
    let oppFrontier = 0;
    for (let y = 1; y < 7; y++) {
      for (let x = 1; x < 7; x++) {
        const disc = board.get(x, y);
        if (disc !== 0) {
          let hasEmpty = false;
          const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
          for (const [dx, dy] of dirs) {
            if (board.get(x + dx, y + dy) === 0) {
              hasEmpty = true;
              break;
            }
          }
          if (hasEmpty) {
            if (disc === color) myFrontier++;
            else oppFrontier++;
          }
        }
      }
    }
    const frontierWeight = this.myColor === -1 ? 8 : 5;
    const frontier = (oppFrontier - myFrontier) * frontierWeight;
    
    // 5. 辺の制御（白番は重視）
    let edgeControl = 0;
    if (this.myColor === -1) {
      // 辺の石をカウント
      for (let i = 1; i < 7; i++) {
        // 上辺
        const top = board.get(i, 0);
        if (top === color) edgeControl += 5;
        else if (top === -color) edgeControl -= 5;
        // 下辺
        const bottom = board.get(i, 7);
        if (bottom === color) edgeControl += 5;
        else if (bottom === -color) edgeControl -= 5;
        // 左辺
        const left = board.get(0, i);
        if (left === color) edgeControl += 5;
        else if (left === -color) edgeControl -= 5;
        // 右辺
        const right = board.get(7, i);
        if (right === color) edgeControl += 5;
        else if (right === -color) edgeControl -= 5;
      }
    }
    
    // 重み付け（ゲーム段階による）
    const empty = board.countEmpty();
    if (empty > 40) {
      // 序盤
      score = position * 2 + mobility * 3 + stable + frontier;
    } else if (empty > 20) {
      // 中盤
      score = position + mobility * 2 + stable * 2 + frontier + edgeControl;
    } else if (empty > 10) {
      // 終盤前
      const counts = board.countDiscs();
      const material = (counts.black - counts.white) * color * 5;
      score = position + mobility + stable * 3 + material + edgeControl;
    } else {
      // 終盤
      const counts = board.countDiscs();
      const material = (counts.black - counts.white) * color * 10;
      score = material + stable * 2;
    }
    
    return score;
  }
  
  evaluateFinal(board, color) {
    const counts = board.countDiscs();
    const diff = (counts.black - counts.white) * color;
    // 白番の場合、勝ちをより重視
    if (this.myColor === -1 && diff > 0) {
      return diff * 1200;
    }
    return diff * 1000;
  }
  
  orderMoves(moves, board, color) {
    const evaluated = moves.map(move => {
      let priority = 0;
      
      // 角は最優先
      if ((move.x === 0 || move.x === 7) && (move.y === 0 || move.y === 7)) {
        priority = 1000;
        // 白番は角をさらに優先
        if (color === -1) priority += 200;
      }
      // X打ちは避ける
      else if ((move.x === 1 || move.x === 6) && (move.y === 1 || move.y === 6)) {
        const cornerX = move.x === 1 ? 0 : 7;
        const cornerY = move.y === 1 ? 0 : 7;
        if (board.get(cornerX, cornerY) === 0) {
          priority = -100;
          // 白番はX打ちをさらに避ける
          if (color === -1) priority -= 50;
        }
      }
      // 辺
      else if (move.x === 0 || move.x === 7 || move.y === 0 || move.y === 7) {
        priority = 50;
        // 白番は辺を重視
        if (color === -1) priority += 30;
      }
      
      // ひっくり返す数
      const flipped = board.getFlippedCount(move.x, move.y, color);
      priority += flipped;
      
      // 白番は相手の手を制限する手を優先
      if (color === -1) {
        const newBoard = board.clone();
        newBoard.applyMove(move.x, move.y, color);
        const oppMoves = newBoard.getValidMoves(-color).length;
        priority += (10 - oppMoves) * 3;
      }
      
      return { move, priority };
    });
    
    evaluated.sort((a, b) => b.priority - a.priority);
    return evaluated.map(e => e.move);
  }
  
  orderMovesSimple(moves, board, color) {
    const corners = [];
    const edges = [];
    const others = [];
    
    for (const move of moves) {
      if ((move.x === 0 || move.x === 7) && (move.y === 0 || move.y === 7)) {
        corners.push(move);
      } else if (move.x === 0 || move.x === 7 || move.y === 0 || move.y === 7) {
        edges.push(move);
      } else {
        others.push(move);
      }
    }
    
    return [...corners, ...edges, ...others];
  }
  
  hashBoard(board, color) {
    let hash = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        hash += (board.get(x, y) + 1);
      }
    }
    return hash + color;
  }
  
  isTimeUp() {
    return Date.now() - this.startTime > this.timeLimit;
  }
}

// グローバルに公開
window.SakashitaAI = SakashitaAI;