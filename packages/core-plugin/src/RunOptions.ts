
/**
 * Take arguments given through the CLI and convert into this typed object.
 * It will then be used to execute the plugin manager, by running the registered plugins.
 * The Plugin Manager will fail if it cannot properly handle the options that were given to it.
 */
export interface RunOptions {

  input: string[];
  output?: string | undefined;
  types: string[];
}
