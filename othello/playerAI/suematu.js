// myAi.js
// プレイヤーが改造して遊ぶ用の AI クラス MyAI
// インターフェース仕様: getMove(board, color) を持ち、{x: number, y: number} を返す
// color: 1=黒, -1=白

// myAi.js (改良版26 - 修正済み)
// - MCTSの思考時間を延長し、勝率を向上
// - 終盤の引き分けに特化したロジックを追加し、安定性を強化

class SuematuAI {
    constructor() {
        this.openingThreshold = 8;
        this.openingBook = {
            "start_black": [
                [{ x: 2, y: 3 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 3 }],
                [{ x: 3, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 4 }],
                [{ x: 2, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 3 }, { x: 3, y: 5 }],
                [{ x: 4, y: 2 }, { x: 2, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 3 }],
                [{ x: 5, y: 3 }, { x: 2, y: 4 }, { x: 4, y: 2 }, { x: 3, y: 5 }],
                [{ x: 2, y: 5 }, { x: 3, y: 2 }, { x: 5, y: 5 }, { x: 4, y: 2 }]
            ],
            "start_white": [
                [{ x: 4, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 2, y: 4 }],
                [{ x: 2, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 3 }, { x: 3, y: 5 }],
                [{ x: 5, y: 4 }, { x: 2, y: 4 }, { x: 5, y: 5 }, { x: 2, y: 2 }],
                [{ x: 3, y: 5 }, { x: 5, y: 4 }, { x: 2, y: 5 }, { x: 4, y: 2 }],
                [{ x: 5, y: 3 }, { x: 2, y: 4 }, { x: 4, y: 2 }, { x: 3, y: 5 }],
                [{ x: 2, y: 5 }, { x: 3, y: 2 }, { x: 5, y: 5 }, { x: 4, y: 2 }]
            ]
        };
    }

    isCorner(x, y) { return (x === 0 || x === 7) && (y === 0 || y === 7); }

    getMCTSMove(board, color) {
        // ルートノードは現在の盤面と手番(color)で初期化
        const root = new MCTSNodeSuematu(board, color);
        const startTime = Date.now();
        // MCTSの思考時間を延長
        const timeLimit = 800; 

        while (Date.now() - startTime < timeLimit) {
            let node = root;
            // 選択 (Selection)
            while (node.untriedMoves.length === 0 && node.children.length > 0) {
                // UCT値が最大の子ノードを選択
                node = node.children.sort((a, b) => b.getUCT() - a.getUCT())[0];
            }
            
            // 展開 (Expansion)
            if (node.untriedMoves.length > 0) {
                // 未試行の手の中からランダムな手を選択
                const randomMove = node.untriedMoves.shift();
                const newBoard = node.board.clone();
                // 選択した手で盤面を更新
                newBoard.applyMove(randomMove.x, randomMove.y, node.turn);
                // 子ノードは、更新後の盤面と、**次の手番** (-node.turn) で初期化
                const childNode = new MCTSNodeSuematu(newBoard, -node.turn, node, randomMove);
                node.children.push(childNode);
                node = childNode;
            }

            // シミュレーション (Simulation)
            // シミュレーションは、展開されたノード (childNode) の手番から開始
            const result = node.simulate();
            
            // 逆伝播 (Backpropagation)
            node.backpropagate(result);
        }
        
        if (root.children.length === 0) {
            const moves = board.getValidMoves(color);
            // 合法手がなければ、nullを返す（本来はAI外で処理）
            return moves.length > 0 ? moves[0] : null; 
        }
        
        // 引き分けを意識した最終的な手番の選択
        const empty = board.countEmpty();
        if (empty <= 10) {
            // 終盤は、勝率だけでなく引き分け（スコア0.5）も評価に入れる
            const sortedChildren = root.children.sort((a, b) => {
                // 訪問回数が0のノードは除外、または非常に低い評価を与える
                if (a.visits === 0) return b.visits === 0 ? 0 : 1;
                if (b.visits === 0) return -1;

                const scoreA = a.wins / a.visits;
                const scoreB = b.wins / b.visits;
                
                // 勝利(>0.5)と引き分け(0.5)を重視。引き分けは勝利に近い重み (例: 0.51) を与える
                const evalA = (scoreA > 0.5) ? scoreA : (scoreA === 0.5) ? 0.51 : scoreA;
                const evalB = (scoreB > 0.5) ? scoreB : (scoreB === 0.5) ? 0.51 : scoreB;
                
                return evalB - evalA;
            });
            // 評価が最も高い手を選択
            return sortedChildren[0].move;
        }
        
        // 通常は訪問回数が最も多いノードを選択
        return root.children.sort((a, b) => b.visits - a.visits)[0].move;
    }

    getMove(board, color) {
        const moves = board.getValidMoves(color);
        if (!moves || moves.length === 0) return null;

        const openingMove = this.getOpeningMove(board, color);
        if (openingMove) return openingMove;

        // 隅は常に最優先
        for (const m of moves) {
            if (this.isCorner(m.x, m.y)) return m;
        }
        
        return this.getMCTSMove(board, color);
    }
    
    getOpeningMove(board, color) {
        const moves = board.getValidMoves(color);
        const totalMoves = 64 - board.countEmpty();

        if (totalMoves <= this.openingThreshold) {
            const key = (color === 1 ? "start_black" : "start_white");
            if (this.openingBook[key]) {
                const bookLines = this.openingBook[key];
                // ランダムにオープニングラインを選択
                const chosenLine = bookLines[Math.floor(Math.random() * bookLines.length)];
                
                // 現在の手番に該当する手を探し、それが合法手であれば返す
                // totalMovesは1ターン後の盤面の手数を数えている可能性があるので、ここはシンプルに現在の盤面にある石の数+1がそのラインの何番目の手かを見て選択する
                const moveIndex = Math.floor(totalMoves / 2); // 0, 1, 2, ...
                
                if (moveIndex < chosenLine.length) {
                    const bookMove = chosenLine[moveIndex];
                    if (moves.some(m => m.x === bookMove.x && m.y === bookMove.y)) {
                        return bookMove;
                    }
                }
            }
        }
        return null;
    }
}

class MCTSNodeSuematu {
    constructor(board, turn, parent = null, move = null) {
        this.board = board;
        this.turn = turn; // このノードで手番を持つプレイヤー (1 or -1)
        this.parent = parent;
        this.move = move;
        this.wins = 0;
        this.visits = 0;
        this.children = [];
        // このノードの手番 (this.turn) の合法手
        this.untriedMoves = this.board.getValidMoves(this.turn);
    }
    getUCT() {
        if (this.visits === 0) return Infinity;
        const c = 1.414; // 探索係数
        return (this.wins / this.visits) + c * Math.sqrt(Math.log(this.parent.visits) / this.visits);
    }
    simulate() {
        let tempBoard = this.board.clone();
        let turn = this.turn; // シミュレーション開始時の手番
        let consecutivePasses = 0; // 連続パス回数

        while (!tempBoard.isGameOver() && consecutivePasses < 2) {
            const moves = tempBoard.getValidMoves(turn);
            if (moves.length === 0) {
                // パス処理
                consecutivePasses++;
                turn = -turn;
                continue;
            }
            consecutivePasses = 0; // 手を置けたのでパス回数をリセット
            
            // ランダムな手を選択して適用
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            // applyMoveの戻り値は確認しない（合法手を選んでいるため）
            tempBoard.applyMove(randomMove.x, randomMove.y, turn);
            
            // 手番を交代
            turn = -turn;
        }
        
        const scoreDiff = tempBoard.getScoreDiff();
        // シミュレーション結果を、勝利(1)、引き分け(0.5)、敗北(0)で評価
        // this.turn はルートノード（AI自身）の手番
        if (scoreDiff * this.parent.turn > 0) return 1; // AIが勝利
        if (scoreDiff * this.parent.turn === 0) return 0.5; // 引き分け
        return 0; // AIが敗北
    }
    backpropagate(result) {
        this.visits++;
        // シミュレーション結果を加算
        this.wins += result;
        if (this.parent) {
            // 親ノードに結果を伝播
            // MCTSのBackpropagationでは、親ノードも同じ結果で更新するのが標準的
            this.parent.backpropagate(result);
        }
    }
}
window.SuematuAI = SuematuAI;