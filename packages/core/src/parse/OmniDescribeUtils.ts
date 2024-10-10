import {OmniTypeUtil} from './OmniTypeUtil.ts';
import {DEFAULT_UNKNOWN_KIND, NamespaceArrayItem, OmniPrimitiveConstantValue, OmniPrimitiveKinds, OmniPropertyName, OmniType, OmniTypeKind, StrictReadonly, TypeName, UnknownKind} from '@omnigen/api';
import {Naming} from './Naming.ts';
import {assertUnreachable, Case} from '../util';

export class OmniDescribeUtils {

  /**
   * Gives the name of the type, or a description which describes the type.
   * Should only ever be used for logging or comments or other non-essential things.
   *
   * @param type
   */
  public static describe(type: StrictReadonly<OmniType> | undefined): string {

    if (!type) {
      return '[undefined]';
    }

    if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      const parts: string[] = [];
      if (type.upperBound) {
        parts.push(`upper=${OmniDescribeUtils.describe(type.upperBound)}`);
      }
      if (type.lowerBound) {
        parts.push(`lower=${OmniDescribeUtils.describe(type.lowerBound)}`);
      }

      if (parts.length > 0) {
        return `${type.placeholderName}: ${parts.join(', ')}`;
      } else {
        return type.placeholderName;
      }

    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      if (type.placeholderName) {
        return `${type.placeholderName} -> ${type.sourceIdentifier.placeholderName}: ${OmniDescribeUtils.describe(type.type)}`;
      } else {
        return `${type.sourceIdentifier.placeholderName}: ${OmniDescribeUtils.describe(type.type)}`;
      }
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return `Target:${OmniDescribeUtils.simplifyTypeName(OmniDescribeUtils.getTypeName(type))}<${type.targetIdentifiers.map(identifier => OmniDescribeUtils.describe(identifier))}>`;
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return `Source:${OmniDescribeUtils.simplifyTypeName(OmniDescribeUtils.getTypeName(type))}<${type.sourceIdentifiers.map(identifier => OmniDescribeUtils.describe(identifier))}>`;
    } else if (type.kind == OmniTypeKind.DICTIONARY) {
      return `Dictionary<${OmniDescribeUtils.describe(type.keyType)}, ${OmniDescribeUtils.describe(type.valueType)}>`;
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      const upperBound = type.upperBound ? ` : ${OmniDescribeUtils.describe(type.upperBound)}` : '';
      return `?${(type.unknownKind ?? DEFAULT_UNKNOWN_KIND)}?${upperBound}`;
    }

    const baseName = OmniDescribeUtils.simplifyTypeName(OmniDescribeUtils.getVirtualTypeName(type));

    if (type.kind === OmniTypeKind.ENUM) {
      return `${baseName}${OmniDescribeUtils.describeNullable(type.nullable)} [${type.kind}]`;
    }

    if (type.kind === OmniTypeKind.OBJECT) {
      if (type.extendedBy) {
        return `${baseName} : ${OmniDescribeUtils.describe(type.extendedBy)}`;
      } else {
        return `${baseName}`;
      }
    }

    if (OmniTypeUtil.isPrimitive(type)) {
      let suffix = '';

      if (type.value) {
        const resolvedString = OmniDescribeUtils.primitiveConstantValueToString(type.value);
        suffix = `=${resolvedString}`;
      }

      return `${baseName} [${type.kind}${OmniDescribeUtils.describeNullable(type.nullable)}${suffix}]`;
    }

    return `${baseName} [${type.kind}${OmniDescribeUtils.describeNullable(type.nullable)}]`;
  }

  private static describeNullable(isNullable?: boolean): string {
    if (isNullable === undefined) {
      return '';
    }

    return isNullable ? '?' : '!';
  }

  private static simplifyTypeName(type: TypeName | undefined): string {

    if (!type) {
      return 'N/A';
    }

    let baseName = Naming.unwrapWithCallback(type, (name, parts) => {
      if (parts && parts.length > 0) {
        return `${parts.join('')}${name}`;
      } else {
        return name;
      }
    });

    if (baseName) {
      const slashIndex = baseName.lastIndexOf('/');
      if (slashIndex !== -1) {
        baseName = baseName.substring(slashIndex + 1);
      }
    }

    return baseName ?? 'N/A';
  }

  public static primitiveConstantValueToString(value: OmniPrimitiveConstantValue): string {
    if (typeof value == 'string') {
      return value;
    } else {
      return String(value);
    }
  }

  /**
   * IMPORTANT to remember that this is NOT an actual type name, it is a VIRTUAL type name for identification.
   *
   * NOT to be relied upon or used for naming output classes or types.
   */
  public static getVirtualTypeName(type: StrictReadonly<OmniType>, depth?: number): TypeName {

    depth = depth ?? 0;
    if (depth >= 10) {
      return `TYPE-DEPTH-EXCEEDED:${depth}`;
    }

    if (type.kind == OmniTypeKind.ARRAY) {
      return {
        prefix: 'ArrayOf',
        name: OmniDescribeUtils.getVirtualTypeName(type.of, depth + 1),
      };
    } else if (type.kind == OmniTypeKind.TUPLE) {
      return {
        prefix: 'TupleOf',
        name: type.types.map(it => OmniDescribeUtils.getVirtualTypeName(it, depth + 1)).join(''),
      };
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return {
        prefix: 'PropertiesByPositionOf',
        name: type.properties.map(it => Case.pascal(String(OmniDescribeUtils.getPropertyNameOrPattern(it.name)))).join(''),
      };
    } else if (OmniTypeUtil.isPrimitive(type)) {
      return OmniDescribeUtils.getVirtualPrimitiveKindName(type.kind, OmniTypeUtil.isNullableType(type));
    } else if (type.kind === OmniTypeKind.UNKNOWN) {
      if (type.valueDefault != undefined) {
        return OmniDescribeUtils.primitiveConstantValueToString(type.valueDefault);
      }
      switch (type.unknownKind ?? UnknownKind.WILDCARD) {
        case UnknownKind.DYNAMIC_OBJECT:
          return '_dynamic_object';
        case UnknownKind.DYNAMIC:
          return '_dynamic';
        case UnknownKind.DYNAMIC_NATIVE:
          return '_dynamic_native';
        case UnknownKind.OBJECT:
          return '_object';
        case UnknownKind.WILDCARD:
          return '_wildcard';
        case UnknownKind.ANY:
          return '_any';
        default:
          throw new Error(`Unknown UnknownType '${type.unknownKind}`);
      }

    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return {
        prefix: OmniDescribeUtils.getVirtualTypeName(type.of, depth + 1),
        name: 'From',
        suffix: type.model.name ?? type.model.schemaType ?? 'External',
      };
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      const genericTypes = type.targetIdentifiers.map(it => OmniDescribeUtils.getVirtualTypeName(it, depth + 1));
      const genericTypeString = genericTypes.join(', ');
      return {
        name: OmniDescribeUtils.getTypeName(type) ?? 'N/A',
        suffix: `<${genericTypeString}>`,
      };
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      return type.placeholderName || type.sourceIdentifier.placeholderName;
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      return type.placeholderName;
    } else if (type.kind == OmniTypeKind.DECORATING) {
      return `Decorated(${OmniDescribeUtils.getVirtualTypeName(type.of)})`;
    } else if (type.kind == OmniTypeKind.DICTIONARY) {

      // TODO: Convert this into a generic type instead! Do NOT rely on this UGLY hardcoded string method!
      const keyName = OmniDescribeUtils.getVirtualTypeName(type.keyType, depth + 1);
      const valueName = OmniDescribeUtils.getVirtualTypeName(type.valueType, depth + 1);
      return {
        prefix: `[`,
        name: {
          prefix: keyName,
          name: ': ',
          suffix: valueName,
        },
        suffix: ']',
      };
    } else if (type.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      // NOTE: Perhaps use another path delimiter character to differentiate it from things some target languages
      return `${type.fqn.namespace.map(it => OmniDescribeUtils.resolveNamespacePart(it)).join('.')}.${type.fqn.edgeName}`;
    } else if (OmniTypeUtil.isComposition(type)) {

      let prefix: TypeName;
      if (type.kind == OmniTypeKind.EXCLUSIVE_UNION) {
        prefix = ['UnionOf', 'ExclusiveUnionOf'];
      } else if (type.kind == OmniTypeKind.UNION) {
        prefix = 'UnionOf';
      } else if (type.kind == OmniTypeKind.INTERSECTION) {
        prefix = 'IntersectionOf';
      } else if (type.kind == OmniTypeKind.NEGATION) {
        prefix = 'NegationOf';
      } else {
        assertUnreachable(type);
      }

      return {
        prefix: prefix,
        name: {
          prefix: '(',
          name: type.types.map(it => OmniDescribeUtils.getVirtualTypeName(it, depth + 1)).join(','),
        },
        suffix: `)`,
      };
    }

    const typeName = OmniDescribeUtils.getTypeName(type);
    if (typeName) {
      return Naming.unwrap(typeName);
    }

    return (`[ERROR: ADD VIRTUAL TYPE NAME FOR ${String(type.kind)}]`);
  }

  /**
   * Gets the name of the type, or returns 'undefined' if the type is not named.
   *
   * @param type The type to try and find a name for
   */
  public static getTypeName(type: StrictReadonly<OmniType>): TypeName | undefined {

    if ('name' in type && type.name) {
      return type.name;
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return OmniDescribeUtils.getTypeName(type.source);
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return OmniDescribeUtils.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      return type.name || OmniDescribeUtils.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return type.name || OmniDescribeUtils.getTypeName(type.of);
    }

    return undefined;
  }

  public static getPropertyNameOrPattern(name: OmniPropertyName): string | RegExp {
    if (typeof name === 'string') {
      return name;
    } else {
      return name.name;
    }
  }

  /**
   * Returns a general name for the primitive.
   * Does not translate into the actual target language's primitive type.
   * Is used for generating property names or used in general logging.
   *
   * @param kind
   * @param nullable
   */
  public static getVirtualPrimitiveKindName(kind: OmniPrimitiveKinds, nullable: boolean): string {

    switch (kind) {
      case OmniTypeKind.BOOL:
        return nullable ? 'Boolean' : 'bool';
      case OmniTypeKind.VOID:
        return 'void';
      case OmniTypeKind.CHAR:
        return nullable ? 'Character' : 'char';
      case OmniTypeKind.STRING:
        return nullable ? 'String' : 'string';
      case OmniTypeKind.FLOAT:
        return nullable ? 'Float' : 'float';
      case OmniTypeKind.INTEGER:
        return nullable ? 'Integer' : 'int';
      case OmniTypeKind.INTEGER_SMALL:
        return nullable ? 'Short' : 'short';
      case OmniTypeKind.LONG:
        return nullable ? 'Long' : 'long';
      case OmniTypeKind.DECIMAL:
        return nullable ? 'Decimal' : 'decimal';
      case OmniTypeKind.DOUBLE:
        return nullable ? 'Double' : 'double';
      case OmniTypeKind.NUMBER:
        return nullable ? 'Number' : 'number';
      case OmniTypeKind.NULL:
        return 'null';
      case OmniTypeKind.UNDEFINED:
        return 'undefined';
    }
  }

  public static resolveNamespacePart(item: NamespaceArrayItem): string {
    return (typeof item === 'string') ? item : item.name;
  }
}
