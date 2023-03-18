import {RealOptions, TargetOptions, Writer} from '@omnigen/core';

export type WriterCreator<TTargetOpt extends TargetOptions = TargetOptions> = { (opt: RealOptions<TTargetOpt>): Writer };
