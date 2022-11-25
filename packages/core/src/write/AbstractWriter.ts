import {Writer} from './Writer.js';
import {RenderedCompilationUnit} from '../ast/index.js';

export abstract class AbstractWriter implements Writer {

  abstract write(rcu: RenderedCompilationUnit): Promise<void>;
}
