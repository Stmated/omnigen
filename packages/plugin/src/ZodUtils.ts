import {
  z,
  ZodAny,
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodError,
  ZodFunction,
  ZodIntersection,
  ZodLiteral,
  ZodNull,
  ZodNullable,
  ZodNumber,
  ZodObject, ZodOptional,
  ZodPipeline,
  ZodRawShape,
  ZodRecord,
  ZodString, ZodType,
  ZodTypeAny,
  ZodUndefined,
  ZodUnion,
  ZodUnionOptions,
} from 'zod';
import {LoggerFactory} from '@omnigen/core-log';

export enum Compat {
  SAME = 0,
  NEEDS_EVALUATION = 1,
  DIFF = 2,
}

export interface CompatResult {
  v: Compat;
  error?: ZodError;
}

const logger = LoggerFactory.create(import.meta.url);

/**
 * TODO: Maybe in the future remove Zod and instead use our own OmniType to represent all types
 *        Eat our own dogfood, and might benefit us with less cognitive load of multiple type systems
 */
export class ZodUtils {

  public static isCompatibleWith(expected: ZodTypeAny, actual: ZodTypeAny, path: string[] = []): CompatResult {

    if (expected instanceof ZodNullable && actual instanceof ZodNull) {
      return {v: Compat.SAME};
    } else if (actual instanceof ZodNullable && expected instanceof ZodNull) {
      return {v: Compat.SAME};
    }

    expected = ZodUtils.getBaseType(expected, true);
    actual = ZodUtils.getBaseType(actual, true);

    if (expected instanceof ZodObject && actual instanceof ZodObject) {
      return ZodUtils.isObjectCompatibleWith(expected, actual, path);
    } else if (expected instanceof ZodAny && actual instanceof ZodObject) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodRecord && actual instanceof ZodRecord) {
      return ZodUtils.isRecordCompatibleWith(expected, actual);
    } else if (expected instanceof ZodRecord && actual instanceof ZodObject) {

      const key = ZodUtils.getBaseType(expected.keySchema);
      const value = ZodUtils.getBaseType(expected.valueSchema);

      if (key instanceof ZodString && value instanceof ZodAny) {
        return {v: Compat.SAME};
      }

      const message = `Actual object is not comaptible with Record<${key._def.typeName}, ${value._def.typeName}>`;

      logger.warn(message);
      return this.createError(Compat.DIFF, message, path);
    } else if (expected instanceof ZodLiteral && actual instanceof ZodLiteral) {
      const v = (expected.value == actual.value) ? Compat.SAME : Compat.DIFF;
      return {v};
    } else if (expected instanceof ZodLiteral) {
      return {v: Compat.NEEDS_EVALUATION};
    } else if (actual instanceof ZodLiteral) {
      switch (typeof actual.value) {
        case 'string':
          return expected instanceof ZodString ? {v: Compat.SAME} : {v: Compat.DIFF};
        case 'number':
          return expected instanceof ZodNumber ? {v: Compat.SAME} : {v: Compat.DIFF};
        case 'boolean':
          return expected instanceof ZodBoolean ? {v: Compat.SAME} : {v: Compat.DIFF};
        case 'undefined':
          return expected instanceof ZodUndefined ? {v: Compat.SAME} : {v: Compat.DIFF};
        default: {
          logger.warn(`Unknown zod literal combo ${expected} - ${actual}`);
        }
      }
    } else if (expected instanceof ZodString && actual instanceof ZodString) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodNumber && actual instanceof ZodNumber) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodUndefined && actual instanceof ZodUndefined) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodBoolean && actual instanceof ZodBoolean) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodAny && actual instanceof ZodAny) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodIntersection) {
      return ZodUtils.isCompatibleWith(ZodUtils.flattenIntersection(expected, path), expected, path);
    } else if (actual instanceof ZodIntersection) {
      return ZodUtils.isCompatibleWith(expected, ZodUtils.flattenIntersection(actual, path), path);
    } else if (expected instanceof ZodUnion) {
      return ZodUtils.isUnionCompatibleWith(expected, actual, path);
    } else if (actual instanceof ZodUnion) {
      return ZodUtils.isUnionCompatibleWith(actual, expected, path);
    } else if (expected instanceof ZodArray && actual instanceof ZodArray) {
      return ZodUtils.isCompatibleWith(ZodUtils.getBaseType(expected.element), ZodUtils.getBaseType(actual.element));
    } else if (expected instanceof ZodEnum && actual instanceof ZodEnum) {
      return ZodUtils.isEnumCompatible(expected, actual, path);
    } else if (expected instanceof ZodFunction && actual instanceof ZodFunction) {
      // We do not care to compare functions. They should be the same. So far :)
      return {v: Compat.SAME};
    } else {
      logger.warn(`Unknown zod type combo ${expected._def.typeName} - ${actual._def.typeName}`);
    }

    return {v: Compat.DIFF};
  }

  private static createError(diff: Compat, message: string, path: string[]): CompatResult {
    return {
      v: diff,
      error: new z.ZodError([
        {code: 'custom', path: path, message: message},
      ]),
    };
  }

  private static getBaseType(type: ZodTypeAny, resolveOptional = false): ZodTypeAny {

    if (type instanceof ZodDefault) {
      return ZodUtils.getBaseType(type.removeDefault(), resolveOptional);
    } else if (type instanceof ZodNullable) {
      return ZodUtils.getBaseType(type.unwrap(), resolveOptional);
    } else if (type instanceof ZodEffects) {
      return ZodUtils.getBaseType(type.sourceType(), resolveOptional);
    } else if (type instanceof ZodPipeline) {
      return ZodUtils.getBaseType(type._def.out, resolveOptional);
    } else if (resolveOptional && type instanceof ZodOptional) {
      return type.unwrap();
    } else {
      return type;
    }
  }

  private static flattenIntersection(intersection: ZodIntersection<ZodTypeAny, ZodTypeAny>, path: string[]): ZodTypeAny {

    const left = ZodUtils.getBaseType(intersection._def.left);
    const right = ZodUtils.getBaseType(intersection._def.right);

    if (left instanceof ZodObject && right instanceof ZodObject) {

      if ('_cached_merge' in intersection) {
        return intersection._cached_merge as ZodTypeAny;
      }

      const merge = left.merge(right);
      (intersection as any)._cached_merge = merge;

      return merge;
    } else {
      throw new Error(`Do not know how to flatten ${left._def.typeName} with ${right._def.typeName} at ${path}`);
    }
  }

  private static isRecordCompatibleWith(expected: ZodRecord, actual: ZodRecord): CompatResult {

    const keyCompat = ZodUtils.isCompatibleWith(expected.keySchema, actual.keySchema);
    if (keyCompat.v == Compat.DIFF) {
      return keyCompat;
    }

    const valueCompat = ZodUtils.isCompatibleWith(expected.valueSchema, actual.valueSchema);
    if (valueCompat.v == Compat.DIFF) {
      return valueCompat;
    }

    const worstCompat = Math.max(keyCompat.v, valueCompat.v);
    const givenError = keyCompat.error ?? valueCompat.error;
    if (givenError) {
      return {
        v: worstCompat,
        error: givenError,
      };
    } else {
      return {
        v: worstCompat,
      };
    }
  }

  private static isObjectCompatibleWith(expected: ZodObject<ZodRawShape>, actual: ZodObject<ZodRawShape>, path: string[]): CompatResult {

    const expectedShape = expected.shape;
    const actualShape = actual.shape;

    let worstCompat: CompatResult = {v: Compat.SAME};

    // eslint-disable-next-line guard-for-in
    for (const key in expectedShape) {

      const newPath = [...(path ?? []), key];
      const expectedProp = ZodUtils.getBaseType(expectedShape[key]);

      if (!(key in actualShape)) {
        if (expectedProp instanceof ZodUndefined || expectedProp instanceof ZodOptional) {
          // If the key is missing, then Undefined or Optional is okay.
          // TODO: This might not be correct; ZodUndefined should probably mean it must not exist
          continue;
        } else {
          return ZodUtils.createError(Compat.DIFF, `Missing path '${newPath.join('.')}'`, newPath);
        }
      }

      const actualProp = actualShape[key]; // ZodUtils.getBaseType();

      const propCompat = ZodUtils.isCompatibleWith(expectedProp, actualProp, newPath);

      if (propCompat.v > worstCompat.v) {
        worstCompat = propCompat;
      }

      if (worstCompat.v >= Compat.DIFF) {
        return {
          ...worstCompat, error: worstCompat.error ?? new z.ZodError([
            {code: 'custom', path: newPath, message: `Mismatch on ${newPath.join(' -> ')}`},
          ]),
        };
      }
    }

    return worstCompat;
  }

  private static isEnumCompatible(
    expected: ZodEnum<[string, ...string[]]>,
    actual: ZodEnum<[string, ...string[]]>,
    path: string[],
  ): CompatResult {

    const expectedEntries = Object.entries(expected.enum);
    const actualEntries = Object.entries(actual.enum);

    if (expectedEntries.length != actualEntries.length) {
      return {
        v: Compat.DIFF,
        error: new z.ZodError([{
          code: 'custom',
          path: path,
          message: `Enum ${JSON.stringify(expected.enum)} and ${JSON.stringify(actual.enum)} did not match`,
        }]),
      };
    }

    // eslint-disable-next-line guard-for-in
    for (const [expectedKey, expectedValue] of expectedEntries) {

      // const expectedValue = expectedEntries[expectedKey];
      const actualValue = actual.enum[expectedKey];

      if (expectedValue !== actualValue) {
        return {
          v: Compat.DIFF,
          error: new z.ZodError([{
            code: 'custom',
            path: path,
            message: `Enum key ${expectedKey} value mismatch ${expectedValue} and ${actualValue} did not match`,
          }]),
        };
      }
    }

    return {v: Compat.SAME};
  }

  private static isUnionCompatibleWith(union: ZodUnion<ZodUnionOptions>, other: ZodTypeAny, path: string[]): CompatResult {

    let worstCompat: CompatResult = {
      v: Compat.SAME,
    };

    for (const option of union.options) {

      const result = ZodUtils.isCompatibleWith(option, other, path);
      if (result.v == Compat.SAME) {
        return result;
      }

      if (result.v > worstCompat.v) {
        worstCompat = result;
      }
    }

    return worstCompat;
  }

  public static createZodSchemaFromObject(obj: Record<string, any>, literal = false) {
    const schema: Record<string, ZodType> = {};

    for (const [key, value] of Object.entries(obj)) {
      try {
        if (typeof value === 'string') {
          schema[key] = literal ? z.literal(value) : z.string();
        } else if (typeof value === 'number') {
          schema[key] = literal ? z.literal(value) : z.number();
        } else if (typeof value === 'boolean') {
          schema[key] = literal ? z.literal(value) : z.boolean();
        } else if (Array.isArray(value)) {

          // For simplicity, this assumes all the array elements are of the same type
          if (value.length == 0) {
            schema[key] = z.array(z.any());
          } else {
            schema[key] = z.array(ZodUtils.createZodSchemaFromObject(value[0]));
          }
        } else if (typeof value === 'object') {
          schema[key] = ZodUtils.createZodSchemaFromObject(value);
        }
      } catch (ex) {
        throw new Error(`Could not convert ${key} with value ${value} to a Zod type`, {cause: ex});
      }
    }

    return z.object(schema);
  }
}
