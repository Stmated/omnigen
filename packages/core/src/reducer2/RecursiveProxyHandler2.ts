import {RecursiveValue} from './ProxyReducer2';
import {PROP_KEY_HOLDER_2, PROP_KEY_IS_PROXY_2, PROP_KEY_PROXY_ORIGINAL_2, PROP_KEY_PROXY_REPLACEMENT_2} from './symbols';

export class RecursiveProxyHandler2<T extends object> implements ProxyHandler<T> {

  private readonly _value: RecursiveValue<T>;

  constructor(value: RecursiveValue<T>) {
    this._value = value;
  }

  get(target: T, p: string | symbol, receiver: any): any {

    if (p === PROP_KEY_IS_PROXY_2) {
      return true;
    } else if (p === PROP_KEY_PROXY_ORIGINAL_2) {
      return this._value.original;
    } else if (p === PROP_KEY_PROXY_REPLACEMENT_2) {
      return this._value.replacement;
    } else if (p === PROP_KEY_HOLDER_2) {
      return this._value;
    }

    return ((this._value.replacement ?? this._value.original) as any)[p];
  }

  set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    throw new Error(`Not allowed to change ANY value of a recursive object; it must be handled by its own reducer`); // TODO: Is this true? Should likely be...
  }

  getOwnPropertyDescriptor(target: T, p: string | symbol): PropertyDescriptor | undefined {
    return Reflect.getOwnPropertyDescriptor(this._value.replacement ?? this._value.original, p);
  }

  ownKeys(target: T): ArrayLike<string | symbol> {
    return Reflect.ownKeys(this._value.replacement ?? this._value.original);
  }

  has(target: T, p: string | symbol): boolean {
    return Reflect.has(this._value.replacement ?? this._value.original, p);
  }
}
