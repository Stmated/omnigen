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
  ZodObject,
  ZodOptional,
  ZodPipeline,
  ZodRawShape,
  ZodRecord,
  ZodString,
  ZodType,
  ZodTypeAny,
  ZodUndefined,
  ZodUnion,
  ZodUnionOptions,
  ZodUnknown,
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

  public static isCompatibleWith(expected: ZodTypeAny | ZodCustomNotSet, actual: ZodTypeAny | ZodCustomNotSet, path: string[] = [], silent = false): CompatResult {

    if (expected instanceof ZodNullable && actual instanceof ZodNull) {
      return {v: Compat.SAME};
    } else if (actual instanceof ZodNullable && expected instanceof ZodNull) {
      return {v: Compat.SAME};
    }

    expected = ZodUtils.getBaseType(expected, false);
    actual = ZodUtils.getBaseType(actual, false);

    if (expected instanceof ZodObject && actual instanceof ZodObject) {
      return ZodUtils.isObjectCompatibleWith(expected, actual, path);
    } else if (ZodUtils.isUnknownOrAny(expected)) {
      if (actual instanceof ZodCustomNotSet || actual instanceof ZodUndefined) {
        return this.createError(Compat.DIFF, `Expected 'any', then Not-Set and Undefined are not allowed`, path);
      }

      return {v: Compat.SAME};
    } else if (expected instanceof ZodOptional) {

      if (actual instanceof ZodOptional) {
        return ZodUtils.isCompatibleWith(expected.unwrap(), actual.unwrap(), path, silent);
      } else if (actual instanceof ZodCustomNotSet) {
        return this.createError(Compat.NEEDS_EVALUATION, `Actual is not set, expected is optional, will need eval`, path); // {v: Compat.NEEDS_EVALUATION};
      } else if (actual instanceof ZodUndefined) {
        return {v: Compat.SAME};
      } else {
        return ZodUtils.isCompatibleWith(expected.unwrap(), actual, path, silent);
        // return this.createError(Compat.DIFF, `Expected optional ${ZodUtils.getBaseType(expected.unwrap())._def.typeName} not compatible with ${actual._def.typeName}`, path);
      }

    } else if (expected instanceof ZodRecord && actual instanceof ZodRecord) {
      return ZodUtils.isRecordCompatibleWith(expected, actual);
    } else if (expected instanceof ZodRecord && actual instanceof ZodObject) {
      return ZodUtils.isRecordCompatibleWithObject(expected, path);
    } else if (expected instanceof ZodLiteral && actual instanceof ZodLiteral) {
      return (expected.value == actual.value) ? {v: Compat.SAME} : this.createError(Compat.DIFF, `${expected.value} != ${actual.value}`, path);
    } else if (expected instanceof ZodLiteral) {
      return {v: Compat.NEEDS_EVALUATION};
    } else if (expected instanceof ZodString && actual instanceof ZodString) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodNumber && actual instanceof ZodNumber) {
      return {v: Compat.SAME};
    } else if ((expected === undefined || expected instanceof ZodUndefined) && (actual instanceof ZodUndefined || actual instanceof ZodCustomNotSet)) {
      return {v: Compat.SAME};
    } else if (expected instanceof ZodBoolean && actual instanceof ZodBoolean) {
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
    } else if (expected instanceof ZodEnum) {

      if (actual instanceof ZodString) {
        return {v: Compat.NEEDS_EVALUATION};
      } else if (actual instanceof ZodLiteral) {
        const actualAsEnum = z.enum([String(actual.value)]);
        return ZodUtils.isEnumCompatible(expected, actualAsEnum, path, false);
      }

      if (!silent) {
        logger.warn(`Possible enum comparison improvement needed for ${expected._def.typeName} vs ${actual._def.typeName}`);
      }
    } else if (expected instanceof ZodFunction && actual instanceof ZodFunction) {
      // We do not care to compare functions. They should be the same. So far :)
      return {v: Compat.SAME};
    } else if (actual instanceof ZodLiteral) {
      return ZodUtils.isZodCompatibleWithJavaValue(expected, actual.value, actual._def.typeName, path);
    } else {
      logger.silent(`Unknown zod type combo ${expected?._def?.typeName} - ${actual?._def?.typeName}`);
    }

    return {v: Compat.DIFF};
  }

  private static isZodCompatibleWithJavaValue(zodType: ZodTypeAny | ZodCustomNotSet, literalValue: unknown, literalTypeName: string, path: string[]): CompatResult {

    switch (typeof literalValue) {
      case 'string':
        return zodType instanceof ZodString ? {v: Compat.SAME} : {v: Compat.DIFF};
      case 'number':
        return zodType instanceof ZodNumber ? {v: Compat.SAME} : {v: Compat.DIFF};
      case 'boolean':
        return zodType instanceof ZodBoolean ? {v: Compat.SAME} : {v: Compat.DIFF};
      case 'undefined':
        return zodType instanceof ZodUndefined ? {v: Compat.SAME} : {v: Compat.DIFF};
      default: {
        return this.createError(Compat.DIFF, `Unknown zod literal combo ${zodType._def.typeName} - ${literalTypeName}`, path);
      }
    }
  }

  private static isRecordCompatibleWithObject(expected: ZodRecord, path: string[]): CompatResult {

    const key = ZodUtils.getBaseType(expected.keySchema);
    const value = ZodUtils.getBaseType(expected.valueSchema);

    if (key instanceof ZodString && ZodUtils.isUnknownOrAny(value)) {
      return {v: Compat.SAME};
    }

    const message = `Actual object is not comaptible with Record<${key._def.typeName}, ${value._def.typeName}>`;

    logger.warn(message);
    return this.createError(Compat.DIFF, message, path);
  }

  private static isUnknownOrAny(type: ZodTypeAny | ZodCustomNotSet): type is ZodAny | ZodUnknown {
    return type instanceof ZodAny || type instanceof ZodUnknown;
  }

  private static createError(diff: Compat, message: string, path: string[]): CompatResult {
    return {
      v: diff,
      error: new z.ZodError([
        {code: 'custom', path: path, message: message},
      ]),
    };
  }

  private static getBaseType(type: ZodTypeAny | ZodCustomNotSet, resolveOptional = false): ZodTypeAny | ZodCustomNotSet {

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
    }

    throw new Error(`Do not know how to flatten ${left._def.typeName} with ${right._def.typeName} at ${path}`);
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

      const actualProp = actualShape[key] ?? new ZodCustomNotSet(); // z.undefined();

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
    strict = true,
  ): CompatResult {

    const expectedEntries = Object.entries(expected.enum);
    const actualEntries = Object.entries(actual.enum);

    if (expectedEntries.length < actualEntries.length) {
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

      if (!strict) {
        if (!(expectedKey in actual.enum)) {
          continue;
        } else {
          const i = 0;
        }
      }

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

  private static isUnionCompatibleWith(union: ZodUnion<ZodUnionOptions>, other: ZodTypeAny | ZodCustomNotSet, path: string[]): CompatResult {

    let worstCompat: CompatResult = {
      v: Compat.SAME,
    };

    for (const option of union.options) {

      const result = ZodUtils.isCompatibleWith(option, other, path, true);
      if (result.v == Compat.SAME) {
        return result;
      }

      if (result.v > worstCompat.v) {
        worstCompat = result;
      }
    }

    return worstCompat;
  }

  public static createZodSchemaFromObject<V>(
    value: V,
    literal = false,
    mapper?: MapperFn<V>,
    maxDepth = 4,
    valuePath: unknown[] = [],
    keyPath: string[] = [],
  ): ZodType {

    if (valuePath.length >= maxDepth) {
      return z.any();
    }

    if (mapper) {

      const mapped = mapper({v: value, keyPath: keyPath});
      if (mapped) {
        return mapped;
      }
    }

    if (valuePath.includes(value)) {
      throw new RecursiveObjectError();
    }

    if (Array.isArray(value)) {

      // For simplicity, this assumes all the array elements are of the same type
      if (value.length == 0) {
        return z.array(z.unknown());
      } else {
        try {
          valuePath.push(value);
          keyPath.push('0');
          return z.array(ZodUtils.createZodSchemaFromObject(value[0], literal, mapper, maxDepth, valuePath, keyPath));
        } finally {
          keyPath.pop();
          valuePath.pop();
        }
      }
    } else if (value && typeof value == 'object') {

      const className = value?.constructor?.name;
      if (className && className.toLowerCase() != 'object') {
        return z.record(z.string(), z.unknown());
      }

      const schema: Record<string, ZodType> = {};
      for (const [propKey, propValue] of Object.entries(value)) {

        if (propKey.startsWith('_')) {
          continue;
        }

        try {
          valuePath.push(value);
          keyPath.push(propKey);
          schema[propKey] = ZodUtils.createZodSchemaFromObject(propValue, literal, mapper, maxDepth, valuePath, keyPath);
        } catch (ex) {

          if (ex instanceof RecursiveObjectError) {

            // Since this object contains recursive properties, it is likely too advanced to be useful to represent as a Zod type.
            return z.record(z.string(), z.unknown());
          }

          throw new Error(`Could not convert ${propKey} with value ${value} to a Zod type`, {cause: ex});
        } finally {
          keyPath.pop();
          valuePath.pop();
        }
      }

      return z.object(schema);
    } else if (typeof value === 'string') {
      return literal ? z.literal(value) : z.string();
    } else if (typeof value === 'number') {
      return literal ? z.literal(value) : z.number();
    } else if (typeof value === 'boolean') {
      return literal ? z.literal(value) : z.boolean();
    } else if (typeof value === 'bigint') {
      return literal ? z.literal(value) : z.bigint();
    } else if (typeof value === 'function') {
      return z.function();
    } else if (typeof value === 'undefined') {
      return z.undefined();
    } else if (typeof value === 'symbol') {
      return z.symbol();
    } else {
      throw new Error(`Unknown type ${typeof value}`);
    }
  }
}

export interface MapperArgs<V> {
  v: V,
  keyPath: string[]
}

interface NotSetDef {
  typeName: string;
}

class ZodCustomNotSet {

  // eslint-disable-next-line @typescript-eslint/naming-convention
  _def: NotSetDef = {
    typeName: 'NotSet',
  };
}

// export interface ZodNotSetDef extends ZodTypeDef {
//   typeName: ZodFirstPartyTypeKind.ZodUndefined;
// }
// export class ZodNotSet extends ZodType<undefined, ZodNotSetDef> {
//   // eslint-disable-next-line @typescript-eslint/naming-convention
//   _parse(input: ParseInput): ParseReturnType<this['_output']> {
//     return {
//       status: 'valid',
//       value: undefined,
//     };
//   }
//
//   params?: RawCreateParams;
//   // static create: (params?: RawCreateParams) => ZodNotSet;
// }

export type MapperFn<V> = (args: MapperArgs<V>) => ZodType | undefined;

class RecursiveObjectError extends Error {

}
