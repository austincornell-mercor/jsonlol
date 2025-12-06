import { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCompareStore } from '@/stores/useCompareStore';

export function Toolbar() {
  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);
  const navigateNext = useDocumentStore((s) => s.navigateNext);
  const navigatePrev = useDocumentStore((s) => s.navigatePrev);
  const search = useDocumentStore((s) => s.search);
  const setInDocSearch = useDocumentStore((s) => s.setInDocSearch);
  
  const increaseFontSize = useSettingsStore((s) => s.increaseFontSize);
  const decreaseFontSize = useSettingsStore((s) => s.decreaseFontSize);
  const viewMode = useSettingsStore((s) => s.viewMode);
  const setViewMode = useSettingsStore((s) => s.setViewMode);

  const isComparing = useCompareStore((s) => s.isComparing);
  const startCompare = useCompareStore((s) => s.startCompare);
  const stopCompare = useCompareStore((s) => s.stopCompare);
  const setLeftSource = useCompareStore((s) => s.setLeftSource);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleToggleCompare = () => {
    if (isComparing) {
      stopCompare();
    } else {
      setLeftSource({ type: 'record', index: currentIndex });
      startCompare();
    }
  };

  // Handle global Ctrl+F keybind
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchNavPrev = () => {
    // Dispatch custom event for CodeView to handle
    window.dispatchEvent(new CustomEvent('search-nav-prev'));
  };

  const handleSearchNavNext = () => {
    // Dispatch custom event for CodeView to handle
    window.dispatchEvent(new CustomEvent('search-nav-next'));
  };

  if (!document) return null;

  const isMultiRecord = document.isMultiRecord;
  // Compare is always available as an option
  const showCompareButton = true;
  
  // Determine search placeholder based on format and view mode
  const getSearchPlaceholder = () => {
    if (viewMode === 'table') {
      return 'Filter table... (Ctrl+F)';
    }
    switch (document.format) {
      case 'csv':
        return 'Search CSV... (Ctrl+F)';
      case 'tsv':
        return 'Search TSV... (Ctrl+F)';
      case 'jsonl':
        return 'Find in JSONL... (Ctrl+F)';
      default:
        return 'Find in JSON... (Ctrl+F)';
    }
  };

  return (
    <div className="toolbar">
      {/* View Mode Switcher */}
      <div className="toolbar-section view-switcher">
        <button
          className={`btn-view ${viewMode === 'code' && !isComparing ? 'active' : ''} ${isComparing ? 'disabled' : ''}`}
          onClick={() => !isComparing && setViewMode('code')}
          title={isComparing ? 'Exit compare mode to switch views' : 'Code View'}
          disabled={isComparing}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Code</span>
        </button>
        <button
          className={`btn-view ${viewMode === 'table' && !isComparing ? 'active' : ''} ${isComparing ? 'disabled' : ''}`}
          onClick={() => !isComparing && setViewMode('table')}
          title={isComparing ? 'Exit compare mode to switch views' : 'Table View'}
          disabled={isComparing}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <span>Table</span>
        </button>
        
        {/* Compare button - always visible */}
        {showCompareButton && !isComparing && (
          <button
            className="btn-view btn-compare"
            onClick={handleToggleCompare}
            title="Compare Side-by-Side"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
            <span>Compare</span>
          </button>
        )}
        
        {/* Exit Compare - prominent when comparing */}
        {isComparing && (
          <button
            className="btn-view btn-exit-compare"
            onClick={handleToggleCompare}
            title="Exit Compare Mode"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Exit Compare</span>
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Navigation */}
      {isMultiRecord && viewMode === 'code' && !isComparing && (
        <>
          <div className="toolbar-section navigation-section">
            <button
              className="btn-nav"
              onClick={navigatePrev}
              disabled={currentIndex === 0}
              title="Previous Record (←)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="nav-info">
              <strong>{currentIndex + 1}</strong> / {document.totalRecords}
            </div>
            <button
              className="btn-nav"
              onClick={navigateNext}
              disabled={currentIndex >= document.totalRecords - 1}
              title="Next Record (→)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div className="toolbar-divider" />
        </>
      )}

      {/* Search - works in both views */}
      <div className="toolbar-section search-section">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder={getSearchPlaceholder()}
          value={search.inDocTerm}
          onChange={(e) => setInDocSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && viewMode === 'code') {
              if (e.shiftKey) {
                handleSearchNavPrev();
              } else {
                handleSearchNavNext();
              }
            } else if (e.key === 'Escape') {
              setInDocSearch('');
              e.currentTarget.blur();
            }
          }}
        />
        {search.inDocTerm && (
          <>
            {viewMode === 'code' && (
              <>
                <button className="btn-search-nav" onClick={handleSearchNavPrev} title="Previous Match (Shift+Enter)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button className="btn-search-nav" onClick={handleSearchNavNext} title="Next Match (Enter)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </>
            )}
            <button className="btn-clear" onClick={() => setInDocSearch('')} title="Clear (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Table View Info */}
      {viewMode === 'table' && (
        <>
          <div className="toolbar-section">
            <span className="table-info">
              {document.totalRecords.toLocaleString()} rows
            </span>
          </div>
          <div className="toolbar-divider" />
        </>
      )}

      {/* Font Size Controls (only for code view) */}
      {viewMode === 'code' && (
        <div className="toolbar-section font-controls">
          <button className="btn-font" onClick={decreaseFontSize} title="Decrease Font Size">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
          <button className="btn-font" onClick={increaseFontSize} title="Increase Font Size">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
