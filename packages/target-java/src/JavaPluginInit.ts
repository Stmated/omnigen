import {PipelineCustomizer, PluginHookCreator, PluginAutoRegistry} from '@omnigen/core-plugin';
import {JavaInterpreter} from './interpret';
import {InterfaceJavaModelTransformer} from './parse';

const init: PluginHookCreator = options => {
  console.log('Init');

  const hook: PipelineCustomizer = {
    afterParse: pipeline => {

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

      if (!pipeline.run.types.includes('java')) {
        return pipeline;
      }

      if (!pipeline.modelTransformers) {
        pipeline.modelTransformers = [];
      }
      pipeline.modelTransformers.push(new InterfaceJavaModelTransformer());

      if (!pipeline.interpreter) {
        pipeline.interpreter = new JavaInterpreter();
      }

      if (pipeline.interpreter instanceof JavaInterpreter) {

        if (!pipeline.renderers) {
          pipeline.renderers = [];
        }

        // pipeline.renderers.push(new JavaRenderer(opt, rcu => {
        //
        // });
      }

      // builder
      //   .fork()
      //   .withModelTransformer(opt => new InterfaceJavaModelTransformer())
      //   .thenInterpret(opt => new JavaInterpreter())
      //   .thenRender(opt => new JavaRenderer(opt, rcu => {
      //     console.log(`Rendered`);
      //     console.table(rcu);
      //   }));

      return pipeline;
    },
  };

  return hook;
};

PluginAutoRegistry.register({
  name: 'java',
  init: init,
});

export {init};
