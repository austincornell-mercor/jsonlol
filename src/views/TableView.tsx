import { useMemo, useCallback, useRef, useState, useEffect, CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, GridApi, CellClickedEvent, FilterChangedEvent, RowClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface ExpandedCell {
  rowIndex: number;
  field: string;
  value: string;
  isEditing: boolean;
}

// Simple JSON syntax highlighter
function highlightJSON(str: string): string {
  // Check if it looks like JSON
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) {
    return escapeHtml(str);
  }

  try {
    // Validate it's JSON
    JSON.parse(str);

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
        let cls = 'json-string';
        if (/:$/.test(match)) {
          cls = 'json-key';
          match = match.slice(0, -1) + '<span class="json-colon">:</span>';
        }
        return `<span class="${cls}">${match}</span>`;
      })
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
      .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>');
  } catch {
    return escapeHtml(str);
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function TableView() {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const expandedCellRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [expandedCell, setExpandedCell] = useState<ExpandedCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hasFilters, setHasFilters] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);
  const setCurrentIndex = useDocumentStore((s) => s.setCurrentIndex);
  const searchTerm = useDocumentStore((s) => s.search.inDocTerm);
  const isEditing = useDocumentStore((s) => s.editor.isEditing);
  const modifiedRecords = useDocumentStore((s) => s.editor.modifiedRecords);
  const theme = useSettingsStore((s) => s.theme);

  // Get row data from records, applying modifications
  const rowData = useMemo(() => {
    if (!document) return [];
    return document.records.map((record, index) => {
      const modified = modifiedRecords.get(index);
      const data = modified !== undefined ? modified : record.data;
      return {
        ...data as Record<string, unknown>,
        _rowIndex: index,
      };
    });
  }, [document, modifiedRecords]);

  // Track which cells have been modified
  const getModifiedCells = useCallback(() => {
    const cells = new Set<string>();
    modifiedRecords.forEach((modifiedData, rowIndex) => {
      const originalData = document?.records[rowIndex]?.data as Record<string, unknown>;
      if (originalData && modifiedData) {
        const modData = modifiedData as Record<string, unknown>;
        Object.keys(modData).forEach(key => {
          if (JSON.stringify(originalData[key]) !== JSON.stringify(modData[key])) {
            cells.add(`${rowIndex}-${key}`);
          }
        });
      }
    });
    return cells;
  }, [modifiedRecords, document]);

  const modifiedCells = useMemo(() => getModifiedCells(), [getModifiedCells]);

  // Check if cell matches search
  const cellMatchesSearch = useCallback((value: unknown, search: string): boolean => {
    if (!search) return false;
    const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    return strValue.toLowerCase().includes(search.toLowerCase());
  }, []);

  // Generate column definitions from data
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!document || document.records.length === 0) return [];

    const cellStyle = (params: { value: unknown; data: { _rowIndex: number }; colDef: { field?: string } }) => {
      const cellKey = `${params.data?._rowIndex}-${params.colDef?.field}`;
      const isModified = modifiedCells.has(cellKey);
      const matchesSearch = cellMatchesSearch(params.value, searchTerm);

      const style: CSSProperties = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: isModified
          ? 'rgba(245, 158, 11, 0.25)'
          : matchesSearch
            ? 'rgba(245, 158, 11, 0.15)'
            : undefined,
        borderLeft: isModified ? '3px solid #f59e0b' : undefined,
      };
      return style as any;
    };

    // Use meta columns if available (CSV), otherwise infer from first record
    if (document.meta.columns) {
      return document.meta.columns.map(col => ({
        field: col.field,
        headerName: col.headerName,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        maxWidth: 400,
        flex: 1,
        cellStyle,
      }));
    }

    // Infer from first record
    const firstRecord = document.records[0]?.data;
    if (!firstRecord || typeof firstRecord !== 'object') return [];

    return Object.keys(firstRecord as Record<string, unknown>).map(key => ({
      field: key,
      headerName: key,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
      maxWidth: 400,
      flex: 1,
      cellStyle,
    }));
  }, [document, modifiedCells, searchTerm, cellMatchesSearch]);

  // Default column definition
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 80,
  }), []);

  // Handle row selection from sidebar - scroll to and highlight the row
  useEffect(() => {
    if (gridApiRef.current && document) {
      // Clear any existing selection
      gridApiRef.current.deselectAll();

      // Find the row node by index
      const rowNode = gridApiRef.current.getRowNode(String(currentIndex));
      if (rowNode) {
        rowNode.setSelected(true);
        gridApiRef.current.ensureIndexVisible(currentIndex, 'middle');
      }
    }
  }, [currentIndex, document]);

  // Handle row selection
  const onRowClicked = useCallback((event: { data: { _rowIndex: number } } | RowClickedEvent) => {
    if (event.data?._rowIndex !== undefined) {
      setCurrentIndex(event.data._rowIndex);
    }
  }, [setCurrentIndex]);

  // Handle cell click to expand/edit
  const onCellClicked = useCallback((event: CellClickedEvent) => {
    const value = event.value;
    const field = event.colDef?.field || '';
    const rowIndex = event.data?._rowIndex ?? 0;

    if (value !== null && value !== undefined && field) {
      const strValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      setExpandedCell({
        rowIndex,
        field,
        value: strValue,
        isEditing: isEditing
      });
      setEditValue(strValue);
      // Reset modal position to center
      setModalPosition({ x: 0, y: 0 });
    }
  }, [isEditing]);

  // Handle grid ready
  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridApiRef.current = event.api;
    event.api.sizeColumnsToFit();
  }, []);

  // Handle filter changes
  const onFilterChanged = useCallback((event: FilterChangedEvent) => {
    const filterModel = event.api.getFilterModel();
    setHasFilters(Object.keys(filterModel).length > 0);
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.setFilterModel(null);
      setHasFilters(false);
    }
  }, []);

  // Apply quick filter when search term changes
  useEffect(() => {
    if (gridApiRef.current) {
      gridApiRef.current.setGridOption('quickFilterText', searchTerm);
      // Force refresh to update cell styles
      gridApiRef.current.refreshCells({ force: true });
    }
  }, [searchTerm]);

  // Get row ID for proper selection
  const getRowId = useCallback((params: { data: { _rowIndex: number } }) => {
    return String(params.data._rowIndex);
  }, []);

  // Close expanded cell
  const closeExpandedCell = useCallback(() => {
    setExpandedCell(null);
    setEditValue('');
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (expandedCellRef.current && !expandedCellRef.current.contains(e.target as Node)) {
        closeExpandedCell();
      }
    };

    if (expandedCell && !isDragging) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedCell, closeExpandedCell, isDragging]);

  // Focus textarea when editing
  useEffect(() => {
    if (expandedCell?.isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [expandedCell]);

  // Drag handling
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.btn-expanded')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y,
    });
  }, [modalPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setModalPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Copy value to clipboard
  const handleCopy = useCallback(() => {
    if (expandedCell) {
      navigator.clipboard.writeText(expandedCell.value);
      const container = window.document.getElementById('toast-container');
      if (container) {
        const toast = window.document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Copied!
        `;
        container.appendChild(toast);
        setTimeout(() => {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 300);
        }, 1500);
      }
      closeExpandedCell();
    }
  }, [expandedCell, closeExpandedCell]);

  // Save edited value
  const handleSave = useCallback(() => {
    if (!expandedCell || !document) return;

    const { rowIndex, field } = expandedCell;

    const currentModified = modifiedRecords.get(rowIndex);
    const originalData = document.records[rowIndex]?.data as Record<string, unknown>;
    const currentData = currentModified !== undefined
      ? currentModified as Record<string, unknown>
      : { ...originalData };

    let newValue: unknown = editValue;
    try {
      newValue = JSON.parse(editValue);
    } catch {
      newValue = editValue;
    }

    const updatedData = {
      ...currentData,
      [field]: newValue,
    };

    useDocumentStore.getState().setRecordModification(rowIndex, updatedData);

    if (gridApiRef.current) {
      gridApiRef.current.refreshCells({ force: true });
    }

    closeExpandedCell();
  }, [expandedCell, editValue, document, modifiedRecords, closeExpandedCell]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeExpandedCell();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (expandedCell?.isEditing) {
        handleSave();
      } else {
        handleCopy();
      }
    }
  }, [closeExpandedCell, expandedCell, handleSave, handleCopy]);

  if (!document) {
    return (
      <div className="table-view-empty">
        <p>No data to display</p>
      </div>
    );
  }

  const gridTheme = theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';

  return (
    <div className="table-view" style={{ flex: 1, height: '100%' }}>
      {/* Clear Filters Button */}
      {hasFilters && (
        <div className="table-filters-bar">
          <button className="btn-clear-filters" onClick={clearAllFilters}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear all filters
          </button>
        </div>
      )}

      <div className={`${gridTheme} table-grid`} style={{ flex: 1, width: '100%', height: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="single"
          onRowClicked={onRowClicked}
          onCellClicked={onCellClicked}
          onGridReady={onGridReady}
          onFilterChanged={onFilterChanged}
          getRowId={getRowId}
          suppressCellFocus={true}
          enableCellTextSelection={true}
          pagination={true}
          paginationPageSize={100}
          paginationPageSizeSelector={[50, 100, 250, 500]}
          suppressRowClickSelection={true}
        />
      </div>

      {/* Inline Expanded Cell - Draggable */}
      {expandedCell && (
        <div className="expanded-cell-overlay">
          <div
            ref={expandedCellRef}
            className={`expanded-cell ${expandedCell.isEditing ? 'editing' : ''}`}
            style={{
              transform: `translate(calc(-50% + ${modalPosition.x}px), calc(-50% + ${modalPosition.y}px))`,
            }}
            onKeyDown={handleKeyDown}
          >
            <div
              className="expanded-cell-header"
              onMouseDown={handleDragStart}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <span className="expanded-cell-info">
                <strong>{expandedCell.field}</strong>
                <span className="expanded-cell-row">Row {expandedCell.rowIndex + 1}</span>
              </span>
              <div className="expanded-cell-actions">
                {expandedCell.isEditing ? (
                  <button className="btn-expanded save" onClick={handleSave} title="Save (⌘+Enter)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save
                  </button>
                ) : (
                  <button className="btn-expanded copy" onClick={handleCopy} title="Copy (⌘+Enter)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </button>
                )}
                <button className="btn-expanded close" onClick={closeExpandedCell} title="Close (Esc)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="expanded-cell-content">
              {expandedCell.isEditing ? (
                <textarea
                  ref={textareaRef}
                  className="expanded-cell-textarea"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <pre
                  className="expanded-cell-value"
                  dangerouslySetInnerHTML={{ __html: highlightJSON(expandedCell.value) }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
