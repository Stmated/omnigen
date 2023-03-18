import {RunOptions} from './RunOptions';


export type PipelinePredicate = { (options: RunOptions): boolean };
