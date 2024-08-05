/**
 * @param factory - The factory that produces new values.
 * @param reset - The callback that is invoked when value is returned to the pool via {@link release}.
 * @param capacity - The initial capacity
 * @param growFactor - The factor to grow the underlying cache, if needed
 */
export interface ObjectPoolOptions<T> {
  factory: () => T;
  reset?: (value: T) => void;
  capacity?: number;
  growFactor?: number;
}

/**
 * Array-backed object pool implementation, for speeding up your critical code.
 *
 * @see https://en.wikipedia.org/wiki/Object_pool_pattern Object pool pattern
 */
export class ObjectPool<T> {

  private readonly _factory;
  private readonly _reset;
  private readonly _cache: Array<T>;
  private readonly _growFactor: number;
  private _cursor = 0;

  /**
   * Creates the new {@link ObjectPool} instance.
   */
  public constructor(options: ObjectPoolOptions<T>) {
    this._factory = options.factory;
    this._reset = options.reset;
    this._growFactor = options.growFactor ?? 1.2;
    if (options.capacity) {
      this._cache = new Array<T>(options.capacity);
      this.growTo(options.capacity);
    } else {
      this._cache = [];
    }
  }

  /**
   * Returns the next value from the pool.
   *
   * If there's no value available then the factory is called to produce a new value which is added to the pool.
   */
  public take(): T {
    if (this._cursor === this._cache.length) {
      this.allocate(Math.round(this._cache.length * this._growFactor));
    }

    const value = this._cache[this._cursor];
    this._cache[this._cursor++] = null as unknown as T;
    return value;
  }

  /**
   * Returns a value to the pool so it can be retrieved using {@link ObjectPool#take}. There's no check that value was
   * already returned to the pool and no check that value was in the pool previously. So ensure you don't release the
   * same value twice or release a value that doesn't belong to the pool.
   */
  public release(value: T): void {

    if (this._reset) {
      this._reset(value);
    }

    this._cache[this._cursor === 0 ? this._cache.length : --this._cursor] = value;
  }

  /**
   * Forgets a value from the pool, so that it can keep living in the outside world indefinitely.
   * This means it is effectively "leaked".
   *
   * @param value - The value to forget. Currently not used internally, but takes value for API completeness's sake.
   */
  public forget(value: T): void {
    this._cache[--this._cursor] = this._factory();
  }

  /**
   * Grows pool (if needed) with new values produced by the factory.
   *
   * @param count - The integer number of entries the cache should contain.
   */
  public growTo(count: number): void {
    const prevLength = this._cache.length;
    if (prevLength > count) {
      throw new Error(`Cannot grow the pool to less than its current length`);
    }

    this._cache.length = count;
    let i: number;
    for (i = 0; i < prevLength; i++) {
      this._cache[i] = this._factory();
    }
    for (i = prevLength; i < count; i++) {
      this._cache[i] = this._factory();
    }
  };

  /**
   * Populates pool with new values produced by the factory.
   *
   * @param count - The integer number of values to produce.
   */
  public allocate(count: number): void {
    const prevLength = this._cache.length;
    const nextLength = this._cache.length += count;

    for (let i = prevLength; i < nextLength; i++) {
      this._cache[i] = this._factory();
    }
  };
}
