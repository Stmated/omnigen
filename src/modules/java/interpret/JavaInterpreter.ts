import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {ICstNode} from '@cst';
import {GenericModel} from '@parse';
import {JavaCstVisitor, JavaCstRootNode} from '@java';
import {CstRootNode} from '@cst/CstRootNode';

export class JavaInterpreter<TNode extends ICstNode<JavaCstVisitor>> extends AbstractInterpreter<JavaCstVisitor, TNode> {
  interpret(model: GenericModel): CstRootNode<JavaCstVisitor> {
    const rootNode = new JavaCstRootNode();

    return rootNode;
  }
}
