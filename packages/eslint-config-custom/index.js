module.exports = {
  extends: ['eslint:recommended', 'prettier', 'google', 'turbo',
    'plugin:jsdoc/recommended'],
  ignorePatterns: ['node_modules'],
  env: {
    browser: false,
    node: true,
    es2021: true,
    es6: true,
  },
  plugins: ['@typescript-eslint', 'jsdoc'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['**/test/**/*', '**/*.test.ts'],
      env: {
        jest: true,
      },
      rules: {
        'jsdoc/require-jsdoc': 0,
        'no-undef': 0,
      },
    },
  ],
  settings: {},
  rules: {
    // Disable default no-unused-vars, and use typescript validation
    'no-unused-vars': 0,
    '@typescript-eslint/no-unused-vars': [2,
      {'args': 'all', 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_'}],
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'jsdoc/require-jsdoc': 2,
    'jsdoc/require-param-type': 0,
    'jsdoc/require-returns': 0,
    'jsdoc/require-returns-type': 0,
    'no-trailing-spaces': 0,
    'max-len': [1, {'code': 140}],
    'comma-dangle': 0,
    '@typescript-eslint/comma-dangle': ['warn', {
      'arrays': 'always-multiline',
      'objects': 'always-multiline',
      'imports': 'always-multiline',
      'exports': 'always-multiline',
      'functions': 'always-multiline',
      'enums': 'always-multiline',
      'generics': 'never',
      'tuples': 'never',
    }],
    'indent': ['error', 2, {
      'FunctionDeclaration': {
        'parameters': 2,
      },
      'SwitchCase': 1,
    }],
    'operator-linebreak': [
      'error',
      'before', {'overrides': {'?': 'before', ':': 'before'}},
    ],
    'arrow-parens': ['error', 'as-needed'],
    'padded-blocks': ['error', {
      'switches': 'never',
    }],
    'lines-between-class-members': [
      'error', 'always',
      {'exceptAfterSingleLine': true},
    ],
    'padding-line-between-statements': [
      'error',
      {
        'blankLine': 'always',
        'prev': 'block-like',
        'next': 'const',
      },
      {
        'blankLine': 'always',
        'prev': 'block-like',
        'next': 'var',
      },
      {
        'blankLine': 'always',
        'prev': 'import',
        'next': 'export',
      },
    ],
  },
};
