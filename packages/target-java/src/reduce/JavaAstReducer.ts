import {AstFreeTextVisitor, JavaVisitor} from '../visit';
import {OmniTypeKind, reduce, Reducer, ReducerFn} from '@omnigen/core';
import * as Java from '../ast';
import {assertDefined, isDefined, OmniUtil} from '@omnigen/core-util';

export type FreeTextReducer = Reducer<AstFreeTextVisitor<unknown>>;

export const createFreeTextReducer = (partial?: Partial<FreeTextReducer>): FreeTextReducer => {
  return {
    reduce: (node, reducer) => node.reduce(reducer),
    reduceFreeTexts: (node, reducer) => {
      const children = node.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new Java.FreeTexts(children);
    },
    reduceFreeText: node => node,
    reduceFreeTextParagraph: (node, reducer) => reduce(node.child, reducer, it => new Java.FreeTextParagraph(it)),
    reduceFreeTextSection: (node, reducer) => {
      const header = node.header.reduce(reducer);
      const content = node.content.reduce(reducer);
      if (!header && !content) {
        return undefined;
      } else if (!header) {
        return content;
      } else if (!content) {
        return header;
      } else {
        return new Java.FreeTextSection(header as any, content as any);
      }
    },
    reduceFreeTextLine: (node, reducer) => reduce(node.child, reducer, it => new Java.FreeTextLine(it)),
    reduceFreeTextIndent: (node, reducer) => reduce(node.child, reducer, it => new Java.FreeTextIndent(it)),
    reduceFreeTextHeader: (node, reducer) => reduce(node.child, reducer, it => new Java.FreeTextHeader(node.level, it)),
    reduceFreeTextTypeLink: (node, reducer) => reduce(node.type, reducer, it => new Java.FreeTextTypeLink(it)),
    reduceFreeTextMethodLink: (node, reducer) => {
      const type = node.type.reduce(reducer) ?? new Java.WildcardType({kind: OmniTypeKind.UNKNOWN});
      const method = node.method.reduce(reducer) ?? new Java.HardCoded(`???`);
      return new Java.FreeTextMethodLink(type, method);
    },
    reduceFreeTextPropertyLink: (node, reducer) => {
      const type = node.type.reduce(reducer);
      return type ? new Java.FreeTextPropertyLink(type, node.property) : type;
    },
    reduceFreeTextList: (node, reducer) => {
      const children = node.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new Java.FreeTextList(children, node.ordered);
    },
    ...partial,
  };
};

// TODO: This part should be done some other way, and not hard-coded like this.
//        Maybe the better way is to have no magic, and instead only enforce that the keys exist, and let it be up to each reduce method what its return type should be?
type JavaReducerBase = Reducer<JavaVisitor<unknown>>;

export type JavaReducer = JavaReducerBase;

export const createJavaReducer = (partial?: Partial<JavaReducer>): Readonly<JavaReducer> => {

  return {
    ...createFreeTextReducer(partial),
    reduceEdgeType: n => n,
    reduceWildcardType: (n, r) => new Java.WildcardType(n.omniType, n.implementation),
    reduceBoundedType: (n, r) => new Java.BoundedType(
      n.omniType,
      assertDefined(n.type.reduce(r)),
      n.upperBound?.reduce(r),
      n.lowerBound?.reduce(r),
    ),
    reduceArrayType: (node, reducer) => new Java.ArrayType(node.omniType, assertDefined(node.of.reduce(reducer)), node.implementation),
    reduceGenericType: (n, r) => {
      const baseType = n.baseType.reduce(r);
      const genericArguments = n.genericArguments.map(it => it.reduce(r)).filter(isDefined);
      if (baseType && baseType instanceof Java.EdgeType && genericArguments.length > 0) {
        return new Java.GenericType(baseType.omniType, baseType, genericArguments);
      }

      return baseType;
    },
    reduceParameter: (node, reducer) => {

      return new Java.Parameter(
        assertDefined(node.type.reduce(reducer)),
        assertDefined(node.identifier.reduce(reducer)),
        node.annotations?.reduce(reducer),
      );
    },
    reduceParameterList: (node, reducer) => new Java.ParameterList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceIdentifier: node => node,
    reduceToken: node => node,
    reduceAnnotationList: (node, reducer) => new Java.AnnotationList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceBinaryExpression: (node, reducer) => new Java.BinaryExpression(
      assertDefined(node.left.reduce(reducer)),
      assertDefined(node.token.reduce(reducer)),
      assertDefined(node.right.reduce(reducer)),
    ),
    reduceModifier: node => node,
    reduceField: (node, reducer) => {
      const field = new Java.Field(
        assertDefined(node.type.reduce(reducer)),
        assertDefined(node.identifier.reduce(reducer)),
        node.modifiers?.reduce(reducer),
        node.initializer?.reduce(reducer),
        node.annotations?.reduce(reducer),
      );

      field.comments = node.comments?.reduce(reducer);

      return field;
    },
    reduceCommentBlock: (node, reducer) => reduce(node.text, reducer, it => new Java.CommentBlock(it)),
    reduceComment: (node, reducer) => reduce(node.text, reducer, it => new Java.Comment(it)),

    // TODO: These three are silly and should not exist in their current form -- they should be PLACEHOLDERS without any child nodes -- and then a transformer should specialize them into expanded form
    reduceFieldBackedGetter: (node, reducer) => new Java.FieldBackedGetter(
      assertDefined(node.field.reduce(reducer)),
      node.signature.annotations?.reduce(reducer),
      node.signature.comments?.reduce(reducer),
      assertDefined(node.signature.identifier.reduce(reducer)),
    ),
    reduceFieldBackedSetter: (node, reducer) => new Java.FieldBackedSetter(
      assertDefined(node.field.reduce(reducer)),
      node.signature.annotations?.reduce(reducer),
      node.signature.comments?.reduce(reducer),
    ),
    reduceFieldGetterSetter: (node, reducer) => new Java.FieldGetterSetter(
      assertDefined(node.field.type.reduce(reducer)),
      assertDefined(node.field.identifier.reduce(reducer)),
      node.getter.signature.annotations?.reduce(reducer),
      node.getter.signature.comments?.reduce(reducer),
      node.getter.signature.identifier?.reduce(reducer),
    ),

    reduceMethodDeclaration: (node, reducer) => new Java.MethodDeclaration(
      assertDefined(node.signature.reduce(reducer)),
      node.body?.reduce(reducer),
    ),
    reduceMethodDeclarationSignature: (node, reducer) => {
      return new Java.MethodDeclarationSignature(
        assertDefined(node.identifier.reduce(reducer)),
        assertDefined(node.type.reduce(reducer)),
        node.parameters?.reduce(reducer),
        node.modifiers?.reduce(reducer),
        node.annotations?.reduce(reducer),
        node.comments?.reduce(reducer),
        node.throws?.reduce(reducer),
      );
    },
    reduceAbstractMethodDeclaration: (node, reducer) => new Java.AbstractMethodDeclaration(assertDefined(node.signature.reduce(reducer))),
    reduceExtendsDeclaration: (node, reducer) => new Java.ExtendsDeclaration(assertDefined(node.type.reduce(reducer))),
    reduceImplementsDeclaration: (node, reducer) => new Java.ImplementsDeclaration(assertDefined(node.types.reduce(reducer))),
    reduceTypeList: (node, reducer) => new Java.TypeList(node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceLiteral: node => node,
    reduceIfStatement: (node, reducer) => new Java.IfStatement(
      assertDefined(node.predicate.reduce(reducer)),
      assertDefined(node.body.reduce(reducer)),
    ),
    reduceIfElseStatement: (node, reducer) => new Java.IfElseStatement(
      node.ifStatements.map(it => it.reduce(reducer)).filter(isDefined),
      node.elseBlock?.reduce(reducer),
    ),
    reduceTernaryExpression: (node, reducer) => new Java.TernaryExpression(
      assertDefined(node.predicate.reduce(reducer)),
      assertDefined(node.passing.reduce(reducer)),
      assertDefined(node.failing.reduce(reducer)),
    ),
    reduceImportStatement: (node, reducer) => new Java.ImportStatement(assertDefined(node.type.reduce(reducer))),
    reduceImportList: (node, reducer) => new Java.ImportList(node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceMethodCall: (node, reducer) => new Java.MethodCall(
      assertDefined(node.target.reduce(reducer)),
      assertDefined(node.methodName.reduce(reducer)),
      assertDefined(node.methodArguments?.reduce(reducer)),
    ),
    reduceNewStatement: (node, reducer) => new Java.NewStatement(
      assertDefined(node.type.reduce(reducer)),
      node.constructorArguments?.reduce(reducer),
    ),
    reduceThrowStatement: (node, reducer) => new Java.ThrowStatement(
      assertDefined(node.expression.reduce(reducer)),
    ),
    reduceArgumentList: (node, reducer) => new Java.ArgumentList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceReturnStatement: (node, reducer) => new Java.ReturnStatement(assertDefined(node.expression.reduce(reducer))),
    reduceVariableDeclaration: (node, reducer) => new Java.VariableDeclaration(
      assertDefined(node.identifier.reduce(reducer)),
      node.initializer?.reduce(reducer),
      node.type?.reduce(reducer),
      node.constant,
    ),
    reduceDeclarationReference: (node, reducer) => new Java.DeclarationReference(assertDefined(node.declaration.reduce(reducer))),
    reduceAnnotation: (node, reducer) => {

      const type = assertDefined(node.type.reduce(reducer));
      if (type.omniType.kind != OmniTypeKind.HARDCODED_REFERENCE) {
        throw new Error(`Only allowed to have a hardcoded reference as annotation type`);
      }

      return new Java.Annotation(
        type as Java.EdgeType<typeof type.omniType>,
        node.pairs?.reduce(reducer),
      );
    },

    reduceAnnotationKeyValuePairList: (node, reducer) => new Java.AnnotationKeyValuePairList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceAnnotationKeyValuePair: (node, reducer) => new Java.AnnotationKeyValuePair(
      node.key?.reduce(reducer),
      assertDefined(node.value.reduce(reducer)),
    ),
    reduceHardCoded: node => node,
    reduceBlock: (node, reducer) => new Java.Block(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reducePackage: node => node,
    reducePredicate: (node, reducer) => reducer.reduceBinaryExpression(node, reducer),
    reduceModifierList: (node, reducer) => new Java.ModifierList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceCast: (node, reducer) => new Java.Cast(
      assertDefined(node.toType.reduce(reducer)),
      assertDefined(node.expression.reduce(reducer)),
    ),
    reduceObjectDeclaration: () => {
      throw new Error(`Should not be called when reducing`);
    },
    reduceObjectDeclarationBody: () => {
      throw new Error(`Should not be called when reducing`);
    },
    reduceClassDeclaration: (n, r) => {
      const dec = new Java.ClassDeclaration(
        assertDefined(n.type.reduce(r)),
        assertDefined(n.name.reduce(r)),
        assertDefined(n.body.reduce(r)),
        n.modifiers?.reduce(r),
      );

      dec.comments = n.comments?.reduce(r);
      dec.annotations = n.annotations?.reduce(r);
      dec.extends = n.extends?.reduce(r);
      dec.implements = n.implements?.reduce(r);
      dec.genericParameterList = n.genericParameterList?.reduce(r);

      return dec;
    },
    reduceGenericTypeDeclarationList: (node, reducer) => new Java.GenericTypeDeclarationList(node.types.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceGenericTypeDeclaration: (node, reducer) => new Java.GenericTypeDeclaration(
      assertDefined(node.name.reduce(reducer)),
      node.sourceIdentifier,
      node.upperBounds?.reduce(reducer),
      node.lowerBounds?.reduce(reducer),
    ),
    reduceInterfaceDeclaration: (node, reducer) => {
      const dec = new Java.InterfaceDeclaration(
        assertDefined(node.type.reduce(reducer)),
        assertDefined(node.name.reduce(reducer)),
        assertDefined(node.body.reduce(reducer)),
        node.modifiers?.reduce(reducer),
      );

      dec.comments = node.comments?.reduce(reducer);
      dec.annotations = node.annotations?.reduce(reducer);
      dec.extends = node.extends?.reduce(reducer);
      dec.implements = node.implements?.reduce(reducer);

      return dec;
    },
    reduceEnumDeclaration: (node, reducer) => {

      const type = assertDefined(node.type.reduce(reducer));
      if (!(type instanceof Java.EdgeType)) {
        throw new Error(`The enum declaration java type must be a regular type`);
      }
      if (type.omniType.kind != OmniTypeKind.ENUM) {
        throw new Error(`The enum declaration OmniType must be enum, not ${OmniUtil.describe(type.omniType)}`);
      }

      const dec = new Java.EnumDeclaration(
        type as Java.EdgeType<typeof type.omniType>,
        assertDefined(node.name.reduce(reducer)),
        assertDefined(node.body.reduce(reducer)),
        node.modifiers?.reduce(reducer),
      );

      dec.comments = node.comments?.reduce(reducer);
      dec.annotations = node.annotations?.reduce(reducer);
      dec.extends = node.extends?.reduce(reducer);
      dec.implements = node.implements?.reduce(reducer);

      return dec;
    },
    reduceEnumItem: (node, reducer) => new Java.EnumItem(
      assertDefined(node.identifier.reduce(reducer)),
      assertDefined(node.value.reduce(reducer)),
      node.comment?.reduce(reducer),
    ),
    reduceEnumItemList: (node, reducer) => new Java.EnumItemList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceFieldReference: node => node,
    reduceAssignExpression: (node, reducer) => new Java.AssignExpression(
      assertDefined(node.left.reduce(reducer)),
      assertDefined(node.right.reduce(reducer)),
    ),
    reduceCompilationUnit: (node, reducer) => new Java.CompilationUnit(
      assertDefined(node.packageDeclaration.reduce(reducer)),
      assertDefined(node.imports.reduce(reducer)),
      ...node.children.map(it => it.reduce(reducer)).filter(isDefined),
    ),
    reduceConstructor: (node, reducer) => {

      const dec = new Java.ConstructorDeclaration(
        node.parameters?.reduce(reducer),
        node.body?.reduce(reducer),
        node.modifiers.reduce(reducer),
      );

      dec.comments = node.comments?.reduce(reducer);
      dec.annotations = node.annotations?.reduce(reducer);

      return dec;
    },

    reduceConstructorParameterList: (node, reducer) => new Java.ConstructorParameterList(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceConstructorParameter: (node, reducer) => new Java.ConstructorParameter(
      assertDefined(node.field.reduce(reducer)),
      assertDefined(node.type.reduce(reducer)),
      assertDefined(node.identifier.reduce(reducer)),
      node.annotations?.reduce(reducer),
    ),

    reduceAdditionalPropertiesDeclaration: (node, reducer) => new Java.AdditionalPropertiesDeclaration(node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceStatement: (node, reducer) => new Java.Statement(assertDefined(node.child.reduce(reducer))),
    reduceSuperConstructorCall: (node, reducer) => new Java.SuperConstructorCall(assertDefined(node.parameters.reduce(reducer))),

    reduceClassName: (node, reducer) => new Java.ClassName(assertDefined(node.type.reduce(reducer))),
    reduceClassReference: (node, reducer) => new Java.ClassReference(assertDefined(node.className.reduce(reducer))),
    reduceArrayInitializer: (node, reducer) => new Java.ArrayInitializer(...node.children.map(it => it.reduce(reducer)).filter(isDefined)),
    reduceStaticMemberReference: (node, reducer) => new Java.StaticMemberReference(
      assertDefined(node.target.reduce(reducer)),
      assertDefined(node.member.reduce(reducer)),
    ),
    reduceSelfReference: node => node,
  };
};

export const DefaultJavaReducer = createJavaReducer();
