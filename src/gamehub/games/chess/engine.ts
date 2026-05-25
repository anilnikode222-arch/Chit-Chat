import { BoardGrid, ChessPiece, Position, PieceColor, ChessMove, PieceType } from "./types";

/**
 * Initialize a premium, clean board layout
 */
export function createInitialBoard(): BoardGrid {
  const grid: BoardGrid = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

  // Set up back rows
  for (let col = 0; col < 8; col++) {
    grid[0][col] = { id: `b_r0_${col}`, type: backRow[col], color: "b", hasMoved: false };
    grid[7][col] = { id: `w_r7_${col}`, type: backRow[col], color: "w", hasMoved: false };
  }

  // Set up pawns
  for (let col = 0; col < 8; col++) {
    grid[1][col] = { id: `b_p1_${col}`, type: "p", color: "b", hasMoved: false };
    grid[6][col] = { id: `w_p6_${col}`, type: "p", color: "w", hasMoved: false };
  }

  return grid;
}

/**
 * Find King position
 */
export function findKing(board: BoardGrid, color: PieceColor): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "k" && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Determine if a specific position is attacked by any pieces of the attacking color
 */
export function isCellAttacked(board: BoardGrid, pos: Position, attackerColor: PieceColor): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === attackerColor) {
        const moves = getRawMoves(board, { row: r, col: c });
        if (moves.some((m) => m.row === pos.row && m.col === pos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if the King of a specific color is in check
 */
export function isKingChecked(board: BoardGrid, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const opponentColor: PieceColor = color === "w" ? "b" : "w";
  return isCellAttacked(board, kingPos, opponentColor);
}

/**
 * Get raw possible moves for a piece, ignoring checks (used for attack map generation)
 */
export function getRawMoves(board: BoardGrid, from: Position): Position[] {
  const moves: Position[] = [];
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const { type, color } = piece;
  const oppColor: PieceColor = color === "w" ? "b" : "w";

  const addSlidingMoves = (directions: { dr: number; dc: number }[]) => {
    for (const { dr, dc } of directions) {
      let r = from.row + dr;
      let c = from.col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const cell = board[r][c];
        if (!cell) {
          moves.push({ row: r, col: c });
        } else {
          if (cell.color === oppColor) {
            moves.push({ row: r, col: c });
          }
          break; // Blocked by piece
        }
        r += dr;
        c += dc;
      }
    }
  };

  switch (type) {
    case "p": {
      const dir = color === "w" ? -1 : 1;
      
      // Single step forward
      const f1 = from.row + dir;
      if (f1 >= 0 && f1 < 8 && !board[f1][from.col]) {
        moves.push({ row: f1, col: from.col });
        
        // Double step forward from starting rank
        const startRank = color === "w" ? 6 : 1;
        const f2 = from.row + 2 * dir;
        if (from.row === startRank && !board[f2][from.col]) {
          moves.push({ row: f2, col: from.col });
        }
      }

      // Diagonals standard captures
      const diagonals = [
        { row: from.row + dir, col: from.col - 1 },
        { row: from.row + dir, col: from.col + 1 }
      ];
      for (const diag of diagonals) {
        if (diag.row >= 0 && diag.row < 8 && diag.col >= 0 && diag.col < 8) {
          const target = board[diag.row][diag.col];
          if (target && target.color === oppColor) {
            moves.push(diag);
          }
        }
      }
      break;
    }

    case "r":
      addSlidingMoves([
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
      ]);
      break;

    case "b":
      addSlidingMoves([
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
      ]);
      break;

    case "q":
      addSlidingMoves([
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
      ]);
      break;

    case "n": {
      const jumps = [
        { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
        { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
        { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
        { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
      ];
      for (const { dr, dc } of jumps) {
        const r = from.row + dr;
        const c = from.col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const target = board[r][c];
          if (!target || target.color === oppColor) {
            moves.push({ row: r, col: c });
          }
        }
      }
      break;
    }

    case "k": {
      const steps = [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
      ];
      for (const { dr, dc } of steps) {
        const r = from.row + dr;
        const c = from.col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const target = board[r][c];
          if (!target || target.color === oppColor) {
            moves.push({ row: r, col: c });
          }
        }
      }
      break;
    }
  }

  return moves;
}

/**
 * Clean Anti-Glitch legal moves checking:
 * Returns only moves that do NOT expose own King to check.
 */
export function getValidMoves(board: BoardGrid, from: Position, history: ChessMove[]): Position[] {
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const rawMoves = getRawMoves(board, from);
  const validMoves: Position[] = [];

  // Filter out moves exposing own King
  for (const to of rawMoves) {
    const tempBoard = simulateMove(board, { from, to, piece });
    if (!isKingChecked(tempBoard, piece.color)) {
      validMoves.push(to);
    }
  }

  // Castling validation
  if (piece.type === "k" && !piece.hasMoved && !isKingChecked(board, piece.color)) {
    const r = from.row;
    
    // Kingside Castling
    const rookK = board[r][7];
    if (rookK && rookK.type === "r" && !rookK.hasMoved) {
      if (!board[r][5] && !board[r][6]) {
        // Cells cannot be under attack
        const oppColor = piece.color === "w" ? "b" : "w";
        if (!isCellAttacked(board, { row: r, col: 5 }, oppColor) &&
            !isCellAttacked(board, { row: r, col: 6 }, oppColor)) {
          validMoves.push({ row: r, col: 6 });
        }
      }
    }

    // Queenside Castling
    const rookQ = board[r][0];
    if (rookQ && rookQ.type === "r" && !rookQ.hasMoved) {
      if (!board[r][1] && !board[r][2] && !board[r][3]) {
        const oppColor = piece.color === "w" ? "b" : "w";
        if (!isCellAttacked(board, { row: r, col: 2 }, oppColor) &&
            !isCellAttacked(board, { row: r, col: 3 }, oppColor)) {
          validMoves.push({ row: r, col: 2 });
        }
      }
    }
  }

  // En Passant validation
  if (piece.type === "p" && history.length > 0) {
    const lastMove = history[history.length - 1];
    const isDoubleStep = lastMove.piece.type === "p" && Math.abs(lastMove.from.row - lastMove.to.row) === 2;
    if (isDoubleStep) {
      const targetCol = lastMove.to.col;
      const targetRow = lastMove.to.row;
      if (from.row === targetRow && Math.abs(from.col - targetCol) === 1) {
        const nextRow = piece.color === "w" ? from.row - 1 : from.row + 1;
        
        // Anti-glitch exposure check on en-passant capture
        const tempBoard = simulateMove(board, { 
          from, 
          to: { row: nextRow, col: targetCol }, 
          piece,
          enPassant: true 
        });
        if (!isKingChecked(tempBoard, piece.color)) {
          validMoves.push({ row: nextRow, col: targetCol });
        }
      }
    }
  }

  return validMoves;
}

/**
 * Simulate move internally to evaluate outcomes safely
 */
function simulateMove(board: BoardGrid, move: ChessMove): BoardGrid {
  const tempGrid: BoardGrid = board.map((row) => [...row]);
  const { from, to, piece, enPassant } = move;

  tempGrid[from.row][from.col] = null;
  tempGrid[to.row][to.col] = piece;

  if (enPassant) {
    // Clear captured pawn row
    tempGrid[from.row][to.col] = null;
  }

  return tempGrid;
}

/**
 * Execute a move in-place on the game board and handle game-rules side effects
 */
export function executeMove(board: BoardGrid, from: Position, to: Position, history: ChessMove[]): { 
  board: BoardGrid; 
  move: ChessMove; 
} {
  const newBoard: BoardGrid = board.map((row) => [...row]);
  const piece = newBoard[from.row][from.col]!;
  
  let captured: ChessPiece | null = newBoard[to.row][to.col];
  let castling: "king" | "queen" | null = null;
  let enPassant = false;

  // King Castling move
  if (piece.type === "k" && Math.abs(from.col - to.col) === 2) {
    const isKingSide = to.col === 6;
    const r = from.row;
    if (isKingSide) {
      const rook = newBoard[r][7]!;
      newBoard[r][7] = null;
      newBoard[r][5] = { ...rook, hasMoved: true };
      castling = "king";
    } else {
      const rook = newBoard[r][0]!;
      newBoard[r][0] = null;
      newBoard[r][3] = { ...rook, hasMoved: true };
      castling = "queen";
    }
  }

  // En Passant capture
  if (piece.type === "p" && from.col !== to.col && !captured) {
    captured = newBoard[from.row][to.col];
    newBoard[from.row][to.col] = null;
    enPassant = true;
  }

  // Update piece position & mark moved
  const updatedPiece = { ...piece, hasMoved: true };
  newBoard[from.row][from.col] = null;
  newBoard[to.row][to.col] = updatedPiece;

  // Pawn Auto-Promotion to Queen for extreme simplicity in UI/UX
  if (updatedPiece.type === "p" && (to.row === 0 || to.row === 7)) {
    newBoard[to.row][to.col] = {
      ...updatedPiece,
      type: "q"
    };
  }

  const move: ChessMove = {
    from,
    to,
    piece: updatedPiece,
    captured,
    castling,
    enPassant,
    promotion: updatedPiece.type === "p" && (to.row === 0 || to.row === 7) ? "q" : undefined
  };

  return { board: newBoard, move };
}

/**
 * Checks if color has any valid moves
 */
export function hasAnyValidMoves(board: BoardGrid, color: PieceColor, history: ChessMove[]): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, { row: r, col: c }, history);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}
