import {RenderedCompilationUnit} from '../ast';

export interface Writer {
  write(rcu: RenderedCompilationUnit): Promise<void>;
}
