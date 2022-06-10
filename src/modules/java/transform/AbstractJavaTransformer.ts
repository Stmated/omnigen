import {JavaCstVisitor, JavaCstRootNode, JavaOptions} from '@java';
import {GenericModel} from '@parse';
import {AbstractTransformer} from '@transform';

export abstract class AbstractJavaTransformer implements AbstractTransformer<JavaCstVisitor<void>, JavaCstRootNode, JavaOptions> {
  abstract transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): Promise<void>;
}
