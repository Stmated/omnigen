import {TargetOptions} from '../interpret';
import {ParserOptions} from '../parse';

export type IncomingOrRealOption<TIncoming, TReal> = TIncoming | TReal;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type IncomingOptions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends IncomingOrRealOption<infer TInc, infer TReal> ? TInc | TReal : TOpt[Key];
};

export type RealOptions<TOpt extends Options> = {
  [Key in keyof TOpt]-?: TOpt[Key] extends IncomingOrRealOption<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infer TInc,
    infer TReal
  > ? TReal : TOpt[Key];
};

export interface OptionsSource<TOpt extends ParserOptions> {
  getIncomingOptions<TTargetOptions extends TargetOptions>(): IncomingOptions<TOpt & TTargetOptions> | undefined;
}

export interface Options {

}

export type Booleanish = boolean | string | number;

export interface OptionParser<T> {
  parse(raw: unknown): T;
}

export enum PrimitiveGenerificationChoice {
  ABORT,
  WRAP_OR_BOX,
  SPECIALIZE,
}
