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

// Regular SVG content (fills entire canvas with subtle rounded corners)
const svgTemplateRegular = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="SIZE" height="SIZE">
  <!-- Background Square with app theme color -->
  <rect x="0" y="0" width="100" height="100" rx="12" ry="12" fill="#00B488" />
  
  <!-- Stylized "H" Letter using Segoe UI font style -->
  <text x="50" y="70" font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" 
        font-size="58" font-weight="700" text-anchor="middle" 
        fill="#FFFFFF" dominant-baseline="auto">H</text>
</svg>`;

// Maskable SVG content (fills entire canvas for adaptive icons)
const svgTemplateMaskable = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="SIZE" height="SIZE">
  <!-- Full canvas background for maskable - no rounded corners (OS handles this) -->
  <rect x="0" y="0" width="100" height="100" fill="#00B488" />
  
  <!-- Stylized "H" Letter centered and sized for maskable icon -->
  <text x="50" y="70" font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" 
        font-size="58" font-weight="700" text-anchor="middle" 
        fill="#FFFFFF" dominant-baseline="auto">H</text>
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
    const filenameRegular = `icon-${size}x${size}`;
    const filenameMaskable = `icon-${size}x${size}-maskable`;
    
    if (sharp) {
      // Generate regular PNG using Sharp
      try {
        const svgBuffer = Buffer.from(svgTemplateRegular.replace(/SIZE/g, size));
        await sharp(svgBuffer)
          .resize(size, size)
          .flatten({ background: '#00B488' }) // Force solid background, remove alpha
          .png({ 
            compressionLevel: 9,
            palette: false, // Force RGB, not palette
            quality: 100,
            force: true // Force PNG output
          })
          .toFile(path.join(publicDir, `${filenameRegular}.png`));
        
        console.log(`✅ Generated ${filenameRegular}.png`);
      } catch (error) {
        console.error(`❌ Error generating ${filenameRegular}.png:`, error.message);
      }

      // Generate maskable PNG using Sharp
      try {
        const svgBuffer = Buffer.from(svgTemplateMaskable.replace(/SIZE/g, size));
        await sharp(svgBuffer)
          .resize(size, size)
          .flatten({ background: '#00B488' }) // Force solid background, remove alpha
          .png({ 
            compressionLevel: 9,
            palette: false, // Force RGB, not palette
            quality: 100,
            force: true // Force PNG output
          })
          .toFile(path.join(publicDir, `${filenameMaskable}.png`));
        
        console.log(`✅ Generated ${filenameMaskable}.png`);
      } catch (error) {
        console.error(`❌ Error generating ${filenameMaskable}.png:`, error.message);
      }
    } else {
      // Fallback: Create SVG files with specific sizes
      const sizedSvgRegular = svgTemplateRegular.replace(/SIZE/g, size);
      const sizedSvgMaskable = svgTemplateMaskable.replace(/SIZE/g, size);
      
      fs.writeFileSync(path.join(publicDir, `${filenameRegular}.svg`), sizedSvgRegular);
      fs.writeFileSync(path.join(publicDir, `${filenameMaskable}.svg`), sizedSvgMaskable);
      
      console.log(`✅ Generated ${filenameRegular}.svg and ${filenameMaskable}.svg (fallback)`);
    }
  }
  
  // Also create apple-touch-icon for iOS (use regular version)
  if (sharp) {
    try {
      const svgBuffer = Buffer.from(svgTemplateRegular.replace(/SIZE/g, 180));
      await sharp(svgBuffer)
        .resize(180, 180)
        .flatten({ background: '#00B488' }) // Force solid background, remove alpha
        .png({ 
          compressionLevel: 9,
          palette: false, // Force RGB, not palette
          quality: 100,
          force: true // Force PNG output
        })
        .toFile(path.join(publicDir, 'apple-touch-icon.png'));
      
      console.log('✅ Generated apple-touch-icon.png');
    } catch (error) {
      console.error('❌ Error generating apple-touch-icon.png:', error.message);
    }
  }
  
  console.log('🎉 PWA icon generation complete!');
  console.log('📱 Your app will now use the correct icon when added to home screen');
  console.log('🔄 Remember to update manifest.json to use the new maskable icons');
}

generateIcons().catch(console.error); 