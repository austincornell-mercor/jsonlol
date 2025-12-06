import Papa from 'papaparse';
import type { Parser, ParseResult, ParseOptions, DataDocument, DataRecord, ColumnDef, ParseError } from '@/core/types';
import { generateId } from '@/core/types';

/**
 * Parser for CSV/TSV files using PapaParse
 */
export const CsvParser: Parser = {
  formats: ['csv', 'tsv'],
  extensions: ['.csv', '.tsv'],

  canParse(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.csv') || lower.endsWith('.tsv');
  },

  parse(content: string, fileName: string, options?: ParseOptions): ParseResult {
    const errors: ParseError[] = [];
    const isTsv = fileName.toLowerCase().endsWith('.tsv');
    
    const parseResult = Papa.parse(content, {
      header: options?.hasHeaders !== false, // Default to true
      delimiter: options?.delimiter || (isTsv ? '\t' : undefined), // Auto-detect for CSV
      skipEmptyLines: true,
      dynamicTyping: true, // Auto-convert numbers, booleans
    });

    if (parseResult.errors.length > 0) {
      parseResult.errors.forEach((err) => {
        errors.push({
          line: err.row !== undefined ? err.row + 1 : undefined,
          message: err.message,
          severity: err.type === 'FieldMismatch' ? 'warning' : 'error',
        });
      });
    }

    const data = parseResult.data as Record<string, unknown>[];
    
    if (data.length === 0) {
      errors.push({
        message: 'No data found in file',
        severity: 'error',
      });
      return { success: false, errors };
    }

    // Infer column definitions from first row
    const columns = inferColumns(data);
    
    // Convert rows to records
    const records: DataRecord[] = data.map((row, index) => ({
      index,
      data: row,
      raw: Papa.unparse([row], { header: false }),
      errors: [],
      size: JSON.stringify(row).length,
    }));

    const totalSize = new Blob([content]).size;

    const document: DataDocument = {
      id: generateId(),
      fileName,
      format: isTsv ? 'tsv' : 'csv',
      records,
      meta: {
        lineCount: content.split('\n').length,
        delimiter: parseResult.meta.delimiter,
        hasHeaders: options?.hasHeaders !== false,
        columns,
      },
      isMultiRecord: true,
      totalRecords: records.length,
      totalSize,
      loadedAt: new Date(),
    };

    return { 
      success: errors.filter(e => e.severity === 'error').length === 0, 
      document, 
      errors 
    };
  },

  serialize(document: DataDocument, options?: ParseOptions): string {
    const data = document.records.map(r => r.data as Record<string, unknown>);
    const delimiter = options?.delimiter || document.meta.delimiter || ',';
    
    return Papa.unparse(data, {
      delimiter,
      header: document.meta.hasHeaders !== false,
    });
  },
};

/**
 * Infer column definitions from data
 */
function inferColumns(data: Record<string, unknown>[]): ColumnDef[] {
  if (data.length === 0) return [];
  
  const firstRow = data[0];
  const columns: ColumnDef[] = [];
  
  for (const key of Object.keys(firstRow)) {
    const type = inferColumnType(data, key);
    columns.push({
      field: key,
      headerName: key,
      type,
      sortable: true,
      filterable: true,
    });
  }
  
  return columns;
}

/**
 * Infer column type from sample values
 */
function inferColumnType(data: Record<string, unknown>[], key: string): ColumnDef['type'] {
  const types = new Set<string>();
  const sampleSize = Math.min(data.length, 100);
  
  for (let i = 0; i < sampleSize; i++) {
    const value = data[i][key];
    
    if (value === null || value === undefined || value === '') {
      types.add('null');
    } else if (typeof value === 'number') {
      types.add('number');
    } else if (typeof value === 'boolean') {
      types.add('boolean');
    } else if (typeof value === 'string') {
      // Check if it's a date
      if (isDateString(value)) {
        types.add('date');
      } else {
        types.add('string');
      }
    } else if (Array.isArray(value)) {
      types.add('array');
    } else if (typeof value === 'object') {
      types.add('object');
    }
  }
  
  // Remove null from consideration for type inference
  types.delete('null');
  
  if (types.size === 0) return 'null';
  if (types.size === 1) return types.values().next().value as ColumnDef['type'];
  return 'mixed';
}

/**
 * Check if a string looks like a date
 */
function isDateString(value: string): boolean {
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // 2024-01-15
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO 8601
    /^\d{2}\/\d{2}\/\d{4}$/, // 01/15/2024
    /^\d{2}-\d{2}-\d{4}$/, // 01-15-2024
  ];
  
  return datePatterns.some(pattern => pattern.test(value));
}

export default CsvParser;

