import { useCallback, useState } from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { getAcceptString } from '@/parsers';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const loadFile = useDocumentStore((s) => s.loadFile);
  const isLoading = useDocumentStore((s) => s.isLoading);
  const loadError = useDocumentStore((s) => s.loadError);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        loadFile(files[0]);
      }
    },
    [loadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        loadFile(files[0]);
      }
    },
    [loadFile]
  );

  const handleClick = useCallback(() => {
    document.getElementById('file-input')?.click();
  }, []);

  return (
    <div
      className={`drop-zone ${isDragging ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        id="file-input"
        accept={getAcceptString()}
        onChange={handleFileSelect}
        hidden
      />

      <div className="drop-zone-content">
        {isLoading ? (
          <>
            <div className="drop-icon loading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
            <h2>Loading file...</h2>
            <p>Parsing your data</p>
          </>
        ) : (
          <>
            <div className="drop-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                <path d="M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2>Drop your file here</h2>
            <p>Drag and drop, or click to browse your files</p>
            
            <button className="drop-browse-btn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Choose File
            </button>
            
            <div className="supported-formats">
              <span className="format-badge">JSON</span>
              <span className="format-badge">JSONL</span>
              <span className="format-badge">CSV</span>
              <span className="format-badge">TSV</span>
            </div>
            
            <p className="drop-hint">Supports up to 100MB files</p>
          </>
        )}

        {loadError && (
          <div className="drop-zone-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{loadError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

