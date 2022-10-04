
export interface RenderedCompilationUnit {
  name: string;
  fileName: string;
  content: string;
  directories: string[];
}

export interface CompilationUnitRenderCallback {
  (rcu: RenderedCompilationUnit): void
}
