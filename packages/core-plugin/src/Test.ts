import {z, ZodType} from 'zod';

type TransformerFn<In, Out> = (args: In) => Out;

interface Transformer<In = unknown, ZOut extends ZodType = ZodType> {
  out: ZOut;
  transform: TransformerFn<In, z.output<ZOut>>;
}

const Z1 = z.object({
  foo: z.string(),
});

const Z2 = z.object({
  bar: z.string(),
});

const Z3 = z.object({
  bar: z.boolean(),
  baz: z.string(),
});

type ValueType<T extends Transformer> = z.output<T['out']>;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type FinalStateType<A extends Array<Transformer>> = UnionToIntersection<ValueType<A[number]>>;

const createTransformer = <
  After extends Array<Transformer<any, any>>,
  ZOut extends ZodType
>(
  after: After,
  zout: ZOut,
  fn: TransformerFn<FinalStateType<After>, z.output<ZOut>>,
): Transformer<Parameters<typeof fn>[0], ZOut> => {

  return {
    out: zout,
    transform: fn,
  };
};

const Transformer1 = createTransformer([], Z1, _ => ({foo: `1`}));
const Transformer2 = createTransformer([Transformer1], Z2, args => ({bar: `2, ${args.foo}`}));
const Transformer3 = createTransformer([Transformer1, Transformer2], Z3, args => ({...args, bar: true, baz: `3, ${args.foo} ${args.bar}`}));

console.log(Transformer3);
