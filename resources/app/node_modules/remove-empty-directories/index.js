'use strict';

var file = require('file');
var efs = require('extfs');

var remove = function(path) {
  var folders = [];
  var removed = [];

  file.walkSync(path, function(dir) {
    if (dir.length) {
      folders.push(dir);
    }
  });

  folders = folders.reverse();
  folders.pop(); //dont remove main folder

  folders.forEach(function(dir) {
    var empty = efs.isEmptySync(dir);
    if (empty) {
      efs.rmdirSync(dir);
      removed.push(dir);
    }
  });

  return removed;

};

module.exports = remove;
