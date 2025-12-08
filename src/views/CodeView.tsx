import { useRef, useEffect, useCallback, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const fontSizeMap = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 18,
};

export function CodeView() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const matchesRef = useRef<editor.FindMatch[]>([]);
  const currentMatchIndexRef = useRef(0);
  const [originalContent, setOriginalContent] = useState('');

  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);
  const isEditing = useDocumentStore((s) => s.editor.isEditing);
  const hasChanges = useDocumentStore((s) => s.editor.hasChanges);
  const setEditorState = useCallback((updates: { hasChanges?: boolean }) => {
    useDocumentStore.setState((state) => ({
      editor: { ...state.editor, ...updates }
    }));
  }, []);
  const search = useDocumentStore((s) => s.search);

  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const showMinimap = useSettingsStore((s) => s.showMinimap);
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers);
  const wordWrap = useSettingsStore((s) => s.wordWrap);

  const currentRecord = document?.records[currentIndex];

  // Get the ORIGINAL content (for comparison)
  const getOriginalContent = useCallback(() => {
    if (!currentRecord) return '';
    return JSON.stringify(currentRecord.data, null, 2);
  }, [currentRecord]);

  // Get the content for current record (check modified first)
  const getRecordContent = useCallback(() => {
    if (!currentRecord) return '';
    // Check if this record has been modified (read directly from store to avoid dependency issues)
    const modifiedRecords = useDocumentStore.getState().editor.modifiedRecords;
    const modified = modifiedRecords.get(currentIndex);
    if (modified !== undefined) {
      return JSON.stringify(modified, null, 2);
    }
    return JSON.stringify(currentRecord.data, null, 2);
  }, [currentRecord, currentIndex]);

  // Set original content when record changes
  useEffect(() => {
    const original = getOriginalContent();
    const content = getRecordContent();
    setOriginalContent(original);

    // Check if this record has modifications
    const modifiedRecords = useDocumentStore.getState().editor.modifiedRecords;
    const hasModifications = modifiedRecords.has(currentIndex);

    // Only update hasChanges if it's different to avoid loops
    const currentHasChanges = useDocumentStore.getState().editor.hasChanges;
    if (currentHasChanges !== hasModifications) {
      setEditorState({ hasChanges: hasModifications });
    }

    // Update editor with content (modified if available)
    if (editorRef.current) {
      editorRef.current.setValue(content);
    }
  }, [currentIndex, getRecordContent, getOriginalContent, setEditorState]);

  // Reset editor when exiting edit mode
  useEffect(() => {
    if (!isEditing && editorRef.current && hasChanges) {
      editorRef.current.setValue(originalContent);
      setEditorState({ hasChanges: false });
    }
  }, [isEditing]);

  // Handle search highlighting
  const updateSearchDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // Clear previous decorations
    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }
    matchesRef.current = [];
    currentMatchIndexRef.current = 0;

    const inDocTerm = useDocumentStore.getState().search.inDocTerm;
    if (!inDocTerm) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(inDocTerm, true, false, false, null, true);
    matchesRef.current = matches;

    if (matches.length > 0) {
      // Create decorations for all matching lines
      const decorations = matches.map((match) => ({
        range: new monaco.Range(
          match.range.startLineNumber,
          1,
          match.range.startLineNumber,
          model.getLineMaxColumn(match.range.startLineNumber)
        ),
        options: {
          isWholeLine: true,
          className: 'search-highlight-line',
          overviewRuler: {
            color: '#f59e0b',
            position: monaco.editor.OverviewRulerLane.Full
          }
        }
      }));

      decorationsRef.current = editor.createDecorationsCollection(decorations);

      // Scroll to first match
      editor.revealLineInCenter(matches[0].range.startLineNumber);
      editor.setPosition({
        lineNumber: matches[0].range.startLineNumber,
        column: matches[0].range.startColumn
      });
    }
  }, []);

  useEffect(() => {
    updateSearchDecorations();
  }, [search.inDocTerm, updateSearchDecorations]);

  // Navigate to next/prev search match
  const navigateToMatch = useCallback((direction: 'next' | 'prev') => {
    const editor = editorRef.current;
    if (!editor || matchesRef.current.length === 0) return;

    if (direction === 'next') {
      currentMatchIndexRef.current = (currentMatchIndexRef.current + 1) % matchesRef.current.length;
    } else {
      currentMatchIndexRef.current = (currentMatchIndexRef.current - 1 + matchesRef.current.length) % matchesRef.current.length;
    }

    const match = matchesRef.current[currentMatchIndexRef.current];
    editor.revealLineInCenter(match.range.startLineNumber);
    editor.setPosition({
      lineNumber: match.range.startLineNumber,
      column: match.range.startColumn
    });
    editor.setSelection(match.range);
  }, []);

  // Listen for search navigation events
  useEffect(() => {
    const handleSearchPrev = () => navigateToMatch('prev');
    const handleSearchNext = () => navigateToMatch('next');

    window.addEventListener('search-nav-prev', handleSearchPrev);
    window.addEventListener('search-nav-next', handleSearchNext);

    return () => {
      window.removeEventListener('search-nav-prev', handleSearchPrev);
      window.removeEventListener('search-nav-next', handleSearchNext);
    };
  }, [navigateToMatch]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const container = window.document.getElementById('toast-container');
    if (!container) return;

    const toast = window.document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      ${message}
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set initial content
    const content = getRecordContent();
    editor.setValue(content);

    // Override Ctrl+F to use our search
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      const searchInput = window.document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    });

    // Track changes when editing and save to store
    // Track changes when editing and save to store
    editor.onDidChangeModelContent(() => {
      const state = useDocumentStore.getState();
      const currentIsEditing = state.editor.isEditing;
      if (currentIsEditing) {
        const currentContent = editor.getValue();
        const storedOriginal = originalContent || getOriginalContent();
        const contentChanged = currentContent !== storedOriginal;

        // Try to parse the edited content and save to modifiedRecords
        if (contentChanged) {
          try {
            const parsedData = JSON.parse(currentContent);
            const idx = state.currentIndex;
            state.setRecordModification(idx, parsedData);
          } catch {
            // JSON is invalid, just mark as changed but don't save
            // We can't really save invalid JSON to the record map comfortably without changing types
            // For now, we rely on the user fixing the JSON.
            // But we could potentially flag UI that there are errors.
            // The previous logic just set hasChanges=true. 
            // We can't easily do that with the new action unless we add a separate flag or allow invalid data.
            // Let's stick strictly to valid JSON for now, or the UI won't match.
          }
        } else {
          // Content matches original, remove from modifiedRecords if present
          const idx = state.currentIndex;
          state.setRecordModification(idx, null);
        }
      }
    });

    // Single click to copy in view mode
    editor.onMouseDown((e) => {
      const currentIsEditing = useDocumentStore.getState().editor.isEditing;
      if (currentIsEditing) return;
      if (e.event.detail !== 1) return;

      const position = e.target.position;
      if (!position) return;

      const model = editor.getModel();
      if (!model) return;

      const wordInfo = model.getWordAtPosition(position);
      if (!wordInfo) return;

      const line = model.getLineContent(position.lineNumber);
      let textToCopy = wordInfo.word;

      // Try to get the full string value
      const stringMatch = line.match(/"([^"\\]|\\.)*"/g);
      if (stringMatch) {
        for (const str of stringMatch) {
          const strStart = line.indexOf(str);
          const strEnd = strStart + str.length;
          if (wordInfo.startColumn - 1 >= strStart && wordInfo.endColumn - 1 <= strEnd) {
            textToCopy = str.slice(1, -1);
            break;
          }
        }
      }

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Copied: ${textToCopy.length > 30 ? textToCopy.substring(0, 30) + '...' : textToCopy}`, 'success');
      });
    });

    editor.focus();
  }, [getRecordContent, getOriginalContent, showToast, originalContent]);

  const monacoTheme = theme === 'dark' ? 'jsonlol-dark' : 'jsonlol-light';

  return (
    <div className={`code-view ${isEditing ? 'editing' : ''}`}>
      <Editor
        height="100%"
        language="json"
        theme={monacoTheme}
        onMount={handleEditorMount}
        options={{
          readOnly: !isEditing,
          fontSize: fontSizeMap[fontSize],
          fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
          fontLigatures: true,
          minimap: { enabled: showMinimap },
          lineNumbers: showLineNumbers ? 'on' : 'off',
          wordWrap: wordWrap ? 'on' : 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          renderLineHighlight: 'all',
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 12, bottom: 12 },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          copyWithSyntaxHighlighting: false,
        }}
        beforeMount={(monaco) => {
          // Clean Light Theme - refined colors
          monaco.editor.defineTheme('jsonlol-light', {
            base: 'vs',
            inherit: true,
            rules: [
              { token: 'string.key.json', foreground: '1e40af', fontStyle: 'bold' },   // Deep blue for keys
              { token: 'string.value.json', foreground: '047857' },                     // Emerald green for strings
              { token: 'number', foreground: 'b45309' },                                 // Warm amber for numbers
              { token: 'keyword', foreground: 'be185d', fontStyle: 'bold' },            // Pink for true/false/null
            ],
            colors: {
              'editor.background': '#fafafa',
              'editor.foreground': '#1f2937',
              'editor.lineHighlightBackground': '#f3f4f6',
              'editorLineNumber.foreground': '#9ca3af',
              'editorLineNumber.activeForeground': '#1e40af',
              'editor.selectionBackground': '#3b82f620',
              'editor.inactiveSelectionBackground': '#3b82f610',
              'editorBracketMatch.background': '#3b82f615',
              'editorBracketMatch.border': '#3b82f6',
            },
          });

          // Midnight Gold Theme
          monaco.editor.defineTheme('jsonlol-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'string.key.json', foreground: 'fbbf24', fontStyle: 'bold' },   // Gold
              { token: 'string.value.json', foreground: 'a78bfa' },                     // Light violet
              { token: 'number', foreground: '22d3ee' },                                 // Cyan
              { token: 'keyword', foreground: '4ade80', fontStyle: 'bold' },            // Green (true/false/null)
            ],
            colors: {
              'editor.background': '#141414',
              'editor.foreground': '#fafafa',
              'editor.lineHighlightBackground': '#1f1f1f',
              'editorLineNumber.foreground': '#525252',
              'editorLineNumber.activeForeground': '#fbbf24',
              'editor.selectionBackground': '#fbbf2425',
              'editor.inactiveSelectionBackground': '#fbbf2412',
              'editorBracketMatch.background': '#fbbf2420',
              'editorBracketMatch.border': '#fbbf24',
            },
          });
        }}
      />

      {currentRecord?.errors && currentRecord.errors.length > 0 && (
        <div className="code-view-errors">
          {currentRecord.errors.map((error, i) => (
            <div key={i} className="error-notification">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
