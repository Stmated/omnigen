import {resolve} from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    //outDir: 'dist/lib',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@omnigen-org/json-expander',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled into your library
      external: ['node:url', 'json-pointer', 'change-case', 'debug'],
      output: {
        // Provide global variables to use in the UMD build for externalized deps
        // globals: {
        //   vue: 'Vue',
        // },
      },
    },
  },
});
