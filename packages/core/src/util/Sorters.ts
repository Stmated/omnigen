import {OmniModel, OmniType} from '../parse/OmniModel.js';
import {OmniUtil} from '../parse/OmniUtil.js';

export class Sorters {

  public static byDependencies(_model: OmniModel): {(a: OmniType, b: OmniType): number} {

    // TODO: Could this be cached and re-used between different sorts? Cache inside the OmniModel?
    const typeCache = new Map<OmniType, OmniType[]>();

    return (a, b) => {

      let aDependencies = typeCache.get(a);
      if (!aDependencies) {
        const dependencies: OmniType[] = [];
        OmniUtil.visitTypesBreadthFirst(a, ctx => {
          dependencies.push(ctx.type);
        });
        aDependencies = dependencies;
      }

      let bDependencies = typeCache.get(b);
      if (!bDependencies) {
        const dependencies: OmniType[] = [];
        OmniUtil.visitTypesBreadthFirst(b, ctx => {
          dependencies.push(ctx.type);
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
