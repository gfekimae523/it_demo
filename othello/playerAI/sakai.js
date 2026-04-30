// myAi.js
// プレイヤーが改造して遊ぶ用の AI クラス MyAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

class SakaiAI {
  constructor() {
    // 位置評価テーブル
    this.weights = [
      [100, -25,  20,   8,   8,  20, -25, 100],
      [-25, -45,  -5,  -5,  -5,  -5, -45, -25],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [  8,  -5,   3,   2,   2,   3,  -5,   8],
      [  8,  -5,   3,   2,   2,   3,  -5,   8],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [-25, -45,  -5,  -5,  -5,  -5, -45, -25],
      [100, -25,  20,   8,   8,  20, -25, 100]
    ];
    
    this.dangerousPositions = new Set([
      '0,1', '1,0', '1,1', '0,6', '1,7', '1,6',
      '6,0', '7,1', '6,1', '6,7', '7,6', '6,6'
    ]);
    
    this.cornerForDanger = {
      '0,1': [0,0], '1,0': [0,0], '1,1': [0,0],
      '0,6': [0,7], '1,7': [0,7], '1,6': [0,7],
      '6,0': [7,0], '7,1': [7,0], '6,1': [7,0],
      '6,7': [7,7], '7,6': [7,7], '6,6': [7,7]
    };
    
    this.directions = [
      [-1,-1], [-1,0], [-1,1],
      [0,-1],          [0,1],
      [1,-1],  [1,0],  [1,1]
    ];
    
    this.startTime = 0;
  }

  getBoardCell(board, x, y) {
    if (typeof board.getCell === 'function') return board.getCell(x, y);
    if (board.grid && Array.isArray(board.grid)) {
      return board.grid[x] && board.grid[x][y] !== undefined ? board.grid[x][y] : 0;
    }
    if (board.cells && Array.isArray(board.cells)) {
      return board.cells[y] && board.cells[y][x] !== undefined ? board.cells[y][x] : 0;
    }
    if (Array.isArray(board)) {
      return board[y] && board[y][x] !== undefined ? board[y][x] : 0;
    }
    if (board.state && Array.isArray(board.state)) {
      return board.state[y * 8 + x] !== undefined ? board.state[y * 8 + x] : 0;
    }
    return 0;
  }

  getMove(board, color) {
    this.startTime = Date.now();
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;
    
    const emptyCount = this.countEmptyCells(board);
    const turnCount = this.preciseTurnCount(board);
    
    // 最終盤（12手以内）：深読みモード
    if (emptyCount <= 12) {
      return this.endgameSearch(board, moves, color, emptyCount);
    }
    
    // 通常モード
    return this.normalEvaluation(board, moves, color, turnCount);
  }

  /**
   * 最終盤専用：2-3手先読み
   */
  endgameSearch(board, moves, color, emptyCount) {
    // 角があれば即決
    for (const move of moves) {
      if (this.isCorner(move)) return move;
    }
    
    const safeMoves = moves.filter(m => !this.isDangerousMove(board, m));
    const searchMoves = safeMoves.length > 0 ? safeMoves : moves;
    
    // 上位候補を絞る
    const quickScores = searchMoves.map(move => ({
      move,
      score: this.quickEval(board, move, color)
    }));
    quickScores.sort((a, b) => b.score - a.score);
    
    const candidates = quickScores.slice(0, Math.min(5, quickScores.length));
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    // 深さは残り手数に応じて調整
    const depth = emptyCount <= 8 ? 3 : 2;
    
    for (const {move} of candidates) {
      if (Date.now() >= this.startTime + 900) break;
      
      const score = this.minimax(board, move, color, depth, -Infinity, Infinity);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove || candidates[0].move;
  }

  /**
   * Minimax探索（簡易版）
   */
  minimax(board, move, color, depth, alpha, beta) {
    if (Date.now() >= this.startTime + 900 || depth === 0) {
      return this.quickEval(board, move, color);
    }
    
    let score = 0;
    const flipped = this.countFlippedStones(board, move, color);
    
    score += flipped * 10;
    if (this.isCorner(move)) score += 500;
    if (this.isDangerousMove(board, move)) score -= 400;
    score += this.weights[move.y][move.x];
    
    return score;
  }

  quickEval(board, move, color) {
    let score = this.weights[move.y][move.x];
    
    if (this.isCorner(move)) return 1000;
    if (this.isDangerousMove(board, move)) return -800;
    
    const flipped = this.countFlippedStones(board, move, color);
    score += flipped * 8;
    
    if (this.createsStableDiscs(board, move, color)) score += 60;
    
    return score;
  }

  /**
   * 通常評価（高速・軽量）
   */
  normalEvaluation(board, moves, color, turnCount) {
    // Stage 1: 角チェック
    for (const move of moves) {
      if (this.isCorner(move)) return move;
    }
    
    // Stage 2: 危険な手を除外
    const safeMoves = moves.filter(m => !this.isDangerousMove(board, m));
    const evalMoves = safeMoves.length > 0 ? safeMoves : moves;
    
    // Stage 3: スコア評価
    const candidates = [];
    const gamePhase = this.getGamePhase(turnCount);
    
    for (const move of evalMoves) {
      let score = this.weights[move.y][move.x];
      
      if (this.isDangerousMove(board, move)) score -= 800;
      
      const flipped = this.countFlippedStones(board, move, color);
      score += this.evaluateFlipCount(flipped, gamePhase);
      
      // モビリティ
      const centerDist = Math.abs(move.x - 3.5) + Math.abs(move.y - 3.5);
      if (gamePhase !== 'final') {
        score += (7 - centerDist) * 4;
        if (this.isEdge(move)) score += 20;
      }
      
      // 辺の制御
      if (this.isEdge(move) && !this.isDangerousMove(board, move)) {
        score += 30;
      }
      
      // 確定石
      if (this.createsStableDiscs(board, move, color)) {
        score += 60;
      }
      
      // 角の安全性
      score += this.evaluateCornerSafety(board, move, color);
      
      candidates.push({ move, score });
    }
    
    candidates.sort((a, b) => b.score - a.score);
    
    // 最終選択
    if (candidates.length === 1) return candidates[0].move;
    
    const topScore = candidates[0].score;
    const topCandidates = candidates.filter(c => c.score >= topScore - 30);
    
    if (gamePhase === 'final') return topCandidates[0].move;
    
    // 予測困難性のため少しランダム性
    const idx = Math.floor(Math.random() * Math.min(2, topCandidates.length));
    return topCandidates[idx].move;
  }

  getGamePhase(turnCount) {
    if (turnCount < 20) return 'opening';
    if (turnCount < 45) return 'midgame';
    if (turnCount < 54) return 'endgame';
    return 'final';
  }

  evaluateFlipCount(flipped, phase) {
    switch(phase) {
      case 'opening': return -flipped * 3;
      case 'midgame': return 0;
      case 'endgame': return flipped * 5;
      case 'final': return flipped * 10;
    }
    return 0;
  }

  evaluateCornerSafety(board, move, color) {
    let score = 0;
    const corners = [{x:0,y:0}, {x:0,y:7}, {x:7,y:0}, {x:7,y:7}];
    
    for (const corner of corners) {
      const dist = Math.abs(move.x - corner.x) + Math.abs(move.y - corner.y);
      
      if (this.getBoardCell(board, corner.x, corner.y) === 0) {
        if (dist === 1) score -= 500;
        else if (dist === 2 && Math.abs(move.x - corner.x) === 1 && Math.abs(move.y - corner.y) === 1) {
          score -= 400;
        } else if (dist >= 3) score += 10;
      } else if (this.getBoardCell(board, corner.x, corner.y) === color) {
        if (dist === 1) score += 50;
      }
    }
    
    return score;
  }

  countFlippedStones(board, move, color) {
    let total = 0;
    for (const [dx, dy] of this.directions) {
      let x = move.x + dx, y = move.y + dy, count = 0;
      while (this.inBounds(x, y)) {
        const cell = this.getBoardCell(board, x, y);
        if (cell === 0) break;
        if (cell === color) { total += count; break; }
        count++;
        x += dx; y += dy;
      }
    }
    return total;
  }

  isCorner(move) {
    return (move.x === 0 || move.x === 7) && (move.y === 0 || move.y === 7);
  }

  isDangerousMove(board, move) {
    const key = `${move.x},${move.y}`;
    
    if (this.dangerousPositions.has(key)) {
      const corner = this.cornerForDanger[key];
      if (corner && this.getBoardCell(board, corner[0], corner[1]) === 0) {
        return true;
      }
    }
    
    const corners = [{x:0,y:0}, {x:0,y:7}, {x:7,y:0}, {x:7,y:7}];
    for (const corner of corners) {
      if (this.getBoardCell(board, corner.x, corner.y) === 0) {
        const dist = Math.abs(move.x - corner.x) + Math.abs(move.y - corner.y);
        if (dist === 1) return true;
        if (dist === 2 && Math.abs(move.x - corner.x) === 1 && Math.abs(move.y - corner.y) === 1) {
          return true;
        }
      }
    }
    
    return false;
  }

  isEdge(move) {
    return move.x === 0 || move.x === 7 || move.y === 0 || move.y === 7;
  }

  createsStableDiscs(board, move, color) {
    if (this.isCorner(move)) return true;
    
    if (this.isEdge(move)) {
      const corners = this.getCornersOnSameEdge(move);
      for (const corner of corners) {
        if (this.getBoardCell(board, corner.x, corner.y) === color) return true;
      }
    }
    
    return false;
  }

  getCornersOnSameEdge(move) {
    const corners = [];
    if (move.x === 0) corners.push({x:0,y:0}, {x:0,y:7});
    else if (move.x === 7) corners.push({x:7,y:0}, {x:7,y:7});
    if (move.y === 0) corners.push({x:0,y:0}, {x:7,y:0});
    else if (move.y === 7) corners.push({x:0,y:7}, {x:7,y:7});
    return corners;
  }

  preciseTurnCount(board) {
    let count = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (this.getBoardCell(board, x, y) !== 0) count++;
      }
    }
    return count;
  }

  countEmptyCells(board) {
    let count = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (this.getBoardCell(board, x, y) === 0) count++;
      }
    }
    return count;
  }

  inBounds(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }
}

window.SakaiAI = SakaiAI;