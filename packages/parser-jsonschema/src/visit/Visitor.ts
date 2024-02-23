
export interface Visitor<T> {

  visit(value: T): T;
}
