import {ObjectPool} from '../util/ObjectPool.ts';
import {Environment} from '@omnigen/api';
import {
  ANY,
  EqualityResult,
  IncomingReducerOptions,
  OmniReducerFn,
  Placeholder,
  PROP_KEY_GENERATION,
  PROP_KEY_ID,
  PROP_KEY_RECURSIVE_ORIGINAL,
  PROP_KEY_RECURSIVE_USE_COUNT,
  Reducer,
  ReducerArgs,
  ReducerOptions,
  ReducerSpec,
  ReducerSpecObject,
  Ret,
} from './Reducer.ts';

const PLACEHOLDER_POOL = new ObjectPool<Placeholder<any>>({
  factory: () => ({[PROP_KEY_RECURSIVE_USE_COUNT]: 0}),
  reset: v => {
    delete v[PROP_KEY_RECURSIVE_ORIGINAL];
    v[PROP_KEY_RECURSIVE_USE_COUNT] = 0;
  },
  capacity: 10,
});
const LIST_POOL = new ObjectPool<unknown[]>({
  factory: () => [],
  reset: v => (v.length = 0),
  capacity: 10,
});

/**
 * TODO: Implement a "next" on the given `args` -- so can easy "call parent" when you do not want to handle it.
 * TODO: Add support for property reducing -- right now can set them but we never call them
 * TODO: Add support for using proxies for updating objects, lazily cloning once a value is changed
 * TODO: Improve the generics, using less `as` casts
 * TODO: Add support for the placeholder being a Proxy, which transparently handles in-creation objects
 */
export abstract class ReducerBase<N extends object, D extends keyof N, O> implements Reducer<N, D, O> {

  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static _ID_COUNTER: number = 0;

  private readonly _reducers: Array<Partial<ReducerSpec<N, D, O>>>;
  private readonly _reduced = new Map<N, Ret<N, D, O> | Placeholder<N> | null>();
  private readonly _args: ReducerArgs<N, D, O>;
  private readonly _any: OmniReducerFn<N, N, D, O> | undefined;
  private readonly _options: ReducerOptions<N, D, O>;

  protected constructor(options: IncomingReducerOptions<N, D, O>, base: ReducerSpec<N, D, O>) {

    const baseOptions = ('reducer' satisfies keyof ReducerOptions<N, D, O>) in options
      ? options
      : {reducer: options} satisfies ReducerOptions<N, D, O>;

    this._options = {
      ...baseOptions,
      track: baseOptions.track ?? Environment.test,
    };

    this._reducers = Array.isArray(this._options.reducer)
      ? [...this._options.reducer, base]
      : [this._options.reducer, base];

    this._any = this._reducers.find(it => it[ANY])?.[ANY];

    this._args = {
      dispatcher: this,
      base: base,
    };
  }

  protected abstract getDiscriminator<FN extends N>(obj: FN): FN[D];

  public reduce<FN extends N>(original: FN): Ret<FN, D, O> {

    const alreadyReduced = this._reduced.get(original);
    if (alreadyReduced !== undefined) {
      if (alreadyReduced && typeof alreadyReduced === 'object' && PROP_KEY_RECURSIVE_USE_COUNT in alreadyReduced) {
        (alreadyReduced as unknown as Placeholder<FN>)[PROP_KEY_RECURSIVE_USE_COUNT]++;
      }

      return (alreadyReduced ?? undefined) as Ret<FN, D, O>;
    }

    let placeholder: Placeholder<FN> | undefined;
    if (typeof original === 'object') {
      placeholder = PLACEHOLDER_POOL.take();
      placeholder[PROP_KEY_RECURSIVE_ORIGINAL] = original;
      this._reduced.set(original, placeholder);
    } else {
      placeholder = undefined;
    }

    // NOTE: This section's types are not sound, it is one big hack.
    let reduced: Ret<FN, D, O>;
    const anyReduced = this._any?.(original, this._args);
    if (anyReduced === undefined) {
      const discriminator = this.getDiscriminator(original);
      const r = this._reducers.find(it => (it as any)[discriminator]);
      const fn = ((r as any)?.[discriminator]) as ReducerSpecObject<N, FN, D, O>;
      const fnReduced = fn(original as any, this._args);
      if (placeholder) {
        reduced = this.updatePlaceholder(fnReduced, placeholder);
      } else {
        reduced = fnReduced;
      }
    } else {
      // NOTE: This is likely not valid/sound/true, and needs better handling.
      reduced = anyReduced as Ret<FN, D, O>;
    }

    this._reduced.set(original, reduced ?? null);

    const visitedList = LIST_POOL.take();
    const res = this.isEqual(reduced, original, 0, this._reduced, visitedList);
    LIST_POOL.release(visitedList);

    if (res === true) {

      // Nothing changed, so we can just keep using the original node.
      const sameOriginal = original as Ret<FN, D, O>;
      reduced = sameOriginal;
      this._reduced.set(original, sameOriginal);
    } else if (typeof reduced === 'object') {
      if (this._options.track) {
        if ((reduced as any)[PROP_KEY_ID] === undefined) {
          (reduced as any)[PROP_KEY_ID] = ReducerBase._ID_COUNTER++;
        }
        (reduced as any)[PROP_KEY_GENERATION] = ((reduced as any)[PROP_KEY_GENERATION] ?? 0) + 1;
      }
    }

    return reduced;
  }

  private updatePlaceholder<FN extends N>(reduced: Ret<FN, D, O>, placeholder: Placeholder<FN>): Ret<FN, D, O> {

    if (placeholder[PROP_KEY_RECURSIVE_USE_COUNT] > 0) {

      // The empty type has been used, so we need to update it/turn it into the actual node.
      delete (placeholder as any)[PROP_KEY_RECURSIVE_USE_COUNT];
      delete placeholder[PROP_KEY_RECURSIVE_ORIGINAL];

      Object.assign(placeholder, reduced);
      reduced = placeholder as unknown as typeof reduced;

      PLACEHOLDER_POOL.forget(placeholder);
    } else {
      PLACEHOLDER_POOL.release(placeholder);
    }

    return reduced;
  }

  private isEqual<Reduced, Original>(
    reduced: Reduced,
    original: Original,
    objDepth: number,
    replacer: Map<N, unknown> | undefined,
    visited: Original[],
  ): EqualityResult {

    if (typeof original === 'object') {
      if (visited.includes(original)) {
        return undefined;
      }

      visited.push(original);
    }

    if (Object.is(reduced, original)) {
      return true;
    } else if (typeof reduced !== typeof original) {
      return false;
    }

    if (reduced && original && typeof reduced === 'object' && typeof original === 'object') {

      if (PROP_KEY_RECURSIVE_ORIGINAL in reduced && reduced[PROP_KEY_RECURSIVE_ORIGINAL] === original) {
        return undefined;
      }

      if (objDepth <= 1 && Array.isArray(reduced) && Array.isArray(original)) {
        const length = reduced.length;
        if (length !== original.length) {
          return false;
        }

        let i: number;
        for (i = length; i-- !== 0;) {
          const aItem = reduced[i];
          if (this.isEqual(aItem, original[i], objDepth, replacer, visited) === false) {
            return false;
          }
        }

        return true;
      }

      if (objDepth === 0) {
        const aKeys = Object.keys(reduced);
        const length = aKeys.length;
        if (length !== Object.keys(original).length) {
          return false;
        }

        let i: number;
        for (i = length; i-- !== 0;) {
          if (!Object.prototype.hasOwnProperty.call(original, aKeys[i])) {
            return false;
          }
        }

        for (i = length; i-- !== 0;) {
          const key = aKeys[i];
          const reducedProperty = (reduced as any)[key];
          const originalProperty = (original as any)[key];
          const localNewDepth = Array.isArray(reducedProperty) ? objDepth : objDepth + 1;
          if (this.isEqual(reducedProperty, originalProperty, localNewDepth, replacer, visited) === false) {
            return false;
          }
        }

        return true;
      }
    }

    // @ts-ignore
    return (reduced == original);
  }
}
