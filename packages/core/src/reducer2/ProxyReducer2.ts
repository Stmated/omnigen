import {Arrayable} from '@omnigen/api';
import {PROP_KEY_HOLDER_2, PROP_KEY_IS_PROXY_2, PROP_KEY_PROXY_ORIGINAL_2, PROP_KEY_PROXY_REPLACEMENT_2, PROP_KEY_MARKER} from './symbols';
import {ProxyReducerDiscriminatorBuilder, ProxyReducerOptionsBuilder} from './ProxyReducerBuilder2';
import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {MaybeFunction, MutableProxyReducerInterface, NextRet, ReduceRet, ResolvedRet, Spec2, SpecFn2} from './types';
import {ReducerOpt2} from './ReducerOpt2';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';
import {IsExactly} from '../util';
import {RecursiveProxyHandler2} from './RecursiveProxyHandler2';
import {PROP_KEY_GENERATION, PROP_KEY_ID, PROP_KEY_REDUCER_ID} from '../reducer/ProxyReducer';

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
  id: number;
  original: Readonly<T>;
  replacement?: T;
  recursionDepth: number;
  changeCount: number;
}

type Replacement<O extends RecursiveValue<any> = RecursiveValue<any>> = { owner?: O, prop?: keyof O, index?: number, replacement: any };

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

  private _id: number = 0;

  private readonly _visited: RecursiveValue<N>[] = [];
  private _persisted: Map<N, RecursiveValue<N>> | undefined;

  public constructor(options: Options2<N, D, O, Opt> & Opt) {
    this.options = options;
  }

  get depth(): number {

    // If `visited` is ever not used, then we need to have a depth counter inside the reducer instead
    return this._visited.length - 1;
  }

  get parent(): Readonly<N> | undefined {
    const ptr = this._visited[this._visited.length - 2];
    return ptr?.replacement ?? ptr?.original;
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
  }

  // TODO: Remove all return types, add a new "replace" function

  commit(): FN {
    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    return ongoing.replacement ?? ongoing.original;
  }

  private putInternal<P extends keyof FN, V extends FN[P], RV extends RecursiveValue<FN>>(ongoing: RV, prop: P, valueOrFn: MaybeFunction<FN, V>): FN {

    const existingObj = (ongoing.replacement ?? ongoing.original);
    const existingValue = existingObj[prop];

    const value = typeof valueOrFn === 'function' ? (valueOrFn as any)(existingObj) : valueOrFn;

    const equalObj = this.isEqual(existingValue, value, r => {
      this._replacements.push({...r, owner: ongoing, prop: prop as any} satisfies Replacement);
    });

    if (equalObj === true) {
      return existingObj; // TODO: If the `equals` is between a proxy, then we need to register another replacement?
    }

    // TODO: If `value` is an object and it does not have an ID, then should we automatically add one?
    //        Seems good, otherwise it will be difficult to know what is new or not! Also get IDs propagated earlier

    if (equalObj !== 'proxy') {
      for (let i = this._visited.length - 1; i >= 0; i--) {
        this._visited[i].changeCount++;
      }
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
      }
    }

    const visited: RecursiveValue<Local> = {
      id: ++this._id,
      original: original,
      recursionDepth: 0,
      changeCount: 0,
    };

    // TODO: Add change counter to RecursiveValue, so we can know when we are done if we should throw away temp replacement?

    let ret: ReduceRet<Local, D, O, Opt>;
    try {
      this._visited.push(visited);
      ret = this.reduceInternal(visited);
      if (ret && ret != visited.original) {
        visited.replacement = ret as Local;

        for (let i = this._visited.length - 1; i >= 0; i--) {
          this._visited[i].changeCount++;
        }
      }

      if (visited.changeCount === 0) {
        return visited.original as ReduceRet<Local, D, O, Opt>;
      }
    } finally {
      this._visited.pop();
    }

    for (let i = this._replacements.length - 1; i >= 0; i--) {
      const replacement = this._replacements[i];
      const original = this.getOriginal(replacement.replacement);
      if (original === visited.original) {
        this._replacements.splice(i, 1);
        if (replacement.owner && replacement.prop) {
          const actual = this.getTarget(replacement.replacement) ?? replacement.replacement; // this.getOriginal(replacement.replacement);
          if (replacement.index !== undefined) {

            const target = (replacement.owner.replacement ?? replacement.owner.original);
            const targetArray = target[replacement.prop];

            if (target.replacement) {
              targetArray[replacement.index] = actual;
            } else {

              if (targetArray[replacement.index] !== actual) {
                const copiedArray = [...targetArray];
                copiedArray[replacement.index] = actual;

                // TODO: Get rid of the `as any` -- make `cloneAndReturnNew` decoupled from the class generics
                this.cloneAndReturnNew(replacement.owner, replacement.prop as any, copiedArray);
              }
            }

          } else {
            this.putInternal(replacement.owner, replacement.prop as any, actual);
          }
        }
      }
    }

    if (this._visited.length == 0) {
      this._persisted?.clear();
      if (this._replacements.length > 0) {
        throw new Error(`There are ${this._replacements.length} remaining replacements after all reductions, something is weird`);
      }
    }

    return ret;
  }

  private reduceInternal<Local extends N>(visited: RecursiveValue<Local>) {

    const current = visited.replacement ?? visited.original;
    const discriminator = current[this.options.discriminator];

    for (; visited.recursionDepth < this.options.specs.length; visited.recursionDepth++) {

      const spec = this.options.specs[visited.recursionDepth];
      let fn: SpecFn2<N, Local, D, O, Opt> | undefined = (spec as any)[discriminator];
      if (!fn) {
        fn = (spec as any)[`true`];
        if (!fn) {
          continue;
        }
      }

      const result = fn(current as any, this as any);
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

  public static getObjectId(obj: any): number | undefined {
    return obj[PROP_KEY_ID];
  }

  public getOriginal<T extends N>(obj: T): N {
    if (ProxyReducer2.isProxy(obj)) {
      return (obj as any)[PROP_KEY_PROXY_ORIGINAL_2];
    }

    const ongoing = this._visited.find(it => it.original === obj || it.replacement === obj); // TODO: Only keep `original` comparison
    return ongoing?.original ?? obj;
  }

  public getTarget<T extends N>(obj: T): N {
    if (ProxyReducer2.isProxy(obj)) {
      return (obj as any)[PROP_KEY_PROXY_REPLACEMENT_2];
    }

    const ongoing = this._visited.find(it => it.original === obj || it.replacement === obj); // TODO: Only keep `original` comparison
    return ongoing?.replacement ?? obj;
  }

  public getTargetOnly<T extends N>(obj: T): N | undefined {
    if (ProxyReducer2.isProxy(obj)) {
      return (obj as any)[PROP_KEY_PROXY_REPLACEMENT_2];
    }

    return undefined;
  }

  public static getHolder(obj: any): RecursiveValue<unknown> | undefined {
    if (!obj) {
      return undefined;
    }
    return obj[PROP_KEY_HOLDER_2];
  }

  public static isProxy(obj: any): boolean {
    if (!obj) {
      return false;
    }
    return !!obj[PROP_KEY_IS_PROXY_2];
  }

  private readonly _replacements: Replacement[] = [];

  private isEqual(a: any, b: any, replacementCallback: (r: Replacement) => void): boolean | 'proxy' {

    // const recursive = this._visited.find(it => it.original === b);

    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      const length = a.length;
      const sameLength = (length === b.length);
      let itemsAreEqual: boolean | 'proxy' = true;

      for (let i = length; i-- !== 0;) {
        const equal = this.isEqual(a[i], b[i], r => replacementCallback({...r, index: i}));
        if (!equal) {
          // We must go through all array items even if we've found an early diff.
          // This is because we need to find all proxies, so they can be deferred.
          itemsAreEqual = false;
        } else if (itemsAreEqual === true && equal === 'proxy') {
          itemsAreEqual = 'proxy';
        }
      }

      if (!sameLength) {
        return false;
        // return (sameLength && itemsAreEqual);
      } else {
        return itemsAreEqual;
      }

    } else if (ProxyReducer2.isProxy(b)) {

      // There is no point in checking equality between a real object and a proxy.
      // Because the proxy means the object is not completely built yet; we cannot know its final state.
      if (this.getOriginal(b) === a) {
        replacementCallback({replacement: b});
        return 'proxy';
      }
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
