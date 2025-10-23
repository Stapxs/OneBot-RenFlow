# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OneBot-RenFlow (Ren Flow) is a cross-platform desktop application built with Tauri 2.x, Vue 3, and TypeScript. It's a QQ client implementation that uses the OneBot protocol for messaging, with a node-based flow editor for automation.

**Tech Stack:**
- Frontend: Vue 3 + TypeScript + Vite + Vue Router 4 + Vue Flow (node editor)
- Backend: Rust (Tauri 2.9)
- Build System: Cargo (Rust) + npm/yarn (Frontend)
- UI Library: vue3-bcui (custom UI components)

## Development Commands

### Frontend Development
- `yarn dev` - Start Vite dev server on port 8080
- `yarn build` - Build frontend (Vue TypeScript check + Vite build)

### Tauri Development
- `yarn dev:tauri` - Start Tauri in development mode with hot reload
- The Tauri config is located at `src-tauri/tauri.conf.json`

### Building
- Frontend build output goes to `dist/`
- Tauri automatically runs `yarn build` before building the app bundle

### Linting
- ESLint is configured with Vue 3 + TypeScript rules
- See `.eslintrc.cjs` for the full ruleset
- Notable rules: 4-space indent for Vue templates, single quotes for JS/TS, warns on console/debugger

## Architecture

### Frontend Structure (`src/`)

**Routing (`src/router/`):**
- Uses Vue Router 4 with HTML5 history mode
- Three main routes configured:
  - `/` - ListView (main window with list)
  - `/edit` - EditView (editing window with flow editor)
  - `/settings` - SettingsView (settings window)
- Router guard automatically updates document title based on route meta
- All views use lazy loading for better performance

**Views (`src/views/`):**
- `ListView.vue` - Main window showing list and navigation
- `EditView.vue` - Flow editor interface using Vue Flow with node-based automation
- `SettingsView.vue` - Settings and configuration interface
- Views are loaded via `<router-view />` in App.vue

**Core Modules (`src/functions/`):**
- `backend.ts` - Universal backend abstraction layer that handles both Tauri and web environments
  - Provides `backend.call()` for invoking Rust commands
  - Method naming convention: `sys:getConfig` → Tauri calls `sys_get_config`
  - Args are automatically wrapped in `{data: args[0]}` for Tauri if not already an object
  - Handles platform detection, proxy URL conversion, and event listeners
- `window.ts` - Window management system for creating/managing child windows
  - `windowManager.createWindow()` - Create or show a window
  - `windowManager.closeWindow()` - Close a specific window
  - `windowManager.openEditWindow()` / `openSettingsWindow()` - Shortcuts for common windows
  - Handles both Tauri native windows and web routing
- `base.ts` - Logging system (Logger class) and popup notifications (PopInfo class)
  - Log levels: WS, UI, ERR, INFO, DEBUG, SYSTEM
  - Log output includes styled console output with caller location tracking
- `runtime.ts` - Reactive runtime data store for application state
- `option.ts` - Configuration/settings management

**Node System (`src/functions/nodes/`):**
- `NodeManager.ts` - Central manager for all nodes (builtin + custom)
  - Singleton instance exported as `nodeManager`
  - Manages node registration, lookup, and execution
  - Organizes nodes by category (input, output, transform, control, logic, data, network, custom)
- `BaseNode.ts` - Abstract base class for all nodes
  - Defines `execute()` method for node logic
  - Includes `safeExecute()` wrapper with error handling and validation
- `types.ts` - TypeScript interfaces for nodes
  - NodeMetadata, NodeParam, NodeContext, NodeExecutionResult
  - NodeCategory and NodeParamType enums
- `builtin/` - Built-in nodes (e.g., ConsoleNode)
- `custom/CustomNode.ts` - User-defined custom nodes with JavaScript code

**Key Frontend Concepts:**
- **Reactive Backend**: `backend` object wrapped with Vue's `reactive()` for automatic UI updates
- The app uses a custom window titlebar for Linux/Windows (see `App.vue`)
- Platform-specific UI adjustments based on `backend.platform`
- Development mode shows extended controls (see `dev` ref in App.vue)
- Router-based architecture: Single Vue app handles multiple window types via routing
- **Multi-window support**: In Tauri desktop mode, each route can be opened as a separate native window
  - Main window (label: `main`) shows ListView at `/`
  - Child windows (labels: `edit`, `settings`) are created on demand
  - Windows are reused if already open (focus + show instead of creating duplicate)
- **Flow Editor**: EditView uses Vue Flow for visual node-based programming
  - Custom `BaseNode` and `BaseEdge` components
  - Node collision detection and auto-repositioning
  - Nodes are linked to the NodeManager system for execution

### Backend Structure (`src-tauri/src/`)

**Main Entry (`lib.rs`):**
- Entry point: `pub fn run()` sets up the Tauri application
- Uses `tauri-plugin-store` for persistent settings (`.settings.dat`)
- Implements custom log4rs configuration with colored console output
- Log level is configurable: "err", "debug", "info", "all"
- Window creation handled by `create_window()` with platform-specific behaviors:
  - **macOS**: Overlay titlebar, sidebar effect, transparent background, macOS private API enabled
  - **Linux**: Frameless window, drag-drop disabled
  - **Windows**: Mica effect applied via window-vibrancy
- Window close behavior: Hides instead of closing (tray-based app pattern)
- DevTools auto-open in debug builds
- **Proxy Server**: Initializes HTTP proxy server on startup (stored in `PROXY_PORT` global)
  - Critical for loading external resources in Tauri (see `utils/http_proxy.rs`)
  - Port number returned via `sys_run_proxy()` command

**Commands (`src-tauri/src/commands/`):**
- `sys.rs` - System commands:
  - Platform detection: `sys_get_platform()`, `sys_get_release()`
  - Proxy service: `sys_run_proxy()`
  - Notifications: `sys_send_notice()`, `sys_close_notice()`, etc.
  - File operations: `sys_download()`
  - Network: `sys_get_final_redirect_url()`, `sys_get_html()`, `sys_get_api()`
  - Browser integration: `sys_open_in_browser()`
  - Shell commands: `sys_run_command()`
- `win.rs` - Window management commands:
  - `win_create_window()` - Create or show window (reuses existing windows)
  - `win_close_window()`, `win_show_window()`, `win_hide_window()`
  - `win_start_dragging()` - Enable window dragging
  - `win_minimize()`, `win_maximize()`, `win_unmaximize()`, `win_toggle_maximize()`
  - `win_is_maximized()`

**Utils (`src-tauri/src/utils/`):**
- `colored_encoder.rs` - Custom log encoder for colored console output
- `http_proxy.rs` - HTTP proxy server for external resource loading

**Custom Crate (`src-tauri/crates/user-notify/`):**
- Cross-platform notification system
- Platform-specific implementations for macOS, Windows, and Linux (XDG)
- Used by `sys.rs` for desktop notifications

**Dependencies:**
- `tauri` 2.9 with protocol-asset, macos-private-api, devtools features
- `tauri-plugin-store` for settings persistence
- `tauri-plugin-single-instance` for single instance enforcement
- `tauri-plugin-window-state` for window state restoration
- `tauri-plugin-notification` for notifications
- `tauri-plugin-opener` for opening URLs/files
- `log4rs` for logging infrastructure
- `window-vibrancy` for Windows Mica effect
- `warp` for HTTP proxy server
- `reqwest` for HTTP client functionality
- `rfd` for native file dialogs

### Platform-Specific Behaviors

**macOS:**
- Uses overlay titlebar style with hidden title
- Sidebar vibrancy effect
- Private API enabled for advanced window control
- Hides entire app (not just window) on close

**Windows:**
- Mica translucent effect applied
- Custom titlebar (controlled by frontend)

**Linux:**
- Frameless window (custom decorations)
- Drag-drop handler disabled

### Frontend-Backend Communication

**Calling Rust from TypeScript:**
```typescript
// Example: Call a Rust command without parameters
await backend.call('sys:getPlatform')

// Example: Call with a single non-object parameter (auto-wrapped as {data: value})
await backend.call('sys:runCommand', 'ls -la')

// Example: Call with an object parameter
await backend.call('sys:download', { url: 'https://...', filename: 'file.txt' })

// This translates to calling the Rust function with snake_case naming
// sys:getPlatform → sys_get_platform
```

**Window Management:**
```typescript
// Using the window manager utility
import { windowManager } from '@app/functions/window'

// Create or show a window (if already exists, focuses it)
await windowManager.createWindow({
    label: 'mywindow',
    url: '/some-route',
    title: 'My Window',
    width: 800,
    height: 600
})

// Shortcuts for common windows
await windowManager.openEditWindow()
await windowManager.openSettingsWindow()

// Close a window
await windowManager.closeWindow('mywindow')

// Show/hide windows
await windowManager.showWindow('mywindow')
await windowManager.hideWindow('mywindow')

// Note: Parameters are automatically mapped:
// backend.call('win:createWindow', { options }) → win_create_window(options: CreateWindowOptions)
// backend.call('win:closeWindow', { label }) → win_close_window(label: String)
```

**Method Name Translation:**
- Colons replaced with underscores: `sys:getConfig` → `sys_get_config`
- CamelCase converted to snake_case
- Rust functions should accept a struct/object parameter

**Event Listeners:**
Use `backend.addListener()` to listen for Tauri events from Rust.

### Node System Architecture

The node system enables visual flow-based programming in the Edit view:

**Node Lifecycle:**
1. Nodes are registered in `NodeManager` (builtin or custom)
2. User creates node instances in the flow editor (EditView)
3. Nodes are connected via edges to form execution flows
4. NodeManager executes nodes with `executeNode(nodeId, input, params, context)`

**Creating Custom Nodes:**
- Extend `BaseNode` class for TypeScript nodes
- Or use `CustomNode` for user-defined JavaScript nodes
- Register via `nodeManager.registerCustomNode(id, name, desc, code, params)`

**Node Categories:**
- `input` - Data input nodes
- `output` - Data output nodes
- `transform` - Data transformation
- `control` - Flow control (conditionals, loops)
- `logic` - Logic operations
- `data` - Data storage/retrieval
- `network` - Network requests
- `custom` - User-defined nodes

### Configuration Files

- `tauri.conf.json` - Tauri configuration
  - App identifier: `cn.stapxs.renflow`
  - Frontend served from `dist/` in production
  - Dev server at `http://localhost:8080`
  - Asset protocol enabled with full scope (`**`)
- `vite.config.ts` - Vite runs on port 8080 (matches Tauri devUrl)
  - Path alias configured: `@app` → `./src`
- `.eslintrc.cjs` - ESLint rules (extends Vue 3 + TypeScript recommended)
- `src/router/index.ts` - Vue Router configuration with three routes

### Store/Settings

The app uses `tauri-plugin-store` to persist settings in `.settings.dat`:
- `log_level` - Controls logging verbosity (err/debug/info/all)
- Store is initialized on app setup in `lib.rs`

### Proxy System

The app includes a proxy service for handling external resources:
- Managed by `backend.proxy` (port number)
- Use `backend.proxyUrl(url)` to convert URLs for proxying
- Critical for Tauri desktop app to load external resources
- Started automatically on app initialization via `sys:runProxy`

## Development Notes

### Running Tests
No test framework is currently configured in package.json or Cargo.toml.

### Code Style
- Vue templates: 4-space indentation
- TypeScript/JavaScript: Single quotes preferred
- Unused variables starting with `_` are allowed
- Arrow functions preferred over function declarations
