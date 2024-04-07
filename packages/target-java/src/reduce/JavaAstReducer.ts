import {AstFreeTextVisitor, JavaVisitor} from '../visit';
import {OmniTypeKind, reduce, Reducer} from '@omnigen/core';
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

      return new Java.FreeTexts(children).setId(n.id);
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
        return new Java.FreeTextSection(header as any, content as any).setId(n.id);
      }
    },
    reduceFreeTextLine: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextLine(it).setId(it.id)),
    reduceFreeTextIndent: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextIndent(it).setId(it.id)),
    reduceFreeTextHeader: (n, reducer) => reduce(n.child, reducer, it => new Java.FreeTextHeader(n.level, it).setId(it.id)),
    reduceFreeTextTypeLink: (n, reducer) => reduce(n.type, reducer, it => new Java.FreeTextTypeLink(it)),
    reduceFreeTextMethodLink: (n, reducer) => {
      const type = n.type.reduce(reducer) ?? new Java.WildcardType({kind: OmniTypeKind.UNKNOWN});
      const method = n.method.reduce(reducer) ?? new Java.HardCoded(`???`);
      return new Java.FreeTextMethodLink(type, method).setId(n.id);
    },
    reduceFreeTextPropertyLink: (n, reducer) => {
      const type = n.type.reduce(reducer);
      return type ? new Java.FreeTextPropertyLink(type, n.property).setId(n.id) : type;
    },
    reduceFreeTextList: (n, reducer) => {
      const children = n.children.map(it => it.reduce(reducer)).filter(isDefined);
      if (children.length == 0) {
        return undefined;
      }

      return new Java.FreeTextList(children, n.ordered).setId(n.id);
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
    reduceWildcardType: (n, r) => n,
    reduceBoundedType: (n, r) => new Java.BoundedType(
      n.omniType,
      assertDefined(n.type.reduce(r)),
      n.upperBound?.reduce(r),
      n.lowerBound?.reduce(r),
    ).setId(n.id),
    reduceArrayType: (n, reducer) => new Java.ArrayType(n.omniType, assertDefined(n.of.reduce(reducer)), n.implementation).setId(n.id),
    reduceGenericType: (n, r) => {
      const baseType = n.baseType.reduce(r);
      const genericArguments = n.genericArguments.map(it => it.reduce(r)).filter(isDefined);
      if (baseType && baseType instanceof Java.EdgeType && genericArguments.length > 0) {
        return new Java.GenericType(baseType.omniType, baseType, genericArguments).setId(n.id);
      }

      return baseType;
    },
    reduceParameter: (n, reducer) => {

      return new Java.Parameter(
        assertDefined(n.type.reduce(reducer)),
        assertDefined(n.identifier.reduce(reducer)),
        n.annotations?.reduce(reducer),
      ).setId(n.id);
    },
    reduceParameterList: (n, reducer) => new Java.ParameterList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceIdentifier: n => n,
    reduceToken: n => n,
    reduceAnnotationList: (n, reducer) => new Java.AnnotationList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceBinaryExpression: (n, reducer) => new Java.BinaryExpression(
      assertDefined(n.left.reduce(reducer)),
      assertDefined(n.token.reduce(reducer)),
      assertDefined(n.right.reduce(reducer)),
    ).setId(n.id),
    reduceModifier: n => n,
    reduceField: (n, reducer) => {
      const field = new Java.Field(
        assertDefined(n.type.reduce(reducer)),
        assertDefined(n.identifier.reduce(reducer)),
        n.modifiers?.reduce(reducer),
        n.initializer?.reduce(reducer),
        n.annotations?.reduce(reducer),
      ).setId(n.id);

      field.comments = n.comments?.reduce(reducer);
      if (n.property) {
        field.property = n.property;
      }

      return field;
    },
    reduceCommentBlock: (n, r) => reduce(n.text, r, it => new Java.CommentBlock(it).setId(it.id)),
    reduceComment: (n, r) => reduce(n.text, r, it => new Java.Comment(it).setId(it.id)),

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
      ).setId(n.id);
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
      ).setId(n.id);
    },
    reduceMethodDeclaration: (n, r) => {
      return new Java.MethodDeclaration(
        assertDefined(n.signature.reduce(r)),
        n.body?.reduce(r),
      ).setId(n.id);
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
      ).setId(n.id);
    },
    reduceAbstractMethodDeclaration: (n, reducer) => new Java.AbstractMethodDeclaration(assertDefined(n.signature.reduce(reducer))).setId(n.id),
    reduceExtendsDeclaration: (n, reducer) => new Java.ExtendsDeclaration(assertDefined(n.types.reduce(reducer))).setId(n.id),
    reduceImplementsDeclaration: (n, reducer) => new Java.ImplementsDeclaration(assertDefined(n.types.reduce(reducer))).setId(n.id),
    reduceTypeList: (n, reducer) => new Java.TypeList(n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceLiteral: n => n,
    reduceIfStatement: (n, reducer) => new Java.IfStatement(
      assertDefined(n.predicate.reduce(reducer)),
      assertDefined(n.body.reduce(reducer)),
    ).setId(n.id),
    reduceIfElseStatement: (n, reducer) => new Java.IfElseStatement(
      n.ifStatements.map(it => it.reduce(reducer)).filter(isDefined),
      n.elseBlock?.reduce(reducer),
    ).setId(n.id),
    reduceTernaryExpression: (n, reducer) => new Java.TernaryExpression(
      assertDefined(n.predicate.reduce(reducer)),
      assertDefined(n.passing.reduce(reducer)),
      assertDefined(n.failing.reduce(reducer)),
    ).setId(n.id),
    reduceImportStatement: (n, reducer) => new Java.ImportStatement(assertDefined(n.type.reduce(reducer))).setId(n.id),
    reduceImportList: (n, reducer) => new Java.ImportList(n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceMethodCall: (n, reducer) => new Java.MethodCall(
      assertDefined(n.target.reduce(reducer)),
      assertDefined(n.methodName.reduce(reducer)),
      assertDefined(n.methodArguments?.reduce(reducer)),
    ).setId(n.id),
    reduceNewStatement: (n, reducer) => new Java.NewStatement(
      assertDefined(n.type.reduce(reducer)),
      n.constructorArguments?.reduce(reducer),
    ).setId(n.id),
    reduceThrowStatement: (n, reducer) => new Java.ThrowStatement(
      assertDefined(n.expression.reduce(reducer)),
    ).setId(n.id),
    reduceArgumentList: (n, reducer) => new Java.ArgumentList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).withIdFrom(n),
    reduceReturnStatement: (n, reducer) => {
      const expr = n.expression.reduce(reducer);
      return expr ? new Java.ReturnStatement(expr).setId(n.id) : undefined;
    },
    reduceVariableDeclaration: (n, reducer) => new Java.VariableDeclaration(
      assertDefined(n.identifier.reduce(reducer)),
      n.initializer?.reduce(reducer),
      n.type?.reduce(reducer),
      n.constant,
    ).setId(n.id),
    reduceDeclarationReference: n => n,
    // reduceDeclarationReference: (n, reducer) => {
    //   const dec = n.declaration.reduce(reducer);
    //   if (dec === undefined) {
    //
    //     // If the declaration we are referring to was removed, then we need to remove this reference as well.
    //     return undefined;
    //   }
    //
    //   return new Java.DeclarationReference(dec).setId(n.id);
    // },
    reduceAnnotation: (n, reducer) => {

      const type = assertDefined(n.type.reduce(reducer));
      if (type.omniType.kind != OmniTypeKind.HARDCODED_REFERENCE) {
        throw new Error(`Only allowed to have a hardcoded reference as annotation type`);
      }

      return new Java.Annotation(
        type as Java.EdgeType<typeof type.omniType>,
        n.pairs?.reduce(reducer),
      ).setId(n.id);
    },

    reduceAnnotationKeyValuePairList: (n, reducer) =>
      new Java.AnnotationKeyValuePairList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceAnnotationKeyValuePair: (n, reducer) => new Java.AnnotationKeyValuePair(
      n.key?.reduce(reducer),
      assertDefined(n.value.reduce(reducer)),
    ).setId(n.id),
    reduceHardCoded: n => n,
    reduceBlock: (n, reducer) => {
      const reduced = new Java.Block(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id);
      reduced.enclosed = n.enclosed;
      reduced.compact = n.compact;

      return reduced;
    },
    reducePackage: n => n,
    reducePredicate: (n, reducer) => reducer.reduceBinaryExpression(n, reducer),
    reduceModifierList: (n, reducer) => new Java.ModifierList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceCast: (n, reducer) => new Java.Cast(
      assertDefined(n.toType.reduce(reducer)),
      assertDefined(n.expression.reduce(reducer)),
    ).setId(n.id),
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
      ).setId(n.id);

      dec.comments = n.comments?.reduce(r);
      dec.annotations = n.annotations?.reduce(r);
      dec.extends = n.extends?.reduce(r);
      dec.implements = n.implements?.reduce(r);
      dec.genericParameterList = n.genericParameterList?.reduce(r);

      return dec;
    },
    reduceGenericTypeDeclarationList: (n, r) =>
      new Java.GenericTypeDeclarationList(n.types.map(it => it.reduce(r)).filter(isDefined)).setId(n.id),
    reduceGenericTypeDeclaration: (n, r) => new Java.GenericTypeDeclaration(
      assertDefined(n.name.reduce(r)),
      n.sourceIdentifier,
      n.upperBounds?.reduce(r),
      n.lowerBounds?.reduce(r),
    ).setId(n.id),
    reduceInterfaceDeclaration: (n, reducer) => {
      const dec = new Java.InterfaceDeclaration(
        assertDefined(n.type.reduce(reducer)),
        assertDefined(n.name.reduce(reducer)),
        assertDefined(n.body.reduce(reducer)),
        n.modifiers?.reduce(reducer),
      ).setId(n.id);

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
      ).setId(n.id);

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
    ).setId(n.id),
    reduceEnumItemList: (n, reducer) => new Java.EnumItemList(...n.children.map(it => it.reduce(reducer)).filter(isDefined)).setId(n.id),
    reduceFieldReference: n => n,
    reduceAssignExpression: (n, reducer) => {

      const left = n.left.reduce(reducer);
      const right = n.right.reduce(reducer);

      if (left === undefined || right === undefined) {

        // If the left or right node was removed, then we either have nothing to assign to, or nothing to assign from. So we remove ourself.
        return undefined;
      }

      return new Java.AssignExpression(left, right).setId(n.id);
    },
    reduceCompilationUnit: (n, reducer) => new Java.CompilationUnit(
      assertDefined(n.packageDeclaration.reduce(reducer)),
      assertDefined(n.imports.reduce(reducer)),
      ...n.children.map(it => it.reduce(reducer)).filter(isDefined),
    ).setId(n.id),
    reduceConstructor: (n, reducer) => {

      const dec = new Java.ConstructorDeclaration(
        n.parameters?.reduce(reducer),
        n.body?.reduce(reducer),
        n.modifiers.reduce(reducer),
      ).setId(n.id);

      dec.comments = n.comments?.reduce(reducer);
      dec.annotations = n.annotations?.reduce(reducer);

      return dec;
    },

    reduceConstructorParameterList: (n, r) =>
      new Java.ConstructorParameterList(...n.children.map(it => it.reduce(r)).filter(isDefined)).setId(n.id),
    reduceConstructorParameter: (n, r) => {

      const fieldRef = n.fieldRef.reduce(r);
      if (!fieldRef || !(fieldRef instanceof Java.FieldReference)) {
        // If no longer a field, then there is no need for it as a constructor parameter.
        return undefined;
      }

      return new Java.ConstructorParameter(
        fieldRef,
        assertDefined(n.type.reduce(r)),
        assertDefined(n.identifier.reduce(r)),
        n.annotations?.reduce(r),
      ).withIdFrom(n);
    },

    reduceStatement: (n, r) => {
      const child = n.child.reduce(r);
      return child ? new Java.Statement(child).setId(n.id) : undefined;
    },
    reduceSuperConstructorCall: (n, r) => new Java.SuperConstructorCall(assertDefined(n.arguments.reduce(r))).withIdFrom(n),

    reduceClassName: (n, r) => new Java.ClassName(assertDefined(n.type.reduce(r))).setId(n.id),
    reduceClassReference: (n, r) => new Java.ClassReference(assertDefined(n.className.reduce(r))).setId(n.id),
    reduceArrayInitializer: (n, r) => new Java.ArrayInitializer(...n.children.map(it => it.reduce(r)).filter(isDefined)).setId(n.id),
    reduceStaticMemberReference: (n, r) => new Java.StaticMemberReference(
      assertDefined(n.target.reduce(r)),
      assertDefined(n.member.reduce(r)),
    ).setId(n.id),
    reduceSelfReference: n => n,
    reduceNodes: (n, r) => {
      const children = n.children.map(it => it.reduce(r)).filter(isDefined);
      return (children.length > 0) ? new Java.Nodes(...children).setId(n.id) : undefined;
    },
    reduceDecoratingTypeNode: (n, r) => {
      const of = n.of.reduce(r);
      return of ? new Java.DecoratingTypeNode(of, n.omniType).setId(n.id) : undefined;
    },
  };
};

export const DefaultJavaReducer = createJavaReducer();
