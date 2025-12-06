import { useState, useEffect } from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { formatBytes } from '@/core/types';
import { getParser } from '@/parsers';

export function Header() {
  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);
  const reset = useDocumentStore((s) => s.reset);
  const editor = useDocumentStore((s) => s.editor);
  const setEditMode = useDocumentStore((s) => s.setEditMode);
  const discardChanges = useDocumentStore((s) => s.discardChanges);
  
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingEditMode, setPendingEditMode] = useState(false);

  const handleEditModeToggle = (enabled: boolean) => {
    if (!enabled && editor.hasChanges) {
      // Trying to disable edit mode with unsaved changes
      setPendingEditMode(false);
      setShowWarningModal(true);
    } else {
      setEditMode(enabled);
    }
  };

  const handleDiscardChanges = () => {
    discardChanges();
    setEditMode(false);
    setShowWarningModal(false);
  };

  const handleCancelDiscard = () => {
    setShowWarningModal(false);
  };

  const handleExportClick = () => {
    if (document?.isMultiRecord) {
      setShowExportModal(true);
    } else {
      exportCurrent();
    }
  };

  const getRecordData = (index: number) => {
    if (!document) return null;
    // Check if this record has been modified
    const modified = editor.modifiedRecords.get(index);
    if (modified !== undefined) {
      return modified;
    }
    return document.records[index]?.data;
  };

  const buildExportContent = (exportType: 'current' | 'all'): { content: string; ext: string; fileName: string } | null => {
    if (!document) return null;
    
    if (exportType === 'current') {
      const data = getRecordData(currentIndex);
      if (!data) return null;
      return {
        content: JSON.stringify(data, null, 2),
        ext: 'json',
        fileName: `record-${currentIndex + 1}.json`,
      };
    } else {
      let content: string;
      let ext: string;
      
      if (document.format === 'csv' || document.format === 'tsv') {
        // CSV/TSV export
        const data = document.records.map((_, index) => getRecordData(index) as Record<string, unknown>);
        const Papa = (window as unknown as { Papa?: typeof import('papaparse') }).Papa;
        if (Papa) {
          content = Papa.unparse(data);
        } else {
          // Fallback - simple CSV
          const headers = Object.keys(data[0] || {});
          const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
          content = [headers.join(','), ...rows].join('\n');
        }
        ext = document.format;
      } else if (document.format === 'jsonl') {
        const lines = document.records.map((_, index) => {
          const data = getRecordData(index);
          return JSON.stringify(data);
        });
        content = lines.join('\n');
        ext = 'jsonl';
      } else {
        const data = getRecordData(0);
        content = JSON.stringify(data, null, 2);
        ext = 'json';
      }
      
      return {
        content,
        ext,
        fileName: document.fileName.replace(/\.[^/.]+$/, `_export.${ext}`),
      };
    }
  };

  const exportCurrent = () => {
    const exportData = buildExportContent('current');
    if (!exportData) return;
    
    const blob = new Blob([exportData.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = exportData.fileName;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    showToast('Exported record!', 'success');
  };

  const exportAll = () => {
    const exportData = buildExportContent('all');
    if (!exportData) return;
    
    const blob = new Blob([exportData.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = exportData.fileName;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    showToast('Exported all records!', 'success');
  };

  const saveAndLoadCurrent = () => {
    const exportData = buildExportContent('current');
    if (!exportData) return;
    
    // Download the file
    const blob = new Blob([exportData.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = exportData.fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    // Load the content back into the app
    const loadContent = useDocumentStore.getState().loadContent;
    loadContent(exportData.content, exportData.fileName);
    
    setShowExportModal(false);
    showToast('Saved and loaded!', 'success');
  };

  const saveAndLoadAll = () => {
    const exportData = buildExportContent('all');
    if (!exportData) return;
    
    // Download the file
    const blob = new Blob([exportData.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = exportData.fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    // Load the content back into the app
    const loadContent = useDocumentStore.getState().loadContent;
    loadContent(exportData.content, exportData.fileName);
    
    setShowExportModal(false);
    showToast('Saved and loaded!', 'success');
  };

  const handleCopy = async () => {
    if (!document) return;
    
    const data = getRecordData(currentIndex);
    if (data) {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      showToast('Copied to clipboard!', 'success');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
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
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">
            <span className="header-logo">{'{}'}</span>
            jsonlol
          </h1>
          
          {document && (
            <div className="header-info">
              <span className="file-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {document.fileName}
              </span>
              <span className="record-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                {document.totalRecords.toLocaleString()} {document.totalRecords === 1 ? 'record' : 'records'}
              </span>
              <span className="file-size">{formatBytes(document.totalSize)}</span>
            </div>
          )}
        </div>

        <div className="header-actions">
          {document && (
            <>
              <button className="btn-header" onClick={reset} title="Load New File">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                <span>New</span>
              </button>

              <button 
                className={`btn-header ${editor.hasChanges ? 'has-changes' : ''}`} 
                onClick={handleExportClick} 
                title="Export"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export</span>
              </button>

              <button className="btn-header" onClick={handleCopy} title="Copy Current Record">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </button>

              <div className="header-divider" />

              {/* Edit Mode Toggle */}
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="edit-mode"
                  checked={editor.isEditing}
                  onChange={(e) => handleEditModeToggle(e.target.checked)}
                />
                <label htmlFor="edit-mode" className="toggle-label toggle-edit">
                  <span className="toggle-button" />
                </label>
                <span className="toggle-text">Edit</span>
              </div>
            </>
          )}

          <div className="header-divider" />

          {/* Theme Toggle */}
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="dark-mode"
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <label htmlFor="dark-mode" className="toggle-label toggle-dark">
              <span className="toggle-button" />
            </label>
            <span className="toggle-text">Dark</span>
          </div>
        </div>
      </header>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Options
            </div>
            <div className="modal-body">
              Choose what you'd like to export:
            </div>
            <div className="modal-options">
              <div className="modal-option-row">
                <div className="modal-option" onClick={exportCurrent}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div className="modal-option-content">
                    <strong>Current Record Only</strong>
                    <span>Export just this JSON record</span>
                  </div>
                </div>
                {editor.hasChanges && (
                  <button className="modal-btn modal-btn-success" onClick={saveAndLoadCurrent} title="Save file and reload it">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14}}>
                      <path d="M21 12a9 9 0 11-9-9" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                    Save & Load
                  </button>
                )}
              </div>
              <div className="modal-option-row">
                <div className="modal-option" onClick={exportAll}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <div className="modal-option-content">
                    <strong>Full {document?.format.toUpperCase()} File</strong>
                    <span>Export all {document?.totalRecords} records{editor.hasChanges ? ' (with edits)' : ''}</span>
                  </div>
                </div>
                {editor.hasChanges && (
                  <button className="modal-btn modal-btn-success" onClick={saveAndLoadAll} title="Save file and reload it">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14}}>
                      <path d="M21 12a9 9 0 11-9-9" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                    Save & Load
                  </button>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Unsaved Changes */}
      {showWarningModal && (
        <div className="modal-overlay" onClick={handleCancelDiscard}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Unsaved Changes
            </div>
            <div className="modal-body">
              You have unsaved changes. If you exit edit mode, your changes will be lost.
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={handleCancelDiscard}>
                Keep Editing
              </button>
              <button className="modal-btn modal-btn-danger" onClick={handleDiscardChanges}>
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
