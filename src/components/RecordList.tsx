import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { formatBytes } from '@/core/types';

export function RecordList() {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);
  const setCurrentIndex = useDocumentStore((s) => s.setCurrentIndex);
  const search = useDocumentStore((s) => s.search);

  const records = document?.records ?? [];

  const isMatch = useCallback((index: number) => {
    if (!search.globalTerm) return false;
    const record = records[index];
    if (!record) return false;
    return JSON.stringify(record.data).toLowerCase().includes(search.globalTerm.toLowerCase());
  }, [records, search.globalTerm]);

  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Compact height
    overscan: 15,
  });

  if (!document || records.length === 0) {
    return (
      <div className="schema-empty">
        <p>No records</p>
      </div>
    );
  }

  return (
    <div className="record-list" ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const record = records[virtualRow.index];
          const isActive = virtualRow.index === currentIndex;
          const hasError = record.errors.length > 0;
          const matchesSearch = isMatch(virtualRow.index);

          return (
            <div
              key={virtualRow.key}
              className={`record-item compact ${isActive ? 'active' : ''} ${matchesSearch ? 'search-match' : ''}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => setCurrentIndex(virtualRow.index)}
            >
              <span className="record-index">{virtualRow.index + 1}</span>
              {hasError && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-error">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              <span className="record-preview">
                {JSON.stringify(record.data).substring(0, 50)}...
              </span>
              <span className="record-size">{formatBytes(record.size)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
