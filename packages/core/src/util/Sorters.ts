import {OmniModel, OmniType} from '@omnigen/api';
import {OmniUtil} from '../parse';
import {ProxyReducerOmni2} from '../reducer2/ProxyReducerOmni2.ts';
import {ANY_KIND} from '../reducer2/types.ts';

export class Sorters {

  public static byDependencies(_model: OmniModel): { (a: OmniType, b: OmniType): number } {

    // TODO: Could this be cached and re-used between different sorts? Cache inside the OmniModel?
    const typeCache = new Map<OmniType, OmniType[]>();

    return (a, b) => {

      let aDependencies = typeCache.get(a);
      if (!aDependencies) {
        const dependencies: OmniType[] = [];
        ProxyReducerOmni2.builder().reduce(a, {immutable: true}, {
          [ANY_KIND]: (n, r) => {
            if (n !== a && OmniUtil.isType(n)) {
              dependencies.push(n);
            }
            r.callBase();
          },
        });
        aDependencies = dependencies;
      }

      let bDependencies = typeCache.get(b);
      if (!bDependencies) {
        const dependencies: OmniType[] = [];
        ProxyReducerOmni2.builder().reduce(b, {immutable: true}, {
          [ANY_KIND]: (n, r) => {
            if (n !== b && OmniUtil.isType(n)) {
              dependencies.push(n);
            }
            r.callBase();
          },
        });
        bDependencies = dependencies;
      }

      if (aDependencies.includes(b)) {
        // If A uses type B, then type B should be placed first.
        return 1;
      } else if (bDependencies.includes(a)) {
        // If B uses type A, then type A should be placed first.
        return -1;
      }

      return 0;
    };
  }
}
