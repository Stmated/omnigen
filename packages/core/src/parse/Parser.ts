import {ParserOptions} from './ParserOptions';
import {OmniModelParserResult} from './OmniModelParserResult';

export interface Parser<TOpt extends ParserOptions> {
  parse(): OmniModelParserResult<TOpt>;
}
