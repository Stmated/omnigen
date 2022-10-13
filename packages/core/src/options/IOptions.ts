import {ITargetOptions} from '../interpret';
import {IParserOptions} from '../parse';

export type IncomingOrRealOption<TIncoming, TReal> = TIncoming | TReal;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type IncomingOptions<TOpt extends IOptions> = {
  [Key in keyof TOpt]?: TOpt[Key] extends IncomingOrRealOption<infer TInc, infer TReal> ? TInc | TReal : TOpt[Key];
};

export type RealOptions<TOpt extends IOptions> = {
  [Key in keyof TOpt]-?: TOpt[Key] extends IncomingOrRealOption<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer TInc,
    infer TReal
  > ? TReal : TOpt[Key];
};

export interface IOptionsSource<TOpt extends IParserOptions> {
  getIncomingOptions<TTargetOptions extends ITargetOptions>(): IncomingOptions<TOpt & TTargetOptions> | undefined;
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
  SPECIALIZE,
}
