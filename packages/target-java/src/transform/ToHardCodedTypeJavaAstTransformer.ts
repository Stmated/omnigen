import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {JavaReducer} from '../reduce';
import {OmniTypeKind, UnknownKind} from '@omnigen/core';
import {Java, JavaAstUtils} from '../';
import {assertDefined} from '@omnigen/core-util';

export class ToHardCodedTypeJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const reducer: JavaReducer = {
      ...defaultReducer,
      ...{
        reduceWildcardType: n => {
          const className = this.getUnknownClassName(n.omniType.unknownKind ?? args.options.unknownType);
          return new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: className}, n.implementation);
        },
        reduceGenericType: (n, r) => {
          return defaultReducer.reduceGenericType(n, r);
        },
        reduceEdgeType: (n, r) => {

          if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

            const type = n.omniType;
            const mapClassOrInterface = n.implementation ? 'HashMap' : 'Map';
            const mapClass = `java.util.${mapClassOrInterface}`;
            const mapType = new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
            const keyType = assertDefined(JavaAstUtils.createTypeNode(type.keyType, true).reduce(r));
            const valueType = assertDefined(JavaAstUtils.createTypeNode(type.valueType, true).reduce(r));

            return new Java.GenericType(type, mapType, [keyType, valueType]);

          } else {
            return defaultReducer.reduceEdgeType(n, r);
          }
        },
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }

  private getUnknownClassName(unknownKind: UnknownKind): string {

    switch (unknownKind) {
      case UnknownKind.MUTABLE_OBJECT:
        // NOTE: Should probably be a map instead. But additionalProperties becomes `Map<String, Map<String, Object>>` which is a bit weird.
        return 'java.lang.Object';
      case UnknownKind.MAP:
        return 'java.util.Map<String, Object>';
      case UnknownKind.OBJECT:
        return 'java.lang.Object';
      case UnknownKind.WILDCARD:
        return '?';
    }
  }
}
