const PIECES = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

const NAMES = {
  white: "白方",
  black: "黑方",
  king: "王",
  queen: "后",
  rook: "车",
  bishop: "象",
  knight: "马",
  pawn: "兵",
};

const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#reset");
const undoButton = document.querySelector("#undo");
const flipButton = document.querySelector("#flip");
const soundButton = document.querySelector("#sound");
const capturedWhiteElement = document.querySelector("#captured-white");
const capturedBlackElement = document.querySelector("#captured-black");
const moveListElement = document.querySelector("#move-list");
const promotionElement = document.querySelector("#promotion");
const promotionButtons = document.querySelectorAll("#promotion [data-piece]");
const fileLabels = document.querySelectorAll(".files span");
const rankLabels = document.querySelectorAll(".ranks span");

let board;
let turn;
let selected = null;
let legalTargets = [];
let flipped = false;
let gameOver = false;
let lastMove = null;
let history = [];
let pendingPromotionMove = null;
let soundEnabled = true;
let audioContext = null;

function createInitialBoard() {
  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      if (row === 0) return { color: "black", type: backRank[col], moved: false };
      if (row === 1) return { color: "black", type: "pawn", moved: false };
      if (row === 6) return { color: "white", type: "pawn", moved: false };
      if (row === 7) return { color: "white", type: backRank[col], moved: false };
      return null;
    }),
  );
}

function resetGame() {
  board = createInitialBoard();
  turn = "white";
  selected = null;
  legalTargets = [];
  gameOver = false;
  lastMove = null;
  history = [];
  pendingPromotionMove = null;
  hidePromotionDialog();
  updateStatus();
  renderBoard();
  renderCoordinates();
  renderGameInfo();
}

function renderCoordinates() {
  const files = flipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = flipped ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["8", "7", "6", "5", "4", "3", "2", "1"];

  fileLabels.forEach((label, index) => {
    label.textContent = files[index % 8];
  });
  rankLabels.forEach((label, index) => {
    label.textContent = ranks[index % 8];
  });
}

function renderBoard() {
  boardElement.innerHTML = "";
  const rows = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const checkedKing = findKingInCheck(board, turn);

  rows.forEach((row) => {
    cols.forEach((col) => {
      const square = document.createElement("button");
      const piece = board[row][col];
      const isLight = (row + col) % 2 === 0;
      const isSelected = selected?.row === row && selected?.col === col;
      const target = legalTargets.find((move) => move.to.row === row && move.to.col === col);
      const isCheckedKing = checkedKing?.row === row && checkedKing?.col === col;
      const isLastFrom = lastMove?.from.row === row && lastMove?.from.col === col;
      const isLastTo = lastMove?.to.row === row && lastMove?.to.col === col;

      square.type = "button";
      square.className = [
        "square",
        isLight ? "light" : "dark",
        isSelected ? "selected" : "",
        target && !piece ? "legal" : "",
        target && piece ? "capture" : "",
        isCheckedKing ? "check" : "",
        isLastFrom || isLastTo ? "last" : "",
      ]
        .filter(Boolean)
        .join(" ");
      square.setAttribute("role", "gridcell");
      square.setAttribute("aria-label", describeSquare(row, col, piece));
      square.addEventListener("click", () => handleSquareClick(row, col));

      if (piece) {
        const pieceElement = document.createElement("span");
        pieceElement.className = `piece ${piece.color}`;
        pieceElement.textContent = PIECES[piece.color][piece.type];
        pieceElement.setAttribute("aria-hidden", "true");
        square.append(pieceElement);
      }

      boardElement.append(square);
    });
  });
}

function describeSquare(row, col, piece) {
  const file = String.fromCharCode(97 + col);
  const rank = 8 - row;
  return piece ? `${file}${rank}，${NAMES[piece.color]}${NAMES[piece.type]}` : `${file}${rank}，空格`;
}

function handleSquareClick(row, col) {
  if (gameOver || pendingPromotionMove) return;

  const piece = board[row][col];
  const chosenMove = legalTargets.find((move) => move.to.row === row && move.to.col === col);

  if (chosenMove) {
    if (shouldPromote(chosenMove)) {
      pendingPromotionMove = chosenMove;
      showPromotionDialog(board[chosenMove.from.row][chosenMove.from.col].color);
      return;
    }
    finishMove(chosenMove);
    return;
  }

  if (piece?.color === turn) {
    selected = { row, col };
    legalTargets = getLegalMoves(board, row, col);
  } else {
    selected = null;
    legalTargets = [];
  }

  renderBoard();
}

function finishMove(move) {
  applyMove(move);
  selected = null;
  legalTargets = [];
  pendingPromotionMove = null;
  hidePromotionDialog();
  turn = opposite(turn);
  updateStatus();
  renderBoard();
  renderGameInfo();
  playMoveSound(Boolean(lastMove.captured));
}

function applyMove(move) {
  const piece = board[move.from.row][move.from.col];
  const enPassantDirection = piece.color === "white" ? 1 : -1;
  const captured = move.enPassant ? board[move.to.row + enPassantDirection][move.to.col] : board[move.to.row][move.to.col];
  const snapshot = {
    board: cloneBoard(board),
    turn,
    lastMove: lastMove ? { ...lastMove, piece: { ...lastMove.piece }, captured: lastMove.captured ? { ...lastMove.captured } : null } : null,
    gameOver,
  };

  board[move.to.row][move.to.col] = { ...piece, moved: true };
  board[move.from.row][move.from.col] = null;

  if (move.castle) {
    const rookFromCol = move.castle === "king" ? 7 : 0;
    const rookToCol = move.castle === "king" ? 5 : 3;
    const rook = board[move.from.row][rookFromCol];
    board[move.from.row][rookToCol] = { ...rook, moved: true };
    board[move.from.row][rookFromCol] = null;
  }

  if (move.enPassant) {
    board[move.to.row + enPassantDirection][move.to.col] = null;
  }

  if (piece.type === "pawn" && (move.to.row === 0 || move.to.row === 7)) {
    board[move.to.row][move.to.col].type = move.promotion || "queen";
  }

  lastMove = { ...move, piece, captured, notation: formatMove(move, piece, captured) };
  history.push({ snapshot, move: lastMove });
}

function playMoveSound(isCapture) {
  if (!soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();

  const now = audioContext.currentTime;
  if (isCapture) {
    playTone(220, now, 0.08, 0.11, "triangle");
    playTone(130, now + 0.055, 0.12, 0.08, "sawtooth");
    return;
  }

  playTone(420, now, 0.045, 0.055, "sine");
  playTone(560, now + 0.045, 0.055, 0.04, "sine");
}

function playTone(frequency, startTime, duration, volume, type) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function updateSoundButton() {
  soundButton.textContent = soundEnabled ? "音效开" : "音效关";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
}

function shouldPromote(move) {
  const piece = board[move.from.row][move.from.col];
  return piece?.type === "pawn" && (move.to.row === 0 || move.to.row === 7);
}

function showPromotionDialog(color) {
  promotionButtons.forEach((button) => {
    const type = button.dataset.piece;
    button.textContent = `${PIECES[color][type]} ${NAMES[type]}`;
  });
  promotionElement.classList.remove("hidden");
}

function hidePromotionDialog() {
  promotionElement.classList.add("hidden");
}

function undoMove() {
  const last = history.pop();
  if (!last) return;
  board = cloneBoard(last.snapshot.board);
  turn = last.snapshot.turn;
  lastMove = last.snapshot.lastMove;
  gameOver = last.snapshot.gameOver;
  selected = null;
  legalTargets = [];
  pendingPromotionMove = null;
  hidePromotionDialog();
  updateStatus();
  renderBoard();
  renderGameInfo();
}

function renderGameInfo() {
  undoButton.disabled = history.length === 0;
  const capturedByWhite = history.map(({ move }) => (move.piece.color === "white" ? move.captured : null)).filter(Boolean);
  const capturedByBlack = history.map(({ move }) => (move.piece.color === "black" ? move.captured : null)).filter(Boolean);
  capturedWhiteElement.textContent = formatCaptured(capturedByWhite);
  capturedBlackElement.textContent = formatCaptured(capturedByBlack);
  moveListElement.innerHTML = "";
  history.forEach(({ move }, index) => {
    if (move.piece.color === "white") {
      const item = document.createElement("li");
      item.innerHTML = `<span>${Math.floor(index / 2) + 1}.</span><b>${move.notation}</b><em></em>`;
      moveListElement.append(item);
    } else {
      const item = moveListElement.lastElementChild || document.createElement("li");
      if (!item.parentElement) {
        item.innerHTML = `<span>${Math.floor(index / 2) + 1}.</span><b></b><em></em>`;
        moveListElement.append(item);
      }
      item.querySelector("em").textContent = move.notation;
    }
  });
  moveListElement.scrollTop = moveListElement.scrollHeight;
}

function formatCaptured(captured) {
  return captured.length ? captured.map((piece) => PIECES[piece.color][piece.type]).join("") : "—";
}

function formatMove(move, piece, captured) {
  const from = squareName(move.from.row, move.from.col);
  const to = squareName(move.to.row, move.to.col);
  const captureMark = captured ? "×" : "-";
  const promotion = move.promotion ? `=${NAMES[move.promotion]}` : "";
  if (move.castle === "king") return "O-O";
  if (move.castle === "queen") return "O-O-O";
  return `${NAMES[piece.type]}${from}${captureMark}${to}${promotion}`;
}

function squareName(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function updateStatus() {
  const legalCount = countLegalMoves(board, turn);
  const inCheck = isKingInCheck(board, turn);

  if (legalCount === 0) {
    gameOver = true;
    statusElement.textContent = inCheck ? `将死，${NAMES[opposite(turn)]}获胜。` : "逼和，无合法走法。";
    return;
  }

  statusElement.textContent = `${NAMES[turn]}行棋${inCheck ? "，正在被将军" : ""}`;
}

function getLegalMoves(currentBoard, row, col) {
  const piece = currentBoard[row][col];
  if (!piece) return [];

  return getPseudoMoves(currentBoard, row, col).filter((move) => {
    const nextBoard = cloneBoard(currentBoard);
    makeMoveOnBoard(nextBoard, move);
    return !isKingInCheck(nextBoard, piece.color);
  });
}

function getPseudoMoves(currentBoard, row, col) {
  const piece = currentBoard[row][col];
  if (!piece) return [];

  if (piece.type === "pawn") return getPawnMoves(currentBoard, row, col, piece);
  if (piece.type === "knight") return getStepMoves(currentBoard, row, col, piece, knightSteps);
  if (piece.type === "king") return [...getStepMoves(currentBoard, row, col, piece, kingSteps), ...getCastleMoves(currentBoard, row, col, piece)];
  if (piece.type === "bishop") return getRayMoves(currentBoard, row, col, piece, bishopRays);
  if (piece.type === "rook") return getRayMoves(currentBoard, row, col, piece, rookRays);
  if (piece.type === "queen") return getRayMoves(currentBoard, row, col, piece, [...bishopRays, ...rookRays]);
  return [];
}

const knightSteps = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const kingSteps = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const bishopRays = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const rookRays = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function getPawnMoves(currentBoard, row, col, piece) {
  const direction = piece.color === "white" ? -1 : 1;
  const startRow = piece.color === "white" ? 6 : 1;
  const moves = [];
  const oneStep = row + direction;
  const twoStep = row + direction * 2;

  if (isInside(oneStep, col) && !currentBoard[oneStep][col]) {
    moves.push(createMove(row, col, oneStep, col));
    if (row === startRow && !currentBoard[twoStep][col]) {
      moves.push(createMove(row, col, twoStep, col));
    }
  }

  [-1, 1].forEach((offset) => {
    const targetCol = col + offset;
    if (!isInside(oneStep, targetCol)) return;
    const target = currentBoard[oneStep][targetCol];
    if (target && target.color !== piece.color) {
      moves.push(createMove(row, col, oneStep, targetCol));
    }
    if (canEnPassant(currentBoard, row, col, oneStep, targetCol, piece)) {
      moves.push({ ...createMove(row, col, oneStep, targetCol), enPassant: true });
    }
  });

  return moves;
}

function canEnPassant(currentBoard, row, col, targetRow, targetCol, piece) {
  if (!lastMove?.piece || lastMove.piece.type !== "pawn") return false;
  const requiredRow = piece.color === "white" ? 3 : 4;
  return (
    row === requiredRow &&
    lastMove.from.row === (piece.color === "white" ? 1 : 6) &&
    lastMove.to.row === row &&
    lastMove.to.col === targetCol &&
    Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
    Math.abs(col - targetCol) === 1 &&
    !currentBoard[targetRow][targetCol]
  );
}

function getStepMoves(currentBoard, row, col, piece, steps) {
  return steps.flatMap(([rowDelta, colDelta]) => {
    const targetRow = row + rowDelta;
    const targetCol = col + colDelta;
    if (!isInside(targetRow, targetCol)) return [];
    const target = currentBoard[targetRow][targetCol];
    return !target || target.color !== piece.color ? [createMove(row, col, targetRow, targetCol)] : [];
  });
}

function getRayMoves(currentBoard, row, col, piece, rays) {
  const moves = [];
  rays.forEach(([rowDelta, colDelta]) => {
    let targetRow = row + rowDelta;
    let targetCol = col + colDelta;
    while (isInside(targetRow, targetCol)) {
      const target = currentBoard[targetRow][targetCol];
      if (!target) {
        moves.push(createMove(row, col, targetRow, targetCol));
      } else {
        if (target.color !== piece.color) moves.push(createMove(row, col, targetRow, targetCol));
        break;
      }
      targetRow += rowDelta;
      targetCol += colDelta;
    }
  });
  return moves;
}

function getCastleMoves(currentBoard, row, col, piece) {
  if (piece.moved || isKingInCheck(currentBoard, piece.color)) return [];
  const moves = [];
  const rank = piece.color === "white" ? 7 : 0;
  if (row !== rank || col !== 4) return moves;

  [
    { side: "king", rookCol: 7, between: [5, 6], safe: [5, 6], to: 6 },
    { side: "queen", rookCol: 0, between: [1, 2, 3], safe: [3, 2], to: 2 },
  ].forEach(({ side, rookCol, between, safe, to }) => {
    const rook = currentBoard[rank][rookCol];
    const pathClear = between.every((pathCol) => !currentBoard[rank][pathCol]);
    const pathSafe = safe.every((safeCol) => !isSquareAttacked(currentBoard, rank, safeCol, opposite(piece.color)));
    if (rook?.type === "rook" && rook.color === piece.color && !rook.moved && pathClear && pathSafe) {
      moves.push({ ...createMove(row, col, rank, to), castle: side });
    }
  });

  return moves;
}

function makeMoveOnBoard(targetBoard, move) {
  const piece = targetBoard[move.from.row][move.from.col];
  targetBoard[move.to.row][move.to.col] = { ...piece, moved: true };
  targetBoard[move.from.row][move.from.col] = null;

  if (move.castle) {
    const rookFromCol = move.castle === "king" ? 7 : 0;
    const rookToCol = move.castle === "king" ? 5 : 3;
    const rook = targetBoard[move.from.row][rookFromCol];
    targetBoard[move.from.row][rookToCol] = { ...rook, moved: true };
    targetBoard[move.from.row][rookFromCol] = null;
  }

  if (move.enPassant) {
    const direction = piece.color === "white" ? 1 : -1;
    targetBoard[move.to.row + direction][move.to.col] = null;
  }

  if (piece.type === "pawn" && (move.to.row === 0 || move.to.row === 7)) {
    targetBoard[move.to.row][move.to.col].type = "queen";
  }
}

function isKingInCheck(currentBoard, color) {
  const king = findKing(currentBoard, color);
  return king ? isSquareAttacked(currentBoard, king.row, king.col, opposite(color)) : false;
}

function findKingInCheck(currentBoard, color) {
  const king = findKing(currentBoard, color);
  return king && isKingInCheck(currentBoard, color) ? king : null;
}

function findKing(currentBoard, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = currentBoard[row][col];
      if (piece?.color === color && piece.type === "king") return { row, col };
    }
  }
  return null;
}

function isSquareAttacked(currentBoard, row, col, byColor) {
  for (let sourceRow = 0; sourceRow < 8; sourceRow += 1) {
    for (let sourceCol = 0; sourceCol < 8; sourceCol += 1) {
      const piece = currentBoard[sourceRow][sourceCol];
      if (piece?.color !== byColor) continue;
      if (attacksSquare(currentBoard, sourceRow, sourceCol, row, col, piece)) return true;
    }
  }
  return false;
}

function attacksSquare(currentBoard, fromRow, fromCol, targetRow, targetCol, piece) {
  const rowDelta = targetRow - fromRow;
  const colDelta = targetCol - fromCol;

  if (piece.type === "pawn") {
    const direction = piece.color === "white" ? -1 : 1;
    return rowDelta === direction && Math.abs(colDelta) === 1;
  }
  if (piece.type === "knight") {
    return knightSteps.some(([stepRow, stepCol]) => stepRow === rowDelta && stepCol === colDelta);
  }
  if (piece.type === "king") {
    return Math.max(Math.abs(rowDelta), Math.abs(colDelta)) === 1;
  }

  const rays = piece.type === "bishop" ? bishopRays : piece.type === "rook" ? rookRays : [...bishopRays, ...rookRays];
  return rays.some(([rayRow, rayCol]) => {
    if (!isSameRay(rowDelta, colDelta, rayRow, rayCol)) return false;
    let checkRow = fromRow + rayRow;
    let checkCol = fromCol + rayCol;
    while (checkRow !== targetRow || checkCol !== targetCol) {
      if (currentBoard[checkRow][checkCol]) return false;
      checkRow += rayRow;
      checkCol += rayCol;
    }
    return true;
  });
}

function isSameRay(rowDelta, colDelta, rayRow, rayCol) {
  if (rayRow === 0) return rowDelta === 0 && Math.sign(colDelta) === rayCol;
  if (rayCol === 0) return colDelta === 0 && Math.sign(rowDelta) === rayRow;
  return Math.abs(rowDelta) === Math.abs(colDelta) && Math.sign(rowDelta) === rayRow && Math.sign(colDelta) === rayCol;
}

function countLegalMoves(currentBoard, color) {
  let total = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (currentBoard[row][col]?.color === color) total += getLegalMoves(currentBoard, row, col).length;
    }
  }
  return total;
}

function createMove(fromRow, fromCol, toRow, toCol) {
  return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
}

function cloneBoard(currentBoard) {
  return currentBoard.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function isInside(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function opposite(color) {
  return color === "white" ? "black" : "white";
}

resetButton.addEventListener("click", resetGame);
undoButton.addEventListener("click", undoMove);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
});
promotionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!pendingPromotionMove) return;
    finishMove({ ...pendingPromotionMove, promotion: button.dataset.piece });
  });
});

flipButton.addEventListener("click", () => {
  flipped = !flipped;
  flipButton.setAttribute("aria-pressed", String(flipped));
  renderCoordinates();
  renderBoard();
});

updateSoundButton();
resetGame();
