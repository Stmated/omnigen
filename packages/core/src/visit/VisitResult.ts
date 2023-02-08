export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;
