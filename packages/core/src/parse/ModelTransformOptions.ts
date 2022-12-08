import {Booleanish, Option, OptionResolvers, Options, StandardOptionResolvers} from '../options/index.js';

export interface ModelTransformOptions extends Options {
  simplifyTypeHierarchy: boolean;
  elevateProperties: boolean;

  generifyTypes: Option<Booleanish, boolean>;
  /**
   * TODO: Deprecated -- remove in favor of using a language feature and only relying on 'generifyTypes' as option
   */
  generificationBoxAllowed: Option<Booleanish, boolean>;
  /**
   * TODO: Deprecated -- remove
   */
  generificationWrapAllowed: Option<Booleanish, boolean>;
}

export const DEFAULT_MODEL_TRANSFORM_OPTIONS: ModelTransformOptions = {
  elevateProperties: true,
  simplifyTypeHierarchy: true,

  generifyTypes: true,
  generificationBoxAllowed: true,
  generificationWrapAllowed: true,
};

export const TRANSFORM_OPTIONS_RESOLVER: OptionResolvers<ModelTransformOptions> = {
  generificationBoxAllowed: StandardOptionResolvers.toBoolean,
  generificationWrapAllowed: StandardOptionResolvers.toBoolean,
  generifyTypes: StandardOptionResolvers.toBoolean,
};
