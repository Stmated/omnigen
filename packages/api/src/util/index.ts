export * from './Environment';

export type Arrayable<T> = T | Array<T>;
export type ReadonlyArrayable<T> = T | ReadonlyArray<T>;

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DistributeWriteable<T> = T extends any ? Writeable<T> : never;
export type DistributeReadOnly<T> = T extends any ? Readonly<T> : never;

export type ObjectToUnion<T> = { [K in keyof T]: { [P in K]: T[K] } }[keyof T];
export type ConditionalPartial<T, Full> = T extends ObjectToUnion<Full> ? Full : T;
export type ConditionalReturn<T, Condition, True, False> = T extends Condition ? True : False;
