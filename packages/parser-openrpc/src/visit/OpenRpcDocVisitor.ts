// type Path<T> = T extends Array<infer Item>
//   ? `0.${Path<Item>}`
//   : T extends object
//     ? { [K in Extract<keyof T, string>]: `${K}` | (`${K}.` extends `${infer _}.${infer Rest}` ? `${K}.${Path<T[K]>}` : never); }[Extract<keyof T, string>]
//     : never;
//
// interface Type {
//   foo: {
//     bar: string
//   },
//   baz: string,
//   array: [{ pop: number }]
// }
//
// const keys: Path<Type> = '';

