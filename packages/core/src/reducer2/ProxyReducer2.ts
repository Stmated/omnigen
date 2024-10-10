import {Arrayable, MaybeReadonly, StrictReadonly} from '@omnigen/api';
import {ProxyReducerDiscriminatorBuilder, ProxyReducerOptionsBuilder} from './ProxyReducerBuilder2';
import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {ANY_KIND, MaybeFunction, MutableProxyReducerInterface, YieldRet, ReduceRet, ResolvedRet, Spec2, SpecFn2} from './types';
import {ReducerOpt2} from './ReducerOpt2';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';
import {PROP_KEY_GENERATION, PROP_KEY_ID, PROP_KEY_REDUCER_ID} from './symbols';

export interface Options2<N extends object, D extends keyof N, O, InOpt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, InOpt>>> {
  readonly discriminator: D;
  readonly specs: S;
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
  original: StrictReadonly<T>;
  replacement?: T | null;
  recursionDepth: number;
  changeCount: number;
}

class AbortException<T> extends Error {
  value: T;

  constructor(value: T) {
    super();

    this.value = value;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AbortException.prototype);
  }
}

/**
 * A reducer which can transform an object structure, and uses proxies to safeguard against recursive access.
 *
 * If you do not do any transformation/change to any property, then the original object will be kept. The object graph will not be resolved/flattened unless you change something.
 *
 * WARNING! BETA!
 */
// TODO: Currently if recursive structures are encountered, it will re-create large parts of the whole object graph and perhaps throw everything away once we are done and notice no changes
//        This will likely require some form of temporary (or permanent) proxies, and to NEVER rely on object equality, instead always rely on object ids.
//        This will be a later optimization, once we use ProxyReducer2 everywhere in the code and can verify that proxies break no edge-case functionality.
// TODO: The generics in the class are all over the place with ugly cast -- it "works", but likely this can be rewritten to be typesafe and trustworthy.
export class ProxyReducer2<N extends object, FN extends N, const D extends keyof N, O, const Opt extends ReducerOpt2, const S extends ReadonlyArray<Spec2<N, D, O, Opt>>> implements MutableProxyReducerInterface<N, FN, D, O, Opt, S> {

  public static builder<BN extends object, BO>(): ProxyReducerDiscriminatorBuilder<BN, BO> {

    return {
      discriminator: d => {
        return new ProxyReducerOptionsBuilder(d, {});
      },
    };
  }

  public readonly options: Options2<N, D, O, Opt, S> & Opt;

  private _id: number = 0;

  private readonly _visited: RecursiveValue<N>[] = [];
  private _persisted: Map<N, RecursiveValue<N>> | undefined;

  public constructor(options: Options2<N, D, O, Opt, S> & Opt) {
    this.options = options;
  }

  get depth(): number {

    // If `visited` is ever not used, then we need to have a depth counter inside the reducer instead
    return this._visited.length - 1;
  }

  get parent(): StrictReadonly<N> | undefined {
    const ptr = this._visited[this._visited.length - 2];
    return (ptr?.replacement as StrictReadonly<typeof ptr.replacement>) ?? ptr?.original;
  }

  put<P extends keyof FN, V extends FN[P]>(prop: P, value: MaybeFunction<FN, V>): this {
    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    this.putInternal(ongoing, prop, value);
    return this;
  }

  persist(): this {

    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    if (!this._persisted) {
      this._persisted = new Map<N, RecursiveValue<N>>();
    }

    // TODO: When persisting we should force creation of the `replacement` so we can reference the new one?
    // if (replacement !== undefined) {
    //   ongoing.replacement = replacement as FN;
    // }

    this._persisted.set(ongoing.original as any, ongoing);

    return this;
  }

  replace(replacement: ResolvedRet<FN, D, O>): this {

    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<ResolvedRet<FN, D, O>>;
    if ((ongoing.replacement && ongoing.replacement !== replacement) || (!ongoing.replacement && ongoing.original !== replacement)) {
      ongoing.replacement = replacement;
      // ongoing.changeCount++;
      for (let i = this._visited.length - 1; i >= 0; i--) {
        this._visited[i].changeCount++;
      }
    }

    return this;
  }

  forget(): this {
    throw new Error(`Not yet implemented to forget`);
  }

  remove(): this {
    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    ongoing.replacement = null;
    return this;
  }

  private putInternal<P extends keyof FN, V extends FN[P], RV extends RecursiveValue<FN>>(ongoing: RV, prop: P, valueOrFn: MaybeFunction<FN, V>): void {

    if (this.options.immutable) {

      // Settings things while immutable is one big waste of time.
      return;
    }

    const existingObj = (ongoing.replacement ?? ongoing.original);
    const existingValue = existingObj[prop];

    const value = typeof valueOrFn === 'function' ? (valueOrFn as any)(existingObj) : valueOrFn;

    const equalObj = this.isEqual(existingValue, value);

    if (equalObj) {
      return;
    } else {
      for (let i = this._visited.length - 1; i >= 0; i--) {
        this._visited[i].changeCount++;
      }

      if (ongoing.replacement) {
        ongoing.replacement[prop] = value;
      } else {
        this.cloneAndReturnNew(ongoing, prop, value);
      }
    }
  }

  private cloneAndReturnNew<P extends keyof FN, V extends FN[P], RV extends RecursiveValue<FN>>(ongoing: RV, prop?: P, value?: V) {

    let copy: StrictReadonly<FN>;
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
    ongoing.replacement = copy as FN;
    return copy;
  }

  public yieldBase(): YieldRet<FN, D, O, Opt> {

    const ongoing = this._visited[this._visited.length - 1]! as RecursiveValue<FN>;
    try {
      ongoing.recursionDepth++;
      this.reduceInternal(ongoing);
    } finally {
      ongoing.recursionDepth--;
    }

    if (ongoing.replacement === null) {
      return undefined as YieldRet<FN, D, O, Opt>;
    }
    return (ongoing.replacement ?? ongoing.original) as YieldRet<FN, D, O, Opt>;
  }

  public callBase(): void {
    this.yieldBase();
  }

  public reduce<Local extends N>(original: Local): ReduceRet<Local, D, O, Opt, S> {

    if (this._persisted) {

      const persisted = this._persisted.get(original);
      if (persisted) {
        if (persisted.replacement === null) {
          return undefined as ReduceRet<Local, D, O, Opt, S>;
        }
        return (persisted.replacement ?? persisted.original) as ReduceRet<Local, D, O, Opt, S>;
      }
    }

    const recursive = this._visited.find(it => it.original === original);
    if (recursive) {

      if (this.options.immutable) {

        // Things are immutable, just return the original and we're done.
        return recursive.original as ReduceRet<Local, D, O, Opt, S>;
      }

      if (recursive.replacement !== undefined) {
        return (recursive.replacement ?? undefined) as ReduceRet<Local, D, O, Opt, S>;
      } else {

        // TODO: Need some way of having a lazy callback from the reduction, where we register a listener for recursive root completion!
        //        Then we should be able to, after-the-fact to replace things... or something! This requires a solution!
        return this.cloneAndReturnNew(recursive as RecursiveValue<FN>) as ReduceRet<Local, D, O, Opt, S>;
      }
    }

    const visited: RecursiveValue<Local> = {
      id: ++this._id,
      original: original as StrictReadonly<typeof original>,
      recursionDepth: 0,
      changeCount: 0,
    };

    // TODO: Add change counter to RecursiveValue, so we can know when we are done if we should throw away temp replacement?

    try {
      this._visited.push(visited);
      this.reduceInternal(visited);
      if (visited.changeCount === 0 && visited.replacement !== undefined) {
        delete visited.replacement;
      }
    } catch (ex) {
      if (this._visited.length === 1 && ex instanceof AbortException) {

        // We are at the root level, we will throw away the error and return the value.
        return ex.value;
      }
      throw ex;
    } finally {
      this._visited.pop();
    }

    if (this._visited.length === 0) {
      this._persisted?.clear();

      if (this.options.immutable) {

        // There was no return value found for the immutable visiting.
        // So we will return `undefined`.
        return undefined as ReduceRet<Local, D, O, Opt, S>;
      }
    }

    if (visited.replacement === null) {
      return undefined as ReduceRet<Local, D, O, Opt, S>;
    }
    return (visited.replacement ?? visited.original) as ReduceRet<Local, D, O, Opt, S>;
  }

  private reduceInternal<Local extends N>(visited: RecursiveValue<Local>): void {

    const current = visited.replacement ?? visited.original;
    const discriminator = current[this.options.discriminator];

    for (; visited.recursionDepth < this.options.specs.length; visited.recursionDepth++) {

      const spec = this.options.specs[visited.recursionDepth];
      let fn: SpecFn2<N, Local, D, O, Opt, S> | undefined = (spec as any)[discriminator];
      if (!fn) {
        fn = (spec as any)[ANY_KIND];
        if (!fn) {
          continue;
        }
      }

      const returned = fn(current as any, this as any);
      if (this.options.immutable && returned !== undefined) {
        throw new AbortException(returned);
      }
      break;
    }
  }

  private isEqual(a: any, b: any): boolean {

    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      const length = a.length;
      const sameLength = (length === b.length);
      let itemsAreEqual = true;

      for (let i = length; i-- !== 0;) {
        const equal = this.isEqual(a[i], b[i]);
        if (!equal) {
          // We must go through all array items even if we've found an early diff.
          // This is because we need to find all proxies, so they can be deferred.
          itemsAreEqual = false;
        }
      }

      if (!sameLength) {
        return false;
      } else {
        return itemsAreEqual;
      }

    }

    return false;
  }

  /**
   * @see PROP_KEY_ID
   */
  public getId(obj: MaybeReadonly<N>): number { // } IsExactly<typeof generate, true, number, number | undefined> {
    const existing = (obj as any)[PROP_KEY_ID];
    if (existing) {
      return existing;
    }

    const newId = ++this.options.trackingStatsSource.idCounter;
    (obj as any)[PROP_KEY_ID] = newId;
    return newId;
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
