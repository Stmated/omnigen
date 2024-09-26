import {defineConfig} from 'vitest/config';

const isGithub = process.env.GITHUB_ACTIONS === 'true';
const isCI = process.env.CI === 'true' || isGithub;
const isReport = process.env.REPORT === 'true';

export default defineConfig({
  test: {
    isolate: false,
    poolOptions: {
      threads: {
        useAtomics: true,
        isolate: false,
      },
      forks: {
        isolate: false,
      }
    },
    pool: 'threads',
    fileParallelism: true,
    watch: false,
    silent: isCI,
    passWithNoTests: true,
    outputFile: {
      html: '.test/html/index.html',
    },
    reporters: isGithub ? ['dot', 'github-actions']
      :isReport ? ['default', 'html']
        :['basic' /* 'hanging-process' */],

    coverage: {
      all: true,
      clean: true,
      enabled: isReport || isCI,
      provider: 'v8',
      include: ['**/*.ts'],
      reporter: isReport ? [['lcov', {}]]
        :['lcovonly'],
      reportsDirectory: '.test/coverage',
    },
    // benchmark: {
    //   reporters: isCI ? ['verbose', 'json'] : 'default',
    //   outputFile: 'benchmark-results.json',
    // },
    testTimeout: 500,
  },
});
