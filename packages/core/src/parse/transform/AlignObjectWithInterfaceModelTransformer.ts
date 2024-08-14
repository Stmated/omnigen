import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniObjectType, OmniProperty, OmniTypeKind} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Transforms Objects that extends/implements Interfaces so that either:
 * - Any missing properties are added to the Object,
 * - or Object is made abstract
 */
export class AlignObjectWithInterfaceModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {
      if (ctx.type.kind === OmniTypeKind.OBJECT) {

        const n = ctx.type;
        const unimplementedProperties = this.collectUnimplementedPropertiesFromInterfaces(n);
        if (unimplementedProperties.length > 0) {

          // TODO: Add option for if we should make object abstract or actually add the property to the object

          n.debug = OmniUtil.addDebug(n.debug, `Adding unimplemented interface properties ${unimplementedProperties.map(it => it.name).join(', ')}`);
          n.properties = [
            ...n.properties,
            ...unimplementedProperties.map(it => ({
              ...it,
              debug: OmniUtil.addDebug(it.debug, `Property added to Object to align with Interface`),
              owner: n, // TODO: Remove the notion of `owner` someday, so we do not need to clone the property
            })),
          ];
        }
      }
    });
  }

  private collectUnimplementedPropertiesFromInterfaces(objectType: OmniObjectType): OmniProperty[] {

    const properties: OmniProperty[] = [];

    OmniUtil.visitTypesDepthFirst(objectType, ctx => {

      if (ctx.type.kind === OmniTypeKind.OBJECT) {
        if (ctx.depth > 0) {
          ctx.skip = true;
          return;
        }
      } else if (ctx.type.kind === OmniTypeKind.INTERFACE) {
        // The interface might be the interface of the calling type.
        if (ctx.type.of != objectType) {
          for (const interfaceProperty of OmniUtil.getPropertiesOf(ctx.type.of)) {
            if (objectType.properties.find(it => OmniUtil.isPropertyNameEqual(it.name, interfaceProperty.name))) {
              logger.debug(`Skipping interface property '${OmniUtil.getPropertyName(interfaceProperty.name, true)}' since it already exists on '${OmniUtil.describe(objectType)}'`);
              continue;
            }

            properties.push(interfaceProperty);
          }
        }
      } else if (ctx.type.kind == OmniTypeKind.EXCLUSIVE_UNION) {
        ctx.skip = true;
        return;
      }

      return undefined;
    });

    return properties;
  }
}
