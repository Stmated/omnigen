export interface RenderResult {

  getFileNames(): string[];

  getFileContent(fileName: string): string;
}
