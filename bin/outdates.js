#!/usr/bin/env node


'use strict';


const fs = require('fs');
const pathUtil = require('path');
const fmt = require('util').format;
const urllib = require('urllib');
const co = require('co');
const semver = require('semver');

const program = require('commander');


/* eslint no-console: 0 */


program
  .version(require('../package.json').version)
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

  const registry = (info.publishConfig || {}).registry ||
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

    let message = left(name, 40) + left(version, 10) + left(rversion || 'unknow', 10);

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


function left(str, len) {
  const n = len - str.length;
  if (n > 0) {
    str += line(' ', n);
  }
  return str;
}


function center(str, len) {
  const n = (len - str.length) >> 1;    // eslint-disable-line
  return line(' ', n) + str + line(' ', len - str.length - n);
}


function line(char, num) {
  const list = [];
  list.length = num + 1;
  return list.join(char);
}


function red(msg) {
  return fmt('\u001b[31m%s\u001b[39m', msg);
}


function yellow(msg) {
  return fmt('\u001b[33m%s\u001b[39m', msg);
}

