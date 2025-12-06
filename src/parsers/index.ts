import type { Parser, ParseResult, ParseOptions, FileFormat } from '@/core/types';
import { detectFormat } from '@/core/types';
import { JsonParser } from './JsonParser';
import { JsonlParser } from './JsonlParser';
import { CsvParser } from './CsvParser';

// Registry of all available parsers
const parsers: Parser[] = [
  JsonParser,
  JsonlParser,
  CsvParser,
];

/**
 * Get parser for a specific format
 */
export function getParser(format: FileFormat): Parser | undefined {
  return parsers.find(p => p.formats.includes(format));
}

/**
 * Get parser that can handle a file
 */
export function getParserForFile(fileName: string, content?: string): Parser | undefined {
  // First try by extension
  const format = detectFormat(fileName);
  if (format) {
    const parser = getParser(format);
    if (parser) return parser;
  }
  
  // Then try by content inspection
  for (const parser of parsers) {
    if (parser.canParse(fileName, content)) {
      return parser;
    }
  }
  
  return undefined;
}

/**
 * Parse a file with automatic format detection
 */
export function parseFile(content: string, fileName: string, options?: ParseOptions): ParseResult {
  const parser = getParserForFile(fileName, content);
  
  if (!parser) {
    return {
      success: false,
      errors: [{
        message: `Unsupported file format: ${fileName}`,
        severity: 'error',
      }],
    };
  }
  
  return parser.parse(content, fileName, options);
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  for (const parser of parsers) {
    for (const ext of parser.extensions) {
      extensions.add(ext);
    }
  }
  return Array.from(extensions);
}

/**
 * Get accept string for file input
 */
export function getAcceptString(): string {
  return getSupportedExtensions().join(',');
}

export { JsonParser, JsonlParser, CsvParser };

