
export enum CombineMode {
  INTERSECTION = 'INTERSECTION',
  UNION = 'UNION',
}

/**
 * TODO: Need to refine these. It should be possible to state that "allowed to create intersection, or grab supertype, but not create a whole new union/intersection/whatever"
 *        Because right now even "SIMPLE" could create a new type that is derived and not really "in common"/"a common denominator"
 */
export enum CreateMode {
  NONE = 'NONE',
  SIMPLE = 'SIMPLE',
  ANY = 'ANY',
}

export interface CombineOptions {
  /**
   * Default is `CombineMode.INTERSECTION`
   */
  combine?: CombineMode | undefined;
  /**
   * Default is `CreateMode.NONE`
   */
  create?: CreateMode | undefined;
}
