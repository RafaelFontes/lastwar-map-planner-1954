# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Last War Project Explorer - A React-based interactive map explorer for a tile-based game map. The application allows users to edit tile properties (name, number, icon, color), add comments, and track edit history.

## Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Process original map image to remove blue numbers
npm run process-map

# Extract tile boundaries (basic method)
npm run extract-tiles

# Extract tile boundaries with precise contour detection
npm run extract-tiles-precise
```

## Architecture

### Frontend (React + Vite)

#### Entry Points
- **[index.html](index.html)** - Vite entry point
- **[src/main.jsx](src/main.jsx)** - React app bootstrap
- **[src/App.jsx](src/App.jsx)** - Main app component, orchestrates all child components

#### Components (`src/components/`)
- **Header/** - App header with zoom controls
- **MapCanvas/** - Konva.js canvas with react-konva for tile rendering
  - Three layers: map layer (tiles), highlight layer (selection), text layer (numbers/icons)
  - Handles pan controls via middle-mouse, shift+click, or clicking empty space
- **TileList/** - Filterable table of labeled tiles
- **Sidebar/** - Contains TileEditor, CommentsPanel, and HistoryPanel

#### Hooks (`src/hooks/`)
- **useMapEditor.js** - Main state management hook, uses service layer for persistence
- **useCanvasControls.js** - Pan/zoom controls and canvas positioning

#### Data Layer (`src/data/`)
- **interfaces.js** - Abstract interfaces for repositories (ITileRepository, ICommentRepository, IHistoryRepository, ITileGeometryRepository)
- **localStorage/** - localStorage implementations of the repository interfaces
  - LocalStorageTileRepository - Persists tile data to localStorage
  - LocalStorageCommentRepository - Persists comments to localStorage
  - LocalStorageHistoryRepository - Persists history to localStorage
  - FetchTileGeometryRepository - Loads tile geometry from static JSON

#### Service Layer (`src/services/`)
- **MapEditorService.js** - Business logic layer that coordinates repositories and provides clean API

#### Dependency Injection (`src/di/`)
- **ServiceContext.jsx** - React context for dependency injection
  - ServiceProvider - Wraps app with injected services
  - useServices / useMapEditorService - Hooks to access services
  - createDIContainer - Factory for creating DI container (useful for testing)

#### Utilities (`src/utils/`)
- **colorUtils.js** - Color contrast calculations for text visibility
- **geometryUtils.js** - Polygon centroid calculation, point conversion

### Node.js Processing Scripts
- **[process-map.js](process-map.js)** - Removes blue text from `map.png`, outputs `map-clean.png`
- **[extract-tiles.js](extract-tiles.js)** - Basic tile detection via flood fill
- **[extract-tiles-precise.js](extract-tiles-precise.js)** - Precise contour extraction using:
  - Edge detection for black borders
  - Flood fill to identify white tile regions
  - Moore-Neighbor tracing for boundary contours
  - Douglas-Peucker simplification for polygon optimization

### Data Flow
1. `map.png` -> `process-map.js` -> `map-clean.png`
2. `map-clean.png` -> `extract-tiles-precise.js` -> `tile-data.json` + `tiles-visualization.png`
3. React app loads `tile-data.json` from `/public` and renders interactive tiles

### Persistence Architecture
```
React Components
       ↓ (use hooks)
useMapEditor Hook
       ↓ (uses via DI)
MapEditorService (business logic)
       ↓ (coordinates)
Repositories (ITileRepository, ICommentRepository, etc.)
       ↓ (implementations)
localStorage / Fetch API
```

**localStorage Keys:**
- `mapEditor_tiles` - Tile properties (number, name, icon, color, comments)
- `mapEditor_comments` - Tile comments with author and timestamp
- `mapEditor_history` - Change history (max 50 entries)

### Key Data Structure (tile-data.json)
```json
{
  "width": number,
  "height": number,
  "tiles": [{
    "id": number,
    "centerX": number,
    "centerY": number,
    "polygon": [{ "x": number, "y": number }, ...]
  }]
}
```

## Tech Stack
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **react-konva** - React bindings for Konva.js canvas library
- **CSS Modules** - Scoped component styling
