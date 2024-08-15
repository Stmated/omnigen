export * from './Environment';

export type Arrayable<T> = T | Array<T>;
export type ReadonlyArrayable<T> = T | ReadonlyArray<T>;

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
