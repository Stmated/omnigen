import {ZodCoercedBoolean, ZodOptions} from '../options';
import {z} from 'zod';

export const ZodModelTransformOptions = ZodOptions.extend({

  simplifyTypeHierarchy: ZodCoercedBoolean.default('true'),
  /**
   * Elevate properties that are the same to their superclass.
   */
  elevateProperties: ZodCoercedBoolean.default('true'),
  /**
   * Simplify properties by elevating types that can be made generic in the subclasses.
   */
  generifyTypes: ZodCoercedBoolean.default('true'),
  /**
   * TODO: Deprecated -- remove in favor of using a language feature and only relying on 'generifyTypes' as option
   */
  generificationBoxAllowed: ZodCoercedBoolean.default('true'),
});

export type IncomingModelTransformOptions = z.input<typeof ZodModelTransformOptions>;
export type ModelTransformOptions = z.output<typeof ZodModelTransformOptions>;

export const DEFAULT_MODEL_TRANSFORM_OPTIONS: Readonly<ModelTransformOptions> = ZodModelTransformOptions.parse({});
