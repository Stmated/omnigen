import {OmniType} from './OmniModel.js';

/**
 * Enum explaining the equality level of a comparison.
 * The different levels are spread out in spans of 100.
 */
export enum EqualityLevel {

  NOT_EQUAL_MIN = 0,
  ISOMORPHIC_MIN = 100,
  SEMANTICS_MIN = 200,
  /**
   * Equal on the functional level. Same type, but name, comments and descriptions can be not equal.
   */
  FUNCTION_MIN = 300,
  CLONE_MIN = 400,
  IDENTITY_MIN = 500,

  /**
   * The two do not share anything in common.
   */
  NOT_EQUAL_MAX = NOT_EQUAL_MIN + 99,

  /**
   * Equal but on the lowest level. For example Integer 5 == Double 5.0, or supertypes of subtypes match.
   */
  ISOMORPHIC_MAX = ISOMORPHIC_MIN + 99,

  /**
   * Equal but on the semantic level. For example Number 5 == Double 5.0.
   */
  SEMANTICS_MAX = SEMANTICS_MIN + 99,

  /**
   * Equal on the functional level. Same type, but name, comments and descriptions can be not equal.
   * TODO: These should be split differently. We need one where NAME is same, but comments/etc is different
   *        Add one between FUNCTION and CLONE? Call it "REPRESENTATION"?
   *        Rename FUNCTION to STRUCTURE? and call the new one FUNCTION? Might work
   *        Also add a prefix number to the levels, so it's easier and quicker to see importance?
   */
  FUNCTION_MAX = FUNCTION_MIN + 99,

  /**
   * Equal on all levels. Same type, same comments, same requirements.
   */
  CLONE_MAX = CLONE_MIN + 99,

  /**
   * Equal on the most exact level. They are the same object reference.
   */
  IDENTITY_MAX = IDENTITY_MIN + 99,
}

export interface PropertyEquality {
  propertyEquality: EqualityLevel;
  typeEquality: EqualityLevel;
  type?: OmniType | undefined;
}
