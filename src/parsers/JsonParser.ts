import type { Parser, ParseResult, ParseOptions, DataDocument, DataRecord, ParseError } from '@/core/types';
import { generateId } from '@/core/types';

/**
 * Parser for single JSON files
 */
export const JsonParser: Parser = {
  formats: ['json'],
  extensions: ['.json'],

  canParse(fileName: string, content?: string): boolean {
    if (fileName.toLowerCase().endsWith('.json')) {
      return true;
    }
    if (content) {
      const trimmed = content.trim();
      return trimmed.startsWith('{') || trimmed.startsWith('[');
    }
    return false;
  },

  parse(content: string, fileName: string, options?: ParseOptions): ParseResult {
    const errors: ParseError[] = [];
    
    try {
      let parsed: unknown;
      
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Try lenient parsing if standard fails
        if (options?.lenient) {
          parsed = lenientJsonParse(content);
          errors.push({
            message: 'File contained non-standard JSON values (NaN, Infinity, etc.)',
            severity: 'warning',
          });
        } else {
          throw e;
        }
      }

      const record: DataRecord = {
        index: 0,
        data: parsed,
        raw: content,
        errors: [],
        size: new Blob([content]).size,
      };

      const document: DataDocument = {
        id: generateId(),
        fileName,
        format: 'json',
        records: [record],
        meta: {
          lineCount: content.split('\n').length,
        },
        isMultiRecord: false,
        totalRecords: 1,
        totalSize: record.size,
        loadedAt: new Date(),
      };

      return { success: true, document, errors };
    } catch (e) {
      const error = e as Error;
      // Try to extract line/column from error message
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1], 10) : undefined;
      
      let line: number | undefined;
      let column: number | undefined;
      
      if (position !== undefined) {
        const lines = content.substring(0, position).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }

      errors.push({
        line,
        column,
        message: error.message,
        severity: 'error',
      });

      return { success: false, errors };
    }
  },

  serialize(document: DataDocument): string {
    if (document.records.length === 0) return '';
    return JSON.stringify(document.records[0].data, null, 2);
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

export default JsonParser;

