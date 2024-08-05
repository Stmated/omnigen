
export type ToDefined<T> = (Exclude<T, undefined | null>) | (T & {});
