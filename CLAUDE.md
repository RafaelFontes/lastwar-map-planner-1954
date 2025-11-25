# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Season 0 Map Editor - A browser-based interactive map editor for a tile-based game map. The application allows users to edit tile properties (name, number, icon, color), add comments, and track edit history.

## Commands

```bash
# Install dependencies
npm install

# Process original map image to remove blue numbers
npm run process-map

# Extract tile boundaries (basic method)
npm run extract-tiles

# Extract tile boundaries with precise contour detection
npm run extract-tiles-precise
```

## Architecture

### Frontend (Browser)
- **[app.js](app.js)** - Main `MapEditor` class using Konva.js for canvas rendering
  - Loads tile geometry from `tile-data.json`
  - Three Konva layers: `mapLayer` (tiles), `highlightLayer` (selection), `textLayer` (numbers/icons)
  - Tile state stored in `Map` objects (`tiles`, `tileShapes`, `comments`)
  - Pan controls via middle-mouse, shift+click, or clicking empty space
- **[index.html](index.html)** - Single-page UI with sidebar for tile editing
- **[styles.css](styles.css)** - Responsive layout with sidebar tile editor

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
3. Browser loads `tile-data.json` and renders interactive tiles

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
