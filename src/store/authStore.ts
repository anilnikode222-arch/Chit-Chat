import { create } from 'zustand';
import { User } from 'firebase/auth';
import { deriveMasterKey } from '../crypto/ratchet';

interface AuthState {
  user: User | null;
  profile: any | null;
  masterPassphrase: string | null;
  mek: Uint8Array | null;
  isUnlocked: boolean;
  devices: any[];
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  unlockVault: (passphrase: string, salt: string) => Promise<boolean>;
  lockVault: () => void;
  setDevices: (devices: any[]) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  masterPassphrase: null,
  mek: null,
  isUnlocked: false,
  devices: [],

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  unlockVault: async (passphrase, salt) => {
    try {
      const derivedMek = await deriveMasterKey(passphrase, salt);
      set({
        masterPassphrase: passphrase,
        mek: derivedMek,
        isUnlocked: true
      });
      return true;
    } catch (e) {
      console.error("Vault unlock failed:", e);
      return false;
    }
  },

  lockVault: () => {
    set({
      masterPassphrase: null,
      mek: null,
      isUnlocked: false
    });
  },

  setDevices: (devices) => set({ devices })
}));
