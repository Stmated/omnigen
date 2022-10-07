
// NOTE: Not used! To be used later when IntelliJ supports the flat eslint configs!
export default [
  {
    files: ["**/*.js"],
    rules: {
      "semi": "error",
      "no-unused-vars": "error"
    }
  },
  {
    files: ["**/*.ts"],
    rules: {
      "semi": "error",
      "no-unused-vars": "error",
      "require-jsdoc": false
    }
  }
];
