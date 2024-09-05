import {RecursiveValue} from './ProxyReducer2.ts';
import {PROP_KEY_IS_PROXY, PROP_KEY_PROXY_ORIGINAL, PROP_KEY_PROXY_REPLACEMENT} from './symbols.ts';

export class RecursiveProxyHandler2<T extends object> implements ProxyHandler<T> {

  private readonly _value: RecursiveValue<T>;

  constructor(value: RecursiveValue<T>) {
    this._value = value;
  }

  get(target: T, p: string | symbol, receiver: any): any {

    if (p === PROP_KEY_IS_PROXY) {
      return true;
    } else if (p === PROP_KEY_PROXY_ORIGINAL) {
      return this._value.original;
    } else if (p === PROP_KEY_PROXY_REPLACEMENT) {
      return this._value.replacement;
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

// export class RecursiveProxyHandler2<T extends object> implements ProxyHandler<T> {
//
//   get(target: T, p: string | symbol, receiver: any): any {
//     return (target as any)[p];
//   }
//
//   set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
//     throw new Error(`You cannot set property '${String(p)}' on '${receiver}' since it a recursion-protection proxy, the property must be set in the reducer that is originally constructing it`);
//     // return false;
//   }
//   //
//   // apply(target: T, thisArg: any, argArray: any[]): any {
//   // }
//   //
//   // construct(target: T, argArray: any[], newTarget: Function): object {
//   //   return undefined;
//   // }
//   //
//   // defineProperty(target: T, property: string | symbol, attributes: PropertyDescriptor): boolean {
//   //   return false;
//   // }
//   //
//   // deleteProperty(target: T, p: string | symbol): boolean {
//   //   return false;
//   // }
//   //
//   // getOwnPropertyDescriptor(target: T, p: string | symbol): PropertyDescriptor | undefined {
//   //   return undefined;
//   // }
//   //
//   // getPrototypeOf(target: T): object | null {
//   //   return undefined;
//   // }
//   //
//   // has(target: T, p: string | symbol): boolean {
//   //   return false;
//   // }
//   //
//   // isExtensible(target: T): boolean {
//   //   return false;
//   // }
//   //
//   // ownKeys(target: T): ArrayLike<string | symbol> {
//   //   return undefined;
//   // }
//   //
//   // preventExtensions(target: T): boolean {
//   //   return false;
//   // }
//   //
//   // setPrototypeOf(target: T, v: object | null): boolean {
//   //   return false;
//   // }
// }
