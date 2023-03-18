import {TargetOptions} from '@omnigen/core';
import {RealOptions} from '@omnigen/core';
import {Renderer} from '@omnigen/core';

export type RendererCreator<TTargetOpt extends TargetOptions = TargetOptions> = { (options: RealOptions<TTargetOpt>): Renderer; }
