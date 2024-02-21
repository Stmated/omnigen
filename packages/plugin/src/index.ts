export * from './PluginManager';
import {plugins} from './EntrypointPlugin';

export default {
  init: () => plugins,
};
