// board.js
// オセロの盤面管理クラス Board
// 0=空, 1=黒, -1=白

class Board {
  constructor() {
    // 8x8 の二次元配列を初期化
    this.board = Array.from({ length: 8 }, () => Array(8).fill(0));
    // 初期配置（中央に白黒）
    this.board[3][3] = -1;
    this.board[3][4] = 1;
    this.board[4][3] = 1;
    this.board[4][4] = -1;
  }

  // 座標が盤面内か判定
  inBounds(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  // 指定位置のセル値を返す (0=空, 1=黒, -1=白, null=範囲外)
  get(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.board[y][x];
  }

  // 指定色の合法手を返す
  getValidMoves(color) {
    const moves = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (this.board[y][x] !== 0) continue; // すでに石あり
        if (this.canFlip(x, y, color)) {
          moves.push({ x, y });
        }
      }
    }
    return moves;
  }

  // ある位置に置いたときにひっくり返せるかどうか
  canFlip(x, y, color) {
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    for (const [dx, dy] of dirs) {
      let nx = x + dx;
      let ny = y + dy;
      let foundOpponent = false;
      while (this.inBounds(nx, ny)) {
        if (this.board[ny][nx] === -color) {
          foundOpponent = true;
          nx += dx;
          ny += dy;
        } else if (this.board[ny][nx] === color) {
          if (foundOpponent) return true;
          else break;
        } else {
          break;
        }
      }
    }
    return false;
  }

  // ある位置に置いたときにひっくり返る石のリストを返す
  getFlippedDiscs(x, y, color) {
    const flipsAll = [];
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    for (const [dx, dy] of dirs) {
      let nx = x + dx;
      let ny = y + dy;
      const flips = [];
      while (this.inBounds(nx, ny) && this.board[ny][nx] === -color) {
        flips.push({ x: nx, y: ny });
        nx += dx;
        ny += dy;
      }
      if (this.inBounds(nx, ny) && this.board[ny][nx] === color && flips.length > 0) {
        flipsAll.push(...flips);
      }
    }
    return flipsAll;
  }

  // ある位置に置いたときにひっくり返る石の枚数を返す
  getFlippedCount(x, y, color) {
    return this.getFlippedDiscs(x, y, color).length;
  }

  // 指定位置に石を置き、盤面更新
  applyMove(x, y, color) {
    if (!this.inBounds(x, y) || this.board[y][x] !== 0) return false;
    if (!this.canFlip(x, y, color)) return false;

    this.board[y][x] = color;
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    for (const [dx, dy] of dirs) {
      const flips = [];
      let nx = x + dx;
      let ny = y + dy;
      while (this.inBounds(nx, ny) && this.board[ny][nx] === -color) {
        flips.push([nx, ny]);
        nx += dx;
        ny += dy;
      }
      if (this.inBounds(nx, ny) && this.board[ny][nx] === color) {
        for (const [fx, fy] of flips) {
          this.board[fy][fx] = color;
        }
      }
    }
    return true;
  }

  // 盤面のコピーを返す
  clone() {
    const newBoard = new Board();
    newBoard.board = this.board.map(row => row.slice());
    return newBoard;
  }

  // 石の数を数える
  countDiscs() {
    let black = 0, white = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (this.board[y][x] === 1) black++;
        else if (this.board[y][x] === -1) white++;
      }
    }
    return { black, white };
  }

  // 黒-白のスコア差を返す
  getScoreDiff() {
    const { black, white } = this.countDiscs();
    return black - white;
  }

  // 空きマスの残り数を返す
  countEmpty() {
    let empty = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (this.board[y][x] === 0) empty++;
      }
    }
    return empty;
  }

  // 終局判定（どちらも合法手なし）
  isGameOver() {
    return this.getValidMoves(1).length === 0 && this.getValidMoves(-1).length === 0;
  }
}

// グローバルに公開
window.Board = Board;
