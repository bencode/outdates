#!/usr/bin/env node


'use strict';


const fs = require('fs');
const pathUtil = require('path');
const urllib = require('urllib');
const fmt = require('output-formatter');
const co = require('co');
const semver = require('semver');

const program = require('commander');

// alias
const left = fmt.left;
const center = fmt.center;
const line = fmt.line;
const red = fmt.red;
const yellow = fmt.yellow;


/* eslint no-console: 0 */


program
  .version(require('../package.json').version)
  .option('-r, --registry [url]',
      'registry host, use http://registry.npmjs.com for default', '')
  .parse(process.argv);


let baseDir = program.args[0];
baseDir = baseDir ? pathUtil.resolve(baseDir) : process.cwd();

run(baseDir);


function run(root) {
  const path = pathUtil.join(root, 'package.json');
  if (!fs.existsSync(path)) {
    console.log(red(`can not find package.json in ${path}`));
    return;
  }

  const info = require(path);

  const registry = program.registry ||
      (info.publishConfig || {}).registry ||
      'http://registry.npmjs.com';

  console.log('request package info from: %s\n', registry);

  const deps = info.dependencies || {};
  const ddeps = info.devDependencies || {};

  co(function* () {
    yield* lookup('dependencies', registry, deps);
    yield* lookup('devDependencies', registry, ddeps);
  }).catch(e => {
    console.error(e.stack);
  });
}


function* lookup(title, registry, deps) {
  console.log(center(title, 60));
  console.log(line('-', 60));
  console.log(left('name', 40) + left('version', 10) + left('latest', 10));
  console.log(line('-', 60));

  for (const name in deps) {
    const version = deps[name];
    const rinfo = yield* getPkgInfo(registry, name);
    const rversion = (rinfo['dist-tags'] || {}).latest;

    let message = left(name, 40) + left(version, 10) +
        left(rversion || 'unknow', 10);

    if (!rversion || !semver.satisfies(rversion, version)) {
      message = yellow(message);
    }
    console.log(message);
  }

  console.log('');
}


function* getPkgInfo(registry, name) {
  const url = registry + '/' + name;
  const result = yield urllib.request(url);
  return JSON.parse(result.data.toString());
}
