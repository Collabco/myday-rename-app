# @collabco/myday-rename-app

[![npm-version](https://img.shields.io/npm/v/@collabco/myday-rename-app)](https://www.npmjs.com/package/@collabco/myday-rename-app) [![node-version](https://img.shields.io/node/v/@collabco/myday-rename-app)](https://nodejs.org) [![dependencies](https://img.shields.io/librariesio/release/npm/@collabco/myday-rename-app)](https://github.com/Collabco/myday-rename-app/blob/master/package.json)

[![myday](./myday.png)]((https://myday.collabco.com))

Utility to rename apps on [myday](https://myday.collabco.com) platform, by [Collabco](https://collabco.com). This will replace app IDs (e.g. `tenantalias.appname`) from one to another across all files and filenames.

## Command Line Interface

To start using CLI, install the module globally:

```bash
npm install --global @collabco/myday-rename-app
```

Usage:

```bash
myday-rename-app [options]
```

Use [`npx`](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) to run it anywhere, for example in CI/CD pipelines:
```bash
npx @collabco/myday-rename-app [options]
```

Example usage:

```bash
myday-rename-app \
  --path "../myday-apps-example/tenantalias.appname" \
  --appId "differentalias.differentname" \
  --verbose \
  --dryRun
```


## Node Interface

To start using Node interface, install the module locally:

```bash
npm install --save-dev @collabco/myday-rename-app
```

Usage:

```js
const MydayRenameApp = require('@collabco/myday-rename-app');

const config = {
  path: '../myday-apps-example/tenantalias.appname',
  appId: 'differentalias.differentname',
  verbose: true,
  dryRun: true
};

const instance = new MydayRenameApp(config).start();
```

## Configuration

App options:
- `path` _(required)_: Path to the application folder that contains app.json
- `appId` _(required)_: New application ID, e.g. `tenantalias.appname`

Additional options:
- `verbose` _(optional)_: Verbose mode (additional output)
- `silent` _(optional)_: Silent mode (disable output)
- `dryRun` _(optional)_: Dry run, does not rename the app

CLI only options:
- `help`: Displays help
- `version`: Displays package version
