import {
  OmniCompositionType,
  OmniInterfaceOrObjectType,
  OmniKindComposition,
  OmniModel,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  TargetFunctions,
} from '@omnigen/api';
import {AbortVisitingWithResult, Case, OmniUtil, Visitor, VisitResultFlattener} from '@omnigen/core';
import * as Code from '../ast/CodeAst';
import {CodeRootAstNode} from '../ast/CodeRootAstNode';
import {FreeTextUtils} from './FreeTextUtils';
import {FriendlyFreeTextIn} from '../ast/FreeText.ts';

export class CodeUtil {

  private static readonly _PATTERN_STARTS_WITH_ILLEGAL_IDENTIFIER_CHARS = new RegExp(/^[^a-zA-Z$_]/);

  private static readonly _PATTERN_INVALID_CHARS_STRICT = new RegExp(/[^a-zA-Z0-9$_]/g);
  private static readonly _PATTERN_WITH_PREFIX = new RegExp(/^[_$]+/g);

  private static readonly _PATTERN_INVALID_CHARS_LAX = new RegExp(/[~!@#%^&*()\-+={}[\]|:;"'<>,.?/\s]/g);

  public static getClassDeclaration(root: CodeRootAstNode, type: OmniType): Code.ClassDeclaration | undefined {

    const defaultVisitor = root.createVisitor<Code.ClassDeclaration | undefined>();
    return VisitResultFlattener.visitWithSingularResult(Visitor.create(defaultVisitor, {
      visitClassDeclaration: node => {
        if (node.type.omniType === type) {
          throw new AbortVisitingWithResult(node);
        } else if (type.kind === OmniTypeKind.GENERIC_TARGET) {
          if (node.type.omniType === type.source.of) {
            // Return the class declaration; which will be generic.
            // It is up to the calling code to map the generic arguments to real types.
            throw new AbortVisitingWithResult(node);
          }
        }
      },
    }), root, undefined);
  }

  public static getGenericCompatibleType(type: OmniType): OmniType {
    return OmniUtil.toReferenceType(type);
  }

  public static getSafeIdentifierNameRelaxed(name: string): string {

    if (CodeUtil._PATTERN_STARTS_WITH_ILLEGAL_IDENTIFIER_CHARS.test(name)) {
      name = `_${name}`;
    }

    return name.replaceAll(CodeUtil._PATTERN_INVALID_CHARS_LAX, '_');
  }

  public static getSafeIdentifierName(name: string): string {

    if (CodeUtil._PATTERN_STARTS_WITH_ILLEGAL_IDENTIFIER_CHARS.test(name)) {
      name = `_${name}`;
    }

    return name.replaceAll(CodeUtil._PATTERN_INVALID_CHARS_STRICT, '_');
  }

  /**
   * Takes the given name and makes it safe and then makes it into a proper argument name.
   */
  public static getPrettyParameterName(name: string): string {

    const safeName = CodeUtil.getSafeIdentifierName(name);
    return Case.camel(safeName.replaceAll(CodeUtil._PATTERN_WITH_PREFIX, ''));
  }

  public static getSuperClassHierarchy(model: OmniModel, type: OmniType | undefined, functions: TargetFunctions): OmniSuperTypeCapableType[] {

    const path: OmniSuperTypeCapableType[] = [];
    if (!type) {
      return path;
    }

    let pointer: OmniType | undefined = type;
    while (pointer) {

      const superClass = functions.getSuperClass(model, pointer);
      if (superClass) {
        path.push(superClass);
        pointer = functions.asSubType(superClass) ? superClass : undefined;
      } else {
        break;
      }
    }

    return path;
  }

  public static getFlattenedSuperTypes(type: OmniSuperTypeCapableType): OmniSuperTypeCapableType[] {

    if (OmniUtil.isComposition(type)) {

      const superTypes: OmniSuperTypeCapableType[] = [];
      for (const t of type.types) {
        if (OmniUtil.asSuperType(t)) {
          superTypes.push(...CodeUtil.getFlattenedSuperTypes(t));
        }
      }

      return superTypes;
    } else {
      return [type];
    }
  }

  public static getSuperClassOfIntersection(intersection: OmniCompositionType<OmniSuperTypeCapableType, typeof OmniKindComposition.INTERSECTION>) {

    const flattened = CodeUtil.getFlattenedSuperTypes(intersection);
    if (flattened.length > 0) {
      const possibleObject = OmniUtil.getUnwrappedType(flattened[0]);
      if (possibleObject) {
        return possibleObject;
      }
    }

    return undefined;
  }

  /**
   * See {@link CodeUtil#getSuperInterfacesOfSubType} for information about definition of objects and interfaces.
   */
  public static getSuperClassOfSubType(
    _model: OmniModel,
    subType: OmniType | undefined,
    returnUnwrapped = true,
  ): OmniSuperTypeCapableType | undefined {

    subType = OmniUtil.getUnwrappedType(subType);
    if (!subType || OmniUtil.isComposition(subType)) {
      return undefined;
    }

    if (!('extendedBy' in subType)) {
      return undefined;
    }

    if (!subType.extendedBy || subType.extendedBy.kind === OmniTypeKind.INTERFACE) {
      return undefined;
    }

    const extendedUnwrapped = OmniUtil.getUnwrappedType(subType.extendedBy);

    if (extendedUnwrapped.kind === OmniTypeKind.INTERSECTION) {
      const possible = CodeUtil.getSuperClassOfIntersection(extendedUnwrapped);
      if (possible) {
        return possible;
      }
    }

    if (returnUnwrapped) {
      // This is a single type, and if it's an object, then it's something we inherit from.
      return OmniUtil.asSuperType(extendedUnwrapped) ? extendedUnwrapped : undefined;
    } else {
      return OmniUtil.asSuperType(subType.extendedBy) ? subType.extendedBy : undefined;
    }
  }

  public static getExtendsAndImplements(model: OmniModel, type: OmniType, functions: TargetFunctions): [OmniSuperTypeCapableType | undefined, OmniInterfaceOrObjectType[]] {

    const typeExtends = functions.getSuperClass(model, type, false);

    if (!OmniUtil.isComposition(type)) {
      return [typeExtends, functions.getSuperInterfaces(model, type)];
    } else {
      return [typeExtends, []];
    }
  }

  /**
   * On the Omni side of things we have two types: Object & Interface.
   *
   * Interface is when the source schema has specified the type as being an interface and not an implementation.
   *
   * Object is when the source schema has specified the shape of an object.
   *
   * But depending on the target language, that Object might be handled/rendered as an interface.
   * This is most apparent when dealing with JSONSchema to Java (or any language with single-inheritance).
   *
   * The schema might say "This object extends types A, B, C" but the language only allows inheriting from "A".
   * It then needs to handle B and C as interfaces and then try to live up to that contract on the subtype of A.
   */
  public static getSuperInterfacesOfSubType(_model: OmniModel, subType: OmniType): OmniInterfaceOrObjectType[] {

    const interfaces: OmniInterfaceOrObjectType[] = [];
    if (subType.kind == OmniTypeKind.EXCLUSIVE_UNION) {
      // The XOR composition class does in Java not actually implement anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return interfaces;
    }

    // First we can find the specifically stated interfaces.
    if (subType.kind == OmniTypeKind.OBJECT || subType.kind == OmniTypeKind.INTERFACE) {
      if (subType.extendedBy) {
        const flattened = OmniUtil.getFlattenedSuperTypes(subType.extendedBy);
        for (let i = 0; i < flattened.length; i++) {

          const superType = flattened[i];
          if (superType.kind == OmniTypeKind.INTERFACE) {
            interfaces.push(superType);
          } else if (superType.kind == OmniTypeKind.OBJECT && i > 0) {

            // If the supertype is an object, but it's not the first supertype, then it is an interface in Java.
            // It is up to transformers to order the supertypes in the best order for what should be class/interface.
            interfaces.push(superType);
          }
        }
      }
    }

    return interfaces;
  }

  public static addComment(existing: Code.Comment | undefined, text: FriendlyFreeTextIn): Code.Comment {
    return new Code.Comment(FreeTextUtils.add(existing?.text, text), existing?.kind);
  }
}
