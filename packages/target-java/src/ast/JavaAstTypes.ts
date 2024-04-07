import {
  AstNode,
  AstNodeWithChildren,
  AstVisitor,
  LiteralValue,
  OmniArrayType,
  OmniDecoratingType,
  OmniEnumType,
  OmniGenericSourceIdentifierType,
  OmniHardcodedReferenceType,
  OmniPrimitiveKinds,
  OmniProperty,
  OmniType,
  OmniUnknownType,
  Reducer,
  ReducerResult, Reference, RootAstNode,
  TypeNode,
  VisitResult,
} from '@omnigen/core';
import {AstFreeTextVisitor, JavaVisitor} from '../visit';
import {OmniUtil} from '@omnigen/core-util';
import {JavaReducer} from '../reduce';
import {JavaAstUtils} from '../transform';

export enum TokenKind {
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

class CounterSource {
  private _counter = 0;

  public getNext(): number {
    this._counter++;
    return this._counter;
  }
}

export abstract class AbstractJavaNode implements AstNode {

  private static readonly _COUNTER_SOURCE = new CounterSource();

  private _id?: number;

  get id(): number {
    if (this._id !== undefined) {
      return this._id;
    } else {
      this._id = AbstractJavaNode._COUNTER_SOURCE.getNext();
    }

    return this._id;
  }

  public setId(id: number): this {
    if (this._id !== undefined && this._id !== id) {
      throw new Error(`Not allowed to change id if one has already been set, existing:${this._id}, new:${id}`);
    }
    this._id = id;
    return this;
  }

  public withIdFrom(node: AstNode): this {

    const copiedId = node.id;
    return this.setId(copiedId);
  }

  abstract visit<R>(visitor: JavaVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AstNode>;
}

export class JavaToken extends AbstractJavaNode {
  type: TokenKind;

  constructor(type: TokenKind) {
    super();
    this.type = type;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitToken(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<JavaToken> {
    return reducer.reduceToken(this, reducer);
  }
}

export class EdgeType<T extends OmniType = OmniType> extends AbstractJavaNode implements TypeNode<T> {
  omniType: T;
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

  constructor(omniType: T, implementation?: boolean) {
    super();
    this.omniType = omniType;
    this.implementation = implementation;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitEdgeType(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceEdgeType(this, reducer);
  }
}

export class ArrayType<T extends OmniArrayType = OmniArrayType> extends AbstractJavaNode implements TypeNode<T> {
  readonly omniType: T;
  readonly of: TypeNode;
  readonly implementation?: boolean | undefined;

  constructor(omniType: T, of: TypeNode, implementation?: boolean | undefined) {
    super();
    this.omniType = omniType;
    this.of = of;
    this.implementation = implementation;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitArrayType(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<ArrayType> {
    return reducer.reduceArrayType(this, reducer);
  }
}

export class WildcardType<T extends OmniUnknownType = OmniUnknownType> extends AbstractJavaNode implements TypeNode<T> {
  readonly omniType: T;
  readonly implementation?: boolean | undefined;

  constructor(omniType: T, implementation?: boolean | undefined) {
    super();
    this.omniType = omniType;
    this.implementation = implementation;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitWildcardType(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceWildcardType(this, reducer);
  }
}

export class BoundedType extends AbstractJavaNode implements TypeNode {
  readonly omniType: OmniType;
  readonly type: TypeNode;

  /**
   * In the context of `A extends B`, A is a bounded Type Parameter with an upper bound B. This means A can be any type that is a subclass of B or B itself. Thus, B represents an upper bound.
   */
  readonly upperBound?: TypeNode | undefined;

  /**
   * In the context of `A super B`, A is a bounded Type Parameter with a lower bound B. This means A can be any type that is a super class of B or B itself.
   */
  readonly lowerBound?: TypeNode | undefined;

  constructor(omniType: OmniType, type: TypeNode, upperBound?: TypeNode | undefined, lowerBound?: TypeNode | undefined) {
    super();
    this.omniType = omniType;
    this.type = type;
    this.upperBound = upperBound;
    this.lowerBound = lowerBound;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitBoundedType(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceBoundedType(this, reducer);
  }
}

/**
 * TODO: Remove this, and move the functionality of deciding way to render to the renderer itself?
 *        That way RegularType and GenericType can just become Type, and skip the JavaAstUtils method
 *
 * TODO: Introduce generics to this? So we can be more restrictive
 *
 * TODO: Force 'baseType' to be the inner type -- ie NOT a GENERIC_TARGET or similar
 * TODO: Force 'genericArguments' to be of OmniType GENERIC_TARGET_IDENTIFIER
 */
export class GenericType<
  T extends OmniType = OmniType,
  BT extends OmniType = OmniType
> extends AbstractJavaNode implements TypeNode<T> {

  readonly omniType: T;
  readonly baseType: EdgeType<BT>;
  readonly genericArguments: TypeNode[];

  constructor(omniType: T, baseType: EdgeType<BT>, genericArguments: TypeNode[]) {
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
  implicit?: boolean;

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

export abstract class AbstractJavaExpression extends AbstractJavaNode {
}

export class Literal extends AbstractJavaExpression {
  readonly value: LiteralValue;
  readonly primitiveKind: OmniPrimitiveKinds;

  constructor(value: LiteralValue, primitiveKind?: OmniPrimitiveKinds) {
    super();
    this.value = value;
    this.primitiveKind = primitiveKind ?? OmniUtil.nativeLiteralToPrimitiveKind(value);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitLiteral(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Literal> {
    return reducer.reduceLiteral(this, reducer);
  }
}

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
  readonly type: EdgeType<OmniHardcodedReferenceType>;
  readonly pairs?: AnnotationKeyValuePairList | undefined;

  constructor(type: EdgeType<OmniHardcodedReferenceType>, pairs?: AnnotationKeyValuePairList) {
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
  member: AbstractJavaExpression;

  constructor(target: StaticTarget, member: AbstractJavaExpression) {
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

  fieldRef: FieldReference;

  constructor(field: FieldReference, type: TypeNode, identifier: Identifier, annotations?: AnnotationList) {
    super(type, identifier, annotations);
    this.fieldRef = field;
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
  left: AbstractJavaExpression;
  token: JavaToken;
  right: AbstractJavaExpression;

  constructor(left: AbstractJavaExpression, token: JavaToken, right: AbstractJavaExpression) {
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
  constructor(left: AbstractJavaExpression, right: AbstractJavaExpression) {
    super(left, new JavaToken(TokenKind.ASSIGN), right);
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
  TokenKind.EQUALS
  | TokenKind.NOT_EQUALS
  | TokenKind.GT
  | TokenKind.LT
  | TokenKind.LTE
  | TokenKind.GTE;

export class Predicate extends BinaryExpression {

  constructor(left: AbstractJavaExpression, token: TokenTypePredicate, right: AbstractJavaExpression) {
    super(left, new JavaToken(token), right);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitPredicate(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Predicate> {
    return reducer.reducePredicate(this, reducer);
  }
}

export class ArgumentList extends AbstractJavaNode implements AstNodeWithChildren<AbstractJavaExpression> {
  children: AbstractJavaExpression[];

  constructor(...children: AbstractJavaExpression[]) {
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

export class Nodes extends AbstractJavaNode implements AstNodeWithChildren {
  children: AstNode[];

  constructor(...children: AstNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitNodes(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AbstractJavaNode> {
    return reducer.reduceNodes(this, reducer);
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

export class Block extends AbstractJavaNode implements AstNodeWithChildren {
  children: AstNode[];
  enclosed?: boolean | undefined;
  compact?: boolean | undefined;

  constructor(...children: AstNode[]) {
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
  children: Array<Modifier>;

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
      if (text.length == 1) {
        return fromFriendlyFreeText(text[0]);
      }

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
  readonly type: AstNode;

  constructor(type: AstNode) {
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
  readonly type: AstNode;
  readonly method: AstNode;

  constructor(type: AstNode, method: AstNode) {
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
  readonly type: AstNode;
  readonly property: OmniProperty;

  constructor(type: AstNode, property: OmniProperty) {
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
  initializer?: AbstractJavaExpression | undefined;
  comments?: CommentBlock | undefined;
  modifiers: ModifierList;
  annotations?: AnnotationList | undefined;
  property?: OmniProperty;

  constructor(type: TypeNode, name: Identifier, modifiers?: ModifierList, initializer?: AbstractJavaExpression | undefined, annotations?: AnnotationList) {
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AbstractJavaNode> {
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<MethodDeclaration | MethodDeclarationSignature | Statement | Field | FieldBackedGetter> {
    return reducer.reduceMethodDeclaration(this, reducer);
  }
}

export class ReturnStatement extends AbstractJavaNode {
  expression: AbstractJavaExpression;

  constructor(expression: AbstractJavaExpression) {
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

export class SelfReference extends AbstractJavaExpression {

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

export class FieldReference extends AbstractJavaExpression implements Reference<Field> {
  targetId: number;

  constructor(target: number | Field) {
    super();
    this.targetId = (typeof target === 'number') ? target : target.id;
  }

  public resolve(root: RootAstNode): Field {
    return root.resolveNodeRef(this);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldReference(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldReference> {
    return reducer.reduceFieldReference(this, reducer);
  }
}

export class DeclarationReference extends AbstractJavaNode implements Reference<VariableDeclaration | Parameter> {
  targetId: number;

  constructor(target: number | VariableDeclaration | Parameter) {
    super();
    this.targetId = (typeof target === 'number') ? target : target.id;
  }

  public resolve(root: RootAstNode): VariableDeclaration | Parameter {
    return root.resolveNodeRef(this);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitDeclarationReference(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceDeclarationReference(this, reducer);
  }
}

export class VariableDeclaration extends AbstractJavaNode {
  identifier: Identifier;
  type?: TypeNode | undefined;
  initializer?: AbstractJavaExpression | undefined;
  constant?: boolean | undefined;

  constructor(variableName: Identifier, initializer?: AbstractJavaExpression, type?: TypeNode | undefined, constant?: boolean) {
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

export class FieldBackedGetter extends AbstractJavaNode {

  readonly fieldRef: Reference<Field>;
  readonly annotations?: AnnotationList | undefined;
  readonly comments?: CommentBlock | undefined;
  readonly getterName?: Identifier | undefined;

  constructor(fieldRef: Reference<Field>, annotations?: AnnotationList, comments?: CommentBlock, getterName?: Identifier) {
    super();
    this.fieldRef = fieldRef;
    this.annotations = annotations;
    this.comments = comments;
    this.getterName = getterName;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedGetter(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldBackedGetter | MethodDeclarationSignature | Statement | Field | MethodDeclaration> {
    return reducer.reduceFieldBackedGetter(this, reducer);
  }
}

export class FieldBackedSetter extends AbstractJavaNode {

  readonly fieldRef: Reference<Field>;
  readonly annotations?: AnnotationList | undefined;
  readonly comments?: CommentBlock | undefined;

  constructor(fieldRef: Reference<Field>, annotations?: AnnotationList, comments?: CommentBlock) {
    super();
    this.fieldRef = fieldRef;
    this.annotations = annotations;
    this.comments = comments;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<FieldBackedSetter | MethodDeclaration> {
    return reducer.reduceFieldBackedSetter(this, reducer);
  }
}

export class Cast extends AbstractJavaNode {
  toType: TypeNode;
  expression: AbstractJavaExpression;

  constructor(toType: TypeNode, expression: AbstractJavaExpression) {
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
  types: TypeList;

  constructor(type: TypeList) {
    super();
    this.types = type;
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
export abstract class AbstractObjectDeclaration<T extends OmniType = OmniType> extends AbstractJavaNode implements Identifiable, Typed {
  name: Identifier;
  type: TypeNode<T>;
  comments?: CommentBlock | undefined;
  annotations?: AnnotationList | undefined;
  modifiers: ModifierList;
  extends?: ExtendsDeclaration | undefined;
  implements?: ImplementsDeclaration | undefined;
  body: Block;
  genericParameterList?: GenericTypeDeclarationList | undefined;

  get omniType() {
    return this.type.omniType;
  }

  protected constructor(type: TypeNode<T>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super();
    this.type = type;
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.name = name;
    this.body = body;
  }

  abstract reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<Identifiable>;
}

export interface Identifiable extends AstNode {
  name: Identifier;

  reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<Identifiable>;
}

export interface Typed<T extends OmniType = OmniType> extends AstNode {
  omniType: T;
}

export class CompilationUnit extends AbstractJavaNode implements AstNodeWithChildren<Identifiable> {
  children: Identifiable[];
  packageDeclaration: PackageDeclaration;
  imports: ImportList;
  name?: string;

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
}

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

  inline?: boolean | undefined;

  constructor(type: TypeNode, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<Identifiable> {
    return reducer.reduceInterfaceDeclaration(this, reducer);
  }
}

export class GenericTypeDeclaration extends AbstractJavaNode {
  sourceIdentifier?: OmniGenericSourceIdentifierType | undefined;
  name: Identifier;
  /**
   * TODO: Check if can remove and use BoundedType instead
   */
  lowerBounds?: TypeNode | undefined;
  /**
   * TODO: Check if can remove and use BoundedType instead
   */
  upperBounds?: TypeNode | undefined;

  constructor(name: Identifier, sourceIdentifier?: OmniGenericSourceIdentifierType, upperBounds?: TypeNode, lowerBounds?: TypeNode) {
    super();
    this.name = name;
    this.sourceIdentifier = sourceIdentifier;
    this.upperBounds = upperBounds;
    this.lowerBounds = lowerBounds;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclaration(this, visitor);
  }

  reduce(reducer: JavaReducer): ReducerResult<GenericTypeDeclaration> {
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
  constructor(type: EdgeType<OmniEnumType>, name: Identifier, body: Block, modifiers?: ModifierList) {
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
  passing: AbstractJavaExpression;
  failing: AbstractJavaExpression;

  constructor(condition: Predicate, passing: AbstractJavaExpression, failing: AbstractJavaExpression) {
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
  arguments: ArgumentList;


  constructor(parameters: ArgumentList) {
    super();
    this.arguments = parameters;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitSuperConstructorCall(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<SuperConstructorCall> {
    return reducer.reduceSuperConstructorCall(this, reducer);
  }
}

export class MethodCall extends AbstractJavaNode {
  target: AbstractJavaExpression;
  methodName: Identifier;
  methodArguments?: ArgumentList;

  constructor(target: AbstractJavaExpression, methodName: Identifier, methodArguments: ArgumentList) {
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

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<AbstractJavaNode> {
    return reducer.reduceNewStatement(this, reducer);
  }
}

export class ThrowStatement extends AbstractJavaNode {
  expression: AbstractJavaExpression;

  constructor(expression: AbstractJavaExpression) {
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

export class ClassName extends AbstractJavaExpression {
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

export class ClassReference extends AbstractJavaExpression {
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

export class DecoratingTypeNode extends AbstractJavaNode implements TypeNode {
  of: TypeNode;
  omniType: OmniDecoratingType;

  constructor(of: TypeNode, omniType: OmniDecoratingType) {
    super();
    this.of = of;
    this.omniType = omniType;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitDecoratingTypeNode(this, visitor);
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<DecoratingTypeNode> {
    return reducer.reduceDecoratingTypeNode(this, reducer);
  }
}
