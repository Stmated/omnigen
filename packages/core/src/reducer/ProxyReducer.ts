import {Arrayable} from '@omnigen/api';
import {ObjectPool} from '../util/ObjectPool.ts';
import {ProxyHolder, ProxyHolderHandler} from './ProxyHolder.ts';
import {PROP_KEY_HOLDER, PROP_KEY_IS_PROXY, PROP_KEY_RECURSION_DEPTH} from './symbols.ts';
import {ProxyReducerDiscriminatorBuilder, ProxyReducerOptionsBuilder} from './ProxyReducerBuilder.ts';
import {ProxyReducerTrackMode} from './proxyReducerTrackMode.ts';
import {NextRet, ProxyReducerInterface, ReduceRet, Spec, SpecFn, SpecRet} from './types.ts';
import {ReducerOpt} from './ReducerOpt.ts';
import {ProxyReducerTrackingSource} from './ProxyReducerTrackingSource.ts';

const MAP_POOL = new ObjectPool<Map<any, any>>({
  factory: () => new Map<any, any>(),
  reset: v => v.clear(),
  capacity: 10,
});
const DUMMY: Readonly<object> = {};

const PROXY_POOL = new ObjectPool<ProxyHolder>({
  factory: () => {
    const holder = {
      original: DUMMY,
      target: DUMMY,
      replacements: [],
      refCount: 0,
      recursionDepth: 0,
    } as Omit<ProxyHolder, 'proxy'>;
    const strongHolder = (holder as ProxyHolder);

    strongHolder.proxy = new Proxy<any>(DUMMY, new ProxyHolderHandler(holder as any));

    return strongHolder;
  },
  reset: v => {
    v.target = DUMMY;
    v.original = DUMMY;
    v.replacements.length = 0;
    v.refCount = 0;
    v.recursionDepth = 0;
  },
  capacity: 10,
});

export interface Options<N, D extends keyof N, O, InOpt extends ReducerOpt> {
  readonly discriminator: D;
  readonly specs: ReadonlyArray<Spec<N, D, O, InOpt>>;
  readonly reducerId: number;
  readonly track: ProxyReducerTrackMode;

  /**
   * **WARNING**: Only set if you are writing test cases or for some inexplicable reason want to run in isolation.
   * It **will** be confusing if different things could have same ID.
   */
  readonly trackingStatsSource: ProxyReducerTrackingSource;
  readonly immutable: boolean;
}


/**
 * Unique ID of this object, a new one will be set after each generation.
 */
const PROP_KEY_ID = Symbol('ID');
/**
 * How many changes this object has gone through.
 */
const PROP_KEY_GENERATION = Symbol('Generation');
/**
 * ID of the reducer that created the change to the given object.
 */
const PROP_KEY_REDUCER_ID = Symbol('ReducerID');


/**
 * A reducer which can transform an object structure, and uses proxies to safeguard against recursive access.
 *
 * If you do not do any transformation/change to any property, then the original object will be kept. The object graph will not be resolved/flattened unless you change something.
 *
 * WARNING! BETA!
 *
 * TODO: Redo! Rethink! Remove the map and ONLY work the recursive protection!
 *        Perhaps if things are recursive, we return a NEW proxy that ONLY serves as a marker, and should be replaced after it has been reconstructed!
 *        Could we perhaps use some kind of FILO stack/queue first, to work through as much as possible of the tree before we try to solve the recursive parts?
 *        It is NOT GOOD that we keep track of every `original -> reduced` since each unique location might want to return a unique variation. Should be up to use-site if things are cached!
 */
export class ProxyReducer<N, const D extends keyof N, O, const Opt extends ReducerOpt> implements ProxyReducerInterface<N, D, O, Opt> {

  public static builder<N, O>(): ProxyReducerDiscriminatorBuilder<N, O> {

    return {
      discriminator: d => {
        return new ProxyReducerOptionsBuilder(d, {});
      },
    };
  }

  public readonly options: Options<N, D, O, Opt> & Opt;

  /**
   * TODO: This should be removed and replaced by a simple number `_depth`!
   *        Currently there seems to be a bug with how we match and use the found proxy from `_trackedMap`
   *
   * @deprecated Remove and instead make `_trackedMap` handling better
   */
  private readonly _visited: ProxyHolder[] = [];
  private _trackedMap: Map<any, any> | undefined;

  public constructor(options: Options<N, D, O, Opt> & Opt) {
    this.options = options;
  }

  get depth(): number {

    // If `visited` is ever not used, then we need to have a depth counter inside the reducer instead
    return this._visited.length - 1;
  }

  public reduce<FN extends N>(original: FN): ReduceRet<FN, D, O, Opt> {

    if (!this._trackedMap) {
      this._trackedMap = MAP_POOL.take();
    }

    try {
      const result = this.next(original);
      if (result === null) {
        return undefined as ReduceRet<FN, D, O, Opt>;
      } else {
        return result as ReduceRet<FN, D, O, Opt>;
      }
    } finally {
      MAP_POOL.release(this._trackedMap!);
      this._trackedMap = undefined;
    }
  }

  public next<FN extends N>(original: FN): NextRet<FN, D, O, Opt> {

    const ongoing = this._visited.find(it => it.original === original);
    if (ongoing) {
      return ongoing.proxy;
    }

    const tracked = this._trackedMap!.get(original);
    if (tracked) {
      const holder = tracked[PROP_KEY_HOLDER];
      if (holder) {
        return (holder as ProxyHolder).proxy;
      } else {
        return tracked;
      }
    }

    let proxyHolder: ProxyHolder;
    let recursionDepth: number;
    if (ProxyReducer.isProxy(original)) {
      proxyHolder = (original as any)[PROP_KEY_HOLDER];
      proxyHolder.proxy[PROP_KEY_RECURSION_DEPTH] = recursionDepth = (proxyHolder.proxy[PROP_KEY_RECURSION_DEPTH] ?? 0) + 1;
    } else {
      proxyHolder = PROXY_POOL.take();
      proxyHolder.target = proxyHolder.original = original;
      recursionDepth = 0;

      this._visited.push(proxyHolder);
      this._trackedMap!.set(proxyHolder.original, proxyHolder);
      proxyHolder.refCount++;
    }

    let discriminator = proxyHolder.proxy[this.options.discriminator];
    for (let i = recursionDepth; i < this.options.specs.length; i++) {

      let fn: SpecFn<N, FN, D, O, Opt> | undefined = (this.options.specs[i] as any)[discriminator];
      if (!fn) {
        fn = (this.options.specs[i] as any)[`true`];
        if (!fn) {
          continue;
        }
      }

      const mappedReturned = fn(proxyHolder.proxy, this);
      if (mappedReturned === null) {

        if (recursionDepth === 0) {
          this._trackedMap!.set(proxyHolder.original, undefined);
          return undefined as NextRet<FN, D, O, Opt>;
        } else {
          throw new Error(`Cannot remove if we are recursive. Figure out a way to make this a legal move`);
        }

      } else if (mappedReturned !== undefined && mappedReturned !== proxyHolder.proxy) {
        proxyHolder.target = mappedReturned;
        const newDiscriminator = proxyHolder.proxy[this.options.discriminator];
        if (newDiscriminator && newDiscriminator !== discriminator) {

          // If discriminator has changed (which might happen if we return a new object), then we restart reduction.
          discriminator = newDiscriminator;
          i = -1;
          continue;
        }
      }

      // We always break out if we've found a spec function.
      break;
    }

    const finalReduced = proxyHolder.target as SpecRet<FN, D, O, Opt>;

    if (recursionDepth > 1) {
      proxyHolder.target[PROP_KEY_RECURSION_DEPTH]--;
    } else if (recursionDepth != 1) {

      // Object is now completely reduced, since it is no longer inside any recursion.
      this._trackedMap!.set(proxyHolder.original, finalReduced);

      if (proxyHolder.replacements.length > 0) { // TODO: Move this into the  `refCount === 0` part?
        for (const replacement of proxyHolder.replacements) {
          if (replacement.index !== undefined) {
            // TODO: This can be improved by giving back a proxy of the array instead of needing to create a new array for every replacement assignment.
            const existingArray: Array<any> = replacement.holder.proxy[replacement.property];
            replacement.holder.proxy[replacement.property] = existingArray.toSpliced(replacement.index, 1, finalReduced);
          } else {
            replacement.holder.proxy[replacement.property] = finalReduced;
          }

          replacement.holder.refCount--;
          if (replacement.holder.refCount === 0) {
            PROXY_POOL.release(replacement.holder);
          }
        } proxyHolder.replacements.length = 0;
      }

      if (proxyHolder.original !== proxyHolder.target && this.options.track !== ProxyReducerTrackMode.NONE) {
        this.addTracking(proxyHolder);
      }

      proxyHolder.refCount--;
      if (proxyHolder.refCount === 0) {
        PROXY_POOL.release(proxyHolder);
      }

      this._visited.pop();
      // if (this._visited.length == 0) {
      //
      // }
    }

    return finalReduced as NextRet<FN, D, O, Opt>;
  }

  private addTracking(proxyHolder: ProxyHolder) {

    proxyHolder.target[PROP_KEY_ID] = ++this.options.trackingStatsSource.idCounter;
    proxyHolder.target[PROP_KEY_GENERATION] = (proxyHolder.target[PROP_KEY_GENERATION] ?? 0) + 1;

    if (this.options.track === ProxyReducerTrackMode.LAST) {
      proxyHolder.target[PROP_KEY_REDUCER_ID] = this.options.reducerId;
    } else {
      const existing = proxyHolder.target[PROP_KEY_REDUCER_ID];
      if (existing) {
        if (Array.isArray(existing)) {
          if (existing[existing.length - 1] !== this.options.reducerId) {
            existing.push(this.options.reducerId);
          }
        } else if (this.options.reducerId !== existing) {
          proxyHolder.target[PROP_KEY_REDUCER_ID] = [existing, this.options.reducerId];
        }
      } else {
        proxyHolder.target[PROP_KEY_REDUCER_ID] = [this.options.reducerId];
      }
    }
  }

  /**
   * @see PROP_KEY_ID
   */
  public static getId(obj: any): number | undefined {
    return obj[PROP_KEY_ID];
  }

  /**
   * @see PROP_KEY_GENERATION
   */
  public static getGeneration(obj: any): number | undefined {
    return obj[PROP_KEY_GENERATION];
  }

  /**
   * @see PROP_KEY_REDUCER_ID
   */
  public static getReducerId(obj: any): Arrayable<number> | undefined {
    return obj[PROP_KEY_REDUCER_ID];
  }

  public static getOriginal<T extends object>(obj: T): T {
    const holder = (obj as any)[PROP_KEY_HOLDER];
    if (holder) {
      return (holder as ProxyHolder).original;
    } else {
      return obj;
    }
  }

  public static getTarget<T extends object>(obj: T): T {
    const holder = (obj as any)[PROP_KEY_HOLDER];
    if (holder) {
      return (holder as ProxyHolder).target;
    } else {
      return obj;
    }
  }

  public static isProxy(obj: any): boolean {
    if (!obj) {
      return false;
    }
    return !!obj[PROP_KEY_IS_PROXY];
  }
}
