var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var extfs = {};

/**
 * Get all the directories inside a directory
 *
 * @param {string} searchPath
 * @param {Function} cb
 */
extfs.getDirs = function (searchPath, cb) {
  fs.readdir(searchPath, function (err, files) {
    if (err) {
      return cb(err);
    }
    var arrDirs = [];
    files.forEach(function (item) {
      var stat;
      try {
        stat = fs.statSync(path.join(searchPath, item));
      } catch (e) { }
      if (stat && stat.isDirectory()) {
        arrDirs.push(item);
      }
    });
    return cb(null, arrDirs);
  });
};

/**
 * Returns all the directories inside a directory synchronously
 *
 * @param {string} searchPath
 * @returns {Array}
 */
extfs.getDirsSync = function (searchPath) {
  var files = fs.readdirSync(searchPath);
  var arrDirs = [];
  files.forEach(function (item) {
    var stat;
    try {
      stat = fs.statSync(path.join(searchPath, item));
    } catch (e) { }
    if (stat && stat.isDirectory()) {
      arrDirs.push(item);
    }
  });
  return arrDirs;
};

/**
 * Check if a file or directory is empty
 *
 * @param {string} searchPath
 * @param {Function} cb
 */
extfs.isEmpty = function (searchPath, cb) {
  fs.stat(searchPath, function (err, stat) {
    if (err) {
      return cb(true);
    }
    if (stat.isDirectory()) {
      fs.readdir(searchPath, function (err, items) {
        if (err) {
          return cb(true);
        }
        cb(!items || !items.length);
      });
    } else {
      fs.readFile(searchPath, function (err, data) {
        if (err) {
          cb(true);
        }
        cb(!data || !data.length)
      });
    }
  });
};

/**
 * Check if a file or directory is empty synchronously
 *
 * @param {string} searchPath
 */
extfs.isEmptySync = function (searchPath) {
  try {
    var stat = fs.statSync(searchPath);
  } catch (e) {
    return true;
  }
  if (stat.isDirectory()) {
    var items = fs.readdirSync(searchPath);
    return !items || !items.length;
  }
  var file = fs.readFileSync(searchPath);
  return !file || !file.length;
};

/**
 * Remove a path or array of paths
 * If a path is a non empty directory, also removes its content
 *
 * @param {string|Array} paths
 * @param {Function} cb
 */
extfs.remove = function (paths, cb) {
  var searchPath;
  if (!Array.isArray(paths)) {
    paths = [ paths ];
  }

  // if the array is empty, the objectives were removed
  if (!paths.length) {
    return cb(null);
  }

  searchPath = paths.shift();
  fs.lstat(searchPath, function (err, stats) {
    if (err) return cb(err);
    if (stats.isDirectory()) {
      fs.readdir(searchPath, function (err, files) {
        if (err) return cb(err);
        files = files.map(function (file) {
          return path.join(searchPath, file);
        });
        extfs.remove(paths.concat(files), function (err) {
          if (err) return cb(err);
          fs.rmdir(searchPath);
          cb(null);
        });
      });
    } else {
      fs.unlink(searchPath, function (err) {
        if (err) return cb(err);
        extfs.remove(paths, cb);
      });
    }
  });
};

/**
 * Remove a path or array of paths synchronously
 * If a path is a non empty directory, also removes its content
 *
 * @param {string|Array} paths
 */
extfs.removeSync = function (paths) {
  var searchPath;
  if (!Array.isArray(paths)) {
    paths = [ paths ];
  }

  // if the array is empty, the objectives were removed
  if (!paths.length) {
    return;
  }

  searchPath = paths.shift();
  if (fs.lstatSync(searchPath).isDirectory()) {
    fs.readdirSync(searchPath).forEach(function (file) {
      var filePath = path.join(searchPath, file);
      paths.push(filePath);
    });
    extfs.removeSync(paths);
    fs.rmdirSync(searchPath);
  } else {
    fs.unlinkSync(searchPath);
    extfs.removeSync(paths);
  }
};

module.exports = _.extend({}, fs, extfs);