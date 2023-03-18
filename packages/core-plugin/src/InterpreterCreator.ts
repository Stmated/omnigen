import {Interpreter, TargetOptions} from '@omnigen/core';

export type InterpreterCreator = { (opt: TargetOptions): Interpreter<TargetOptions> };
