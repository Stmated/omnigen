import {OmniNode, OmniPrimitiveKinds, OmniPrimitiveNull, OmniPrimitiveType, OmniSuperTypeCapableType, OmniType, OmniTypeKind, OmniTypeOf, StrictReadonly, TargetFeatures} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniDescribeUtils} from './OmniDescribeUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

export class OmniTypeUtil {

  public static isPrimitive<T extends StrictReadonly<OmniType>>(type: T | undefined): type is OmniTypeOf<T, OmniPrimitiveKinds> {

    if (!type) {
      return false;
    }

    switch (type.kind) {
      case OmniTypeKind.NUMBER:
      case OmniTypeKind.INTEGER:
      case OmniTypeKind.INTEGER_SMALL:
      case OmniTypeKind.DECIMAL:
      case OmniTypeKind.DOUBLE:
      case OmniTypeKind.FLOAT:
      case OmniTypeKind.LONG:
      case OmniTypeKind.STRING:
      case OmniTypeKind.CHAR:
      case OmniTypeKind.BOOL:
      case OmniTypeKind.VOID:
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return true;
      default:
        return false;
    }
  }

  public static isComposition(type: StrictReadonly<OmniNode> | undefined) {

    const kind = type?.kind;
    return kind === OmniTypeKind.UNION
      || kind === OmniTypeKind.EXCLUSIVE_UNION
      || kind === OmniTypeKind.INTERSECTION
      || kind === OmniTypeKind.NEGATION;
  }

  public static asSuperType(type: OmniType | undefined, silent = true, special?: (t: OmniType) => boolean | undefined): type is OmniSuperTypeCapableType {

    if (!type) {
      return false;
    }

    if (special) {
      const isSpecial = special(type);
      if (isSpecial !== undefined) {
        return isSpecial;
      }
    }

    if (type.kind == OmniTypeKind.OBJECT
      || type.kind == OmniTypeKind.GENERIC_TARGET
      || type.kind == OmniTypeKind.ENUM
      || type.kind == OmniTypeKind.INTERFACE
      || type.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return true;
    }

    if (OmniTypeUtil.isPrimitive(type) && !type.nullable && type.kind !== OmniTypeKind.VOID && type.kind !== OmniTypeKind.NULL) {
      return true;
    }

    if (type.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return OmniTypeUtil.asSuperType(type.of, silent, special);
    }

    if (type.kind === OmniTypeKind.DECORATING) {
      return OmniTypeUtil.asSuperType(type.of, silent, special);
    }

    if (OmniTypeUtil.isComposition(type)) {

      // This seems like an unnecessary operation to do, but cannot figure out a better way yet.
      for (const child of type.types) {
        const childSuperType = OmniTypeUtil.asSuperType(child, silent, special);
        if (!childSuperType) {

          // This might seem confusing, when you call "asSuperType" on a composition but get back undefined.
          // This method is supposed to be safe to call with anything though, but we log this occasion.
          const message = `There is a non-supertype type (${OmniDescribeUtils.describe(child)}) inside composition '${OmniDescribeUtils.describe(type)}'`;
          if (silent) {
            logger.debug(message);
            return false;
          } else {
            throw new Error(message);
          }
        }
      }

      return true;
    }

    return false;
  }

  public static isNullableType(type: OmniType | StrictReadonly<OmniType>, features?: TargetFeatures): type is ((OmniPrimitiveType & { nullable: true }) | OmniPrimitiveNull) {

    if (type.kind === OmniTypeKind.NULL || type.kind === OmniTypeKind.VOID) {
      return true;
    }

    if (OmniTypeUtil.isPrimitive(type)) {

      if (type.literal) {
        if (type.value === null) {
          return true;
        }
      }

      // In some languages a string is always nullable, but that is up to the target language to handle somehow.
      return type.nullable ?? false;
    }

    return type.nullable ?? true;
  }
}
