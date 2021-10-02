#!/usr/bin/env node

'use strict'

const fs = require('fs')

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
const supportsColor = require('supports-color')
if (supportsColor.stdout) {
  process.env.FORCE_COLOR = supportsColor.stdout.level.toString()
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {})

const pkg = require('../package.json')
require('please-upgrade-node')(
  Object.assign({}, pkg, {
    engines: {
      node: '>=12.13.0', // First LTS release of 'Erbium'
    },
  })
)

const { Command, Option } = require('commander')
const debugLib = require('debug')
const lintStaged = require('../lib')
const { CONFIG_STDIN_ERROR } = require('../lib/messages')

const debug = debugLib('lint-staged:bin')

const program = new Command('lint-staged')

program.version(pkg.version)

program
  .option('--allow-empty', 'allow empty commits when tasks revert all staged changes', false)
  .option('-c, --config [path]', 'path to configuration file, or - to read from stdin')
  .option('-d, --debug', 'print additional debug information', false)
  .option('--no-reset', 'do not reset changes in case of errors', false)
  .option(
    '-p, --concurrent <parallel tasks>',
    'the number of tasks to run concurrently, or false to run tasks serially',
    true
  )
  .option('-q, --quiet', 'disable lint-staged’s own console output', false)
  .option('-r, --relative', 'pass relative filepaths to tasks', false)
  .option('-x, --shell [path]', 'skip parsing of tasks for better shell support', false)
  .option(
    '-v, --verbose',
    'show task output even when tasks succeed; by default only failed output is shown',
    false
  )

// Added for backwards-compatibility
program.addOption(new Option('--no-stash').hideHelp())

program.parse(process.argv)

if (program.debug) {
  debugLib.enable('lint-staged*')
}

debug('Running `lint-staged@%s`', pkg.version)

/**
 * Get the maximum length of a command-line argument string based on current platform
 *
 * https://serverfault.com/questions/69430/what-is-the-maximum-length-of-a-command-line-in-mac-os-x
 * https://support.microsoft.com/en-us/help/830473/command-prompt-cmd-exe-command-line-string-limitation
 * https://unix.stackexchange.com/a/120652
 */
const getMaxArgLength = () => {
  switch (process.platform) {
    case 'darwin':
      return 262144
    case 'win32':
      return 8191
    default:
      return 131072
  }
}

const programOpts = program.opts()

const options = {
  allowEmpty: !!programOpts.allowEmpty,
  concurrent: JSON.parse(programOpts.concurrent),
  configPath: programOpts.config,
  debug: !!programOpts.debug,
  maxArgLength: getMaxArgLength() / 2,
  quiet: !!programOpts.quiet,
  relative: !!programOpts.relative,
  reset: !!programOpts.reset, // commander inverts `no-<x>` flags to `!x`
  shell: programOpts.shell /* Either a boolean or a string pointing to the shell */,
  stash: programOpts.stash /** kept for backwards-compatibility */,
  verbose: !!programOpts.verbose,
}

debug('Options parsed from command-line:', options)

if (options.configPath === '-') {
  delete options.configPath
  try {
    options.config = fs.readFileSync(process.stdin.fd, 'utf8').toString().trim()
  } catch {
    console.error(CONFIG_STDIN_ERROR)
    process.exit(1)
  }

  try {
    options.config = JSON.parse(options.config)
  } catch {
    // Let config parsing complain if it's not JSON
  }
}

lintStaged(options)
  .then((passed) => {
    process.exitCode = passed ? 0 : 1
  })
  .catch(() => {
    process.exitCode = 1
  })
