import AbstractNode from '@cst/AbstractNode';
import AbstractToken from '@cst/AbstractToken';
import {JavaCstVisitor} from '@java';
import {JavaUtil} from '../interpret/JavaUtil';

export enum TokenType {
  ASSIGN,
  ADD,
  COMMA,
  EQUALS,
  MULTIPLY,
  SUBTRACT
}

export class JavaToken extends AbstractToken<JavaCstVisitor> {
  type: TokenType;

  constructor(type: TokenType) {
    super();
    this.type = type;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitToken(this);
  }
}

abstract class AbstractJavaNode extends AbstractNode<JavaCstVisitor> {
  /*
  visit<R, TVisitor extends AbstractCstVisitor<R>>(visitor: TVisitor): void {
    return undefined;
  }
  */
}

// export default abstract class AbstractNode {
//   abstract visit<R, TVisitor extends AbstractCstVisitor<R>>(visitor: TVisitor): R;
// }

export class Type extends AbstractJavaNode {
  fqn: string;
  array: boolean;

  constructor(fqn: string, array = false) {
    super();
    this.fqn = fqn;
    this.array = array;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitType(this);
  }
}

export interface IWithChildren<T extends AbstractJavaNode> {
  children: T;
}

export class Identifier extends AbstractJavaNode {
  value: string;

  constructor(name: string) {
    super();
    this.value = name;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitIdentifier(this);
  }
}

export abstract class AbstractExpression extends AbstractJavaNode {
}

// Split this into different types of constant depending on the type?
export class Literal extends AbstractJavaNode {
  value: unknown;

  constructor(value: unknown) {
    super();
    this.value = value;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitLiteral(this);
  }
}

// eslint-disable-next-line no-use-before-define
type AnnotationValue = Literal | Annotation;

export class AnnotationKeyValuePair extends AbstractJavaNode {
  key: Identifier | undefined;
  value: AnnotationValue;

  constructor(key: Identifier | undefined, value: AnnotationValue) {
    super();
    this.key = key;
    this.value = value;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitAnnotationKeyValuePair(this);
  }
}

export class AnnotationKeyValuePairList extends AbstractJavaNode {
  children: AnnotationKeyValuePair[];

  constructor(...children: AnnotationKeyValuePair[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitAnnotationKeyValuePairList(this);
  }
}

export class Annotation extends AbstractJavaNode {
  type: Type;
  pairs?: AnnotationKeyValuePairList;

  constructor(type: Type, pairs?: AnnotationKeyValuePairList) {
    super();
    this.type = type;
    this.pairs = pairs;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitAnnotation(this);
  }
}

export class AnnotationList extends AbstractJavaNode {
  children: Annotation[];

  constructor(...children: Annotation[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitAnnotationList(this);
  }
}

export class ArgumentDeclaration extends AbstractJavaNode {
  type: Type;
  identifier: Identifier;
  annotations?: AnnotationList;

  constructor(type: Type, identifier: Identifier, annotations?: AnnotationList) {
    super();
    this.type = type;
    this.identifier = identifier;
    this.annotations = annotations;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitArgumentDeclaration(this);
  }
}

export class ArgumentDeclarationList extends AbstractJavaNode {
  children: ArgumentDeclaration[];

  constructor(...children: ArgumentDeclaration[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitArgumentDeclarationList(this);
  }
}

export class BinaryExpression extends AbstractJavaNode {
  left: AbstractExpression;
  token: JavaToken;
  right: AbstractExpression;

  constructor(left: AbstractExpression, token: JavaToken, right: AbstractExpression) {
    super();
    this.left = left;
    this.token = token;
    this.right = right;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitBinaryExpression(this);
  }
}

export class AssignExpression extends BinaryExpression {
  constructor(left: AbstractExpression, right: AbstractExpression) {
    super(left, new JavaToken(TokenType.ASSIGN), right);
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitAssignExpression(this);
  }
}

export class Package extends AbstractJavaNode {
  fqn: string;

  constructor(fqn: string) {
    super();
    this.fqn = fqn;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitPackage(this);
  }
}

export class Predicate extends AbstractJavaNode {
  visit(visitor: JavaCstVisitor): void {
    visitor.visitPredicate(this);
  }
}

export class ArgumentList extends AbstractJavaNode {
  children: AbstractExpression[];

  constructor(...children: AbstractExpression[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitArgumentList(this);
  }
}

export class Block extends AbstractJavaNode {
  children: AbstractJavaNode[];

  constructor(...children: AbstractJavaNode[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitBlock(this);
  }
}

// Is it needed to separate these? We don't need to care to be logically consistent.
export enum ModifierType {
  PRIVATE,
  PUBLIC,
  DEFAULT,
  PROTECTED,

  STATIC
}

export class Modifier extends AbstractJavaNode {
  type: ModifierType;

  constructor(type: ModifierType) {
    super();
    this.type = type;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitModifier(this);
  }
}

export class ModifierList extends AbstractJavaNode {
  modifiers: Modifier[];

  constructor(modifiers: Modifier[]) {
    super();
    this.modifiers = modifiers;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitModifierList(this);
  }
}

export class Comment extends AbstractJavaNode {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitComment(this);
  }
}

export class CommentList extends AbstractJavaNode {
  children: Comment[];

  constructor(...children: Comment[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitCommentList(this);
  }
}

export class Field extends AbstractJavaNode {
  comments?: CommentList;
  modifiers: ModifierList;
  type: Type;
  identifier: Identifier;
  initializer?: AbstractExpression;
  annotations?: AnnotationList;

  constructor(type: Type, name: Identifier, modifiers?: ModifierList, initializer?: AbstractExpression, annotations?: AnnotationList) {
    super();
    this.modifiers = modifiers || new ModifierList([new Modifier(ModifierType.PRIVATE)]);
    this.type = type;
    this.identifier = name;
    this.initializer = initializer;
    this.annotations = annotations;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitField(this);
  }
}

export abstract class AbstractMethodDeclaration extends AbstractJavaNode {
  abstract get comments(): CommentList | undefined;

  abstract get annotations(): AnnotationList | undefined;

  abstract get modifiers(): ModifierList;

  abstract get type(): Type;

  abstract get name(): Identifier;

  abstract get parameters(): ArgumentDeclarationList | undefined;

  body?: Block;
}

export class ReturnStatement extends AbstractJavaNode {
  expression: AbstractExpression;

  constructor(expression: AbstractExpression) {
    super();
    this.expression = expression;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitReturnStatement(this);
  }
}

export class FieldReference extends AbstractExpression {
  field: Field;

  constructor(field: Field) {
    super();
    this.field = field;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitFieldReference(this);
  }
}

export class VariableReference extends AbstractJavaNode {
  variableName: Identifier;

  constructor(variableName: Identifier) {
    super();
    this.variableName = variableName;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitVariableReference(this);
  }
}

export class MethodDeclaration extends AbstractMethodDeclaration {
  private pComments: CommentList | undefined;
  private pAnnotations: AnnotationList | undefined;
  private pModifiers: ModifierList;
  private pType: Type;
  private pName: Identifier;
  private pParameters: ArgumentDeclarationList | undefined;
  body?: Block;

  get comments(): CommentList | undefined {
    return this.pComments;
  }

  set comments(value: CommentList | undefined) {
    this.pComments = value;
  }

  get annotations(): AnnotationList | undefined {
    return this.pAnnotations;
  }

  set annotations(value: AnnotationList | undefined) {
    this.pAnnotations = value;
  }

  get modifiers(): ModifierList {
    return this.pModifiers;
  }

  set modifiers(value: ModifierList) {
    this.pModifiers = value;
  }

  get type(): Type {
    return this.pType;
  }

  set type(value: Type) {
    this.pType = value;
  }

  get name(): Identifier {
    return this.pName;
  }

  set name(value: Identifier) {
    this.pName = value;
  }

  get parameters(): ArgumentDeclarationList | undefined {
    return this.pParameters;
  }

  set parameters(value: ArgumentDeclarationList | undefined) {
    this.pParameters = value;
  }

  constructor(type: Type, name: Identifier, parameters?: ArgumentDeclarationList, modifiers?: ModifierList) {
    super();
    this.pType = type;
    this.pName = name;
    this.pParameters = parameters;
    this.pModifiers = modifiers || new ModifierList([new Modifier(ModifierType.PUBLIC)]);
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitMethodDeclaration(this);
  }
}

export abstract class AbstractFieldBackedMethodDeclaration extends AbstractMethodDeclaration {
  protected readonly field: Field;
  private readonly pAnnotations: AnnotationList | undefined;

  get comments(): CommentList | undefined {
    return this.field.comments;
  }

  get annotations(): AnnotationList | undefined {
    return this.pAnnotations;
  }

  get modifiers(): ModifierList {
    return new ModifierList([new Modifier(ModifierType.PUBLIC)]);
  }

  constructor(pField: Field, pAnnotations?: AnnotationList, body?: Block) {
    super();
    this.field = pField;
    this.pAnnotations = pAnnotations;
    this.body = body;
  }
}

export class FieldBackedGetter extends AbstractFieldBackedMethodDeclaration {
  get type(): Type {
    return this.field.type;
  }

  // The name needs to be capitalized properly, etc, etc
  get name(): Identifier {
    return new Identifier(JavaUtil.getGetterName(this.field.identifier, this.type));
  }

  get parameters(): ArgumentDeclarationList | undefined {
    return undefined;
  }

  constructor(field: Field, annotations?: AnnotationList) {
    super(field, annotations, new Block(
        new ReturnStatement(new FieldReference(field)),
    ));
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitFieldBackedGetter(this);
  }
}

export class FieldBackedSetter extends AbstractFieldBackedMethodDeclaration {
  get type(): Type {
    return new Type('void');
  }

  // The name needs to be capitalized properly, etc, etc
  get name(): Identifier {
    return new Identifier(JavaUtil.getSetterName(this.field.identifier, this.type));
  }

  get parameters(): ArgumentDeclarationList {
    return new ArgumentDeclarationList(
        new ArgumentDeclaration(
            this.field.type,
            this.field.identifier,
        ),
    );
  }

  constructor(field: Field, annotations?: AnnotationList) {
    super(field, annotations, new Block(
        new AssignExpression(
            new FieldReference(field),
            // TODO: Change, so that "value" is not hard-coded! Or is "identifier" enough?
            new VariableReference(new Identifier('value')),
        ),
    ));
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitFieldBackedSetter(this);
  }
}

export class FieldGetterSetter extends AbstractJavaNode {
  field: Field;
  readonly getter: FieldBackedGetter;
  readonly setter: FieldBackedSetter;

  constructor(type: Type, identifier: Identifier, annotations?: AnnotationList) {
    super();
    this.field = new Field(type, identifier, undefined, undefined, annotations);
    this.getter = new FieldBackedGetter(this.field);
    this.setter = new FieldBackedSetter(this.field);
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitFieldGetterSetter(this);
  }
}

export class Cast extends AbstractJavaNode {
  toType: Type;
  expression: AbstractExpression;

  constructor(toType: Type, expression: AbstractExpression) {
    super();
    this.toType = toType;
    this.expression = expression;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitCast(this);
  }
}

export class TypeList extends AbstractJavaNode {
  children: Type[];

  constructor(...types: Type[]) {
    super();
    this.children = types;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitTypeList(this);
  }
}

export class ExtendsDeclaration extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitExtendsDeclaration(this);
  }
}

export class ImplementsDeclaration extends AbstractJavaNode {
  types: TypeList;

  constructor(types: TypeList) {
    super();
    this.types = types;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitImplementsDeclaration(this);
  }
}

export abstract class AbstractObjectDeclaration extends AbstractJavaNode {
  comments?: CommentList;
  annotations?: AnnotationList;
  modifiers: ModifierList;
  name: Identifier;
  extends?: ExtendsDeclaration;
  implements?: ImplementsDeclaration;
  body: Block;

  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super();
    this.modifiers = modifiers || new ModifierList([new Modifier(ModifierType.PUBLIC)]);
    this.name = name;
    this.body = body;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitObjectDeclaration(this);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration {
  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super(name, body, modifiers);
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitClassDeclaration(this);
  }
}

export class InterfaceDeclaration extends AbstractObjectDeclaration {
  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super(name, body, modifiers);
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitInterfaceDeclaration(this);
  }
}

// Simplify so we don't give block, but enum entries?
export class EnumDeclaration extends AbstractObjectDeclaration {
  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super(name, body, modifiers);
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitEnumDeclaration(this);
  }
}

export class EnumItem extends AbstractJavaNode {
  identifier: Identifier;
  value: Literal;

  constructor(identifier: Identifier, value: Literal) {
    super();
    this.identifier = identifier;
    this.value = value;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitEnumItem(this);
  }
}

export class IfStatement extends AbstractJavaNode {
  predicate: Predicate;
  body: Block;

  constructor(predicate: Predicate, body: Block) {
    super();
    this.predicate = predicate;
    this.body = body;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitIfStatement(this);
  }
}

export class IfElseStatement extends AbstractJavaNode {
  ifStatements: IfStatement[];
  elseBlock?: Block;

  constructor(ifStatements: IfStatement[], elseBlock?: Block) {
    super();
    this.ifStatements = ifStatements;
    this.elseBlock = elseBlock;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitIfElseStatement(this);
  }
}

export class ImportStatement extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitImportStatement(this);
  }
}

export class ImportList extends AbstractJavaNode {
  children: ImportStatement[];

  constructor(children: ImportStatement[]) {
    super();
    this.children = children;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitImportList(this);
  }
}

export class MethodCall extends AbstractJavaNode {
  target: AbstractExpression;
  methodName: Identifier;
  methodArguments?: ArgumentList;

  constructor(target: AbstractExpression, methodName: Identifier, methodArguments: ArgumentList) {
    super();
    this.target = target;
    this.methodName = methodName;
    this.methodArguments = methodArguments;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitMethodCall(this);
  }
}

/**
 * TODO: Make this inherit from MethodCall?
 */
export class NewStatement extends AbstractJavaNode {
  type: Type;
  constructorArguments: ArgumentList;

  constructor(type: Type, constructorArguments: ArgumentList) {
    super();
    this.type = type;
    this.constructorArguments = constructorArguments;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitNewStatement(this);
  }
}

export class HardCoded extends AbstractJavaNode {
  content: string;

  constructor(content: string) {
    super();
    this.content = content;
  }

  visit(visitor: JavaCstVisitor): void {
    visitor.visitHardCoded(this);
  }
}
