import {ParserOptions} from './ParserOptions';
import {OmniModelParserResult} from './OmniModelParserResult';

export interface Parser<TOpt extends ParserOptions = ParserOptions> {
  parse(): Promise<OmniModelParserResult<TOpt>>;
}
