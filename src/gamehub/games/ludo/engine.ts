import { LudoColor, LudoToken, Position } from "./types";

/**
 * Main Track 52 grid coordinate mappings for standard 15x15 Ludo Board
 */
export const MAIN_PATH: Position[] = [
  // Red Track (starts at 6, 1)
  { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 },
  // Green Track (starts at 5, 6 going up)
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 6 },
  { row: 0, col: 7 }, // Green Corner
  { row: 0, col: 8 }, { row: 1, col: 8 }, { row: 2, col: 8 }, { row: 3, col: 8 }, { row: 4, col: 8 }, { row: 5, col: 8 },
  // Yellow Track (starts at 6, 9 going right)
  { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 }, { row: 6, col: 13 }, { row: 6, col: 14 },
  { row: 7, col: 14 }, // Yellow Corner
  { row: 8, col: 14 }, { row: 8, col: 13 }, { row: 8, col: 12 }, { row: 8, col: 11 }, { row: 8, col: 10 }, { row: 8, col: 9 },
  // Blue Track (starts at 9, 8 going down)
  { row: 9, col: 8 }, { row: 10, col: 8 }, { row: 11, col: 8 }, { row: 12, col: 8 }, { row: 13, col: 8 }, { row: 14, col: 8 },
  { row: 14, col: 7 }, // Blue Corner
  { row: 14, col: 6 }, { row: 13, col: 6 }, { row: 12, col: 6 }, { row: 11, col: 6 }, { row: 10, col: 6 }, { row: 9, col: 6 },
  // Red Track return (starts at 8, 5 going left)
  { row: 8, col: 5 }, { row: 8, col: 4 }, { row: 8, col: 3 }, { row: 8, col: 2 }, { row: 8, col: 1 }, { row: 8, col: 0 },
  { row: 7, col: 0 } // Red Corner
];

/**
 * Map each color to its starting index in the MAIN_PATH
 */
export const START_INDEX: Record<LudoColor, number> = {
  red: 0,      // (6, 1)
  green: 13,   // (0, 8)
  yellow: 26,  // (8, 13)
  blue: 39     // (14, 6)
};

/**
 * Safe spots on Ludo board where tokens cannot be captured
 */
export const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47]; // Star cells & Starting spots

/**
 * Base Yards piece positioning offsets for standard 15x15 grid
 */
export const BASE_POSITIONS: Record<LudoColor, Position[]> = {
  red: [
    { row: 2, col: 2 }, { row: 2, col: 3 },
    { row: 3, col: 2 }, { row: 3, col: 3 }
  ],
  green: [
    { row: 2, col: 11 }, { row: 2, col: 12 },
    { row: 3, col: 11 }, { row: 3, col: 12 }
  ],
  yellow: [
    { row: 11, col: 11 }, { row: 11, col: 12 },
    { row: 12, col: 11 }, { row: 12, col: 12 }
  ],
  blue: [
    { row: 11, col: 2 }, { row: 11, col: 3 },
    { row: 12, col: 2 }, { row: 12, col: 3 }
  ]
};

/**
 * Home Stretch tracks coordinate mappings (Index 51 to 56, where 57 is absolute Home)
 */
export const HOME_STRETCH: Record<LudoColor, Position[]> = {
  red: [
    { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, 
    { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }
  ],
  green: [
    { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, 
    { row: 4, col: 7 }, { row: 5, col: 7 }, { row: 6, col: 7 }
  ],
  yellow: [
    { row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 }, 
    { row: 7, col: 10 }, { row: 7, col: 9 }, { row: 7, col: 8 }
  ],
  blue: [
    { row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, 
    { row: 10, col: 7 }, { row: 9, col: 7 }, { row: 8, col: 7 }
  ]
};

/**
 * Absolute Home positions at the center
 */
export const HOME_POSITION: Record<LudoColor, Position> = {
  red: { row: 7, col: 6 },
  green: { row: 6, col: 7 },
  yellow: { row: 7, col: 8 },
  blue: { row: 8, col: 7 }
};

/**
 * Initialize 4 tokens per color
 */
export function createInitialTokens(colors: LudoColor[]): Record<LudoColor, LudoToken[]> {
  const tokens: any = {};
  
  colors.forEach((color) => {
    tokens[color] = Array(4).fill(null).map((_, i) => ({
      id: `token_${color}_${i}`,
      color,
      index: i,
      status: "base",
      stepsTraveled: 0,
      position: -1
    }));
  });

  return tokens;
}

/**
 * Get grid coordinates for any token position
 */
export function getTokenCoordinates(token: LudoToken): Position {
  const { color, status, stepsTraveled, index, position } = token;

  if (status === "base") {
    return BASE_POSITIONS[color][index];
  }

  if (status === "home" || stepsTraveled === 57) {
    return HOME_POSITION[color];
  }

  // Home stretch calculation (steps 51-56)
  if (stepsTraveled > 51) {
    const homeIndex = stepsTraveled - 52;
    return HOME_STRETCH[color][homeIndex];
  }

  // Standard main track path
  return MAIN_PATH[position];
}

/**
 * Calculate the next position index on the main 52 circular track
 */
export function getNextMainPosition(startPos: number, steps: number): number {
  return (startPos + steps) % 52;
}

/**
 * Validates if a specific token can legally move given a rolled dice value
 */
export function isValidLudoMove(token: LudoToken, roll: number): boolean {
  if (token.status === "home") return false;
  
  // Can only exit base if rolling a 6
  if (token.status === "base") {
    return roll === 6;
  }

  // Must land exactly on home (57 steps)
  return token.stepsTraveled + roll <= 57;
}

/**
 * Move a token along its path
 */
export function moveLudoToken(token: LudoToken, roll: number): LudoToken {
  const nextToken = { ...token };

  if (token.status === "base" && roll === 6) {
    nextToken.status = "active";
    nextToken.stepsTraveled = 1;
    nextToken.position = START_INDEX[token.color];
    return nextToken;
  }

  const nextSteps = token.stepsTraveled + roll;
  nextToken.stepsTraveled = nextSteps;

  if (nextSteps === 57) {
    nextToken.status = "home";
    nextToken.position = -1;
  } else if (nextSteps > 51) {
    nextToken.position = -1; // Home stretch doesn't map to main path
  } else {
    nextToken.position = getNextMainPosition(START_INDEX[token.color], nextSteps - 1);
  }

  return nextToken;
}
