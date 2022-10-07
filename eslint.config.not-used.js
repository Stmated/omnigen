import configGoogle from "eslint-config-google";
import configPrettier from "eslint-config-prettier";
import configTurbo from "eslint-config-turbo";

import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  configGoogle,
  configPrettier,
  configTurbo,

  {
    files: ["**/*.js"],
    rules: {
      "semi": "error",
      "no-unused-vars": "error"
    }
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest", // Needed?
        sourceType: "module", // Needed?
      },
    },
    plugins: {
      typescript: typescriptPlugin
    },
    rules: {
      "semi": "error",
      "no-unused-vars": "error"
    }
  }
];

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
