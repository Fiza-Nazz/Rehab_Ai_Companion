import { create } from 'zustand';

interface AppState {
  isCheckingIn: boolean;
  setCheckingIn: (status: boolean) => void;
  // We can add more global states here like user profile, active alerts etc.
}

export const useAppStore = create<AppState>((set) => ({
  isCheckingIn: false,
  setCheckingIn: (status) => set({ isCheckingIn: status }),
}));
