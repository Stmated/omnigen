import {defineConfig, ViteUserConfig} from 'vitest/config';

import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isGithub = process.env.GITHUB_ACTIONS === 'true';
const isCI = process.env.CI === 'true' || isGithub;
const isReport = process.env.REPORT === 'true';

type ToDefined<T> = T extends any ? ((Exclude<T, undefined>) | (T & {})) : never;

let reporters: ToDefined<ViteUserConfig['test']>['reporters'];
if (isGithub) {
  reporters = ['dot', 'github-actions'];
} else if (isReport) {
  reporters = ['default', 'html'];
} else {
  reporters = [
    ['default', {'summary': false}],
  ];
}

export default defineConfig({
  test: {
    root: __dirname,
    projects: [
      'packages/*',
      'apps/*',
    ],
    isolate: false,
    pool: 'threads',
    fileParallelism: false,
    watch: false,
    silent: isCI,
    passWithNoTests: true,
    outputFile: {
      html: '.test/html/index.html',
    },
    reporters: reporters,
    coverage: {
      all: true,
      clean: true,
      enabled: isReport || isCI,
      provider: 'v8',
      include: ['**/*.ts'],
      reporter: isReport ? [['lcov', {}]]
        : ['lcovonly'],
      reportsDirectory: '.test/coverage',
    },
    // benchmark: {
    //   reporters: isCI ? ['verbose', 'json'] : 'default',
    //   outputFile: 'benchmark-results.json',
    // },
    testTimeout: 2_000,
  },
});
