export interface PlayerProfile {
  username: string;
  avatar: string;
  xp: number;
  level: number;
  stats: {
    chessPlayed: number;
    chessWon: number;
    ludoPlayed: number;
    ludoWon: number;
  };
  achievements: string[];
}

const DEFAULT_PROFILE: PlayerProfile = {
  username: "Challenger",
  avatar: "🎮",
  xp: 0,
  level: 1,
  stats: {
    chessPlayed: 0,
    chessWon: 0,
    ludoPlayed: 0,
    ludoWon: 0
  },
  achievements: []
};

class GameStorage {
  private prefix = "gamehub2d_";

  /**
   * Save any JSON object to localStorage safely
   */
  public save(key: string, data: any): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
    } catch (e) {
      console.error("Storage save failed:", e);
    }
  }

  /**
   * Load any JSON object from localStorage safely
   */
  public load<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(this.prefix + key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error("Storage load failed:", e);
      return defaultValue;
    }
  }

  /**
   * Remove a key
   */
  public remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Get/Save Player Profile Helper
   */
  public getProfile(): PlayerProfile {
    return this.load<PlayerProfile>("profile", DEFAULT_PROFILE);
  }

  public saveProfile(profile: PlayerProfile): void {
    this.save("profile", profile);
  }

  /**
   * Add XP to profile and trigger level up if needed
   */
  public addXP(amount: number): { levelUp: boolean; newLevel: number } {
    const profile = this.getProfile();
    profile.xp += amount;
    
    // Level up calculation (e.g. level = floor(xp / 1000) + 1)
    const newLevel = Math.floor(profile.xp / 1000) + 1;
    const levelUp = newLevel > profile.level;
    
    profile.level = newLevel;
    this.saveProfile(profile);
    
    return { levelUp, newLevel };
  }
}

export const gameStorage = new GameStorage();
export default gameStorage;
