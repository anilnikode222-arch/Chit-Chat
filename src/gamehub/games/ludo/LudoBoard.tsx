"use client";

import React, { useState, useEffect } from "react";
import { 
  LudoColor, 
  LudoToken, 
  Player, 
  LudoState 
} from "./types";
import { 
  createInitialTokens, 
  getTokenCoordinates, 
  isValidLudoMove, 
  moveLudoToken,
  SAFE_CELLS,
  HOME_POSITION
} from "./engine";
import audioSynth from "../../../gamehub/core/AudioSynth";

interface LudoBoardProps {
  onBackToHub: () => void;
  onStatsUpdate: (won: boolean) => void;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({ onBackToHub, onStatsUpdate }) => {
  const [state, setState] = useState<LudoState>({
    players: [
      { color: "red", name: "Red (You)", avatar: "🦊", active: true },
      { color: "green", name: "Green Bot", avatar: "🐸", active: true },
      { color: "yellow", name: "Yellow Bot", avatar: "🦁", active: true },
      { color: "blue", name: "Blue Bot", avatar: "🦈", active: true }
    ],
    turnIndex: 0,
    diceValue: null,
    hasRolled: false,
    tokens: createInitialTokens(["red", "green", "yellow", "blue"]),
    winner: null,
    moveHistory: ["Ludo E2EE session initiated."],
    winningOrder: []
  });

  const [rolling, setRolling] = useState(false);
  const [validTokenMoves, setValidTokenMoves] = useState<LudoToken[]>([]);

  const activePlayer = state.players[state.turnIndex];

  // Auto-run bot players turn for single-player offline feel!
  useEffect(() => {
    if (state.winner) return;

    if (activePlayer.color !== "red") {
      const botDelay = setTimeout(() => {
        handleBotTurn();
      }, 1500);
      return () => clearTimeout(botDelay);
    }
  }, [state.turnIndex, state.hasRolled]);

  // Dice Rolling
  const rollDice = () => {
    if (state.hasRolled || rolling || state.winner) return;

    audioSynth.playRoll();
    setRolling(true);

    let rolls = 0;
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        diceValue: Math.floor(Math.random() * 6) + 1
      }));
      rolls++;
      if (rolls > 8) {
        clearInterval(interval);
        
        // Final Roll
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        
        // Find valid token moves
        const activeTokens = state.tokens[activePlayer.color];
        const validMoves = activeTokens.filter((t) => isValidLudoMove(t, finalRoll));

        setRolling(false);

        setState((prev) => ({
          ...prev,
          diceValue: finalRoll,
          hasRolled: true
        }));

        setValidTokenMoves(validMoves);

        // If no valid moves, pass turn automatically
        if (validMoves.length === 0) {
          setTimeout(() => {
            passTurn();
          }, 1200);
        }
      }
    }, 60);
  };

  // Move token
  const handleTokenMove = (token: LudoToken) => {
    if (!state.hasRolled || rolling || state.winner) return;

    const isValid = validTokenMoves.some((t) => t.id === token.id);
    if (!isValid) {
      audioSynth.playError();
      return;
    }

    executeTokenMove(token, state.diceValue!);
  };

  const executeTokenMove = (token: LudoToken, roll: number) => {
    const nextToken = moveLudoToken(token, roll);
    audioSynth.playMove();

    // Check Capture / Collision at target cell (if in active status)
    let nextTokens = { ...state.tokens };
    nextTokens[token.color] = state.tokens[token.color].map((t) => 
      t.id === token.id ? nextToken : t
    );

    let isCaptured = false;
    let logMsg = `${activePlayer.name} moved token ${token.index + 1} by ${roll} steps.`;

    if (nextToken.status === "active" && !SAFE_CELLS.includes(nextToken.position)) {
      // Look for other players' tokens occupying same path position
      Object.keys(nextTokens).forEach((colorKey) => {
        const color = colorKey as LudoColor;
        if (color !== token.color) {
          nextTokens[color] = nextTokens[color].map((t) => {
            if (t.status === "active" && t.position === nextToken.position) {
              isCaptured = true;
              audioSynth.playCapture();
              logMsg += ` 🎯 Captured ${color.toUpperCase()} token ${t.index + 1}!`;
              return {
                ...t,
                status: "base",
                stepsTraveled: 0,
                position: -1
              };
            }
            return t;
          });
        }
      });
    }

    // Check if player won (all 4 tokens home!)
    const allHome = nextTokens[token.color].every((t) => t.status === "home");
    let nextWinner = state.winner;
    let nextWinningOrder = [...state.winningOrder];

    if (allHome && !state.winningOrder.includes(token.color)) {
      audioSynth.playWin();
      nextWinningOrder.push(token.color);
      logMsg += ` 🎉 ${token.color.toUpperCase()} completed Ludo and won!`;
      
      if (token.color === "red") {
        onStatsUpdate(true); // User Win
      }

      if (nextWinningOrder.length === 1) {
        nextWinner = token.color;
      }
    }

    setState((prev) => ({
      ...prev,
      tokens: nextTokens,
      moveHistory: [logMsg, ...prev.moveHistory],
      winner: nextWinner,
      winningOrder: nextWinningOrder
    }));

    setValidTokenMoves([]);

    // Turn logic: Rolling a 6 or capturing a piece awards another roll!
    const awardExtraRoll = roll === 6 || isCaptured;
    if (awardExtraRoll && !allHome) {
      setState((prev) => ({
        ...prev,
        hasRolled: false
      }));
    } else {
      passTurn();
    }
  };

  // Bot Auto Player Action
  const handleBotTurn = () => {
    if (state.winner) return;

    // 1. Roll Dice
    audioSynth.playRoll();
    setRolling(true);

    setTimeout(() => {
      const finalRoll = Math.floor(Math.random() * 6) + 1;
      setRolling(false);

      const activeTokens = state.tokens[activePlayer.color];
      const validMoves = activeTokens.filter((t) => isValidLudoMove(t, finalRoll));

      setState((prev) => ({
        ...prev,
        diceValue: finalRoll,
        hasRolled: true
      }));

      if (validMoves.length === 0) {
        // No moves possible, pass
        setTimeout(() => {
          passTurn();
        }, 1200);
      } else {
        // Prioritize: 1. Capture piece, 2. Get out of base, 3. Get token home, 4. Move furthest token
        let selectedToken = validMoves[0];

        const captures = validMoves.filter((t) => {
          const next = moveLudoToken(t, finalRoll);
          if (next.status !== "active" || SAFE_CELLS.includes(next.position)) return false;
          
          let potentialCapture = false;
          Object.keys(state.tokens).forEach((col) => {
            if (col !== t.color) {
              state.tokens[col as LudoColor].forEach((ot) => {
                if (ot.status === "active" && ot.position === next.position) {
                  potentialCapture = true;
                }
              });
            }
          });
          return potentialCapture;
        });

        const exitBase = validMoves.filter((t) => t.status === "base");
        const reachesHome = validMoves.filter((t) => t.stepsTraveled + finalRoll === 57);

        if (captures.length > 0) {
          selectedToken = captures[0];
        } else if (reachesHome.length > 0) {
          selectedToken = reachesHome[0];
        } else if (exitBase.length > 0) {
          selectedToken = exitBase[0];
        } else {
          // Move token furthest along path
          selectedToken = validMoves.reduce((max, t) => 
            t.stepsTraveled > max.stepsTraveled ? t : max
          , validMoves[0]);
        }

        setTimeout(() => {
          executeTokenMove(selectedToken, finalRoll);
        }, 1000);
      }
    }, 600);
  };

  const passTurn = () => {
    setState((prev) => {
      let nextIndex = (prev.turnIndex + 1) % prev.players.length;
      
      // Skip players who are already finished (all tokens home)
      let attempts = 0;
      while (
        prev.tokens[prev.players[nextIndex].color].every((t) => t.status === "home") &&
        attempts < prev.players.length
      ) {
        nextIndex = (nextIndex + 1) % prev.players.length;
        attempts++;
      }

      return {
        ...prev,
        turnIndex: nextIndex,
        diceValue: null,
        hasRolled: false
      };
    });
    setValidTokenMoves([]);
  };

  const resetGame = () => {
    audioSynth.playClick();
    setState({
      players: [
        { color: "red", name: "Red (You)", avatar: "🦊", active: true },
        { color: "green", name: "Green Bot", avatar: "🐸", active: true },
        { color: "yellow", name: "Yellow Bot", avatar: "🦁", active: true },
        { color: "blue", name: "Blue Bot", avatar: "🦈", active: true }
      ],
      turnIndex: 0,
      diceValue: null,
      hasRolled: false,
      tokens: createInitialTokens(["red", "green", "yellow", "blue"]),
      winner: null,
      moveHistory: ["Ludo restart initiated."],
      winningOrder: []
    });
    setValidTokenMoves([]);
  };

  // Group tokens occupying the same grid position to prevent visual overlapping glitches
  const getGroupedTokenScales = (token: LudoToken): { 
    count: number; 
    index: number; 
    offsetX: number; 
    offsetY: number; 
    scale: number; 
  } => {
    const coords = getTokenCoordinates(token);
    
    // Find all active tokens on same coordinate
    const matching: LudoToken[] = [];
    Object.keys(state.tokens).forEach((colorKey) => {
      state.tokens[colorKey as LudoColor].forEach((t) => {
        if (t.status !== "base" && t.status !== "home") {
          const tc = getTokenCoordinates(t);
          if (tc.row === coords.row && tc.col === coords.col) {
            matching.push(t);
          }
        }
      });
    });

    const count = matching.length;
    if (count <= 1) {
      return { count: 1, index: 0, offsetX: 0, offsetY: 0, scale: 1.0 };
    }

    const selfIdx = matching.findIndex((t) => t.id === token.id);
    
    // Position tokens inside a tiny 2x2 cluster inside the tile
    const angle = (selfIdx / count) * 2 * Math.PI;
    const radius = 6; // offset pixels
    
    return {
      count,
      index: selfIdx,
      offsetX: Math.cos(angle) * radius,
      offsetY: Math.sin(angle) * radius,
      scale: 0.65
    };
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl animate-slide-up select-none">
      {/* Game Header Bar */}
      <div className="flex justify-between items-center w-full px-4 py-3 glass-card bg-zinc-950/60 border-purple-500/20">
        <div className="flex items-center gap-3">
          <button onClick={onBackToHub} className="btn-neon btn-neon-purple px-3 py-1.5 text-xs">
            ← Main Hub
          </button>
          <h2 className="text-sm font-extrabold tracking-wide uppercase glow-text-purple flex items-center gap-2">
            🎲 Cyber Ludo
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xs font-semibold text-zinc-400 uppercase">Active Turn:</span>
            <span className={`px-2 py-0.5 rounded text-2xs font-extrabold uppercase bg-${activePlayer.color}-500/20 border border-${activePlayer.color}-500/40 text-${activePlayer.color}-400`}>
              {activePlayer.name}
            </span>
          </div>
          <button onClick={resetGame} className="btn-neon text-xs px-3 py-1.5 border-zinc-700 hover:border-purple-500">
            Restart
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-center gap-8 w-full justify-center">
        
        {/* Left Side: Score Board / Match Logs */}
        <div className="w-full xl:w-72 flex flex-col gap-4">
          
          {/* Active players status panel */}
          <div className="glass-card p-4 bg-zinc-950/40 border-purple-500/10">
            <h3 className="text-2xs font-extrabold uppercase tracking-widest text-zinc-500 mb-3">Lobby Players</h3>
            <div className="flex flex-col gap-2">
              {state.players.map((p, idx) => {
                const isCurrent = state.turnIndex === idx;
                const isFinished = state.tokens[p.color].every((t) => t.status === "home");
                
                return (
                  <div key={p.color} className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    isCurrent ? "bg-purple-600/10 border border-purple-500/30" : "bg-zinc-900/40"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.avatar}</span>
                      <div>
                        <span className={`text-2xs font-extrabold capitalize ${
                          p.color === "red" ? "text-red-400" : p.color === "green" ? "text-emerald-400" : p.color === "yellow" ? "text-amber-400" : "text-sky-400"
                        }`}>{p.name}</span>
                        {isFinished && <span className="text-[9px] block text-emerald-400 font-bold uppercase">Completed!</span>}
                      </div>
                    </div>
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Log */}
          <div className="glass-card p-4 bg-zinc-950/40 border-purple-500/10 h-44 flex flex-col">
            <h3 className="text-2xs font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Live Match Logs</h3>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-[10px] text-zinc-400 font-semibold leading-relaxed">
              {state.moveHistory.map((h, i) => (
                <div key={i} className="border-b border-zinc-900/60 pb-1">{h}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Interactive Board */}
        <div className="glass-card p-4 bg-zinc-900/40 border-purple-500/10 shadow-2xl relative">
          
          {/* Victory overlay */}
          {state.winner && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-3xl z-10 flex flex-col items-center justify-center text-center p-6 border border-purple-500/20">
              <span className="text-5xl mb-4">🏆</span>
              <h3 className="text-xl font-black uppercase glow-text-purple mb-2">{state.winner.toUpperCase()} Wins!</h3>
              <p className="text-zinc-300 text-xs font-semibold max-w-xs mb-6">
                Total victory achieved! Complete board control claimed.
              </p>
              <button onClick={resetGame} className="btn-neon btn-neon-purple px-6 py-2.5">
                Start New Match
              </button>
            </div>
          )}

          {/* 15x15 Ludo Board Grid Layout */}
          <div className="board-container relative aspect-square w-full h-full max-w-[480px]">
            
            {/* Background Canvas Board illustration */}
            <div className="grid grid-cols-15 grid-rows-15 w-full h-full border-4 border-zinc-950 rounded-2xl overflow-hidden shadow-inner bg-zinc-950 select-none">
              {Array(15).fill(null).map((_, r) => (
                <div key={r} className="contents">
                  {Array(15).fill(null).map((_, c) => {
                    // 1. Identify Board Regions
                    const isRedHome = r < 6 && c < 6;
                    const isGreenHome = r < 6 && c > 8;
                    const isYellowHome = r > 8 && c > 8;
                    const isBlueHome = r > 8 && c < 6;
                    
                    const isCenterHome = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                    // Color assignments
                    let bg = "bg-[#181b2a]";
                    
                    if (isRedHome) bg = "bg-red-500/20 border border-red-500/10";
                    else if (isGreenHome) bg = "bg-emerald-500/20 border border-emerald-500/10";
                    else if (isYellowHome) bg = "bg-amber-500/20 border border-amber-500/10";
                    else if (isBlueHome) bg = "bg-sky-500/20 border border-sky-500/10";
                    
                    // Home stretch coloration
                    else if (r === 7 && c >= 1 && c <= 5) bg = "bg-red-500/40";
                    else if (c === 7 && r >= 1 && r <= 5) bg = "bg-emerald-500/40";
                    else if (r === 7 && c >= 9 && c <= 13) bg = "bg-amber-500/40";
                    else if (c === 7 && r >= 9 && r <= 13) bg = "bg-sky-500/40";

                    // Starting Arrow Points
                    else if (r === 6 && c === 1) bg = "bg-red-500/50 border border-red-500/30";
                    else if (r === 1 && c === 8) bg = "bg-emerald-500/50 border border-emerald-500/30";
                    else if (r === 8 && c === 13) bg = "bg-amber-500/50 border border-amber-500/30";
                    else if (r === 13 && c === 6) bg = "bg-sky-500/50 border border-sky-500/30";

                    // Safety stars cells
                    const isStar = (r === 6 && c === 2) || (r === 2 && c === 8) || (r === 8 && c === 12) || (r === 12 && c === 6) ||
                                   (r === 8 && c === 2) || (r === 2 && c === 6) || (r === 6 && c === 12) || (r === 12 && c === 8);
                    
                    if (isStar) bg = "bg-purple-950/60 border border-purple-500/30";

                    if (isCenterHome) bg = "bg-zinc-900";

                    return (
                      <div
                        key={c}
                        className={`relative flex items-center justify-center border border-zinc-950/40 aspect-square ${bg}`}
                      >
                        {/* Star symbol inside safe spot tiles */}
                        {isStar && <span className="text-[10px] text-purple-400 opacity-60">⭐</span>}

                        {/* Base Inner Circles representing Yard launch pads */}
                        {isRedHome && r >= 2 && r <= 3 && c >= 2 && c <= 3 && (
                          <div className="absolute inset-0.5 rounded-full border border-red-500/30 bg-red-600/30 flex items-center justify-center" />
                        )}
                        {isGreenHome && r >= 2 && r <= 3 && c >= 11 && c <= 12 && (
                          <div className="absolute inset-0.5 rounded-full border border-emerald-500/30 bg-emerald-600/30 flex items-center justify-center" />
                        )}
                        {isYellowHome && r >= 11 && r <= 12 && c >= 11 && c <= 12 && (
                          <div className="absolute inset-0.5 rounded-full border border-amber-500/30 bg-amber-600/30 flex items-center justify-center" />
                        )}
                        {isBlueHome && r >= 11 && r <= 12 && c >= 2 && c <= 3 && (
                          <div className="absolute inset-0.5 rounded-full border border-sky-500/30 bg-sky-600/30 flex items-center justify-center" />
                        )}

                        {/* Center Home Triangle divisions using CSS Clip Paths */}
                        {isCenterHome && r === 7 && c === 6 && (
                          <div className="absolute inset-0 bg-red-500/40 clip-path-left" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />
                        )}
                        {isCenterHome && r === 6 && c === 7 && (
                          <div className="absolute inset-0 bg-emerald-500/40 clip-path-top" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                        )}
                        {isCenterHome && r === 7 && c === 8 && (
                          <div className="absolute inset-0 bg-amber-500/40 clip-path-right" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 50%)" }} />
                        )}
                        {isCenterHome && r === 8 && c === 7 && (
                          <div className="absolute inset-0 bg-sky-500/40 clip-path-bottom" style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Absolute-positioned overlay layer for moving Tokens */}
            {Object.keys(state.tokens).map((colorKey) => {
              const color = colorKey as LudoColor;
              return state.tokens[color].map((token) => {
                const coords = getTokenCoordinates(token);
                const isMyTurn = activePlayer.color === token.color && state.hasRolled;
                const isMovable = validTokenMoves.some((t) => t.id === token.id);
                
                const { scale, offsetX, offsetY } = getGroupedTokenScales(token);

                // Pixel placement offsets
                const gridPercent = 100 / 15;
                const left = coords.col * gridPercent;
                const top = coords.row * gridPercent;

                return (
                  <div
                    key={token.id}
                    onClick={() => handleTokenMove(token)}
                    className={`absolute flex items-center justify-center transition-all duration-300 ${
                      isMovable ? "cursor-pointer animate-pulse z-20 scale-110" : "pointer-events-none"
                    }`}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${gridPercent}%`,
                      height: `${gridPercent}%`,
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                      transitionProperty: "left, top, transform"
                    }}
                  >
                    {/* The physical Token disc */}
                    <div className={`w-4/5 h-4/5 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${
                      token.color === "red" ? "bg-red-500 border-red-300" : token.color === "green" ? "bg-emerald-500 border-emerald-300" : token.color === "yellow" ? "bg-amber-500 border-amber-300" : "bg-sky-500 border-sky-300"
                    } ${isMovable ? "ring-4 ring-purple-400" : ""}`}>
                      <span className="text-[8px] font-black text-white">{token.index + 1}</span>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* Right Side: Interactive Cyber Dice */}
        <div className="w-full xl:w-48 flex flex-col items-center gap-4">
          <div className="glass-card p-6 w-full bg-zinc-950/40 border-purple-500/10 flex flex-col items-center justify-center">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-zinc-500 mb-4 block">Action Dice</span>
            
            {/* The interactive spinning Dice */}
            <div 
              onClick={rollDice}
              className={`cursor-pointer w-20 h-20 flex items-center justify-center rounded-2xl glass-card bg-zinc-900 border-purple-500/30 hover:border-purple-500 transition-all duration-300 shadow-2xl relative ${
                state.hasRolled || rolling ? "pointer-events-none brightness-75" : "hover:scale-105 active:scale-95 glow-text-purple"
              }`}
            >
              {rolling ? (
                // 3D-like spinning cubes
                <div className="dice-cube animate-spin w-12 h-12 flex items-center justify-center border-2 border-purple-500/30 rounded-lg">
                  <span className="text-sm font-black text-purple-400 animate-pulse">🎲</span>
                </div>
              ) : (
                <div className="text-3xl font-black text-purple-400 select-none flex flex-col items-center">
                  {state.diceValue !== null ? (
                    <span className="animate-scale text-4xl">{state.diceValue}</span>
                  ) : (
                    <span className="text-2xl">🎲</span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={rollDice}
              disabled={state.hasRolled || rolling || activePlayer.color !== "red" || state.winner !== null}
              className="btn-neon btn-neon-purple mt-6 w-full text-center flex justify-center py-2 text-3xs font-extrabold tracking-widest disabled:opacity-30 disabled:pointer-events-none"
            >
              {rolling ? "Rolling..." : state.hasRolled ? "Select Piece" : "Roll Dice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;
