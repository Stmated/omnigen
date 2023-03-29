#! /usr/bin/env node

import {Command} from '@commander-js/extra-typings';
import figlet from 'figlet';
import {PluginManager} from './PluginManager.js';
import {RunOptions} from '@omnigen/core';

console.log(figlet.textSync('Omnigen', 'Chunky'));

(async () => {

  const program = new Command();
  const options = program
    .version('1.0.0')
    .description('Node CLI for running Omnigen')
    .option('-l, --ls', 'List all available inputs and output')
    .option('-p, --plugins <value...>', 'Set root directories/file paths for plugin discovery')
    .option('-a, --allow', 'Set allowed filename pattern for plugin discovery', '.*')
    .option('-d, --disallow', 'Set disallowed filename pattern for plugin discovery')
    .option('-i, --input <value...>', 'Specify input schemas or configuration file(s)')
    .option('-o, --output <value>', 'Output dir')
    .option('-t, --types <value...>', 'Output type(s). If none, then uses first suitable plugin')
    .option('-v, --verbose', 'Write extra logs while processing')
    .parse(process.argv)
    .showHelpAfterError()
    .opts();

  const pluginManager = new PluginManager();

  if (options.verbose) {
    console.table(options);
  }

  const runOptions: RunOptions = {
    types: options.types ?? [],
    input: options.input ?? ['.'],
    output: options.output ?? undefined,
  };

  if (options.plugins) {
    for (const plugin of options.plugins) {
      console.log(`Importing plugin ${plugin}`);
      await pluginManager.importPlugin({
        packageName: plugin,
      });
    }

    const pipelines = pluginManager.execute(runOptions);
    console.table(pipelines);
  }

  if (options.ls) {
    console.log(`This is when we should list the inputs and outputs, all registered dynamically`);
  }

  if (process.argv.length <= 2) {
    program.outputHelp();
  }
})();
