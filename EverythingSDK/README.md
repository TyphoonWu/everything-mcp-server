# Everything SDK

This directory contains the Everything SDK files required for the MCP server to function.

## Required Files

The following files are needed in the `dll/` subdirectory:

- `Everything32.dll` - 32-bit version of the Everything SDK DLL
- `Everything64.dll` - 64-bit version of the Everything SDK DLL

## Installation

### Option 1: Download from Everything Website

1. Visit the [Everything SDK download page](https://www.voidtools.com/support/everything/sdk/)
2. Download the Everything SDK
3. Extract the DLL files from the SDK package
4. Copy `Everything32.dll` and `Everything64.dll` to the `EverythingSDK/dll/` directory

### Option 2: Copy from Everything Installation

If you have Everything installed, you can copy the DLL files from your installation:

```bash
# From Everything installation directory (usually C:\Program Files\Everything\)
copy "C:\Program Files\Everything\Everything32.dll" EverythingSDK\dll\
copy "C:\Program Files\Everything\Everything64.dll" EverythingSDK\dll\
```

## Directory Structure

```
EverythingSDK/
├── dll/
│   ├── Everything32.dll  # Required - 32-bit DLL
│   └── Everything64.dll  # Required - 64-bit DLL
├── include/
│   └── Everything.h      # Header file with API definitions
└── README.md            # This file
```

## License

The Everything SDK is provided by voidtools and is subject to their license terms. Please refer to the Everything website for licensing information.

## Notes

- The MCP server automatically selects the appropriate DLL based on your system architecture
- Both DLL files are required for the server to work on different architectures
- The Everything application must be running for the SDK to function
- The DLL files are not included in this repository due to licensing and size constraints