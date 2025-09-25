import {resolve} from 'path';
import {defineConfig} from 'vite';
import {builtinModules} from 'module';
import replace from '@rollup/plugin-replace';
import {copyFileSync, mkdirSync} from 'fs';

export default defineConfig({
  build: {
    target: 'node22',
    outDir: 'dist',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@omnigen-org/omnigen-cli',
      formats: ['es'],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled into your library
      external: [
        ...builtinModules,
        ...builtinModules.map(it => `node:${it}`),
      ],

      output: {
        banner: `import * as __import_path from 'path';\nimport * as __import_url from 'url';\n`,
      },

      plugins: [
        {
          name: 'copy-worker',
          generateBundle() {
            const distDir = resolve(__dirname, 'dist');
            mkdirSync(distDir, {recursive: true});
            copyFileSync(
              resolve(__dirname, 'node_modules/sync-fetch/worker.js'),
              resolve(distDir, 'worker.js'),
            );
          },
        },
      ],
      treeshake: 'safest',
    },
    commonjsOptions: {},
    minify: false,
  },
  ssr: {
    noExternal: ['isomorphic-fetch'],
  },
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main', 'browser'], // Browser last, if all else fails
  },
  plugins: [
    replace({
      preventAssignment: true, // Important for security and behavior
      values: {
        __dirname: '__import_path.dirname(__import_url.fileURLToPath(import.meta.url))',
        __filename: '__import_url.fileURLToPath(import.meta.url)',
      },
      delimiters: ['', ''], // This ensures it doesn't break on tokens like `someVar__dirname`
    }),
  ],
  optimizeDeps: {
    noDiscovery: true,
    include: [],
    exclude: ['sync-fetch'],
  },
});
