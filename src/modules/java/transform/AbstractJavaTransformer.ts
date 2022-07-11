import {JavaCstRootNode, JavaOptions, JavaVisitor} from '@java';
import {OmniModel} from '@parse';
import {AbstractTransformer} from '@transform';
import {IJavaCstVisitor} from '@java/visit/IJavaCstVisitor';

export abstract class AbstractJavaTransformer implements AbstractTransformer<JavaCstRootNode, JavaOptions> {

  protected readonly _javaVisitor = new JavaVisitor<void>();

  abstract transform(model: OmniModel, root: JavaCstRootNode, options: JavaOptions): Promise<void>;
}
