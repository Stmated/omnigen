#! /usr/bin/env node

import {Command} from '@commander-js/extra-typings';
import figlet from 'figlet';
import {BaseContext} from '@omnigen/core-plugin';
import {PluginManager} from '@omnigen/plugin';

console.log(figlet.textSync('Omnigen', 'Chunky'));

(async () => {

  const program = new Command();
  const options = program
    .version('1.0.0')
    .description('Node CLI for running Omnigen')
    .option('-l, --ls', 'List all available inputs and output')
    .option('-p, --plugins <value...>', 'Set root directories/file paths for plugin discovery, as globs')
    // .option('-a, --allow', 'Set allowed filename pattern for plugin discovery', '.*')
    // .option('-d, --disallow', 'Set disallowed filename pattern for plugin discovery')
    .requiredOption('-i, --input <value...>', 'Specify input schemas or configuration file(s)')
    .requiredOption('-o, --output <value>', 'Output dir')
    .option('-t, --types <value...>', 'Output type(s). If none, then uses first suitable plugin')
    .option('-v, --verbose [enabled]', 'Enable extra logs while processing')
    .option('-a, --args <args...>', 'Extra arguments that will be used by system and plugins, in key=value form')
    .parse(process.argv)
    .showHelpAfterError()
    .opts();

  const pluginManager = new PluginManager();

  if (options.verbose) {
    console.table(options);
  }

  // TODO: Maybe possible to make plugin able to register their arguments?
  //        And prepend them with something? Or should design rely on their being no duplicate keys allowed?
  const args: Record<string, string> = {};
  for (const [key, value] of (options.args ?? []).map(it => it.split('='))) {
    args[key] = value;
  }

  if (options.types) {
    if (options.types.length == 1) {
      args['target'] = options.types[0];
    } else if (options.types.length > 1) {
      args['targets'] = options.types.join(',');
    }
  }

  if (options.input.length == 1) {
    args['input'] = options.input[0];
  } else {
    args['input'] = options.input.join(',');
  }

  args['output'] = options.output;

  const runOptions: BaseContext = {
    arguments: args,
  };

  if (options.plugins) {
    for (const plugin of options.plugins) {
      console.log(`Importing plugin ${plugin}`);
      await pluginManager.importPlugin({
        packageName: plugin,
      });
    }

    const statuses = await pluginManager.execute({ctx: runOptions});
    console.table(statuses);
  }

  if (options.ls) {
    console.log(`This is when we should list the inputs and outputs, all registered dynamically`);
  }
})();
