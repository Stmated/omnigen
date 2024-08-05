
export interface SchemaSource {
  getAbsolutePath(): string | undefined;

  asObject<R>(): Promise<R>;

  asString(): Promise<string>;
}
