import {OmniInterfaceType, OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniSuperTypeCapableType, OmniType, OmniTypeKind} from '@omnigen/api';
import {OmniUtil, ProxyReducer, ProxyReducerOmni} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

type NotInterface = Exclude<OmniSuperTypeCapableType, OmniInterfaceType>;

/**
 * Checks for object types that are used as interfaces, and splits the type into two types.
 * One that is the original, and one that is the interface version, pointing to the original.
 * It then replaces the types where needed.
 */
export class InterfaceExtractorModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    const interfaceMap = new Map<OmniType, OmniInterfaceType>();
    const allTypes: OmniType[] = [];

    ProxyReducerOmni.builder().options({immutable: true}).build({
      OBJECT: (n, r) => {
        allTypes.push(ProxyReducer.getTarget(n));
        return r.next(n);
      },
      DECORATING: (n, r) => {
        allTypes.push(ProxyReducer.getTarget(n));
        return r.next(n);
      },
      EXTERNAL_MODEL_REFERENCE: (n, r) => {
        allTypes.push(ProxyReducer.getTarget(n));
        return r.next(n);
      },
      INTERFACE: (n, r) => {
        const target = ProxyReducer.getTarget(n);
        allTypes.push(target);
        if (n.of.kind !== OmniTypeKind.INTERFACE) {
          interfaceMap.set(n.of, target);
        }
        return r.next(n);
      },
    }).reduce(args.model);

    // OmniUtil.visitTypesDepthFirst(args.model, ctx => {
    //
    //   const type = ctx.type;
    //   if (type.kind == OmniTypeKind.INTERFACE && type.of.kind != OmniTypeKind.INTERFACE) { // && !interfaceMap.has(type.of)) {
    //     interfaceMap.set(type.of, type);
    //   }
    //
    //   allTypes.push(ctx.type);
    // });

    const handled: OmniType[] = [];

    // Then we go through all types and find those that have multiple inheritances and convert any 1..N extensions into interfaces.
    for (let type of allTypes) {

      type = OmniUtil.getUnwrappedType(type);

      if (handled.includes(type)) {
        continue;
      }

      handled.push(type);

      if (type.kind == OmniTypeKind.INTERFACE) {
        this.makeExtensionsInterfaces(type, interfaceMap, 0);
      } else if (type.kind == OmniTypeKind.OBJECT) {
        this.makeExtensionsInterfaces(type, interfaceMap, 1);
      } else if (('extendedBy' satisfies keyof OmniObjectType) in type) {
        logger.warn(`Found '${OmniUtil.describe(type)}' which has extensions but seems not covered by the InterfaceJavaModelTransformer`);
      }
    }
  }

  private makeExtensionsInterfaces(
    type: OmniType,
    interfaceMap: Map<OmniType, OmniInterfaceType>,
    startConvertingAt = 0,
    depth = 0,
  ): void {

    if (OmniUtil.isComposition(type)) {

      if (type.kind == OmniTypeKind.INTERSECTION) {
        for (let i = startConvertingAt; i < type.types.length; i++) {
          const superType = type.types[i];
          if (OmniUtil.asSuperType(superType) && superType.kind != OmniTypeKind.INTERFACE) {
            const superInterface = this.getOrCreateInterfaceType(superType, type, interfaceMap);
            type.types[i] = superInterface[0];
          }
        }
      } else {
        logger.warn(`Do something?`);
      }

    } else if (type.kind == OmniTypeKind.OBJECT || type.kind == OmniTypeKind.INTERFACE || type.kind == OmniTypeKind.ENUM) {

      if (OmniUtil.isComposition(type.extendedBy)) {
        this.makeExtensionsInterfaces(type.extendedBy, interfaceMap, depth > 0 ? 0 : startConvertingAt, depth + 1);
      }

    } else {
      logger.warn(`Found '${OmniUtil.describe(type)}' which we do not know how to check and/or translate itself or its extension(s) into interfaces`);
    }
  }

  private getOrCreateInterfaceType(
    type: NotInterface,
    originator: OmniType,
    interfaceMap: Map<OmniType, OmniInterfaceType>,
  ): [OmniInterfaceType, 'existed' | 'new'] {

    const existing = interfaceMap.get(type);
    if (existing) {
      return [existing, 'existed'];
    }

    const interfaceType: OmniInterfaceType = {
      kind: OmniTypeKind.INTERFACE,
      of: type,
      debug: `Created because '${OmniUtil.describe(type)}' is needed as interface (originator: ${OmniUtil.describe(originator)})`,
    };

    this.addInterfaceToOriginalType(type, interfaceType);

    interfaceMap.set(type, interfaceType);
    return [interfaceType, 'new'];
  }

  private addInterfaceToOriginalType(type: OmniType, interfaceType: OmniInterfaceType): void {

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      throw new Error(`Do not know how to handle interface modification of external reference types`);
    } else if ('extendedBy' in type || type.kind == OmniTypeKind.OBJECT) {

      if (type.extendedBy) {

        // There already exist an extension, so we need to add to it.
        if (type.extendedBy.kind == OmniTypeKind.INTERSECTION) {

          // It is already an AND, that makes it a bit easy.
          type.extendedBy.types.push(interfaceType);

        } else {

          // It is not extended by a composition, or a composition that is not AND, so we will make it one.
          const originalExtension = type.extendedBy;
          type.extendedBy = {
            kind: OmniTypeKind.INTERSECTION,
            types: [
              originalExtension,
              interfaceType,
            ],
          };
        }

      } else {

        // There is no other extension, so we just add this.
        type.extendedBy = interfaceType;
      }
    }
  }
}
