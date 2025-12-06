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
            <div className="drop-icon loading-spinner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
            <h2>Loading file...</h2>
          </>
        ) : (
          <>
            <div className="drop-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>
            <h2>Drop your data file here</h2>
            <p>or click to browse</p>
            <div className="supported-formats">
              <span className="format-badge">JSON</span>
              <span className="format-badge">JSONL</span>
              <span className="format-badge">CSV</span>
              <span className="format-badge">TSV</span>
            </div>
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

