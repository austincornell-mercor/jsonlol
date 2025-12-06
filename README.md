# jsonlol - Modern Data Viewer

A modern, feature-rich data viewer for JSON, JSONL, CSV, and more. Built with React, Monaco Editor, and AG Grid for a true IDE-like experience.

![jsonlol](https://img.shields.io/badge/version-2.0.0-purple)

## ✨ Features

### Supported Formats
- **JSON** - Single JSON files
- **JSONL/NDJSON** - JSON Lines (one object per line)
- **CSV/TSV** - Comma/tab-separated values (with AG Grid)

### Core Features
- 📁 **Drag & Drop** - Simply drag files to open them
- 🎨 **Monaco Editor** - VS Code's editor with full JSON support
- 📊 **AG Grid** - Excel-like view for tabular data (CSV)
- 🔍 **Dual Search** - Search across records + find within JSON
- 🌙 **Dark/Light Mode** - Automatic theme detection
- ⚡ **Virtualized Lists** - Handle 100K+ records smoothly

### IDE Features (Monaco)
- ✅ Syntax highlighting with custom theme
- ✅ Line numbers and minimap
- ✅ Code folding at object/array boundaries
- ✅ Bracket matching and colorization
- ✅ Find & replace (Ctrl+F / Cmd+F)
- ✅ Go to line (Ctrl+G / Cmd+G)
- ✅ Smooth scrolling and animations

### View Modes
- **Single View** - Focus on one record with navigation
- **List View** - Browse all records, click to open
- **Split View** - Record list + detail side by side
- **Grid View** - Excel-like table for CSV data

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `←` `→` `↑` `↓` | Navigate between records |
| `/` | Focus search |
| `Escape` | Clear search |
| `Ctrl+F` | Find in editor |
| `Ctrl+G` | Go to line |

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## 📦 Deployment

After building, the `dist/` folder contains everything needed to deploy.

### Option 1: Static Hosting (Recommended)

Simply upload the `dist/` folder to any static hosting:

- **GitHub Pages**: `npm run deploy:gh-pages`
- **Netlify**: Drag & drop `dist/` folder, or connect repo
- **Vercel**: `npx vercel --prod`
- **S3/CloudFront**: Upload to S3, enable static hosting
- **Any web server**: Copy `dist/` contents to web root

### Option 2: Share as ZIP

1. Build the project: `npm run build`
2. Zip the `dist/` folder
3. Share the ZIP

Recipients can:
- **Mac/Linux**: Run `./start.sh` (or `bash start.sh`)
- **Windows**: Run `start.bat`
- **Or**: Use `npx serve dist` in the extracted folder

### Option 3: Local Server

```bash
# After building
npm run serve

# Or directly
npx serve dist
```

## 🏗️ Architecture

```
src/
├── core/
│   └── types.ts              # TypeScript definitions
├── parsers/
│   ├── index.ts              # Parser registry
│   ├── JsonParser.ts         # Single JSON files
│   ├── JsonlParser.ts        # JSON Lines
│   └── CsvParser.ts          # CSV/TSV (PapaParse)
├── stores/
│   ├── useDocumentStore.ts   # Document state (Zustand)
│   └── useSettingsStore.ts   # User preferences
├── components/
│   ├── DropZone.tsx          # File upload
│   ├── Header.tsx            # App header
│   ├── Toolbar.tsx           # View controls
│   └── RecordList.tsx        # Virtualized list
├── views/
│   ├── CodeView.tsx          # Monaco editor
│   ├── GridView.tsx          # AG Grid
│   ├── SplitView.tsx         # Split layout
│   ├── ListView.tsx          # List only
│   └── SingleView.tsx        # Single record
├── styles/
│   └── globals.css           # All styles
├── App.tsx                   # Main app
└── main.tsx                  # Entry point
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` | UI framework |
| `@monaco-editor/react` | Code editor (VS Code) |
| `ag-grid-react` | Data grid for CSV |
| `zustand` | State management |
| `@tanstack/react-virtual` | List virtualization |
| `papaparse` | CSV parsing |
| `immer` | Immutable updates |
| `react-resizable-panels` | Split pane layout |

## 🎨 Theming

The app uses CSS custom properties for theming. Edit `src/styles/globals.css` to customize:

```css
:root {
  --primary-color: #7c3aed;  /* Purple accent */
  --bg-color: #f8fafc;       /* Background */
  --surface-color: #ffffff;  /* Cards/panels */
  /* ... */
}

[data-theme="dark"] {
  --bg-color: #0f172a;
  --surface-color: #1e293b;
  /* ... */
}
```

Monaco editor themes are defined in `src/views/CodeView.tsx`.

## 🔧 Configuration

Settings are persisted to localStorage:

- Theme (light/dark/system)
- Font size (small/medium/large/xlarge)
- View mode (single/list/split/grid)
- Show minimap
- Show line numbers
- Word wrap
- Sidebar width

## 📝 Adding New File Formats

1. Create a new parser in `src/parsers/`:

```typescript
// src/parsers/YamlParser.ts
import type { Parser } from '@/core/types';

export const YamlParser: Parser = {
  formats: ['yaml'],
  extensions: ['.yaml', '.yml'],
  canParse(fileName) { /* ... */ },
  parse(content, fileName, options) { /* ... */ },
  serialize(document) { /* ... */ },
};
```

2. Register it in `src/parsers/index.ts`:

```typescript
import { YamlParser } from './YamlParser';

const parsers: Parser[] = [
  JsonParser,
  JsonlParser,
  CsvParser,
  YamlParser, // Add here
];
```

## 📄 License

MIT

---

Built with ❤️ using React, Monaco Editor, and AG Grid.
