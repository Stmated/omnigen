import {RenderedCompilationUnit} from '../ast/index.js';

export interface Writer {
  write(rcu: RenderedCompilationUnit): Promise<void>;
}
