import {defineConfig} from 'vite';
import * as path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src'),
      name: 'omnigen',
      formats: ['es'],
      fileName: 'index',
    },
  },
});

// module.exports = defineConfig({
//   build: {
//     lib: {
//       entry: path.resolve(__dirname, 'src'),
//       name: 'omnigen',
//       formats: ['es'],
//       fileName: 'index',
//     },
//   },
// });
