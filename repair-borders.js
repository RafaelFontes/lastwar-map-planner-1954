import { createCanvas, loadImage, ImageData } from 'canvas';
import fs from 'fs';

async function repairBorders() {
    console.log('Loading map image...');
    const image = await loadImage('./map-clean.png');

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Get image data
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // Helper to check if pixel is dark (border)
    const isDarkAt = (data, x, y) => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
        const idx = (y * canvas.width + x) * 4;
        return data[idx] < 100 && data[idx + 1] < 100 && data[idx + 2] < 100;
    };

    // Helper to set pixel to dark
    const setDark = (data, x, y) => {
        const idx = (y * canvas.width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
    };

    // Run multiple passes to close gaps progressively
    const numPasses = 3;

    for (let pass = 0; pass < numPasses; pass++) {
        console.log(`Pass ${pass + 1}/${numPasses}: Closing gaps...`);

        const outputData = new Uint8ClampedArray(data);
        let pixelsFilled = 0;

        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                // Skip if already dark
                if (isDarkAt(data, x, y)) continue;

                // Get all 8 neighbors
                const neighbors = {
                    top: isDarkAt(data, x, y - 1),
                    bottom: isDarkAt(data, x, y + 1),
                    left: isDarkAt(data, x - 1, y),
                    right: isDarkAt(data, x + 1, y),
                    topLeft: isDarkAt(data, x - 1, y - 1),
                    topRight: isDarkAt(data, x + 1, y - 1),
                    bottomLeft: isDarkAt(data, x - 1, y + 1),
                    bottomRight: isDarkAt(data, x + 1, y + 1)
                };

                const darkCount = Object.values(neighbors).filter(v => v).length;

                // Close vertical gaps (dark above and below)
                if (neighbors.top && neighbors.bottom) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }

                // Close horizontal gaps (dark left and right)
                if (neighbors.left && neighbors.right) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }

                // Close diagonal gaps (both diagonals)
                if (neighbors.topLeft && neighbors.bottomRight) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }
                if (neighbors.topRight && neighbors.bottomLeft) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }

                // Close L-shaped gaps and corners
                // Top-left corner
                if (neighbors.top && neighbors.left && !neighbors.topLeft) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }
                // Top-right corner
                if (neighbors.top && neighbors.right && !neighbors.topRight) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }
                // Bottom-left corner
                if (neighbors.bottom && neighbors.left && !neighbors.bottomLeft) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }
                // Bottom-right corner
                if (neighbors.bottom && neighbors.right && !neighbors.bottomRight) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }

                // Close if 3+ neighbors are dark (aggressive gap closing)
                if (darkCount >= 3) {
                    setDark(outputData, x, y);
                    pixelsFilled++;
                    continue;
                }

                // Close 2-pixel gaps by checking extended neighbors
                // Check if there's a dark pixel 2 steps away with dark on the path
                if (darkCount >= 2) {
                    // Check for near-gaps (dark pixel nearby forming a line)
                    const has2Top = isDarkAt(data, x, y - 2);
                    const has2Bottom = isDarkAt(data, x, y + 2);
                    const has2Left = isDarkAt(data, x - 2, y);
                    const has2Right = isDarkAt(data, x + 2, y);

                    if ((neighbors.top && has2Bottom) || (neighbors.bottom && has2Top)) {
                        setDark(outputData, x, y);
                        pixelsFilled++;
                        continue;
                    }
                    if ((neighbors.left && has2Right) || (neighbors.right && has2Left)) {
                        setDark(outputData, x, y);
                        pixelsFilled++;
                        continue;
                    }
                }
            }
        }

        console.log(`  Filled ${pixelsFilled} pixels`);

        // Update data for next pass
        data = outputData;
    }

    // Put the modified image data back
    const outputImageData = new ImageData(data, canvas.width, canvas.height);
    ctx.putImageData(outputImageData, 0, 0);

    // Save the repaired map
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./map-repaired.png', buffer);

    console.log('Repaired map saved as map-repaired.png');
}

repairBorders().catch(console.error);
