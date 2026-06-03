const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const difficultySelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restart');

const PIECES = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

const startPosition = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

let board = [];
let selected = null;
let turn = 'w';
let gameOver = false;

function cloneBoard(src) {
  return src.map(row => [...row]);
}

function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}

function getColor(piece) {
  if (!piece) return null;
  return isWhite(piece) ? 'w' : 'b';
}

function inRange(value) {
  return value >= 0 && value < 8;
}

function init() {
  board = cloneBoard(startPosition);
  selected = null;
  turn = 'w';
  gameOver = false;
  statusElement.textContent = 'Ход белых';
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = document.createElement('div');
      square.className = 'square ' + (((x + y) % 2) ? 'dark' : 'light');
      const piece = board[y][x];
      if (piece) {
        square.textContent = PIECES[piece];
        square.classList.add(getColor(piece) === 'w' ? 'white-piece' : 'black-piece');
      }
      if (selected && selected.x === x && selected.y === y) {
        square.classList.add('selected');
      }
      if (selected) {
        const moves = getLegalMoves(board, selected.x, selected.y, turn);
        if (moves.some(m => m.x === x && m.y === y)) {
          square.classList.add('move-target');
        }
      }
      square.addEventListener('click', () => onSquareClick(x, y));
      boardElement.appendChild(square);
    }
  }
}

function onSquareClick(x, y) {
  if (gameOver) return;
  const piece = board[y][x];

  if (selected && selected.x === x && selected.y === y) {
    selected = null;
    renderBoard();
    return;
  }

  if (selected) {
    const moves = getLegalMoves(board, selected.x, selected.y, turn);
    const move = moves.find(m => m.x === x && m.y === y);
    if (move) {
      makeMove(selected.x, selected.y, x, y, move.promotion);
      return;
    }
  }

  if (piece && getColor(piece) === turn) {
    selected = { x, y };
    renderBoard();
  }
}

function makeMove(sx, sy, tx, ty, promotion = false) {
  const piece = board[sy][sx];
  board[sy][sx] = '';
  board[ty][tx] = promotion ? (piece === 'P' ? 'Q' : 'q') : piece;
  selected = null;
  toggleTurn();
  renderBoard();
  checkGameEnd();
  if (!gameOver && turn === 'b') {
    setTimeout(aiMove, 200);
  }
}

function toggleTurn() {
  turn = turn === 'w' ? 'b' : 'w';
  statusElement.textContent = turn === 'w' ? 'White to move' : 'Black to move';
}

function getLegalMoves(position, x, y, side) {
  const piece = position[y][x];
  if (!piece || getColor(piece) !== side) return [];
  const moves = [];
  const color = getColor(piece);
  const forward = color === 'w' ? -1 : 1;

  const addMove = (tx, ty, promotion = false) => {
    if (!inRange(tx) || !inRange(ty)) return;
    const target = position[ty][tx];
    if (!target || getColor(target) !== color) {
      moves.push({ x: tx, y: ty, promotion });
    }
  };

  const addPawnMoves = () => {
    const oneY = y + forward;
    const startRow = color === 'w' ? 6 : 1;
    if (inRange(oneY) && !position[oneY][x]) {
      addMove(x, oneY, oneY === 0 || oneY === 7);
      const twoY = y + forward * 2;
      if (y === startRow && inRange(twoY) && !position[twoY][x]) {
        addMove(x, twoY);
      }
    }
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      if (inRange(nx) && inRange(oneY)) {
        const target = position[oneY][nx];
        if (target && getColor(target) !== color) {
          addMove(nx, oneY, oneY === 0 || oneY === 7);
        }
      }
    }
  };

  const addSlideMoves = dirs => {
    for (const [dx, dy] of dirs) {
      let nx = x + dx;
      let ny = y + dy;
      while (inRange(nx) && inRange(ny)) {
        const target = position[ny][nx];
        if (!target) {
          addMove(nx, ny);
        } else {
          if (getColor(target) !== color) addMove(nx, ny);
          break;
        }
        nx += dx;
        ny += dy;
      }
    }
  };

  const addStepMoves = dirs => {
    for (const [dx, dy] of dirs) {
      addMove(x + dx, y + dy);
    }
  };

  switch (piece.toLowerCase()) {
    case 'p':
      addPawnMoves();
      break;
    case 'r':
      addSlideMoves([[1,0],[-1,0],[0,1],[0,-1]]);
      break;
    case 'n':
      addStepMoves([[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]);
      break;
    case 'b':
      addSlideMoves([[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    case 'q':
      addSlideMoves([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
    case 'k':
      addStepMoves([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
      break;
  }

  return moves;
}

function aiMove() {
  const depth = Math.max(1, parseInt(difficultySelect.value, 10));
  const move = findBestMove(board, depth);
  if (move) {
    makeMove(move.sx, move.sy, move.tx, move.ty, move.promotion);
  }
}

function findBestMove(position, depth) {
  const moves = getAllMoves(position, 'b');
  let best = null;
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = applyMove(position, move);
    const score = minimax(next, depth - 1, false, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function getAllMoves(position, side) {
  const moves = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = position[y][x];
      if (piece && getColor(piece) === side) {
        const legal = getLegalMoves(position, x, y, side);
        for (const move of legal) {
          moves.push({ sx: x, sy: y, tx: move.x, ty: move.y, promotion: move.promotion });
        }
      }
    }
  }
  return moves;
}

function applyMove(position, move) {
  const next = cloneBoard(position);
  const piece = next[move.sy][move.sx];
  next[move.sy][move.sx] = '';
  next[move.ty][move.tx] = move.promotion ? (piece === 'P' ? 'Q' : 'q') : piece;
  return next;
}

function evaluate(position) {
  let score = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = position[y][x];
      if (!piece) continue;
      const value = values[piece.toLowerCase()] || 0;
      score += getColor(piece) === 'b' ? value : -value;
    }
  }
  return score;
}

function minimax(position, depth, maximizing, alpha, beta) {
  if (depth === 0) return evaluate(position);
  const side = maximizing ? 'b' : 'w';
  const moves = getAllMoves(position, side);
  if (!moves.length) return evaluate(position);
  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const next = applyMove(position, move);
      const score = minimax(next, depth - 1, false, alpha, beta);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  }
  let minScore = Infinity;
  for (const move of moves) {
    const next = applyMove(position, move);
    const score = minimax(next, depth - 1, true, alpha, beta);
    minScore = Math.min(minScore, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return minScore;
}

function checkGameEnd() {
  const moves = getAllMoves(board, turn);
  if (!moves.length) {
    gameOver = true;
    statusElement.textContent = turn === 'w' ? 'Checkmate! Black wins' : 'Checkmate! White wins';
  }
}

restartBtn.addEventListener('click', init);
difficultySelect.addEventListener('change', () => {
  if (turn === 'b' && !gameOver) {
    setTimeout(aiMove, 150);
  }
});

init();
