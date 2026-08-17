import { build } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsMap = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.split('=');
  return [key, value.join('=')];
}));
const outputDirectory = path.resolve(projectRoot, argumentsMap.get('--out-dir') || 'dist');

function assertSafeOutputDirectory(directory) {
  const parsed = path.parse(directory);
  if (directory === projectRoot || directory === parsed.root) {
    throw new Error(`Refusing to clean unsafe output directory: ${directory}`);
  }
}

function rewriteIndex(html) {
  const stylesheetPattern = /\s*<link rel="stylesheet" href="\.\/src\/styles\/(?:tokens|base|components|responsive)\.css">/g;
  let stylesheetWritten = false;
  return html
    .replace(stylesheetPattern, () => {
      if (stylesheetWritten) return '';
      stylesheetWritten = true;
      return '\n  <link rel="stylesheet" href="./assets/app.css">';
    })
    .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" type="image/svg+xml" href="./favicon.svg">')
    .replace('<script type="module" src="./src/main.js"></script>', '<script type="module" src="./assets/app.js"></script>');
}

function createIco() {
  const width = 16;
  const height = 16;
  const bitmapSize = 40 + width * height * 4 + height * 4;
  const buffer = Buffer.alloc(6 + 16 + bitmapSize);
  buffer.writeUInt16LE(0, 0);
  buffer.writeUInt16LE(1, 2);
  buffer.writeUInt16LE(1, 4);
  buffer[6] = width;
  buffer[7] = height;
  buffer.writeUInt16LE(1, 10);
  buffer.writeUInt16LE(32, 12);
  buffer.writeUInt32LE(bitmapSize, 14);
  buffer.writeUInt32LE(22, 18);
  buffer.writeUInt32LE(40, 22);
  buffer.writeInt32LE(width, 26);
  buffer.writeInt32LE(height * 2, 30);
  buffer.writeUInt16LE(1, 34);
  buffer.writeUInt16LE(32, 36);

  const pixelOffset = 62;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 2 || x === 13 || y === 2 || y === 13;
      const utensil = (x === 6 && y >= 5 && y <= 11) || (x === 10 && y >= 6 && y <= 11);
      const dark = edge || utensil;
      const offset = pixelOffset + ((height - 1 - y) * width + x) * 4;
      buffer[offset] = dark ? 32 : 255;
      buffer[offset + 1] = dark ? 32 : 255;
      buffer[offset + 2] = dark ? 32 : 255;
      buffer[offset + 3] = 255;
    }
  }
  return buffer;
}

async function main() {
  assertSafeOutputDirectory(outputDirectory);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, 'assets'), { recursive: true });

  await build({
    absWorkingDir: projectRoot,
    entryPoints: ['src/main.js'],
    outfile: path.join(outputDirectory, 'assets', 'app.js'),
    bundle: true,
    charset: 'utf8',
    format: 'esm',
    legalComments: 'none',
    minify: true,
    sourcemap: false,
    target: ['es2022']
  });

  const cssFiles = ['tokens.css', 'base.css', 'components.css', 'responsive.css'];
  const css = await Promise.all(cssFiles.map((file) => readFile(path.join(projectRoot, 'src', 'styles', file), 'utf8')));
  const indexHtml = rewriteIndex(await readFile(path.join(projectRoot, 'index.html'), 'utf8'));

  await Promise.all([
    writeFile(path.join(outputDirectory, 'assets', 'app.css'), `${css.join('\n')}\n`),
    writeFile(path.join(outputDirectory, 'index.html'), indexHtml),
    writeFile(path.join(outputDirectory, '404.html'), await readFile(path.join(projectRoot, '404.html'))),
    writeFile(path.join(outputDirectory, 'favicon.svg'), await readFile(path.join(projectRoot, 'favicon.svg'))),
    writeFile(path.join(outputDirectory, 'favicon.ico'), createIco())
  ]);

  process.stdout.write(`Built GitHub Pages artifact at ${outputDirectory}\n`);
}

await main();
