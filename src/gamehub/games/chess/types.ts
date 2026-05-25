export type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
export type PieceColor = "w" | "b";

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type BoardGrid = (ChessPiece | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface ChessMove {
  from: Position;
  to: Position;
  piece: ChessPiece;
  captured?: ChessPiece | null;
  castling?: "king" | "queen" | null;
  enPassant?: boolean;
  promotion?: PieceType;
}

export interface ChessState {
  board: BoardGrid;
  turn: PieceColor;
  captured: {
    w: ChessPiece[];
    b: ChessPiece[];
  };
  moveHistory: ChessMove[];
  activeSelect: Position | null;
  validMoves: Position[];
  check: boolean;
  checkmate: boolean;
  winner: PieceColor | null;
}
