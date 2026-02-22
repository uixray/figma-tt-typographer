import { build, context } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Build main plugin code
const mainConfig = {
  entryPoints: [resolve(__dirname, 'src/main.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/code.js'),
  format: 'iife',
  target: 'es2020',
  minify: !isWatch,
};

// Build UI code — bundle JS, then inline into HTML template
const uiConfig = {
  entryPoints: [resolve(__dirname, 'src/ui/index.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/ui.js'),
  format: 'iife',
  target: 'es2020',
  minify: !isWatch,
};

async function buildUI() {
  await build(uiConfig);
  const template = readFileSync(resolve(__dirname, 'src/ui/index.html'), 'utf-8');
  const js = readFileSync(resolve(__dirname, 'dist/ui.js'), 'utf-8');
  const css = readFileSync(resolve(__dirname, 'src/ui/styles.css'), 'utf-8');
  const html = template
    .replace('/* __INLINE_CSS__ */', css)
    .replace('/* __INLINE_JS__ */', js);
  writeFileSync(resolve(__dirname, 'dist/ui.html'), html);
}

async function run() {
  if (isWatch) {
    const mainCtx = await context(mainConfig);
    const uiCtx = await context({
      ...uiConfig,
      plugins: [{
        name: 'rebuild-html',
        setup(build) {
          build.onEnd(async () => {
            try {
              const template = readFileSync(resolve(__dirname, 'src/ui/index.html'), 'utf-8');
              const js = readFileSync(resolve(__dirname, 'dist/ui.js'), 'utf-8');
              const css = readFileSync(resolve(__dirname, 'src/ui/styles.css'), 'utf-8');
              const html = template
                .replace('/* __INLINE_CSS__ */', css)
                .replace('/* __INLINE_JS__ */', js);
              writeFileSync(resolve(__dirname, 'dist/ui.html'), html);
              console.log('[ui] rebuilt');
            } catch (e) {
              console.error('[ui] rebuild failed:', e.message);
            }
          });
        }
      }]
    });
    await mainCtx.watch();
    await uiCtx.watch();
    console.log('Watching for changes...');
  } else {
    await build(mainConfig);
    await buildUI();
    console.log('Build complete.');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
