#! /usr/bin/env node

import {Command} from '@commander-js/extra-typings';
import figlet from 'figlet';

console.log(figlet.textSync('Omnigen', 'Chunky'));

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

if (options.ls) {
  console.log(`This is when we should list the inputs and outputs, all registered dynamically`);
}

if (process.argv.length <= 2) {
  program.outputHelp();
}
