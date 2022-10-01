import {ITargetOptions} from '@interpret';

export type IncomingOption<T> = T;

export type RealOption<T> = T;

export type IncomingOrRealOption<TIncoming, TReal> = IncomingOption<TIncoming> | RealOption<TReal>;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type IncomingOptions<TOpt extends IOptions> = {
  [Key in keyof TOpt]?: TOpt[Key] extends IncomingOrRealOption<infer TInc, infer TReal> ? TInc | TReal : TOpt[Key];
};

export type RealOptions<TOpt extends IOptions> = {
  [Key in keyof TOpt]-?: TOpt[Key] extends IncomingOrRealOption<infer TInc, infer TReal> ? TReal : TOpt[Key];
};

export interface IOptionsSource<TOpt extends IOptions> {
  getIncomingOptions<TTargetOptions extends ITargetOptions>(): IncomingOptions<TOpt & TTargetOptions>;
}

export interface IOptions {

}

export type Booleanish = boolean | string | number;

export interface IOptionParser<T> {
  parse(raw: unknown): T;
}

export enum PrimitiveGenerificationChoice {
  ABORT,
  WRAP_OR_BOX,
  SPECIALIZE
}
