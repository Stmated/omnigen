

// module.exports = {
//   extends: ["eslint:recommended", "google", "turbo", "prettier"],
//   ignorePatterns: ['node_modules'],
//   env: {
//     browser: false,
//     node: true,
//     es2021: true,
//     es6: true,
//   },
//   plugins: ['@typescript-eslint'],
//   parser: "@typescript-eslint/parser",
//   parserOptions: {
//     ecmaVersion: "latest",
//     sourceType: "module",
//   },
//   overrides: [
//     {
//       files: ["**/test/**/*", "**/*.test.tsx?"],
//       env: {
//         jest: true,
//       },
//     },
//   ],
//   settings: {
//   },
//   rules: {
//     "@typescript-eslint/no-unused-vars": [0]
//   }
// };

// env:
//   browser: false
//   es2022: true
//
// parser: '@typescript-eslint/parser'
// parserOptions:
//   ecmaVersion: latest
//   sourceType: module
//
// plugins: ['@typescript-eslint']
//
// extends:
//   - google
//   - prettier
//
// rules:
//   require-jsdoc: off
//   valid-jsdoc: off
//   no-trailing-spaces: off
//   max-len:
//     - warn
//     - code: 140
//
// overrides:
//   - files: ['*.ts']
//     excludedFiles: ['*[Tt]est*']
//     extends: ["plugin:@typescript-eslint/recommended", "plugin:@typescript-eslint/recommended-requiring-type-checking"]
//     parserOptions:
//       project: ['./tsconfig.json']
//     rules:
//       '@typescript-eslint/explicit-function-return-type':
//         - error
//         - allowExpressions: true
