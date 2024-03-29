/**
 * Should be removed in favor of something more... standard. Throwing exceptions as a happy-path is not a good look.
 */
export class AbortVisitingWithResult<T> extends Error {

  private readonly _result: T;

  get result(): T {
    return this._result;
  }

  constructor(result: T) {
    super();
    this._result = result;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AbortVisitingWithResult.prototype);
  }
}
