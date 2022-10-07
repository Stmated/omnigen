import {JSONSchema7, JSONSchema7Definition, JSONSchema7Type} from 'json-schema';
import {
  AllowedEnumTsTypes,
  CompositionKind,
  CompositionUtil,
  JSONSchema7Items,
  Naming,
  OmniArrayTypes,
  OmniArrayTypesByPositionType,
  OmniComparisonOperator,
  OmniModel,
  OmniObjectType,
  OmniPrimitiveConstantValue,
  OmniPrimitiveKind,
  OmniProperty,
  OmniPropertyOwner,
  OmniSubTypeHint,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  TypeName,
  Dereferenced, Dereferencer, RealOptions, IParserOptions
} from '@omnigen/core';
import {pascalCase} from 'change-case';
import {JSONSchema} from '@open-rpc/meta-schema';
import {JsonObject} from 'json-pointer';
import {LoggerFactory} from '@omnigen/core-log';
import {DiscriminatorAware} from './DiscriminatorAware';

const logger = LoggerFactory.create(__filename);

export type SchemaToTypeResult = { type: OmniType; canInline: boolean };

export type DiscriminatorAwareSchema = boolean | (JSONSchema7 & DiscriminatorAware);

export interface PostDiscriminatorMapping<T> {
  type: OmniObjectType;
  schema: Dereferenced<DiscriminatorAwareSchema>;
}

/**
 * TODO: This class needs some refactoring after being split out from OpenRpcParser
 *        It should be easy to use the JsonSchemaParser from other parsers; right now quite clumsy and locked to OpenRpc.
 */
export class JsonSchemaParser<TRoot extends JsonObject, TOpt extends IParserOptions> {

  // TODO: Move this to the root? But always have the key be the absolute path?
  private readonly _typeMap = new Map<string, OmniType>();
  private readonly _postDiscriminatorMapping: PostDiscriminatorMapping<DiscriminatorAwareSchema>[] = [];

  private readonly _deref: Dereferencer<TRoot>;

  private readonly _options: RealOptions<TOpt>;

  constructor(deref: Dereferencer<TRoot>, options: RealOptions<TOpt>) {
    this._deref = deref;
    this._options = options;
  }

  public getTypes(): OmniType[] {
    return [...this._typeMap.values()];
  }

  public getPostDiscriminatorMappings(): PostDiscriminatorMapping<DiscriminatorAwareSchema>[] {
    return this._postDiscriminatorMapping;
  }

  /**
   * Register a custom type as if it actually existed inside the schema.
   * Can be used to make sure that the type is found when converting from an OmniModel into a syntax tree.
   *
   * @param className
   * @param type
   */
  public registerCustomTypeManually(className: string, type: OmniType): void {
    this._typeMap.set(`#/custom/schemes/${className}`, type);
  }

  public jsonSchemaToType(
    name: TypeName,
    schema: Dereferenced<JSONSchema7Definition>,
    fallbackRef: string | undefined
  ): SchemaToTypeResult {

    // If contentDescriptor contains an anonymous schema,
    // then we want to be able to say that the ref to that schema is the ref of the contentDescriptor.
    // That way we will not get duplicates of the schema when called from different locations.
    let actualRef: string | undefined;
    if (schema.hash && !schema.mix) {

      // We can only use the hash as the unique key if the schema was not from a mix.
      actualRef = schema.hash;
    } else if (fallbackRef) {

      // The fallback ref can be used if a nested schema should use the ref of a parent as the unique type name.
      actualRef = fallbackRef;
    }

    if (actualRef) {
      const existing = this._typeMap.get(actualRef);
      if (existing) {
        return {
          type: existing,
          canInline: schema.hash == undefined
        };
      }

      // The ref is the much better unique name of the type.
      if (schema.hash && !schema.mix) {

        // We only use the ref as a replacement name if the actual element has a ref.
        // We do not include the fallback ref here, since it might not be the best name.
        // We also cannot use the hash as the name
        name = schema.hash;
      }
    }

    const schemaType = this.jsonSchemaToTypeUncached(schema, name, actualRef);

    if (actualRef) {
      this._typeMap.set(actualRef, schemaType);
    }

    return {
      type: schemaType,
      canInline: schema.hash == undefined
    };
  }

  private jsonSchemaToTypeUncached(
    schema: Dereferenced<JSONSchema7Definition>,
    name: TypeName,
    actualRef: string | undefined
  ): OmniType {

    if (typeof schema.obj == 'boolean') {
      return {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.BOOL,
      };
    }

    const nonClassType = this.jsonSchemaToNonClassType(schema, name);

    if (nonClassType) {
      return nonClassType;
    }

    const schemaObj = schema.obj;
    const names: TypeName = [
      name,
      (fn) => {
        if (schemaObj.title) {
          return `${pascalCase(schemaObj.title)}${Naming.safe(name, fn)}`;
        } else {
          return undefined;
        }
      },
      (fn) => {
        if (schemaObj.type) {
          return `${pascalCase(String(schemaObj.type))}${Naming.safe(name, fn)}`;
        } else {
          return undefined;
        }
      }
    ];

    const type: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: names,
      description: schema.obj.description,
      title: schema.obj.title,
      properties: [],

      // TODO: This is incorrect. 'additionalProperties' is more advanced than true/false
      additionalProperties: (schema.obj.additionalProperties == undefined
          ? undefined
          : typeof schema.obj.additionalProperties == 'boolean'
            ? schema.obj.additionalProperties
            : true
      )
    };

    if (actualRef) {

      // Need to save it to the type map as soon as we can.
      // Otherwise we might end up with recursive loops in the schema.
      // This way we might be able to mitigate most of them.
      this._typeMap.set(actualRef, type);
    }

    const properties: OmniProperty[] = [];
    if (schema.obj.properties) {
      for (const key of Object.keys(schema.obj.properties)) {
        const propertyValue = schema.obj.properties[key];
        const propertySchemaOrRef = this._deref.get(propertyValue, schema.root);
        const omniProperty = this.toOmniPropertyFromJsonSchema7(type, key, propertySchemaOrRef);
        properties.push(omniProperty);

        if (schema.obj.readOnly != undefined) {
          omniProperty.readOnly = schema.obj.readOnly;
        }

        if (schema.obj.writeOnly != undefined) {
          omniProperty.writeOnly = schema.obj.writeOnly;
        }
      }
    }

    type.properties = properties;
    // type.requiredProperties = requiredProperties;

    if (schema.obj.not) {
      // ???
    }

    if (schema.obj.multipleOf) {
      // TODO: Make this general, so that all other places call it.
    }

    return this.extendOrEnhanceClassType(schema, type, name);
  }

  private jsonSchemaToNonClassType(schema: Dereferenced<JSONSchema7Definition>, name: TypeName): OmniType | undefined {

    if (typeof schema.obj == 'boolean') {
      return undefined;
    }

    if (typeof schema.obj.type === 'string') {
      if (schema.obj.type === 'array') {
        return this.getArrayItemType(schema, schema.obj.items, name);
      } else if (schema.obj.type !== 'object') {

        // TODO: This is not lossless if the primitive has comments/summary/etc
        const enumValues = schema.obj.const ? [schema.obj.const] : schema.obj.enum;
        return this.typeToGenericKnownType(name, schema.obj.type, schema.obj.format, schema.obj.description, enumValues);
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  private toOmniPropertyFromJsonSchema7(
    owner: OmniPropertyOwner,
    propertyName: string,
    schemaOrRef: Dereferenced<JSONSchema7Definition>
  ): OmniProperty {

    // The type name will be replaced if the schema is a $ref to another type.
    const schema = this.unwrapJsonSchema(schemaOrRef);

    const propertyType = this.jsonSchemaToType(
      this.getPreferredName(
        schema,
        schemaOrRef,
        (fn) => {
          // NOTE: This might not be the best way to create the property name
          // But for now it will have to do, since most type names will be a simple type.
          const typeName = OmniUtil.getVirtualTypeName(owner);
          return `${Naming.safe(typeName, fn)}${pascalCase(propertyName)}`;
        }
      ),
      schema,
      undefined
    );

    return {
      name: propertyName,
      fieldName: this.getVendorExtension(schema.obj, 'field-name'),
      propertyName: this.getVendorExtension(schema.obj, 'property-name'),
      type: propertyType.type,
      owner: owner,
      description: schema.obj.description,
    };
  }

  private getPreferredName(
    schema: Dereferenced<JSONSchema7>,
    dereferenced: Dereferenced<unknown>,
    fallback: TypeName
  ): TypeName {

    const names = this.getMostPreferredNames(dereferenced, schema);
    names.push(...this.getFallbackNamesOfJsonSchemaType(schema));

    if (fallback) {
      names.push(fallback);
    }

    return names;
  }

  public getFallbackNamesOfJsonSchemaType(
    schema: Dereferenced<JSONSchema7>
  ): TypeName[] {

    const names: TypeName[] = [];
    if (schema.obj.type) {
      if (Array.isArray(schema.obj.type)) {
        names.push(pascalCase(schema.obj.type.join('_')));
      } else {
        if (schema.obj.type) {
          names.push(pascalCase(schema.obj.type));
        }
      }
    }

    return names;
  }

  public getMostPreferredNames(dereferenced: Dereferenced<unknown>, schema: Dereferenced<JSONSchema7>): TypeName[] {
    const names: TypeName[] = [];
    if (dereferenced.hash) {
      names.push(dereferenced.hash);
    }

    if (schema.obj.title) {
      names.push(schema.obj.title);
    }

    return names;
  }

  private canBeReplacedBy(type: OmniObjectType, extension: OmniType): boolean {

    if (OmniUtil.isEmptyType(type)) {
      if (extension.kind == OmniTypeKind.COMPOSITION && extension.compositionKind == CompositionKind.XOR) {
        return true;
      }
    }

    return false;
  }

  private mergeTwoPropertiesAndAddToClassType(a: OmniProperty, b: OmniProperty, to: OmniObjectType): void {
    const common = OmniUtil.getCommonDenominatorBetween(a.type, b.type);
    if (common) {
      if (to.properties) {
        const idx = to.properties.indexOf(b);
        if (idx !== -1) {
          to.properties.splice(idx, 1);
        }
      }
      this.addPropertyToClassType(a, to, common);
    } else {

      // TODO: Can we introduce generics here in some way?
      const vsString = `${OmniUtil.getTypeDescription(a.type)} vs ${OmniUtil.getTypeDescription(b.type)}`;
      const errMessage = `No common type for merging properties ${a.name}. ${vsString}`;
      throw new Error(errMessage);
    }
  }

  private addPropertyToClassType(property: OmniProperty, toType: OmniObjectType, as?: OmniType): void {

    if (!toType.properties) {
      toType.properties = [];
    }

    toType.properties.push({
      ...property,
      owner: toType,
      type: as || property.type,
    });
  }

  private getVendorExtension<R>(obj: Dereferenced<JsonObject> | JsonObject, key: string): R | undefined {

    if ('obj' in obj && 'root' in obj) {
      throw new Error(`You seem to have given a dereference object, when you should give the inner object.`);
    }

    const records = obj as Record<string, unknown>;
    const value = records[`x-${key}`];
    if (value == undefined) {
      return undefined;
    }

    return value as R;
  }

  public unwrapJsonSchema(schema: Dereferenced<JSONSchema7Definition | JSONSchema>): Dereferenced<JSONSchema7> {
    if (typeof schema.obj == 'boolean') {
      if (schema.obj) {
        return {obj: {}, root: schema.root, hash: schema.hash, mix: schema.mix};
      } else {
        return {obj: {not: {}}, root: schema.root, hash: schema.hash, mix: schema.mix};
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      const deref = this._deref.get<JSONSchema7>(schema.obj as JSONSchema7, schema.root);
      return {
        obj: deref.obj,
        hash: deref.hash || schema.hash,
        root: deref.root || schema.root,
        mix: deref.mix || schema.mix, // If one is mix, result is mix
      };
    }
  }

  private typeToGenericKnownType(
    name: TypeName,
    schemaType: string,
    format?: string,
    description?: string,
    enumValues?: JSONSchema7Type[]
  ): OmniType {

    // TODO: Need to take heed to 'schema.format' for some primitive and/or known types!
    const lcType = schemaType.toLowerCase();
    if (lcType == 'null') {
      return {
        kind: OmniTypeKind.NULL,
        description: description,
      };
    }

    const lcFormat = format?.toLowerCase() ?? '';
    let primitiveType: OmniPrimitiveKind;
    switch (lcType) {
      case 'number':
        switch (lcFormat) {
          case 'decimal':
            primitiveType = OmniPrimitiveKind.DECIMAL;
            break;
          case 'double':
            primitiveType = OmniPrimitiveKind.DOUBLE;
            break;
          case 'float':
            primitiveType = OmniPrimitiveKind.FLOAT;
            break;
          default:
            primitiveType = this.getIntegerPrimitiveFromFormat(lcFormat, OmniPrimitiveKind.NUMBER);
            break;
        }
        break;
      case 'integer':
        primitiveType = this.getIntegerPrimitiveFromFormat(lcFormat, OmniPrimitiveKind.INTEGER);
        break;
      case 'boolean':
        primitiveType = OmniPrimitiveKind.BOOL;
        break;
      case 'string':
        switch (lcFormat) {
          case 'char':
          case 'character':
            primitiveType = OmniPrimitiveKind.CHAR;
            break;
          default:
            primitiveType = OmniPrimitiveKind.STRING;
            break;
        }
        break;
      default:
        logger.warn(`Do not know how to handle primitive type '${lcType}', will assume String`);
        primitiveType = OmniPrimitiveKind.STRING;
        break;
    }

    if (enumValues && enumValues.length > 0) {

      if (enumValues.length == 1) {

        // En ENUM with just one value is the same as a regular constant
        return {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: primitiveType,
          valueConstant: this.getLiteralValueOfSchema(enumValues[0]),
          description: description,
        };
      }

      let allowedValues: AllowedEnumTsTypes[];
      if (primitiveType == OmniPrimitiveKind.STRING) {
        allowedValues = enumValues.map(it => `${String(it)}`);
      } else if (primitiveType == OmniPrimitiveKind.DECIMAL || primitiveType == OmniPrimitiveKind.FLOAT || primitiveType == OmniPrimitiveKind.NUMBER) {
        allowedValues = enumValues.map(it => Number.parseFloat(`${String(it)}`));
      } else {
        allowedValues = enumValues.map(it => Number.parseInt(`${String(it)}`));
        primitiveType = OmniPrimitiveKind.STRING;
      }

      // TODO: Try to convert the ENUM values into the specified primitive type.
      return {
        name: name ?? schemaType,
        kind: OmniTypeKind.ENUM,
        primitiveKind: primitiveType,
        enumConstants: allowedValues,
        description: description,
      };
    } else {
      return {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: primitiveType,
        valueConstant: undefined,
        description: description,
      };
    }
  }

  private getLiteralValueOfSchema(schema: JSONSchema7Type): OmniPrimitiveConstantValue | undefined {

    if (typeof schema == 'string') {
      return schema;
    } else if (typeof schema == 'number') {
      return schema;
    } else if (typeof schema == 'boolean') {
      return schema;
    }

    // TODO: How should we handle if an object or a whole schema structure is given here?
    //        That should be possible to be used as a literal constant as well, no?
    return undefined;
  }

  private getIntegerPrimitiveFromFormat(format: string, fallback: OmniPrimitiveKind.INTEGER | OmniPrimitiveKind.NUMBER): OmniPrimitiveKind {
    switch (format) {
      case 'integer':
      case 'int':
        return OmniPrimitiveKind.INTEGER;
      case 'long':
      case 'int64':
        return OmniPrimitiveKind.LONG;
      default:
        return fallback;
    }
  }

  public extendOrEnhanceClassType(
    schema: Dereferenced<JSONSchema7Definition>,
    type: OmniObjectType,
    name: TypeName
  ): OmniType {

    // TODO: Work needs to be done here which merges types if possible.
    //        If the type has no real content of its own, and only inherits,
    //        Then it might be that this "type" can cease to exist and instead be replaced by its children

    // TODO: Make it optional to "simplify" types that inherit from a primitive -- instead make it use @JsonValue (and maybe @JsonCreator)
    if (typeof schema.obj == 'boolean') {
      throw new Error(`Not allowed to be a boolean`);
    }

    const compositionsOneOfOr: OmniType[] = [];
    const compositionsAllOfAnd: OmniType[] = [];
    const compositionsAnyOfOr: OmniType[] = [];
    let compositionsNot: OmniType | undefined;

    if (schema.obj.oneOf) {

      if (schema.obj.oneOf.length == 1) {
        // Weird way of writing the schema, but if it's just 1 then it's same as "allOf"
        schema.obj.allOf = (schema.obj.allOf || []).concat(schema.obj.oneOf);
        schema.obj.oneOf = undefined;
      } else {
        for (const entry of schema.obj.oneOf) {
          const deref = this._deref.get(entry, schema.root);

          // TODO: Make this simpler. Create a new method for getting preferred name of a class!
          //        It needs to take care of the dereferencing if needed, and the fallback from hash, etc, etc
          //        The automatic fallback of the schema should be able to be multiple things, like the type name
          //        ALSO! For Java, the composite class should be merged with parent if it is empty!
          //        It is just stupid to have TagOrString extend TagXOrString
          const unwrapped = this.unwrapJsonSchema(deref);
          const oneOfTitle = this.getPreferredName(unwrapped, unwrapped, '');
          compositionsOneOfOr.push(this.jsonSchemaToType(oneOfTitle, deref, undefined).type);
        }
      }
    }

    if (schema.obj.allOf) {
      for (const entry of schema.obj.allOf) {
        const subType = this.jsonSchemaToType(name, this._deref.get(entry, schema.root), undefined);
        if (subType.canInline) {
          // This schema can actually just be consumed by the parent type.
          // This happens if the sub-schema is anonymous and never used by anyone else.
          this.mergeType(subType.type, type);
        } else {
          compositionsAllOfAnd.push(subType.type);
        }
      }
    }

    if (schema.obj.anyOf) {
      for (const entry of schema.obj.anyOf) {
        const subType = this.jsonSchemaToType(name, this._deref.get(entry, schema.root), undefined);
        compositionsAnyOfOr.push(subType.type);
      }
    }

    // TODO: This is wrong -- it needs to be done in order
    if (schema.obj.not && typeof schema.obj.not !== 'boolean') {
      compositionsNot = (this.jsonSchemaToType(name, {obj: schema.obj.not, root: schema.root}, undefined)).type;
    }

    let subTypeHints: OmniSubTypeHint[] | undefined = undefined;
    const discriminatorAware = this.getDiscriminatorAware(schema);
    if (discriminatorAware) {

      // This is an OpenApi JSON Schema.
      // Discriminators do not actually exist in JSONSchema, but it is way too useful to not make use of.
      // I think most people would think that this is supported for OpenRpc as well, as it should be.
      subTypeHints = this.getSubTypeHints(discriminatorAware, type);
    }

    let extendedBy = CompositionUtil.getCompositionOrExtensionType(
      compositionsAnyOfOr,
      compositionsAllOfAnd,
      compositionsOneOfOr,
      compositionsNot
    );

    if (extendedBy && subTypeHints && subTypeHints.length > 0) {

      // We have subTypeHints, and also an extension.
      // Right now we will skip the extension if it is a composition type.
      // NOTE: This is most likely incorrect
      // TODO: Need to figure out a better and more reliable way of handling this
      // TODO: Need a way to "minimize" tbe given composition, by removing the types that are mapped
      //        Then we keep what is left, if anything is left.
      if (extendedBy.kind == OmniTypeKind.COMPOSITION) {
        extendedBy = undefined;
      }
    }

    if (extendedBy && this.canBeReplacedBy(type, extendedBy)) {

      // Simplify empty types by only returning the inner content.
      const newType: OmniType = {
        ...extendedBy,
        description: extendedBy.description || type.description,
        summary: extendedBy.summary || type.summary,
        title: extendedBy.title || type.title,
      };

      // TODO: A bit ugly? Is there a better way, or just a matter of introducing a helper method that does it for us?
      if ('name' in newType || newType.kind == OmniTypeKind.COMPOSITION || newType.kind == OmniTypeKind.INTERFACE) {

        // The name should be kept the same, since it is likely much more specific.
        newType.name = type.name;
      }

      return newType;
    }

    type.subTypeHints = subTypeHints;

    // NOTE: "extendedBy" could be an ENUM, while "type" is an Object.
    // This is not allowed in some languages. But it is up to the target language to decide how to handle it.
    if (extendedBy) {

      const extendableType = OmniUtil.asInheritableType(extendedBy);
      if (!extendableType) {
        throw new Error(`Not allowed to use '${OmniUtil.getTypeDescription(extendedBy)}' as an extension type`);
      }

      type.extendedBy = extendableType;
    }

    return type;
  }

  private getDiscriminatorAware(
    schema: Dereferenced<JSONSchema7Definition | DiscriminatorAwareSchema>
  ): Dereferenced<JSONSchema7 & DiscriminatorAware> | undefined {

    if (typeof schema.obj == 'boolean') {
      return undefined;
    }

    if ('discriminator' in schema.obj) {
      return {
        obj: schema.obj,
        hash: schema.hash,
        root: schema.root,
        mix: schema.mix
      };
    }

    return undefined;
  }

  private getSubTypeHints(schema: Dereferenced<DiscriminatorAwareSchema>, type: OmniObjectType): OmniSubTypeHint[] | undefined {

    const subTypeHints: OmniSubTypeHint[] = [];

    if (typeof schema.obj == 'boolean') {
      return undefined;
    }

    const mapping = schema.obj.discriminator.mapping;
    const discriminatorPropertyName = schema.obj.discriminator.propertyName;

    if (mapping) {

      // We have manual mappings. That's good, makes things a bit easier.
      // If we receive a propertyName that is not in this mapping, then the type lookup must be done at runtime.
      // That should be done by building a ref to '#/components/schemas/${propertyValue}
      for (const key of Object.keys(mapping)) {
        const ref = mapping[key];
        try {

          const deref = this._deref.getFromRef<JSONSchema7>(ref, undefined, schema.root);
          const type = this.jsonSchemaToType(deref.hash || ref, deref, undefined);

          subTypeHints.push({
            type: type.type,
            qualifiers: [
              {
                path: [discriminatorPropertyName],
                operator: OmniComparisonOperator.EQUALS,
                value: key
              }
            ]
          });

          // TODO: If "mappings" is given, then add that class as extension to all classes being pointed to
          // TODO: If no "mappings" is given, then that must be part of the runtime mapping instead
          // TODO: ... do this later? And focus on fully functional interfaces code first, without complexity of mappings? YES!!!! DO IT!

        } catch (ex) {
          throw new Error(
            `Could not find schema for mapping ${ref}: ${String(ex)}`,
            {cause: (ex instanceof Error) ? ex : undefined}
          );
        }
      }
    }

    const subSchemas = (schema.obj.anyOf || []).concat(schema.obj.oneOf || []);
    if (subSchemas.length > 0) {

      // TODO: If if is "oneOf" and no other, then those should become SUB-TYPES! Make sure it is so!
      for (const subSchema of subSchemas) {

        const deref = this._deref.get(subSchema, schema.root);
        if (!deref.hash) {
          continue;
        }

        const lastSlashIndex = deref.hash.lastIndexOf('/');
        const supposedPropertyValue = deref.hash.substring(lastSlashIndex + 1);
        const existingMapping = subTypeHints.find(it => it.qualifiers.find(q => (q.value == supposedPropertyValue)));
        if (existingMapping) {
          continue;
        }

        const subType = this.jsonSchemaToType(deref.hash, deref, undefined).type;
        if (subTypeHints.find(it => it.type == subType)) {
          logger.debug(`Skipping ${discriminatorPropertyName} as ${OmniUtil.getTypeDescription(subType)} since it has a custom key`);
          continue;
        }

        subTypeHints.push({
          type: subType,
          qualifiers: [
            {
              path: [discriminatorPropertyName],
              operator: OmniComparisonOperator.EQUALS,
              value: supposedPropertyValue
            }
          ]
        })

      }
    } else {

      // This schema does not contain any sub-schemas, so we cannot know which types that uses this schema.
      // HOWEVER, we can do that in post, after all other processing has been done.
      // NOTE: It might be beneficial to do this every time, even if there are sub-schemas provided.
      if (this._options.autoTypeHints) {
        this._postDiscriminatorMapping.push({
          type: type,
          schema: schema, // TODO: How to make this work without cast? TS 4.9?
        });
      }
    }

    if (subTypeHints.length == 0) {
      return undefined;
    }

    return subTypeHints;
  }

  private getArrayItemType(
    schema: Dereferenced<JSONSchema7Definition>,
    items: JSONSchema7Items,
    name: TypeName | undefined
  ): OmniArrayTypes {

    if (typeof schema.obj == 'boolean') {
      throw new Error(`The schema object should not be able to be a boolean`);
    }

    if (!items) {
      // No items, so the schema for the array items is undefined.
      return {
        kind: OmniTypeKind.ARRAY,
        minLength: schema.obj.minItems,
        maxLength: schema.obj.maxItems,
        description: schema.obj.description,
        of: {
          kind: OmniTypeKind.UNKNOWN,
        },
      };

    } else if (typeof items == 'boolean') {
      throw new Error(`Do not know how to handle a boolean items '${name ? Naming.safe(name) : ''}'`);
    } else if (Array.isArray(items)) {

      // TODO: We should be introducing interfaces that describe the common denominators between the different items?
      // TODO: This needs some seriously good implementation on the code-generator side of things.
      // TODO: What do we do here if the type can be inlined? Just ignore I guess?

      const staticArrayTypes = items.map(it => {
        const derefArrayItem = this._deref.get(it, schema.root);
        // NOTE: The name below is probably extremely wrong. Fix once we notice a problem.
        return this.jsonSchemaToType(derefArrayItem.hash || 'UnknownArrayItem', derefArrayItem, undefined);
      });

      const commonDenominator = OmniUtil.getCommonDenominator(...staticArrayTypes.map(it => it.type));

      const arrayByPositionType: OmniArrayTypesByPositionType = {
        // name: name ?? `ArrayOf${staticArrayTypes.map(it => Naming.safer(it.type)).join('And')}`,
        kind: OmniTypeKind.ARRAY_TYPES_BY_POSITION,
        types: staticArrayTypes.map(it => it.type),
        description: schema.obj.description,
        commonDenominator: commonDenominator,
      };

      return arrayByPositionType;

    } else {

      // items is a single JSONSchemaObject
      const itemsSchema = this.unwrapJsonSchema({obj: items, root: schema.root});
      let itemTypeName: TypeName;
      if (itemsSchema.obj.title) {
        itemTypeName = pascalCase(itemsSchema.obj.title);
      } else {
        itemTypeName = (fn) => `${name ? Naming.safe(name, fn) : ''}Item`;
      }

      const itemType = this.jsonSchemaToType(itemTypeName, itemsSchema, undefined);

      return {
        kind: OmniTypeKind.ARRAY,
        minLength: schema.obj.minItems,
        maxLength: schema.obj.maxItems,
        description: schema.obj.description,
        of: itemType.type,
      };
    }
  }

  private mergeType(from: OmniType, to: OmniType, lossless = true): OmniType {

    if (from.kind == OmniTypeKind.OBJECT && to.kind == OmniTypeKind.OBJECT) {

      for (const fromProperty of (from.properties || [])) {
        const toProperty = to.properties?.find(p => p.name == fromProperty.name);
        if (!toProperty) {
          // This is a new property, and can just be added to the 'to'.
          this.addPropertyToClassType(fromProperty, to);
        } else {
          // This property already exists, so we should try and find common type.
          if (lossless) {
            throw new Error(`Property ${toProperty.name} already exists, and merging should be lossless`);
          } else {
            this.mergeTwoPropertiesAndAddToClassType(fromProperty, toProperty, to);
          }
        }
      }
    }

    return to;
  }

  /**
   * TODO: Check if this actually works -- since this._options has not been assigned yet!
   */
  public transformErrorDataSchemaToOmniType(schema: JSONSchema7 | undefined): OmniType | undefined {

    if (!schema) {
      return schema;
    }

    // The type is a JSONSchema7, though the type system seems unsure of that fact.
    const jsonSchema = schema as JSONSchema7;
    const derefJsonSchema = this._deref.get(jsonSchema, this._deref.getFirstRoot());
    const omniType = this.jsonSchemaToType('JsonRpcCustomErrorPayload', derefJsonSchema, undefined).type;
    logger.info(`Using the from jsonschema converted omni type '${OmniUtil.getTypeDescription(omniType)}'`);
    return omniType;
  }

  public executePostCleanup(model: OmniModel): void {

    // Let's do the discriminator mapping which could not be done earlier in the process.
    // If we got here, then the type does not have any other mappings specified.
    for (const postDiscriminator of this.getPostDiscriminatorMappings()) {

      if (typeof postDiscriminator.schema.obj == 'boolean') {
        continue;
      }

      const inheritors = OmniUtil.getTypesThatInheritFrom(model, postDiscriminator.type);
      const propertyName = postDiscriminator.schema.obj.discriminator.propertyName;

      const subTypeHints: OmniSubTypeHint[] = [];
      for (const inheritor of inheritors) {

        subTypeHints.push({
          type: inheritor,
          qualifiers: [
            {
              path: [propertyName],
              operator: OmniComparisonOperator.EQUALS,
              // TODO: This is VERY LIKELY INVALID! Must get the originating reference name or something!
              value: OmniUtil.getVirtualTypeName(inheritor),
            }
          ]
        })
      }

      if (subTypeHints.length > 0) {

        // TODO: Do not replace, instead add the new ones that we found.
        const existingHints = postDiscriminator.type.subTypeHints;
        if (existingHints) {
          const newSubTypeHints = subTypeHints.filter(it => {
            return !existingHints.find(existing => existing.type == it.type);
          });

          logger.info(`Adding ${newSubTypeHints.length} additional sub-type hints`);
          existingHints.push(...newSubTypeHints);

        } else {
          postDiscriminator.type.subTypeHints = subTypeHints;
        }
      }
    }
  }
}
