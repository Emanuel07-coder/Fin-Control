import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  darkMode: boolean;
  currency: 'BRL' | 'USD' | 'EUR';
  toggleDarkMode: () => void;
  setCurrency: (currency: 'BRL' | 'USD' | 'EUR') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      darkMode: false,
      currency: 'BRL',
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'fincontrol-theme',
    }
  )
);
