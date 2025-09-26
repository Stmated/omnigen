export interface SchemaSource {
  getAbsolutePath(): string | undefined;

  asObject<R>(): R;

  asString(): string;

  prepare(): Promise<void>;
}
