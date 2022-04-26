#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { Option, program } from 'commander'
import debug from 'debug'
import supportsColor from 'supports-color'

import lintStaged from '../lib/index.js'
import { CONFIG_STDIN_ERROR } from '../lib/messages.js'

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
if (supportsColor.stdout) {
  process.env.FORCE_COLOR = supportsColor.stdout.level.toString()
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {})

const packageJsonPath = path.join(fileURLToPath(import.meta.url), '../../package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))
const version = packageJson.version

const debugLog = debug('lint-staged:bin')
debugLog('Running `lint-staged@%s`', version)

const lintStagedCli = program.version(version)

lintStagedCli.option(
  '--allow-empty',
  'allow empty commits when tasks revert all staged changes',
  false
)

lintStagedCli.option(
  '-p, --concurrent <number|boolean>',
  'the number of tasks to run concurrently, or false for serial',
  true
)

lintStagedCli.option('-c, --config [path]', 'path to configuration file, or - to read from stdin')

lintStagedCli.option('--cwd [path]', 'run all tasks in specific directory, instead of the current')

lintStagedCli.option('-d, --debug', 'print additional debug information', false)

lintStagedCli.option('--max-arg-length', 'maximum length of the command-line argument string')

/**
 * We don't want to show the `--stash` flag because it's on by default, and only show the
 * negatable flag `--no-stash` in stead. There seems to be a bug in Commander.js where
 * configuring only the latter won't actually set the default value.
 */
lintStagedCli
  .addOption(
    new Option('--stash', 'enable the backup stash, and revert in case of errors')
      .default(true)
      .hideHelp()
  )
  .addOption(
    new Option(
      '--no-stash',
      'disable the backup stash, and do not revert in case of errors'
    ).default(false)
  )

lintStagedCli.option('-q, --quiet', 'disable lint-staged’s own console output', false)

lintStagedCli.option('-r, --relative', 'pass relative filepaths to tasks', false)

lintStagedCli.option('-x, --shell [path]', 'skip parsing of tasks for better shell support', false)

lintStagedCli.option(
  '-v, --verbose',
  'show task output even when tasks succeed; by default only failed output is shown',
  false
)

const lintStagedCliOptions = lintStagedCli.parse(process.argv).opts()

if (lintStagedCliOptions.debug) {
  debug.enable('lint-staged*')
}

const options = {
  allowEmpty: !!lintStagedCliOptions.allowEmpty,
  concurrent: JSON.parse(lintStagedCliOptions.concurrent),
  configPath: lintStagedCliOptions.config,
  cwd: lintStagedCliOptions.cwd,
  debug: !!lintStagedCliOptions.debug,
  maxArgLength: JSON.parse(lintStagedCliOptions.maxArgLength || null),
  quiet: !!lintStagedCliOptions.quiet,
  relative: !!lintStagedCliOptions.relative,
  shell: lintStagedCliOptions.shell /* Either a boolean or a string pointing to the shell */,
  stash: !!lintStagedCliOptions.stash, // commander inverts `no-<x>` flags to `!x`
  verbose: !!lintStagedCliOptions.verbose,
}

debugLog('Options parsed from command-line:', options)

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
