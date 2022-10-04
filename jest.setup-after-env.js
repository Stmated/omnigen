const util = require('util')

global.consoleMessages = []

// get information about the current test
jasmine.getEnv().addReporter({
  specStarted: result => jasmine.currentTest = result,
  specDone: result => jasmine.currentTest = result,
})

function squirrelAway(text, logger) {
  // use error to get stack trace
  try {
    throw new Error('stacktrace');
  } catch (err) {
    const trace = err.stack.split('\n');
    trace.shift()   // removes Error: stacktrace
    trace.shift()   // removes squirrelAway() call from the "throw" command
    trace.shift()   // removes console logger call in the console override
    consoleMessages.push({logger: logger, payload: text, stacktrace: trace.join('\n')});
  }
}

const orig = console
global.console = {...console,
  // use jest.fn() to silence, comment out to leave as it is
  log: (text => squirrelAway(text, orig.log)),
  error: (text => squirrelAway(text, orig.error)),
  warn: (text => squirrelAway(text, orig.warn)),
  info: (text => squirrelAway(text, orig.info)),
  debug: (text => squirrelAway(text, orig.debug))
}

global.afterEach(() => {
  // this includes tests that got aborted, ran into errors etc.
  const failed = (jasmine && jasmine.currentTest
    && Array.isArray(jasmine.currentTest.failedExpectations)) ?
    jasmine.currentTest.failedExpectations.length>0 : true
  // orig.log(`test "${jasmine.currentTest.fullName}" finished. failed? ${failed}`)
  if (failed) {
    // orig.log(`Logging for "${jasmine.currentTest.fullName}" start`)
    consoleMessages.forEach(msg => {
      if (typeof msg.payload === 'object' || typeof msg.payload === 'function') {
        msg.payload = util.inspect(msg.payload, false, null, true)
      }
      msg.logger.call(msg.logger, msg.payload + '\n' + msg.stacktrace)
    })
    // orig.log(`Logging for "${jasmine.currentTest.fullName}" end`)
  }
  consoleMessages = []
})
