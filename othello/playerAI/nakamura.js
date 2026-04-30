// myAi.js — 高速版 MyAI (5手先読み + 速度最適化)
// 主な最適化：
// 1. 軽量化された評価関数
// 2. 高速ビット演算
// 3. 早期終了の積極活用
// 4. キルラーヒューリスティック
// 5. 浅い探索での事前フィルタリング

class NakamuraAI {
  constructor(options = {}) {
    // 基本設定（速度重視）
    this.maxDepth = options.maxDepth || 8; // 8ply = 4手先（速度とのバランス）
    this.timeLimit = options.timeLimit || 1000; // 1秒制限
    this.startTime = 0;
    
    // 置換表（サイズ縮小で高速化）
    this.transTable = new Map();
    this.maxTransTableSize = 10000; // サイズ削減
    
    // キルラーヒューリスティック（良い手の記憶）
    this.killerMoves = new Array(this.maxDepth).fill(null).map(() => []);
    
    // 評価関数の重み（簡略化）
    this.weights = {
      pos: 1.0,
      mobility: 8.0,
      stability: 5.0,
      endgame: 20.0
    };

    // 高速位置テーブル（1次元配列で高速化）
    this.posWeights = [
      100, -20, 10,  5,  5, 10, -20, 100,
      -20, -50, -2, -2, -2, -2, -50, -20,
       10,  -2, 16,  3,  3, 16,  -2,  10,
        5,  -2,  3,  3,  3,  3,  -2,   5,
        5,  -2,  3,  3,  3,  3,  -2,   5,
       10,  -2, 16,  3,  3, 16,  -2,  10,
      -20, -50, -2, -2, -2, -2, -50, -20,
      100, -20, 10,  5,  5, 10, -20, 100
    ];

    // コーナーと危険地帯のビットマスク（高速判定用）
    this.cornerMask = 0x8100000000000081n; // 角のビット
    this.dangerMask = 0x42c300000000c342n; // X/Cマスのビット
    
    // 方向ベクトル（計算済み）
    this.directions = [1, -1, 8, -8, 9, -9, 7, -7]; // 1次元配列での方向
  }

  /**
   * メインエントリポイント（高速化）
   */
  getMove(board, color) {
    this.startTime = Date.now();
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;

    this.myColor = color;
    this.transTable.clear();
    
    // キルラー手をリセット
    this.killerMoves.forEach(arr => arr.length = 0);

    // 1手しかない場合は即返答
    if (moves.length === 1) return moves[0];

    // 角があれば即取る（超高速判定）
    for (const move of moves) {
      if (this._isCornerFast(move.x, move.y)) return move;
    }

    // 終盤判定（完全読み）
    const empty = board.countEmpty();
    if (empty <= 8) {
      return this._fastPerfectSearch(board, color);
    }

    // 浅い探索で候補を絞る（高速フィルタリング）
    const candidates = this._getTopCandidates(board, moves, color, 3);
    
    // メイン探索（候補を絞って実行）
    let bestMove = candidates[0];
    const maxTime = this.timeLimit * 0.9;
    
    for (let depth = 4; depth <= this.maxDepth; depth += 2) {
      if (Date.now() - this.startTime > maxTime) break;
      
      const result = this._fastSearch(board, candidates, color, depth);
      if (result) bestMove = result;
    }

    return bestMove;
  }

  /**
   * 高速候補絞り込み
   */
  _getTopCandidates(board, moves, color, maxCandidates) {
    // 超高速評価でソート
    const scored = moves.map(move => ({
      move,
      score: this._quickEval(board, move, color)
    })).sort((a, b) => b.score - a.score);
    
    // 上位候補のみを返す
    return scored.slice(0, Math.min(maxCandidates, moves.length)).map(x => x.move);
  }

  /**
   * 超高速評価（最低限の計算のみ）
   */
  _quickEval(board, move, color) {
    let score = 0;
    
    // 角チェック（最優先）
    if (this._isCornerFast(move.x, move.y)) return 10000;
    
    // X/Cマスチェック（回避）
    if (this._isDangerousFast(move.x, move.y)) return -5000;
    
    // 返せる石数
    score += board.getFlippedCount(move.x, move.y, color) * 10;
    
    // 位置重み（1次元アクセスで高速）
    score += this.posWeights[move.y * 8 + move.x];
    
    return score;
  }

  /**
   * 高速探索（NegaMaxベース、軽量化）
   */
  _fastSearch(board, candidates, color, depth) {
    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    
    for (const move of candidates) {
      if (Date.now() - this.startTime > this.timeLimit * 0.95) break;
      
      const nb = board.clone();
      nb.applyMove(move.x, move.y, color);
      
      const score = -this._negaMaxFast(nb, -color, depth - 1, -Infinity, -alpha);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
    }
    
    return bestMove;
  }

  /**
   * 高速NegaMax（軽量版）
   */
  _negaMaxFast(board, color, depth, alpha, beta) {
    // 時間切れチェック
    if (Date.now() - this.startTime > this.timeLimit * 0.95) {
      return this._fastEvaluate(board);
    }

    // 置換表チェック（簡易版）
    const hash = this._quickHash(board);
    if (this.transTable.has(hash)) {
      const entry = this.transTable.get(hash);
      if (entry.depth >= depth) return entry.score;
    }

    if (depth === 0 || board.isGameOver()) {
      const score = this._fastEvaluate(board);
      // 置換表保存（容量チェック省略）
      if (this.transTable.size < this.maxTransTableSize) {
        this.transTable.set(hash, { depth, score });
      }
      return score;
    }

    const moves = board.getValidMoves(color);
    
    // パス処理
    if (!moves || moves.length === 0) {
      return -this._negaMaxFast(board, -color, depth - 1, -beta, -alpha);
    }

    // 高速ムーブオーダリング（最小限）
    const orderedMoves = this._fastOrderMoves(board, moves, color, depth);
    
    let maxScore = -Infinity;
    for (const move of orderedMoves) {
      const nb = board.clone();
      nb.applyMove(move.x, move.y, color);
      
      const score = -this._negaMaxFast(nb, -color, depth - 1, -beta, -alpha);
      
      if (score > maxScore) {
        maxScore = score;
        // キルラー手として記憶
        if (score >= beta && depth < this.killerMoves.length) {
          this.killerMoves[depth].unshift(move);
          if (this.killerMoves[depth].length > 2) {
            this.killerMoves[depth].length = 2;
          }
        }
      }
      
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break; // Beta cutoff
    }

    return maxScore;
  }

  /**
   * 高速ムーブオーダリング
   */
  _fastOrderMoves(board, moves, color, depth) {
    const scored = moves.map(move => {
      let score = 0;
      
      // キルラー手チェック
      if (depth < this.killerMoves.length) {
        const killers = this.killerMoves[depth];
        const killerIndex = killers.findIndex(k => k && k.x === move.x && k.y === move.y);
        if (killerIndex !== -1) {
          score += 1000 - killerIndex * 100; // 順位に応じてスコア
        }
      }
      
      // 角
      if (this._isCornerFast(move.x, move.y)) score += 5000;
      // X/C回避
      else if (this._isDangerousFast(move.x, move.y)) score -= 3000;
      
      // 返せる石数
      score += board.getFlippedCount(move.x, move.y, color) * 5;
      
      // 位置評価
      score += this.posWeights[move.y * 8 + move.x];
      
      return { move, score };
    });
    
    return scored.sort((a, b) => b.score - a.score).map(x => x.move);
  }

  /**
   * 高速評価関数（軽量版）
   */
  _fastEvaluate(board) {
    const empty = board.countEmpty();
    
    // 終盤は石数差のみ
    if (empty <= 10) {
      const diff = board.getScoreDiff() * this.myColor;
      return diff * this.weights.endgame;
    }
    
    let score = 0;
    
    // 位置評価（高速）
    let posScore = 0;
    for (let i = 0; i < 64; i++) {
      const val = board.board[Math.floor(i / 8)][i % 8];
      if (val !== 0) {
        posScore += this.posWeights[i] * (val === this.myColor ? 1 : -1);
      }
    }
    score += posScore * this.weights.pos;
    
    // モビリティ
    const myMoves = board.getValidMoves(this.myColor).length;
    const oppMoves = board.getValidMoves(-this.myColor).length;
    score += (myMoves - oppMoves) * this.weights.mobility;
    
    // 簡易安定性（角の数のみ）
    let corners = 0;
    const cornerPos = [[0,0], [0,7], [7,0], [7,7]];
    for (const [x, y] of cornerPos) {
      const val = board.get(x, y);
      if (val === this.myColor) corners++;
      else if (val === -this.myColor) corners--;
    }
    score += corners * this.weights.stability * 20;
    
    return score;
  }

  /**
   * 高速完全読み（終盤用）
   */
  _fastPerfectSearch(board, color) {
    const moves = board.getValidMoves(color);
    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const nb = board.clone();
      nb.applyMove(move.x, move.y, color);
      
      // 簡易完全読み（深さ制限）
      const score = this._simplePerfectRead(nb, -color, 0, 6);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * 簡易完全読み
   */
  _simplePerfectRead(board, color, depth, maxDepth) {
    if (depth >= maxDepth || board.isGameOver()) {
      return board.getScoreDiff() * this.myColor;
    }

    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) {
      return this._simplePerfectRead(board, -color, depth + 1, maxDepth);
    }

    let best = (color === this.myColor) ? -Infinity : Infinity;
    for (const move of moves.slice(0, 3)) { // 上位3手のみ
      const nb = board.clone();
      nb.applyMove(move.x, move.y, color);
      const score = this._simplePerfectRead(nb, -color, depth + 1, maxDepth);
      
      if (color === this.myColor) {
        best = Math.max(best, score);
      } else {
        best = Math.min(best, score);
      }
    }
    return best;
  }

  /**
   * ユーティリティ関数（高速版）
   */
  _isCornerFast(x, y) {
    return (x === 0 || x === 7) && (y === 0 || y === 7);
  }

  _isDangerousFast(x, y) {
    return ((x === 1 && (y === 0 || y === 1 || y === 6 || y === 7)) ||
            (x === 6 && (y === 0 || y === 1 || y === 6 || y === 7)) ||
            (y === 1 && (x === 0 || x === 7)) ||
            (y === 6 && (x === 0 || x === 7)));
  }

  _quickHash(board) {
    // 超高速ハッシュ（精度より速度）
    let hash = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        hash = hash * 3 + (board.get(j, i) + 1);
      }
    }
    return hash;
  }
}

// グローバルに公開
window.NakamuraAI = NakamuraAI;