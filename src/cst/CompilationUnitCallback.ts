
export interface CompilationUnit {
  name: string;
  fileName: string;
  content: string;
}

export interface CompilationUnitCallback {
  (cu: CompilationUnit): void
}
