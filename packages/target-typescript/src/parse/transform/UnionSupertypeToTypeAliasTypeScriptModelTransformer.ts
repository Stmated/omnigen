import {LoggerFactory} from '@omnigen/core-log';
import {
  OmniInterfaceType,
  OmniIntersectionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniSuperTypeCapableType,
  OmniTypeKind,
  ParserOptions,
  TargetOptions,
} from '@omnigen/api';
import {isDefined, OmniUtil, ProxyReducerOmni2} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

/**
 * This takes an object which has an extension that contains a union and makes it viable to be represented as code.
 *
 * It:
 * - Renames the interface `Foo` to `FooInterface`
 * - Creates type alias `Foo = FooInterface & (A | B)` where A and B are the types in the exclusive union.
 */
export class UnionSupertypeToTypeAliasTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  private _uniqueCounter = 0;

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    args.model = ProxyReducerOmni2.builder().build({
      OBJECT: (n, r) => {

        if (n.extendedBy && this.hasUnion(n.extendedBy)) {

          const previousExtendedBy = r.reduce(n.extendedBy);
          if (!previousExtendedBy) {

            // The exclusive union extension has been removed, so we will just remove the object as well.
            r.remove();
            return;
          }

          const reducedObject = r.yieldBase(); //.reduce(n);
          if (!reducedObject || reducedObject.kind !== OmniTypeKind.OBJECT) {

            // The object has been removed, so we will not create an interface for it.
            r.remove();
            return;
          }

          const newInterface: OmniInterfaceType = {
            kind: OmniTypeKind.INTERFACE,
            name: {prefix: args.options.interfaceNamePrefix, name: {name: n.name, case: 'pascal'}, suffix: args.options.interfaceNameSuffix},
            of: {
              kind: OmniTypeKind.OBJECT,
              name: `_Hidden_Exclusive_Inheritance__${this._uniqueCounter++}`,
              inline: true,
              properties: n.properties.map(it => r.reduce(it)).filter(isDefined),
            },
            debug: OmniUtil.addDebug(n.debug, `Converted to interface because of exclusive union in super type`),
          };

          const newIntersection: OmniIntersectionType = {
            kind: OmniTypeKind.INTERSECTION,
            name: n.name,
            types: [newInterface, previousExtendedBy],
          };

          r.replace(newIntersection).persist();
        } else {
          r.callBase();
        }
      },
    }).reduce(args.model);
  }

  private hasUnion(type: OmniSuperTypeCapableType): boolean {

    if (type.kind === OmniTypeKind.UNION || type.kind === OmniTypeKind.EXCLUSIVE_UNION) {
      return true;
    } else if (type.kind === OmniTypeKind.INTERSECTION) {
      return type.types.some(it => this.hasUnion(it));
    }
    return false;
  }
}
