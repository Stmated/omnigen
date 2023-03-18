import {DeserializedInput, Parser, ParserOptions} from '@omnigen/core';

export type ParserCreator<T = any, TParserOpt extends ParserOptions = ParserOptions> =
  { (deserializedInput: DeserializedInput<T>, opt: TParserOpt): Parser<TParserOpt> };
