Environment variables:
* `DEBUG` -- enable debug log for certain loggers -- set to `*` to enable all debug logging. Set to `*:info` or `*:warn` to enable certain levels of logs. Read more from the `debug` package about env filters.
* `DEBUG_IDENTIFIER` -- enable extra debugging for a certain identifier, be it an object name or a field, et cetera, and more information will be output if it is encountered.
  * Useful if you need help understanding why a certain component appears or does not appear in the final output.
