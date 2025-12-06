import type { Parser, ParseResult, ParseOptions, DataDocument, DataRecord, ParseError } from '@/core/types';
import { generateId } from '@/core/types';

/**
 * Parser for JSONL (JSON Lines) files
 */
export const JsonlParser: Parser = {
  formats: ['jsonl'],
  extensions: ['.jsonl', '.ndjson'],

  canParse(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.jsonl') || lower.endsWith('.ndjson');
  },

  parse(content: string, fileName: string, options?: ParseOptions): ParseResult {
    const errors: ParseError[] = [];
    const records: DataRecord[] = [];
    const lines = content.trim().split('\n');
    const maxRecords = options?.maxRecords ?? Infinity;

    let totalSize = 0;

    for (let i = 0; i < lines.length && records.length < maxRecords; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const lineSize = new Blob([line]).size;
      totalSize += lineSize;

      try {
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch (e) {
          // Try lenient parsing
          if (options?.lenient !== false) {
            parsed = lenientJsonParse(line);
          } else {
            throw e;
          }
        }

        records.push({
          index: records.length,
          data: parsed,
          raw: line,
          errors: [],
          size: lineSize,
        });
      } catch (e) {
        const error = e as Error;
        const parseError: ParseError = {
          line: i + 1,
          message: `Line ${i + 1}: ${error.message}`,
          severity: 'error',
        };
        errors.push(parseError);

        // Still add the record but mark it with error
        records.push({
          index: records.length,
          data: { _raw: line, _error: true },
          raw: line,
          errors: [parseError],
          size: lineSize,
        });
      }
    }

    if (records.length === 0) {
      errors.push({
        message: 'No valid JSON objects found in file',
        severity: 'error',
      });
      return { success: false, errors };
    }

    const document: DataDocument = {
      id: generateId(),
      fileName,
      format: 'jsonl',
      records,
      meta: {
        lineCount: lines.length,
      },
      isMultiRecord: true,
      totalRecords: records.length,
      totalSize,
      loadedAt: new Date(),
    };

    return { 
      success: errors.filter(e => e.severity === 'error').length === 0 || records.length > 0, 
      document, 
      errors 
    };
  },

  serialize(document: DataDocument): string {
    return document.records
      .map(record => JSON.stringify(record.data))
      .join('\n');
  },
};

/**
 * Lenient JSON parser that handles NaN, Infinity, etc.
 */
function lenientJsonParse(jsonString: string): unknown {
  const sanitized = jsonString
    .replace(/:\s*NaN/g, ': "NaN"')
    .replace(/:\s*Infinity/g, ': "Infinity"')
    .replace(/:\s*-Infinity/g, ': "-Infinity"')
    .replace(/:\s*undefined/g, ': null');

  return JSON.parse(sanitized);
}

export default JsonlParser;

