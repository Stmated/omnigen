import {JavaCstVisitor, JavaCstRootNode, JavaOptions} from '@java';
import {GenericModel} from '@parse';
import {AbstractTransformer} from '@transform';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {IJavaCstVisitor} from '@java/visit/IJavaCstVisitor';

export abstract class AbstractJavaTransformer implements AbstractTransformer<IJavaCstVisitor<void>, JavaCstRootNode, JavaOptions> {
  abstract transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): Promise<void>;
}
