"use client";

import React, { useState, useEffect } from "react";
import { 
  BoardGrid, 
  ChessPiece, 
  Position, 
  PieceColor, 
  ChessMove, 
  ChessState 
} from "./types";
import { 
  createInitialBoard, 
  getValidMoves, 
  executeMove, 
  isKingChecked, 
  hasAnyValidMoves 
} from "./engine";
import audioSynth from "../../../gamehub/core/AudioSynth";

// Inline High-Fidelity SVG Piece Renderers
const PieceSVG: React.FC<{ type: string; color: string; className?: string }> = ({ type, color, className = "w-10 h-10" }) => {
  const fill = color === "w" ? "#ffffff" : "#1e293b";
  const stroke = color === "w" ? "#0f172a" : "#cbd5e1";

  switch (type) {
    case "p": // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.65-1.41 1.63-1.41 2.75 0 2.21 1.79 4 4 4h3c2.21 0 4-1.79 4-4 0-1.12-.58-2.1-1.41-2.75 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "r": // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path d="M9 39h27v-3H9v3zm3-13h21v-4H12v4zm2.5-4l1.5-12h18l1.5 12h-21z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M12 12V9h4v3h5V9h4v3h5V9h4v3h2v14H9V12h3z" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "n": // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path d="M22 10c-5 0-8 3-10 8 0 0 1.5-1.5 4-1.5 0 0-3 2.5-4 5.5-.5 1.5 0 3 .5 3.5.5.5.5-1 1-1.5 1-1 3-2 5-2-1.5 2-1 6 .5 7.5 1.5 1.5 3 0 4-1 1-1 1-4 0-6.5 3.5 1.5 6 4.5 6.5 8.5h4c0-6-3-11-7-13.5-2-1-3-1.5-5-1.5z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="15" cy="18" r="2" fill={stroke} />
        </svg>
      );
    case "b": // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path d="M9 36h27v-3H9v3zm13.5-32c-3 0-5.5 2.5-5.5 5.5 0 1.5.5 2.5 1.5 3.5C15.5 15.5 14 19 14 22.5c0 4.5 3.5 8 8 8s8-3.5 8-8c0-3.5-1.5-7-4.5-9.5 1-1 1.5-2 1.5-3.5 0-3-2.5-5.5-5.5-5.5z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="22.5" cy="5.5" r="1.5" fill={stroke} />
          <path d="M17.5 18h10M22.5 13v10" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "q": // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path d="M9 37h27v-3H9v3zm3.5-20l3-10.5 7 11.5 7-11.5 3 10.5h-20z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M9 17l4 15h24l4-15L31 28 22.5 14 14 28 9 17z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="9" cy="16" r="2" fill={stroke} />
          <circle cx="16" cy="6" r="2" fill={stroke} />
          <circle cx="22.5" cy="13" r="2" fill={stroke} />
          <circle cx="29" cy="6" r="2" fill={stroke} />
          <circle cx="36" cy="16" r="2" fill={stroke} />
        </svg>
      );
    case "k": // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path d="M9 38h27v-3H9v3zm13.5-30V4.5m-3 3h6m-3 20.5c-4.5 0-8-3.5-8-8 0-3.5 1.5-7 4.5-9.5-2-1-3-2.5-3-4.5 0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5c0 2-1 3.5-3 4.5 3 2.5 4.5 6 4.5 9.5 0 4.5-3.5 8-8 8z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M11.5 30c1 1.5 3 2.5 5 2.5h12c2 0 4-1 5-2.5H11.5z" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
};

interface ChessBoardProps {
  onBackToHub: () => void;
  onStatsUpdate: (won: boolean) => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ onBackToHub, onStatsUpdate }) => {
  const [state, setState] = useState<ChessState>({
    board: createInitialBoard(),
    turn: "w",
    captured: { w: [], b: [] },
    moveHistory: [],
    activeSelect: null,
    validMoves: [],
    check: false,
    checkmate: false,
    winner: null
  });

  // Handle cell click (select or move piece)
  const handleCellClick = (row: number, col: number) => {
    if (state.winner) return;

    audioSynth.playClick();
    const clickedCell = state.board[row][col];
    const isSelected = state.activeSelect && state.activeSelect.row === row && state.activeSelect.col === col;

    // 1. Deselect if clicking selected cell
    if (isSelected) {
      setState((prev) => ({ ...prev, activeSelect: null, validMoves: [] }));
      return;
    }

    // 2. Make move if clicking a valid target move cell
    const isValidMove = state.validMoves.some((m) => m.row === row && m.col === col);
    if (isValidMove && state.activeSelect) {
      const from = state.activeSelect;
      const to = { row, col };
      const { board: nextBoard, move } = executeMove(state.board, from, to, state.moveHistory);

      const nextTurn: PieceColor = state.turn === "w" ? "b" : "w";
      const isOpponentChecked = isKingChecked(nextBoard, nextTurn);
      
      // Calculate Checkmate
      let isOpponentMate = false;
      if (isOpponentChecked && !hasAnyValidMoves(nextBoard, nextTurn, [...state.moveHistory, move])) {
        isOpponentMate = true;
      }

      // Track captured pieces
      const nextCaptured = { ...state.captured };
      if (move.captured) {
        nextCaptured[move.captured.color].push(move.captured);
        audioSynth.playCapture();
      } else {
        audioSynth.playMove();
      }

      // Fire Win SFX if checkmate is declared
      if (isOpponentMate) {
        audioSynth.playWin();
        onStatsUpdate(state.turn === "w"); // Log user win/loss statistics
      }

      setState((prev) => ({
        ...prev,
        board: nextBoard,
        turn: nextTurn,
        moveHistory: [...prev.moveHistory, move],
        captured: nextCaptured,
        activeSelect: null,
        validMoves: [],
        check: isOpponentChecked,
        checkmate: isOpponentMate,
        winner: isOpponentMate ? state.turn : null
      }));

      return;
    }

    // 3. Select piece if clicking active color piece
    if (clickedCell && clickedCell.color === state.turn) {
      const validMoves = getValidMoves(state.board, { row, col }, state.moveHistory);
      setState((prev) => ({
        ...prev,
        activeSelect: { row, col },
        validMoves
      }));
    } else {
      // Clicked invalid tile
      setState((prev) => ({ ...prev, activeSelect: null, validMoves: [] }));
    }
  };

  const resetGame = () => {
    audioSynth.playClick();
    setState({
      board: createInitialBoard(),
      turn: "w",
      captured: { w: [], b: [] },
      moveHistory: [],
      activeSelect: null,
      validMoves: [],
      check: false,
      checkmate: false,
      winner: null
    });
  };

  // Check if a cell is checked King
  const isKingInCheckCell = (r: number, c: number): boolean => {
    if (!state.check) return false;
    const piece = state.board[r][c];
    return !!(piece && piece.type === "k" && piece.color === state.turn);
  };

  // Convert row/col to coordinate text (e.g. e4)
  const getCellLabel = (row: number, col: number): string => {
    const letters = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const numbers = ["8", "7", "6", "5", "4", "3", "2", "1"];
    return letters[col] + numbers[row];
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl animate-slide-up">
      {/* Game Header Bar */}
      <div className="flex justify-between items-center w-full px-4 py-3 glass-card bg-zinc-950/60 border-cyan-500/20">
        <div className="flex items-center gap-3">
          <button onClick={onBackToHub} className="btn-neon btn-neon-blue px-3 py-1.5 text-xs">
            ← Main Hub
          </button>
          <h2 className="text-sm font-extrabold tracking-wide uppercase glow-text-blue flex items-center gap-2">
            👑 Grandmaster Chess
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xs font-semibold text-zinc-400 uppercase">Active Turn:</span>
            <span className={`px-2 py-0.5 rounded text-2xs font-extrabold uppercase ${
              state.turn === "w" ? "bg-white text-black" : "bg-zinc-800 text-white border border-zinc-700"
            }`}>
              {state.turn === "w" ? "White" : "Black"}
            </span>
          </div>
          <button onClick={resetGame} className="btn-neon text-xs px-3 py-1.5 border-zinc-700 hover:border-cyan-500">
            Restart
          </button>
        </div>
      </div>

      {/* Main Grid: Game and Captured panels */}
      <div className="flex flex-col lg:flex-row items-center gap-8 w-full justify-center">
        
        {/* Left Side: Captured pieces White */}
        <div className="flex lg:flex-col gap-2 p-3 glass-card h-auto lg:h-[480px] w-full lg:w-20 justify-start items-center overflow-y-auto">
          <span className="text-3xs font-bold text-zinc-500 uppercase tracking-widest block lg:rotate-270 lg:my-4">Black Captured</span>
          <div className="flex lg:flex-col flex-wrap gap-1 items-center justify-center">
            {state.captured.w.map((p, i) => (
              <PieceSVG key={p.id + i} type={p.type} color="w" className="w-7 h-7 filter drop-shadow" />
            ))}
          </div>
        </div>

        {/* Center: The Board */}
        <div className="glass-card p-4 bg-zinc-900/40 border-cyan-500/10 shadow-2xl relative">
          
          {/* Winner Backdrop Modal */}
          {state.winner && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-3xl z-10 flex flex-col items-center justify-center text-center p-6 border border-cyan-500/20">
              <span className="text-5xl mb-4">🏆</span>
              <h3 className="text-xl font-black uppercase glow-text-blue mb-2">Checkmate Declared!</h3>
              <p className="text-zinc-300 text-xs font-semibold max-w-xs mb-6">
                Excellent strategic planning! The {state.winner === "w" ? "White" : "Black"} side has claimed total victory on the board.
              </p>
              <button onClick={resetGame} className="btn-neon btn-neon-blue px-6 py-2.5">
                Play New Match
              </button>
            </div>
          )}

          {/* Chess Board Tiles grid */}
          <div className="board-container select-none">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full border-4 border-zinc-950 rounded-lg overflow-hidden shadow-inner">
              {Array(8).fill(null).map((_, r) => (
                <div key={r} className="contents">
                  {Array(8).fill(null).map((_, c) => {
                    const cell = state.board[r][c];
                    const isDark = (r + c) % 2 === 1;
                    
                    const isSelected = state.activeSelect && state.activeSelect.row === r && state.activeSelect.col === c;
                    const isValidMove = state.validMoves.some((m) => m.row === r && m.col === c);
                    const isChecked = isKingInCheckCell(r, c);

                    let bgClass = isDark ? "bg-[#1e293b]/70" : "bg-[#64748b]/40";
                    if (isSelected) bgClass = "bg-cyan-500/35 border-2 border-cyan-400";
                    if (isChecked) bgClass = "bg-red-500/50 animate-pulse";

                    return (
                      <div
                        key={c}
                        onClick={() => handleCellClick(r, c)}
                        className={`relative flex items-center justify-center aspect-square cursor-pointer transition-all duration-200 ${bgClass} hover:brightness-110`}
                      >
                        {/* Piece rendering */}
                        {cell && (
                          <div className={`transition-bubble transform ${
                            isSelected ? "chess-piece-active" : "hover:scale-105 active:scale-95"
                          }`}>
                            <PieceSVG type={cell.type} color={cell.color} className="w-10 h-10 md:w-11 md:h-11 drop-shadow-md" />
                          </div>
                        )}

                        {/* Valid Moves dots overlay */}
                        {isValidMove && (
                          <div className="chess-cell-valid absolute inset-0 flex items-center justify-center pointer-events-none" />
                        )}

                        {/* Coordinate markers on border cell items */}
                        {c === 0 && (
                          <span className="absolute top-0.5 left-1 text-[8px] font-bold text-zinc-400 opacity-60">
                            {8 - r}
                          </span>
                        )}
                        {r === 7 && (
                          <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-zinc-400 opacity-60">
                            {String.fromCharCode(97 + c)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Captured pieces Black */}
        <div className="flex lg:flex-col gap-2 p-3 glass-card h-auto lg:h-[480px] w-full lg:w-20 justify-start items-center overflow-y-auto">
          <span className="text-3xs font-bold text-zinc-500 uppercase tracking-widest block lg:rotate-90 lg:my-4">White Captured</span>
          <div className="flex lg:flex-col flex-wrap gap-1 items-center justify-center">
            {state.captured.b.map((p, i) => (
              <PieceSVG key={p.id + i} type={p.type} color="b" className="w-7 h-7 filter drop-shadow" />
            ))}
          </div>
        </div>
      </div>

      {/* Status Box */}
      {state.check && !state.winner && (
        <div className="w-full max-w-md p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2 animate-bounce">
          <span>⚠️ Check! The {state.turn === "w" ? "White" : "Black"} King is under immediate attack!</span>
        </div>
      )}
    </div>
  );
};

export default ChessBoard;
