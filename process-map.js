import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function removeNumbersFromMap() {
    console.log('Loading map image...');
    const image = await loadImage('./map.png');

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Get image data to process pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Detect and remove blue numbers
    // The numbers appear as blue text, we need to detect any blue-ish pixels
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Detect blue-ish pixels (numbers and their anti-aliasing)
        // Blue should be higher than red and green
        const isBlueish = b > r && b > g && b > 100;

        // Also catch lighter blue variants (anti-aliasing around text)
        const isLightBlue = b > 200 && r > 180 && g > 180 && b > r + 10 && b > g + 10;

        if (isBlueish || isLightBlue) {
            // Replace with white
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
        }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Save the clean map
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./map-clean.png', buffer);

    console.log('Clean map saved as map-clean.png');
}

removeNumbersFromMap().catch(console.error);
