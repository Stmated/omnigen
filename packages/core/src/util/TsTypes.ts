
// export type ToDefined<T> = (Exclude<T, undefined>) | (T & {});
// export type ToDefinedStrict<T> = (Exclude<T, undefined | null>) | (T & {});

export type {ToDefined} from '@omnigen/api';
export type {IsExactly} from '@omnigen/api';

// type a = ToDefined<any>

export type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};
export type Something<T> = Exclude<T, void> & {};
