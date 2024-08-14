
export type ToDefined<T> = (Exclude<T, undefined>) | (T & {});

export type ToDefinedStrict<T> = (Exclude<T, undefined | null>) | (T & {});

