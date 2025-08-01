import {resolve} from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/lib',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@omnigen/omnigen',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled into the library
      external: ['node-fetch', 'promisify', 'node:fs', 'node:url', 'find-up', 'fs/promises', 'fs'],
      output: {},
      treeshake: 'smallest',
    },
  },
});
