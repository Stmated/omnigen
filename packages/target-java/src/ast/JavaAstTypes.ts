import {
  AstNode,
  AstNodeWithChildren,
  AstToken,
  AstVisitor,
  LiteralValue,
  OmniEnumType,
  OmniGenericSourceIdentifierType,
  OmniHardcodedReferenceType,
  OmniPrimitiveKind,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  Reducer,
  ReducerResult,
  VisitResult,
} from '@omnigen/core';
import {JavaUtil} from '../util';
import {AstFreeTextVisitor, JavaVisitor} from '../visit';
import {OmniUtil} from '@omnigen/core-util';

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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<JavaToken> {
    return reducer.reduceToken(this, reducer);
  }
}

export abstract class AbstractJavaNode implements AstNode {
  abstract visit<R>(visitor: JavaVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AbstractJavaNode>;
}

export interface LocallyNamedType {
  getLocalName(): string | undefined;
  setLocalName(value: string | undefined): void;
  getImportName(): string | undefined;
  setImportName(value: string | undefined): void;
}

export interface TypeNode<T extends OmniType = OmniType> extends AstNode {
  omniType: T;
  implementation?: boolean | undefined;
  getLocalName(): string | undefined;
  getImportName(): string | undefined;

  reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<TypeNode>;
}

export class RegularType<T extends OmniType = OmniType> extends AbstractJavaNode implements LocallyNamedType, TypeNode<T> {
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceRegularType(this, reducer);
  }
}

export class WildcardType<T extends OmniUnknownType = OmniUnknownType> extends AbstractJavaNode implements LocallyNamedType, TypeNode<T> {
  readonly omniType: T;
  readonly lowerBound?: TypeNode | undefined;
  private _localName?: string | undefined;
  private _importName?: string | undefined;
  readonly implementation?: boolean | undefined;

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

  constructor(omniType: T, lowerBound?: TypeNode | undefined, implementation?: boolean | undefined) {
    super();
    this.omniType = omniType;
    this.lowerBound = lowerBound;
    this.implementation = implementation;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitWildcardType(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<WildcardType> {
    return reducer.reduceWildcardType(this, reducer);
  }
}

// export type GenericTypeBaseType = OmniGenericTargetType | OmniHardcodedReferenceType;

/**
 * TODO: Remove this, and move the functionality of deciding way to render to the renderer itself?
 *        That way RegularType and GenericType can just become Type, and skip the JavaAstUtils method
 *
 * TODO: Introduce generics to this? So we can be more restrictive
 */
export class GenericType<
  T extends OmniType = OmniType,
  BT extends OmniType = OmniType
> extends AbstractJavaNode implements TypeNode<T> {

  readonly omniType: T;
  readonly baseType: RegularType<BT>;
  readonly genericArguments: TypeNode[];

  getLocalName(): string | undefined {
    throw new Error(`Cannot get the local name of generic type '${OmniUtil.describe(this.baseType.omniType)}', it needs to be built by the renderer`);
  }

  getImportName(): string | undefined {
    return this.baseType.getImportName();
  }

  constructor(omniType: T, baseType: RegularType<BT>, genericArguments: TypeNode[]) {
    super();
    this.omniType = omniType;
    this.baseType = baseType;
    this.genericArguments = genericArguments;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericType(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceGenericType(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Identifier> {
    return reducer.reduceIdentifier(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Literal> {
    return reducer.reduceLiteral(this, reducer);
  }
}

// type AnnotationValue = Literal | Annotation | ArrayInitializer<Annotation> | ClassReference | StaticMemberReference;

export class AnnotationKeyValuePair extends AbstractJavaNode {
  key: Identifier | undefined;
  value: AstNode;

  constructor(key: Identifier | undefined, value: AstNode) {
    super();
    this.key = key;
    this.value = value;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePair(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AnnotationKeyValuePair> {
    return reducer.reduceAnnotationKeyValuePair(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AnnotationKeyValuePairList> {
    return reducer.reduceAnnotationKeyValuePairList(this, reducer);
  }
}

export class Annotation extends AbstractJavaNode {
  readonly type: RegularType<OmniHardcodedReferenceType>;
  readonly pairs?: AnnotationKeyValuePairList | undefined;

  constructor(type: RegularType<OmniHardcodedReferenceType>, pairs?: AnnotationKeyValuePairList) {
    super();
    this.type = type;
    this.pairs = pairs;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotation(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Annotation> {
    return reducer.reduceAnnotation(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AnnotationList> {
    return reducer.reduceAnnotationList(this, reducer);
  }
}

export class ArrayInitializer<T extends AbstractJavaNode = AbstractJavaNode> extends AbstractJavaNode implements AstNodeWithChildren<T> {
  children: T[];

  constructor(...children: T[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitArrayInitializer(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ArrayInitializer> {
    return reducer.reduceArrayInitializer(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<StaticMemberReference> {
    return reducer.reduceStaticMemberReference(this, reducer);
  }
}

export class Parameter extends AbstractJavaNode {
  type: TypeNode;
  identifier: Identifier;
  annotations?: AnnotationList | undefined;

  constructor(type: TypeNode, identifier: Identifier, annotations?: AnnotationList) {
    super();
    this.type = type;
    this.identifier = identifier;
    this.annotations = annotations;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitParameter(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Parameter> {
    return reducer.reduceParameter(this, reducer);
  }
}

export class ParameterList extends AbstractJavaNode implements AstNodeWithChildren<Parameter> {
  children: Parameter[];

  constructor(...children: Parameter[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitParameterList(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ParameterList> {
    return reducer.reduceParameterList(this, reducer);
  }
}

export class ConstructorParameter extends Parameter {

  field: Field;

  constructor(field: Field, type: TypeNode, identifier: Identifier, annotations?: AnnotationList) {
    super(type, identifier, annotations);
    this.field = field;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitConstructorParameter(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ConstructorParameter> {
    return reducer.reduceConstructorParameter(this, reducer);
  }
}

export class ConstructorParameterList extends AbstractJavaNode implements AstNodeWithChildren<ConstructorParameter> {
  children: ConstructorParameter[];

  constructor(...children: ConstructorParameter[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitConstructorParameterList(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ConstructorParameterList> {
    return reducer.reduceConstructorParameterList(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<BinaryExpression> {
    return reducer.reduceBinaryExpression(this, reducer);
  }
}

export class AssignExpression extends BinaryExpression {
  constructor(left: AbstractExpression, right: AbstractExpression) {
    super(left, new JavaToken(TokenType.ASSIGN), right);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAssignExpression(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AssignExpression> {
    return reducer.reduceAssignExpression(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<PackageDeclaration> {
    return reducer.reducePackage(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Predicate> {
    return reducer.reducePredicate(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ArgumentList> {
    return reducer.reduceArgumentList(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<EnumItemList> {
    return reducer.reduceEnumItemList(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Block> {
    return reducer.reduceBlock(this, reducer);
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
  ABSTRACT,
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Modifier> {
    return reducer.reduceModifier(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ModifierList> {
    return reducer.reduceModifierList(this, reducer);
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

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeText(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeText(this, reducer);
  }
}

export class FreeTexts extends AbstractFreeText implements AstNodeWithChildren<AnyFreeText> {
  readonly children: AnyFreeText[];

  constructor(...children: FriendlyFreeTextIn[]) {
    super();
    this.children = children.map(it => fromFriendlyFreeText(it));
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTexts(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTexts> {
    return reducer.reduceFreeTexts(this, reducer);
  }
}

export type FriendlyFreeTextIn = AnyFreeText | string | Array<FriendlyFreeTextIn>;

const fromFriendlyFreeText = (text: FriendlyFreeTextIn): AnyFreeText => {
  if (typeof text == 'string') {
    return new FreeText(text);
  } else {
    if (Array.isArray(text)) {
      return new FreeTexts(...text.map(it => fromFriendlyFreeText(it)));
    } else {
      return text;
    }
  }
};

export class FreeTextLine extends AbstractFreeText {
  readonly child: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.child = fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextLine(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextLine> {
    return reducer.reduceFreeTextLine(this, reducer);
  }
}

export class FreeTextIndent extends AbstractFreeText {
  readonly child: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.child = fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextIndent(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextIndent> {
    return reducer.reduceFreeTextIndent(this, reducer);
  }
}

export class FreeTextParagraph extends AbstractFreeText {
  readonly child: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.child = fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextParagraph(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextParagraph> {
    return reducer.reduceFreeTextParagraph(this, reducer);
  }
}

export class FreeTextList extends AbstractFreeText {
  readonly children: AnyFreeText[];
  readonly ordered: boolean;

  constructor(children: FriendlyFreeTextIn[], ordered?: boolean) {
    super();
    this.children = children.map(it => fromFriendlyFreeText(it));
    this.ordered = ordered ?? false;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextList(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextList> {
    return reducer.reduceFreeTextList(this, reducer);
  }
}

export class FreeTextHeader extends AbstractFreeText {
  readonly level: number;
  readonly child: AnyFreeText;

  constructor(level: number, text: FriendlyFreeTextIn) {
    super();
    this.level = level;
    this.child = fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextHeader(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextHeader(this, reducer);
  }
}

export class FreeTextSection extends AbstractFreeText {
  readonly header: FreeTextHeader;
  readonly content: AnyFreeText;

  constructor(header: FreeTextHeader, content: FriendlyFreeTextIn) {
    super();
    this.header = header;
    this.content = fromFriendlyFreeText(content);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextSection(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextSection(this, reducer);
  }
}

export class FreeTextTypeLink extends AbstractFreeText {
  readonly type: TypeNode;

  constructor(type: TypeNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextTypeLink(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextTypeLink(this, reducer);
  }
}

export class FreeTextMethodLink extends AbstractFreeText {
  readonly type: TypeNode;
  readonly method: AstNode;

  constructor(type: TypeNode, method: AstNode) {
    super();
    this.type = type;
    this.method = method;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextMethodLink(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextMethodLink(this, reducer);
  }
}

export class FreeTextPropertyLink extends AbstractFreeText {
  readonly type: TypeNode;
  readonly property: OmniProperty;

  constructor(type: TypeNode, property: OmniProperty) {
    super();
    this.type = type;
    this.property = property;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextPropertyLink(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextPropertyLink(this, reducer);
  }
}

export type AnyFreeText =
  | FreeText
  | FreeTextParagraph
  | FreeTextLine
  | FreeTextIndent
  | FreeTextHeader
  | FreeTextSection
  | FreeTextList
  | FreeTextPropertyLink
  | FreeTextMethodLink
  | FreeTextTypeLink
  | FreeTexts;

export class Comment extends AbstractJavaNode {
  text: AnyFreeText;

  constructor(text: AnyFreeText) {
    super();
    this.text = text;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitComment(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Comment> {
    return reducer.reduceComment(this, reducer);
  }
}

export class CommentBlock extends AbstractJavaNode {
  text: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.text = fromFriendlyFreeText(text);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitCommentBlock(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<CommentBlock> {
    return reducer.reduceCommentBlock(this, reducer);
  }
}

/**
 * NOTE: Split into Field and FieldDeclaration? Or rename it? ArgumentDeclaration and VariableDeclaration precedence
 */
export class Field extends AbstractJavaNode {
  identifier: Identifier;
  type: TypeNode;
  initializer?: AbstractExpression | undefined;
  comments?: CommentBlock | undefined;
  modifiers: ModifierList;
  annotations?: AnnotationList | undefined;
  property?: OmniProperty;

  constructor(type: TypeNode, name: Identifier, modifiers?: ModifierList, initializer?: AbstractExpression | undefined, annotations?: AnnotationList) {
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Field> {
    return reducer.reduceField(this, reducer);
  }
}

export class MethodDeclarationSignature extends AbstractJavaNode {

  identifier: Identifier;
  type: TypeNode;
  comments?: CommentBlock | undefined;
  annotations?: AnnotationList | undefined;
  modifiers: ModifierList;
  parameters?: ParameterList | undefined;
  throws?: TypeList;

  constructor(
    identifier: Identifier,
    type: TypeNode,
    parameters?: ParameterList,
    modifiers?: ModifierList,
    annotations?: AnnotationList,
    comments?: CommentBlock,
    throws?: TypeList,
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<MethodDeclarationSignature> {
    return reducer.reduceMethodDeclarationSignature(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AbstractMethodDeclaration> {
    return reducer.reduceAbstractMethodDeclaration(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<MethodDeclaration> {
    return reducer.reduceMethodDeclaration(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ReturnStatement> {
    return reducer.reduceReturnStatement(this, reducer);
  }
}

export class SelfReference extends AbstractExpression {

  constructor() {
    super();
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitSelfReference(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<SelfReference> {
    return reducer.reduceSelfReference(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldReference> {
    return reducer.reduceFieldReference(this, reducer);
  }
}

export class DeclarationReference extends AbstractJavaNode {
  declaration: VariableDeclaration | Parameter;

  constructor(declaration: VariableDeclaration | Parameter) {
    super();
    this.declaration = declaration;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitDeclarationReference(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<DeclarationReference> {
    return reducer.reduceDeclarationReference(this, reducer);
  }
}

export class VariableDeclaration extends AbstractJavaNode {
  identifier: Identifier;
  type?: TypeNode | undefined;
  initializer?: AbstractExpression | undefined;
  constant?: boolean | undefined;

  constructor(variableName: Identifier, initializer?: AbstractExpression, type?: TypeNode | undefined, constant?: boolean) {
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<VariableDeclaration> {
    return reducer.reduceVariableDeclaration(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldBackedGetter> {
    return reducer.reduceFieldBackedGetter(this, reducer);
  }
}

export class FieldBackedSetter extends AbstractFieldBackedMethodDeclaration {

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentBlock) {
    const parameter = new Parameter(
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
        new ParameterList(parameter),
        undefined,
        annotations,
        comments,
      ),
      new Block(
        new Statement(
          new AssignExpression(
            new FieldReference(field),
            new DeclarationReference(parameter),
          ),
        ),
      ));
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldBackedSetter> {
    return reducer.reduceFieldBackedSetter(this, reducer);
  }
}

export class FieldGetterSetter extends AbstractJavaNode {
  field: Field;
  readonly getter: FieldBackedGetter;
  readonly setter: FieldBackedSetter;

  constructor(
    type: TypeNode,
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldGetterSetter> {
    return reducer.reduceFieldGetterSetter(this, reducer);
  }
}

export class Cast extends AbstractJavaNode {
  toType: TypeNode;
  expression: AbstractExpression;

  constructor(toType: TypeNode, expression: AbstractExpression) {
    super();
    this.toType = toType;
    this.expression = expression;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitCast(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Cast> {
    return reducer.reduceCast(this, reducer);
  }
}

export class TypeList<T extends OmniType = OmniType> extends AbstractJavaNode implements AstNodeWithChildren<TypeNode<T>> {
  children: TypeNode<T>[];

  constructor(types: TypeNode<T>[]) {
    super();
    this.children = types;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitTypeList(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TypeList> {
    return reducer.reduceTypeList(this, reducer);
  }
}

export class ExtendsDeclaration extends AbstractJavaNode {
  type: TypeNode;

  constructor(type: TypeNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitExtendsDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ExtendsDeclaration> {
    return reducer.reduceExtendsDeclaration(this, reducer);
  }
}

export class ImplementsDeclaration extends AbstractJavaNode {
  types: TypeList;

  constructor(types: TypeList) {
    super();
    this.types = types;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitImplementsDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ImplementsDeclaration> {
    return reducer.reduceImplementsDeclaration(this, reducer);
  }
}

/**
 * TODO: Make the Type node generic, and possible to limit which OmniType is allowed: Class, Interface, Enum
 */
export abstract class AbstractObjectDeclaration<T extends OmniType = OmniType> extends AbstractJavaNode implements Identifiable {
  name: Identifier;
  /**
   * TODO: Make the "Type" generic if possible, since we for example here can know what type it is.
   */
  type: TypeNode<T>;
  comments?: CommentBlock | undefined;
  annotations?: AnnotationList | undefined;
  modifiers: ModifierList;
  extends?: ExtendsDeclaration | undefined;
  implements?: ImplementsDeclaration | undefined;
  body: Block;

  protected constructor(type: TypeNode<T>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super();
    this.type = type;
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.name = name;
    this.body = body;
  }

  abstract reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<AbstractObjectDeclaration<T>>;
}

export interface Identifiable extends AstNode {
  name: Identifier;

  reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<Identifiable>;
}

export class CompilationUnit extends AbstractJavaNode implements AstNodeWithChildren<Identifiable> {
  children: Identifiable[];
  packageDeclaration: PackageDeclaration;
  imports: ImportList;

  constructor(packageDeclaration: PackageDeclaration, imports: ImportList, ...children: Identifiable[]) {
    super();
    this.packageDeclaration = packageDeclaration;
    this.imports = imports;
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitCompilationUnit(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<CompilationUnit> {
    return reducer.reduceCompilationUnit(this, reducer);
  }

  toString() {
    if (this.children.length > 0) {
      return this.children[0].name.value;
    }

    return 'N/A';
  }
}

// export type ConstructorOwnerDeclaration = ClassDeclaration | EnumDeclaration;

export class ConstructorDeclaration extends AbstractJavaNode {

  modifiers: ModifierList;
  parameters?: ConstructorParameterList | undefined;
  annotations?: AnnotationList | undefined;
  comments?: CommentBlock | undefined;
  body?: Block | undefined;

  constructor(parameters?: ConstructorParameterList, body?: Block, modifiers?: ModifierList) {
    super();
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.parameters = parameters;
    this.body = body;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitConstructor(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ConstructorDeclaration> {
    return reducer.reduceConstructor(this, reducer);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration {

  genericParameterList?: GenericTypeDeclarationList | undefined;

  constructor(type: TypeNode, name: Identifier, body: Block, modifiers?: ModifierList, genericParameterList?: GenericTypeDeclarationList) {
    super(type, name, body, modifiers);
    this.genericParameterList = genericParameterList;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitClassDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ClassDeclaration> {
    return reducer.reduceClassDeclaration(this, reducer);
  }
}

/**
 * TODO: Remove this and instead just add a boolean to the ClassDeclaration and GenericClassDeclaration?
 */
export class InterfaceDeclaration extends AbstractObjectDeclaration {
  constructor(type: TypeNode, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<InterfaceDeclaration> {
    return reducer.reduceInterfaceDeclaration(this, reducer);
  }
}

export class GenericTypeDeclaration implements AstNode {
  sourceIdentifier?: OmniGenericSourceIdentifierType | undefined;
  name: Identifier;
  lowerBounds?: TypeNode | undefined;
  upperBounds?: TypeNode | undefined;

  constructor(name: Identifier, sourceIdentifier?: OmniGenericSourceIdentifierType, lowerBounds?: TypeNode, upperBounds?: TypeNode) {
    this.name = name;
    this.sourceIdentifier = sourceIdentifier;
    this.lowerBounds = lowerBounds;
    this.upperBounds = upperBounds;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<GenericTypeDeclaration> {
    return reducer.reduceGenericTypeDeclaration(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<GenericTypeDeclarationList> {
    return reducer.reduceGenericTypeDeclarationList(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<EnumDeclaration> {
    return reducer.reduceEnumDeclaration(this, reducer);
  }
}

export class EnumItem extends AbstractJavaNode {
  identifier: Identifier;
  value: Literal;
  comment?: Comment | undefined;

  constructor(identifier: Identifier, value: Literal, comment?: Comment) {
    super();
    this.identifier = identifier;
    this.value = value;
    this.comment = comment;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItem(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<EnumItem> {
    return reducer.reduceEnumItem(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<IfStatement> {
    return reducer.reduceIfStatement(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<IfElseStatement> {
    return reducer.reduceIfElseStatement(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TernaryExpression> {
    return reducer.reduceTernaryExpression(this, reducer);
  }
}

export class ImportStatement extends AbstractJavaNode {
  type: TypeNode;

  constructor(type: TypeNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitImportStatement(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ImportStatement> {
    return reducer.reduceImportStatement(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ImportList> {
    return reducer.reduceImportList(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Statement> {
    return reducer.reduceStatement(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<SuperConstructorCall> {
    return reducer.reduceSuperConstructorCall(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<MethodCall> {
    return reducer.reduceMethodCall(this, reducer);
  }
}

/**
 * TODO: Make this inherit from MethodCall?
 */
export class NewStatement extends AbstractJavaNode {
  type: TypeNode;
  constructorArguments?: ArgumentList | undefined;

  constructor(type: TypeNode, constructorArguments?: ArgumentList) {
    super();
    this.type = type;
    this.constructorArguments = constructorArguments;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitNewStatement(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<NewStatement> {
    return reducer.reduceNewStatement(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ThrowStatement> {
    return reducer.reduceThrowStatement(this, reducer);
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<HardCoded> {
    return reducer.reduceHardCoded(this, reducer);
  }
}

export class ClassName extends AbstractExpression {
  type: TypeNode;

  constructor(type: TypeNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitClassName(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ClassName> {
    return reducer.reduceClassName(this, reducer);
  }
}

export class ClassReference extends AbstractExpression {
  className: ClassName;

  constructor(className: ClassName) {
    super();
    this.className = className;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitClassReference(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ClassReference> {
    return reducer.reduceClassReference(this, reducer);
  }
}
