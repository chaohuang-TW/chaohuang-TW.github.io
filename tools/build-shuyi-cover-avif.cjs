/* Run with sharp in NODE_PATH. Preserve the original cover and WebP fallback. */
const sharp = require('sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  for (const width of [320, 480, 640, 960]) {
    const output = `assets/images/shuyi-podcast-cover-responsive-${width}.avif`;
    const info = await sharp(path.join(root, 'assets/images/shuyi-podcast-cover.jpg'))
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 65, effort: 7, chromaSubsampling: '4:4:4' })
      .toFile(path.join(root, output));
    console.log(JSON.stringify({output, width: info.width, height: info.height, bytes: info.size}));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
