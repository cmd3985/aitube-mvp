const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F2FE" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" fill="#000000" rx="100" />
  <path d="M190 140 L380 256 L190 372 Z" fill="url(#neonGradient)" filter="url(#glow)" />
</svg>`;

const svgBuffer = Buffer.from(svgCode);

async function generate() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, '../public/icon-192x192.png'));
    
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '../public/icon-512x512.png'));
    
  console.log("PNG icons generated.");
}

generate().catch(console.error);
