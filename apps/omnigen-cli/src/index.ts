#! /usr/bin/env node
'use strict';

import {LoggerFactory} from '@omnigen/core-log';
import {Command} from '@commander-js/extra-typings';
import {BaseContext, FileContext} from '@omnigen/core-plugin';
import {PluginManager} from '@omnigen/plugin';

import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {OpenApiPlugins} from '@omnigen/parser-openapi';
import {OpenRpcPlugins} from '@omnigen/parser-openrpc';
import {JavaPlugins} from '@omnigen/target-java';
import {TypeScriptPlugins} from '@omnigen/target-typescript';
import {CSharpPlugins} from '@omnigen/target-csharp';
import {CorePlugins} from '@omnigen/core';

import figlet from 'figlet';
// @ts-ignore
import chunky from 'figlet/importable-fonts/Chunky.js';

LoggerFactory.enablePrettyPrint();
LoggerFactory.consumeDebug();

const logger = LoggerFactory.create(import.meta.url);

try {
  figlet.parseFont('Chunky', chunky);
  logger.info(`\n${figlet.textSync('Omnigen', 'Chunky')}`);
} catch (ex) {
  logger.info(`Omnigen`);
}

console.log(`Loaded: ${[CorePlugins, JsonSchemaPlugins, OpenApiPlugins, OpenRpcPlugins, JavaPlugins, TypeScriptPlugins, CSharpPlugins].length} plugins`);

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
    args['file'] = options.input[0];
  } else {
    args['file'] = options.input.join(',');
  }

  args['outputDirBase'] = options.output;
  if (options.output) {
    args['outputFiles'] = 'true';
  }

  const startTime = new Date();
  const runOptions: BaseContext & FileContext = {
    arguments: args,
    file: args['file'],
  };

  if (options.plugins) {
    for (const plugin of options.plugins) {
      console.log(`Importing plugin ${plugin}`);
      await pluginManager.importPlugin({
        packageName: plugin,
      });
    }

    const registered = pluginManager.getPlugins().map(it => it.name).join(', ');
    logger.info(`Plugins registered: [${registered}]`);
  } else {

    const registered = pluginManager.getPlugins().map(it => it.name).join(', ');
    logger.debug(`Will not import any plugins, will execute based on those already auto-registered: [${registered}]`);
  }

  const execution = await pluginManager.execute({ctx: runOptions, debug: true});

  const stopTime = new Date();
  const timeTaken = stopTime.getTime() - startTime.getTime();
  logger.info(`Execution finished in ${timeTaken}ms: %o`, Object.keys(execution.result.ctx));

  process.exit(0);

  if (options.ls) {
    logger.info(`This is when we should list the inputs and outputs, all registered dynamically`);
  }
})();
