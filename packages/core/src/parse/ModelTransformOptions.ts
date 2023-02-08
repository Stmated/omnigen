import {Booleanish, Option, OptionResolvers, Options} from '../options/index.js';

export interface ModelTransformOptions extends Options {
  simplifyTypeHierarchy: boolean;
  /**
   * Elevate properties that are the same to their superclass.
   */
  elevateProperties: boolean;
  /**
   * Simplify properties by elevating types that can be made generic in the subclasses.
   */
  generifyTypes: Option<Booleanish, boolean>;
  /**
   * TODO: Deprecated -- remove in favor of using a language feature and only relying on 'generifyTypes' as option
   */
  generificationBoxAllowed: Option<Booleanish, boolean>;
}

export const DEFAULT_MODEL_TRANSFORM_OPTIONS: ModelTransformOptions = {
  elevateProperties: true,
  simplifyTypeHierarchy: true,

  generifyTypes: true,
  generificationBoxAllowed: true,
};
