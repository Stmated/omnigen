import {LoggerUtils} from './LoggerUtils';

// We register a logger fix as soon as we can.
// NOTE:  The order of loading is VERY important. It MUST be imported before any other module.
//        Otherwise the logger fix will not be registered when the logger is created.
LoggerUtils.registerLoggerFix();

export * from './TestUtils';
export * from './ParsedJavaTestVisitor';
