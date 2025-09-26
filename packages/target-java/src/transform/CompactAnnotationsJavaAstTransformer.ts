import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import * as Java from '../ast/JavaAst';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Make annotations compact where applicable.
 */
export class CompactAnnotationsJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (!args.options.compactAnnotations) {
      return;
    }

    let insideField = 0;

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceField: (n, r) => {
        try {
          insideField++;
          return defaultReducer.reduceField(n, r);
        } finally {
          insideField--;
        }
      },
      reduceAnnotationList: (n, r) => {

        if (insideField && n.multiline && n.children) {
          logger.info(`Inside field, and was multiline, making not multiline`);
          const newList = new Java.AnnotationList(n.children).withIdFrom(n);
          newList.multiline = false;
          return newList;
        }

        return defaultReducer.reduceAnnotationList(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
