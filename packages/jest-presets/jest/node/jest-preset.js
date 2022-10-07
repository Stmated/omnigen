module.exports = {
  roots: ["<rootDir>"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePathIgnorePatterns: [
    "<rootDir>/test/__fixtures__",
    "<rootDir>/node_modules",
    "<rootDir>/dist",
  ],
  preset: "ts-jest",
};


// const {pathsToModuleNameMapper} = require('ts-jest');
//
// // In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// // which contains the path mapping (ie the `compilerOptions.paths` option):
// const {compilerOptions} = require('./tsconfig');
//
// module.exports = {
//   transform: {'^.+\\.ts?$': 'ts-jest'},
//   testEnvironment: '<rootDir>/jest.silent-env',
//   testRegex: '/test/.*\\.(test|spec)?\\.(ts|tsx)$',
//   moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
//   moduleNameMapper: pathsToModuleNameMapper(
//     compilerOptions.paths,
//     {prefix: '<rootDir>/'}
//   ),
// };
