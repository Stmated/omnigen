import AbstractNode from '@ast/AbstractNode';
import AbstractToken from '@ast/AbstractToken';
import {IJavaOptions, JavaUtil, UnknownType} from '@java';
import {
  OmniDictionaryType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType
} from '@parse';
import {VisitResult} from '@visit';
import {IJavaAstVisitor} from '@java/visit/IJavaAstVisitor';
import {camelCase} from 'change-case';
import * as Java from '@java/ast';
import {JavaAstUtils} from '@java/transform/JavaAstUtils';

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
  AND
}

export class JavaToken extends AbstractToken {
  type: TokenType;

  constructor(type: TokenType) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitToken(this, visitor);
  }
}

export abstract class AbstractJavaNode extends AbstractNode {

}

export class RegularType extends AbstractJavaNode {
  omniType: OmniType;
  private _localName?: string;
  private _importName?: string;
  readonly implementation?: boolean;

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
  constructor(omniType: OmniType, implementation?: boolean) {
    super();
    this.omniType = omniType;
    this.implementation = implementation;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitRegularType(this, visitor);
  }
}

export type Type = RegularType | GenericType;

/**
 * TODO: Remove this, and move the functionality of deciding way to render to the renderer itself?
 *        That way RegularType and GenericType can just become Type, and skip the JavaAstUtils method
 */
export class GenericType extends AbstractJavaNode {
  baseType: RegularType;
  genericArguments: Type[];

  /**
   * A getter of kindness to make it compliant to the reglar Java.Type node.
   */
  get omniType(): OmniType {
    return this.baseType.omniType;
  }

  constructor(baseType: RegularType, genericArguments: Type[]) {
    super();
    this.baseType = baseType;
    this.genericArguments = genericArguments;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitGenericType(this, visitor);
  }
}

export class Identifier extends AbstractJavaNode {
  value: string;
  original?: string;

  constructor(name: string, original?: string) {
    super();
    this.value = name;
    this.original = original;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitIdentifier(this, visitor);
  }
}

export abstract class AbstractExpression extends AbstractJavaNode {
}

// Split this into different types of constant depending on the type?
type LiteralValue = boolean | number | string | null;

export class Literal extends AbstractExpression {
  value: LiteralValue;
  primitiveKind?: OmniPrimitiveKind;

  constructor(value: LiteralValue, primitiveKind?: OmniPrimitiveKind) {
    super();
    this.value = value;
    this.primitiveKind = primitiveKind;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePair(this, visitor);
  }
}

export class AnnotationKeyValuePairList extends AbstractJavaNode {
  children: AnnotationKeyValuePair[];

  constructor(...children: AnnotationKeyValuePair[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationKeyValuePairList(this, visitor);
  }
}

export class Annotation extends AbstractJavaNode {
  type: RegularType;
  pairs?: AnnotationKeyValuePairList;

  constructor(type: RegularType, pairs?: AnnotationKeyValuePairList) {
    super();
    this.type = type;
    this.pairs = pairs;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotation(this, visitor);
  }
}

export class AnnotationList extends AbstractJavaNode {
  children: Annotation[];
  multiline = true;

  constructor(...children: Annotation[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAnnotationList(this, visitor);
  }
}

export class ArrayInitializer<T extends AbstractJavaNode> extends AbstractJavaNode {
  children: T[];

  constructor(...children: T[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitArrayInitializer(this, visitor);
  }
}

export type StaticTarget = ClassName;

export class StaticMemberReference extends AbstractJavaNode {
  target: StaticTarget;
  member: AbstractExpression

  constructor(target: StaticTarget, member: AbstractExpression) {
    super();
    this.target = target;
    this.member = member;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitStaticMemberReference(this, visitor);
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentDeclaration(this, visitor);
  }
}

export class ArgumentDeclarationList extends AbstractJavaNode {
  children: ArgumentDeclaration[];

  constructor(...children: ArgumentDeclaration[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this, visitor);
  }
}

export class AssignExpression extends BinaryExpression {
  constructor(left: AbstractExpression, right: AbstractExpression) {
    super(left, new JavaToken(TokenType.ASSIGN), right);
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAssignExpression(this, visitor);
  }
}

export class PackageDeclaration extends AbstractJavaNode {
  fqn: string;

  constructor(fqn: string) {
    super();
    this.fqn = fqn;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitBinaryExpression(this, visitor);
  }
}

export class ArgumentList extends AbstractJavaNode {
  children: AbstractExpression[];

  constructor(...children: AbstractExpression[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitArgumentList(this, visitor);
  }
}

export class EnumItemList extends AbstractJavaNode {
  children: EnumItem[];

  constructor(...children: EnumItem[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitEnumItemList(this, visitor);
  }
}

export class Block extends AbstractJavaNode {
  children: AbstractJavaNode[];

  constructor(...children: AbstractJavaNode[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitModifier(this, visitor);
  }
}

export class ModifierList extends AbstractJavaNode {
  modifiers: Modifier[];

  constructor(...modifiers: Modifier[]) {
    super();
    this.modifiers = modifiers;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitModifierList(this, visitor);
  }
}

export class Comment extends AbstractJavaNode {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitComment(this, visitor);
  }
}

export class CommentList extends AbstractJavaNode {
  children: Comment[];

  constructor(...children: Comment[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitField(this, visitor);
  }
}

export class MethodDeclarationSignature extends AbstractJavaNode {

  identifier: Identifier;
  type: Type;
  comments?: CommentList;
  annotations?: AnnotationList;
  modifiers: ModifierList;
  parameters?: ArgumentDeclarationList;

  constructor(identifier: Identifier, type: Type, parameters?: ArgumentDeclarationList, modifiers?: ModifierList, annotations?: AnnotationList, comments?: CommentList) {
    super();
    this.modifiers = modifiers ?? new ModifierList(new Modifier(ModifierType.PUBLIC));
    this.type = type;
    this.identifier = identifier;
    this.parameters = parameters;
    this.annotations = annotations;
    this.comments = comments;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclarationSignature(this, visitor);
  }
}

export class AbstractMethodDeclaration extends AbstractJavaNode {
  signature: MethodDeclarationSignature;

  constructor(signature: MethodDeclarationSignature) {
    super();
    this.signature = signature;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAbstractMethodDeclaration(this, visitor);
  }
}

export class MethodDeclaration extends AbstractJavaNode {
  signature: MethodDeclarationSignature;
  body?: Block;

  constructor(signature: MethodDeclarationSignature, body?: Block) {
    super();
    this.signature = signature;
    this.body = body;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitMethodDeclaration(this, visitor);
  }
}

export class ReturnStatement extends AbstractJavaNode {
  expression: AbstractExpression;

  constructor(expression: AbstractExpression) {
    super();
    this.expression = expression;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitReturnStatement(this, visitor);
  }
}

export class SelfReference extends AbstractExpression {

  constructor() {
    super();
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitSelfReference(this, visitor);
  }
}

export class FieldReference extends AbstractExpression {
  field: Field;

  constructor(field: Field) {
    super();
    this.field = field;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldReference(this, visitor);
  }
}

export class VariableReference extends AbstractJavaNode {
  variableName: Identifier;

  constructor(variableName: Identifier) {
    super();
    this.variableName = variableName;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitVariableReference(this, visitor);
  }
}

export class VariableDeclaration extends AbstractJavaNode {
  variableName: Identifier;
  variableType?: RegularType;
  initializer?: AbstractExpression;
  constant?: boolean;

  constructor(variableName: Identifier, initializer?: AbstractExpression, type?: RegularType, constant?: boolean) {
    super();
    if (!type && !initializer) {
      throw new Error(`Either a type or an initializer must be given to the field declaration`);
    }

    this.variableName = variableName;
    this.variableType = type;
    this.initializer = initializer;
    this.constant = constant;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentList, getterName?: Identifier) {
    super(
      field,
      new MethodDeclarationSignature(
        getterName ?? new Identifier(JavaUtil.getGetterName(field.identifier.value, field.type.omniType)),
        field.type,
        undefined,
        undefined,
        annotations,
        comments
      ),
      new Block(
        new Statement(new ReturnStatement(new FieldReference(field))),
      ));
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedGetter(this, visitor);
  }
}

export class FieldBackedSetter extends AbstractFieldBackedMethodDeclaration {

  constructor(field: Field, annotations?: AnnotationList, comments?: CommentList) {
    super(
      field,
      new MethodDeclarationSignature(
        new Identifier(JavaUtil.getSetterName(field.identifier.value, field.type.omniType)),
        new RegularType({
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.VOID,
        }),
        new ArgumentDeclarationList(
          new ArgumentDeclaration(
            field.type,
            field.identifier,
          ),
        ),
        undefined,
        annotations,
        comments
      ),
      new Block(
        new AssignExpression(
          new FieldReference(field),
          // TODO: Change, so that "value" is not hard-coded! Or is "identifier" enough?
          new VariableReference(new Identifier('value')),
        ),
      ));
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitFieldBackedSetter(this, visitor);
  }
}

export class FieldGetterSetter extends AbstractJavaNode {
  field: Field;
  readonly getter: FieldBackedGetter;
  readonly setter: FieldBackedSetter;

  constructor(type: Type, fieldIdentifier: Identifier, getterAnnotations?: AnnotationList, comments?: CommentList, getterIdentifier?: Identifier) {
    super();
    this.field = new Field(type, fieldIdentifier, undefined, undefined, undefined);
    this.getter = new FieldBackedGetter(this.field, getterAnnotations, comments, getterIdentifier);
    this.setter = new FieldBackedSetter(this.field);
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitCast(this, visitor);
  }
}

export class TypeList extends AbstractJavaNode {
  children: Type[];

  constructor(types: Type[]) {
    super();
    this.children = types;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitTypeList(this, visitor);
  }
}

export class ExtendsDeclaration extends AbstractJavaNode {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitExtendsDeclaration(this, visitor);
  }
}

export class ImplementsDeclaration extends AbstractJavaNode {
  types: TypeList;

  constructor(types: TypeList) {
    super();
    this.types = types;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitImplementsDeclaration(this, visitor);
  }
}

/**
 * TODO: Make the Type node generic, and possible to limit which OmniType is allowed: Class, Interface, Enum
 */
export abstract class AbstractObjectDeclaration extends AbstractJavaNode {
  name: Identifier;
  type: Type;
  comments?: CommentList;
  annotations?: AnnotationList;
  modifiers: ModifierList;
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitObjectDeclaration(this, visitor);
  }
}

export class CompilationUnit extends AbstractJavaNode {
  object: AbstractObjectDeclaration;
  packageDeclaration: PackageDeclaration;
  imports: ImportList;

  constructor(packageDeclaration: PackageDeclaration, imports: ImportList, object: AbstractObjectDeclaration) {
    super();
    this.packageDeclaration = packageDeclaration;
    this.imports = imports;
    this.object = object;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitConstructor(this, visitor);
  }
}

// export const AdditionalPropertiesKeyType: OmniPrimitiveType = {
//   name: 'AdditionalPropertiesKeyType',
//   kind: OmniTypeKind.PRIMITIVE,
//   primitiveKind: OmniPrimitiveKind.STRING
// };
//
// // TODO: Should this be "Unknown" or another type that is "Any"?
// //  Difference between rendering as JsonNode and Object in some cases.
// export const AdditionalPropertiesValueType: OmniUnknownType = {
//   name: 'AdditionalPropertiesValueType',
//   kind: OmniTypeKind.UNKNOWN,
// }
//
// export const AdditionalPropertiesMapType: OmniDictionaryType = {
//   name: 'AdditionalProperties',
//   kind: OmniTypeKind.DICTIONARY,
//   keyType: AdditionalPropertiesKeyType,
//   valueType: AdditionalPropertiesValueType
// };

export class AdditionalPropertiesDeclaration extends AbstractJavaNode {
  children: AbstractJavaNode[];

  readonly keyType: OmniPrimitiveType;
  readonly valueType: OmniUnknownType;
  readonly mapType: OmniDictionaryType;

  constructor() {
    super();

    // TODO: This should be some other type. Point directly to Map<String, Object>? Or have specific known type?
    this.keyType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING
    };

    // TODO: Should this be "Unknown" or another type that is "Any"?
    //  Difference between rendering as JsonNode and Object in some cases.
    this.valueType = {
      kind: OmniTypeKind.UNKNOWN,
    }
    this.mapType = {
      kind: OmniTypeKind.DICTIONARY,
      keyType: this.keyType,
      valueType: this.valueType
    };

    const additionalPropertiesFieldIdentifier = new Identifier('_additionalProperties');
    const keyParameterIdentifier = new Identifier('key');
    const valueParameterIdentifier = new Identifier('value');

    const additionalPropertiesField = new Field(
      JavaAstUtils.createTypeNode(this.mapType, false),
      additionalPropertiesFieldIdentifier,
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL)
      ),
      new NewStatement(JavaAstUtils.createTypeNode(this.mapType, true))
    );

    const addMethod = new MethodDeclaration(
      new MethodDeclarationSignature(
        new Identifier('addAdditionalProperty'),
        JavaAstUtils.createTypeNode(<OmniPrimitiveType>{
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.VOID
        }),
        new ArgumentDeclarationList(
          new ArgumentDeclaration(JavaAstUtils.createTypeNode(this.keyType), keyParameterIdentifier),
          new ArgumentDeclaration(JavaAstUtils.createTypeNode(this.valueType), valueParameterIdentifier)
        ),
      ),
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

    addMethod.signature.annotations = new AnnotationList(
      new Annotation(
        new RegularType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
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
          new RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonAnyGetter',
          }),
        ))
      )
    ];
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitAdditionalPropertiesDeclaration(this, visitor);
  }
}

export class ClassDeclaration extends AbstractObjectDeclaration {
  constructor(type: RegularType, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitClassDeclaration(this, visitor);
  }
}

/**
 * TODO: Remove this and instead just add a boolean to the ClassDeclaration and GenericClassDeclaration?
 */
export class InterfaceDeclaration extends AbstractObjectDeclaration {
  constructor(type: Type, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitInterfaceDeclaration(this, visitor);
  }
}

export class GenericClassDeclaration extends ClassDeclaration {
  typeList: GenericTypeDeclarationList;

  constructor(name: Identifier, type: RegularType, typeList: GenericTypeDeclarationList, body: Block) {
    super(type, name, body);
    this.typeList = typeList;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitGenericClassDeclaration(this, visitor);
  }
}

export class GenericTypeDeclaration extends AbstractNode {
  name: Identifier;
  lowerBounds?: AbstractNode;
  upperBounds?: AbstractNode;

  constructor(name: Identifier, lowerBounds?: AbstractNode, upperBounds?: AbstractNode) {
    super();
    this.name = name;
    this.lowerBounds = lowerBounds;
    this.upperBounds = upperBounds;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclaration(this, visitor);
  }
}

export class GenericTypeDeclarationList extends AbstractJavaNode {
  types: GenericTypeDeclaration[];

  constructor(types: GenericTypeDeclaration[]) {
    super();
    this.types = types;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeDeclarationList(this, visitor);
  }
}

export class GenericTypeUse extends AbstractNode {
  name: Identifier;

  constructor(name: Identifier) {
    super();
    this.name = name;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeUse(this, visitor);
  }
}

export class GenericTypeUseList extends AbstractJavaNode {
  types: GenericTypeUse[];

  constructor(types: GenericTypeUse[]) {
    super();
    this.types = types;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitGenericTypeUseList(this, visitor);
  }
}

// Simplify so we don't give block, but enum entries?
export class EnumDeclaration extends AbstractObjectDeclaration {
  constructor(type: RegularType, name: Identifier, body: Block, modifiers?: ModifierList) {
    super(type, name, body, modifiers);
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitIfElseStatement(this, visitor);
  }
}

export class ImportStatement extends AbstractJavaNode {
  type: RegularType;

  constructor(type: RegularType) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitImportStatement(this, visitor);
  }
}

export class ImportList extends AbstractJavaNode {
  children: ImportStatement[];

  constructor(children: ImportStatement[]) {
    super();
    this.children = children;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitImportList(this, visitor);
  }
}

export class Statement extends AbstractJavaNode {
  child: AbstractJavaNode;

  constructor(child: AbstractJavaNode) {
    super();
    this.child = child;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitStatement(this, visitor);
  }
}

export class SuperConstructorCall extends AbstractJavaNode {
  parameters: ArgumentList;


  constructor(parameters: ArgumentList) {
    super();
    this.parameters = parameters;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitNewStatement(this, visitor);
  }
}

export class HardCoded extends AbstractJavaNode {
  content: string;

  constructor(content: string) {
    super();
    this.content = content;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitHardCoded(this, visitor);
  }
}

export class ClassName extends AbstractExpression {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitClassName(this, visitor);
  }
}

export class ClassReference extends AbstractExpression {
  className: ClassName;

  constructor(type: Type) {
    super();
    this.className = new ClassName(type);
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
    return visitor.visitClassReference(this, visitor);
  }
}

export class RuntimeTypeMapping extends AbstractJavaNode {
  fields: Field[];
  getters: FieldBackedGetter[];
  methods: MethodDeclaration[];

  constructor(types: OmniType[], options: IJavaOptions, commentSupplier: {(type: OmniType): Comment[]}) {
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
        new Java.Annotation(
          new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'com.fasterxml.jackson.annotation.JsonValue'}),
        )
      )
    );
    const untypedGetter = new FieldBackedGetter(
      untypedField
    );

    this.fields.push(untypedField);
    this.getters.push(untypedGetter);

    for (const type of types) {

      const typedFieldName = this.getFieldName(type);

      const typedField = new Field(
        JavaAstUtils.createTypeNode(type),
        new Identifier(`_${typedFieldName}`)
      );
      const typedFieldReference = new FieldReference(typedField);

      const argumentDeclarationList = new ArgumentDeclarationList();
      let conversionExpression: AbstractExpression;
      if (options.unknownType == UnknownType.JSON) {
        const objectMapperReference = new Identifier('objectMapper');
        argumentDeclarationList.children.push(
          new ArgumentDeclaration(
            new RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: "com.fasterxml.jackson.ObjectMapper"}),
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
      typedGetter.signature.comments = new CommentList(...commentSupplier(typedGetter.signature.type.omniType));

      this.fields.push(typedField);
      this.methods.push(typedGetter);
    }
  }

  visit<R>(visitor: IJavaAstVisitor<R>): VisitResult<R> {
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
    })

    return camelCase(javaName); // camelCase(Naming.unwrap(type.name));
  }
}
