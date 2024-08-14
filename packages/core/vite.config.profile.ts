import {resolve} from 'path';
import {type UserConfig} from 'vite';

export default {
  build: {
    outDir: 'dist/profile',
    minify: false,
    terserOptions: {
      compress: false,
      mangle: false,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.profiling.ts'),
      name: '@omnigen/core',
      // the proper extensions will be added
      // fileName: 'core',
    },
    rollupOptions: {
      external: ['node-fetch', 'promisify', 'node:fs', 'node:url', 'find-up'],
      output: {
        // Provide global variables to use in the UMD build for externalized deps
        // globals: {
        //   vue: 'Vue',
        // },
      },
    },
  },
} satisfies UserConfig;
