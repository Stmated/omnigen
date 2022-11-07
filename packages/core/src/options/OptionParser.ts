export interface OptionParser<T> {
  parse(raw: unknown): T;
}
