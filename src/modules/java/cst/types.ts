import AbstractNode from '@cst/AbstractNode';
import AbstractToken from '@cst/AbstractToken';
import {JavaOptions, JavaUtil, UnknownType} from '@java';
import {
  GenericClassType,
  GenericDictionaryType,
  GenericPrimitiveKind,
  GenericPrimitiveType,
  GenericReferenceType,
  GenericType,
  GenericTypeKind
} from '@parse';
import {VisitResult} from '@visit';
import {IJavaCstVisitor} from '@java/visit/IJavaCstVisitor';
import {Naming} from '@parse/Naming';
import {camelCase} from 'change-case';

export enum TokenType {
  ASSIGN,
  ADD,
  COMMA,
  EQUALS,
  NOT_EQUALS,
  GT,
  LT,
  GTE,
  LTE,
  MULTIPLY,
  SUBTRACT
}

export class JavaToken extends AbstractToken {
  type: TokenType;

  constructor(type: TokenType) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitToken(this, visitor);
  }
}

export abstract class AbstractJavaNode extends AbstractNode {

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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitType(this, visitor);
  }
}

export interface IWithChildren<T extends AbstractJavaNode> {
  children: T;
}

export class Identifier extends AbstractJavaNode {
  value: string;
  original?: string;

  constructor(name: string, original?: string) {
    super();
    this.value = name;
    this.original = original;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitIdentifier(this, visitor);
  }
}

export abstract class AbstractExpression extends AbstractJavaNode {
}

// Split this into different types of constant depending on the type?
type LiteralType = boolean | number | string | null;

export class Literal extends AbstractExpression {
  value: LiteralType;

  constructor(value: LiteralType) {
    super();
    this.value = value;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitLiteral(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePair(this, visitor);
  }
}

export class AnnotationKeyValuePairList extends AbstractJavaNode {
  children: AnnotationKeyValuePair[];

  constructor(...children: AnnotationKeyValuePair[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePairList(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotation(this, visitor);
  }
}

export class AnnotationList extends AbstractJavaNode {
  children: Annotation[];

  constructor(...children: Annotation[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationList(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentDeclaration(this, visitor);
  }
}

export class ArgumentDeclarationList extends AbstractJavaNode {
  children: ArgumentDeclaration[];

  constructor(...children: ArgumentDeclaration[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentDeclarationList(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this, visitor);
  }
}

export class AssignExpression extends BinaryExpression {
  constructor(left: AbstractExpression, right: AbstractExpression) {
    super(left, new JavaToken(TokenType.ASSIGN), right);
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAssignExpression(this, visitor);
  }
}

export class PackageDeclaration extends AbstractJavaNode {
  fqn: string;

  constructor(fqn: string) {
    super();
    this.fqn = fqn;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitPackage(this, visitor);
  }
}

export type TokenTypePredicate =
  TokenType.EQUALS
  | TokenType.NOT_EQUALS
  | TokenType.GT
  | TokenType.LT
  | TokenType.LTE
  | TokenType.GTE;

export class Predicate extends BinaryExpression {

  constructor(left: AbstractExpression, token: TokenTypePredicate, right: AbstractExpression) {
    super(left, new JavaToken(token), right);
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this, visitor);
  }
}

export class ArgumentList extends AbstractJavaNode {
  children: AbstractExpression[];

  constructor(...children: AbstractExpression[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentList(this, visitor);
  }
}

export class EnumItemList extends AbstractJavaNode {
  children: EnumItem[];

  constructor(...children: EnumItem[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItemList(this, visitor);
  }
}

export class Block extends AbstractJavaNode {
  children: AbstractJavaNode[];

  constructor(...children: AbstractJavaNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitBlock(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitModifier(this, visitor);
  }
}

export class ModifierList extends AbstractJavaNode {
  modifiers: Modifier[];

  constructor(...modifiers: Modifier[]) {
    super();
    this.modifiers = modifiers;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitModifierList(this, visitor);
  }
}

export class Comment extends AbstractJavaNode {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitComment(this, visitor);
  }
}

export class CommentList extends AbstractJavaNode {
  children: Comment[];

  constructor(...children: Comment[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitCommentList(this, visitor);
  }
}

export class Field extends AbstractJavaNode {
  identifier: Identifier;
  type: Type;
  initializer?: AbstractExpression;
  comments?: CommentList;
  modifiers: ModifierList;
  annotations?: AnnotationList;

  constructor(type: Type, name: Identifier, modifiers?: ModifierList, initializer?: AbstractExpression, annotations?: AnnotationList) {
    super();
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PRIVATE));
    this.type = type;
    this.identifier = name;
    this.initializer = initializer;
    this.annotations = annotations;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitField(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitReturnStatement(this, visitor);
  }
}

export class FieldReference extends AbstractExpression {
  field: Field;

  constructor(field: Field) {
    super();
    this.field = field;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldReference(this, visitor);
  }
}

export class VariableReference extends AbstractJavaNode {
  variableName: Identifier;

  constructor(variableName: Identifier) {
    super();
    this.variableName = variableName;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitVariableReference(this, visitor);
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
    this.pModifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.body = body;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclaration(this, visitor);
  }
}

export abstract class AbstractFieldBackedMethodDeclaration extends AbstractMethodDeclaration {
  protected readonly field: Field;
  private readonly pAnnotations: AnnotationList | undefined;
  private readonly pComments?: CommentList;

  get comments(): CommentList | undefined {
    return this.pComments;
  }

  get annotations(): AnnotationList | undefined {
    return this.pAnnotations;
  }

  get modifiers(): ModifierList {
    return new ModifierList(new Modifier(ModifierType.PUBLIC));
  }

  protected constructor(pField: Field, pAnnotations?: AnnotationList, pComments?: CommentList, body?: Block) {
    super();
    this.field = pField;
    this.pAnnotations = pAnnotations;
    this.pComments = pComments;
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

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentList) {
    super(field, annotations, comments, new Block(
      new Statement(new ReturnStatement(new FieldReference(field))),
    ));
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedGetter(this, visitor);
  }
}

export class FieldBackedSetter extends AbstractFieldBackedMethodDeclaration {
  get type(): Type {
    return new Type(<GenericPrimitiveType>{
      name: () => 'void',
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.VOID,
    });
  }

  // The name needs to be capitalized properly, etc, etc
  get name(): Identifier {
    return new Identifier(JavaUtil.getSetterName(this.field.identifier.value, this.type.genericType));
  }

  get parameters(): ArgumentDeclarationList {
    return new ArgumentDeclarationList(
      new ArgumentDeclaration(
        this.field.type,
        this.field.identifier,
      ),
    );
  }

  field: Field;

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentList) {
    super(field, annotations, comments, new Block(
      new AssignExpression(
        new FieldReference(field),
        // TODO: Change, so that "value" is not hard-coded! Or is "identifier" enough?
        new VariableReference(new Identifier('value')),
      ),
    ));

    // Should be possible to remove, and fetched from the block assign reference?
    this.field = field;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this, visitor);
  }
}

export class FieldGetterSetter extends AbstractJavaNode {
  field: Field;
  readonly getter: FieldBackedGetter;
  readonly setter: FieldBackedSetter;

  constructor(type: Type, identifier: Identifier, annotations?: AnnotationList, comments?: CommentList) {
    super();
    this.field = new Field(type, identifier, undefined, undefined, annotations);
    this.getter = new FieldBackedGetter(this.field, undefined, comments);
    this.setter = new FieldBackedSetter(this.field);
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldGetterSetter(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitCast(this, visitor);
  }
}

export class TypeList extends AbstractJavaNode {
  children: Type[];

  constructor(types: Type[]) {
    super();
    this.children = types;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitTypeList(this, visitor);
  }
}

export class ExtendsDeclaration extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitExtendsDeclaration(this, visitor);
  }
}

export class ImplementsDeclaration extends AbstractJavaNode {
  types: TypeList;

  constructor(types: TypeList) {
    super();
    this.types = types;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitImplementsDeclaration(this, visitor);
  }
}

export abstract class AbstractObjectDeclaration extends AbstractJavaNode {
  type: Type;
  comments?: CommentList;
  annotations?: AnnotationList;
  modifiers: ModifierList;
  name: Identifier;
  extends?: ExtendsDeclaration;
  implements?: ImplementsDeclaration;
  body: Block;

  constructor(type: Type, name: Identifier, body: Block, modifiers?: ModifierList) {
    super();
    this.type = type;
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.name = name;
    this.body = body;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitObjectDeclaration(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitCompilationUnit(this, visitor);
  }
}

export type ConstructorOwnerDeclaration = ClassDeclaration | EnumDeclaration;

export class ConstructorDeclaration extends AbstractJavaNode {

  owner: ConstructorOwnerDeclaration;
  modifiers: ModifierList;
  parameters?: ArgumentDeclarationList;
  annotations?: AnnotationList;
  comments?: CommentList;
  body?: Block;


  constructor(owner: ConstructorOwnerDeclaration, parameters?: ArgumentDeclarationList, body?: Block, modifiers?: ModifierList) {
    super();
    this.owner = owner;
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.parameters = parameters;
    this.body = body;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitConstructor(this, visitor);
  }
}

export class AdditionalPropertiesDeclaration extends AbstractJavaNode {
  children: AbstractJavaNode[];

  constructor() {
    super();

    // TODO: This should be some other type. Point directly to Map<String, Object>? Or have specific known type?
    const keyType: GenericPrimitiveType = {
      name: () => 'AdditionalPropertiesKeyType',
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.STRING
    };

    // TODO: Should this be "Unknown" or another type that is "Any"?
    //  Difference between rendering as JsonNode and Object in some cases.
    const valueType: GenericClassType = {
      name: () => 'AdditionalPropertiesValueType',
      kind: GenericTypeKind.UNKNOWN,
      additionalProperties: false
    }
    const mapType: GenericDictionaryType = {
      name: () => 'AdditionalProperties',
      kind: GenericTypeKind.DICTIONARY,
      keyType: keyType,
      valueType: valueType
    };

    const additionalPropertiesFieldIdentifier = new Identifier('_additionalProperties');
    const keyParameterIdentifier = new Identifier('key');
    const valueParameterIdentifier = new Identifier('value');

    const additionalPropertiesField = new Field(
      new Type(mapType),
      additionalPropertiesFieldIdentifier,
      undefined,
      new NewStatement(new Type(mapType))
    );

    const addMethod = new MethodDeclaration(
      new Type(<GenericPrimitiveType>{
        name: () => '',
        kind: GenericTypeKind.PRIMITIVE,
        primitiveKind: GenericPrimitiveKind.VOID
      }),
      new Identifier('addAdditionalProperty'),
      new ArgumentDeclarationList(
        new ArgumentDeclaration(new Type(keyType), keyParameterIdentifier),
        new ArgumentDeclaration(new Type(valueType), valueParameterIdentifier)
      ),
      undefined,
      new Block(
        new Statement(
          new MethodCall(
            new FieldReference(additionalPropertiesField),
            new Identifier('put'),
            new ArgumentList(
              new VariableReference(keyParameterIdentifier),
              new VariableReference(valueParameterIdentifier)
            )
          )
        )
      ),
    );

    addMethod.annotations = new AnnotationList(
      new Annotation(
        new Type({
          name: () => 'AnySetter',
          kind: GenericTypeKind.REFERENCE,
          fqn: 'com.fasterxml.jackson.annotation.JsonAnySetter',
        }),
      )
    );

    this.children = [
      additionalPropertiesField,
      addMethod,
      new FieldBackedGetter(
        additionalPropertiesField,
        new AnnotationList(new Annotation(
          new Type({
            name: () => 'AnyGetter',
            kind: GenericTypeKind.REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonAnyGetter',
          }),
        ))
      )
    ];
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitAdditionalPropertiesDeclaration(this, visitor);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration {
  constructor(type: Type, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitClassDeclaration(this, visitor);
  }
}

export class InterfaceDeclaration extends AbstractObjectDeclaration {
  constructor(type: Type, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this, visitor);
  }
}

// Simplify so we don't give block, but enum entries?
export class EnumDeclaration extends AbstractObjectDeclaration {
  constructor(type: Type, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitEnumDeclaration(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItem(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitIfStatement(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitIfElseStatement(this, visitor);
  }
}

export class ImportStatement extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitImportStatement(this, visitor);
  }
}

export class ImportList extends AbstractJavaNode {
  children: ImportStatement[];

  constructor(children: ImportStatement[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitImportList(this, visitor);
  }
}

export class Statement extends AbstractJavaNode {
  child: AbstractJavaNode;

  constructor(child: AbstractJavaNode) {
    super();
    this.child = child;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitStatement(this, visitor);
  }
}

export class SuperConstructorCall extends AbstractJavaNode {
  parameters: ArgumentList;


  constructor(parameters: ArgumentList) {
    super();
    this.parameters = parameters;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitSuperConstructorCall(this, visitor);
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

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitMethodCall(this, visitor);
  }
}

/**
 * TODO: Make this inherit from MethodCall?
 */
export class NewStatement extends AbstractJavaNode {
  type: Type;
  constructorArguments?: ArgumentList;

  constructor(type: Type, constructorArguments?: ArgumentList) {
    super();
    this.type = type;
    this.constructorArguments = constructorArguments;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitNewStatement(this, visitor);
  }
}

export class HardCoded extends AbstractJavaNode {
  content: string;

  constructor(content: string) {
    super();
    this.content = content;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitHardCoded(this, visitor);
  }
}

export class ClassReference extends AbstractExpression {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitClassReference(this, visitor);
  }
}

export class RuntimeTypeMapping extends AbstractJavaNode {
  fields: Field[];
  getters: FieldBackedGetter[];
  methods: MethodDeclaration[];

  constructor(types: GenericType[], options: JavaOptions, commentSupplier: {(type: GenericType): Comment[]}) {
    super();

    this.fields = [];
    this.getters = [];
    this.methods = [];

    const unknownType: GenericClassType = {
      kind: GenericTypeKind.UNKNOWN,
      name: 'unknown'
    };

    const untypedField = new Field(
      new Type(unknownType),
      new Identifier('_raw'),
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL),
      )
    );
    const untypedGetter = new FieldBackedGetter(
      untypedField
    );

    this.fields.push(untypedField);
    this.getters.push(untypedGetter);

    for (const type of types) {

      const typedFieldName = camelCase(Naming.unwrap(type.name));
      const typedField = new Field(
        new Type(type),
        new Identifier(`_${typedFieldName}`)
      );
      const typedFieldReference = new FieldReference(typedField);

      const argumentDeclarationList = new ArgumentDeclarationList();
      let conversionExpression: AbstractExpression;
      if (options.unknownType == UnknownType.JSON) {
        const objectMapperReference = new Identifier('objectMapper');
        argumentDeclarationList.children.push(
          new ArgumentDeclaration(
            new Type({kind: GenericTypeKind.REFERENCE, fqn: "com.fasterxml.jackson.ObjectMapper", name: 'om'}),
            objectMapperReference
          )
        );
        conversionExpression = new MethodCall(
          new VariableReference(objectMapperReference),
          new Identifier('convertValue'),
          new ArgumentList(
            new FieldReference(untypedField),
            new ClassReference(typedField.type)
          )
        )
      } else {
        conversionExpression = new Literal('Conversion path unknown');
      }

      const typedGetter = new MethodDeclaration(
        typedField.type,
        new Identifier(JavaUtil.getGetterName(Naming.unwrap(type.name), typedField.type.genericType)),
        argumentDeclarationList,
        undefined,
        new Block(
          // First check if we have already cached the result.
          new IfStatement(
            new Predicate(
              typedFieldReference,
              TokenType.NOT_EQUALS,
              new Literal(null)
            ),
            new Block(
              new Statement(
                new ReturnStatement(
                  typedFieldReference
                )
              )
            )
          ),
          // If not, then try to convert the raw value into the target type and cache it.
          new Statement(
            new ReturnStatement(
              new BinaryExpression(
                typedFieldReference,
                new JavaToken(TokenType.ASSIGN),
                conversionExpression
              )
            )
          )
        )
      );
      typedGetter.comments = new CommentList(...commentSupplier(typedGetter.type.genericType));

      this.fields.push(typedField);
      this.methods.push(typedGetter);
    }
  }

  visit<R>(visitor: IJavaCstVisitor<R>): VisitResult<R> {
    return visitor.visitRuntimeTypeMapping(this, visitor);
  }
}
