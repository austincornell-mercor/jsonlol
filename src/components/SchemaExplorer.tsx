import { useMemo } from 'react';
import { useDocumentStore } from '@/stores/useDocumentStore';

interface SchemaNode {
  key: string;
  types: Set<string>;
  recordsWithKey: Set<number>;  // Track which record indices have this key
  totalRecords: number;
  children: Map<string, SchemaNode>;
}

export function SchemaExplorer() {
  const document = useDocumentStore((s) => s.document);
  const currentIndex = useDocumentStore((s) => s.currentIndex);

  const schema = useMemo(() => {
    if (!document) return null;

    const records = document.records;
    const totalRecords = document.totalRecords;

    const rootSchema = new Map<string, SchemaNode>();

    const getOrCreateNode = (map: Map<string, SchemaNode>, key: string): SchemaNode => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          types: new Set(),
          recordsWithKey: new Set(),
          totalRecords,
          children: new Map(),
        });
      }
      return map.get(key)!;
    };

    const getType = (value: unknown): string => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      return typeof value;
    };

    const analyzeObject = (
      obj: Record<string, unknown>, 
      parentMap: Map<string, SchemaNode>, 
      recordIndex: number,
      depth: number
    ) => {
      for (const [key, value] of Object.entries(obj)) {
        const node = getOrCreateNode(parentMap, key);
        node.recordsWithKey.add(recordIndex);
        node.types.add(getType(value));

        // Analyze nested objects (limit depth to 3 for performance)
        if (depth < 3 && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            analyzeObject(value as Record<string, unknown>, node.children, recordIndex, depth + 1);
          } else if (Array.isArray(value) && value.length > 0) {
            // For arrays, look at the structure of the first few items
            const itemsToAnalyze = value.slice(0, 3);
            for (const item of itemsToAnalyze) {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                analyzeObject(item as Record<string, unknown>, node.children, recordIndex, depth + 1);
              }
            }
          }
        }
      }
    };

    const analyzeValue = (data: unknown, recordIndex: number) => {
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          // Root is an array - analyze items
          const itemsToAnalyze = data.slice(0, 10); // Analyze first 10 items
          for (const item of itemsToAnalyze) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              analyzeObject(item as Record<string, unknown>, rootSchema, recordIndex, 0);
            }
          }
        } else {
          // Root is an object
          analyzeObject(data as Record<string, unknown>, rootSchema, recordIndex, 0);
        }
      }
    };

    // Analyze each record
    records.forEach((record, recordIndex) => {
      analyzeValue(record.data, recordIndex);
    });

    // Convert to sorted array
    const sortNodes = (map: Map<string, SchemaNode>): SchemaNode[] => {
      const nodes = Array.from(map.values());
      
      nodes.forEach(node => {
        if (node.children.size > 0) {
          const sortedChildren = sortNodes(node.children);
          node.children = new Map(sortedChildren.map(n => [n.key, n]));
        }
      });

      // Sort: inconsistent first, then alphabetically
      return nodes.sort((a, b) => {
        const aConsistent = a.recordsWithKey.size === totalRecords;
        const bConsistent = b.recordsWithKey.size === totalRecords;
        if (aConsistent !== bConsistent) {
          return aConsistent ? 1 : -1;
        }
        return a.key.localeCompare(b.key);
      });
    };

    return sortNodes(rootSchema);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document]);

  const renderNode = (node: SchemaNode, depth: number = 0) => {
    const count = node.recordsWithKey.size;
    const isConsistent = count === node.totalRecords;
    const typeStr = Array.from(node.types).join(' | ');
    const isMultiRecord = document && document.totalRecords > 1;
    
    return (
      <div key={`${node.key}-${depth}`}>
        <div className={`schema-node ${isMultiRecord && !isConsistent ? 'inconsistent' : ''}`}>
          <span className="schema-key">{node.key}</span>
          <span className="schema-type">{typeStr}</span>
          {isMultiRecord && (
            <span className={`schema-badge ${isConsistent ? 'consistent' : 'inconsistent'}`}>
              {isConsistent ? '✓' : `${count}/${node.totalRecords}`}
            </span>
          )}
        </div>
        {node.children.size > 0 && (
          <div className="schema-children">
            {Array.from(node.children.values()).map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!document) {
    return (
      <div className="schema-empty">
        <p>Load a file to explore its schema</p>
      </div>
    );
  }

  if (!schema || schema.length === 0) {
    // Check what type the data is
    const currentRecord = document.records[currentIndex];
    const dataType = currentRecord?.data ? 
      (Array.isArray(currentRecord.data) ? 'array' : typeof currentRecord.data) : 
      'unknown';
    
    return (
      <div className="schema-empty">
        <p>No schema to display</p>
        <p style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.7 }}>
          Root type: {dataType}
        </p>
      </div>
    );
  }

  return (
    <div className="schema-explorer">
      <div className="schema-tree">
        {schema.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
