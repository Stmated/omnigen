module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'google',
    'turbo',
  ],
  ignorePatterns: ['node_modules', 'build/*', 'dist/*'],
  env: {
    browser: false,
    node: true,
    es2021: true,
    es6: true,
  },
  plugins: ['@typescript-eslint', 'eslint-plugin-tsdoc'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'no-dupe-class-members': 0,
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-redeclare': 'off',

        // This should be removed in favor of @stylistic/eslint-plugin-js indent
        '@typescript-eslint/indent': 'off',
      },
    },
    {
      files: ['**/*', '**/*.js'],
      rules: {
        '@typescript-eslint/comma-dangle': ['warn', {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
          enums: 'always-multiline',
          generics: 'never',
          tuples: 'never',
        }],
      },
    },
    {
      files: ['**/test/**/*', '**/*.test.*'],
      env: {
        jest: false,
      },
      rules: {
        'tsdoc/syntax': 0,
        // 'jsdoc/require-jsdoc': 0,
        'no-undef': 0,
        '@typescript-eslint/naming-convention': 0,
      },
    },
  ],
  settings: {},
  rules: {
    // Disable default no-unused-vars, and use typescript validation
    'no-unused-vars': 0,
    'no-redeclare': 0,
    'new-cap': 0,
    camelcase: 0,
    'quote-props': ['error', 'as-needed'],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unused-vars': [1,
      {args: 'all', varsIgnorePattern: '^_', argsIgnorePattern: '^_'}],

    'tsdoc/syntax': 'warn',

    'require-jsdoc': 0,
    'valid-jsdoc': 0,

    '@typescript-eslint/explicit-function-return-type': 'off',

    'no-trailing-spaces': 0,
    'max-len': [1, {code: 200}],
    'comma-dangle': 0,
    indent: 'off',
    'operator-linebreak': [
      'error',
      'before', {overrides: {'?': 'before', ':': 'before'}},
    ],
    'arrow-parens': ['error', 'as-needed'],
    'padded-blocks': ['error', {
      switches: 'never',
    }],
    'lines-between-class-members': [
      'error', 'always',
      {exceptAfterSingleLine: true},
    ],
    'space-infix-ops': ['error', {int32Hint: false}],
    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: 'block-like',
        next: 'const',
      },
      {
        blankLine: 'always',
        prev: 'block-like',
        next: 'var',
      },
      {
        blankLine: 'always',
        prev: 'import',
        next: 'export',
      },
    ],
  },
};
