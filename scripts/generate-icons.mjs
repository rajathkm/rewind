#!/usr/bin/env node
/**
 * PWA Icon Generator for Rewind
 * Generates a complete icon set using Sharp
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icons');

// Rewind brand colors
const PRIMARY_COLOR = '#6366f1'; // Indigo-500
const BACKGROUND_DARK = '#0a0a0a';

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

/**
 * Creates an SVG icon with the Rewind "R" logo
 * Modern, minimal design with rounded corners
 */
function createIconSVG(size, options = {}) {
  const { maskable = false } = options;
  const padding = maskable ? size * 0.1 : 0; // 10% safe zone for maskable
  const innerSize = size - (padding * 2);
  const cornerRadius = innerSize * 0.18; // Rounded corners
  const fontSize = innerSize * 0.55;
  const textY = size / 2 + fontSize * 0.35;

  // For maskable icons, we need a full bleed background
  const bgSize = maskable ? size : innerSize;
  const bgX = maskable ? 0 : padding;
  const bgY = maskable ? 0 : padding;
  const bgRadius = maskable ? 0 : cornerRadius;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.02}" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  ${maskable ? `<rect width="${size}" height="${size}" fill="${PRIMARY_COLOR}"/>` : ''}
  <rect x="${bgX}" y="${bgY}" width="${bgSize}" height="${bgSize}" rx="${bgRadius}" fill="url(#grad)" ${!maskable ? 'filter="url(#shadow)"' : ''}/>
  <text x="${size / 2}" y="${textY}"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="white"
        text-anchor="middle"
        letter-spacing="-${fontSize * 0.02}">R</text>
</svg>`;
}

/**
 * Creates a badge icon (smaller, for notifications)
 */
function createBadgeSVG(size) {
  const cornerRadius = size * 0.2;
  const fontSize = size * 0.6;
  const textY = size / 2 + fontSize * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${PRIMARY_COLOR}"/>
  <text x="${size / 2}" y="${textY}"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="white"
        text-anchor="middle">R</text>
</svg>`;
}

/**
 * Creates Apple Touch icon (no transparency, square)
 */
function createAppleTouchSVG(size) {
  const cornerRadius = size * 0.18;
  const fontSize = size * 0.5;
  const textY = size / 2 + fontSize * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="appleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BACKGROUND_DARK}"/>
  <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${cornerRadius}" fill="url(#appleGrad)"/>
  <text x="${size / 2}" y="${textY}"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="white"
        text-anchor="middle">R</text>
</svg>`;
}

async function generateIcons() {
  console.log('Creating icons directory...');
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('\nGenerating PWA icons...');

  // Generate standard icons
  for (const size of ICON_SIZES) {
    const svg = createIconSVG(size);
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    await writeFile(join(OUTPUT_DIR, `icon-${size}.png`), pngBuffer);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Generate maskable icon (512x512 with safe zone)
  const maskableSvg = createIconSVG(512, { maskable: true });
  const maskableBuffer = await sharp(Buffer.from(maskableSvg))
    .png({ quality: 100 })
    .toBuffer();
  await writeFile(join(OUTPUT_DIR, 'maskable-icon.png'), maskableBuffer);
  console.log('  ✓ maskable-icon.png');

  // Generate badge icon for notifications
  const badgeSvg = createBadgeSVG(72);
  const badgeBuffer = await sharp(Buffer.from(badgeSvg))
    .png({ quality: 100 })
    .toBuffer();
  await writeFile(join(OUTPUT_DIR, 'badge-72.png'), badgeBuffer);
  console.log('  ✓ badge-72.png');

  // Generate Apple Touch icons
  for (const size of [180, 167, 152]) {
    const appleSvg = createAppleTouchSVG(size);
    const appleBuffer = await sharp(Buffer.from(appleSvg))
      .png({ quality: 100 })
      .toBuffer();
    await writeFile(join(OUTPUT_DIR, `apple-touch-icon-${size}.png`), appleBuffer);
    console.log(`  ✓ apple-touch-icon-${size}.png`);
  }

  // Generate favicon
  const faviconSvg = createIconSVG(32);
  const faviconBuffer = await sharp(Buffer.from(faviconSvg))
    .png({ quality: 100 })
    .toBuffer();
  await writeFile(join(OUTPUT_DIR, 'favicon-32.png'), faviconBuffer);
  console.log('  ✓ favicon-32.png');

  // Generate favicon.ico (16x16 and 32x32)
  const favicon16Svg = createIconSVG(16);
  const favicon16Buffer = await sharp(Buffer.from(favicon16Svg))
    .png({ quality: 100 })
    .toBuffer();
  await writeFile(join(OUTPUT_DIR, 'favicon-16.png'), favicon16Buffer);
  console.log('  ✓ favicon-16.png');

  // Save SVG version for scalability
  await writeFile(join(OUTPUT_DIR, 'icon.svg'), createIconSVG(512));
  console.log('  ✓ icon.svg');

  console.log('\n✅ All icons generated successfully!');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
}

generateIcons().catch(console.error);
