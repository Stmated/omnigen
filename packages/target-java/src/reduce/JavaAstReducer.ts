import {AstFreeTextVisitor, JavaVisitor} from '../visit';
import {AstNode, OmniTypeKind, reduce, Reducer, Reference} from '@omnigen/core';
import * as Java from '../ast';
import {assertDefined, isDefined, OmniUtil} from '@omnigen/core-util';

export type FreeTextReducer = Reducer<AstFreeTextVisitor<unknown>>;

export const createFreeTextReducer = (partial?: Partial<FreeTextReducer>): FreeTextReducer => {
  return {
    reduce: (n, reducer) => n.reduce(reducer),
    reduceFreeTexts: (n, reducer) => {
      const children = n.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new Java.FreeTexts(children).withIdFrom(n);
    },
    reduceFreeText: n => n,
    reduceFreeTextParagraph: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextParagraph(it)),
    reduceFreeTextSection: (n, reducer) => {
      const header = n.header.reduce(reducer);
      const content = n.content.reduce(reducer);
      if (!header && !content) {
        return undefined;
      } else if (!header) {
        return content;
      } else if (!content) {
        return header;
      } else {
        return new Java.FreeTextSection(header as any, content as any).withIdFrom(n);
      }
    },
    reduceFreeTextLine: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextLine(it).withIdFrom(it)),
    reduceFreeTextIndent: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextIndent(it).withIdFrom(it)),
    reduceFreeTextHeader: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextHeader(n.level, it).withIdFrom(it)),
    reduceFreeTextTypeLink: (n, reducer) => reduce(n.type, reducer, it => new Java.FreeTextTypeLink(it)),
    reduceFreeTextMethodLink: (n, reducer) => {
      const type = n.type.reduce(reducer) ?? new Java.WildcardType({kind: OmniTypeKind.UNKNOWN});
      const method = n.method.reduce(reducer) ?? new Java.HardCoded(`???`);
      return new Java.FreeTextMethodLink(type, method).withIdFrom(n);
    },
    reduceFreeTextPropertyLink: (n, reducer) => {
      const type = n.type.reduce(reducer);
      return type ? new Java.FreeTextPropertyLink(type, n.property).withIdFrom(n) : type;
    },
    reduceFreeTextList: (n, reducer) => {
      const children = n.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new Java.FreeTextList(children, n.ordered).withIdFrom(n);
    },
    reduceFreeTextExample: (n, r) => new Java.FreeTextExample(assertDefined(n.content.reduce(r))).withIdFrom(n),
    reduceFreeTextCode: (n, r) => new Java.FreeTextCode(assertDefined(n.content.reduce(r))).withIdFrom(n),
    reduceFreeTextSummary: (n, r) => new Java.FreeTextSummary(assertDefined(n.content.reduce(r))).withIdFrom(n),
    reduceFreeTextRemark: (n, r) => new Java.FreeTextRemark(assertDefined(n.content.reduce(r))).withIdFrom(n),
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
    reduceWildcardType: (n, r) => n,
    reduceBoundedType: (n, r) => new Java.BoundedType(
      n.omniType,
      assertDefined(n.type.reduce(r)),
      n.upperBound?.reduce(r),
      n.lowerBound?.reduce(r),
    ).withIdFrom(n),
    reduceArrayType: (n, reducer) => new Java.ArrayType(n.omniType, assertDefined(n.of.reduce(reducer)), n.implementation).withIdFrom(n),
    reduceGenericType: (n, r) => {
      const baseType = n.baseType.reduce(r);
      const genericArguments = n.genericArguments.map(it => it.reduce(r)).filter(isDefined);
      if (baseType && baseType instanceof Java.EdgeType && genericArguments.length > 0) {
        return new Java.GenericType(baseType.omniType, baseType, genericArguments).withIdFrom(n);
      }

      return baseType;
    },
    reduceParameter: (n, reducer) => {

      return new Java.Parameter(
        assertDefined(n.type.reduce(reducer)),
        assertDefined(n.identifier.reduce(reducer)),
        n.annotations?.reduce(reducer),
      ).withIdFrom(n);
    },
    reduceParameterList: (n, reducer) => new Java.ParameterList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceIdentifier: n => n,
    reduceToken: n => n,
    reduceAnnotationList: (n, reducer) => new Java.AnnotationList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceBinaryExpression: (n, reducer) => new Java.BinaryExpression(
      assertDefined(n.left.reduce(reducer)),
      assertDefined(n.token.reduce(reducer)),
      assertDefined(n.right.reduce(reducer)),
    ).withIdFrom(n),
    reduceModifier: n => n,
    reduceField: (n, reducer) => {
      const field = new Java.Field(
        assertDefined(n.type.reduce(reducer)),
        assertDefined(n.identifier.reduce(reducer)),
        n.modifiers?.reduce(reducer),
        n.initializer?.reduce(reducer),
        n.annotations?.reduce(reducer),
      ).withIdFrom(n);

      field.comments = n.comments?.reduce(reducer);
      if (n.property) {
        field.property = n.property;
      }

      return field;
    },
    reduceComment: (n, r) => {
      const reducedTexts = n.text.reduce(r);
      if (!reducedTexts) {
        return undefined;
      }

      return new Java.Comment(reducedTexts, n.kind).withIdFrom(n);
    },

    // TODO: These three are silly and should not exist in their current form -- they should be PLACEHOLDERS without any child nodes -- and then a transformer should specialize them into expanded form
    reduceFieldBackedGetter: (n, r) => {

      const fieldRef = n.fieldRef.reduce(r);
      if (!fieldRef || !(fieldRef instanceof Java.FieldReference)) {
        // If no longer a field, then there is no need for it as a a field-backed getter.
        return undefined;
      }

      return new Java.FieldBackedGetter(
        fieldRef,
        n.annotations?.reduce(r),
        n.comments?.reduce(r),
        n.getterName?.reduce(r),
      ).withIdFrom(n);
    },
    reduceFieldBackedSetter: (n, r) => {
      const fieldRef = n.fieldRef.reduce(r);
      if (!fieldRef || !(fieldRef instanceof Java.FieldReference)) {
        // If no longer a field, then there is no need for it as a a field-backed setter.
        return undefined;
      }

      return new Java.FieldBackedSetter(
        fieldRef,
        n.annotations?.reduce(r),
        n.comments?.reduce(r),
      ).withIdFrom(n);
    },
    reduceMethodDeclaration: (n, r) => {
      return new Java.MethodDeclaration(
        assertDefined(n.signature.reduce(r)),
        n.body?.reduce(r),
      ).withIdFrom(n);
    },
    reduceMethodDeclarationSignature: (n, r) => {
      return new Java.MethodDeclarationSignature(
        assertDefined(n.identifier.reduce(r)),
        assertDefined(n.type.reduce(r)),
        n.parameters?.reduce(r),
        n.modifiers?.reduce(r),
        n.annotations?.reduce(r),
        n.comments?.reduce(r),
        n.throws?.reduce(r),
      ).withIdFrom(n);
    },
    reduceAbstractMethodDeclaration: (n, reducer) => new Java.AbstractMethodDeclaration(assertDefined(n.signature.reduce(reducer))).withIdFrom(n),
    reduceExtendsDeclaration: (n, reducer) => new Java.ExtendsDeclaration(assertDefined(n.types.reduce(reducer))).withIdFrom(n),
    reduceImplementsDeclaration: (n, reducer) => new Java.ImplementsDeclaration(assertDefined(n.types.reduce(reducer))).withIdFrom(n),
    reduceTypeList: (n, reducer) => new Java.TypeList(n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceLiteral: n => n,
    reduceIfStatement: (n, reducer) => new Java.IfStatement(
      assertDefined(n.predicate.reduce(reducer)),
      assertDefined(n.body.reduce(reducer)),
    ).withIdFrom(n),
    reduceIfElseStatement: (n, reducer) => new Java.IfElseStatement(
      n.ifStatements.map(it => it.reduce(reducer)).filter(isDefined),
      n.elseBlock?.reduce(reducer),
    ).withIdFrom(n),
    reduceTernaryExpression: (n, reducer) => new Java.TernaryExpression(
      assertDefined(n.predicate.reduce(reducer)),
      assertDefined(n.passing.reduce(reducer)),
      assertDefined(n.failing.reduce(reducer)),
    ).withIdFrom(n),
    reduceImportStatement: (n, reducer) => new Java.ImportStatement(assertDefined(n.type.reduce(reducer))).withIdFrom(n),
    reduceImportList: (n, reducer) => new Java.ImportList(n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceMethodCall: (n, reducer) => new Java.MethodCall(
      assertDefined(n.target.reduce(reducer)),
      assertDefined(n.methodArguments?.reduce(reducer)),
    ).withIdFrom(n),
    reduceNewStatement: (n, reducer) => new Java.NewStatement(
      assertDefined(n.type.reduce(reducer)),
      n.constructorArguments?.reduce(reducer),
    ).withIdFrom(n),
    reduceThrowStatement: (n, reducer) => new Java.ThrowStatement(
      assertDefined(n.expression.reduce(reducer)),
    ).withIdFrom(n),
    reduceArgumentList: (n, reducer) => new Java.ArgumentList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceReturnStatement: (n, reducer) => {
      const expr = n.expression.reduce(reducer);
      return expr ? new Java.ReturnStatement(expr).withIdFrom(n) : undefined;
    },
    reduceVariableDeclaration: (n, reducer) => new Java.VariableDeclaration(
      assertDefined(n.identifier.reduce(reducer)),
      n.initializer?.reduce(reducer),
      n.type?.reduce(reducer),
      n.constant,
    ).withIdFrom(n),
    reduceDeclarationReference: n => n,

    reduceAnnotation: (n, reducer) => {

      const type = assertDefined(n.type.reduce(reducer));
      if (type.omniType.kind != OmniTypeKind.HARDCODED_REFERENCE) {
        throw new Error(`Only allowed to have a hardcoded reference as annotation type`);
      }

      return new Java.Annotation(
        type as Java.EdgeType<typeof type.omniType>,
        n.pairs?.reduce(reducer),
      ).withIdFrom(n);
    },

    reduceAnnotationKeyValuePairList: (n, reducer) =>
      new Java.AnnotationKeyValuePairList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceAnnotationKeyValuePair: (n, reducer) => new Java.AnnotationKeyValuePair(
      n.key?.reduce(reducer),
      assertDefined(n.value.reduce(reducer)),
    ).withIdFrom(n),
    reduceHardCoded: n => n,
    reduceBlock: (n, reducer) => {
      const reduced = new Java.Block(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n);
      reduced.enclosed = n.enclosed;
      reduced.compact = n.compact;

      return reduced;
    },
    reducePackage: n => n,
    reducePredicate: (n, reducer) => reducer.reduceBinaryExpression(n, reducer),
    reduceModifierList: (n, reducer) => new Java.ModifierList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceCast: (n, reducer) => new Java.Cast(
      assertDefined(n.toType.reduce(reducer)),
      assertDefined(n.expression.reduce(reducer)),
    ).withIdFrom(n),
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
      ).withIdFrom(n);

      dec.comments = n.comments?.reduce(r);
      dec.annotations = n.annotations?.reduce(r);
      dec.extends = n.extends?.reduce(r);
      dec.implements = n.implements?.reduce(r);
      dec.genericParameterList = n.genericParameterList?.reduce(r);

      return dec;
    },
    reduceGenericTypeDeclarationList: (n, r) =>
      new Java.GenericTypeDeclarationList(n.types.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceGenericTypeDeclaration: (n, r) => new Java.GenericTypeDeclaration(
      assertDefined(n.name.reduce(r)),
      n.sourceIdentifier,
      n.upperBounds?.reduce(r),
      n.lowerBounds?.reduce(r),
    ).withIdFrom(n),
    reduceInterfaceDeclaration: (n, reducer) => {
      const dec = new Java.InterfaceDeclaration(
        assertDefined(n.type.reduce(reducer)),
        assertDefined(n.name.reduce(reducer)),
        assertDefined(n.body.reduce(reducer)),
        n.modifiers?.reduce(reducer),
      ).withIdFrom(n);

      dec.comments = n.comments?.reduce(reducer);
      dec.annotations = n.annotations?.reduce(reducer);
      dec.extends = n.extends?.reduce(reducer);
      dec.implements = n.implements?.reduce(reducer);
      dec.genericParameterList = n.genericParameterList?.reduce(reducer);
      dec.inline = n.inline;

      return dec;
    },
    reduceEnumDeclaration: (n, reducer) => {

      const type = assertDefined(n.type.reduce(reducer));
      if (!(type instanceof Java.EdgeType)) {
        throw new Error(`The enum declaration java type must be a regular type`);
      }
      if (type.omniType.kind != OmniTypeKind.ENUM) {
        throw new Error(`The enum declaration OmniType must be enum, not ${OmniUtil.describe(type.omniType)}`);
      }

      const dec = new Java.EnumDeclaration(
        type as Java.EdgeType<typeof type.omniType>,
        assertDefined(n.name.reduce(reducer)),
        assertDefined(n.body.reduce(reducer)),
        n.modifiers?.reduce(reducer),
      ).withIdFrom(n);

      dec.comments = n.comments?.reduce(reducer);
      dec.annotations = n.annotations?.reduce(reducer);
      dec.extends = n.extends?.reduce(reducer);
      dec.implements = n.implements?.reduce(reducer);
      dec.genericParameterList = n.genericParameterList?.reduce(reducer);

      return dec;
    },
    reduceEnumItem: (n, reducer) => new Java.EnumItem(
      assertDefined(n.identifier.reduce(reducer)),
      assertDefined(n.value.reduce(reducer)),
      n.comment?.reduce(reducer),
    ).withIdFrom(n),
    reduceEnumItemList: (n, reducer) => new Java.EnumItemList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceFieldReference: n => n,
    reduceAssignExpression: (n, reducer) => {

      const left = n.left.reduce(reducer);
      const right = n.right.reduce(reducer);

      if (left === undefined || right === undefined) {

        // If the left or right node was removed, then we either have nothing to assign to, or nothing to assign from. So we remove ourself.
        return undefined;
      }

      return new Java.AssignExpression(left, right).withIdFrom(n);
    },
    reduceCompilationUnit: (n, reducer) => {
      const children = n.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }
      return new Java.CompilationUnit(
        assertDefined(n.packageDeclaration.reduce(reducer)),
        assertDefined(n.imports.reduce(reducer)),
        ...children,
      ).withIdFrom(n);
    },
    reduceConstructor: (n, r) => {

      const dec = new Java.ConstructorDeclaration(
        n.parameters?.reduce(r),
        n.body?.reduce(r),
        n.modifiers.reduce(r),
      ).withIdFrom(n);

      dec.comments = n.comments?.reduce(r);
      dec.annotations = n.annotations?.reduce(r);
      dec.superCall = n.superCall?.reduce(r);

      return dec;
    },

    reduceConstructorParameterList: (n, r) =>
      new Java.ConstructorParameterList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceConstructorParameter: (n, r) => {

      const ref = n.ref.reduce(r);
      if (!ref) {
        // If the field has been removed, then there is no need for the constructor parameter.
        return undefined;
      } else if (!('targetId' in ref)) {

        // If no longer a reference, then there is no need for it as a constructor parameter.
        // NOTE: This is... very ugly. It needs some other way of handling, so we do not need the bad `as Reference` cast below
        return undefined;
      }

      return new Java.ConstructorParameter(
        ref as Reference<AstNode>,
        assertDefined(n.type.reduce(r)),
        assertDefined(n.identifier.reduce(r)),
        n.annotations?.reduce(r),
      ).withIdFrom(n);
    },

    reduceStatement: (n, r) => {
      const child = n.child.reduce(r);
      return child ? new Java.Statement(child).withIdFrom(n) : undefined;
    },
    reduceSuperConstructorCall: (n, r) => new Java.SuperConstructorCall(assertDefined(n.arguments.reduce(r))).withIdFrom(n),

    reduceClassName: (n, r) => new Java.ClassName(assertDefined(n.type.reduce(r))).withIdFrom(n),
    reduceClassReference: (n, r) => new Java.ClassReference(assertDefined(n.className.reduce(r))).withIdFrom(n),
    reduceArrayInitializer: (n, r) => new Java.ArrayInitializer(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceStaticMemberReference: (n, r) => new Java.StaticMemberReference(
      assertDefined(n.target.reduce(r)),
      assertDefined(n.member.reduce(r)),
    ).withIdFrom(n),
    reduceSelfReference: n => n,
    reduceNodes: (n, r) => {
      const children = n.children.map(it => it.reduce(r)).filter(isDefined);
      return (children.length > 0) ? new Java.Nodes(...children).withIdFrom(n) : undefined;
    },
    reduceDecoratingTypeNode: (n, r) => {
      const of = n.of.reduce(r);
      return of ? new Java.DecoratingTypeNode(of, n.omniType).withIdFrom(n) : undefined;
    },

    reduceNamespace: (n, r) => new Java.Namespace(
      assertDefined(n.name.reduce(r)),
      assertDefined(n.block.reduce(r)),
    ).withIdFrom(n),
    reduceNamespaceBlock: (n, r) => {

      const reduced = new Java.NamespaceBlock(
        assertDefined(n.block.reduce(r)),
      ).withIdFrom(n);

      if (reduced.block.children.length == 0) {
        return undefined;
      }

      return reduced;
    },

    reduceTypeNamespace: (n, r) => new Java.TypePath(
      n.parts.map(it => it.reduce(r)).filter(isDefined),
      assertDefined(n.leaf.reduce(r)),
    ).withIdFrom(n),

    reduceGenericRef: (n, r) => n,

    reduceDelegate: (n, r) => new Java.Delegate(
      n.parameterTypes.map(it => it.reduce(r)).filter(isDefined),
      assertDefined(n.returnType.reduce(r)),
    ).withIdFrom(n),
    reduceDelegateCall: (n, r) => new Java.DelegateCall(
      assertDefined(n.target.reduce(r)),
      assertDefined(n.delegateRef.reduce(r)),
      assertDefined(n.args.reduce(r)),
    ).withIdFrom(n),
    reduceMemberAccess: (n, r) => new Java.MemberAccess(
      assertDefined(n.owner.reduce(r)),
      assertDefined(n.member.reduce(r)),
    ).withIdFrom(n),
  };
};

export const DefaultJavaReducer = createJavaReducer();
