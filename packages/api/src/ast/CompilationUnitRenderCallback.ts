import {RenderedCompilationUnit} from './RenderedCompilationUnit.js';

export interface CompilationUnitRenderCallback {
  (rcu: RenderedCompilationUnit): void
}
