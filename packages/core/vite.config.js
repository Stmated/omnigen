import {resolve} from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/lib',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@omnigen/core',
      // the proper extensions will be added
      // fileName: 'core',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled into your library
      external: ['node-fetch', 'promisify', 'node:fs', 'node:url', 'find-up', 'fs/promises', 'fs'],
      output: {
        // Provide global variables to use in the UMD build for externalized deps
        // globals: {
        //   vue: 'Vue',
        // },
      },
      treeshake: 'safest',
    },
  },
  optimizeDeps: {
    exclude: ['sync-fetch'],
  },
});
