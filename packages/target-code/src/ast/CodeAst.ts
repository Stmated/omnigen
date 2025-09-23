import {
  AstNode,
  AstNodeWithChildren,
  AstVisitor,
  OmniArrayType,
  OmniDecoratingType,
  OmniEnumType,
  OmniGenericSourceIdentifierType,
  OmniHardcodedReferenceType, OmniPrimitiveConstantValue,
  OmniPrimitiveKinds,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  Reducer,
  ReducerResult,
  Reference,
  RootAstNode,
  TypeNode,
  VisitResult,
} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {AnyFreeText, FriendlyFreeTextIn} from './FreeText';
import {CodeVisitor} from '../visitor/CodeVisitor';
import {FreeTextUtils} from '../util/FreeTextUtils';
import {AbstractCodeNode} from './AbstractCodeNode';
import {VirtualAnnotationNode} from './VirtualAnnotationNode';

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

  COALESCE_NULL,

  OR,
  AND,

  BITWISE_OR,
}

export class EdgeType<T extends OmniType = OmniType> extends AbstractCodeNode implements TypeNode<T> {
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

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitEdgeType(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceEdgeType(this, reducer);
  }
}

export class ArrayType<T extends OmniArrayType = OmniArrayType> extends AbstractCodeNode implements TypeNode<T> {
  readonly omniType: T;
  itemTypeNode: TypeNode;
  readonly implementation?: boolean | undefined;

  constructor(omniType: T, of: TypeNode, implementation?: boolean | undefined) {
    super();
    this.omniType = omniType;
    this.itemTypeNode = of;
    this.implementation = implementation;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitArrayType(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<TypeNode | AstNode> {
    return reducer.reduceArrayType(this, reducer);
  }
}


export class WildcardType<T extends OmniUnknownType = OmniUnknownType> extends AbstractCodeNode implements TypeNode<T> {
  readonly omniType: T;
  readonly implementation?: boolean | undefined;

  constructor(omniType: T, implementation?: boolean | undefined) {
    super();
    this.omniType = omniType;
    this.implementation = implementation;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitWildcardType(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceWildcardType(this, reducer);
  }
}

export class BoundedType extends AbstractCodeNode implements TypeNode {
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

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitBoundedType(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceBoundedType(this, reducer);
  }
}

/**
 * TODO: Remove `omniType` so that it is easier to manually create a generic type node even for types that might be hardcoded
 */
export class GenericType<
  T extends OmniType = OmniType,
  BT extends OmniType = OmniType
> extends AbstractCodeNode implements TypeNode<T> {

  readonly omniType: T;
  readonly baseType: EdgeType<BT>;
  readonly genericArguments: TypeNode[];

  constructor(omniType: T, baseType: EdgeType<BT>, genericArguments: TypeNode[]) {
    super();
    this.omniType = omniType;
    this.baseType = baseType;
    this.genericArguments = genericArguments;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitGenericType(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceGenericType(this, reducer);
  }
}

export class Identifier extends AbstractCodeNode {
  value: string;
  original?: string | undefined;

  constructor(name: string, original?: string) {
    super();
    this.value = name;
    if (original && original !== name) {
      this.original = original;
    }
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitIdentifier(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Identifier> {
    return reducer.reduceIdentifier(this, reducer);
  }
}

export class GetterIdentifier extends AbstractCodeNode {

  identifier: Identifier;
  type: OmniType;

  constructor(identifier: Identifier, type: OmniType) {
    super();
    this.identifier = identifier;
    this.type = type;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitGetterIdentifier(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<GetterIdentifier> {
    return reducer.reduceGetterIdentifier(this, reducer);
  }
}

export class SetterIdentifier extends AbstractCodeNode {

  identifier: Identifier;
  type: OmniType;

  constructor(identifier: Identifier, type: OmniType) {
    super();
    this.identifier = identifier;
    this.type = type;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitSetterIdentifier(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<SetterIdentifier | Identifier> {
    return reducer.reduceSetterIdentifier(this, reducer);
  }
}

export class Literal extends AbstractCodeNode {
  readonly value: OmniPrimitiveConstantValue;
  readonly primitiveKind: OmniPrimitiveKinds;

  constructor(value: OmniPrimitiveConstantValue, primitiveKind?: OmniPrimitiveKinds) {
    super();
    this.value = value;
    this.primitiveKind = primitiveKind ?? OmniUtil.nativeLiteralToPrimitiveKind(value);
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitLiteral(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Literal> {
    return reducer.reduceLiteral(this, reducer);
  }
}

export class AnnotationKeyValuePair extends AbstractCodeNode {
  key: Identifier | undefined;
  value: AstNode;

  constructor(key: Identifier | undefined, value: AstNode) {
    super();
    this.key = key;
    this.value = value;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePair(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AnnotationKeyValuePair> {
    return reducer.reduceAnnotationKeyValuePair(this, reducer);
  }
}

export class AnnotationKeyValuePairList extends AbstractCodeNode implements AstNodeWithChildren<AnnotationKeyValuePair> {
  children: AnnotationKeyValuePair[];

  constructor(...children: AnnotationKeyValuePair[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePairList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AnnotationKeyValuePairList> {
    return reducer.reduceAnnotationKeyValuePairList(this, reducer);
  }
}

export class Annotation extends AbstractCodeNode {
  readonly type: EdgeType<OmniHardcodedReferenceType>;
  readonly pairs?: AnnotationKeyValuePairList | undefined;
  readonly group?: string;

  constructor(type: EdgeType<OmniHardcodedReferenceType>, pairs?: AnnotationKeyValuePairList, group?: string) {
    super();
    this.type = type;
    this.pairs = pairs;
    if (group) {
      this.group = group;
    }
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotation(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Annotation> {
    return reducer.reduceAnnotation(this, reducer);
  }
}

export class AnnotationList extends AbstractCodeNode implements AstNodeWithChildren<Annotation | VirtualAnnotationNode> {
  children: Array<Annotation | VirtualAnnotationNode>;
  multiline = true;

  constructor(...children: Array<Annotation | VirtualAnnotationNode>) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AnnotationList> {
    return reducer.reduceAnnotationList(this, reducer);
  }
}

export class ArrayInitializer<T extends AbstractCodeNode = AbstractCodeNode> extends AbstractCodeNode implements AstNodeWithChildren<T> {
  children: T[];

  constructor(...children: T[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitArrayInitializer(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ArrayInitializer> {
    return reducer.reduceArrayInitializer(this, reducer);
  }
}

export class StaticMemberReference extends AbstractCodeNode {
  target: ClassName;
  member: AstNode;

  constructor(target: ClassName, member: AstNode) {
    super();
    this.target = target;
    this.member = member;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitStaticMemberReference(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<StaticMemberReference> {
    return reducer.reduceStaticMemberReference(this, reducer);
  }
}

export class Parameter extends AbstractCodeNode implements Identifiable {
  type: TypeNode;
  identifier: Identifier;
  annotations?: AnnotationList | undefined;

  get name(): Identifier {
    return this.identifier;
  }

  constructor(type: TypeNode, identifier: Identifier, annotations?: AnnotationList) {
    super();
    this.type = type;
    this.identifier = identifier;
    this.annotations = annotations;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitParameter(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Parameter> {
    return reducer.reduceParameter(this, reducer);
  }
}

export class ParameterList extends AbstractCodeNode implements AstNodeWithChildren<Parameter> {
  children: Parameter[];

  constructor(...children: Parameter[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitParameterList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ParameterList> {
    return reducer.reduceParameterList(this, reducer);
  }
}

export class ConstructorParameter extends Parameter {

  readonly ref: Reference<AstNode>;

  constructor(ref: Reference<AstNode>, type: TypeNode, identifier: Identifier, annotations?: AnnotationList) {
    super(type, identifier, annotations);
    this.ref = ref;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitConstructorParameter(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ConstructorParameter> {
    return reducer.reduceConstructorParameter(this, reducer);
  }
}

export class ConstructorParameterList extends AbstractCodeNode implements AstNodeWithChildren<ConstructorParameter> {
  children: ConstructorParameter[];

  constructor(...children: ConstructorParameter[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitConstructorParameterList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ConstructorParameterList> {
    return reducer.reduceConstructorParameterList(this, reducer);
  }
}

export class BinaryExpression extends AbstractCodeNode {
  left: AbstractCodeNode;
  token: TokenKind;
  right: AbstractCodeNode;

  constructor(left: AbstractCodeNode, token: TokenKind, right: AbstractCodeNode) {
    super();
    this.left = left;
    this.token = token;
    this.right = right;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceBinaryExpression(this, reducer);
  }
}

export class InstanceOf extends AbstractCodeNode {
  target: AstNode;
  comparison: AstNode;
  narrowed?: AstNode;

  constructor(target: AstNode, comparison: AstNode, narrowed?: AstNode) {
    super();
    this.target = target;
    this.comparison = comparison;
    if (narrowed) {
      this.narrowed = narrowed;
    }
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitInstanceOf(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<InstanceOf> {
    return reducer.reduceInstanceOf(this, reducer);
  }
}

export class PackageDeclaration extends AbstractCodeNode {
  fqn: string;

  constructor(fqn: string) {
    super();
    this.fqn = fqn;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitPackage(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<PackageDeclaration> {
    return reducer.reducePackage(this, reducer);
  }
}

export class ArgumentList extends AbstractCodeNode implements AstNodeWithChildren<AbstractCodeNode> {
  children: AbstractCodeNode[];

  constructor(...children: AbstractCodeNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ArgumentList> {
    return reducer.reduceArgumentList(this, reducer);
  }
}

export class Nodes extends AbstractCodeNode implements AstNodeWithChildren {
  children: AstNode[];

  constructor(...children: AstNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitNodes(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AbstractCodeNode> {
    return reducer.reduceNodes(this, reducer);
  }
}

export class EnumItemList extends AbstractCodeNode implements AstNodeWithChildren<EnumItem> {
  children: EnumItem[];

  constructor(...children: EnumItem[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItemList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<EnumItemList> {
    return reducer.reduceEnumItemList(this, reducer);
  }
}

export class Block extends AbstractCodeNode implements AstNodeWithChildren {
  children: AstNode[];
  enclosed?: boolean | undefined;
  compact?: boolean | undefined;

  constructor(...children: AstNode[]) {
    super();
    this.children = children;
    this.enclosed = true;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitBlock(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Block> {
    return reducer.reduceBlock(this, reducer);
  }
}

// Is it needed to separate these? We don't need to care to be logically consistent.
export enum ModifierKind {
  PRIVATE,
  PUBLIC,
  DEFAULT,
  PROTECTED,

  STATIC,
  FINAL,
  ABSTRACT,

  READONLY,

  /**
   * In `C#` this is a `static readonly` which has a compile-time constant.
   *
   * In `Java` there is no such thing and can be replaced with closest `static final`.
   */
  CONST,

  OVERRIDE,
}

export class Modifier extends AbstractCodeNode {
  kind: ModifierKind;

  constructor(type: ModifierKind) {
    super();
    this.kind = type;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitModifier(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Modifier> {
    return reducer.reduceModifier(this, reducer);
  }
}

export class ModifierList extends AbstractCodeNode implements AstNodeWithChildren<Modifier> {
  children: Array<Modifier>;

  constructor(...modifiers: Modifier[]) {
    super();
    this.children = modifiers;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitModifierList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ModifierList> {
    return reducer.reduceModifierList(this, reducer);
  }
}

export enum CommentKind {
  SINGLE,
  MULTI,
  DOC,
}

export class Comment extends AbstractCodeNode {
  readonly text: AnyFreeText;
  readonly kind: CommentKind;

  constructor(text: FriendlyFreeTextIn, kind = CommentKind.DOC) {
    super();
    this.text = FreeTextUtils.fromFriendlyFreeText(text);
    this.kind = kind;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitComment(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Comment> {
    return reducer.reduceComment(this, reducer);
  }
}

/**
 * NOTE: Split into Field and FieldDeclaration? Or rename it? ArgumentDeclaration and VariableDeclaration precedence
 */
export class Field extends AbstractCodeNode implements Identifiable {
  identifier: Identifier;
  /**
   * This type is not necessarily the same as the property's type, since it might have had local changes for just this field. Prefer the property's type if want to be accurate against contract.
   */
  type: TypeNode;
  initializer?: AbstractCodeNode | undefined;
  comments?: Comment | undefined;
  modifiers: ModifierList;
  annotations?: AnnotationList | undefined;
  property?: OmniProperty;

  get name(): Identifier {
    return this.identifier;
  }

  constructor(type: TypeNode, name: Identifier, modifiers?: ModifierList, initializer?: AbstractCodeNode | undefined, annotations?: AnnotationList) {
    super();
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierKind.PRIVATE));
    this.type = type;
    this.identifier = name;
    this.initializer = initializer;
    this.annotations = annotations;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitField(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AbstractCodeNode> {
    return reducer.reduceField(this, reducer);
  }
}

export class MethodDeclarationSignature extends AbstractCodeNode {

  identifier: Identifier | GetterIdentifier | SetterIdentifier;
  type: TypeNode;
  comments?: Comment | undefined;
  annotations?: AnnotationList | undefined;
  modifiers: ModifierList;
  parameters?: ParameterList | undefined;
  genericParameters?: GenericTypeDeclarationList | undefined;
  throws?: TypeList;

  constructor(
    identifier: Identifier | GetterIdentifier | SetterIdentifier,
    type: TypeNode,
    parameters?: ParameterList,
    modifiers?: ModifierList,
    annotations?: AnnotationList,
    comments?: Comment,
    throws?: TypeList,
    genericParameters?: GenericTypeDeclarationList,
  ) {
    super();
    this.modifiers = modifiers ?? new ModifierList(new Modifier(ModifierKind.PUBLIC));
    this.type = type;
    this.identifier = identifier;
    this.parameters = parameters;
    this.annotations = annotations;
    this.comments = comments;
    if (throws) {
      this.throws = throws;
    }
    if (genericParameters) {
      this.genericParameters = genericParameters;
    }
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclarationSignature(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<MethodDeclarationSignature> {
    return reducer.reduceMethodDeclarationSignature(this, reducer);
  }
}

export class MethodDeclaration extends AbstractCodeNode {
  signature: MethodDeclarationSignature;
  body?: Block | undefined;

  constructor(signature: MethodDeclarationSignature, body?: Block) {
    super();
    this.signature = signature;
    this.body = body;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceMethodDeclaration(this, reducer);
  }
}

/**
 * TODO: Rename to just `Return` since it is not a statement, it is an expression, and needs to be wrapped by `Statement(expr)`
 */
export class ReturnStatement extends AbstractCodeNode {
  expression: AbstractCodeNode;

  constructor(expression: AbstractCodeNode) {
    super();
    this.expression = expression;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitReturnStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ReturnStatement> {
    return reducer.reduceReturnStatement(this, reducer);
  }
}

export class SelfReference extends AbstractCodeNode {

  constructor() {
    super();
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitSelfReference(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<SelfReference> {
    return reducer.reduceSelfReference(this, reducer);
  }
}

export class SuperReference extends AbstractCodeNode {

  constructor() {
    super();
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitSuperReference(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<SelfReference> {
    return reducer.reduceSuperReference(this, reducer);
  }
}

export class FieldReference extends AbstractCodeNode implements Reference<Field> {
  targetId: number;

  constructor(target: number | Field) {
    super();
    this.targetId = (typeof target === 'number') ? target : target.id;
  }

  public resolve(root: RootAstNode): Field {
    return root.resolveNodeRef(this);
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitFieldReference(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceFieldReference(this, reducer);
  }
}

export class DeclarationReference extends AbstractCodeNode implements Reference<Identifiable> {
  targetId: number;

  constructor(target: number | Identifiable) {
    super();
    this.targetId = (typeof target === 'number') ? target : target.id;
  }

  public resolve(root: RootAstNode): Identifiable {
    return root.resolveNodeRef(this);
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitDeclarationReference(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceDeclarationReference(this, reducer);
  }
}

export class VariableDeclaration extends AbstractCodeNode implements Identifiable {
  identifier: Identifier;
  type?: TypeNode | undefined;
  initializer?: AbstractCodeNode | undefined;
  immutable?: boolean | undefined;

  get name(): Identifier {
    return this.identifier;
  }

  constructor(variableName: Identifier, initializer?: AbstractCodeNode, type?: TypeNode | undefined, immutable?: boolean) {
    super();
    if (!type && !initializer) {
      throw new Error(`Either a type or an initializer must be given to the field declaration`);
    }

    this.identifier = variableName;
    this.type = type;
    this.initializer = initializer;
    this.immutable = immutable;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitVariableDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Identifiable> {
    return reducer.reduceVariableDeclaration(this, reducer);
  }
}

export class FieldBackedGetter extends AbstractCodeNode {

  readonly fieldRef: Reference<Field>;
  readonly annotations?: AnnotationList | undefined;
  readonly comments?: Comment | undefined;

  /**
   * If not set, it will derive the identifier from the field.
   */
  readonly getterName?: Identifier | undefined;

  constructor(fieldRef: Reference<Field>, annotations?: AnnotationList, comments?: Comment, getterName?: Identifier | undefined) {
    super();
    this.fieldRef = fieldRef;
    this.annotations = annotations;
    this.comments = comments;
    this.getterName = getterName;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedGetter(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceFieldBackedGetter(this, reducer);
  }
}

export class FieldBackedSetter extends AbstractCodeNode {

  readonly fieldRef: Reference<Field>;
  readonly annotations?: AnnotationList | undefined;
  readonly comments?: Comment | undefined;

  /**
   * If not set, it will derive the identifier from the field.
   */
  readonly identifier?: Identifier | undefined;

  constructor(fieldRef: Reference<Field>, annotations?: AnnotationList, comments?: Comment, identifier?: Identifier | undefined) {
    super();
    this.fieldRef = fieldRef;
    this.annotations = annotations;
    this.comments = comments;
    this.identifier = identifier;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceFieldBackedSetter(this, reducer);
  }
}

export class Cast extends AbstractCodeNode {
  toType: TypeNode;
  expression: AbstractCodeNode;

  constructor(toType: TypeNode, expression: AbstractCodeNode) {
    super();
    this.toType = toType;
    this.expression = expression;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitCast(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceCast(this, reducer);
  }
}

export class TypeList<T extends OmniType = OmniType> extends AbstractCodeNode implements AstNodeWithChildren<TypeNode<T>> {
  children: Array<TypeNode<T>>;

  constructor(...types: Array<TypeNode<T>>) {
    super();
    this.children = types;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitTypeList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<TypeList> {
    return reducer.reduceTypeList(this, reducer);
  }
}

/**
 * TODO: This should be updated so that `types` contains a list of weakly linked references to the other object declarations that we are extending.
 *        We care about the AST stage resolution for these nodes, and not what they used to be in the OmniModel stage.
 */
export class ExtendsDeclaration extends AbstractCodeNode {
  types: TypeList;

  constructor(type: TypeList) {
    super();
    this.types = type;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitExtendsDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ExtendsDeclaration> {
    return reducer.reduceExtendsDeclaration(this, reducer);
  }
}

export class ImplementsDeclaration extends AbstractCodeNode {
  types: TypeList;

  constructor(types: TypeList) {
    super();
    this.types = types;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitImplementsDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ImplementsDeclaration> {
    return reducer.reduceImplementsDeclaration(this, reducer);
  }
}

/**
 * TODO: Make the Type node generic, and possible to limit which OmniType is allowed: Class, Interface, Enum
 */
export abstract class AbstractObjectDeclaration<T extends OmniType = OmniType> extends AbstractCodeNode implements Identifiable, Typed {
  name: Identifier;
  type: TypeNode<T>;
  comments?: Comment | undefined;
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
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierKind.PUBLIC));
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

export class CompilationUnit extends AbstractCodeNode implements AstNodeWithChildren {
  children: AstNode[];
  packageDeclaration: PackageDeclaration;
  imports: ImportList;
  name?: string;
  comments?: Comment | undefined;

  constructor(packageDeclaration: PackageDeclaration, imports: ImportList, ...children: AstNode[]) {
    super();
    this.packageDeclaration = packageDeclaration;
    this.imports = imports;
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitCompilationUnit(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<CompilationUnit> {
    return reducer.reduceCompilationUnit(this, reducer);
  }
}

export class ConstructorDeclaration extends AbstractCodeNode {

  modifiers: ModifierList;
  parameters?: ConstructorParameterList | undefined;
  annotations?: AnnotationList | undefined;
  comments?: Comment | undefined;
  superCall?: SuperConstructorCall | undefined;
  body?: Block | undefined;

  constructor(parameters?: ConstructorParameterList, body?: Block, modifiers?: ModifierList) {
    super();
    this.modifiers = modifiers || new ModifierList(new Modifier(ModifierKind.PUBLIC));
    this.parameters = parameters;
    this.body = body;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitConstructor(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ConstructorDeclaration> {
    return reducer.reduceConstructor(this, reducer);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration {

  constructor(type: TypeNode, name: Identifier, body: Block, modifiers?: ModifierList, genericParameterList?: GenericTypeDeclarationList) {
    super(type, name, body, modifiers);
    this.genericParameterList = genericParameterList;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitClassDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Identifiable> {
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

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Identifiable> {
    return reducer.reduceInterfaceDeclaration(this, reducer);
  }
}

export class GenericTypeDeclaration extends AbstractCodeNode {
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

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<GenericTypeDeclaration> {
    return reducer.reduceGenericTypeDeclaration(this, reducer);
  }
}

export class GenericTypeDeclarationList extends AbstractCodeNode {
  types: GenericTypeDeclaration[];

  constructor(...types: GenericTypeDeclaration[]) {
    super();
    this.types = types;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclarationList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<GenericTypeDeclarationList> {
    return reducer.reduceGenericTypeDeclarationList(this, reducer);
  }
}

// Simplify so we don't give block, but enum entries?
export class EnumDeclaration extends AbstractObjectDeclaration<OmniEnumType> {
  constructor(type: EdgeType<OmniEnumType>, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitEnumDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<EnumDeclaration | ClassDeclaration> {
    return reducer.reduceEnumDeclaration(this, reducer);
  }
}

export class EnumItem extends AbstractCodeNode {
  identifier: Identifier;
  value?: Literal | undefined;
  comment?: Comment | undefined;
  annotations?: AnnotationList;

  constructor(identifier: Identifier, value: Literal | undefined, comment?: Comment, annotations?: AnnotationList) {
    super();
    this.identifier = identifier;
    this.value = value;
    this.comment = comment;
    if (annotations) {
      this.annotations = annotations;
    }
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItem(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<EnumItem> {
    return reducer.reduceEnumItem(this, reducer);
  }
}

export class IfStatement extends AbstractCodeNode {
  predicate: AstNode;
  body: Block;

  constructor(predicate: AstNode, body: Block) {
    super();
    this.predicate = predicate;
    this.body = body;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitIfStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<IfStatement> {
    return reducer.reduceIfStatement(this, reducer);
  }
}

export class IfElseStatement extends AbstractCodeNode {
  ifStatements: IfStatement[];
  elseBlock?: Block | undefined;

  constructor(ifStatements: IfStatement[], elseBlock?: Block) {
    super();
    this.ifStatements = ifStatements;
    this.elseBlock = elseBlock;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitIfElseStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<IfElseStatement> {
    return reducer.reduceIfElseStatement(this, reducer);
  }
}

export class TernaryExpression extends AbstractCodeNode {
  predicate: AstNode;
  passing: AbstractCodeNode;
  failing: AbstractCodeNode;

  constructor(condition: AstNode, passing: AbstractCodeNode, failing: AbstractCodeNode) {
    super();
    this.predicate = condition;
    this.passing = passing;
    this.failing = failing;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitTernaryExpression(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceTernaryExpression(this, reducer);
  }
}

/**
 * TODO: Replace `TypeNode` with `TypePath` which then each separate language can handle its own way
 */
export class ImportStatement extends AbstractCodeNode {
  type: TypeNode;

  constructor(type: TypeNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitImportStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ImportStatement> {
    return reducer.reduceImportStatement(this, reducer);
  }
}

export class ImportList extends AbstractCodeNode implements AstNodeWithChildren<ImportStatement> {
  children: ImportStatement[];

  constructor(...children: ImportStatement[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitImportList(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ImportList> {
    return reducer.reduceImportList(this, reducer);
  }
}

export class Statement extends AbstractCodeNode {
  child: AbstractCodeNode;

  constructor(child: AbstractCodeNode) {
    super();
    this.child = child;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Statement> {
    return reducer.reduceStatement(this, reducer);
  }
}

export class SuperConstructorCall extends AbstractCodeNode {
  arguments: ArgumentList;

  constructor(parameters: ArgumentList) {
    super();
    this.arguments = parameters;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitSuperConstructorCall(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<SuperConstructorCall> {
    return reducer.reduceSuperConstructorCall(this, reducer);
  }
}

export class MethodCall extends AbstractCodeNode {
  target: AbstractCodeNode;
  genericArguments?: ArgumentList;
  methodArguments?: ArgumentList;

  constructor(target: AbstractCodeNode, methodArguments?: ArgumentList, genericArguments?: ArgumentList) {
    super();
    this.target = target;
    this.methodArguments = methodArguments ?? new ArgumentList();
    if (genericArguments) {
      this.genericArguments = genericArguments;
    }
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitMethodCall(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<MethodCall> {
    return reducer.reduceMethodCall(this, reducer);
  }
}

/**
 * TODO: Make this inherit from MethodCall?
 */
export class NewStatement extends AbstractCodeNode {
  type: TypeNode;
  constructorArguments?: ArgumentList | undefined;

  constructor(type: TypeNode, constructorArguments?: ArgumentList) {
    super();
    this.type = type;
    this.constructorArguments = constructorArguments;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitNewStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AbstractCodeNode> {
    return reducer.reduceNewStatement(this, reducer);
  }
}

export class ThrowStatement extends AbstractCodeNode {
  expression: AbstractCodeNode;

  constructor(expression: AbstractCodeNode) {
    super();
    this.expression = expression;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitThrowStatement(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ThrowStatement> {
    return reducer.reduceThrowStatement(this, reducer);
  }
}

export class HardCoded extends AbstractCodeNode {
  content: string;

  constructor(content: string) {
    super();
    this.content = content;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitHardCoded(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<HardCoded> {
    return reducer.reduceHardCoded(this, reducer);
  }
}

export class ClassName extends AbstractCodeNode {
  type: TypeNode;

  constructor(type: TypeNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitClassName(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ClassName> {
    return reducer.reduceClassName(this, reducer);
  }
}

/**
 * TODO: Rename into something more telling for what it does, which is reference the compile-time class in runtime. So reference to `Foo` would render as `Foo.class`.
 */
export class ClassReference extends AbstractCodeNode {
  className: ClassName;

  constructor(className: ClassName) {
    super();
    this.className = className;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitClassReference(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<ClassReference> {
    return reducer.reduceClassReference(this, reducer);
  }
}

export class DecoratingTypeNode extends AbstractCodeNode implements TypeNode {
  of: TypeNode;
  omniType: OmniDecoratingType;

  constructor(of: TypeNode, omniType: OmniDecoratingType) {
    super();
    this.of = of;
    this.omniType = omniType;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitDecoratingTypeNode(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<DecoratingTypeNode> {
    return reducer.reduceDecoratingTypeNode(this, reducer);
  }
}

export class NamespaceBlock extends AbstractCodeNode {

  readonly block: Block;

  constructor(block: Block) {
    super();
    this.block = block;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitNamespaceBlock(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<NamespaceBlock> {
    return r.reduceNamespaceBlock(this, r);
  }
}

export class Namespace extends AbstractCodeNode implements Identifiable {

  readonly name: Identifier;
  readonly block: NamespaceBlock;

  constructor(name: Identifier, block: NamespaceBlock) {
    super();
    this.name = name;
    this.block = block;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitNamespace(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<Namespace> {
    return r.reduceNamespace(this, r);
  }
}

/**
 * For representing things like `java.util.Comparator` or `{Foo} from '../some/path'`.
 *
 * No path will "work" between languages, but it will more likely render properly than using string splits and whatnot.
 */
export class TypePath extends AbstractCodeNode {

  readonly parts: Identifier[];
  readonly leaf: TypeNode;

  constructor(parts: Identifier[], leaf: TypeNode) {
    super();
    this.parts = parts;
    this.leaf = leaf;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitTypeNamespace(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<TypePath> {
    return r.reduceTypeNamespace(this, r);
  }
}

/**
 * Hint which describes the delegate use.
 * Could be used to convert this generic delegate into something more accurate in the target language.
 */
export enum DelegateKind {
  NORMAL,
  CONVERTER,
}

/**
 * Representing a callback/delegate/functional-interface -- in Java perhaps a `java.util.Function<T, R>` or `java.util.Supplier<R>`, in C# perhaps a `System.Func<T, R>` or `System.Action<T>`.
 *
 * It will be up to the renderer how to represent the delegate.
 */
export class Delegate extends AbstractCodeNode implements TypeNode {
  readonly parameterTypes: TypeNode[];
  readonly returnType: TypeNode;
  readonly kind: DelegateKind;

  constructor(parameterTypes: TypeNode[], returnType: TypeNode, kind: DelegateKind) {
    super();
    this.parameterTypes = parameterTypes;
    this.returnType = returnType;
    this.kind = kind;
  }

  get omniType(): OmniType {
    // NOTE: This should be something else. Perhaps a new type kind that is "function" so we can have a first-class type for a function
    return {
      kind: OmniTypeKind.UNKNOWN,
    };
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitDelegate(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<Delegate | TypeNode> {
    return r.reduceDelegate(this, r);
  }
}

/**
 * Calling a delegate can be different from calling a regular function, depending on target language.
 *
 * This abstraction will either leave the correct call-site syntax up to the renderer, or let some reducer replace it with another specialized node.
 */
export class DelegateCall extends AbstractCodeNode {

  readonly target: AbstractCodeNode;
  readonly delegateRef: GenericRef<Delegate>;
  readonly args: ArgumentList;

  constructor(target: AbstractCodeNode, delegateRef: GenericRef<Delegate>, args: ArgumentList) {
    super();
    this.target = target;
    this.delegateRef = delegateRef;
    this.args = args;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitDelegateCall(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<DelegateCall | MethodCall> {
    return r.reduceDelegateCall(this, r);
  }
}

export class FormatNewline extends AbstractCodeNode {

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitFormatNewline(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<FormatNewline> {
    return r.reduceFormatNewline(this, r);
  }
}

export class GenericRef<T extends AstNode> extends AbstractCodeNode implements Reference<T> {

  readonly targetId: number;

  constructor(target: T | number) {
    super();
    this.targetId = (typeof target === 'number') ? target : target.id;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitGenericRef(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<GenericRef<T>> {
    // NOTE: Someday we should get rid of this bad cast, since it could lie.
    return r.reduceGenericRef(this, r) as ReducerResult<GenericRef<T>>;
  }

  resolve(root: RootAstNode): T {
    return root.resolveNodeRef(this);
  }
}

export class MemberAccess extends AbstractCodeNode {

  readonly owner: AstNode;
  readonly member: AstNode;

  constructor(owner: AstNode, member: AstNode) {
    super();
    this.owner = owner;
    this.member = member;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitMemberAccess(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return r.reduceMemberAccess(this, r);
  }
}

export class IndexAccess extends AbstractCodeNode {

  readonly owner: AstNode;
  readonly index: AstNode;

  constructor(owner: AstNode, index: AstNode) {
    super();
    this.owner = owner;
    this.index = index;
  }

  visit<R>(v: CodeVisitor<R>): VisitResult<R> {
    return v.visitIndexAccess(this, v);
  }

  reduce(r: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode> {
    return r.reduceIndexAccess(this, r);
  }
}
