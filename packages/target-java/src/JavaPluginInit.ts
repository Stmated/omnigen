import {PluginAutoRegistry, PluginBoot} from '@omnigen/core-plugin';
import {JavaInterpreter} from './interpret';
import {InterfaceJavaModelTransformer} from './parse';
import {OptionsUtil} from '@omnigen/core-util';
import {DEFAULT_JAVA_OPTIONS, JAVA_OPTIONS_RESOLVER} from './options';
import {JAVA_FEATURES, JavaRenderer} from './index.ts';

const CREATOR: PluginBoot = hook => {

  hook.registerCustomizer({
    afterParse(run, pipeline) {

      // TODO:
      //  * Ability to add "File Loaders" that can parse different incoming paths -- which plugins can add to
      //  * Ability to add "Parsers" that can load the files that were loaded -- also dynamically through plugins
      //  * Ability of setting priority to the different plugins so the loaders/parsers are loaded earlier/later
      //  * The resulting plugin investigation should be a tree of pipelines that can diverge after certain steps!
      //  * It must be possible to EASILY extend only what you want extended.
      //    * For example the "InterfaceJavaModelTransformer" must ONLY run if the interpreter will be "Java"
      //  * Either the options given to the hook creator says the input and we decide from that...
      //      Or we could actually decide that during runtime/lazily with the help of the builder? Like stream filters

      if (!run.types.includes('java')) {
        return;
      }

      pipeline
        .resolveTransformOptionsDefault()
        .withModelTransformer(a => new InterfaceJavaModelTransformer())
        .resolveTargetOptions(a => OptionsUtil.resolve(DEFAULT_JAVA_OPTIONS, a.options, JAVA_OPTIONS_RESOLVER))
        .interpret(a => new JavaInterpreter(a.options, JAVA_FEATURES))
        .render(a => new JavaRenderer(a.options, rcu => {

          // TODO: Remove callback? Should not work this way? Should give back a RenderedResult that contains files?
          console.log(`Rendered`);
          console.table(rcu);
        }));
    },
  });
};

PluginAutoRegistry.register({
  name: 'java',
  init: CREATOR,
});

export default CREATOR;
