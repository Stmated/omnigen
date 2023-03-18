import {PluginHook, PluginHookCreator, PluginAutoRegistry} from '@omnigen/core-plugin';
import {JavaRenderer} from './render/index.js';
import {JavaInterpreter} from './interpret/index.js';
import {InterfaceJavaModelTransformer} from './parse/index.js';

const init: PluginHookCreator = options => {
  console.log('Init');

  const hook: PluginHook = {
    afterParse: (runOptions, builder) => {

      // TODO:
      //  * Ability to add "File Loaders" that can parse different incoming paths -- which plugins can add to
      //  * Ability to add "Parsers" that can load the files that were loaded -- also dynamically through plugins
      //  * Ability of setting priority to the different plugins so the loaders/parsers are loaded earlier/later
      //  * The resulting plugin investigation should be a tree of pipelines that can diverge after certain steps!
      //  * It must be possible to EASILY extend only what you want extended.
      //    * For example the "InterfaceJavaModelTransformer" must ONLY run if the interpreter will be "Java"
      //  * Either the options given to the hook creator says the input and we decide from that...
      //      Or we could actually decide that during runtime/lazily with the help of the builder? Like stream filters

      // We then need to make sure this can be ran with and without the CLI, and make it work smoothly!
      // Then we can actually start using this code in example projects! :D

      if (!runOptions.types.includes('java')) {
        return;
      }

      builder
        .fork()
        .withModelTransformer(opt => new InterfaceJavaModelTransformer())
        .thenInterpret(opt => new JavaInterpreter())
        .thenRender(opt => new JavaRenderer(opt, rcu => {
          console.log(`Rendered`);
          console.table(rcu);
        }));
    },
  };

  return hook;
};

PluginAutoRegistry.register({
  name: 'java',
  init: init,
});

export {init};
