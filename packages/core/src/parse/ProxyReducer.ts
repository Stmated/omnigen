import {Arrayable, Environment} from '@omnigen/api';
import {ObjectPool} from '../util/ObjectPool.ts';

export const PROP_KEY_RECURSIVE_USE_COUNT2 = Symbol('Use-Counter');
export const PROP_KEY_RECURSIVE_ORIGINAL2 = Symbol('Original');

export const KEY_IS_PROXY = Symbol('Is-Proxy');
export const KEY_HOLDER = Symbol('Holder');

export const PROP_KEY_ID2 = Symbol('ID');
export const PROP_KEY_GENERATION2 = Symbol('Generation');
export const REDUCE_ANY = Symbol('Receiver of all');

export type Ret2<FN extends object, D extends keyof FN, O>
  = FN | (FN[D] extends keyof O ? O[FN[D]] : (FN | undefined))
  ;

export interface ProxyReducerArgs<N extends object, D extends keyof N, O> {
  reducer: ProxyReducer<N, D, O>,
}

export type ProxyReducerFn<N extends object, FN extends N, D extends keyof N, O> = (node: FN, args: ProxyReducerArgs<N, D, O>) => void | Ret2<FN, D, O>;
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
  refs: number;
}

const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    const length = a.length;
    if (length !== b.length) return false;
    for (let i = length; i-- !== 0;) {
      if (!isEqual(a[i], b[i])) return false;
    }

    return true;
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
    }
    return (this.holder.target as any)[p];
  }

  set(_: T, p: string | symbol, v: any): boolean {
    if (isEqual(this.holder.target[p], v)) {
      return true;
    }
    if (this.holder.target === this.holder.original) {
      this.holder.target = {...this.holder.target};
    }
    if (this.holder.replacements) {
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          const item = v[i];
          if (item[KEY_IS_PROXY]) {
            const itemHolder = item[KEY_HOLDER] as ProxyHolder;
            this.holder.refs++;
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
          this.holder.refs++;
          vHolder.replacements.push({
            holder: this.holder,
            property: p,
          });
        }
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
    refs: 0,
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
    v.refs = 0;
  },
  capacity: 10,
});

export interface ProxyReducerOptions<N extends object, D extends keyof N, O> {
  readonly discriminator: D;
  readonly reducers: Array<ProxyReducerSpec<N, D, O>>;
  track?: boolean;
}

export type ProxyReducerCreator<T extends object, D extends keyof T, O>
  = (reducers: Arrayable<ProxyReducerSpec<T, D, O>>, options?: Partial<ProxyReducerOptions<T, D, O>>) => ProxyReducer<T, D, O>;

export function createProxyReducerCreator<N extends object, D extends keyof N, O = {}>(discriminator: D, fallback?: ProxyReducerSpec<N, D, O>): ProxyReducerCreator<N, D, O> {
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
      reducers: actualReducers,
      discriminator: discriminator,
    });
  };
}

/**
 * TODO: This is a work in progress, where instead like `Reducer` where we rebuild whole objects, we create and work with object proxies.
 *
 * TODO: Currently has an issue where recursive structures make the structure always rebuild itself, and some proxies are never replaced with the actually reduced object!
 *
 * TODO: Perhaps remove any recursive protection (unless debug?) and instead let it be up to each transformer that needs it to keep things safe
 */
export class ProxyReducer<N extends object, const D extends keyof N, O> {

  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static _ID_COUNTER: number = 0;

  // private readonly _discriminator: D;
  private readonly _options: Required<ProxyReducerOptions<N, D, O>>;
  private readonly _reduced = new Map<N, Ret2<N, D, O> | null>();
  private readonly _args: ProxyReducerArgs<N, D, O>;
  private readonly _any: ProxyReducerFn<N, N, D, O> | undefined;

  public get options() {
    return this._options;
  }

  public constructor(options: ProxyReducerOptions<N, D, O>) { // } discriminator: D, reducers: Array<Partial<ProxyReducerSpec<N, D, O>>>) {

    this._options = {
      ...options,
      track: options.track ?? (Environment.test && Environment.debug),
    };

    //   {
    //   reducers: reducers,
    //   track: (Environment.test && Environment.debug),
    // };

    this._any = this._options.reducers.find(it => it[REDUCE_ANY])?.[REDUCE_ANY];
    // this._discriminator = discriminator;

    this._args = {
      reducer: this,
    };
  }

  public reduce<FN extends N>(original: FN): Ret2<FN, D, O> {

    const alreadyReduced = this._reduced.get(original);
    if (alreadyReduced !== undefined) {
      return (alreadyReduced ?? undefined) as Ret2<FN, D, O>;
    }

    const proxyHolder = PROXY_POOL.take();
    proxyHolder.target = proxyHolder.original = original;
    proxyHolder.refs++;
    const proxy = proxyHolder.proxy as any;

    this._reduced.set(original, proxy);

    // NOTE: This section's types are not sound, it is one big hack.
    const anyReturned = this._any?.(proxy, this._args);
    if (anyReturned !== undefined) {
      // NOTE: This is likely not valid/sound/true, and needs better handling.
      proxyHolder.target = anyReturned;
    }

    let discriminator = proxy[this._options.discriminator];
    for (let i = 0; i < this._options.reducers.length; i++) {
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

    if (original !== proxyHolder.target) {
      this._reduced.set(original, proxyHolder.target as Ret2<FN, D, O>);
    } else {
      this._reduced.set(original, original);
    }

    const finalReduced = proxyHolder.target as Ret2<FN, D, O>;

    if (proxyHolder.replacements) {
      for (const replacement of proxyHolder.replacements) {
        if (replacement.index !== undefined) {
          replacement.holder.proxy[replacement.property][replacement.index] = finalReduced;
        } else {
          replacement.holder.proxy[replacement.property] = finalReduced;
        }

        replacement.holder.refs--;
        if (replacement.holder.refs === 0) {
          PROXY_POOL.release(replacement.holder);
        }
      }
    }

    proxyHolder.refs--;
    if (proxyHolder.refs === 0) {
      PROXY_POOL.release(proxyHolder);
    }

    return finalReduced;
  }
}
