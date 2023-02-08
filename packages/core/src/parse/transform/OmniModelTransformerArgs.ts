import {OmniModel} from '../OmniModel.js';
import {RealOptions} from '../../options';
import {ParserOptions} from '../ParserOptions.js';
import {ModelTransformOptions} from '../ModelTransformOptions.js';

export interface OmniModelTransformerArgs<TParserOpt extends ParserOptions> {

  model: OmniModel;
  options: RealOptions<TParserOpt> & RealOptions<ModelTransformOptions>;
}
