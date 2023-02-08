
export type IncomingResolver<TInc, TReal> = (incoming: TInc | TReal) => Promise<TReal>;
