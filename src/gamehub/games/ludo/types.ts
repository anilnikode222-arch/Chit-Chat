export type LudoColor = "red" | "green" | "yellow" | "blue";

export interface Position {
  row: number;
  col: number;
}

export interface LudoToken {
  id: string;
  color: LudoColor;
  index: number; // 0 to 3 for the four tokens per color
  status: "base" | "active" | "home";
  stepsTraveled: number; // 0 to 57 (57 is home!)
  position: number; // Index on the main track (0-51) or offset on home path
}

export interface Player {
  color: LudoColor;
  name: string;
  avatar: string;
  active: boolean;
}

export interface LudoState {
  players: Player[];
  turnIndex: number;
  diceValue: number | null;
  hasRolled: boolean;
  tokens: Record<LudoColor, LudoToken[]>;
  winner: LudoColor | null;
  moveHistory: string[];
  winningOrder: LudoColor[];
}
