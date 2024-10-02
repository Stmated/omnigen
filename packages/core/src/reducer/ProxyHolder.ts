import {PROP_KEY_HOLDER, PROP_KEY_IS_PROXY, PROP_KEY_RECURSION_DEPTH} from './symbols';
import {ProxyReducer} from './ProxyReducer';

interface ProxyReplacement {
  holder: ProxyHolder;
  property: PropertyKey;
  index?: number;
}

export interface ProxyHolder {
  proxy: any;
  original: any;
  target: any;
  replacements: ProxyReplacement[];
  refCount: number;
  recursionDepth: number;
}

export class ProxyHolderHandler<T extends object> implements ProxyHandler<T> {

  private readonly holder: ProxyHolder;

  constructor(holder: ProxyHolder) {
    this.holder = holder;
  }

  get(_: T, p: string | symbol): any {
    if (p === PROP_KEY_IS_PROXY) {
      return true;
    } else if (p === PROP_KEY_HOLDER) {
      return this.holder;
    } else if (p === PROP_KEY_RECURSION_DEPTH) {
      return this.holder.recursionDepth;
    }
    return this.holder.target[p];
  }

  set(_: T, p: string | symbol, v: any): boolean {

    if (p === PROP_KEY_RECURSION_DEPTH) {
      this.holder.recursionDepth = v;
      return true;
    }

    const equality = isEqual(this.holder.target[p], v);
    if (equality === true) {
      return true;
    }

    if (equality === false) {
      if (this.holder.target === this.holder.original) {
        this.holder.target = {...this.holder.target};
      }
    }

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const item = v[i];
        if (item[PROP_KEY_IS_PROXY]) {
          const itemHolder = item[PROP_KEY_HOLDER] as ProxyHolder;
          this.holder.refCount++;
          itemHolder.replacements.push({
            holder: this.holder,
            property: p,
            index: i,
          });
        }
      }

    } else {
      if (ProxyReducer.isProxy(v)) {
        const vHolder = v[PROP_KEY_HOLDER] as ProxyHolder;
        this.holder.refCount++;
        vHolder.replacements.push({
          holder: this.holder,
          property: p,
        });
      }
    }

    if (equality === false) {
      this.holder.target[p] = v;
    }

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
    // try {
    //   return Reflect.ownKeys(this.holder.target);
    // } catch (e) {
    return Object.keys(this.holder.target);
    // }
  }

  getOwnPropertyDescriptor(_: T, p: string | symbol): PropertyDescriptor | undefined {
    return Object.getOwnPropertyDescriptor(this.holder.target, p);
  }

  defineProperty(_: T, p: string | symbol, attr: PropertyDescriptor): boolean {
    Object.defineProperty(this.holder.target, p, attr);
    return true;
  }
}

const isEqual = (a: unknown, b: any): boolean | 'proxied' => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    const length = a.length;
    if (length !== b.length) return false;
    for (let i = length; i-- !== 0;) {
      const res = isEqual(a[i], b[i]);
      if (res !== true) return res;
    }

    return true;
  } else {

    const vHolder = b[PROP_KEY_HOLDER] as ProxyHolder;
    if (vHolder && isEqual(a, vHolder.target)) {
      return 'proxied';
    }
  }

  return false;
};
