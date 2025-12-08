import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { DiffEditor, DiffOnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { useCompareStore, type CompareSource } from '@/stores/useCompareStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const fontSizeMap = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 18,
};

// Custom Dropdown Component
function RecordDropdown({
  value,
  onChange,
  records,
  externalRecords,
  externalFileName,
  side
}: {
  value: number;
  onChange: (index: number, isExternal?: boolean) => void;
  records: { data: unknown }[];
  externalRecords?: { data: unknown }[];
  externalFileName?: string | null;
  side: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRecords = records.filter((_, i) =>
    search === '' || `Record ${i + 1}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredExternalRecords = externalRecords?.filter((_, i) =>
    search === '' || `Record ${i + 1}`.toLowerCase().includes(search.toLowerCase())
  );

  const getPreview = (data: unknown) => {
    const str = JSON.stringify(data);
    return str.length > 30 ? str.substring(0, 30) + '...' : str;
  };

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="dropdown-value">Record {value + 1}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`custom-dropdown-menu ${side}`}>
          <div className="dropdown-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="dropdown-clear">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="dropdown-list">
            <div className="dropdown-group-label">Current File</div>
            {filteredRecords.slice(0, 100).map((record, i) => {
              const actualIndex = records.indexOf(record);
              return (
                <button
                  key={`record-${actualIndex}`}
                  className={`dropdown-item ${actualIndex === value ? 'active' : ''}`}
                  onClick={() => {
                    onChange(actualIndex, false);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="dropdown-item-index">{actualIndex + 1}</span>
                  <span className="dropdown-item-preview">{getPreview(record.data)}</span>
                  {actualIndex === value && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-check">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}

            {externalRecords && externalRecords.length > 0 && (
              <>
                <div className="dropdown-group-label">{externalFileName || 'External File'}</div>
                {filteredExternalRecords?.slice(0, 100).map((record, i) => {
                  const actualIndex = externalRecords.indexOf(record);
                  return (
                    <button
                      key={`ext-${actualIndex}`}
                      className="dropdown-item"
                      onClick={() => {
                        onChange(actualIndex, true);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      <span className="dropdown-item-index">{actualIndex + 1}</span>
                      <span className="dropdown-item-preview">{getPreview(record.data)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CompareView() {
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);

  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);

  const {
    leftSource,
    rightSource,
    externalDocument,
    externalFileName,
    setLeftSource,
    setRightSource,
    loadExternalFile,
    clearExternalFile,
    swapSides,
  } = useCompareStore();

  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);

  // Get content for a source
  const getSourceContent = useCallback((source: CompareSource | null): string => {
    if (!source) return '// Select a source to compare';

    switch (source.type) {
      case 'record': {
        if (!document) return '';
        const record = document.records[source.index];
        return record ? JSON.stringify(record.data, null, 2) : '';
      }
      case 'column': {
        if (!document) return '';
        // Extract column values from all records
        const columnData = document.records.map((r) => {
          const data = r.data as Record<string, unknown>;
          return data[source.columnName];
        });
        return JSON.stringify(columnData, null, 2);
      }
      case 'file': {
        const record = source.document.records[source.recordIndex];
        return record ? JSON.stringify(record.data, null, 2) : '';
      }
      default:
        return '';
    }
  }, [document]);

  const leftContent = useMemo(() => getSourceContent(leftSource), [leftSource, getSourceContent]);
  const rightContent = useMemo(() => getSourceContent(rightSource), [rightSource, getSourceContent]);

  // Auto-set left source to current record if not set
  useEffect(() => {
    if (!leftSource && document) {
      setLeftSource({ type: 'record', index: currentIndex });
    }
  }, [document, currentIndex, leftSource, setLeftSource]);

  const handleEditorMount: DiffOnMount = useCallback((editor) => {
    diffEditorRef.current = editor;
  }, []);

  // Handle file drop for external comparison
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      loadExternalFile(file);
    }
  }, [loadExternalFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadExternalFile(file);
    }
  }, [loadExternalFile]);

  // Get label for a source
  const getSourceLabel = (source: CompareSource | null): string => {
    if (!source) return 'Not selected';
    switch (source.type) {
      case 'record':
        return `Record ${source.index + 1}`;
      case 'column':
        return `Column: ${source.columnName}`;
      case 'file':
        return `${externalFileName || 'External'} #${source.recordIndex + 1}`;
    }
  };

  const monacoTheme = theme === 'dark' ? 'jsonlol-dark' : 'jsonlol-light';

  const handleLeftChange = useCallback((index: number) => {
    setLeftSource({ type: 'record', index });
  }, [setLeftSource]);

  const handleRightChange = useCallback((index: number, isExternal?: boolean) => {
    if (isExternal && externalDocument) {
      setRightSource({ type: 'file', document: externalDocument, recordIndex: index });
    } else {
      setRightSource({ type: 'record', index });
    }
  }, [setRightSource, externalDocument]);

  return (
    <div className="compare-view">
      {/* Compare selector bar */}
      <div className="compare-selector-bar">
        <div className="compare-source-panel left">
          <span className="source-label">LEFT</span>
          <RecordDropdown
            value={leftSource?.type === 'record' ? leftSource.index : 0}
            onChange={handleLeftChange}
            records={document?.records ?? []}
            side="left"
          />
        </div>

        <div className="compare-actions">
          <button className="btn-swap" onClick={swapSides} title="Swap sides">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="7 16 3 12 7 8" />
              <line x1="21" y1="12" x2="3" y2="12" />
              <polyline points="17 8 21 12 17 16" />
            </svg>
          </button>

          {externalDocument ? (
            <button className="btn-file-action remove" onClick={clearExternalFile} title={`Remove ${externalFileName}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <line x1="9" y1="11" x2="15" y2="17" />
                <line x1="15" y1="11" x2="9" y2="17" />
              </svg>
              <span>Remove</span>
            </button>
          ) : (
            <label className="btn-file-action add">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>Add File</span>
              <input
                type="file"
                accept=".json,.jsonl,.csv,.tsv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        <div className="compare-source-panel right">
          <span className="source-label">RIGHT</span>
          <RecordDropdown
            value={
              rightSource?.type === 'record'
                ? rightSource.index
                : rightSource?.type === 'file'
                  ? rightSource.recordIndex
                  : 0
            }
            onChange={handleRightChange}
            records={document?.records ?? []}
            externalRecords={externalDocument?.records}
            externalFileName={externalFileName}
            side="right"
          />
        </div>
      </div>

      {/* Diff editor */}
      <div
        className="compare-editor"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
      >
        <DiffEditor
          key={`${leftSource?.type}-${leftSource?.type === 'record' ? leftSource.index : ''}-${rightSource?.type}-${rightSource?.type === 'record' ? rightSource.index : ''}`}
          height="100%"
          language="json"
          theme={monacoTheme}
          original={leftContent}
          modified={rightContent}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            fontSize: fontSizeMap[fontSize],
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderSideBySide: true,
            enableSplitViewResizing: true,
            originalEditable: false,
            renderOverviewRuler: true,
            diffWordWrap: 'on',
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            padding: { top: 12, bottom: 12 },
          }}
          beforeMount={(monaco) => {
            // Clean Light Theme for Diff
            monaco.editor.defineTheme('jsonlol-light', {
              base: 'vs',
              inherit: true,
              rules: [
                { token: 'string.key.json', foreground: '0d9488', fontStyle: 'bold' },
                { token: 'string.value.json', foreground: '7c3aed' },
                { token: 'number', foreground: 'f59e0b' },
                { token: 'keyword', foreground: '06b6d4', fontStyle: 'bold' },
              ],
              colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#171717',
                'editor.lineHighlightBackground': '#f5f5f5',
                'editorLineNumber.foreground': '#a3a3a3',
                'diffEditor.insertedTextBackground': '#22c55e25',
                'diffEditor.removedTextBackground': '#ef444425',
                'diffEditor.insertedLineBackground': '#22c55e15',
                'diffEditor.removedLineBackground': '#ef444415',
              },
            });

            // Midnight Gold Theme for Diff
            monaco.editor.defineTheme('jsonlol-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'string.key.json', foreground: 'fbbf24', fontStyle: 'bold' },
                { token: 'string.value.json', foreground: 'a78bfa' },
                { token: 'number', foreground: '22d3ee' },
                { token: 'keyword', foreground: '4ade80', fontStyle: 'bold' },
              ],
              colors: {
                'editor.background': '#141414',
                'editor.foreground': '#fafafa',
                'editor.lineHighlightBackground': '#1f1f1f',
                'editorLineNumber.foreground': '#525252',
                'diffEditor.insertedTextBackground': '#22c55e30',
                'diffEditor.removedTextBackground': '#ef444430',
                'diffEditor.insertedLineBackground': '#22c55e18',
                'diffEditor.removedLineBackground': '#ef444418',
              },
            });
          }}
        />
      </div>

      {/* Drop zone overlay when dragging */}
      {!externalDocument && (
        <div className="compare-drop-hint">
          Drag and drop a file here to compare
        </div>
      )}
    </div>
  );
}

