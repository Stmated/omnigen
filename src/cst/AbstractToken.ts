import {ICstVisitor} from '../visit/ICstVisitor';

export default abstract class AbstractToken<TVisitor extends ICstVisitor> {
  abstract visit(visitor: TVisitor): void;
}
