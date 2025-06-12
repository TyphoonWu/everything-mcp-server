#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import koffi from 'koffi';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Create an MCP server
const server = new McpServer({
  name: "everything-search-server",
  version: "0.1.0"
});

// Everything SDK constants
const EVERYTHING_OK = 0;
const EVERYTHING_ERROR_MEMORY = 1;
const EVERYTHING_ERROR_IPC = 2;
const EVERYTHING_ERROR_REGISTERCLASSEX = 3;
const EVERYTHING_ERROR_CREATEWINDOW = 4;
const EVERYTHING_ERROR_CREATETHREAD = 5;
const EVERYTHING_ERROR_INVALIDINDEX = 6;
const EVERYTHING_ERROR_INVALIDCALL = 7;
const EVERYTHING_ERROR_INVALIDREQUEST = 8;
const EVERYTHING_ERROR_INVALIDPARAMETER = 9;

const EVERYTHING_SORT_NAME_ASCENDING = 1;
const EVERYTHING_SORT_NAME_DESCENDING = 2;
const EVERYTHING_SORT_PATH_ASCENDING = 3;
const EVERYTHING_SORT_PATH_DESCENDING = 4;
const EVERYTHING_SORT_SIZE_ASCENDING = 5;
const EVERYTHING_SORT_SIZE_DESCENDING = 6;
const EVERYTHING_SORT_DATE_MODIFIED_ASCENDING = 13;
const EVERYTHING_SORT_DATE_MODIFIED_DESCENDING = 14;

const EVERYTHING_REQUEST_FILE_NAME = 0x00000001;
const EVERYTHING_REQUEST_PATH = 0x00000002;
const EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME = 0x00000004;
const EVERYTHING_REQUEST_SIZE = 0x00000010;
const EVERYTHING_REQUEST_DATE_MODIFIED = 0x00000040;

// Load the Everything DLL
const dllPath = path.join(__dirname, '..', 'EverythingSDK', 'dll', os.arch() === 'x64' ? 'Everything64.dll' : 'Everything32.dll');

let everythingLib: any;
try {
  everythingLib = koffi.load(dllPath);
} catch (error) {
  console.error(`Failed to load Everything DLL from ${dllPath}:`, error);
  process.exit(1);
}

// Define the Everything API functions
const Everything_SetSearchW = everythingLib.func('Everything_SetSearchW', 'void', ['str16']);
const Everything_SetMatchCase = everythingLib.func('Everything_SetMatchCase', 'void', ['bool']);
const Everything_SetMatchWholeWord = everythingLib.func('Everything_SetMatchWholeWord', 'void', ['bool']);
const Everything_SetRegex = everythingLib.func('Everything_SetRegex', 'void', ['bool']);
const Everything_SetMax = everythingLib.func('Everything_SetMax', 'void', ['uint32']);
const Everything_SetOffset = everythingLib.func('Everything_SetOffset', 'void', ['uint32']);
const Everything_SetSort = everythingLib.func('Everything_SetSort', 'void', ['uint32']);
const Everything_SetRequestFlags = everythingLib.func('Everything_SetRequestFlags', 'void', ['uint32']);

const Everything_QueryW = everythingLib.func('Everything_QueryW', 'bool', ['bool']);
const Everything_GetLastError = everythingLib.func('Everything_GetLastError', 'uint32', []);

const Everything_GetNumResults = everythingLib.func('Everything_GetNumResults', 'uint32', []);
const Everything_GetResultFileNameW = everythingLib.func('Everything_GetResultFileNameW', 'str16', ['uint32']);
const Everything_GetResultPathW = everythingLib.func('Everything_GetResultPathW', 'str16', ['uint32']);
const Everything_GetResultFullPathNameW = everythingLib.func('Everything_GetResultFullPathNameW', 'uint32', ['uint32', 'str16', 'uint32']);
const Everything_IsFileResult = everythingLib.func('Everything_IsFileResult', 'bool', ['uint32']);
const Everything_IsFolderResult = everythingLib.func('Everything_IsFolderResult', 'bool', ['uint32']);

// Helper function to execute Everything search
async function searchWithEverything(query: string, options: {
  maxResults?: number;
  matchCase?: boolean;
  matchWholeWord?: boolean;
  regex?: boolean;
  sortBy?: string;
} = {}): Promise<{ results: string[], totalResults: number, error?: string }> {
  try {
    // Set search parameters
    Everything_SetSearchW(query);
    Everything_SetMatchCase(options.matchCase || false);
    Everything_SetMatchWholeWord(options.matchWholeWord || false);
    Everything_SetRegex(options.regex || false);
    Everything_SetMax(options.maxResults || 100);
    Everything_SetOffset(0);

    // Set request flags to get file name, path, and size
    Everything_SetRequestFlags(EVERYTHING_REQUEST_FILE_NAME | EVERYTHING_REQUEST_PATH | EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME);

    // Set sort order
    let sortOrder = EVERYTHING_SORT_NAME_ASCENDING;
    switch (options.sortBy) {
      case 'name_desc':
        sortOrder = EVERYTHING_SORT_NAME_DESCENDING;
        break;
      case 'path_asc':
        sortOrder = EVERYTHING_SORT_PATH_ASCENDING;
        break;
      case 'path_desc':
        sortOrder = EVERYTHING_SORT_PATH_DESCENDING;
        break;
      case 'size_asc':
        sortOrder = EVERYTHING_SORT_SIZE_ASCENDING;
        break;
      case 'size_desc':
        sortOrder = EVERYTHING_SORT_SIZE_DESCENDING;
        break;
      case 'date_asc':
        sortOrder = EVERYTHING_SORT_DATE_MODIFIED_ASCENDING;
        break;
      case 'date_desc':
        sortOrder = EVERYTHING_SORT_DATE_MODIFIED_DESCENDING;
        break;
    }
    Everything_SetSort(sortOrder);

    // Execute the query
    const success = Everything_QueryW(true);

    if (!success) {
      const errorCode = Everything_GetLastError();
      let errorMessage = `Everything query failed with error code: ${errorCode}`;

      switch (errorCode) {
        case EVERYTHING_ERROR_MEMORY:
          errorMessage = "Out of memory";
          break;
        case EVERYTHING_ERROR_IPC:
          errorMessage = "Everything search client is not running";
          break;
        case EVERYTHING_ERROR_REGISTERCLASSEX:
          errorMessage = "Unable to register window class";
          break;
        case EVERYTHING_ERROR_CREATEWINDOW:
          errorMessage = "Unable to create listening window";
          break;
        case EVERYTHING_ERROR_CREATETHREAD:
          errorMessage = "Unable to create listening thread";
          break;
        case EVERYTHING_ERROR_INVALIDINDEX:
          errorMessage = "Invalid index";
          break;
        case EVERYTHING_ERROR_INVALIDCALL:
          errorMessage = "Invalid call";
          break;
        case EVERYTHING_ERROR_INVALIDREQUEST:
          errorMessage = "Invalid request data, request data first";
          break;
        case EVERYTHING_ERROR_INVALIDPARAMETER:
          errorMessage = "Bad parameter";
          break;
      }

      return { results: [], totalResults: 0, error: errorMessage };
    }

    // Get results
    const numResults = Everything_GetNumResults();
    const results: string[] = [];

    for (let i = 0; i < numResults; i++) {
      const fileName = Everything_GetResultFileNameW(i);
      const path = Everything_GetResultPathW(i);
      const isFile = Everything_IsFileResult(i);
      const isFolder = Everything_IsFolderResult(i);

      let fullPath = '';
      if (path && fileName) {
        fullPath = path.endsWith('\\') ? `${path}${fileName}` : `${path}\\${fileName}`;
      } else if (fileName) {
        fullPath = fileName;
      }

      const type = isFile ? '[FILE]' : isFolder ? '[FOLDER]' : '[UNKNOWN]';
      results.push(`${type} ${fullPath}`);
    }

    return { results, totalResults: numResults };
  } catch (error) {
    return {
      results: [],
      totalResults: 0,
      error: `Everything search failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

server.prompt(
  "search_files",
  { query: z.string() },
  ({ query }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `user want to search local files, his query:\n${query}\nplease transfer the query into json format:
        {
            "method": "tools/call",
            "params": {
                "name": "search_files",  # 工具名
                "arguments": {
                    "query": "README.md",  # 搜索的文件名, the file name need to be searched
                    "maxResults": 5        # 返回的最大结果数, return max files the tool searched.
                },
                "_meta": {"progressToken": 0},
            },
            "jsonrpc": "2.0",
            "id": 2,
        }`
      }
    }]
  })
);

/**
 * Add a tool for basic file search
 * search_files 工具提示词模板:
 * 
 * {
 *   "method": "tools/call",
 *   "params": {
 *     "name": "search_files",
 *     "arguments": {
 *       "query": "README.md",
 *       // 可选参数:
 *       "maxResults": 20,
 *       "matchCase": false,
 *       "matchWholeWord": false,
 *       "regex": false
 *     },
 *     "_meta": { "progressToken": 0 }
 *   },
 *   "jsonrpc": "2.0",
 *   "id": 1
 * }
 */
server.tool(
  "search_files",
  "Find and locate files or folders by name, such as searching for README.md file location on your computer.",
  {
    query: z.string().describe("Search query for file names"),
    maxResults: z.number().min(1).max(20).optional().describe("Maximum number of results to return (default: 20)"),
    matchCase: z.boolean().optional().describe("Enable case-sensitive search"),
    matchWholeWord: z.boolean().optional().describe("Match whole words only"),
    regex: z.boolean().optional().describe("Enable regular expression search"),
  },
  async ({ query, maxResults = 20, matchCase = false, matchWholeWord = false, regex = false }) => {
    try {
      const { results, totalResults, error } = await searchWithEverything(query, {
        maxResults,
        matchCase,
        matchWholeWord,
        regex
      });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: results.length > 0
              ? `Found ${totalResults} files (showing ${results.length}):\n\n${results.join('\n')}`
              : `No files found matching "${query}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching files: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Add a tool for advanced file search with filters
server.tool(
  "search_files_advanced",
  "Advanced file search with filters such as path, extension, size, date modified, and sorting.",
  {
    query: z.string().describe("Search query for file names"),
    path: z.string().optional().describe("Limit search to specific path"),
    extension: z.string().optional().describe("Filter by file extension (e.g., 'txt', 'pdf')"),
    size: z.string().optional().describe("Filter by file size (e.g., '>1mb', '<100kb', '1gb..2gb')"),
    dateModified: z.string().optional().describe("Filter by date modified (e.g., 'today', 'yesterday', 'thisweek', '2024')"),
    maxResults: z.number().min(1).max(1000).optional().describe("Maximum number of results to return (default: 100)"),
    matchCase: z.boolean().optional().describe("Enable case-sensitive search"),
    matchWholeWord: z.boolean().optional().describe("Match whole words only"),
    regex: z.boolean().optional().describe("Enable regular expression search"),
    sortBy: z.enum(['name_asc', 'name_desc', 'path_asc', 'path_desc', 'size_asc', 'size_desc', 'date_asc', 'date_desc']).optional().describe("Sort results by field"),
  },
  async ({
    query,
    path,
    extension,
    size,
    dateModified,
    maxResults = 100,
    matchCase = false,
    matchWholeWord = false,
    regex = false,
    sortBy = 'name_asc'
  }) => {
    try {
      // Build the Everything search query with filters
      let searchQuery = query;

      if (path) {
        searchQuery = `path:"${path}" ${searchQuery}`;
      }

      if (extension) {
        searchQuery = `ext:${extension} ${searchQuery}`;
      }

      if (size) {
        searchQuery = `size:${size} ${searchQuery}`;
      }

      if (dateModified) {
        searchQuery = `dm:${dateModified} ${searchQuery}`;
      }

      const { results, totalResults, error } = await searchWithEverything(searchQuery, {
        maxResults,
        matchCase,
        matchWholeWord,
        regex,
        sortBy
      });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error}`,
            },
          ],
          isError: true,
        };
      }

      let responseText = `Found ${totalResults} files`;

      // Add filter information to response
      const filters: string[] = [];
      if (path) filters.push(`path: "${path}"`);
      if (extension) filters.push(`extension: ${extension}`);
      if (size) filters.push(`size: ${size}`);
      if (dateModified) filters.push(`date modified: ${dateModified}`);

      if (filters.length > 0) {
        responseText += ` (filtered by ${filters.join(', ')})`;
      }

      responseText += ` (showing ${results.length}, sorted by ${sortBy}):\n\n${results.length > 0 ? results.join('\n') : `No files found matching "${query}"`}`;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching files: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Add a tool for finding duplicate files
server.tool(
  "find_duplicates",
  "Find duplicate files by filename, optionally limited to a specific path.",
  {
    filename: z.string().describe("Filename to search for duplicates"),
    path: z.string().optional().describe("Limit search to specific path"),
    maxResults: z.number().min(1).max(1000).optional().describe("Maximum number of results to return (default: 50)"),
  },
  async ({ filename, path, maxResults = 50 }) => {
    try {
      let searchQuery = filename;

      if (path) {
        searchQuery = `path:"${path}" ${searchQuery}`;
      }

      const { results, totalResults, error } = await searchWithEverything(searchQuery, {
        maxResults,
        matchWholeWord: true
      });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error}`,
            },
          ],
          isError: true,
        };
      }

      const responseText = totalResults > 1
        ? `Found ${totalResults} instances of "${filename}" (showing ${results.length}):\n\n${results.join('\n')}`
        : totalResults === 1
          ? `Found only 1 instance of "${filename}":\n\n${results[0]}`
          : `No files found with name "${filename}"`;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding duplicates: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Add a tool for searching by file content (using Everything's content search syntax)
 * search_content 工具提示词模板:
 * 
 * {
 *   "method": "tools/call",
 *   "params": {
 *     "name": "search_content",
 *     "arguments": {
 *       "content": "要查找的文本内容",
 *       // 可选参数:
 *       "fileTypes": "txt;doc;pdf", // 限定文件类型（分号分隔）
 *       "path": "C:\\Users\\wostest\\Documents", // 限定搜索路径
 *       "maxResults": 10 // 返回最大结果数
 *     },
 *     "_meta": { "progressToken": 0 }
 *   },
 *   "jsonrpc": "2.0",
 *   "id": 1
 * }
 */
server.tool(
  "search_content",
  "Search for files containing specific text content, with optional file type and path filters.",
  {
    content: z.string().describe("Text content to search for within files"),
    fileTypes: z.string().optional().describe("Limit to specific file types (e.g., 'txt;doc;pdf')"),
    path: z.string().optional().describe("Limit search to specific path"),
    maxResults: z.number().min(1).max(1000).optional().describe("Maximum number of results to return (default: 50)"),
  },
  async ({ content, fileTypes, path, maxResults = 50 }) => {
    try {
      let searchQuery = `content:"${content}"`;

      if (fileTypes) {
        const types = fileTypes.split(';').map(type => `ext:${type.trim()}`).join(' | ');
        searchQuery = `(${types}) ${searchQuery}`;
      }

      if (path) {
        searchQuery = `path:"${path}" ${searchQuery}`;
      }

      const { results, totalResults, error } = await searchWithEverything(searchQuery, {
        maxResults
      });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error}. Note: Content search requires Everything to have content indexing enabled.`,
            },
          ],
          isError: true,
        };
      }

      const responseText = results.length > 0
        ? `Found ${totalResults} files containing "${content}" (showing ${results.length}):\n\n${results.join('\n')}`
        : `No files found containing "${content}". Note: Content search requires Everything to have content indexing enabled.`;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching content: ${error instanceof Error ? error.message : String(error)}. Note: Content search requires Everything to have content indexing enabled.`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Everything MCP server running on stdio');