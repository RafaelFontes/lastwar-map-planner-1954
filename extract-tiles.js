import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function extractTileBoundaries() {
    console.log('Loading map image...');
    const image = await loadImage('./map-clean.png');

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the image
    ctx.drawImage(image, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Create a binary edge map (detect black borders)
    const edgeMap = new Array(canvas.width * canvas.height).fill(0);

    console.log('Detecting tile edges...');
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Detect black/dark borders (the tile edges)
            if (r < 100 && g < 100 && b < 100) {
                edgeMap[y * canvas.width + x] = 1;
            }
        }
    }

    // Find connected components (tiles)
    console.log('Finding tile regions...');
    const visited = new Array(canvas.width * canvas.height).fill(false);
    const tiles = [];

    function isWhite(x, y) {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
        return edgeMap[y * canvas.width + x] === 0;
    }

    function floodFill(startX, startY) {
        const stack = [[startX, startY]];
        const pixels = [];
        let minX = startX, maxX = startX, minY = startY, maxY = startY;

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * canvas.width + x;

            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            if (visited[idx] || !isWhite(x, y)) continue;

            visited[idx] = true;
            pixels.push([x, y]);

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            // 4-connected neighbors
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        return { pixels, minX, maxX, minY, maxY };
    }

    // Find all tile regions
    for (let y = 10; y < canvas.height - 10; y += 5) {
        for (let x = 10; x < canvas.width - 10; x += 5) {
            const idx = y * canvas.width + x;
            if (!visited[idx] && isWhite(x, y)) {
                const region = floodFill(x, y);

                // Filter out small regions (noise) and very large regions (background)
                if (region.pixels.length > 200 && region.pixels.length < 50000) {
                    const width = region.maxX - region.minX;
                    const height = region.maxY - region.minY;

                    // Calculate center
                    const centerX = (region.minX + region.maxX) / 2;
                    const centerY = (region.minY + region.maxY) / 2;

                    tiles.push({
                        id: tiles.length,
                        centerX: Math.round(centerX),
                        centerY: Math.round(centerY),
                        minX: region.minX,
                        maxX: region.maxX,
                        minY: region.minY,
                        maxY: region.maxY,
                        width,
                        height,
                        area: region.pixels.length
                    });

                    console.log(`Found tile ${tiles.length}: center(${Math.round(centerX)}, ${Math.round(centerY)}), size: ${width}x${height}`);
                }
            }
        }
    }

    console.log(`\nTotal tiles found: ${tiles.length}`);

    // Now extract polygon boundaries for each tile using contour tracing
    console.log('\nExtracting tile polygons...');
    const tilesWithPolygons = await extractPolygons(tiles, edgeMap, canvas.width, canvas.height);

    // Save tile data
    const tileData = {
        width: canvas.width,
        height: canvas.height,
        tiles: tilesWithPolygons
    };

    fs.writeFileSync('./tile-data.json', JSON.stringify(tileData, null, 2));
    console.log('\nTile data saved to tile-data.json');

    // Create a visualization
    visualizeTiles(tiles, canvas.width, canvas.height);
}

async function extractPolygons(tiles, edgeMap, width, height) {
    // For each tile, trace the boundary to create a polygon
    const tilesWithPolygons = [];

    for (const tile of tiles) {
        // Create a simple polygon approximation using the bounding box
        // and sample points along the border
        const polygon = traceBoundary(tile, edgeMap, width, height);

        tilesWithPolygons.push({
            ...tile,
            polygon: polygon
        });
    }

    return tilesWithPolygons;
}

function traceBoundary(tile, edgeMap, width, height) {
    // Trace the boundary of a tile region
    // For simplicity, we'll create an approximate polygon using key boundary points

    const { minX, maxX, minY, maxY, centerX, centerY } = tile;

    // Sample points around the perimeter at regular angles
    const points = [];
    const numSamples = 32;

    for (let i = 0; i < numSamples; i++) {
        const angle = (i / numSamples) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // Ray cast from center to find boundary
        let distance = 0;
        const maxDistance = Math.max(maxX - minX, maxY - minY);

        for (let d = 0; d < maxDistance; d++) {
            const x = Math.round(centerX + dx * d);
            const y = Math.round(centerY + dy * d);

            if (x < minX || x > maxX || y < minY || y > maxY) break;

            const idx = y * width + x;
            if (edgeMap[idx] === 1) {
                distance = d;
                break;
            }
        }

        if (distance > 0) {
            points.push({
                x: Math.round(centerX + dx * distance),
                y: Math.round(centerY + dy * distance)
            });
        }
    }

    // Simplify polygon using Douglas-Peucker or just thin it out
    const simplified = simplifyPolygon(points, 3);

    return simplified;
}

function simplifyPolygon(points, tolerance) {
    if (points.length < 3) return points;

    // Simple decimation - keep every nth point
    const result = [];
    for (let i = 0; i < points.length; i += 2) {
        result.push(points[i]);
    }

    return result;
}

function visualizeTiles(tiles, width, height) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw tiles
    tiles.forEach((tile, idx) => {
        // Draw bounding box
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.minX, tile.minY, tile.width, tile.height);

        // Draw center point
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(tile.centerX, tile.centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw ID
        ctx.fillStyle = '#2563eb';
        ctx.font = '10px Arial';
        ctx.fillText(idx.toString(), tile.centerX - 5, tile.centerY + 3);
    });

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./tiles-visualization.png', buffer);
    console.log('Visualization saved to tiles-visualization.png');
}

extractTileBoundaries().catch(console.error);
