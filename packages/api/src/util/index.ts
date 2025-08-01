export * from './Environment';

export type ToDefined<T> = T extends any ? ((Exclude<T, undefined>) | (T & {})) : never;
export type ToDefinedStrict<T> = T extends any ? ((Exclude<T, undefined | null>) | (T & {})) : never;

export type IsExactly<T, Condition, True, False> = [T] extends [Condition] ? True : False;

export type FirstDefined<A, B> =
  IsExactly<A, undefined, B,
    IsExactly<A, null, B,
      IsExactly<A, unknown, B, A>
    >
  >;

export type Arrayable<T> = T | Array<T>;
export type ReadonlyArrayable<T> = T | ReadonlyArray<T>;

export type IsFunction<T, True, False> = T extends (...args: any[]) => any ? True : False;
export type NonFunction<T> = IsFunction<T, never, T>;

export type ToArrayItem<T> = T extends (infer U)[] ? U : never;

export type NonFunctionProperties<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
};

export type Writeable<T> = T extends StrictReadonly<infer V> ? V : {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U> ? Array<U> : T[P]
};

export type MaybeReadonly<T> = T | StrictReadonly<T>;

/**
 * TODO: Remove most usage of this utility type after the base types are made inherently readonly, so that this type would give no effect.
 */
export type StrictReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (infer U)[] ? ReadonlyArray<U> : T[K];
};

export type DistributeWriteable<T> = T extends any ? Writeable<T> : never;
export type DistributeReadOnly<T> = T extends any ? Readonly<T> : never;
export type DistributeStrictReadOnly<T> = T extends any ? StrictReadonly<T> : never;

export type ObjectToUnion<T> = { [K in keyof T]: { [P in K]: T[K] } }[keyof T];
export type ConditionalPartial<T, Full> = T extends ObjectToUnion<Full> ? Full : T;
export type ConditionalReturn<T, Condition, True, False> = T extends Condition ? True : False;

export type IfArray<T, True, False> = T extends any[] ? True : False;

export type ArrayKeys<T> = T extends any ? { [K in keyof T]-?: ToDefined<T[K]> extends Array<any> ? K : never }[keyof T] : never;
