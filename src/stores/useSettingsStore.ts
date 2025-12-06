import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, FontSize } from '@/core/types';

export type ViewMode = 'code' | 'table';

interface UISettings {
  theme: Theme;
  fontSize: FontSize;
  showMinimap: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  viewMode: ViewMode;
}

interface SettingsState extends UISettings {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setFontSize: (size: FontSize) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setShowMinimap: (show: boolean) => void;
  setShowLineNumbers: (show: boolean) => void;
  setWordWrap: (wrap: boolean) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  resetSettings: () => void;
}

const fontSizes: FontSize[] = ['small', 'medium', 'large', 'xlarge'];

const defaultSettings: UISettings = {
  theme: 'light',
  fontSize: 'medium',
  showMinimap: false,
  showLineNumbers: true,
  wordWrap: true,
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  viewMode: 'code',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const current = get().theme;
        const next: Theme = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },

      setFontSize: (fontSize: FontSize) => {
        set({ fontSize });
      },

      increaseFontSize: () => {
        const current = get().fontSize;
        const currentIndex = fontSizes.indexOf(current);
        if (currentIndex < fontSizes.length - 1) {
          set({ fontSize: fontSizes[currentIndex + 1] });
        }
      },

      decreaseFontSize: () => {
        const current = get().fontSize;
        const currentIndex = fontSizes.indexOf(current);
        if (currentIndex > 0) {
          set({ fontSize: fontSizes[currentIndex - 1] });
        }
      },

      setShowMinimap: (showMinimap: boolean) => {
        set({ showMinimap });
      },

      setShowLineNumbers: (showLineNumbers: boolean) => {
        set({ showLineNumbers });
      },

      setWordWrap: (wordWrap: boolean) => {
        set({ wordWrap });
      },

      setLeftSidebarOpen: (leftSidebarOpen: boolean) => {
        set({ leftSidebarOpen });
      },

      setRightSidebarOpen: (rightSidebarOpen: boolean) => {
        set({ rightSidebarOpen });
      },

      setViewMode: (viewMode: ViewMode) => {
        set({ viewMode });
      },

      resetSettings: () => {
        set(defaultSettings);
        applyTheme(defaultSettings.theme);
      },
    }),
    {
      name: 'jsonlol-settings',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        showMinimap: state.showMinimap,
        showLineNumbers: state.showLineNumbers,
        wordWrap: state.wordWrap,
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        viewMode: state.viewMode,
      }),
    }
  )
);

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('jsonlol-settings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      applyTheme(parsed.state?.theme || 'light');
    } catch {
      applyTheme('light');
    }
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = useSettingsStore.getState().theme;
    if (current === 'system') {
      applyTheme('system');
    }
  });
}
