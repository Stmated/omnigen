
export interface IRenderedCompilationUnit {
  name: string;
  fileName: string;
  content: string;
  directories: string[];
}

export interface ICompilationUnitRenderCallback {
  (rcu: IRenderedCompilationUnit): void
}
