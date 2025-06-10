# Everything MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

A Model Context Protocol (MCP) server that provides instant file search capabilities using Everything's native SDK. This server integrates Everything's powerful search engine with AI tooling, enabling lightning-fast file system searches through the MCP interface.

## Features

- 🔍 **Instant File Search**: Leverage Everything's instant indexing for near-instantaneous file searches
- 🎯 **Advanced Filtering**: Search by path, extension, size, date modified, and more
- 🔄 **Duplicate Detection**: Find duplicate files across your system
- 📄 **Content Search**: Search within file contents (requires Everything content indexing)
- ⚡ **High Performance**: Direct API access through native SDK integration
- 🛡️ **Read-Only**: Safe, non-destructive file system access

## Tools Provided

### 1. `search_files`
Basic file search with regex and case sensitivity options.

**Parameters:**
- `query` (string): Search query for file names
- `maxResults` (number, optional): Maximum results to return (default: 100)
- `matchCase` (boolean, optional): Enable case-sensitive search
- `matchWholeWord` (boolean, optional): Match whole words only
- `regex` (boolean, optional): Enable regular expression search

### 2. `search_files_advanced`
Advanced search with comprehensive filtering options.

**Parameters:**
- `query` (string): Search query for file names
- `path` (string, optional): Limit search to specific path
- `extension` (string, optional): Filter by file extension (e.g., 'txt', 'pdf')
- `size` (string, optional): Filter by file size (e.g., '>1mb', '<100kb', '1gb..2gb')
- `dateModified` (string, optional): Filter by date modified (e.g., 'today', 'yesterday', 'thisweek', '2024')
- `maxResults` (number, optional): Maximum results to return (default: 100)
- `matchCase` (boolean, optional): Enable case-sensitive search
- `matchWholeWord` (boolean, optional): Match whole words only
- `regex` (boolean, optional): Enable regular expression search
- `sortBy` (enum, optional): Sort results by field (name_asc, name_desc, path_asc, path_desc, size_asc, size_desc, date_asc, date_desc)

### 3. `find_duplicates`
Find duplicate files by filename.

**Parameters:**
- `filename` (string): Filename to search for duplicates
- `path` (string, optional): Limit search to specific path
- `maxResults` (number, optional): Maximum results to return (default: 50)

### 4. `search_content`
Search for text content within files.

**Parameters:**
- `content` (string): Text content to search for within files
- `fileTypes` (string, optional): Limit to specific file types (e.g., 'txt;doc;pdf')
- `path` (string, optional): Limit search to specific path
- `maxResults` (number, optional): Maximum results to return (default: 50)

## Prerequisites

1. **Everything Application**: Must be installed and running
   - Download from: [https://www.voidtools.com/](https://www.voidtools.com/)
   - Ensure it's running in the background for API access

2. **Node.js**: Version 18+ with ES module support

3. **Windows OS**: Required for Everything SDK compatibility

## Installation

1. Clone the repository:
```bash
git clone https://github.com/peterparker57/everything-mcp-server.git
cd everything-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Debug project:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Configuration

Add the server to your MCP settings file:

```json
{
  "mcpServers": {
    "everything": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["path/to/everything-mcp-server/build/index.js"],
      "disabled": false,
      "env": {},
      "alwaysAllow": [
        "search_files",
        "search_files_advanced",
        "find_duplicates",
        "search_content"
      ]
    }
  }
}
```

## Usage Examples

### Basic File Search
```
Search for: "msbuild.exe"
Options: Case sensitive, max 50 results
```

### Advanced Search with Filters
```
Query: "*.pdf"
Path: "C:\\Documents"
Size: ">1mb"
Date Modified: "thisweek"
Sort: "size_desc"
```

### Find Duplicates
```
Filename: "config.json"
Path: "C:\\Projects" (optional)
```

### Content Search
```
Content: "function main"
File Types: "js;ts;py"
Path: "C:\\Code" (optional)
```

## Architecture

### Technology Stack
- **Language**: TypeScript
- **Framework**: MCP SDK (@modelcontextprotocol/sdk)
- **FFI Library**: koffi (for native DLL integration)
- **Module System**: ES modules
- **Target**: Everything SDK (Windows file search utility)

### Key Components
1. **Main Server** (`src/index.ts`): Core MCP server implementation
2. **Everything SDK**: Native Windows DLLs for file search
3. **Build System**: TypeScript compilation to ES modules
4. **Configuration**: Package.json with ES module support

## Development

### Building
```bash
npm run build
```

### Testing
Start the server directly to test:
```bash
node build/index.js
```

### Project Structure
```
everything-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── EverythingSDK/        # Everything native SDK files
│   └── dll/
│       ├── Everything32.dll
│       └── Everything64.dll
├── build/                # Compiled JavaScript output
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Troubleshooting

### "Everything search client is not running"
- Start Everything application
- Ensure it's not running in portable mode without service

### "Connection closed" MCP error
- Check that build directory exists and contains index.js
- Verify Node.js path in MCP configuration
- Ensure Everything application is running

### ES Module errors
- Verify package.json has `"type": "module"`
- Check import statements use .js extensions
- Ensure koffi is imported as default export

## Performance Notes

- Everything indexes files instantly, searches are near-instantaneous
- Content search requires Everything to have content indexing enabled
- Large result sets are automatically limited (configurable per tool)
- Direct API access provides better performance than command-line interface

## Security Considerations

- Server provides read-only file system access through Everything
- No file modification capabilities
- Respects Everything's own security and indexing settings
- Content search limited to files Everything has indexed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Everything](https://www.voidtools.com/) by voidtools for the amazing file search utility
- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP framework
- [koffi](https://github.com/Koromix/koffi) for the excellent FFI library

## Related Projects

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript SDK for Model Context Protocol
- [Everything](https://www.voidtools.com/) - The file search utility this server integrates with

---

**Note**: This is a Windows-specific MCP server that requires the Everything application to be installed and running. For cross-platform file search solutions, consider other MCP servers or file search tools.