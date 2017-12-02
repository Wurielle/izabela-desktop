#!/usr/bin/env node
'use strict';

var fs = require('fs');
var pkg = require('./package.json');
var remove = require('./index');
var input = process.argv[2];

function help() {
  console.log(pkg.description);
  console.log('');
  console.log('Usage:');
  console.log('  $ remove-directories --public');
  console.log('  $ remove-directories --public/foo');
}

function init() {
  var path = input.replace(/^--/, '');
  var removed = remove(path);
  console.log(removed.length + ' directories removed.');
}

if (process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
  help();
  return;
}

if (process.argv.indexOf('-v') !== -1 || process.argv.indexOf('--version') !== -1) {
  console.log(pkg.version);
  return;
}

init();
