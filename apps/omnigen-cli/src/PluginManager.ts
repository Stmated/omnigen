import {Plugin, PluginInitializer, PluginQualifier, PluginInitializationResult} from '@omnigen/core-plugin';

interface RegisteredPlugin {
  qualifier: PluginQualifier;
  plugin: Plugin;
  result: PluginInitializationResult;
}

export class PluginManager {

  private readonly _plugins = new Map<string, RegisteredPlugin>();

  public async registerPlugin(qualifier: PluginQualifier): Promise<PluginInitializationResult> {

    if (!qualifier.name) {
      qualifier.name = qualifier.packageName;
    }

    if (!qualifier.name || !qualifier.packageName) {
      return Promise.reject(new Error('The plugin name and package are required'));
    }

    if (this._plugins.has(qualifier.name)) {
      return Promise.reject(new Error(`Cannot add existing plugin ${qualifier.name}`));
    }

    try {

      // Try to load the plugin
      const packageContents = await import(qualifier.packageName);
      if ('init' in packageContents) {

        const init = packageContents.init;
        if (typeof init == 'function') {

          const initMethod = init as PluginInitializer;
          const initResult = initMethod({
            qualifier: qualifier,
            args: {

            },
          });

          if (initResult) {

            // Wrong, but a step on the way!
            this._plugins.set(qualifier.name, {
              qualifier: qualifier,
              result: initResult,
              plugin: {
                init: initMethod,
              },
            });

            return Promise.resolve(initResult);
          }

        } else {
          return Promise.reject(new Error(`Imported 'init' member must be a function`));
        }
      } else {
        return Promise.reject(new Error(`There is no 'init' exported member inside imported package '${qualifier.packageName}'`));
      }

    } catch (error) {
      return Promise.reject(new Error(`Cannot load plugin ${qualifier.name}: ${error}`));
    }

    return Promise.reject(new Error(`Unknown error trying to register plugin '${qualifier.packageName ?? qualifier.name ?? '?'}`));
  }
}
