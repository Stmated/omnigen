import {Plugin2} from './Plugin2.ts';

interface PluginRegistryStore {
  plugins: Plugin2[];
}

const GLOBAL_PLUGIN_STORE_KEY = '__omnigen_plugin_registry_store__';

export type PluginOrPlugins = Plugin2 | Plugin2[];

export class PluginAutoRegistry {

  private static _store: PluginRegistryStore | undefined = undefined;

  public static register<P extends PluginOrPlugins>(plugins: P): P {

    if (!this._store) {
      const globalRecords = (global as Record<string, any>);
      this._store = (globalRecords[GLOBAL_PLUGIN_STORE_KEY] as PluginRegistryStore) ?? {plugins: []};
    }

    if (!Array.isArray(plugins)) {
      PluginAutoRegistry.registerInternal(this._store, plugins);
    } else {

      for (let i = 0; i < plugins.length; i++) {
        plugins[i] = PluginAutoRegistry.registerInternal(this._store, plugins[i]);
      }
    }

    return plugins;
  }

  private static registerInternal<P extends Plugin2>(store: PluginRegistryStore, plugin: P): P {

    const found = store.plugins.find(it => it.name == plugin.name);
    if (found) {
      throw new Error(`There is already a plugin auto-registered as '${plugin.name}'`);
    }

    store.plugins.push(plugin);

    return plugin;
  }

  public static getGlobalAutoPlugins(): Plugin2[] {
    return [...(this._store?.plugins ?? [])];
  }
}
