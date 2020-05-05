'use strict';

const { bold } = require('chalk');
const { promises: { readFile, writeFile, rename, access }, constants: { F_OK } } = require('fs'); // node 11+ required
const { normalize, join } = require('path');
const glob = require('glob');

class MydayRenameApp {

  static APP_ID_REGEX = /^([a-z][a-z0-9]+)\.([a-z][a-z0-9]+)$/;

  /**
   * Utility to rename apps on myday platform
   *
   * @param {Object} options Deployment options
   * @param {string} options.path Path to the application directory that ends with existing app ID and contains app.json
   * @param {string} options.appId New application ID, e.g. `tenantalias.appname`
   * @param {boolean} options.verbose Verbose mode (additional output)
   * @param {boolean} options.silent Silent mode (disable output)
   * @param {boolean} options.dryRun Dry run, does not upload the app
   */
  constructor({ path, appId, verbose, silent, dryRun }) {

    // Working directory
    this.oldDir = normalize(path);

    // Old app ID parts
    const parts = this.oldDir.split('/');
    this.oldFull = parts[parts.length - 1];

    // Make sure old app ID is valid
    const oldMatch = this.oldFull.match(MydayRenameApp.APP_ID_REGEX);
    if (!oldMatch) throw new Error(`Path does not end with a valid app ID: ${this.oldFull}`);

    // Extract tenant alias and application name parts out of the ID
    this.oldTenantAlias = oldMatch[1];
    this.oldAppName = oldMatch[2];

    // New app ID parts
    this.newFull = appId.toLowerCase();

    // Make sure new app ID is valid
    const newMatch = this.newFull.match(MydayRenameApp.APP_ID_REGEX);
    if (!newMatch) throw new Error(`New app ID is not valid ${this.newFull}`);

    // Extract tenant alias and application name parts out of the ID
    this.newTenantAlias = newMatch[1];
    this.newAppName = newMatch[2];

    // Target directory after all file/directory rename operations are done
    this.newDir = this.oldDir.replace(this.oldFull, this.newFull);

    // Additional CLI options
    const noop = () => {};
    this.verboseLog = verbose ? console.log : noop;
    this.log = !silent ? console.log : noop;
    this.dryRun = dryRun;
  }

  /**
   * Asynchronous version for node glob
   *
   * @param {string} pattern Pattern passed down to Glob
   * @param {Object} options Options passed down to Glob
   * @returns {Promise<string[]>} List of matches
   */
  async globAsync(pattern, options) {
    return new Promise((res, rej) => {
      glob(pattern, options, (err, matches) => {
        if (err) rej(err);
        else res(matches);
      });
    });
  }

  /**
   * Transform first character of the string to uppercase
   *
   * @param {string} input Input string
   * @returns {string} Transformed string
   */
  title(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  /**
   * @typedef {Object} Pattern
   * @property {RegExp} regex Regex pattern to search with
   * @property {string} replacement Replacement string to replace a match with
   */

  /**
   * Generate a set of regex search patterns and string replacements for them
   * @returns {Pattern[]} List of patterns and replacements
   */
  generatePatterns() {

    const oldWithDot = `${this.oldTenantAlias}\\.${this.oldAppName}`;
    const newWithDot = `${this.newTenantAlias}.${this.newAppName}`;

    const oldWithDash = `${this.oldTenantAlias}-${this.oldAppName}`;
    const newWithDash = `${this.newTenantAlias}-${this.newAppName}`;

    const oldCapitalizedTenantAlias = this.title(this.oldTenantAlias);
    const oldCapitalizedAppName = this.title(this.oldAppName);
    const newCapitalizedTenantAlias = this.title(this.newTenantAlias);
    const newCapitalizedAppName = this.title(this.newAppName);

    const oldTitleCase = oldCapitalizedTenantAlias + oldCapitalizedAppName;
    const newTitleCase = newCapitalizedTenantAlias + newCapitalizedAppName;

    const oldCamelCase = this.oldTenantAlias + oldCapitalizedAppName;
    const newCamelCase = this.newTenantAlias + newCapitalizedAppName;

    return [
      { regex: new RegExp(oldWithDot, 'g'), replacement: newWithDot }, // tenantalias.appname
      { regex: new RegExp(oldWithDash, 'g'), replacement: newWithDash }, // tenantalias-appname
      { regex: new RegExp(oldTitleCase, 'g'), replacement: newTitleCase }, // TenantaliasAppnameCtrl
      { regex: new RegExp(oldCamelCase, 'g'), replacement: newCamelCase }, // tenantaliasAppnameDirective
    ];
  }

  /**
   * Replace one app ID with another within a given file by path
   *
   * @param {string} path File path
   * @param {Pattern[]} patterns List of patterns
   * @returns {Promise<void>}
   */
  async rewrite(path, patterns) {

    this.verboseLog(` - ${path}`);

    // Get full path to the file
    const fullPath = normalize(join(this.oldDir, path));

    // Prepare new full path for replacements
    let newPath = path;

    // Read current file contents
    let content = await readFile(fullPath, 'utf-8');

    // Iterate over all search/replace patterns
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];

      // Replace occurrences of a given pattern in file contents
      content = content.replace(pattern.regex, pattern.replacement);

      // Replace occurrences of a given pattern in file path
      newPath = newPath.replace(pattern.regex, pattern.replacement);
    }

    // Write content back to the same file
    if (!this.dryRun) {
      await writeFile(fullPath, content, 'utf-8');
    }

    // If file name has to change, rename the file
    if (!this.dryRun && path !== newPath) {
      await rename(fullPath, normalize(join(this.oldDir, newPath)));
    }
  }

  /**
   * Initialise all tasks
   */
  async start() {

    this.verboseLog(`\nStarting with following configuration:
      old path:   ${bold(this.oldDir)}
      new path:   ${bold(this.newDir)}
      old app ID: ${bold(this.oldFull)} (org ${bold(this.oldTenantAlias)}, app ${bold(this.oldAppName)})
      new app ID: ${bold(this.newFull)} (org ${bold(this.newTenantAlias)}, app ${bold(this.newAppName)})`.replace(/\n\s{6}/g, '\n - ')
    );

    // Make sure that `app.json` manifest exists in the source location
    await access(normalize(join(this.oldDir, 'app.json')), F_OK);

    // Generate regex search patterns and replacements for them
    const patterns = this.generatePatterns();

    // Prepare verbose output of all regex patterns
    const patternsOutput = patterns.map(x => `${bold(x.regex)} -> ${bold(x.replacement)}`).join(`\n      `);
    this.verboseLog(`\nUsing the following regex patterns:
      ${patternsOutput}`.replace(/\n\s{6}/g, '\n - '));

    // Find all files with valid extensions
    const paths = await this.globAsync('**/*.{json,html,css,js,ts}', {
      nodir: true,
      cwd: this.oldDir
    });

    this.verboseLog(`\nRewriting the following files:`);

    // Iterate over each file and make amends and/or rename them
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      await this.rewrite(path, patterns);
    }

    // If a dry run was selected, finish here
    if (this.dryRun) {
      return this.log(`\nDry run, quitting.`);
    }

    // Rename the entire application directory
    await rename(this.oldDir, this.newDir);

    this.log(`\nSuccessfully renamed ${bold(this.oldFull)} app to ${bold(this.newFull)}.`);
  }
}

module.exports = MydayRenameApp;
