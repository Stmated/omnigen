
export type ToDefined<T> = (Exclude<T, undefined>) | (T & {});

export type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};
export type Something<T> = Exclude<T, void> & {};

export type ToDefinedStrict<T> = (Exclude<T, undefined | null>) | (T & {});

