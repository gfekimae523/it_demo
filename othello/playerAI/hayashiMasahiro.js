// myAi.js
// 強化版オセロAI - 反復深化アルファベータ探索、トランスポジションテーブル、高度な評価関数を実装

// ==================== 定数定義 ====================
const TIME_LIMIT_MS = 1000; // 思考時間制限（1秒）
const TIME_CUTOFF_MS = 800; // 安全マージンを持たせた打ち切り時間
const ENDGAME_FULL_SEARCH_THRESHOLD = 12; // 終盤完全読みの閾値
const MAX_DEPTH = 64; // 最大探索深度

// 評価関数の重み（ゲーム段階で動的に調整）
const WEIGHTS = {
  corner: 10000,    // 角の価値
  stable: 500,      // 確定石の価値
  x: -400,          // X打ち（角の斜め）のペナルティ
  c: -150,          // C打ち（角の隣）のペナルティ
  mobility: 100,    // 着手可能数
  potMobility: 50,  // ポテンシャル可動性
  frontier: -80,    // フロンティア石（不安定）
  disk: 1,          // 石数差（終盤重視）
  parity: 200       // 偶数理論
};

// 角と隣接マスの座標
const CORNERS = [[0,0], [0,7], [7,0], [7,7]];
const X_SQUARES = [[1,1], [1,6], [6,1], [6,6]];
const C_SQUARES = [[0,1], [1,0], [0,6], [1,7], [6,0], [7,1], [6,7], [7,6]];

// 方向ベクトル
const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

// トランスポジションテーブルのフラグ
const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;

class HayashiMasahiroAI {
  constructor() {
    this.transpositionTable = new Map(); // トランスポジションテーブル
    this.killerMoves = Array(MAX_DEPTH).fill(null).map(() => []); // キラームーブ
    this.historyTable = {}; // 履歴ヒューリスティック
    this.startTime = 0;
    this.timeOut = false;
    this.nodesSearched = 0;
    this.bestMoveGlobal = null;
    this.initZobrist();
  }

  // Zobristハッシュ用の乱数テーブル初期化
  initZobrist() {
    this.zobristTable = [];
    const seed = 12345;
    let rand = seed;
    for (let i = 0; i < 64; i++) {
      this.zobristTable[i] = {
        black: this.pseudoRandom(rand++),
        white: this.pseudoRandom(rand++)
      };
    }
    this.zobristTurn = this.pseudoRandom(rand);
  }

  pseudoRandom(seed) {
    seed = (seed * 9301 + 49297) % 233280;
    return seed;
  }

  // 盤面のハッシュ値を計算
  getHash(board, color) {
    let hash = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board.board[y][x];
        if (piece === 1) {
          hash ^= this.zobristTable[y * 8 + x].black;
        } else if (piece === -1) {
          hash ^= this.zobristTable[y * 8 + x].white;
        }
      }
    }
    if (color === -1) hash ^= this.zobristTurn;
    return hash;
  }

  /**
   * メインエントリポイント：次の一手を返す
   */
  getMove(board, color) {
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;
    if (moves.length === 1) return moves[0]; // 選択肢が1つならすぐ返す

    // 初期化
    this.startTime = Date.now();
    this.timeOut = false;
    this.nodesSearched = 0;
    this.transpositionTable.clear();
    this.bestMoveGlobal = moves[0];

    const emptyCount = board.countEmpty();

    // 終盤なら完全読みを試みる
    if (emptyCount <= ENDGAME_FULL_SEARCH_THRESHOLD) {
      const endgameMove = this.endgameSearch(board, color, emptyCount);
      if (endgameMove && !this.timeOut) {
        return endgameMove;
      }
    }

    // 反復深化探索
    let bestMove = moves[0];
    let bestValue = -Infinity;

    for (let depth = 1; depth <= Math.min(emptyCount, MAX_DEPTH); depth++) {
      if (this.isTimeUp()) break;

      let currentBest = null;
      let currentValue = -Infinity;

      // ムーブオーダリング
      const orderedMoves = this.orderMoves(board, moves, color, depth);

      for (const move of orderedMoves) {
        if (this.isTimeUp()) break;

        const newBoard = board.clone();
        newBoard.applyMove(move.x, move.y, color);

        const value = -this.alphaBeta(newBoard, -color, depth - 1, -Infinity, -currentValue, false);

        if (value > currentValue && !this.timeOut) {
          currentValue = value;
          currentBest = move;
        }
      }

      if (!this.timeOut && currentBest) {
        bestMove = currentBest;
        bestValue = currentValue;
        this.bestMoveGlobal = bestMove;

        // キラームーブとして記録
        if (!this.killerMoves[0].some(m => m && m.x === bestMove.x && m.y === bestMove.y)) {
          this.killerMoves[0].unshift(bestMove);
          this.killerMoves[0] = this.killerMoves[0].slice(0, 2);
        }
      }
    }

    return this.bestMoveGlobal || bestMove;
  }

  /**
   * 終盤完全読み
   */
  endgameSearch(board, color, maxDepth) {
    const moves = board.getValidMoves(color);
    if (!moves || moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      if (this.isTimeUp()) break;

      const newBoard = board.clone();
      newBoard.applyMove(move.x, move.y, color);

      const score = -this.endgameAlphaBeta(newBoard, -color, maxDepth - 1, -Infinity, Infinity);

      if (score > bestScore && !this.timeOut) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * 終盤用アルファベータ探索（最終石数評価）
   */
  endgameAlphaBeta(board, color, depth, alpha, beta) {
    this.nodesSearched++;

    if (this.nodesSearched % 1000 === 0 && this.isTimeUp()) {
      return 0;
    }

    // 終端ノードか深さ0なら最終石数で評価
    if (depth === 0 || board.isGameOver()) {
      const { black, white } = board.countDiscs();
      return color === 1 ? (black - white) : (white - black);
    }

    const moves = board.getValidMoves(color);

    // パス
    if (moves.length === 0) {
      return -this.endgameAlphaBeta(board, -color, depth - 1, -beta, -alpha);
    }

    for (const move of moves) {
      const newBoard = board.clone();
      newBoard.applyMove(move.x, move.y, color);

      const value = -this.endgameAlphaBeta(newBoard, -color, depth - 1, -beta, -alpha);

      if (value >= beta) return beta; // βカット
      if (value > alpha) alpha = value;
    }

    return alpha;
  }

  /**
   * アルファベータ探索（通常の評価関数使用）
   */
  alphaBeta(board, color, depth, alpha, beta, isRoot = false) {
    this.nodesSearched++;

    // 時間チェック
    if (this.nodesSearched % 500 === 0 && this.isTimeUp()) {
      return 0;
    }

    // トランスポジションテーブル参照
    const hash = this.getHash(board, color);
    const ttEntry = this.transpositionTable.get(hash);

    if (ttEntry && ttEntry.depth >= depth && !isRoot) {
      if (ttEntry.flag === TT_EXACT) {
        return ttEntry.value;
      } else if (ttEntry.flag === TT_LOWER && ttEntry.value > alpha) {
        alpha = ttEntry.value;
      } else if (ttEntry.flag === TT_UPPER && ttEntry.value < beta) {
        beta = ttEntry.value;
      }
      if (alpha >= beta) {
        return ttEntry.value;
      }
    }

    // 終端ノードまたは深さ0
    if (depth === 0 || board.isGameOver()) {
      const value = this.evaluate(board, color);
      this.storeTransposition(hash, depth, value, TT_EXACT, null);
      return value;
    }

    const moves = board.getValidMoves(color);

    // パス
    if (moves.length === 0) {
      return -this.alphaBeta(board, -color, depth - 1, -beta, -alpha);
    }

    // ムーブオーダリング
    const orderedMoves = this.orderMoves(board, moves, color, depth);

    let bestMove = null;
    let bestValue = -Infinity;
    let flag = TT_UPPER;

    for (const move of orderedMoves) {
      if (this.timeOut) break;

      const newBoard = board.clone();
      newBoard.applyMove(move.x, move.y, color);

      const value = -this.alphaBeta(newBoard, -color, depth - 1, -beta, -alpha);

      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }

      if (value >= beta) {
        // βカット - キラームーブとして記録
        this.addKillerMove(depth, move);
        this.updateHistory(move, depth);
        this.storeTransposition(hash, depth, beta, TT_LOWER, move);
        return beta;
      }

      if (value > alpha) {
        alpha = value;
        flag = TT_EXACT;
      }
    }

    this.storeTransposition(hash, depth, bestValue, flag, bestMove);
    return bestValue;
  }

  /**
   * ムーブオーダリング
   */
  orderMoves(board, moves, color, depth) {
    const scored = moves.map(move => {
      let score = 0;

      // トランスポジションテーブルの最善手
      const hash = this.getHash(board, color);
      const ttEntry = this.transpositionTable.get(hash);
      if (ttEntry && ttEntry.bestMove && ttEntry.bestMove.x === move.x && ttEntry.bestMove.y === move.y) {
        score += 100000;
      }

      // 角
      if (this.isCorner(move.x, move.y)) {
        score += 50000;
      }

      // キラームーブ
      if (depth < this.killerMoves.length) {
        for (const killer of this.killerMoves[depth]) {
          if (killer && killer.x === move.x && killer.y === move.y) {
            score += 10000;
            break;
          }
        }
      }

      // X打ちとC打ちのペナルティ
      if (this.isXSquare(move.x, move.y)) {
        score -= 5000;
      }
      if (this.isCSquare(move.x, move.y)) {
        score -= 2000;
      }

      // ひっくり返す石の数
      score += board.getFlippedCount(move.x, move.y, color) * 100;

      // 履歴ヒューリスティック
      const histKey = `${move.x},${move.y}`;
      score += (this.historyTable[histKey] || 0);

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.move);
  }

  /**
   * 評価関数
   */
  evaluate(board, color) {
    const emptyCount = board.countEmpty();
    const { black, white } = board.countDiscs();

    // ゲーム段階の判定
    const stage = emptyCount > 40 ? 'opening' :
                  emptyCount > 20 ? 'midgame' : 'endgame';

    // 動的な重み調整
    const weights = this.getStageWeights(stage, emptyCount);

    let score = 0;

    // 1. 角の評価
    const corners = this.countCorners(board);
    score += weights.corner * (corners[color] - corners[-color]);

    // 2. 確定石の評価
    const stable = this.countStableDiscs(board);
    score += weights.stable * (stable[color] - stable[-color]);

    // 3. X打ちとC打ちのペナルティ
    const xc = this.countXCSquares(board);
    score += weights.x * (xc.x[color] - xc.x[-color]);
    score += weights.c * (xc.c[color] - xc.c[-color]);

    // 4. 着手可能数（モビリティ）
    const mobility = {
      1: board.getValidMoves(1).length,
      [-1]: board.getValidMoves(-1).length
    };
    score += weights.mobility * (mobility[color] - mobility[-color]);

    // 5. フロンティア石
    const frontier = this.countFrontierDiscs(board);
    score += weights.frontier * (frontier[color] - frontier[-color]);

    // 6. 石数差（終盤重視）
    if (stage === 'endgame') {
      const diskDiff = color === 1 ? (black - white) : (white - black);
      score += weights.disk * diskDiff * (64 - emptyCount); // 終盤ほど重要
    }

    // 7. 偶数理論
    const parity = this.evaluateParity(board, color);
    score += weights.parity * parity;

    return score;
  }

  /**
   * ゲーム段階に応じた重み調整
   */
  getStageWeights(stage, emptyCount) {
    const w = { ...WEIGHTS };

    if (stage === 'opening') {
      w.mobility *= 2;
      w.x *= 2;
      w.c *= 2;
      w.stable *= 0.5;
      w.disk *= 0;
    } else if (stage === 'midgame') {
      w.stable *= 1.5;
      w.corner *= 1.5;
    } else { // endgame
      w.disk *= 10;
      w.stable *= 2;
      w.mobility *= 0.5;
    }

    return w;
  }

  /**
   * 角の占有数を数える
   */
  countCorners(board) {
    const count = { 1: 0, [-1]: 0 };
    for (const [x, y] of CORNERS) {
      const piece = board.board[y][x];
      if (piece !== 0) count[piece]++;
    }
    return count;
  }

  /**
   * 確定石を数える（簡易版：角からの連続石）
   */
  countStableDiscs(board) {
    const count = { 1: 0, [-1]: 0 };
    const stable = Array(8).fill(null).map(() => Array(8).fill(false));

    // 各角から確定石を探索
    for (const [cx, cy] of CORNERS) {
      const piece = board.board[cy][cx];
      if (piece === 0) continue;

      // 角は確定
      if (!stable[cy][cx]) {
        stable[cy][cx] = true;
        count[piece]++;
      }

      // 角から縦横に連続する同色石を確定石とする
      const dirs = [[1,0], [0,1], [-1,0], [0,-1]];
      for (const [dx, dy] of dirs) {
        let x = cx + dx;
        let y = cy + dy;
        while (x >= 0 && x < 8 && y >= 0 && y < 8) {
          if (board.board[y][x] === piece && !stable[y][x]) {
            stable[y][x] = true;
            count[piece]++;
          } else if (board.board[y][x] !== piece) {
            break;
          }
          x += dx;
          y += dy;
        }
      }
    }

    return count;
  }

  /**
   * X打ちとC打ちの数を数える
   */
  countXCSquares(board) {
    const count = {
      x: { 1: 0, [-1]: 0 },
      c: { 1: 0, [-1]: 0 }
    };

    // X打ちは角が空の場合のみカウント
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = CORNERS[i];
      if (board.board[cy][cx] === 0) {
        const [xx, xy] = X_SQUARES[i];
        const piece = board.board[xy][xx];
        if (piece !== 0) count.x[piece]++;
      }
    }

    // C打ちも角が空の場合のみカウント
    for (const [x, y] of C_SQUARES) {
      const piece = board.board[y][x];
      if (piece === 0) continue;

      // 隣接する角が空かチェック
      for (const [cx, cy] of CORNERS) {
        if ((Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1) && board.board[cy][cx] === 0) {
          count.c[piece]++;
          break;
        }
      }
    }

    return count;
  }

  /**
   * フロンティア石（空白に隣接する石）を数える
   */
  countFrontierDiscs(board) {
    const count = { 1: 0, [-1]: 0 };
    const frontier = Array(8).fill(null).map(() => Array(8).fill(false));

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board.board[y][x];
        if (piece === 0 || frontier[y][x]) continue;

        // 隣接マスに空白があるか確認
        let isFrontier = false;
        for (const [dx, dy] of DIRECTIONS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board.board[ny][nx] === 0) {
            isFrontier = true;
            break;
          }
        }

        if (isFrontier) {
          frontier[y][x] = true;
          count[piece]++;
        }
      }
    }

    return count;
  }

  /**
   * 偶数理論の評価
   */
  evaluateParity(board, color) {
    // 簡易版：全体の空きマス数の偶奇で評価
    const emptyCount = board.countEmpty();

    // 自分の手番で偶数個の空きがある = 最後の手を打てる可能性が高い
    if (emptyCount % 2 === 0) {
      return color === 1 ? 1 : -1; // 黒番なら有利
    } else {
      return color === -1 ? 1 : -1; // 白番なら有利
    }
  }

  /**
   * ヘルパー関数群
   */
  isCorner(x, y) {
    return CORNERS.some(([cx, cy]) => cx === x && cy === y);
  }

  isXSquare(x, y) {
    return X_SQUARES.some(([xx, xy]) => xx === x && xy === y);
  }

  isCSquare(x, y) {
    return C_SQUARES.some(([cx, cy]) => cx === x && cy === y);
  }

  isTimeUp() {
    if (this.timeOut) return true;
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= TIME_CUTOFF_MS) {
      this.timeOut = true;
      return true;
    }
    return false;
  }

  addKillerMove(depth, move) {
    if (depth >= this.killerMoves.length) return;
    if (!this.killerMoves[depth].some(m => m && m.x === move.x && m.y === move.y)) {
      this.killerMoves[depth].unshift(move);
      this.killerMoves[depth] = this.killerMoves[depth].slice(0, 2);
    }
  }

  updateHistory(move, depth) {
    const key = `${move.x},${move.y}`;
    this.historyTable[key] = (this.historyTable[key] || 0) + depth * depth;
  }

  storeTransposition(hash, depth, value, flag, bestMove) {
    this.transpositionTable.set(hash, {
      depth,
      value,
      flag,
      bestMove
    });

    // メモリ制限（10万エントリまで）
    if (this.transpositionTable.size > 100000) {
      const keysToDelete = [];
      let count = 0;
      for (const key of this.transpositionTable.keys()) {
        keysToDelete.push(key);
        if (++count >= 10000) break;
      }
      keysToDelete.forEach(key => this.transpositionTable.delete(key));
    }
  }
}

// グローバルに公開
window.HayashiMasahiroAI = HayashiMasahiroAI;
