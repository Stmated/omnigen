import {Interpreter} from '../interpret/index.js';
import {OmniModelTransformer, Parser} from '../parse/index.js';
import {AstTransformer} from '../transform/index.js';
import {Renderer} from '../render/index.js';
import {Writer} from '../write/index.js';
import {SerializedInput} from '../input/index.js';

/**
 * A work pipeline that will result in an input and an output.
 * <br />
 * The different steps are not generic and are assumed to have been created in a typesafe manner by the PipelineBuilder.
 */
export interface Pipeline {
  input: SerializedInput[];
  parser: Parser;
  parserTransformers: OmniModelTransformer[];
  interpreter: Interpreter;
  astTransformers: AstTransformer[];
  renderers: Renderer[];
  writers: Writer[];
}
