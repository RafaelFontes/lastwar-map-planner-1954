import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function extractPreciseTileBoundaries() {
    console.log('Loading map image...');
    const image = await loadImage('./map-repaired.png');

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the image
    ctx.drawImage(image, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Create edge detection map
    const edges = new Array(canvas.width * canvas.height).fill(0);

    console.log('Detecting edges...');
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Dark pixels are borders
            const isDark = r < 100 && g < 100 && b < 100;

            if (isDark) {
                edges[y * canvas.width + x] = 1;
            }
        }
    }

    // Find tile regions (flood fill on white areas)
    console.log('Finding tile regions...');
    const visited = new Array(canvas.width * canvas.height).fill(false);
    const tiles = [];

    function isWhite(x, y) {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
        return edges[y * canvas.width + x] === 0;
    }

    function floodFill(startX, startY) {
        const stack = [[startX, startY]];
        const pixels = new Set();
        let minX = startX, maxX = startX, minY = startY, maxY = startY;

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            const idx = y * canvas.width + x;

            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            if (visited[idx] || !isWhite(x, y)) continue;
            if (pixels.has(key)) continue;

            visited[idx] = true;
            pixels.add(key);

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        return { pixels: Array.from(pixels), minX, maxX, minY, maxY, size: pixels.size };
    }

    // Find all tile regions
    for (let y = 10; y < canvas.height - 10; y += 5) {
        for (let x = 10; x < canvas.width - 10; x += 5) {
            const idx = y * canvas.width + x;
            if (!visited[idx] && isWhite(x, y)) {
                const region = floodFill(x, y);

                // Filter out small regions (noise) and very large regions (background)
                if (region.size > 200 && region.size < 50000) {
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
                        pixels: region.pixels
                    });

                    console.log(`Found tile ${tiles.length}: center(${Math.round(centerX)}, ${Math.round(centerY)})`);
                }
            }
        }
    }

    console.log(`\nTotal tiles found: ${tiles.length}`);

    // Extract precise contours for each tile using Moore-Neighbor tracing
    console.log('\nExtracting precise tile contours...');
    const tilesWithContours = extractPreciseContours(tiles, edges, canvas.width, canvas.height);

    // Save tile data
    const tileData = {
        width: canvas.width,
        height: canvas.height,
        tiles: tilesWithContours
    };

    fs.writeFileSync('./tile-data.json', JSON.stringify(tileData, null, 2));
    console.log('\nTile data saved to tile-data.json');

    // Create visualization
    visualizeTiles(tilesWithContours, canvas.width, canvas.height);
}

function extractPreciseContours(tiles, edges, width, height) {
    const result = [];

    for (const tile of tiles) {
        console.log(`Tracing contour for tile ${tile.id}...`);

        // Find a starting point on the boundary
        let startX = null, startY = null;

        // Scan for a boundary pixel (white pixel next to a black pixel)
        outerLoop: for (let y = tile.minY; y <= tile.maxY; y++) {
            for (let x = tile.minX; x <= tile.maxX; x++) {
                const isOnBorder = edges[y * width + x] === 1;

                // Check if this is a border pixel adjacent to our region
                if (isOnBorder) {
                    // Check if there's a white pixel (our region) to the right
                    if (x + 1 < width && edges[y * width + (x + 1)] === 0) {
                        const pixelKey = `${x + 1},${y}`;
                        if (tile.pixels.includes(pixelKey)) {
                            startX = x;
                            startY = y;
                            break outerLoop;
                        }
                    }
                }
            }
        }

        if (startX === null) {
            console.log(`  Could not find start point for tile ${tile.id}, using bounding box`);
            // Fallback to bounding box
            result.push({
                ...tile,
                polygon: [
                    { x: tile.minX, y: tile.minY },
                    { x: tile.maxX, y: tile.minY },
                    { x: tile.maxX, y: tile.maxY },
                    { x: tile.minX, y: tile.maxY }
                ]
            });
            continue;
        }

        // Moore-Neighbor tracing
        const contour = mooreNeighborTracing(startX, startY, edges, width, height, tile);

        // Simplify the contour
        const simplified = simplifyContour(contour, 2.0);

        console.log(`  Found ${contour.length} points, simplified to ${simplified.length} points`);

        result.push({
            ...tile,
            pixels: undefined, // Remove pixels to save space
            polygon: simplified
        });
    }

    return result;
}

function mooreNeighborTracing(startX, startY, edges, width, height, tile) {
    const contour = [];

    // Moore neighborhood directions (8-connected)
    const dirs = [
        [1, 0],   // E
        [1, 1],   // SE
        [0, 1],   // S
        [-1, 1],  // SW
        [-1, 0],  // W
        [-1, -1], // NW
        [0, -1],  // N
        [1, -1]   // NE
    ];

    let x = startX;
    let y = startY;
    let dir = 0; // Start going east

    const visited = new Set();
    const maxIterations = 10000;
    let iterations = 0;

    do {
        contour.push({ x, y });
        visited.add(`${x},${y}`);

        // Look for next border pixel
        let found = false;
        for (let i = 0; i < 8; i++) {
            const newDir = (dir + i) % 8;
            const [dx, dy] = dirs[newDir];
            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            const isBorder = edges[ny * width + nx] === 1;

            if (isBorder) {
                x = nx;
                y = ny;
                dir = (newDir + 6) % 8; // Turn left
                found = true;
                break;
            }
        }

        if (!found) break;

        iterations++;
        if (iterations > maxIterations) {
            console.log(`  Warning: Max iterations reached for tile ${tile.id}`);
            break;
        }

    } while (!(x === startX && y === startY) && iterations < maxIterations);

    return contour;
}

function simplifyContour(points, tolerance) {
    if (points.length < 3) return points;

    // Douglas-Peucker algorithm
    function perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        const norm = Math.sqrt(dx * dx + dy * dy);
        if (norm === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);

        return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / norm;
    }

    function douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;

        let maxDist = 0;
        let maxIndex = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const dist = perpendicularDistance(points[i], points[0], points[end]);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }

        if (maxDist > tolerance) {
            const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const right = douglasPeucker(points.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        } else {
            return [points[0], points[end]];
        }
    }

    return douglasPeucker(points, tolerance);
}

function visualizeTiles(tiles, width, height) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw tiles with their actual contours
    tiles.forEach((tile) => {
        if (tile.polygon && tile.polygon.length > 0) {
            ctx.beginPath();
            ctx.moveTo(tile.polygon[0].x, tile.polygon[0].y);

            for (let i = 1; i < tile.polygon.length; i++) {
                ctx.lineTo(tile.polygon[i].x, tile.polygon[i].y);
            }

            ctx.closePath();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw center point
            ctx.fillStyle = '#2563eb';
            ctx.beginPath();
            ctx.arc(tile.centerX, tile.centerY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw ID
            ctx.fillStyle = '#2563eb';
            ctx.font = '10px Arial';
            ctx.fillText(tile.id.toString(), tile.centerX - 5, tile.centerY + 3);
        }
    });

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./tiles-visualization.png', buffer);
    console.log('Visualization saved to tiles-visualization.png');
}

extractPreciseTileBoundaries().catch(console.error);
