import {
  OmniCompositionType,
  OmniExclusiveUnionType,
  OmniIntersectionType,
  OmniKindComposition,
  OmniModel,
  OmniNegationType,
  OmniObjectType,
  OmniPrimitiveType,
  OmniSubTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  OmniUnionType,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, OmniUtil} from '@omnigen/core';
import {CodeUtil} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

export type JavaPotentialClassType = OmniObjectType;

export type JavaSubTypeCapableType =
  OmniSubTypeCapableType
  | OmniCompositionType<OmniSubTypeCapableType>;

export type JavaSuperTypeCapableType =
  Exclude<OmniSuperTypeCapableType, { kind: OmniKindComposition }>
  | OmniIntersectionType<JavaSuperTypeCapableType>
  | OmniUnionType<JavaSuperTypeCapableType>
  | OmniExclusiveUnionType<JavaSuperTypeCapableType>
  | OmniNegationType<JavaSuperTypeCapableType>;

export const JAVA_RESERVED_WORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally',
  'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long',
  'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short',
  'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while', 'const', 'goto', 'true', 'false', 'null',
];

export class JavaUtil {

  public static isPrimitiveBoxed(type: OmniPrimitiveType): boolean {

    if (type.kind == OmniTypeKind.NULL || type.kind == OmniTypeKind.VOID) {
      return false;
    }

    if (type.kind == OmniTypeKind.STRING) {

      // If it's a string it's not boxed, it it always the same.
      return false;
    }

    return type.nullable === true;
  }

  /**
   * TODO: Move to elsewhere, these should be based on the renderer and its settings?
   */
  public static getGetterName(baseName: string, type: OmniType): string {
    const capitalized = baseName.match(/^[A-Z]/) ? baseName : Case.pascal(baseName);
    if (OmniUtil.isPrimitive(type) && type.kind === OmniTypeKind.BOOL && !type.nullable) {
      return `is${capitalized}`;
    }

    return `get${capitalized}`;
  }

  public static getSetterName(baseName: string): string {
    const capitalized = baseName.match(/^[A-Z]/) ? baseName : Case.pascal(baseName);
    return `set${capitalized}`;
  }

  public static getGenericCompatibleType(type: OmniType): OmniType {
    return OmniUtil.toReferenceType(type);
  }

  public static asSubType(type: OmniType): type is JavaSubTypeCapableType {
    return OmniUtil.asSubType(type);
  }

  public static asSuperType(type: OmniType | undefined, silent = true): type is JavaSuperTypeCapableType {
    return OmniUtil.asSuperType(type, silent);
  }

  public static getAsClass(model: OmniModel, type: OmniType): JavaPotentialClassType | undefined {

    const unwrapped = OmniUtil.getUnwrappedType(type);
    if (unwrapped.kind != OmniTypeKind.OBJECT) {

      return undefined;
    }

    if (model.types.includes(type)) {

      // The type is an external type and should always be output like a class (but might also become an interface).
      return unwrapped;
    }

    // This is a type that we need to investigate if it is ever used as a class somewhere else.
    // We do this by checking if any type uses 'type' as a first extension.
    return OmniUtil.visitTypesDepthFirst(model, ctx => {

      const uw = OmniUtil.getUnwrappedType(ctx.type);
      if (uw.kind == OmniTypeKind.ENUM || uw.kind == OmniTypeKind.INTERFACE) {
        return;
      }

      if ('extendedBy' in uw && uw.extendedBy) {
        if (uw.extendedBy == unwrapped) {
          return unwrapped;
        }

        if (uw.extendedBy.kind == OmniTypeKind.INTERSECTION && uw.extendedBy.types.length > 0 && uw.extendedBy.types[0] === unwrapped) {
          return unwrapped;
        }
      }

      return;
    });
  }

  public static getClasses(model: OmniModel): JavaPotentialClassType[] {

    const checked: OmniType[] = [];
    const classes: JavaPotentialClassType[] = [];

    OmniUtil.visitTypesDepthFirst(model, ctx => {
      if (checked.includes(ctx.type)) {
        return;
      }
      checked.push(ctx.type);

      const asClass = JavaUtil.getAsClass(model, ctx.type);
      if (asClass && !classes.includes(asClass)) {
        classes.push(asClass);
      }
    });

    return classes;
  }

  public static getSubTypeToSuperTypesMap(model: OmniModel): Map<OmniSubTypeCapableType, OmniSuperTypeCapableType[]> {
    return OmniUtil.getSubTypeToSuperTypesMap(model);
  }

  public static getSuperTypeToSubTypesMap(model: OmniModel): Map<OmniSuperTypeCapableType, OmniSubTypeCapableType[]> {
    return OmniUtil.getSuperTypeToSubTypesMap(model);
  }

  public static getSuperClassHierarchy(model: OmniModel, type: JavaSubTypeCapableType | undefined): OmniSuperTypeCapableType[] {

    const path: OmniSuperTypeCapableType[] = [];
    if (!type) {
      return path;
    }

    let pointer: JavaSubTypeCapableType | undefined = type;
    while (pointer) {

      const superClass = CodeUtil.getSuperClassOfSubType(model, pointer);
      if (superClass) {
        path.push(superClass);
        pointer = JavaUtil.asSubType(superClass) ? superClass : undefined;
      } else {
        break;
      }
    }

    return path;
  }
}
