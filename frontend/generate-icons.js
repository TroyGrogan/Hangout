#!/usr/bin/env node

/**
 * Generate PWA icons from SVG favicon
 * This script converts the favicon.svg to multiple PNG sizes for PWA support
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG content for the Hangout icon
const svgTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="SIZE" height="SIZE">
  <!-- Background Square with Rounded Corners -->
  <rect x="5" y="5" width="90" height="90" rx="15" ry="15" fill="#3B5998" />
  
  <!-- Stylized "H" Letter using Segoe UI font style -->
  <text x="50" y="70" font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" 
        font-size="55" font-weight="600" text-anchor="middle" 
        fill="#FFFFF0" dominant-baseline="auto">H</text>
</svg>`;

console.log('🎨 Generating PWA icons from SVG favicon...');

// Check if we can use sharp for PNG conversion
let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
  console.log('✅ Using Sharp for high-quality PNG conversion');
} catch (e) {
  console.log('⚠️  Sharp not available. Please install it with: npm install sharp');
  console.log('   For now, creating SVG versions that browsers can use...');
}

const publicDir = path.join(__dirname, 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateIcons() {
  for (const size of iconSizes) {
    const filename = `icon-${size}x${size}`;
    
    if (sharp) {
      // Generate PNG using Sharp (high quality)
      try {
        const svgBuffer = Buffer.from(svgTemplate.replace(/SIZE/g, size));
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(path.join(publicDir, `${filename}.png`));
        
        console.log(`✅ Generated ${filename}.png`);
      } catch (error) {
        console.error(`❌ Error generating ${filename}.png:`, error.message);
      }
    } else {
      // Fallback: Create SVG files with specific sizes
      const sizedSvg = svgTemplate.replace(/SIZE/g, size);
      fs.writeFileSync(path.join(publicDir, `${filename}.svg`), sizedSvg);
      console.log(`✅ Generated ${filename}.svg (fallback)`);
    }
  }
  
  // Also create apple-touch-icon for iOS
  if (sharp) {
    try {
      const svgBuffer = Buffer.from(svgTemplate.replace(/SIZE/g, 180));
      await sharp(svgBuffer)
        .resize(180, 180)
        .png()
        .toFile(path.join(publicDir, 'apple-touch-icon.png'));
      
      console.log('✅ Generated apple-touch-icon.png');
    } catch (error) {
      console.error('❌ Error generating apple-touch-icon.png:', error.message);
    }
  }
  
  console.log('🎉 PWA icon generation complete!');
  console.log('📱 Your app will now use the correct icon when added to home screen');
}

generateIcons().catch(console.error); 