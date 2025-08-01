import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniObjectType, OmniProperty, OmniTypeKind} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil';
import {LoggerFactory} from '@omnigen/core-log';
import {ProxyReducerOmni2} from '../../reducer2/ProxyReducerOmni2';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Transforms Objects that extends/implements Interfaces so that either:
 * - Any missing properties are added to the Object,
 * - or Object is made abstract
 */
export class AlignObjectWithInterfaceModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    const visitor = ProxyReducerOmni2.builder().options({immutable: false}).build({
      OBJECT: (_, r) => {
        const reduced = r.yieldBase();
        if (reduced && reduced.kind === OmniTypeKind.OBJECT) {
          const unimplementedProperties = this.collectUnimplementedPropertiesFromInterfaces(reduced);
          if (unimplementedProperties.length > 0) {

            // TODO: Add option for if we should make object abstract or actually add the property to the object

            r.put('debug', OmniUtil.addDebug(reduced.debug, `Adding unimplemented interface properties ${unimplementedProperties.map(it => it.name).join(', ')}`));
            r.put('properties', [
              ...reduced.properties,
              ...unimplementedProperties.map(it => OmniUtil.addDebugTo(it, `Property added to Object to align with Interface`)),
            ]);
          }
        }
      },
    });

    args.model = visitor.reduce(args.model);
  }

  private collectUnimplementedPropertiesFromInterfaces(objectType: OmniObjectType): OmniProperty[] {

    const properties: OmniProperty[] = [];

    ProxyReducerOmni2.builder().options({immutable: true}).build({
      OBJECT: (_, r) => {
        if (r.depth === 0) {
          r.callBase();
        }
      },
      INTERFACE: (n, r) => {
        r.callBase();
        if (n.of !== objectType) {
          for (const interfaceProperty of OmniUtil.getPropertiesOf(n.of)) {
            if (objectType.properties.find(it => OmniUtil.isPropertyNameEqual(it.name, interfaceProperty.name))) {
              logger.debug(`Skipping interface property '${OmniUtil.getPropertyName(interfaceProperty.name, true)}' since it already exists on '${OmniUtil.describe(objectType)}'`);
              continue;
            }

            properties.push(interfaceProperty);
          }
        }
      },
      EXCLUSIVE_UNION: n => n,
    }).reduce(objectType);

    return properties;
  }
}
