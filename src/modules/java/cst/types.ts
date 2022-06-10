import AbstractNode from '@cst/AbstractNode';
import AbstractToken from '@cst/AbstractToken';
import {JavaUtil, JavaCstVisitor} from '@java';
import {GenericPrimitiveKind, GenericPrimitiveType, GenericType, GenericTypeKind} from '@parse';
import {VisitResult} from '@visit';

export enum TokenType {
  ASSIGN,
  ADD,
  COMMA,
  EQUALS,
  MULTIPLY,
  SUBTRACT
}

export class JavaToken extends AbstractToken {
  type: TokenType;

  constructor(type: TokenType) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitToken(this);
  }
}

abstract class AbstractJavaNode extends AbstractNode {
  /*
  visit<R, TVisitor extends AbstractCstVisitor<R>>(visitor: TVisitor): void {
    return undefined;
  }
  */
}

export class Type extends AbstractJavaNode {
  genericType: GenericType;
  get array(): boolean {
    return this.genericType.kind == GenericTypeKind.ARRAY;
  }

  get fqn(): string {
    return JavaUtil.getFullyQualifiedName(this.genericType);
  }

  constructor(genericType: GenericType) {
    super();
    this.genericType = genericType;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitType(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitIdentifier(this);
  }
}

export abstract class AbstractExpression extends AbstractJavaNode {
}

// Split this into different types of constant depending on the type?
type LiteralType = boolean | number | string | null;
export class Literal extends AbstractJavaNode {
  value: LiteralType;

  constructor(value: LiteralType) {
    super();
    this.value = value;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitLiteral(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePair(this);
  }
}

export class AnnotationKeyValuePairList extends AbstractJavaNode {
  children: AnnotationKeyValuePair[];

  constructor(...children: AnnotationKeyValuePair[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePairList(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotation(this);
  }
}

export class AnnotationList extends AbstractJavaNode {
  children: Annotation[];

  constructor(...children: Annotation[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationList(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentDeclaration(this);
  }
}

export class ArgumentDeclarationList extends AbstractJavaNode {
  children: ArgumentDeclaration[];

  constructor(...children: ArgumentDeclaration[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentDeclarationList(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this);
  }
}

export class AssignExpression extends BinaryExpression {
  constructor(left: AbstractExpression, right: AbstractExpression) {
    super(left, new JavaToken(TokenType.ASSIGN), right);
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAssignExpression(this);
  }
}

export class PackageDeclaration extends AbstractJavaNode {
  fqn: string;

  constructor(fqn: string) {
    super();
    this.fqn = fqn;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitPackage(this);
  }
}

export class Predicate extends AbstractJavaNode {
  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitPredicate(this);
  }
}

export class ArgumentList extends AbstractJavaNode {
  children: AbstractExpression[];

  constructor(...children: AbstractExpression[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentList(this);
  }
}

export class Block extends AbstractJavaNode {
  children: AbstractJavaNode[];

  constructor(...children: AbstractJavaNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitBlock(this);
  }
}

// Is it needed to separate these? We don't need to care to be logically consistent.
export enum ModifierType {
  PRIVATE,
  PUBLIC,
  DEFAULT,
  PROTECTED,

  STATIC,
  FINAL,
}

export class Modifier extends AbstractJavaNode {
  type: ModifierType;

  constructor(type: ModifierType) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitModifier(this);
  }
}

export class ModifierList extends AbstractJavaNode {
  modifiers: Modifier[];

  constructor(modifiers: Modifier[]) {
    super();
    this.modifiers = modifiers;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitModifierList(this);
  }
}

export class Comment extends AbstractJavaNode {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitComment(this);
  }
}

export class CommentList extends AbstractJavaNode {
  children: Comment[];

  constructor(...children: Comment[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitCommentList(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitField(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitReturnStatement(this);
  }
}

export class FieldReference extends AbstractExpression {
  field: Field;

  constructor(field: Field) {
    super();
    this.field = field;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldReference(this);
  }
}

export class VariableReference extends AbstractJavaNode {
  variableName: Identifier;

  constructor(variableName: Identifier) {
    super();
    this.variableName = variableName;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitVariableReference(this);
  }
}

export class MethodDeclaration extends AbstractMethodDeclaration {
  private pComments: CommentList | undefined;
  private pAnnotations: AnnotationList | undefined;
  private pModifiers: ModifierList;
  private pType: Type;
  private pName: Identifier;
  private pParameters: ArgumentDeclarationList | undefined;

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

  constructor(type: Type, name: Identifier, parameters?: ArgumentDeclarationList, modifiers?: ModifierList, body?: Block) {
    super();
    this.pType = type;
    this.pName = name;
    this.pParameters = parameters;
    this.pModifiers = modifiers || new ModifierList([new Modifier(ModifierType.PUBLIC)]);
    this.body = body;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclaration(this);
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

  protected constructor(pField: Field, pAnnotations?: AnnotationList, body?: Block) {
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
    return new Identifier(JavaUtil.getGetterName(this.field.identifier.value, this.type.genericType));
  }

  get parameters(): ArgumentDeclarationList | undefined {
    return undefined;
  }

  constructor(field: Field, annotations?: AnnotationList) {
    super(field, annotations, new Block(
        new ReturnStatement(new FieldReference(field)),
    ));
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedGetter(this);
  }
}

export class FieldBackedSetter extends AbstractFieldBackedMethodDeclaration {
  get type(): Type {
    return new Type(<GenericPrimitiveType>{
      name: 'void',
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.VOID,
    });
  }

  // The name needs to be capitalized properly, etc, etc
  get name(): Identifier {
    return new Identifier(JavaUtil.getSetterName(this.field.identifier, this.type.genericType));
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldGetterSetter(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitCast(this);
  }
}

export class TypeList extends AbstractJavaNode {
  children: Type[];

  constructor(types: Type[]) {
    super();
    this.children = types;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitTypeList(this);
  }
}

export class ExtendsDeclaration extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitExtendsDeclaration(this);
  }
}

export class ImplementsDeclaration extends AbstractJavaNode {
  types: TypeList;

  constructor(types: TypeList) {
    super();
    this.types = types;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitImplementsDeclaration(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitObjectDeclaration(this);
  }
}

export class CompilationUnit extends AbstractJavaNode {
  packageDeclaration: PackageDeclaration;
  imports: ImportList;
  object: AbstractObjectDeclaration;

  constructor(packageDeclaration: PackageDeclaration, imports: ImportList, object: AbstractObjectDeclaration) {
    super();
    this.packageDeclaration = packageDeclaration;
    this.imports = imports;
    this.object = object;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitCompilationUnit(this);
  }
}

export class ConstructorDeclaration extends AbstractJavaNode {

  owner: ClassDeclaration;
  modifiers: ModifierList;
  parameters?: ArgumentDeclarationList;
  annotations?: AnnotationList;
  comments?: CommentList;
  body?: Block;


  constructor(owner: ClassDeclaration, parameters?: ArgumentDeclarationList, body?: Block, modifiers?: ModifierList) {
    super();
    this.owner = owner;
    this.modifiers = modifiers || new ModifierList([new Modifier(ModifierType.PUBLIC)]);
    this.parameters = parameters;
    this.body = body;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitConstructor(this);
  }
}

export class AdditionalPropertiesDeclaration extends AbstractJavaNode {

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAdditionalPropertiesDeclaration(this);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration {
  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super(name, body, modifiers);
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitClassDeclaration(this);
  }
}

export class InterfaceDeclaration extends AbstractObjectDeclaration {
  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super(name, body, modifiers);
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this);
  }
}

// Simplify so we don't give block, but enum entries?
export class EnumDeclaration extends AbstractObjectDeclaration {
  constructor(name: Identifier, body: Block, modifiers?: ModifierList) {
    super(name, body, modifiers);
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitEnumDeclaration(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItem(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitIfStatement(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitIfElseStatement(this);
  }
}

export class ImportStatement extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitImportStatement(this);
  }
}

export class ImportList extends AbstractJavaNode {
  children: ImportStatement[];

  constructor(children: ImportStatement[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitImportList(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitMethodCall(this);
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

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitNewStatement(this);
  }
}

export class HardCoded extends AbstractJavaNode {
  content: string;

  constructor(content: string) {
    super();
    this.content = content;
  }

  visit<R>(visitor: JavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitHardCoded(this);
  }
}
