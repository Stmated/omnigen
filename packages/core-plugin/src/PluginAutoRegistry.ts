import {Plugin} from './Plugin';

interface PluginRegistryStore {

  plugins: Plugin[];
}

const GLOBAL_PLUGIN_STORE_KEY = '__omnigen_plugin_registry_store__';

export class PluginAutoRegistry {

  private static _store: PluginRegistryStore | undefined = undefined;

  public static register(plugin: Plugin): void {

    if (!this._store) {
      const globalRecords = (global as Record<string, any>);
      this._store = (globalRecords[GLOBAL_PLUGIN_STORE_KEY] as PluginRegistryStore) ?? {plugins: []};
    }

    if (this._store.plugins.find(it => it.name == plugin.name)) {
      console.log(`There is already a plugin auto-registered as '${plugin.name}'`);
      return;
    }

    this._store.plugins.push(plugin);
  }

  public static getGlobalAutoPlugins(): Plugin[] {
    return [...(this._store?.plugins ?? [])];
  }
}
