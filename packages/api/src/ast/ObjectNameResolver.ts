import {OmniType} from '../parse';
import {PackageOptions} from '../options';
import {TargetOptions} from '../interpret';

/**
 * Implementations of this interface deals with creating object names for OmniType.
 *
 * The names are *not* necessarily the names to use for the class or interface, and they are *not* necessarily the rendered form of for example a generic type `Foo<Bar, Baz>`.
 *
 * Instead the created names should be regarded as `"If I wanted to create a type alias for a certain type or collection of types, what should it be called?"`
 *
 * TODO:
 *   Make use of the existing `TypeName` so we work with only one way of naming things (easier to make more flexible later)
 */
export interface ObjectNameResolver<TOpt extends PackageOptions & TargetOptions = PackageOptions & TargetOptions> {
  namespaceSeparator: string;

  isReservedWord(word: string): boolean;
  isEqual(a: ObjectName | undefined, b: ObjectName | undefined): boolean;
  isEqualNamespace(a: Namespace | undefined, b: Namespace | undefined): boolean;
  startsWithNamespace(ns: ObjectName | Namespace | undefined, comparedTo: ObjectName | Namespace | undefined): boolean;

  investigate(args: ObjectNameResolveArgs<TOpt>): ObjectName;
  parse(fqn: string): ObjectName;
  parseNamespace(namespace: string): Namespace;

  /**
   * If you are asking for the namespace but there is no namespace, then this will return an empty string.
   */
  build(args: AstNameBuildArgs): string;
}

export interface ObjectNameResolveArgs<TOpt extends PackageOptions & TargetOptions> {
  type: OmniType;
  customName?: string | undefined;
  options: TOpt;
  boxed?: boolean | undefined;
  use?: TypeUseKind | undefined;
  recursion?: OmniType[];
}

export type AstNameBuildArgs =
  {
    name: ObjectName | Namespace,
    with: NameParts.NAMESPACE,
    relativeTo?: Namespace | undefined,
    use?: TypeUseKind.NAMESPACE_DECLARATION | TypeUseKind.IMPORT,
  }
  |
  {
    name: ObjectName,
    with: NameParts.NAME,
    use?: TypeUseKind,
  }
  |
  {
    name: ObjectName,
    with: NameParts.FULL,
    relativeTo?: Namespace | undefined;
    use?: TypeUseKind,
  };

/**
 * TODO: Delete? Only keep the "use" which says where it will be used?
 */
export enum NameParts {
  NAMESPACE = 'NS',
  NAME = 'NAME',
  FULL = 'FULL',
}

export enum TypeUseKind {
  /**
   * The declared type can for example be the `Map` of `Map<String, String> map = new HashMap<>()`
   */
  DECLARED = 'DEC',

  /**
   * The concrete type can for example be the `HashMap` of `Map<String, String> map = new HashMap<>()`
   */
  CONCRETE = 'CON',

  /**
   * The name when it is used to declare namespace/package.
   */
  NAMESPACE_DECLARATION = 'NS_DEC',

  /**
   * The name when it is used as an import, can in some languages be relative.
   */
  IMPORT = 'IMPORT',
}

export interface NamespacePart {
  name: string;

  /**
   * If nested inside another class. Depending on language this might have other syntax than regular namespace separator.
   */
  nested?: boolean;
}

export type NamespaceArrayItem = NamespacePart | string;
export type Namespace = Array<NamespaceArrayItem>;

export type ObjectEdgeName =
  string
  | { onUse: string; onImport: string; }
  ;


export interface ObjectName {
  namespace: Namespace;
  edgeName: ObjectEdgeName;
}
