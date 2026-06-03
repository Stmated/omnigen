import {Arrayable, OmniExamplePairing, OmniLinkMapping, OmniModel, OmniPrimitiveConstantValue, OmniProperty, OmniPropertyOwner, OmniType, OmniTypeKind, TargetFeatures} from '@omnigen/api';
import {ProxyReducerOmni2} from '../reducer2/ProxyReducerOmni2.ts';
import {Naming, OmniUtil} from '../parse';
import {isDefined} from '../util';

/**
 * Represents a link between properties, derived from `model.continuations`.
 */
export interface LinkComment {
  /** Property names forming the source path (e.g. `['TypeA', 'fieldX']`) */
  sourcePropertyNames?: string[];
  /** Property names forming the target path */
  targetPropertyNames?: string[];
  /** A constant value used as the link source instead of a property path */
  sourceConstantValue?: unknown;
}

export interface ResponseComment {
  readonly title?: string | undefined;
  readonly description?: Arrayable<string> | undefined;
  readonly summary?: Arrayable<string> | undefined;
}

export interface RequestComment {
  readonly title?: string | undefined;
  readonly description?: Arrayable<string> | undefined;
  readonly summary?: Arrayable<string> | undefined;
}

export interface EndpointPropertyComment {
  readonly title?: string | undefined;
  readonly description?: Arrayable<string> | undefined;
  readonly summary?: Arrayable<string> | undefined;
}

interface CommentBase {

  /**
   * More important than `summary` -- description will rather be set if one is missing but a summary is known.
   */
  description?: Arrayable<string> | undefined;
  summary?: Arrayable<string> | undefined;
}

export interface TypeComment extends CommentBase, WithConstantValue {
  title?: string;
  deprecated?: boolean;

  exampleGroups?: ExampleGroupComment[];

  propertyComments?: EndpointPropertyComment[];
  requestComments?: RequestComment[];
  responseComments?: ResponseComment[];
  /** Links derived from `model.continuations` */
  links?: LinkComment[];

  children?: TypeComment[];
}

export enum ExampleValueType {
  RAW,
}

export interface ExampleComment extends CommentBase {
  title?: string | undefined;
  value: unknown;
  /**
   * If not set, defaults to {@link ExampleValueType.RAW}.
   */
  valueType?: ExampleValueType | undefined;
  /**
   * Set if the raw value type is somehow known and could be converted into something we can handle.
   */
  value_converted?: OmniPrimitiveConstantValue | undefined;
}

/**
 * A group of examples, when certain examples belong more together.
 */
export interface ExampleGroupComment extends CommentBase {
  title?: string | undefined;
  examples: ExampleComment[];
}

export interface FunctionComment extends CommentBase {
  deprecated?: boolean;
  parameters?: ParameterComment[];
  // examples?: ExampleComment[];
  /** Grouped examples collected from endpoint example-pairings related to this method */
  exampleGroups?: ExampleGroupComment[];
  /** Links derived from `model.continuations` for the return type */
  links?: LinkComment[];
}

export interface ConstructorComment extends CommentBase {
  parameters?: ParameterComment[];
}

/**
 * Accessor is a more general name for something like a Java getter function.
 */
export interface AccessorComment extends CommentBase {
  deprecated?: boolean;
  /** Type-level comment, propagated when the accessed type is not a standalone object */
  typeComment?: TypeComment;
  links?: LinkComment[];
}

/**
 * Mutator is a more general name for something like a Java setter function.
 */
export interface MutatorComment extends CommentBase {
  parameters?: ParameterComment[];
}

export interface ParameterComment extends CommentBase {
  name?: string;
}

export interface ArgumentComment extends CommentBase {
  name?: string;
  /** The argument value formatted as a human-readable string */
  formattedValue?: string;
}

interface WithConstantValue {
  /**
   * Constant value of a literal primitive type.
   * Only populated when the target language lacks literal-type support.
   */
  constantValue?: OmniPrimitiveConstantValue;
}

export interface PropertyComment extends CommentBase, WithConstantValue {
  deprecated?: boolean;
  /** Type-level comment, propagated when the property's type is not a standalone object */
  typeComment?: TypeComment;
  /** Default values collected from non-literal primitive types (stringified) */
  defaultValues?: string[];
  links?: LinkComment[];
}

export class CommentResolver {

  private readonly _features: TargetFeatures;

  constructor(features: TargetFeatures) {
    this._features = features;
  }

  /**
   * Collect comment data for a type declaration (class, enum, interface, etc.).
   */
  public getTypeDeclarationComment(model: OmniModel, type: OmniType, depth = 0): TypeComment {

    const comment: TypeComment = {};

    if (type.description || type.summary) comment.description = type.description ?? type.summary;
    if (type.summary && type.summary !== comment.description) comment.summary = type.summary;
    if (type.title) comment.title = type.title;
    if (!comment.title && OmniUtil.isNameable(type)) {
      const unwrapped = Naming.unwrap(type.name);
      if (unwrapped) {
        comment.title = unwrapped;
      }
    }

    if (depth > 1) {

      // Only return a very basic form for deeper composition types.
      return comment;
    }

    const exampleGroups: ExampleGroupComment[] = [];

    if (type.examples && type.examples.length > 0) {
      exampleGroups.push({
        examples: type.examples.map(ex => {
          const ec: ExampleComment = {value: ex.value};
          if (ex.description) ec.description = ex.description;
          return ec;
        }),
      });
    }

    // --- literal constant value (only when target cannot express it natively) ---
    this.applyConstantValue(type, comment);

    // --- composition children ---
    if (OmniUtil.isComposition(type)) {
      const children: TypeComment[] = [];
      for (const child of this.getCompositionChildren(type)) {
        if (child.description || child.summary) {
          children.push(this.getTypeDeclarationComment(model, child, depth + 1));
        }
      }
      if (children.length > 0) comment.children = children;
    }

    const propertyDescriptions: EndpointPropertyComment[] = [];
    const requestComments: RequestComment[] = [];
    const responseComments: ResponseComment[] = [];

    for (const endpoint of model.endpoints) {

      const requestType = endpoint.request.type;
      if (requestType === type) {

        if (!OmniUtil.isEmpty(requestType.description) || !OmniUtil.isEmpty(requestType.summary)) {
          requestComments.push({
            title: endpoint.name,
            description: requestType.description,
            summary: requestType.summary,
          });
        }
      }

      for (const response of endpoint.responses) {
        if (response.type === type) {
          if (response.description || response.summary) {
            responseComments.push({
              title: response.name,
              description: response.description,
              summary: response.summary,
            });
          }
        }
      }

      for (const property of OmniUtil.getPropertiesOf(endpoint.request.type)) {
        if (property.type === type) {

          if (!OmniUtil.isEmpty(property.description) || !OmniUtil.isEmpty(property.summary)) {
            propertyDescriptions.push({
              title: OmniUtil.getPropertyName(property.name, true),
              description: property.description,
              summary: property.summary,
            });
          }
        }
      }
    }

    exampleGroups.push(...this.getExamplesFromEndpoints(model, type));

    if (propertyDescriptions.length > 0) comment.propertyComments = [...propertyDescriptions];
    if (responseComments.length > 0) comment.responseComments = responseComments;
    if (requestComments.length > 0) comment.requestComments = requestComments;
    if (exampleGroups.length > 0) comment.exampleGroups = exampleGroups;

    const links = this.getLinksForType(model, type);
    if (links.length > 0) comment.links = links;

    return comment;
  }

  public getPropertyComment(model: OmniModel, type: OmniType, property?: OmniProperty): PropertyComment {

    const comment: PropertyComment = {};

    if (property) {
      if (property.description || property.summary) comment.description = property.description ?? property.summary;
      if (property.summary && property.summary !== comment.description) comment.summary = property.summary;
      if (property.deprecated) comment.deprecated = true;
    }

    // propagate type-level comment when the type is not a standalone object
    if (type.kind !== OmniTypeKind.OBJECT) {
      const typeComment = this.getTypeDeclarationComment(model, type, 1);
      if (this.isTypeCommentNonEmpty(typeComment)) {

        // Duplicates could happen in some combinations of decorated types and other unusual structures.
        typeComment.summary = OmniUtil.deleteFromArrayable(typeComment.summary, comment.summary);
        typeComment.description = OmniUtil.deleteFromArrayable(typeComment.description, comment.description);

        comment.typeComment = typeComment;
      }
    }

    // default values from non-literal primitives
    const defaultValues = this.collectDefaultValues(type);
    if (defaultValues.length > 0) comment.defaultValues = defaultValues;

    // literal constant value (only when target lacks literal support)
    this.applyConstantValue(type, comment);

    // links
    if (property) {
      const links = this.getLinksForProperty(model, property);
      if (links.length > 0) comment.links = links;
    }

    return comment;
  }

  /**
   * Collect comment data for a getter / accessor method (e.g. `getData()` in Java).
   */
  public getAccessorComment(model: OmniModel, property: OmniProperty): AccessorComment {

    const comment: AccessorComment = {};

    if (property.description) comment.description = property.description;
    if (property.summary && property.summary !== comment.description) comment.summary = property.summary;
    if (property.deprecated) comment.deprecated = true;

    // propagate type comment when the accessed type is not a standalone object
    if (property.type.kind !== OmniTypeKind.OBJECT) {
      const typeComment = this.getTypeDeclarationComment(model, property.type, 1);
      if (this.isTypeCommentNonEmpty(typeComment)) {
        comment.typeComment = typeComment;
      }
    }

    const links = this.getLinksForProperty(model, property);
    if (links.length > 0) comment.links = links;

    return comment;
  }

  /**
   * Collect comment data for a setter / mutator method (e.g. `setData(value)` in Java).
   */
  public getMutatorComment(model: OmniModel, property: OmniProperty): MutatorComment {

    const comment: MutatorComment = {};

    if (property.description) comment.description = property.description;
    if (property.summary && property.summary !== comment.description) comment.summary = property.summary;

    const paramName = OmniUtil.getPropertyName(property.name);
    const param: ParameterComment = {};
    if (paramName) param.name = paramName;
    if (property.type.description || property.type.summary) param.description = property.type.description ?? property.type.summary;
    if (property.type.summary && property.type.summary !== param.description) param.summary = property.type.summary;
    comment.parameters = [param];

    return comment;
  }

  /**
   * Collect comment data for a general method declaration.
   */
  public getMethodDeclarationComment(
    model: OmniModel,
    returnType: OmniType,
    parameters: Array<{ name: string; type: OmniType }>,
    deprecated?: boolean,
  ): FunctionComment {

    const comment: FunctionComment = {};

    comment.description = returnType.description ?? returnType.summary;
    if (returnType.summary && returnType.summary !== comment.description) comment.summary = returnType.summary;

    comment.deprecated = Boolean(deprecated);

    const exampleGroups: ExampleGroupComment[] = [];

    if (returnType.examples && returnType.examples.length > 0) {

      const examples = returnType.examples.map(ex => {
        const ec: ExampleComment = {value: ex.value};
        if (ex.description) ec.description = ex.description;
        return ec;
      });

      if (examples.length > 0) {
        exampleGroups.push({
          examples: examples,
        });
      }
    }

    // --- parameters ---
    if (parameters.length > 0) {
      comment.parameters = parameters.map(p => {
        const param = this.getMethodDeclarationParameterComment(model, p.type);
        param.name = p.name;
        return param;
      });
    }

    // TODO: Perhaps fetch examples from other sources, if available.
    exampleGroups.push(...this.getExamplesFromEndpoints(model, returnType));
    if (exampleGroups.length > 0) {
      comment.exampleGroups = exampleGroups;
    }

    // --- links from continuations related to the return type ---
    const links = this.getLinksForType(model, returnType);
    if (links.length > 0) comment.links = links;

    return comment;
  }

  /**
   * Collect comment data for a method-declaration parameter.
   */
  public getMethodDeclarationParameterComment(model: OmniModel, type: OmniType): ParameterComment {

    const comment: ParameterComment = {};

    if (type.description || type.summary) comment.description = type.description ?? type.summary;
    if (type.summary && type.summary !== comment.description) comment.summary = type.summary;
    if (type.title) comment.name = type.title;

    return comment;
  }

  /**
   * Collect comment data for a method-call argument.
   */
  public getMethodCallArgumentComment(model: OmniModel, property: OmniProperty, value?: OmniPrimitiveConstantValue): ArgumentComment {

    const comment: ArgumentComment = {};

    const name = OmniUtil.getPropertyName(property.name);
    if (name) comment.name = name;
    if (property.description || property.summary) comment.description = property.description ?? property.summary;
    if (property.summary && property.summary !== comment.description) comment.summary = property.summary;

    if (value !== undefined) {
      comment.formattedValue = JSON.stringify(value);
    }

    return comment;
  }

  /**
   * Collect comment data for a constructor.
   */
  public getConstructorComment(model: OmniModel, property: OmniProperty): ConstructorComment {

    const comment: ConstructorComment = {};

    if (property.description || property.summary) comment.description = property.description ?? property.summary;
    if (property.summary && property.summary !== comment.description) comment.summary = property.summary;

    // derive parameter comments from the constructed type's own properties
    const typeProperties = OmniUtil.getPropertiesOf(property.type);
    if (typeProperties.length > 0) {
      comment.parameters = typeProperties.map(p => {
        const param: ParameterComment = {};
        const paramName = OmniUtil.getPropertyName(p.name);
        if (paramName) param.name = paramName;
        if (p.description) param.description = p.description;
        if (p.summary && p.summary !== param.description) param.summary = p.summary;
        return param;
      });
    }

    return comment;
  }

  private getExamplesFromEndpoints(model: OmniModel, type: OmniType) {

    const exampleGroups: ExampleGroupComment[] = [];
    for (const endpoint of model.endpoints) {
      if (endpoint.examples) {
        for (const example of endpoint.examples) {
          const paramHasType = (example.params ?? []).some(p => p.type === type);
          const resultHasType = example.result?.type === type;
          if (paramHasType || resultHasType) {
            const group = this.buildExampleGroup(example);
            if (group) exampleGroups.push(group);
          }
        }
      }
    }

    return exampleGroups;
  }

  /**
   * If the type is a literal primitive and the target language does not support literal types,
   * populate `constantValue` on the given comment object.
   */
  private applyConstantValue(type: OmniType, target: WithConstantValue): void {

    if (!this._features.literalTypes && OmniUtil.isPrimitive(type) && type.literal && type.value !== undefined) {
      const val = Array.isArray(type.value) ? type.value[0] : type.value;
      if (val !== undefined) {
        target.constantValue = val;
      }
    }
  }

  /**
   * Walk a type (recursing into compositions) and collect stringified default values
   * from non-literal primitives that have a `value` set.
   */
  private collectDefaultValues(type: OmniType): string[] {

    if (OmniUtil.isComposition(type)) {
      const values: string[] = [];
      for (const child of this.getCompositionChildren(type)) {
        values.push(...this.collectDefaultValues(child));
      }
      return values;
    }

    if (OmniUtil.isPrimitive(type) && type.literal !== true && type.value !== undefined) {
      const raw = Array.isArray(type.value) ? type.value : [type.value];
      return raw.filter(isDefined).map(v => JSON.stringify(v));
    }

    return [];
  }

  /**
   * Build an {@link ExampleGroupComment} from an endpoint {@link OmniExamplePairing}.
   */
  private buildExampleGroup(example: OmniExamplePairing): ExampleGroupComment | undefined {

    const examples: ExampleComment[] = [];

    if (example.params) {
      for (const param of example.params) {
        examples.push({
          title: param.name,
          value: param.value,
          description: param.description,
        });
      }
    }

    if (example.result && example.result.value !== undefined) {
      examples.push({
        title: example.result.name,
        value: example.result.value,
        description: example.result.description ?? example.result.summary,
      });
    }

    if (examples.length === 0) return undefined;

    return {
      title: example.name ?? example.summary ?? 'Example',
      description: example.description,
      examples,
    };
  }

  /**
   * Collect {@link LinkComment}s from `model.continuations` where `type` is an owner
   * of at least one property in the mapping's source or target path.
   */
  private getLinksForType(model: OmniModel, type: OmniType): LinkComment[] {

    const links: LinkComment[] = [];

    for (const continuation of model.continuations ?? []) {
      for (const mapping of continuation.mappings) {
        const sourceOwners = this.getPropertyOwnersFromPath(model, mapping.source.propertyPath);
        const targetOwners = this.getPropertyOwnersFromPath(model, mapping.target.propertyPath);

        if (sourceOwners.some(o => o === type) || targetOwners.some(o => o === type)) {
          links.push(this.buildLinkComment(mapping));
        }
      }
    }

    return links;
  }

  /**
   * Collect {@link LinkComment}s from `model.continuations` where `property` appears
   * in the mapping's source or target path.
   */
  private getLinksForProperty(model: OmniModel, property: OmniProperty): LinkComment[] {

    const links: LinkComment[] = [];

    for (const continuation of model.continuations ?? []) {
      for (const mapping of continuation.mappings) {
        const srcMatch = mapping.source.propertyPath?.some(p => p === property) ?? false;
        const tgtMatch = mapping.target.propertyPath.some(p => p === property);

        if (srcMatch || tgtMatch) {
          links.push(this.buildLinkComment(mapping));
        }
      }
    }

    return links;
  }

  private buildLinkComment(mapping: OmniLinkMapping): LinkComment {

    const link: LinkComment = {};

    if (mapping.source.propertyPath) {
      link.sourcePropertyNames = mapping.source.propertyPath
        .map(p => OmniUtil.getPropertyName(p.name))
        .filter(isDefined);
    } else if (mapping.source.constantValue !== undefined) {
      link.sourceConstantValue = mapping.source.constantValue;
    }

    link.targetPropertyNames = mapping.target.propertyPath
      .map(p => OmniUtil.getPropertyName(p.name))
      .filter(isDefined);

    return link;
  }

  /**
   * Collect all {@link OmniPropertyOwner}s that own any of the properties in the given path.
   */
  private getPropertyOwnersFromPath(model: OmniModel, path?: OmniProperty[]): ReadonlyArray<OmniPropertyOwner> {

    if (!path || path.length === 0) return [];

    const owners: OmniPropertyOwner[] = [];
    for (const property of path) {
      owners.push(...this.getPropertyOwners(model, property));
    }
    return owners;
  }

  /**
   * Find every type in the model that directly owns the given property.
   */
  private getPropertyOwners(model: OmniModel, property: OmniProperty): ReadonlyArray<OmniPropertyOwner> {

    const owners: OmniPropertyOwner[] = [];

    ProxyReducerOmni2.builder().options({immutable: true}).any((n, r) => {
      if (OmniUtil.isPropertyOwner(n) && n.properties.includes(property)) {
        owners.push(n);
      }
      r.yieldBase();
    }).build().reduce(model);

    return owners;
  }

  /**
   * Safely retrieve child types from a composition type.
   */
  private getCompositionChildren(type: OmniType): readonly OmniType[] {
    return (type as unknown as { types: OmniType[] }).types ?? [];
  }

  private isTypeCommentNonEmpty(c: TypeComment): boolean {
    return Object.keys(c).length > 0;
  }
}
