import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class SiblingTypeCompressionAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    // TODO: Should move classes that are only used by one other class into the same `namespace` node -- similar to `InnerTypeCompressionAstTransformer` but simpler.
  }
}
