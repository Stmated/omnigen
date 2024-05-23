import {AstNode, OmniTypeKind, reduce, Reducer, Reference} from '@omnigen/core';
import * as Code from '../ast/CodeAst';
import * as FreeText from '../ast/FreeText';
import {assertDefined, isDefined, OmniUtil} from '@omnigen/core-util';
import {AstFreeTextVisitor} from '../visitor/FreeTextVisitor';
import {CodeVisitor} from '../visitor/CodeVisitor';

export type FreeTextReducer = Reducer<AstFreeTextVisitor<unknown>>;

export const createCodeFreeTextReducer = (partial?: Partial<FreeTextReducer>): FreeTextReducer => {
  return {
    reduce: (n, r) => n.reduce(r),
    reduceFreeTexts: (n, reducer) => {
      const children = n.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new FreeText.FreeTexts(children).withIdFrom(n);
    },
    reduceFreeText: n => n,
    reduceFreeTextParagraph: (n, r) => reduce(n.child, r, it => new FreeText.FreeTextParagraph(it)),
    reduceFreeTextSection: (n, r) => {
      const header = n.header.reduce(r);
      const content = n.content.reduce(r);
      if (!header && !content) {
        return undefined;
      } else if (!header) {
        return content;
      } else if (!content) {
        return header;
      } else {
        return new FreeText.FreeTextSection(header as any, content as any).withIdFrom(n);
      }
    },
    reduceFreeTextLine: (n, r) => reduce(n.child, r, it => new FreeText.FreeTextLine(it).withIdFrom(it)),
    reduceFreeTextIndent: (n, r) => reduce(n.child, r, it => new FreeText.FreeTextIndent(it).withIdFrom(it)),
    reduceFreeTextHeader: (n, r) => reduce(n.child, r, it => new FreeText.FreeTextHeader(n.level, it).withIdFrom(it)),
    reduceFreeTextTypeLink: (n, r) => reduce(n.type, r, it => new FreeText.FreeTextTypeLink(it)),
    reduceFreeTextMemberLink: (n, r) => {
      const type = n.type.reduce(r) ?? new Code.WildcardType({kind: OmniTypeKind.UNKNOWN});
      const method = n.member.reduce(r) ?? new Code.HardCoded(`???`);
      return new FreeText.FreeTextMemberLink(type, method).withIdFrom(n);
    },
    reduceFreeTextSee: (n, r) => new FreeText.FreeTextSee(
      assertDefined(n.target.reduce(r)),
      n.description?.reduce(r),
    ).withIdFrom(n),
    reduceFreeTextPropertyLink: (n, r) => {
      const type = n.type.reduce(r);
      return type ? new FreeText.FreeTextPropertyLink(type, n.property).withIdFrom(n) : type;
    },
    reduceFreeTextList: (n, r) => {
      const children = n.children.map(it => it.reduce(r)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new FreeText.FreeTextList(children, n.ordered).withIdFrom(n);
    },
    reduceFreeTextExample: (n, r) => new FreeText.FreeTextExample(assertDefined(n.content.reduce(r))).withIdFrom(n),
    reduceFreeTextCode: (n, r) => new FreeText.FreeTextCode(assertDefined(n.content.reduce(r))).withIdFrom(n),
    reduceFreeTextSummary: (n, r) => new FreeText.FreeTextSummary(assertDefined(n.content.reduce(r))).withIdFrom(n),
    reduceFreeTextRemark: (n, r) => new FreeText.FreeTextRemark(assertDefined(n.content.reduce(r))).withIdFrom(n),
    ...partial,
  };
};

// TODO: This part should be done some other way, and not hard-coded like this.
//        Maybe the better way is to have no magic, and instead only enforce that the keys exist, and let it be up to each reduce method what its return type should be?
type CodeReducerBase = Reducer<CodeVisitor<unknown>>;

export type CodeReducer = CodeReducerBase;

export const createCodeReducer = (partial?: Partial<CodeReducer>): Readonly<CodeReducer> => {

  return {
    ...createCodeFreeTextReducer(partial),
    reduceEdgeType: n => n,
    reduceWildcardType: n => n,
    reduceBoundedType: (n, r) => new Code.BoundedType(
      n.omniType,
      assertDefined(n.type.reduce(r)),
      n.upperBound?.reduce(r),
      n.lowerBound?.reduce(r),
    ).withIdFrom(n),
    reduceArrayType: (n, r) => new Code.ArrayType(n.omniType, assertDefined(n.of.reduce(r)), n.implementation).withIdFrom(n),
    reduceGenericType: (n, r) => {
      const baseType = n.baseType.reduce(r);
      const genericArguments = n.genericArguments.map(it => it.reduce(r)).filter(isDefined);
      if (baseType && baseType instanceof Code.EdgeType && genericArguments.length > 0) {
        return new Code.GenericType(baseType.omniType, baseType, genericArguments).withIdFrom(n);
      }

      return baseType;
    },
    reduceParameter: (n, r) => {

      return new Code.Parameter(
        assertDefined(n.type.reduce(r)),
        assertDefined(n.identifier.reduce(r)),
        n.annotations?.reduce(r),
      ).withIdFrom(n);
    },
    reduceParameterList: (n, reducer) => new Code.ParameterList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceIdentifier: n => n,
    reduceGetterIdentifier: (n, r) => new Code.GetterIdentifier(
      assertDefined(n.identifier.reduce(r)),
      assertDefined(n.type.reduce(r)),
    ).withIdFrom(n),
    reduceSetterIdentifier: (n, r) => new Code.SetterIdentifier(
      assertDefined(n.identifier.reduce(r)),
      assertDefined(n.type.reduce(r)),
    ).withIdFrom(n),
    reduceToken: n => n,
    reduceBinaryExpression: (n, r) => new Code.BinaryExpression(
      assertDefined(n.left.reduce(r)),
      assertDefined(n.token.reduce(r)),
      assertDefined(n.right.reduce(r)),
    ).withIdFrom(n),
    reduceModifier: n => n,
    reduceField: (n, r) => {
      const field = new Code.Field(
        assertDefined(n.type.reduce(r)),
        assertDefined(n.identifier.reduce(r)),
        n.modifiers?.reduce(r),
        n.initializer?.reduce(r),
        n.annotations?.reduce(r),
      ).withIdFrom(n);

      field.comments = n.comments?.reduce(r);
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

      return new Code.Comment(reducedTexts, n.kind).withIdFrom(n);
    },

    // TODO: These three are silly and should not exist in their current form -- they should be PLACEHOLDERS without any child nodes -- and then a transformer should specialize them into expanded form
    reduceFieldBackedGetter: (n, r) => {

      const fieldRef = n.fieldRef.reduce(r);
      if (!fieldRef || !(fieldRef instanceof Code.FieldReference)) {
        // If no longer a field, then there is no need for it as a a field-backed getter.
        return undefined;
      }

      return new Code.FieldBackedGetter(
        fieldRef,
        n.annotations?.reduce(r),
        n.comments?.reduce(r),
        n.getterName?.reduce(r),
      ).withIdFrom(n);
    },
    reduceFieldBackedSetter: (n, r) => {
      const fieldRef = n.fieldRef.reduce(r);
      if (!fieldRef || !(fieldRef instanceof Code.FieldReference)) {
        // If no longer a field, then there is no need for it as a a field-backed setter.
        return undefined;
      }

      return new Code.FieldBackedSetter(
        fieldRef,
        n.annotations?.reduce(r),
        n.comments?.reduce(r),
      ).withIdFrom(n);
    },
    reduceMethodDeclaration: (n, r) => {
      return new Code.MethodDeclaration(
        assertDefined(n.signature.reduce(r)),
        n.body?.reduce(r),
      ).withIdFrom(n);
    },
    reduceMethodDeclarationSignature: (n, r) => {
      return new Code.MethodDeclarationSignature(
        assertDefined(n.identifier.reduce(r)),
        assertDefined(n.type.reduce(r)),
        n.parameters?.reduce(r),
        n.modifiers?.reduce(r),
        n.annotations?.reduce(r),
        n.comments?.reduce(r),
        n.throws?.reduce(r),
      ).withIdFrom(n);
    },
    reduceAbstractMethodDeclaration: (n, r) => new Code.AbstractMethodDeclaration(assertDefined(n.signature.reduce(r))).withIdFrom(n),
    reduceExtendsDeclaration: (n, r) => new Code.ExtendsDeclaration(assertDefined(n.types.reduce(r))).withIdFrom(n),
    reduceImplementsDeclaration: (n, r) => new Code.ImplementsDeclaration(assertDefined(n.types.reduce(r))).withIdFrom(n),
    reduceTypeList: (n, r) => new Code.TypeList(n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceLiteral: n => n,
    reduceIfStatement: (n, r) => new Code.IfStatement(
      assertDefined(n.predicate.reduce(r)),
      assertDefined(n.body.reduce(r)),
    ).withIdFrom(n),
    reduceIfElseStatement: (n, r) => new Code.IfElseStatement(
      n.ifStatements.map(it => it.reduce(r)).filter(isDefined),
      n.elseBlock?.reduce(r),
    ).withIdFrom(n),
    reduceTernaryExpression: (n, r) => new Code.TernaryExpression(
      assertDefined(n.predicate.reduce(r)),
      assertDefined(n.passing.reduce(r)),
      assertDefined(n.failing.reduce(r)),
    ).withIdFrom(n),
    reduceImportStatement: (n, r) => {
      const type = n.type.reduce(r);
      return !type ? undefined : new Code.ImportStatement(type).withIdFrom(n);
    },
    reduceImportList: (n, r) => new Code.ImportList(n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceMethodCall: (n, r) => new Code.MethodCall(
      assertDefined(n.target.reduce(r)),
      assertDefined(n.methodArguments?.reduce(r)),
    ).withIdFrom(n),
    reduceNewStatement: (n, r) => new Code.NewStatement(
      assertDefined(n.type.reduce(r)),
      n.constructorArguments?.reduce(r),
    ).withIdFrom(n),
    reduceThrowStatement: (n, r) => new Code.ThrowStatement(
      assertDefined(n.expression.reduce(r)),
    ).withIdFrom(n),
    reduceArgumentList: (n, r) => new Code.ArgumentList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceReturnStatement: (n, r) => {
      const expr = n.expression.reduce(r);
      return expr ? new Code.ReturnStatement(expr).withIdFrom(n) : undefined;
    },
    reduceVariableDeclaration: (n, r) => new Code.VariableDeclaration(
      assertDefined(n.identifier.reduce(r)),
      n.initializer?.reduce(r),
      n.type?.reduce(r),
      n.constant,
    ).withIdFrom(n),
    reduceDeclarationReference: n => n,

    reduceAnnotationList: (n, r) => new Code.AnnotationList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceAnnotation: (n, r) => {

      const type = assertDefined(n.type.reduce(r));
      if (type.omniType.kind != OmniTypeKind.HARDCODED_REFERENCE) {
        throw new Error(`Only allowed to have a hardcoded reference as annotation type`);
      }

      return new Code.Annotation(
        type as Code.EdgeType<typeof type.omniType>,
        n.pairs?.reduce(r),
      ).withIdFrom(n);
    },

    reduceAnnotationKeyValuePairList: (n, r) =>
      new Code.AnnotationKeyValuePairList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceAnnotationKeyValuePair: (n, r) => new Code.AnnotationKeyValuePair(
      n.key?.reduce(r),
      assertDefined(n.value.reduce(r)),
    ).withIdFrom(n),
    reduceVirtualAnnotationNode: n => n,

    reduceHardCoded: n => n,
    reduceBlock: (n, reducer) => {
      const reduced = new Code.Block(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n);
      reduced.enclosed = n.enclosed;
      reduced.compact = n.compact;

      return reduced;
    },
    reducePackage: n => n,
    reducePredicate: (n, r) => r.reduceBinaryExpression(n, r),
    reduceModifierList: (n, r) => new Code.ModifierList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceCast: (n, r) => new Code.Cast(
      assertDefined(n.toType.reduce(r)),
      assertDefined(n.expression.reduce(r)),
    ).withIdFrom(n),
    reduceObjectDeclaration: () => {
      throw new Error(`Should not be called when reducing`);
    },
    reduceObjectDeclarationBody: () => {
      throw new Error(`Should not be called when reducing`);
    },
    reduceClassDeclaration: (n, r) => {
      const dec = new Code.ClassDeclaration(
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
      new Code.GenericTypeDeclarationList(n.types.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceGenericTypeDeclaration: (n, r) => new Code.GenericTypeDeclaration(
      assertDefined(n.name.reduce(r)),
      n.sourceIdentifier,
      n.upperBounds?.reduce(r),
      n.lowerBounds?.reduce(r),
    ).withIdFrom(n),
    reduceInterfaceDeclaration: (n, r) => {
      const dec = new Code.InterfaceDeclaration(
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
      dec.inline = n.inline;

      return dec;
    },
    reduceEnumDeclaration: (n, r) => {

      const type = assertDefined(n.type.reduce(r));
      if (!(type instanceof Code.EdgeType)) {
        throw new Error(`The enum declaration java type must be a regular type`);
      }
      if (type.omniType.kind != OmniTypeKind.ENUM) {
        throw new Error(`The enum declaration OmniType must be enum, not ${OmniUtil.describe(type.omniType)}`);
      }

      const dec = new Code.EnumDeclaration(
        type as Code.EdgeType<typeof type.omniType>,
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
    reduceEnumItem: (n, r) => new Code.EnumItem(
      assertDefined(n.identifier.reduce(r)),
      assertDefined(n.value.reduce(r)),
      n.comment?.reduce(r),
    ).withIdFrom(n),
    reduceEnumItemList: (n, r) => new Code.EnumItemList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceFieldReference: n => n,
    reduceAssignExpression: (n, r) => {

      const left = n.left.reduce(r);
      const right = n.right.reduce(r);

      if (left === undefined || right === undefined) {

        // If the left or right node was removed, then we either have nothing to assign to, or nothing to assign from. So we remove ourself.
        return undefined;
      }

      return new Code.AssignExpression(left, right).withIdFrom(n);
    },
    reduceCompilationUnit: (n, r) => {
      const children = n.children.map(it => it.reduce(r)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }
      return new Code.CompilationUnit(
        assertDefined(n.packageDeclaration.reduce(r)),
        assertDefined(n.imports.reduce(r)),
        ...children,
      ).withIdFrom(n);
    },
    reduceConstructor: (n, r) => {

      const dec = new Code.ConstructorDeclaration(
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
      new Code.ConstructorParameterList(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
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

      return new Code.ConstructorParameter(
        ref as Reference<AstNode>,
        assertDefined(n.type.reduce(r)),
        assertDefined(n.identifier.reduce(r)),
        n.annotations?.reduce(r),
      ).withIdFrom(n);
    },

    reduceStatement: (n, r) => {
      const child = n.child.reduce(r);
      return child ? new Code.Statement(child).withIdFrom(n) : undefined;
    },
    reduceSuperConstructorCall: (n, r) => new Code.SuperConstructorCall(assertDefined(n.arguments.reduce(r))).withIdFrom(n),

    reduceClassName: (n, r) => new Code.ClassName(assertDefined(n.type.reduce(r))).withIdFrom(n),
    reduceClassReference: (n, r) => new Code.ClassReference(assertDefined(n.className.reduce(r))).withIdFrom(n),
    reduceArrayInitializer: (n, r) => new Code.ArrayInitializer(...n.children.map(it => it.reduce(r)).filter(isDefined)).withIdFrom(n),
    reduceStaticMemberReference: (n, r) => new Code.StaticMemberReference(
      assertDefined(n.target.reduce(r)),
      assertDefined(n.member.reduce(r)),
    ).withIdFrom(n),
    reduceSelfReference: n => n,
    reduceNodes: (n, r) => {
      const children = n.children.map(it => it.reduce(r)).filter(isDefined);
      return (children.length > 0) ? new Code.Nodes(...children).withIdFrom(n) : undefined;
    },
    reduceDecoratingTypeNode: (n, r) => {
      const of = n.of.reduce(r);
      return of ? new Code.DecoratingTypeNode(of, n.omniType).withIdFrom(n) : undefined;
    },

    reduceNamespace: (n, r) => new Code.Namespace(
      assertDefined(n.name.reduce(r)),
      assertDefined(n.block.reduce(r)),
    ).withIdFrom(n),
    reduceNamespaceBlock: (n, r) => {

      const reduced = new Code.NamespaceBlock(
        assertDefined(n.block.reduce(r)),
      ).withIdFrom(n);

      if (reduced.block.children.length == 0) {
        return undefined;
      }

      return reduced;
    },

    reduceTypeNamespace: (n, r) => new Code.TypePath(
      n.parts.map(it => it.reduce(r)).filter(isDefined),
      assertDefined(n.leaf.reduce(r)),
    ).withIdFrom(n),

    reduceGenericRef: n => n,

    reduceDelegate: (n, r) => new Code.Delegate(
      n.parameterTypes.map(it => it.reduce(r)).filter(isDefined),
      assertDefined(n.returnType.reduce(r)),
      n.kind,
    ).withIdFrom(n),
    reduceDelegateCall: (n, r) => new Code.DelegateCall(
      assertDefined(n.target.reduce(r)),
      assertDefined(n.delegateRef.reduce(r)),
      assertDefined(n.args.reduce(r)),
    ).withIdFrom(n),
    reduceMemberAccess: (n, r) => new Code.MemberAccess(
      assertDefined(n.owner.reduce(r)),
      assertDefined(n.member.reduce(r)),
    ).withIdFrom(n),
  };
};

export const DefaultCodeReducer = createCodeReducer();
