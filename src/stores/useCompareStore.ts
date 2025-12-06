import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DataDocument } from '@/core/types';
import { parseFile } from '@/parsers';

export type CompareSource = 
  | { type: 'record'; index: number }
  | { type: 'column'; columnName: string }
  | { type: 'file'; document: DataDocument; recordIndex: number };

interface CompareState {
  // Comparison mode
  isComparing: boolean;
  
  // Left side (from main document)
  leftSource: CompareSource | null;
  
  // Right side (can be from main document or external file)
  rightSource: CompareSource | null;
  
  // External file for comparison (optional)
  externalDocument: DataDocument | null;
  externalFileName: string | null;
  
  // Actions
  startCompare: () => void;
  stopCompare: () => void;
  setLeftSource: (source: CompareSource) => void;
  setRightSource: (source: CompareSource) => void;
  loadExternalFile: (file: File) => Promise<void>;
  clearExternalFile: () => void;
  swapSides: () => void;
  reset: () => void;
}

export const useCompareStore = create<CompareState>()(
  immer((set) => ({
    isComparing: false,
    leftSource: null,
    rightSource: null,
    externalDocument: null,
    externalFileName: null,

    startCompare: () => {
      set((state) => {
        state.isComparing = true;
      });
    },

    stopCompare: () => {
      set((state) => {
        state.isComparing = false;
      });
    },

    setLeftSource: (source: CompareSource) => {
      set((state) => {
        state.leftSource = source;
      });
    },

    setRightSource: (source: CompareSource) => {
      set((state) => {
        state.rightSource = source;
      });
    },

    loadExternalFile: async (file: File) => {
      try {
        const content = await file.text();
        const result = parseFile(content, file.name, { lenient: true });

        if (result.success && result.document) {
          set((state) => {
            state.externalDocument = result.document!;
            state.externalFileName = file.name;
            // Auto-set right source to first record of external file
            state.rightSource = {
              type: 'file',
              document: result.document!,
              recordIndex: 0,
            };
          });
        }
      } catch (error) {
        console.error('Failed to load external file for comparison:', error);
      }
    },

    clearExternalFile: () => {
      set((state) => {
        state.externalDocument = null;
        state.externalFileName = null;
        if (state.rightSource?.type === 'file') {
          state.rightSource = null;
        }
      });
    },

    swapSides: () => {
      set((state) => {
        const temp = state.leftSource;
        state.leftSource = state.rightSource;
        state.rightSource = temp;
      });
    },

    reset: () => {
      set((state) => {
        state.isComparing = false;
        state.leftSource = null;
        state.rightSource = null;
        state.externalDocument = null;
        state.externalFileName = null;
      });
    },
  }))
);

