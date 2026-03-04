import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const SVG_PATH = 'public/icons/icon-source.svg';
const OUTPUT_DIR = 'public/icons';

const sizes = [
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'android-xhdpi.png', size: 96 },
  { name: 'android-xxhdpi.png', size: 144 },
  { name: 'android-xxxhdpi.png', size: 192 },
];

async function generate() {
  const svgBuffer = await fs.readFile(SVG_PATH);
  
  for (const item of sizes) {
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(OUTPUT_DIR, item.name));
    console.log(`Generated: ${item.name}`);
  }
}

generate().catch(console.error);
