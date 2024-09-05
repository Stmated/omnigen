import {Arrayable} from '@omnigen/api';
import {PROP_KEY_IS_PROXY, PROP_KEY_PROXY_ORIGINAL, PROP_KEY_PROXY_REPLACEMENT} from './symbols.ts';
import {ProxyReducerDiscriminatorBuilder, ProxyReducerOptionsBuilder} from './ProxyReducerBuilder2.ts';
import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2.ts';
import {MaybeFunction, MutableProxyReducerInterface, NextRet, ReduceRet, ResolvedRet, Spec2, SpecFn2} from './types.ts';
import {ReducerOpt2} from './ReducerOpt2.ts';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2.ts';
import {IsExactly} from '../util';
import {RecursiveProxyHandler2} from './RecursiveProxyHandler2.ts';
import {PROP_KEY_GENERATION, PROP_KEY_ID, PROP_KEY_REDUCER_ID} from '../reducer/ProxyReducer.ts';

export interface Options2<N extends object, D extends keyof N, O, InOpt extends ReducerOpt2> {
  readonly discriminator: D;
  readonly specs: ReadonlyArray<Spec2<N, D, O, InOpt>>;
  readonly reducerId: number;
  readonly track: ProxyReducerTrackMode2;

  /**
   * **WARNING**: Only set if you are writing test cases or for some inexplicable reason want to run in isolation.
   * It **will** be confusing if different things could have same ID.
   */
  readonly trackingStatsSource: ProxyReducerTrackingSource2;
  readonly immutable: boolean;
}

export interface RecursiveValue<T> {
  original: Readonly<T>;
  replacement?: T;
  recursionDepth: number;
}

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
export class ProxyReducer2<N extends object, FN extends N, const D extends keyof N, O, const Opt extends ReducerOpt2> implements MutableProxyReducerInterface<N, FN, D, O, Opt> {

  public static builder<N extends object, O>(): ProxyReducerDiscriminatorBuilder<N, O> {

    return {
      discriminator: d => {
        return new ProxyReducerOptionsBuilder(d, {});
      },
    };
  }

  public readonly options: Options2<N, D, O, Opt> & Opt;

  private readonly _visited: RecursiveValue<N>[] = [];
  private _persisted: Map<N, RecursiveValue<N>> | undefined;

  public constructor(options: Options2<N, D, O, Opt> & Opt) {
    this.options = options;
  }

  get depth(): number {

    // If `visited` is ever not used, then we need to have a depth counter inside the reducer instead
    return this._visited.length - 1;
  }

  set<P extends keyof FN, V extends FN[P]>(prop: P, value: MaybeFunction<FN, V>): FN {
    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    return this.putInternal(ongoing, prop, value);
  }

  put<P extends keyof FN, V extends FN[P]>(prop: P, value: MaybeFunction<FN, V>): this {
    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    this.putInternal(ongoing, prop, value);
    return this;
  }

  // map<
  //   P extends ArrayKeys<FN>,
  //   M extends Mapper<N, FN, D, O, P>,
  //   Mapped extends ReturnType<M>,
  //   S extends Mapped & ToArrayItem<FN[P]>
  // >(prop: P, mapper?: M | undefined, filter?: Filter<Mapped, S>): this {
  //   const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
  //
  //   const original = (ongoing.replacement ?? ongoing.original)[prop] as (Array<ToArrayItem<FN[P]>> | undefined);
  //   if (!original) {
  //     return this;
  //   }
  //
  //   let modified = original;
  //
  //   for (let i = 0; i < original.length; i++) {
  //
  //     let reduced: ResolvedRet<N, D, O, ToArrayItem<FN[P]>>;
  //     if (mapper) {
  //       reduced = mapper(original[i]);
  //     } else {
  //       reduced = this.reduce(original[i]);
  //     }
  //
  //     if (filter && !filter(reduced)) {
  //       if (modified === original) {
  //         modified = original.toSpliced(0, i);
  //       } else {
  //         continue;
  //       }
  //     }
  //
  //     if (ProxyReducer2.isProxy(reduced)) {
  //
  //       // This is a proxy that is being placed inside one of our arrays...
  //       // We need to resolve/replace it later once the recursive object is fully created.
  //       const i = 0;
  //     }
  //
  //     if (!this.isEqual(original[i], reduced)) {
  //       if (modified === original) {
  //         modified = original.toSpliced(0, i, reduced);
  //       } else {
  //         modified.push(reduced);
  //       }
  //     } else if (modified !== original) {
  //       modified.push(reduced);
  //     }
  //   }
  //
  //   return this;
  // }

  persist(replacement?: ResolvedRet<FN, D, O, FN>): this {

    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    if (!this._persisted) {
      this._persisted = new Map<N, RecursiveValue<N>>();
    }

    // TODO: When persisting we should force creation of the `replacement` so we can reference the new one?
    if (replacement !== undefined) {
      ongoing.replacement = replacement as FN;
    }

    this._persisted.set(ongoing.original, ongoing);

    return this;
    // return ongoing.replacement ?? ongoing.original;
  }

  commit(): FN {
    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    return ongoing.replacement ?? ongoing.original;
  }

  private putInternal<P extends keyof FN, V extends FN[P], RV extends RecursiveValue<FN>>(ongoing: RV, prop: P, valueOrFn: MaybeFunction<FN, V>): FN {

    const existingObj = (ongoing.replacement ?? ongoing.original);
    const existingValue = existingObj[prop];

    let value: V;
    if (typeof valueOrFn === 'function') {
      value = (valueOrFn as any)(existingObj); // TODO: Ugly. Fix by adding new functions like `putLazy`
    } else {
      value = valueOrFn;
    }

    // TODO: isEqual must check if any of the new values is a proxy, and if it is then we must register it for post-process replacement!

    if (this.isEqual(existingValue, value)) {
      return existingObj;
    }

    if (ongoing.replacement) {
      ongoing.replacement[prop] = value;
      return ongoing.replacement;
    } else {
      return this.cloneAndReturnNew(ongoing, prop, value);
    }
  }

  private cloneAndReturnNew<P extends keyof FN, V extends FN[P], RV extends RecursiveValue<FN>>(ongoing: RV, prop?: P, value?: V) {

    let copy: FN;
    if (prop) {
      if (this.options.track !== ProxyReducerTrackMode2.NONE) {
        copy = {
          ...ongoing.original,
          [prop]: value,
          [PROP_KEY_ID]: ++this.options.trackingStatsSource.idCounter,
          [PROP_KEY_GENERATION]: ProxyReducer2.getGeneration(ongoing.original) + 1,
          [PROP_KEY_REDUCER_ID]: this.getNewReducerIds(ongoing.original),
        };
      } else {
        copy = {...ongoing.original, [prop]: value};
      }
    } else {
      if (this.options.track !== ProxyReducerTrackMode2.NONE) {
        copy = {
          ...ongoing.original,
          [PROP_KEY_ID]: ++this.options.trackingStatsSource.idCounter,
          [PROP_KEY_GENERATION]: ProxyReducer2.getGeneration(ongoing.original) + 1,
          [PROP_KEY_REDUCER_ID]: this.getNewReducerIds(ongoing.original),
        };
      } else {
        copy = {...ongoing.original};
      }
    }

    // Check if this is a recursive object, and in that case update the `replacement` so it can be detected by others.
    ongoing.replacement = copy;
    return copy;
  }

  public next(): NextRet<FN, D, O, Opt> {

    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    try {
      ongoing.recursionDepth++;
      return this.reduceInternal(ongoing);
    } finally {
      ongoing.recursionDepth--;
    }
  }

  public reduce<Local extends N>(original: Local): ReduceRet<Local, D, O, Opt> {

    if (this._persisted) {

      const persisted = this._persisted.get(original);
      if (persisted) {
        return (persisted.replacement ?? persisted.original) as ReduceRet<Local, D, O, Opt>;
      }
    }

    if (ProxyReducer2.isProxy(original)) {
      return original as ReduceRet<Local, D, O, Opt>;
    }

    const recursive = this._visited.find(it => it.original === original);
    if (recursive) {

      if (this.options.immutable) {

        // Things are immutable, just return the original and we're done.
        return recursive.original as ReduceRet<Local, D, O, Opt>;
      }

      if (recursive.replacement) {
        return recursive.replacement as ReduceRet<Local, D, O, Opt>;
      } else {

        // TODO: Need some way of having a lazy callback from the reduction, where we register a listener for recursive root completion!
        //        Then we should be able to, after-the-fact to replace things... or something! This requires a solution!

        return new Proxy<N>(recursive.original, new RecursiveProxyHandler2(recursive)) as any;

        // return this.cloneAndReturnNew(recursive as RecursiveValue<FN>) as ReduceRet<Local, D, O, Opt>;
      }
    }

    try {

      const visited: RecursiveValue<Local> = {
        original: original,
        recursionDepth: 0,
      };

      this._visited.push(visited);
      return this.reduceInternal(visited);

    } finally {
      this._visited.pop();
      if (this._persisted && this._visited.length == 0) {
        this._persisted.clear();
      }
    }
  }

  private reduceInternal<Local extends N>(visited: RecursiveValue<Local>) {

    const current = visited.replacement ?? visited.original;
    const discriminator = current[this.options.discriminator];

    for (let i = visited.recursionDepth; i < this.options.specs.length; i++) {

      const spec = this.options.specs[i];
      let fn: SpecFn2<N, Local, D, O, Opt> | undefined = (spec as any)[discriminator];
      if (!fn) {
        fn = (spec as any)[`true`];
        if (!fn) {
          continue;
        }
      }

      const result = fn(current as any, this as any);
      // if (current !== result) {
      //   visited.changeCount++; // TODO: This is wrong. Nothing has necessarily changed.
      // }

      return result as ReduceRet<Local, D, O, Opt>;
    }

    return (visited.replacement ?? visited.original) as ReduceRet<Local, D, O, Opt>;
  }

  /**
   * @see PROP_KEY_ID
   */
  public getId(obj: any, generate = false): IsExactly<typeof generate, true, number, number | undefined> {
    const existing = obj[PROP_KEY_ID];
    if (existing) {
      return existing;
    }
    if (generate) {
      const newId = ++this.options.trackingStatsSource.idCounter;
      obj[PROP_KEY_ID] = newId;
      return newId;
    }
    return undefined;
  }

  /**
   * @see PROP_KEY_GENERATION
   */
  public static getGeneration(obj: any): number {

    if (PROP_KEY_GENERATION in obj) {
      return obj[PROP_KEY_GENERATION];
    } else {
      return 0;
    }
  }

  /**
   * @see PROP_KEY_REDUCER_ID
   */
  public static getReducerId(obj: any): Arrayable<number> | undefined {
    return obj[PROP_KEY_REDUCER_ID];
  }

  public getOriginal<T extends N>(obj: T): N {
    if (ProxyReducer2.isProxy(obj)) {
      return (obj as any)[PROP_KEY_PROXY_ORIGINAL];
    }

    const ongoing = this._visited.find(it => it.original === obj || it.replacement === obj);
    return ongoing?.original ?? obj;
  }

  public getTarget<T extends N>(obj: T): N {
    if (ProxyReducer2.isProxy(obj)) {
      return (obj as any)[PROP_KEY_PROXY_REPLACEMENT];
    }

    const ongoing = this._visited.find(it => it.original === obj || it.replacement === obj);
    return ongoing?.replacement ?? obj;
  }

  public static isProxy(obj: any): boolean {
    if (!obj) {
      return false;
    }
    return !!obj[PROP_KEY_IS_PROXY];
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      const length = a.length;
      if (length !== b.length) return false;
      for (let i = length; i-- !== 0;) {
        if (!this.isEqual(a[i], b[i])) {
          return false;
        }
      }

      return true;
    } else if (ProxyReducer2.isProxy(b)) {
      return this.isEqual(a, this.getTarget(b) ?? this.getOriginal(b));
    }

    return false;
  }

  private getNewReducerIds<FN>(node: FN) {

    if (this.options.track === ProxyReducerTrackMode2.LAST) {
      return this.options.reducerId;
    } else {
      const existing = ProxyReducer2.getReducerId(node);
      if (existing) {
        if (Array.isArray(existing)) {
          if (existing[existing.length - 1] !== this.options.reducerId) {
            return [...existing, this.options.reducerId];
          } else {
            return existing;
          }
        } else if (this.options.reducerId !== existing) {
          return [existing, this.options.reducerId];
        } else {
          return existing;
        }
      } else {
        return [this.options.reducerId];
      }
    }
  }
}
