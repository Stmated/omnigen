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
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/naming-convention': ['error',
          {
            'selector': 'interface',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'format': ['PascalCase'],
            'custom': {
              'regex': '^I[A-Z]',
              'match': false,
            },
          },
          {
            'selector': 'typeLike',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'format': ['PascalCase'],
          },
          {
            'selector': 'typeParameter',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            // T = Type
            // R = Return
            // N = Node
            // V = Value / Visitor
            // C = Concrete Syntax Tree Node
            // P = Parent
            // I = Input
            // K = Key
            'prefix': ['T', 'R', 'N', 'V', 'C', 'P', 'I', 'K'],
            'format': ['PascalCase'],
          },
          {
            'selector': 'variableLike',
            'leadingUnderscore': 'allow',
            'trailingUnderscore': 'forbid',
            'format': ['camelCase'],
          },
          {
            'selector': 'variable',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'modifiers': ['exported', 'const'],
            'format': ['UPPER_CASE'],
          },
          {
            'selector': 'variable',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'modifiers': ['global', 'const'],
            'format': ['UPPER_CASE'],
            'filter': {
              'regex': 'logger',
              'match': false,
            },
          },
          {
            'selector': 'property',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'format': ['camelCase'],
          },
          {
            'selector': 'property',
            'leadingUnderscore': 'require',
            'trailingUnderscore': 'forbid',
            'modifiers': ['private'],
            'format': ['camelCase'],
          },
          {
            'selector': 'property',
            'leadingUnderscore': 'allow',
            'trailingUnderscore': 'forbid',
            'modifiers': ['static', 'readonly'],
            'format': ['UPPER_CASE'],
          },
          {
            'selector': 'property',
            'leadingUnderscore': 'require',
            'trailingUnderscore': 'forbid',
            'modifiers': ['private', 'static', 'readonly'],
            'format': ['UPPER_CASE'],
          },
          {
            'selector': 'enumMember',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'format': ['UPPER_CASE'],
          },
          {
            'selector': 'method',
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'format': ['camelCase'],
          },
        ],
        'no-dupe-class-members': 0,
      },
    },
    {
      files: ['**/*.ts', '**/*.js'],
      rules: {
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
      },
    },
    {
      files: ['**/test/**/*', '**/*.test.ts'],
      env: {
        jest: true,
      },
      rules: {
        'jsdoc/require-jsdoc': 0,
        'no-undef': 0,
        '@typescript-eslint/naming-convention': 0,
      },
    },
  ],
  settings: {},
  rules: {
    // Disable default no-unused-vars, and use typescript validation
    'no-unused-vars': 0,
    '@typescript-eslint/no-unused-vars': [1,
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
