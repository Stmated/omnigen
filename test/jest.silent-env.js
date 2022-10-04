const pretty = require("pino-pretty");
// eslint-disable-next-line no-unused-vars -- used for jsdoc type hint
const LoggerFactory = require('../src/util/LoggerFactory');
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class TestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();

    /** @type {LoggerFactory.ModifierCallback} */
    const prettyModifier = (options) => {
      return pretty({...options, ...{sync: true, translateTime: true, singleLine: true}});
    };

    // TODO: Create a modifier that caches logs until the test fails

    this.global.pinoModifiers = [prettyModifier];
  }

  getVmContext() {
    return super.getVmContext();
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = TestEnvironment;