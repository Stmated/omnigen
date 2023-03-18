/**
 * Interface which describes an input.
 *
 * These inputs will be sent along to the next step in the pipeline.
 */
export interface SerializedInput {

  absolutePath: string;

  contentString: string;
}
