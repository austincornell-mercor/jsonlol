// ============================================
// Core Type Definitions for jsonlol
// ============================================

/** Supported file formats */
export type FileFormat = 'json' | 'jsonl' | 'csv' | 'tsv' | 'xml' | 'yaml';

/** Theme options */
export type Theme = 'light' | 'dark' | 'system';

/** Font size presets */
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

// ============================================
// Data Document Model
// ============================================

/** Parse error information */
export interface ParseError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

/** A single record in a multi-record document */
export interface DataRecord {
  /** Zero-based index in the document */
  index: number;
  /** The parsed data object */
  data: unknown;
  /** Original raw text for this record */
  raw: string;
  /** Any parse errors for this record */
  errors: ParseError[];
  /** Size in bytes */
  size: number;
}

/** Column definition for tabular data (CSV) */
export interface ColumnDef {
  field: string;
  headerName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'null' | 'mixed';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

/** Metadata about the document */
export interface DocumentMeta {
  /** File encoding */
  encoding?: string;
  /** Total line count */
  lineCount?: number;
  /** For CSV: detected delimiter */
  delimiter?: string;
  /** For CSV: whether first row is headers */
  hasHeaders?: boolean;
  /** Column definitions for tabular data */
  columns?: ColumnDef[];
  /** Inferred or provided JSON schema */
  schema?: Record<string, unknown>;
}

/** The main document structure that all parsers produce */
export interface DataDocument {
  /** Unique document ID */
  id: string;
  /** Original filename */
  fileName: string;
  /** Detected or declared format */
  format: FileFormat;
  /** All records in the document */
  records: DataRecord[];
  /** Document metadata */
  meta: DocumentMeta;
  /** Whether this is a multi-record format */
  isMultiRecord: boolean;
  /** Total record count */
  totalRecords: number;
  /** Total file size in bytes */
  totalSize: number;
  /** When the document was loaded */
  loadedAt: Date;
}

// ============================================
// Parser Interface
// ============================================

/** Options for parsing */
export interface ParseOptions {
  /** For CSV: delimiter character */
  delimiter?: string;
  /** For CSV: whether first row is headers */
  hasHeaders?: boolean;
  /** Maximum records to parse (for preview) */
  maxRecords?: number;
  /** Whether to attempt lenient parsing */
  lenient?: boolean;
}

/** Result of parsing a file */
export interface ParseResult {
  success: boolean;
  document?: DataDocument;
  errors: ParseError[];
}

/** Parser interface that all format parsers implement */
export interface Parser {
  /** Format(s) this parser handles */
  formats: FileFormat[];
  /** File extensions this parser handles */
  extensions: string[];
  /** Parse file content into a DataDocument */
  parse(content: string, fileName: string, options?: ParseOptions): ParseResult;
  /** Serialize a document back to string (for export) */
  serialize(document: DataDocument, options?: ParseOptions): string;
  /** Check if this parser can handle the file */
  canParse(fileName: string, content?: string): boolean;
}

// ============================================
// App State Types
// ============================================

/** Search state */
export interface SearchState {
  /** Global search term (across records) */
  globalTerm: string;
  /** In-document search term */
  inDocTerm: string;
  /** Current match index */
  currentMatch: number;
  /** Total matches */
  totalMatches: number;
  /** Use regex */
  useRegex: boolean;
  /** Case sensitive */
  caseSensitive: boolean;
}

/** Editor state */
export interface EditorState {
  /** Edit mode enabled */
  isEditing: boolean;
  /** Has unsaved changes */
  hasChanges: boolean;
  /** Modified records (index -> modified data) */
  modifiedRecords: Map<number, unknown>;
}

/** UI preferences */
export interface UISettings {
  theme: Theme;
  fontSize: FontSize;
  showMinimap: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
}

// ============================================
// Utility Types
// ============================================

/** Generate unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Detect file format from filename */
export function detectFormat(fileName: string): FileFormat | null {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'json':
      return 'json';
    case 'jsonl':
    case 'ndjson':
      return 'jsonl';
    case 'csv':
      return 'csv';
    case 'tsv':
      return 'tsv';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return null;
  }
}

