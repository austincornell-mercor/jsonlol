import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DataDocument, DataRecord, SearchState, EditorState } from '@/core/types';
import { parseFile } from '@/parsers';

interface DocumentState {
  // Document data
  document: DataDocument | null;
  currentIndex: number;
  isLoading: boolean;
  loadError: string | null;

  // Search state
  search: SearchState;

  // Editor state
  editor: EditorState;

  // Actions
  loadFile: (file: File) => Promise<void>;
  loadContent: (content: string, fileName: string) => void;
  setCurrentIndex: (index: number) => void;
  navigateNext: () => void;
  navigatePrev: () => void;

  // Search actions
  setGlobalSearch: (term: string) => void;
  setInDocSearch: (term: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  clearSearch: () => void;

  // Editor actions
  setEditMode: (enabled: boolean) => void;
  updateRecord: (index: number, data: unknown) => void;
  setRecordModification: (index: number, data: unknown | null) => void;
  discardChanges: () => void;

  // Document actions
  getCurrentRecord: () => DataRecord | null;
  getFilteredRecords: () => DataRecord[];
  reset: () => void;
}

const initialSearchState: SearchState = {
  globalTerm: '',
  inDocTerm: '',
  currentMatch: 0,
  totalMatches: 0,
  useRegex: false,
  caseSensitive: false,
};

const initialEditorState: EditorState = {
  isEditing: false,
  hasChanges: false,
  modifiedRecords: new Map(),
};

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    // Initial state
    document: null,
    currentIndex: 0,
    isLoading: false,
    loadError: null,
    search: initialSearchState,
    editor: initialEditorState,

    // Load file from File object
    loadFile: async (file: File) => {
      set((state) => {
        state.isLoading = true;
        state.loadError = null;
      });

      try {
        const content = await file.text();
        const result = parseFile(content, file.name, { lenient: true });

        if (result.success && result.document) {
          set((state) => {
            state.document = result.document!;
            state.currentIndex = 0;
            state.isLoading = false;
            state.search = initialSearchState;
            state.editor = { ...initialEditorState, modifiedRecords: new Map() };
          });
        } else {
          set((state) => {
            state.loadError = result.errors[0]?.message || 'Failed to parse file';
            state.isLoading = false;
          });
        }
      } catch (error) {
        set((state) => {
          state.loadError = error instanceof Error ? error.message : 'Failed to read file';
          state.isLoading = false;
        });
      }
    },

    // Load from string content
    loadContent: (content: string, fileName: string) => {
      const result = parseFile(content, fileName, { lenient: true });

      if (result.success && result.document) {
        set((state) => {
          state.document = result.document!;
          state.currentIndex = 0;
          state.search = initialSearchState;
          state.editor = { ...initialEditorState, modifiedRecords: new Map() };
        });
      } else {
        set((state) => {
          state.loadError = result.errors[0]?.message || 'Failed to parse content';
        });
      }
    },

    // Navigation
    setCurrentIndex: (index: number) => {
      const { document } = get();
      if (!document) return;

      const clampedIndex = Math.max(0, Math.min(index, document.totalRecords - 1));
      set((state) => {
        state.currentIndex = clampedIndex;
      });
    },

    navigateNext: () => {
      const { document, currentIndex } = get();
      if (!document || currentIndex >= document.totalRecords - 1) return;

      set((state) => {
        state.currentIndex = currentIndex + 1;
      });
    },

    navigatePrev: () => {
      const { currentIndex } = get();
      if (currentIndex <= 0) return;

      set((state) => {
        state.currentIndex = currentIndex - 1;
      });
    },

    // Search
    setGlobalSearch: (term: string) => {
      set((state) => {
        state.search.globalTerm = term;
        state.search.currentMatch = 0;
        // Count matches
        if (term && state.document) {
          const searchLower = term.toLowerCase();
          let count = 0;
          for (const record of state.document.records) {
            if (JSON.stringify(record.data).toLowerCase().includes(searchLower)) {
              count++;
            }
          }
          state.search.totalMatches = count;
        } else {
          state.search.totalMatches = 0;
        }
      });
    },

    setInDocSearch: (term: string) => {
      set((state) => {
        state.search.inDocTerm = term;
        state.search.currentMatch = 0;
      });
    },

    nextMatch: () => {
      set((state) => {
        if (state.search.totalMatches > 0) {
          state.search.currentMatch = (state.search.currentMatch + 1) % state.search.totalMatches;
        }
      });
    },

    prevMatch: () => {
      set((state) => {
        if (state.search.totalMatches > 0) {
          state.search.currentMatch =
            state.search.currentMatch === 0
              ? state.search.totalMatches - 1
              : state.search.currentMatch - 1;
        }
      });
    },

    clearSearch: () => {
      set((state) => {
        state.search = initialSearchState;
      });
    },

    // Editor
    setEditMode: (enabled: boolean) => {
      set((state) => {
        state.editor.isEditing = enabled;
      });
    },

    updateRecord: (index: number, data: unknown) => {
      set((state) => {
        state.editor.modifiedRecords.set(index, data);
        state.editor.hasChanges = true;
      });
    },

    setRecordModification: (index: number, data: unknown | null) => {
      set((state) => {
        if (data === null) {
          state.editor.modifiedRecords.delete(index);
        } else {
          state.editor.modifiedRecords.set(index, data);
        }
        state.editor.hasChanges = state.editor.modifiedRecords.size > 0;
      });
    },

    discardChanges: () => {
      set((state) => {
        state.editor.modifiedRecords = new Map();
        state.editor.hasChanges = false;
      });
    },

    // Getters
    getCurrentRecord: () => {
      const { document, currentIndex } = get();
      if (!document || currentIndex < 0 || currentIndex >= document.records.length) {
        return null;
      }
      return document.records[currentIndex];
    },

    getFilteredRecords: () => {
      const { document, search } = get();
      if (!document) return [];

      if (!search.globalTerm) {
        return document.records;
      }

      const searchLower = search.globalTerm.toLowerCase();
      return document.records.filter(record =>
        JSON.stringify(record.data).toLowerCase().includes(searchLower)
      );
    },

    // Reset
    reset: () => {
      set((state) => {
        state.document = null;
        state.currentIndex = 0;
        state.isLoading = false;
        state.loadError = null;
        state.search = initialSearchState;
        state.editor = { ...initialEditorState, modifiedRecords: new Map() };
      });
    },
  }))
);

