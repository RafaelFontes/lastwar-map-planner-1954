// Map Editor Application using Konva.js with vector tiles
class MapEditor {
    constructor() {
        this.tiles = new Map(); // Store tile data by ID
        this.tileShapes = new Map(); // Store Konva shapes by tile ID
        this.selectedTile = null;
        this.tileData = null;
        this.scale = 1;
        this.history = [];
        this.comments = new Map(); // Store comments by tile ID
        this.currentUser = 'Admin'; // Current logged in user
        this.isPanning = false;
        this.lastPointerPosition = null;

        this.initializeStage();
        this.loadTileData();
    }

    initializeStage() {
        const container = document.getElementById('mapContainer');

        // Create Konva stage with responsive sizing
        this.stage = new Konva.Stage({
            container: 'mapContainer',
            width: container.clientWidth,
            height: container.clientHeight,
            draggable: false
        });

        // Create layers
        this.mapLayer = new Konva.Layer();
        this.highlightLayer = new Konva.Layer();
        this.textLayer = new Konva.Layer();

        this.stage.add(this.mapLayer);
        this.stage.add(this.highlightLayer);
        this.stage.add(this.textLayer);

        // Add pan controls (no zoom with wheel)
        this.setupPanControls();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = document.getElementById('mapContainer');
        this.stage.width(container.clientWidth);
        this.stage.height(container.clientHeight);

        // Rescale to fit
        if (this.tileData) {
            this.fitToScreen();
        }
    }

    fitToScreen() {
        const container = document.getElementById('mapContainer');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Original map dimensions
        const mapWidth = this.tileData.width;
        const mapHeight = this.tileData.height;

        // Calculate scale to fit while maintaining aspect ratio
        const scaleX = containerWidth / mapWidth;
        const scaleY = containerHeight / mapHeight;
        const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to add some padding

        // Apply scale
        this.stage.scale({ x: scale, y: scale });

        // Center the map
        const scaledWidth = mapWidth * scale;
        const scaledHeight = mapHeight * scale;
        const offsetX = (containerWidth - scaledWidth) / 2;
        const offsetY = (containerHeight - scaledHeight) / 2;
        this.stage.position({ x: offsetX, y: offsetY });

        this.stage.batchDraw();
        this.updateZoomLevel();
    }

    setupPanControls() {
        const container = document.getElementById('mapContainer');

        // Pan with middle mouse, shift+drag, or click outside tiles
        // Use client coordinates (e.evt.clientX/Y) instead of stage.getPointerPosition()
        // because getPointerPosition() returns stage-relative coords that shift as the stage moves
        this.stage.on('mousedown', (e) => {
            // Middle mouse or shift+click always pans
            if (e.evt.button === 1 || (e.evt.shiftKey && e.evt.button === 0)) {
                this.isPanning = true;
                this.lastPointerPosition = { x: e.evt.clientX, y: e.evt.clientY };
                this.stage.container().style.cursor = 'grabbing';
                return;
            }

            // Left click - check if we're clicking on a tile or empty space
            // If the target is the stage itself or NOT a tile shape (Line), allow panning
            const isClickOnTile = e.target !== this.stage && e.target.getClassName() === 'Line';
            if (e.evt.button === 0 && !isClickOnTile) {
                // Clicked on stage background (outside any tile)
                this.isPanning = true;
                this.lastPointerPosition = { x: e.evt.clientX, y: e.evt.clientY };
                this.stage.container().style.cursor = 'grabbing';
            }
        });

        this.stage.on('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.evt.clientX - this.lastPointerPosition.x;
                const dy = e.evt.clientY - this.lastPointerPosition.y;

                this.stage.position({
                    x: this.stage.x() + dx,
                    y: this.stage.y() + dy
                });

                this.lastPointerPosition = { x: e.evt.clientX, y: e.evt.clientY };
                this.stage.batchDraw();
            }
        });

        this.stage.on('mouseup mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.stage.container().style.cursor = 'default';
            }
        });

        // Also handle pan from the container element (for areas outside the Konva stage content)
        container.addEventListener('mousedown', (e) => {
            // Only handle left click, and only if not already handled by Konva
            if (e.button === 0 && !this.isPanning) {
                // Check if we clicked on the container itself (not on a canvas)
                if (e.target === container || e.target.tagName !== 'CANVAS') {
                    this.isPanning = true;
                    this.lastPointerPosition = { x: e.clientX, y: e.clientY };
                    container.style.cursor = 'grabbing';
                }
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.lastPointerPosition) {
                const dx = e.clientX - this.lastPointerPosition.x;
                const dy = e.clientY - this.lastPointerPosition.y;

                this.stage.position({
                    x: this.stage.x() + dx,
                    y: this.stage.y() + dy
                });

                this.lastPointerPosition = { x: e.clientX, y: e.clientY };
                this.stage.batchDraw();
            }
        });

        container.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = 'default';
            }
        });

        container.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = 'default';
            }
        });
    }

    zoom(direction) {
        const scaleBy = 1.1;
        const oldScale = this.stage.scaleX();
        let newScale;

        if (direction === 'in') {
            newScale = oldScale * scaleBy;
        } else if (direction === 'out') {
            newScale = oldScale / scaleBy;
        } else {
            newScale = 1;
            this.stage.position({ x: 0, y: 0 });
        }

        // Limit zoom
        if (newScale < 0.5 || newScale > 3) return;

        // Zoom to center
        const center = {
            x: this.stage.width() / 2,
            y: this.stage.height() / 2
        };

        const mousePointTo = {
            x: (center.x - this.stage.x()) / oldScale,
            y: (center.y - this.stage.y()) / oldScale,
        };

        this.stage.scale({ x: newScale, y: newScale });

        const newPos = {
            x: center.x - mousePointTo.x * newScale,
            y: center.y - mousePointTo.y * newScale,
        };

        if (direction !== 'reset') {
            this.stage.position(newPos);
        }

        this.stage.batchDraw();
        this.updateZoomLevel();
    }

    updateZoomLevel() {
        const zoomLevel = Math.round(this.stage.scaleX() * 100);
        document.getElementById('zoomLevel').textContent = `${zoomLevel}%`;
    }

    async loadTileData() {
        try {
            // Add cache-busting parameter to avoid stale data
            const response = await fetch(`tile-data.json?_=${Date.now()}`);
            this.tileData = await response.json();
            console.log(`Loaded ${this.tileData.tiles.length} tiles`);
            this.drawTiles();
        } catch (error) {
            console.error('Error loading tile data:', error);
        }
    }

    drawTiles() {
        this.tileData.tiles.forEach(tileInfo => {
            // Create a polygon shape for each tile
            const points = [];
            tileInfo.polygon.forEach(point => {
                points.push(point.x, point.y);
            });

            // Create the tile shape
            const tileShape = new Konva.Line({
                points: points,
                fill: '#f8f9fa',
                stroke: '#333',
                strokeWidth: 2,
                closed: true,
                id: `tile-${tileInfo.id}`,
                perfectDrawEnabled: false
            });

            // Add hover and click events
            tileShape.on('mouseenter', () => {
                if (!this.isPanning) {
                    tileShape.fill('#e3e8f0');
                    this.stage.container().style.cursor = 'pointer';
                    this.mapLayer.batchDraw();
                }
            });

            tileShape.on('mouseleave', () => {
                if (!this.isPanning) {
                    const tileData = this.getTileData(tileInfo.id);
                    tileShape.fill(tileData.color || '#f8f9fa');
                    this.stage.container().style.cursor = 'default';
                    this.mapLayer.batchDraw();
                }
            });

            tileShape.on('click', (e) => {
                if (!this.isPanning) {
                    this.handleTileClick(tileInfo);
                }
            });

            this.mapLayer.add(tileShape);
            this.tileShapes.set(tileInfo.id, { shape: tileShape, info: tileInfo });
        });

        this.mapLayer.batchDraw();

        // Scale map to fit container on initial load
        this.fitToScreen();
    }

    handleTileClick(tileInfo) {
        this.selectTile(tileInfo);
    }

    selectTile(tileInfo) {
        // Auto-save current tile before switching to a new one
        if (this.selectedTile && this.selectedTile.id !== tileInfo.id) {
            this.saveTile();
        }

        this.selectedTile = tileInfo;
        const tileData = this.getTileData(tileInfo.id);

        // Show tile editor
        document.getElementById('tileInfo').style.display = 'none';
        document.getElementById('tileEditor').style.display = 'block';

        // Populate form
        document.getElementById('tileNumber').value = tileData.number || '';
        document.getElementById('tileName').value = tileData.name || '';
        document.getElementById('tileIcon').value = tileData.icon || '';
        document.getElementById('tileColor').value = tileData.color || '#f8f9fa';
        document.getElementById('tileComments').value = tileData.comments || '';

        // Show add comment section
        document.getElementById('addCommentSection').style.display = 'block';

        // Update comments display
        this.updateCommentsDisplay(tileInfo.id);

        this.highlightTile(tileInfo, 'rgba(220, 38, 38, 0.4)');
    }

    highlightTile(tileInfo, color = 'rgba(255, 215, 0, 0.5)') {
        this.highlightLayer.destroyChildren();

        const points = [];
        tileInfo.polygon.forEach(point => {
            points.push(point.x, point.y);
        });

        const highlight = new Konva.Line({
            points: points,
            fill: color,
            closed: true,
            perfectDrawEnabled: false
        });

        this.highlightLayer.add(highlight);
        this.highlightLayer.batchDraw();
    }

    clearHighlight() {
        if (this.selectedTile) {
            this.highlightTile(this.selectedTile, 'rgba(220, 38, 38, 0.4)');
        } else {
            this.highlightLayer.destroyChildren();
            this.highlightLayer.batchDraw();
        }
    }

    getTileData(tileId) {
        return this.tiles.get(tileId) || { number: '', name: '', icon: '', color: '#f8f9fa', comments: '' };
    }

    setTileData(tileId, data) {
        const oldData = this.getTileData(tileId);
        this.tiles.set(tileId, { ...data });
        this.updateTileDisplay(tileId);
        this.addHistory(tileId, oldData, data);
        this.updateTileList(document.getElementById('tileFilter')?.value || '');
    }

    // Calculate relative luminance of a hex color and return contrasting text color
    getContrastingTextColor(hexColor) {
        // Default to dark text for light backgrounds
        if (!hexColor || hexColor === '#f8f9fa') {
            return '#1e40af'; // Dark blue for default light background
        }

        // Parse hex color
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        // Convert to linear RGB
        const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        const rLin = toLinear(r);
        const gLin = toLinear(g);
        const bLin = toLinear(b);

        // Calculate relative luminance (WCAG formula)
        const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;

        // Return white for dark backgrounds, dark blue for light backgrounds
        return luminance > 0.4 ? '#1e3a5f' : '#ffffff';
    }

    // Calculate the centroid of a polygon using the shoelace formula
    calculatePolygonCentroid(polygon) {
        let area = 0;
        let cx = 0;
        let cy = 0;
        const n = polygon.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
            area += cross;
            cx += (polygon[i].x + polygon[j].x) * cross;
            cy += (polygon[i].y + polygon[j].y) * cross;
        }

        area = area / 2;
        cx = cx / (6 * area);
        cy = cy / (6 * area);

        return { x: cx, y: cy };
    }

    updateTileDisplay(tileId) {
        const tileEntry = this.tileShapes.get(tileId);
        if (!tileEntry) return;

        const tileInfo = tileEntry.info;
        const tileData = this.getTileData(tileId);

        // Update tile color
        tileEntry.shape.fill(tileData.color || '#f8f9fa');
        this.mapLayer.batchDraw();

        // Remove old text/icons for this tile
        this.textLayer.find(`.tile-${tileId}-element`).forEach(node => node.destroy());

        // Calculate true centroid of the polygon
        const centroid = this.calculatePolygonCentroid(tileInfo.polygon);

        // Add number if exists
        if (tileData.number !== undefined && tileData.number !== '') {
            const textColor = this.getContrastingTextColor(tileData.color);
            const numberText = new Konva.Text({
                x: centroid.x,
                y: centroid.y,
                text: String(tileData.number),
                fontSize: 18,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                fill: textColor,
                name: `tile-${tileId}-element`
            });
            // Center the text on the centroid
            numberText.offsetX(numberText.width() / 2);
            numberText.offsetY(numberText.height() / 2);
            this.textLayer.add(numberText);
        }

        // Add icon if exists (positioned below the number)
        if (tileData.icon) {
            const yOffset = (tileData.number !== undefined && tileData.number !== '') ? 15 : 0;
            const iconText = new Konva.Text({
                x: centroid.x,
                y: centroid.y + yOffset,
                text: tileData.icon,
                fontSize: 20,
                fontFamily: 'Arial',
                name: `tile-${tileId}-element`
            });
            iconText.offsetX(iconText.width() / 2);
            iconText.offsetY(iconText.height() / 2);
            this.textLayer.add(iconText);
        }

        this.textLayer.batchDraw();
    }

    saveTile() {
        if (!this.selectedTile) return;

        const number = document.getElementById('tileNumber').value;
        const name = document.getElementById('tileName').value;
        const icon = document.getElementById('tileIcon').value;
        const color = document.getElementById('tileColor').value;
        const comments = document.getElementById('tileComments').value;

        this.setTileData(this.selectedTile.id, {
            number,
            name,
            icon,
            color,
            comments
        });
    }

    clearTile() {
        if (!this.selectedTile) return;

        const oldData = this.getTileData(this.selectedTile.id);
        this.tiles.delete(this.selectedTile.id);
        this.textLayer.find(`.tile-${this.selectedTile.id}-element`).forEach(node => node.destroy());

        // Reset color
        const tileEntry = this.tileShapes.get(this.selectedTile.id);
        if (tileEntry) {
            tileEntry.shape.fill('#f8f9fa');
        }

        this.mapLayer.batchDraw();
        this.textLayer.batchDraw();

        document.getElementById('tileNumber').value = '';
        document.getElementById('tileName').value = '';
        document.getElementById('tileIcon').value = '';
        document.getElementById('tileColor').value = '#f8f9fa';
        document.getElementById('tileComments').value = '';

        this.addHistory(this.selectedTile.id, oldData, null);
        this.updateTileList(document.getElementById('tileFilter')?.value || '');
    }

    addHistory(tileId, oldData, newData) {
        const timestamp = new Date().toLocaleString();
        let action = '';
        let details = '';

        if (!oldData || Object.keys(oldData).every(k => !oldData[k])) {
            action = 'Created';
            details = `Tile ${tileId}: ${newData.name || 'Unnamed'}`;
        } else if (!newData) {
            action = 'Cleared';
            details = `Tile ${tileId}: ${oldData.name || 'Unnamed'}`;
        } else {
            action = 'Updated';
            const changes = [];
            if (oldData.number !== newData.number) changes.push('number');
            if (oldData.name !== newData.name) changes.push('name');
            if (oldData.icon !== newData.icon) changes.push('icon');
            if (oldData.color !== newData.color) changes.push('color');
            if (oldData.comments !== newData.comments) changes.push('comments');
            details = `Tile ${tileId}: ${changes.join(', ')}`;
        }

        this.history.unshift({ timestamp, action, details });

        // Keep only last 50 history items
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const listElement = document.getElementById('historyList');

        if (this.history.length === 0) {
            listElement.innerHTML = '<p class="hint">No changes yet</p>';
            return;
        }

        listElement.innerHTML = this.history.map(item => `
            <div class="history-item">
                <div class="timestamp">${item.timestamp}</div>
                <div class="action">${item.action}</div>
                <div class="details">${item.details}</div>
            </div>
        `).join('');
    }

    addComment() {
        if (!this.selectedTile) return;

        const commentText = document.getElementById('newComment').value.trim();
        if (!commentText) return;

        const tileId = this.selectedTile.id;
        if (!this.comments.has(tileId)) {
            this.comments.set(tileId, []);
        }

        const comment = {
            user: this.currentUser,
            text: commentText,
            timestamp: new Date().toLocaleString()
        };

        this.comments.get(tileId).push(comment);

        // Clear the textarea
        document.getElementById('newComment').value = '';

        // Update display
        this.updateCommentsDisplay(tileId);
    }

    updateCommentsDisplay(tileId) {
        const listElement = document.getElementById('commentsList');
        const tileComments = this.comments.get(tileId) || [];

        if (tileComments.length === 0) {
            listElement.innerHTML = '<p class="hint">No comments yet</p>';
            return;
        }

        listElement.innerHTML = tileComments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-user">${comment.user}</span>
                    <span class="comment-time">${comment.timestamp}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.getElementById('commentsTab').classList.toggle('active', tabName === 'comments');
        document.getElementById('historyTab').classList.toggle('active', tabName === 'history');

        // Update tab panels
        document.getElementById('commentsPanel').classList.toggle('active', tabName === 'comments');
        document.getElementById('historyPanel').classList.toggle('active', tabName === 'history');
    }

    updateTileList(filter = '') {
        const tbody = document.getElementById('tileListBody');
        if (!tbody) return;

        // Get all tiles with numbers or names
        const labeledTiles = [];
        this.tiles.forEach((data, tileId) => {
            if (data.number !== '' || data.name) {
                labeledTiles.push({ id: tileId, ...data });
            }
        });

        // Filter tiles
        const filterLower = filter.toLowerCase();
        const filteredTiles = labeledTiles.filter(tile => {
            if (!filter) return true;
            const numberMatch = tile.number !== undefined && tile.number.toString().includes(filter);
            const nameMatch = tile.name && tile.name.toLowerCase().includes(filterLower);
            return numberMatch || nameMatch;
        });

        // Sort by number
        filteredTiles.sort((a, b) => {
            const numA = parseInt(a.number) || 0;
            const numB = parseInt(b.number) || 0;
            return numA - numB;
        });

        if (filteredTiles.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="2">${filter ? 'No matching tiles' : 'No labeled tiles yet'}</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredTiles.map(tile => `
            <tr data-tile-id="${tile.id}">
                <td>${tile.number !== '' ? tile.number : '-'}</td>
                <td>${tile.name || '-'}</td>
            </tr>
        `).join('');

        // Add click handlers to rows
        tbody.querySelectorAll('tr[data-tile-id]').forEach(row => {
            row.addEventListener('click', () => {
                const tileId = parseInt(row.dataset.tileId);
                const tileEntry = this.tileShapes.get(tileId);
                if (tileEntry) {
                    this.selectTile(tileEntry.info);
                }
            });
        });
    }

    attachEventListeners() {
        // Tile editor buttons
        const saveTileBtn = document.getElementById('saveTile');
        const clearTileBtn = document.getElementById('clearTile');

        if (saveTileBtn) saveTileBtn.addEventListener('click', () => this.saveTile());
        if (clearTileBtn) clearTileBtn.addEventListener('click', () => this.clearTile());

        // Zoom buttons
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const resetZoomBtn = document.getElementById('resetZoom');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoom('in'));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoom('out'));
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => this.zoom('reset'));

        // Comment buttons
        const addCommentBtn = document.getElementById('addComment');
        if (addCommentBtn) addCommentBtn.addEventListener('click', () => this.addComment());

        // Tab buttons
        const commentsTabBtn = document.getElementById('commentsTab');
        const historyTabBtn = document.getElementById('historyTab');

        if (commentsTabBtn) commentsTabBtn.addEventListener('click', () => this.switchTab('comments'));
        if (historyTabBtn) historyTabBtn.addEventListener('click', () => this.switchTab('history'));

        // Tile list filter
        const tileFilter = document.getElementById('tileFilter');
        if (tileFilter) {
            tileFilter.addEventListener('input', (e) => this.updateTileList(e.target.value));
        }
    }
}

// Initialize the application
let mapEditor;
window.addEventListener('DOMContentLoaded', () => {
    mapEditor = new MapEditor();
    mapEditor.attachEventListeners();
});
