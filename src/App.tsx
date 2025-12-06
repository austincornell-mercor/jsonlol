import { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCompareStore } from '@/stores/useCompareStore';
import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { DropZone } from '@/components/DropZone';
import { RecordList } from '@/components/RecordList';
import { SchemaExplorer } from '@/components/SchemaExplorer';
import { CodeView } from '@/views/CodeView';
import { TableView } from '@/views/TableView';
import { CompareView } from '@/views/CompareView';

type SidebarPanel = 'records' | 'schema' | null;

function App() {
  const document = useDocumentStore((s) => s.document);
  const navigateNext = useDocumentStore((s) => s.navigateNext);
  const navigatePrev = useDocumentStore((s) => s.navigatePrev);
  const isEditing = useDocumentStore((s) => s.editor.isEditing);
  const setGlobalSearch = useDocumentStore((s) => s.setGlobalSearch);
  const search = useDocumentStore((s) => s.search);
  
  const viewMode = useSettingsStore((s) => s.viewMode);
  const setViewMode = useSettingsStore((s) => s.setViewMode);

  const isComparing = useCompareStore((s) => s.isComparing);

  const [leftPanel, setLeftPanel] = useState<SidebarPanel>('records');
  const [rightPanel, setRightPanel] = useState<SidebarPanel>(null);

  // Auto-switch to table view for CSV/TSV files
  useEffect(() => {
    if (document) {
      const isTabular = document.format === 'csv' || document.format === 'tsv';
      if (isTabular) {
        setViewMode('table');
      }
    }
  }, [document?.id, document?.format, setViewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      if (target.closest('.monaco-editor') && isEditing) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (viewMode === 'code') {
            e.preventDefault();
            navigatePrev();
          }
          break;
        case 'ArrowRight':
          if (viewMode === 'code') {
            e.preventDefault();
            navigateNext();
          }
          break;
        case '/':
          e.preventDefault();
          const searchInput = window.document.querySelector('.search-input') as HTMLInputElement;
          searchInput?.focus();
          break;
        case 'b':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setLeftPanel(leftPanel === 'records' ? null : 'records');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev, isEditing, leftPanel, viewMode]);

  const toggleLeftPanel = (panel: SidebarPanel) => {
    setLeftPanel(leftPanel === panel ? null : panel);
  };

  const toggleRightPanel = (panel: SidebarPanel) => {
    setRightPanel(rightPanel === panel ? null : panel);
  };

  return (
    <div className={`app ${isEditing ? 'edit-mode-active' : ''}`}>
      <Header />
      
      {!document ? (
        <DropZone />
      ) : (
        <div className="app-body">
          {/* Left Activity Bar */}
          <div className="activity-bar">
            <button
              className={`activity-btn ${leftPanel === 'records' ? 'active' : ''}`}
              onClick={() => toggleLeftPanel('records')}
              title="Records (⌘B)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </button>
          </div>

          {/* Main Content with Resizable Panels */}
          <PanelGroup direction="horizontal" className="panel-group">
            {/* Left Sidebar - Records */}
            {leftPanel === 'records' && (
              <>
                <Panel 
                  defaultSize={20} 
                  minSize={15} 
                  maxSize={40}
                  className="sidebar-panel"
                >
                  <div className="sidebar">
                    <div className="sidebar-header">
                      <div className="sidebar-header-left">
                        <span className="sidebar-title">Records</span>
                        <span className="sidebar-subtitle">{document.totalRecords} total</span>
                      </div>
                      <button 
                        className="sidebar-close-btn" 
                        onClick={() => toggleLeftPanel(null)}
                        title="Close sidebar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    {document.isMultiRecord && (
                      <div className="sidebar-search-bar">
                        <div className="sidebar-search-box">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-search-icon">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search records..."
                            value={search.globalTerm}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="sidebar-search-input"
                          />
                          {search.globalTerm && (
                            <button 
                              className="sidebar-search-btn clear" 
                              onClick={() => setGlobalSearch('')}
                              title="Clear search"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {search.globalTerm && search.totalMatches > 0 && (
                          <>
                            <span className="sidebar-search-count">{search.currentMatch + 1}/{search.totalMatches}</span>
                            <div className="sidebar-search-nav">
                              <button 
                                className="sidebar-search-btn" 
                                onClick={() => {
                                  const prevMatchIdx = search.currentMatch > 0 
                                    ? search.currentMatch - 1 
                                    : search.totalMatches - 1;
                                  // Find matching record and navigate
                                  const matches = document.records
                                    .map((r, i) => ({ index: i, matches: JSON.stringify(r.data).toLowerCase().includes(search.globalTerm.toLowerCase()) }))
                                    .filter(r => r.matches);
                                  if (matches[prevMatchIdx]) {
                                    setCurrentIndex(matches[prevMatchIdx].index);
                                    useDocumentStore.setState(state => ({ 
                                      search: { ...state.search, currentMatch: prevMatchIdx }
                                    }));
                                  }
                                }}
                                title="Previous match (↑)"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="18 15 12 9 6 15" />
                                </svg>
                              </button>
                              <button 
                                className="sidebar-search-btn" 
                                onClick={() => {
                                  const nextMatchIdx = search.currentMatch < search.totalMatches - 1 
                                    ? search.currentMatch + 1 
                                    : 0;
                                  // Find matching record and navigate
                                  const matches = document.records
                                    .map((r, i) => ({ index: i, matches: JSON.stringify(r.data).toLowerCase().includes(search.globalTerm.toLowerCase()) }))
                                    .filter(r => r.matches);
                                  if (matches[nextMatchIdx]) {
                                    setCurrentIndex(matches[nextMatchIdx].index);
                                    useDocumentStore.setState(state => ({ 
                                      search: { ...state.search, currentMatch: nextMatchIdx }
                                    }));
                                  }
                                }}
                                title="Next match (↓)"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="sidebar-content">
                      <RecordList />
                    </div>
                  </div>
                </Panel>
                <PanelResizeHandle className="resize-handle" />
              </>
            )}

            {/* Main Editor Area */}
            <Panel minSize={30} className="main-panel">
              <div className="main-editor">
                <Toolbar />
                <div className="editor-container">
                  {isComparing ? (
                    <CompareView />
                  ) : viewMode === 'code' ? (
                    <CodeView />
                  ) : (
                    <TableView />
                  )}
                </div>
              </div>
            </Panel>

            {/* Right Sidebar - Schema Explorer */}
            {rightPanel === 'schema' && (
              <>
                <PanelResizeHandle className="resize-handle" />
                <Panel 
                  defaultSize={22} 
                  minSize={15} 
                  maxSize={40}
                  className="sidebar-panel"
                >
                  <div className="sidebar right">
                    <div className="sidebar-header">
                      <div className="sidebar-header-left">
                        <span className="sidebar-title">Schema</span>
                        <span className="sidebar-subtitle">Data structure</span>
                      </div>
                      <button 
                        className="sidebar-close-btn" 
                        onClick={() => toggleRightPanel(null)}
                        title="Close sidebar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div className="sidebar-content">
                      <SchemaExplorer />
                    </div>
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>

          {/* Right Activity Bar */}
          <div className="activity-bar right">
            <button
              className={`activity-btn ${rightPanel === 'schema' ? 'active' : ''}`}
              onClick={() => toggleRightPanel('schema')}
              title="Schema Explorer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div id="toast-container" className="toast-container" />
    </div>
  );
}

export default App;
