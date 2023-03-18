import {
  AstNode,
  AstToken,
  VisitResult,
  OmniDictionaryType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  LiteralValue,
  AstNodeWithChildren,
  OmniProperty,
  UnknownKind,
  OmniGenericTargetType,
  OmniSuperTypeCapableType,
  OmniPotentialInterfaceType,
  OmniEnumType,
  OmniHardcodedReferenceType,
  OmniGenericSourceIdentifierType,
  AstVisitor,
} from '@omnigen/core';
import {JavaAstUtils} from '../transform/index.js';
import {JavaSubTypeCapableType, JavaUtil} from '../util/index.js';
import {JavaVisitor} from '../visit/index.js';
import {JavaOptions} from '../options/index.js';
import {Case} from '@omnigen/core-util';

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
  SUBTRACT,

  OR,
  AND,
}

export class JavaToken implements AstToken {
  type: TokenType;

  constructor(type: TokenType) {
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitToken(this, visitor);
  }
}

export abstract class AbstractJavaNode implements AstNode {
  abstract visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}

export class RegularType<T extends OmniType> extends AbstractJavaNode {
  omniType: T;
  private _localName?: string | undefined;
  private _importName?: string | undefined;
  readonly implementation?: boolean | undefined;

  get array(): boolean {
    return this.omniType.kind == OmniTypeKind.ARRAY;
  }

  getLocalName(): string | undefined {
    return this._localName;
  }

  setLocalName(value: string | undefined): void {
    this._localName = value;
  }

  getImportName(): string | undefined {
    return this._importName;
  }

  setImportName(value: string | undefined): void {
    this._importName = value;
  }

  // TODO: Remove the restriction. It's not going to work. Need another way of doing it
  constructor(omniType: T, implementation?: boolean) {
    super();
    this.omniType = omniType;
    this.implementation = implementation;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitRegularType(this, visitor);
  }
}

export type Type<T extends OmniType> = RegularType<T> | GenericType;

/**
 * TODO: Remove this, and move the functionality of deciding way to render to the renderer itself?
 *        That way RegularType and GenericType can just become Type, and skip the JavaAstUtils method
 *
 * TODO: Introduce generics to this? So we can be more restrictive
 */
export class GenericType extends AbstractJavaNode {
  baseType: RegularType<OmniGenericTargetType | OmniHardcodedReferenceType>;
  genericArguments: Type<OmniType>[];

  /**
   * A getter of kindness to make it compliant to the reglar Java.Type node.
   */
  get omniType(): OmniGenericTargetType | OmniHardcodedReferenceType {
    return this.baseType.omniType;
  }

  constructor(baseType: RegularType<OmniGenericTargetType | OmniHardcodedReferenceType>, genericArguments: Type<OmniType>[]) {
    super();
    this.baseType = baseType;
    this.genericArguments = genericArguments;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericType(this, visitor);
  }
}

export class Identifier extends AbstractJavaNode {
  value: string;
  original?: string | undefined;

  constructor(name: string, original?: string) {
    super();
    this.value = name;
    this.original = original;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitIdentifier(this, visitor);
  }
}

export abstract class AbstractExpression extends AbstractJavaNode {
}

export class Literal extends AbstractExpression {
  value: LiteralValue;
  primitiveKind?: OmniPrimitiveKind | undefined;

  constructor(value: LiteralValue, primitiveKind?: OmniPrimitiveKind) {
    super();
    this.value = value;
    this.primitiveKind = primitiveKind;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitLiteral(this, visitor);
  }
}

// TODO: "ArrayInitializer" can in turn contain anything! It should on
// eslint-disable-next-line no-use-before-define
type AnnotationValue = Literal | Annotation | ArrayInitializer<Annotation> | ClassReference | StaticMemberReference;

export class AnnotationKeyValuePair extends AbstractJavaNode {
  key: Identifier | undefined;
  value: AnnotationValue;

  constructor(key: Identifier | undefined, value: AnnotationValue) {
    super();
    this.key = key;
    this.value = value;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePair(this, visitor);
  }
}

export class AnnotationKeyValuePairList extends AbstractJavaNode implements AstNodeWithChildren<AnnotationKeyValuePair> {
  children: AnnotationKeyValuePair[];

  constructor(...children: AnnotationKeyValuePair[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePairList(this, visitor);
  }
}

export class Annotation extends AbstractJavaNode {
  type: RegularType<OmniType>;
  pairs?: AnnotationKeyValuePairList | undefined;

  constructor(type: RegularType<OmniType>, pairs?: AnnotationKeyValuePairList) {
    super();
    this.type = type;
    this.pairs = pairs;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotation(this, visitor);
  }
}

export class AnnotationList extends AbstractJavaNode implements AstNodeWithChildren<Annotation> {
  children: Annotation[];
  multiline = true;

  constructor(...children: Annotation[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationList(this, visitor);
  }
}

export class ArrayInitializer<T extends AbstractJavaNode> extends AbstractJavaNode implements AstNodeWithChildren<T> {
  children: T[];

  constructor(...children: T[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitArrayInitializer(this, visitor);
  }
}

export type StaticTarget = ClassName;

export class StaticMemberReference extends AbstractJavaNode {
  target: StaticTarget;
  member: AbstractExpression;

  constructor(target: StaticTarget, member: AbstractExpression) {
    super();
    this.target = target;
    this.member = member;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitStaticMemberReference(this, visitor);
  }
}

export class ArgumentDeclaration extends AbstractJavaNode {
  type: Type<OmniType>;
  identifier: Identifier;
  annotations?: AnnotationList | undefined;

  constructor(type: Type<OmniType>, identifier: Identifier, annotations?: AnnotationList) {
    super();
    this.type = type;
    this.identifier = identifier;
    this.annotations = annotations;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentDeclaration(this, visitor);
  }
}

export class ArgumentDeclarationList extends AbstractJavaNode implements AstNodeWithChildren<ArgumentDeclaration> {
  children: ArgumentDeclaration[];

  constructor(...children: ArgumentDeclaration[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this, visitor);
  }
}

export class AssignExpression extends BinaryExpression {
  constructor(left: AbstractExpression, right: AbstractExpression) {
    super(left, new JavaToken(TokenType.ASSIGN), right);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAssignExpression(this, visitor);
  }
}

export class PackageDeclaration extends AbstractJavaNode {
  fqn: string;

  constructor(fqn: string) {
    super();
    this.fqn = fqn;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitPredicate(this, visitor);
  }
}

export class ArgumentList extends AbstractJavaNode implements AstNodeWithChildren<AbstractExpression> {
  children: AbstractExpression[];

  constructor(...children: AbstractExpression[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentList(this, visitor);
  }
}

export class EnumItemList extends AbstractJavaNode implements AstNodeWithChildren<EnumItem> {
  children: EnumItem[];

  constructor(...children: EnumItem[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItemList(this, visitor);
  }
}

export class Block extends AbstractJavaNode implements AstNodeWithChildren<AbstractJavaNode> {
  children: AbstractJavaNode[];

  constructor(...children: AbstractJavaNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitModifier(this, visitor);
  }
}

export class ModifierList extends AbstractJavaNode implements AstNodeWithChildren<Modifier> {
  children: Modifier[];

  constructor(...modifiers: Modifier[]) {
    super();
    this.children = modifiers;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitModifierList(this, visitor);
  }
}

export abstract class AbstractFreeText extends AbstractJavaNode {

}

export class FreeText extends AbstractFreeText {
  readonly text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeText(this, visitor);
  }
}

export class FreeTextLine extends AbstractFreeText {
  readonly child: FreeTextType;

  constructor(text: FreeTextType | string) {
    super();
    if (typeof text == 'string') {
      this.child = new FreeText(text);
    } else {
      this.child = text;
    }
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextLine(this, visitor);
  }
}

export class FreeTextIndent extends AbstractFreeText {
  readonly child: FreeTextType;

  constructor(text: FreeTextType) {
    super();
    this.child = text;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextIndent(this, visitor);
  }
}

export class FreeTextParagraph extends AbstractFreeText {
  readonly child: FreeTextType;

  constructor(text: FreeTextType | string) {
    super();
    if (typeof text == 'string') {
      this.child = new FreeText(text);
    } else {
      this.child = text;
    }
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextParagraph(this, visitor);
  }
}

export class FreeTextHeader extends AbstractFreeText {
  readonly level: number;
  readonly child: FreeTextType;

  constructor(level: number, text: FreeTextType) {
    super();
    this.level = level;
    this.child = text;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextHeader(this, visitor);
  }
}

export class FreeTextSection extends AbstractFreeText {
  readonly header: FreeTextHeader;
  readonly content: FreeTextType;

  constructor(level: number, header: string, content: FreeTextType) {
    super();
    this.header = new FreeTextHeader(level, new FreeText(header));
    this.content = content;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextSection(this, visitor);
  }
}

export class FreeTextTypeLink extends AbstractFreeText {
  readonly type: Type<OmniType>;

  constructor(type: Type<OmniType>) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextTypeLink(this, visitor);
  }
}

export class FreeTextMethodLink extends AbstractFreeText {
  readonly type: Type<OmniType>;
  readonly method: MethodDeclarationSignature;

  constructor(type: Type<OmniType>, method: MethodDeclarationSignature) {
    super();
    this.type = type;
    this.method = method;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextMethodLink(this, visitor);
  }
}

export class FreeTextPropertyLink extends AbstractFreeText {
  readonly type: Type<OmniType>;
  readonly property: OmniProperty;

  constructor(type: Type<OmniType>, property: OmniProperty) {
    super();
    this.type = type;
    this.property = property;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextPropertyLink(this, visitor);
  }
}

// export class FreeTextList extends AbstractFreeText {
//   readonly children: FreeTextType[];
//
//   constructor(...children: FreeTextType[]) {
//     super();
//     this.children = children;
//   }
//
//   visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
//     return visitor.visitFreeTextList(this, visitor);
//   }
// }

export type FreeTextType =
  | string
  | FreeText
  | FreeTextParagraph
  | FreeTextLine
  | FreeTextIndent
  | FreeTextHeader
  | FreeTextSection
  // | FreeTextList
  | FreeTextPropertyLink
  | FreeTextMethodLink
  | FreeTextTypeLink
  | FreeTextType[];

export class Comment extends AbstractJavaNode {
  text: FreeTextType;

  constructor(text: FreeTextType) {
    super();
    this.text = text;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitComment(this, visitor);
  }
}

export class CommentBlock extends AbstractJavaNode {
  text: FreeTextType;

  constructor(text: FreeTextType) {
    super();
    this.text = text;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitCommentBlock(this, visitor);
  }
}

/**
 * NOTE: Split into Field and FieldDeclaration? Or rename it? ArgumentDeclaration and VariableDeclaration precedence
 */
export class Field extends AbstractJavaNode {
  identifier: Identifier;
  type: Type<OmniType>;
  initializer?: AbstractExpression | undefined;
  comments?: CommentBlock | undefined;
  modifiers: ModifierList;
  annotations?: AnnotationList | undefined;
  property?: OmniProperty;

  constructor(type: Type<OmniType>, name: Identifier, modifiers?: ModifierList, initializer?: AbstractExpression, annotations?: AnnotationList) {
    super();
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PRIVATE));
    this.type = type;
    this.identifier = name;
    this.initializer = initializer;
    this.annotations = annotations;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitField(this, visitor);
  }
}

export class MethodDeclarationSignature extends AbstractJavaNode {

  identifier: Identifier;
  type: Type<OmniType>;
  comments?: CommentBlock | undefined;
  annotations?: AnnotationList | undefined;
  modifiers: ModifierList;
  parameters?: ArgumentDeclarationList | undefined;
  throws?: TypeList<OmniType>;

  constructor(
    identifier: Identifier,
    type: Type<OmniType>,
    parameters?: ArgumentDeclarationList,
    modifiers?: ModifierList,
    annotations?: AnnotationList,
    comments?: CommentBlock,
    throws?: TypeList<OmniType>,
  ) {
    super();
    this.modifiers = modifiers ?? new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.type = type;
    this.identifier = identifier;
    this.parameters = parameters;
    this.annotations = annotations;
    this.comments = comments;
    if (throws) {
      this.throws = throws;
    }
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclarationSignature(this, visitor);
  }
}

export class AbstractMethodDeclaration extends AbstractJavaNode {
  signature: MethodDeclarationSignature;

  constructor(signature: MethodDeclarationSignature) {
    super();
    this.signature = signature;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAbstractMethodDeclaration(this, visitor);
  }
}

export class MethodDeclaration extends AbstractJavaNode {
  signature: MethodDeclarationSignature;
  body?: Block | undefined;

  constructor(signature: MethodDeclarationSignature, body?: Block) {
    super();
    this.signature = signature;
    this.body = body;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclaration(this, visitor);
  }
}

export class ReturnStatement extends AbstractJavaNode {
  expression: AbstractExpression;

  constructor(expression: AbstractExpression) {
    super();
    this.expression = expression;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitReturnStatement(this, visitor);
  }
}

export class SelfReference extends AbstractExpression {

  constructor() {
    super();
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitSelfReference(this, visitor);
  }
}

export class FieldReference extends AbstractExpression {
  field: Field;

  constructor(field: Field) {
    super();
    this.field = field;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldReference(this, visitor);
  }
}

export class DeclarationReference extends AbstractJavaNode {
  declaration: VariableDeclaration | ArgumentDeclaration;

  constructor(declaration: VariableDeclaration | ArgumentDeclaration) {
    super();
    this.declaration = declaration;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitDeclarationReference(this, visitor);
  }
}

export class VariableDeclaration extends AbstractJavaNode {
  identifier: Identifier;
  type?: Type<OmniType> | undefined;
  initializer?: AbstractExpression | undefined;
  constant?: boolean | undefined;

  constructor(variableName: Identifier, initializer?: AbstractExpression, type?: Type<OmniType> | undefined, constant?: boolean) {
    super();
    if (!type && !initializer) {
      throw new Error(`Either a type or an initializer must be given to the field declaration`);
    }

    this.identifier = variableName;
    this.type = type;
    this.initializer = initializer;
    this.constant = constant;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitVariableDeclaration(this, visitor);
  }
}

export abstract class AbstractFieldBackedMethodDeclaration extends MethodDeclaration {
  readonly field: Field;

  protected constructor(pField: Field, signature: MethodDeclarationSignature, body?: Block) {
    super(signature, body);
    this.field = pField;
  }
}

export class FieldBackedGetter extends AbstractFieldBackedMethodDeclaration {

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentBlock, getterName?: Identifier) {
    super(
      field,
      new MethodDeclarationSignature(
        getterName ?? new Identifier(JavaUtil.getGetterName(field.identifier.value, field.type.omniType)),
        field.type,
        undefined,
        undefined,
        annotations,
        comments,
      ),
      new Block(
        new Statement(new ReturnStatement(new FieldReference(field))),
      ));
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedGetter(this, visitor);
  }
}

export class FieldBackedSetter extends AbstractFieldBackedMethodDeclaration {

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentBlock) {
    const argumentDeclaration = new ArgumentDeclaration(
      field.type,
      field.identifier,
    );

    super(
      field,
      new MethodDeclarationSignature(
        new Identifier(JavaUtil.getSetterName(field.identifier.value)),
        new RegularType({
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.VOID,
          nullable: true,
        }),
        new ArgumentDeclarationList(argumentDeclaration),
        undefined,
        annotations,
        comments,
      ),
      new Block(
        new Statement(
          new AssignExpression(
            new FieldReference(field),
            new DeclarationReference(argumentDeclaration),
          ),
        ),
      ));
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this, visitor);
  }
}

export class FieldGetterSetter extends AbstractJavaNode {
  field: Field;
  readonly getter: FieldBackedGetter;
  readonly setter: FieldBackedSetter;

  constructor(
    type: Type<OmniType>,
    fieldIdentifier: Identifier,
    getterAnnotations?: AnnotationList,
    comments?: CommentBlock,
    getterIdentifier?: Identifier,
  ) {
    super();
    this.field = new Field(type, fieldIdentifier, undefined, undefined, undefined);
    this.getter = new FieldBackedGetter(this.field, getterAnnotations, comments, getterIdentifier);
    this.setter = new FieldBackedSetter(this.field);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldGetterSetter(this, visitor);
  }
}

export class Cast extends AbstractJavaNode {
  toType: Type<OmniType>;
  expression: AbstractExpression;

  constructor(toType: Type<OmniType>, expression: AbstractExpression) {
    super();
    this.toType = toType;
    this.expression = expression;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitCast(this, visitor);
  }
}

export class TypeList<T extends OmniType> extends AbstractJavaNode implements AstNodeWithChildren<Type<T>> {
  children: Type<T>[];

  constructor(types: Type<T>[]) {
    super();
    this.children = types;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitTypeList(this, visitor);
  }
}

export class ExtendsDeclaration extends AbstractJavaNode {
  type: Type<OmniSuperTypeCapableType>;

  constructor(type: Type<OmniSuperTypeCapableType>) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitExtendsDeclaration(this, visitor);
  }
}

export class ImplementsDeclaration extends AbstractJavaNode {
  types: TypeList<OmniPotentialInterfaceType>;

  constructor(types: TypeList<OmniPotentialInterfaceType>) {
    super();
    this.types = types;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitImplementsDeclaration(this, visitor);
  }
}

/**
 * TODO: Make the Type node generic, and possible to limit which OmniType is allowed: Class, Interface, Enum
 */
export abstract class AbstractObjectDeclaration<T extends JavaSubTypeCapableType> extends AbstractJavaNode {
  name: Identifier;
  /**
   * TODO: Make the "Type" generic if possible, since we for example here can know what type it is.
   */
  type: Type<T>;
  comments?: CommentBlock;
  annotations?: AnnotationList;
  modifiers: ModifierList;
  extends?: ExtendsDeclaration;
  implements?: ImplementsDeclaration;
  body: Block;

  protected constructor(type: Type<T>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super();
    this.type = type;
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.name = name;
    this.body = body;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitObjectDeclaration(this, visitor);
  }
}

export class CompilationUnit extends AbstractJavaNode {
  /**
   * TODO: This type should be a generic, but too many changes spread out
   */
  object: AbstractObjectDeclaration<JavaSubTypeCapableType>;
  packageDeclaration: PackageDeclaration;
  imports: ImportList;

  constructor(packageDeclaration: PackageDeclaration, imports: ImportList, object: AbstractObjectDeclaration<JavaSubTypeCapableType>) {
    super();
    this.packageDeclaration = packageDeclaration;
    this.imports = imports;
    this.object = object;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitCompilationUnit(this, visitor);
  }
}

export type ConstructorOwnerDeclaration = ClassDeclaration | EnumDeclaration;

export class ConstructorDeclaration extends AbstractJavaNode {

  owner: ConstructorOwnerDeclaration;
  modifiers: ModifierList;
  parameters?: ArgumentDeclarationList | undefined;
  annotations?: AnnotationList | undefined;
  comments?: CommentBlock | undefined;
  body?: Block | undefined;


  constructor(owner: ConstructorOwnerDeclaration, parameters?: ArgumentDeclarationList, body?: Block, modifiers?: ModifierList) {
    super();
    this.owner = owner;
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.parameters = parameters;
    this.body = body;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitConstructor(this, visitor);
  }
}

export class AdditionalPropertiesDeclaration extends AbstractJavaNode {
  children: AbstractJavaNode[];

  readonly adderMethod: MethodDeclaration;
  readonly keyType: OmniPrimitiveType;
  readonly valueType: OmniUnknownType;
  readonly mapType: OmniDictionaryType;

  constructor() {
    super();

    // TODO: This should be some other type. Point directly to Map<String, Object>? Or have specific known type?
    this.keyType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING,
    };

    // TODO: Should this be "Unknown" or another type that is "Any"?
    //  Difference between rendering as JsonNode and Object in some cases.
    this.valueType = {
      kind: OmniTypeKind.UNKNOWN,
    };
    this.mapType = {
      kind: OmniTypeKind.DICTIONARY,
      keyType: this.keyType,
      valueType: this.valueType,
    };

    const additionalPropertiesFieldIdentifier = new Identifier('_additionalProperties');
    const keyParameterIdentifier = new Identifier('key');
    const valueParameterIdentifier = new Identifier('value');

    // NOTE: This should NEVER be on a field. But it should be moved by later transformers!
    const fieldAnnotations = new AnnotationList(new Annotation(
      new RegularType({
        kind: OmniTypeKind.HARDCODED_REFERENCE,
        fqn: 'com.fasterxml.jackson.annotation.JsonAnyGetter',
      }),
    ));

    const additionalPropertiesField = new Field(
      JavaAstUtils.createTypeNode(this.mapType, false),
      additionalPropertiesFieldIdentifier,
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL),
      ),
      new NewStatement(JavaAstUtils.createTypeNode(this.mapType, true)),
      fieldAnnotations,
    );

    const keyParameterDeclaration = new ArgumentDeclaration(JavaAstUtils.createTypeNode(this.keyType), keyParameterIdentifier);
    const valueParameterDeclaration = new ArgumentDeclaration(JavaAstUtils.createTypeNode(this.valueType), valueParameterIdentifier);

    this.adderMethod = new MethodDeclaration(
      new MethodDeclarationSignature(
        new Identifier('addAdditionalProperty'),
        JavaAstUtils.createTypeNode(<OmniPrimitiveType>{
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.VOID,
        }),
        new ArgumentDeclarationList(
          keyParameterDeclaration,
          valueParameterDeclaration,
        ),
      ),
      new Block(
        new Statement(
          new MethodCall(
            new FieldReference(additionalPropertiesField),
            new Identifier('put'),
            new ArgumentList(
              new DeclarationReference(keyParameterDeclaration),
              new DeclarationReference(valueParameterDeclaration),
            ),
          ),
        ),
      ),
    );

    this.adderMethod.signature.annotations = new AnnotationList(
      new Annotation(
        new RegularType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: 'com.fasterxml.jackson.annotation.JsonAnySetter',
        }),
      ),
    );

    this.children = [
      additionalPropertiesField,
      this.adderMethod,
    ];
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAdditionalPropertiesDeclaration(this, visitor);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration<JavaSubTypeCapableType> {
  constructor(type: RegularType<JavaSubTypeCapableType>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitClassDeclaration(this, visitor);
  }
}

/**
 * TODO: Remove this and instead just add a boolean to the ClassDeclaration and GenericClassDeclaration?
 */
export class InterfaceDeclaration extends AbstractObjectDeclaration<OmniPotentialInterfaceType> {
  constructor(type: Type<OmniPotentialInterfaceType>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this, visitor);
  }
}

/**
 * TODO: Can this be removed? Should it even be needed to be separated from the regular ClassDeclaration?
 */
export class GenericClassDeclaration extends ClassDeclaration {
  typeList: GenericTypeDeclarationList;

  constructor(name: Identifier, type: RegularType<JavaSubTypeCapableType>, typeList: GenericTypeDeclarationList, body: Block) {
    super(type, name, body);
    this.typeList = typeList;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericClassDeclaration(this, visitor);
  }
}

export class GenericTypeDeclaration implements AstNode {
  sourceIdentifier?: OmniGenericSourceIdentifierType | undefined;
  name: Identifier;
  lowerBounds?: Type<OmniType> | undefined;
  upperBounds?: Type<OmniType> | undefined;

  constructor(name: Identifier, sourceIdentifier?: OmniGenericSourceIdentifierType, lowerBounds?: Type<OmniType>, upperBounds?: Type<OmniType>) {
    this.name = name;
    this.sourceIdentifier = sourceIdentifier;
    this.lowerBounds = lowerBounds;
    this.upperBounds = upperBounds;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclaration(this, visitor);
  }
}

export class GenericTypeDeclarationList extends AbstractJavaNode {
  types: GenericTypeDeclaration[];

  constructor(types: GenericTypeDeclaration[]) {
    super();
    this.types = types;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclarationList(this, visitor);
  }
}

// Simplify so we don't give block, but enum entries?
export class EnumDeclaration extends AbstractObjectDeclaration<OmniEnumType> {
  constructor(type: RegularType<OmniEnumType>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitIfStatement(this, visitor);
  }
}

export class IfElseStatement extends AbstractJavaNode {
  ifStatements: IfStatement[];
  elseBlock?: Block | undefined;

  constructor(ifStatements: IfStatement[], elseBlock?: Block) {
    super();
    this.ifStatements = ifStatements;
    this.elseBlock = elseBlock;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitIfElseStatement(this, visitor);
  }
}

export class TernaryExpression extends AbstractJavaNode {
  predicate: Predicate;
  passing: AbstractExpression;
  failing: AbstractExpression;

  constructor(condition: Predicate, passing: AbstractExpression, failing: AbstractExpression) {
    super();
    this.predicate = condition;
    this.passing = passing;
    this.failing = failing;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitTernaryExpression(this, visitor);
  }
}

export class ImportStatement extends AbstractJavaNode {
  type: RegularType<OmniType>;

  constructor(type: RegularType<OmniType>) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitImportStatement(this, visitor);
  }
}

export class ImportList extends AbstractJavaNode implements AstNodeWithChildren<ImportStatement> {
  children: ImportStatement[];

  constructor(children: ImportStatement[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitImportList(this, visitor);
  }
}

export class Statement extends AbstractJavaNode {
  child: AbstractJavaNode;

  constructor(child: AbstractJavaNode) {
    super();
    this.child = child;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitStatement(this, visitor);
  }
}

export class SuperConstructorCall extends AbstractJavaNode {
  parameters: ArgumentList;


  constructor(parameters: ArgumentList) {
    super();
    this.parameters = parameters;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitMethodCall(this, visitor);
  }
}

/**
 * TODO: Make this inherit from MethodCall?
 */
export class NewStatement extends AbstractJavaNode {
  type: Type<OmniType>;
  constructorArguments?: ArgumentList | undefined;

  constructor(type: Type<OmniType>, constructorArguments?: ArgumentList) {
    super();
    this.type = type;
    this.constructorArguments = constructorArguments;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitNewStatement(this, visitor);
  }
}

export class ThrowStatement extends AbstractJavaNode {
  expression: AbstractExpression;

  constructor(expression: AbstractExpression) {
    super();
    this.expression = expression;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitThrowStatement(this, visitor);
  }
}

export class HardCoded extends AbstractJavaNode {
  content: string;

  constructor(content: string) {
    super();
    this.content = content;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitHardCoded(this, visitor);
  }
}

export class ClassName extends AbstractExpression {
  type: Type<OmniType>;

  constructor(type: Type<OmniType>) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitClassName(this, visitor);
  }
}

export class ClassReference extends AbstractExpression {
  className: ClassName;

  constructor(type: Type<OmniType>) {
    super();
    this.className = new ClassName(type);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitClassReference(this, visitor);
  }
}

export class RuntimeTypeMapping extends AbstractJavaNode {
  fields: Field[];
  getters: FieldBackedGetter[];
  methods: MethodDeclaration[];

  constructor(types: OmniType[], options: JavaOptions) {
    super();

    this.fields = [];
    this.getters = [];
    this.methods = [];

    const untypedField = new Field(
      new RegularType({
        kind: OmniTypeKind.UNKNOWN,
      }),
      new Identifier('_raw', 'raw'),
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL),
      ),
      undefined,
      new AnnotationList(
        new Annotation(
          new RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'com.fasterxml.jackson.annotation.JsonValue'}),
        ),
      ),
    );
    const untypedGetter = new FieldBackedGetter(
      untypedField,
    );

    this.fields.push(untypedField);
    this.getters.push(untypedGetter);

    for (const type of types) {

      const typedFieldName = this.getFieldName(type);

      const typedField = new Field(
        JavaAstUtils.createTypeNode(type),
        new Identifier(`_${typedFieldName}`),
      );
      const typedFieldReference = new FieldReference(typedField);

      const argumentDeclarationList = new ArgumentDeclarationList();
      let conversionExpression: AbstractExpression;
      if (options.unknownType == UnknownKind.MUTABLE_OBJECT) {
        const objectMapperReference = new Identifier('objectMapper');
        const objectMapperDeclaration = new ArgumentDeclaration(
          new RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'com.fasterxml.jackson.ObjectMapper'}),
          objectMapperReference,
        );

        argumentDeclarationList.children.push(objectMapperDeclaration);
        conversionExpression = new MethodCall(
          new DeclarationReference(objectMapperDeclaration),
          new Identifier('convertValue'),
          new ArgumentList(
            new FieldReference(untypedField),
            new ClassReference(typedField.type),
          ),
        );
      } else {
        conversionExpression = new Literal('Conversion path unknown');
      }

      const typedGetter = new MethodDeclaration(
        new MethodDeclarationSignature(
          new Identifier(JavaUtil.getGetterName(typedFieldName, typedField.type.omniType)),
          typedField.type,
          argumentDeclarationList,
        ),
        new Block(
          // First check if we have already cached the result.
          new IfStatement(
            new Predicate(
              typedFieldReference,
              TokenType.NOT_EQUALS,
              new Literal(null),
            ),
            new Block(
              new Statement(
                new ReturnStatement(
                  typedFieldReference,
                ),
              ),
            ),
          ),
          // If not, then try to convert the raw value into the target type and cache it.
          new Statement(
            new ReturnStatement(
              new BinaryExpression(
                typedFieldReference,
                new JavaToken(TokenType.ASSIGN),
                conversionExpression,
              ),
            ),
          ),
        ),
      );

      this.fields.push(typedField);
      this.methods.push(typedGetter);
    }
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitRuntimeTypeMapping(this, visitor);
  }

  private getFieldName(type: OmniType): string {

    // if (type.kind == OmniTypeKind.PRIMITIVE) {
    //
    //   // If it is a primitive, we do not care about the 'name' of the type.
    //   // We only care about what it actually is.
    //   // This is a preference, but might be wrong. Maybe make it an option?
    //   return camelCase(JavaUtil.getPrimitiveKindName(type.primitiveKind, true));
    // }

    // TODO: This is most likely wrong, will give name with package and whatnot.
    const javaName = JavaUtil.getName({
      type: type,
    });

    return Case.camel(javaName);
  }
}
