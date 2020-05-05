#!/usr/bin/env node
'use strict';

const MydayDeployApp = require('./index');
const argv = require('yargs')
  .usage('Usage: $0 [options]')

  .group(['path', 'appId'], 'App options:')
  .option('path', { describe: 'Path to the application folder that contains app.json', demandOption: true, requiresArg: true })
  .option('appId', { describe: 'New application ID, e.g. `tenantalias.appname`', demandOption: true, requiresArg: true })

  .option('verbose', { describe: 'Verbose mode (additional output)', type: 'boolean', conflicts: 'silent' })
  .option('silent', { describe: 'Silent mode (disable output)', type: 'boolean', conflicts: 'verbose' })
  .option('dryRun', { describe: 'Dry run, does not rename the app', type: 'boolean' })

  .epilogue('For more information contact Collabco Support.')
  .argv;

const instance = new MydayDeployApp(argv).start();
