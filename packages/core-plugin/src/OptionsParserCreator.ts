import {DeserializedInput, OptionsParser, ParserOptions} from '@omnigen/core';

export type OptionsParserCreator<T = any> = { (input: DeserializedInput<T>): OptionsParser<ParserOptions> };
