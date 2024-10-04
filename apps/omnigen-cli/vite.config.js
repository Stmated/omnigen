import {resolve} from 'path';
import {defineConfig} from 'vite';
import {builtinModules} from 'module';
import replace from '@rollup/plugin-replace';

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

      plugins: [],
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
  },
});
