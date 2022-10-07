
module.exports = {
  extends: ["eslint:recommended", "google", "turbo", "prettier", "plugin:jsdoc/recommended"],
  ignorePatterns: ['node_modules'],
  env: {
    browser: false,
    node: true,
    es2021: true,
    es6: true,
  },
  plugins: ["@typescript-eslint", "jsdoc"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  overrides: [
    {
      files: ["**/test/**/*", "**/*.test.ts"],
      env: {
        jest: true
      },
      rules: {
        "jsdoc/require-jsdoc": 0,
        "no-undef": 0
      }
    }
  ],
  settings: {
  },
  rules: {
    "no-unused-vars": 0,
    "@typescript-eslint/no-unused-vars": [2, {"args": "all", "varsIgnorePattern": "^_", "argsIgnorePattern": "^_"}],
    "require-jsdoc": 0,
    "valid-jsdoc": 0,
    "jsdoc/require-jsdoc": 2,
    "jsdoc/require-param-type": 0,
    "jsdoc/require-returns": 0,
    "jsdoc/require-returns-type": 0,
    "no-trailing-spaces": 0,
    "max-len": [1, {"code": 140}]
  }
};
