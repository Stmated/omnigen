import {Arrayable, Environment, Writeable} from '@omnigen/api';
import {ObjectPool} from '../util/ObjectPool.ts';

export const KEY_IS_PROXY = Symbol('Is-Proxy');
export const KEY_HOLDER = Symbol('Holder');
export const KEY_RECURSION_DEPTH = Symbol('Recursion');

export const PROP_KEY_ID = Symbol('ID');
export const PROP_KEY_GENERATION = Symbol('Generation');
export const PROP_KEY_RUN = Symbol('Run');

export const REDUCE_ANY = Symbol('Receiver of all');

type Ret<FN extends object, D extends keyof FN, O>
  = FN | (FN[D] extends keyof O ? O[FN[D]] : (FN | undefined))
  ;

export interface ProxyReducerArgs<N extends object, D extends keyof N, O> {
  reducer: ProxyReducer<N, D, O>,
}

export type ProxyReducerFn<N extends object, FN extends N, D extends keyof N, O> = (node: Writeable<FN>, args: ProxyReducerArgs<N, D, O>) => void | Ret<FN, D, O>;
export type ProxyReducerSpecObject<N extends object, FN extends N, D extends keyof N, O> = ProxyReducerFn<N, FN, D, O>;
export type ProxyReducerSpecObjects<N extends object, D extends keyof N, O> = { [K in N[D] & string]?: ProxyReducerSpecObject<N, Extract<N, Record<D, K>>, D, O> };
export type ProxyReducerSpecAny<N extends object, D extends keyof N, O> = { [REDUCE_ANY]?: ProxyReducerFn<N, N, D, O> };
export type ProxyReducerSpec<N extends object, D extends keyof N, O> = ProxyReducerSpecObjects<N, D, O> & ProxyReducerSpecAny<N, D, O>;

interface ProxyReplacement {
  holder: ProxyHolder;
  property: PropertyKey;
  index?: number;
}

interface ProxyHolder {
  proxy: any;
  original: any;
  target: any;
  replacements: ProxyReplacement[];
  refCount: number;
  recursionDepth: number;
}

const isEqual = (a: unknown, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    const length = a.length;
    if (length !== b.length) return false;
    for (let i = length; i-- !== 0;) {
      if (!isEqual(a[i], b[i])) return false;
    }

    return true;
  } else {

    const vHolder = b[KEY_HOLDER] as ProxyHolder;
    if (vHolder && isEqual(a, vHolder.target)) {
      return true;
    }
  }

  return false;
};

class ReducerProxyHandler<T extends object> implements ProxyHandler<T> {

  private readonly holder: ProxyHolder;

  constructor(holder: ProxyHolder) {
    this.holder = holder;
  }

  get(_: T, p: string | symbol): any {
    if (p === KEY_IS_PROXY) {
      return true;
    } else if (p === KEY_HOLDER) {
      return this.holder;
    } else if (p === KEY_RECURSION_DEPTH) {
      return this.holder.recursionDepth;
    }
    return (this.holder.target as any)[p];
  }

  set(_: T, p: string | symbol, v: any): boolean {
    if (isEqual(this.holder.target[p], v)) {
      return true;
    }

    if (p === KEY_RECURSION_DEPTH) {
      this.holder.recursionDepth = v;
      return true;
    }

    if (this.holder.target === this.holder.original) {
      this.holder.target = {...this.holder.target};
    }

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const item = v[i];
        if (item[KEY_IS_PROXY]) {
          const itemHolder = item[KEY_HOLDER] as ProxyHolder;
          this.holder.refCount++;
          itemHolder.replacements.push({
            holder: this.holder,
            property: p,
            index: i,
          });
        }
      }

    } else {
      if (v[KEY_IS_PROXY]) {
        const vHolder = v[KEY_HOLDER] as ProxyHolder;
        this.holder.refCount++;
        vHolder.replacements.push({
          holder: this.holder,
          property: p,
        });
      }
    }

    this.holder.target[p] = v;
    return true;
  }

  deleteProperty(_: T, p: string | symbol): boolean {
    if (this.holder.target && typeof this.holder.target === 'object' && p in this.holder.target) {
      if (this.holder.target === this.holder.original) {
        this.holder.target = {...this.holder.target};
      }

      delete this.holder.target[p];
      return true;
    }

    return false;
  }

  has(_: T, p: string | symbol): boolean {
    return Reflect.has(this.holder.target, p);
  }

  ownKeys(_: T): ArrayLike<string | symbol> {
    return Reflect.ownKeys(this.holder.target);
  }

  getOwnPropertyDescriptor(_: T, p: string | symbol): PropertyDescriptor | undefined {
    return Object.getOwnPropertyDescriptor(this.holder.target, p);
  }

  defineProperty(_: T, p: string | symbol, attr: PropertyDescriptor): boolean {
    Object.defineProperty(this.holder.target, p, attr);
    return true;
  }
}

const DUMMY: Readonly<object> = Object.freeze({});

const createProxyHolder = (): ProxyHolder => {

  const holder = {
    original: DUMMY,
    target: DUMMY,
    replacements: [],
    refCount: 0,
    recursionDepth: 0,
  } as Omit<ProxyHolder, 'proxy'>;
  const strongHolder = (holder as ProxyHolder);

  strongHolder.proxy = new Proxy<any>(DUMMY, new ReducerProxyHandler(holder as any));

  return strongHolder;
};

export const PROXY_POOL = new ObjectPool<ProxyHolder>({
  factory: () => createProxyHolder(),
  reset: v => {
    v.target = DUMMY;
    v.original = DUMMY;
    v.replacements.length = 0;
    v.refCount = 0;
    v.recursionDepth = 0;
  },
  capacity: 10,
});

export const MAP_POOL = new ObjectPool<Map<any, any>>({
  factory: () => new Map<any, any>(),
  reset: v => v.clear(),
  capacity: 10,
});

interface Options<N extends object, D extends keyof N, O> {
  readonly discriminator: D;
  readonly reducers: Array<ProxyReducerSpec<N, D, O>>;
  debug: boolean;
  track: boolean;
  runId: number;
}

export type ProxyReducerSpecs<N extends object, D extends keyof N, O> = Arrayable<ProxyReducerSpec<N, D, O>>;
export type ProxyReducerOptions<N extends object, D extends keyof N, O> = Partial<Omit<Options<N, D, O>, 'runId'>>;

export type ProxyReducerFactory<N extends object, D extends keyof N, O> = (
  specs: ProxyReducerSpecs<N, D, O>,
  options?: ProxyReducerOptions<N, D, O>,
) => ProxyReducer<N, D, O>;

/**
 * A reducer which can transform an object structure, and uses proxies to safeguard against recursive access.
 *
 * If you do not do any transformation/change to any property, then the original object will be kept. The object graph will not be resolved/flattened unless you change something.
 *
 * WARNING! BETA!
 */
export class ProxyReducer<N extends object, const D extends keyof N, O> {

  public static createFactory<N extends object, D extends keyof N, O = {}>(discriminator: D, fallback?: ProxyReducerSpec<N, D, O>): ProxyReducerFactory<N, D, O> {
    return (reducers, options) => {

      let actualReducers: Array<ProxyReducerSpec<N, D, O>>;
      if (Array.isArray(reducers)) {
        if (fallback) {
          if (reducers.includes(fallback)) {
            actualReducers = reducers;
          } else {
            actualReducers = [...reducers, fallback];
          }
        } else {
          actualReducers = reducers;
        }
      } else {
        actualReducers = fallback ? [reducers, fallback] : [reducers];
      }

      return new ProxyReducer<N, D, O>({
        ...options,
        debug: options?.debug ?? (Environment.test && Environment.debug),
        track: options?.track ?? true,
        runId: ++ProxyReducer._instanceCounter,
        reducers: actualReducers,
        discriminator: discriminator,
      });
    };
  }

  private static _instanceCounter = 0;
  private static _id = 0;

  private readonly _options: Required<Options<N, D, O>>;
  private readonly _visited: ProxyHolder[] = [];
  private readonly _args: ProxyReducerArgs<N, D, O>;
  private readonly _any: ProxyReducerFn<N, N, D, O> | undefined;
  private _trackedMap: Map<any, any> | undefined;

  public get options() {
    return this._options;
  }

  public constructor(options: Options<N, D, O>) {

    this._options = options;
    this._any = this._options.reducers.find(it => it[REDUCE_ANY])?.[REDUCE_ANY];

    this._args = {
      reducer: this,
    };
  }

  public reduce<FN extends N>(original: FN): Ret<FN, D, O> {

    const ongoing = this._visited.find(it => it.original === original);
    if (ongoing) {
      return ongoing.proxy;
    }

    if (this._options.track) {

      if (!this._trackedMap) {
        this._trackedMap = MAP_POOL.take();
      }

      const tracked = this._trackedMap.get(original);
      if (tracked) {
        const holder = tracked[KEY_HOLDER];
        if (holder) {
          return (holder as ProxyHolder).proxy;
        } else {
          return tracked;
        }
      }
    }

    let proxyHolder: ProxyHolder;
    let recursionDepth: number;
    if ((original as any)[KEY_IS_PROXY]) {
      proxyHolder = (original as any)[KEY_HOLDER];
      proxyHolder.proxy[KEY_RECURSION_DEPTH] = recursionDepth = (proxyHolder.proxy[KEY_RECURSION_DEPTH] ?? 0) + 1;
    } else {
      proxyHolder = PROXY_POOL.take();
      proxyHolder.target = proxyHolder.original = original;
      recursionDepth = 0;

      this._visited.push(proxyHolder);
      this._trackedMap!.set(proxyHolder.original, proxyHolder);
      proxyHolder.refCount++;
    }

    const proxy = proxyHolder.proxy as any;

    // NOTE: This section's types are not sound, it is one big hack.
    const anyReturned = this._any?.(proxy, this._args);
    if (anyReturned !== undefined) {
      // NOTE: This is likely not valid/sound/true, and needs better handling.
      proxyHolder.target = anyReturned;
    }

    let discriminator = proxy[this._options.discriminator];
    for (let i = recursionDepth; i < this._options.reducers.length; i++) {
      const r = (this._options.reducers[i] as any)[discriminator];
      if (r) {
        const mappedReturned = r(proxy, this._args);
        if (mappedReturned !== undefined && mappedReturned !== proxy) {
          proxyHolder.target = mappedReturned;
          const newDiscriminator = proxy[this._options.discriminator];
          if (newDiscriminator && newDiscriminator !== discriminator) {
            discriminator = newDiscriminator;
            i = -1;
          }
        } else {
          break;
        }
      }
    }

    const finalReduced = proxyHolder.target as Ret<FN, D, O>;

    if (this._options.track) {
      this._trackedMap!.set(proxyHolder.original, finalReduced);
    }

    if (recursionDepth > 1) {
      proxyHolder.target[KEY_RECURSION_DEPTH]--;
    } else if (recursionDepth != 1) {

      if (this._options.debug && proxyHolder.original !== proxyHolder.target) {
        proxyHolder.target[PROP_KEY_GENERATION] = (proxyHolder.target[PROP_KEY_GENERATION] ?? 0) + 1;
        proxyHolder.target[PROP_KEY_ID] = ProxyReducer._id++;
        proxyHolder.target[PROP_KEY_RUN] = this._options.runId;
      }

      if (proxyHolder.replacements.length > 0) {
        for (const replacement of proxyHolder.replacements) {
          if (replacement.index !== undefined) {
            replacement.holder.proxy[replacement.property][replacement.index] = finalReduced;
          } else {
            replacement.holder.proxy[replacement.property] = finalReduced;
          }

          replacement.holder.refCount--;
          if (replacement.holder.refCount === 0) {
            PROXY_POOL.release(replacement.holder);
          }
        }
      }

      proxyHolder.refCount--;
      if (proxyHolder.refCount === 0) {
        PROXY_POOL.release(proxyHolder);
      }

      this._visited.pop();
      if (this._visited.length == 0) {
        if (!PROXY_POOL.isUnused()) {
          throw new Error(`There are still unreleased proxy holders after the reducer has finished. Something is wrong with the recursive visiting.`);
        }

        MAP_POOL.release(this._trackedMap!);
        this._trackedMap = undefined;
      }
    }

    return finalReduced;
  }
}
