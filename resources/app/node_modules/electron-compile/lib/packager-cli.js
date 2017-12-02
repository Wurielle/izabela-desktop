#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.packagerMain = exports.runAsarArchive = exports.packageDirToResourcesDir = undefined;

let packageDirToResourcesDir = exports.packageDirToResourcesDir = (() => {
  var _ref = _asyncToGenerator(function* (packageDir) {
    let appDir = (yield _promise.pfs.readdir(packageDir)).find(function (x) {
      return x.match(/\.app$/i);
    });
    if (appDir) {
      return _path2.default.join(packageDir, appDir, 'Contents', 'Resources', 'app');
    } else {
      return _path2.default.join(packageDir, 'resources', 'app');
    }
  });

  return function packageDirToResourcesDir(_x) {
    return _ref.apply(this, arguments);
  };
})();

let copySmallFile = (() => {
  var _ref2 = _asyncToGenerator(function* (from, to) {
    d(`Copying ${from} => ${to}`);

    let buf = yield _promise.pfs.readFile(from);
    yield _promise.pfs.writeFile(to, buf);
  });

  return function copySmallFile(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();

let compileAndShim = (() => {
  var _ref3 = _asyncToGenerator(function* (packageDir) {
    let appDir = yield packageDirToResourcesDir(packageDir);

    d(`Looking in ${appDir}`);
    for (let entry of yield _promise.pfs.readdir(appDir)) {
      if (entry.match(/^(node_modules|bower_components)$/)) continue;

      let fullPath = _path2.default.join(appDir, entry);
      let stat = yield _promise.pfs.stat(fullPath);

      if (!stat.isDirectory()) continue;

      d(`Executing electron-compile: ${appDir} => ${entry}`);
      yield (0, _cli.main)(appDir, [fullPath]);
    }

    d('Copying in es6-shim');
    let packageJson = JSON.parse((yield _promise.pfs.readFile(_path2.default.join(appDir, 'package.json'), 'utf8')));

    let index = packageJson.main || 'index.js';
    packageJson.originalMain = index;
    packageJson.main = 'es6-shim.js';

    yield copySmallFile(_path2.default.join(__dirname, 'es6-shim.js'), _path2.default.join(appDir, 'es6-shim.js'));

    yield _promise.pfs.writeFile(_path2.default.join(appDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  });

  return function compileAndShim(_x4) {
    return _ref3.apply(this, arguments);
  };
})();

let runAsarArchive = exports.runAsarArchive = (() => {
  var _ref4 = _asyncToGenerator(function* (packageDir, asarUnpackDir) {
    let appDir = yield packageDirToResourcesDir(packageDir);

    let asarArgs = ['pack', 'app', 'app.asar'];
    if (asarUnpackDir) {
      asarArgs.push('--unpack-dir', asarUnpackDir);
    }

    var _findExecutableOrGues = findExecutableOrGuess('asar', asarArgs);

    let cmd = _findExecutableOrGues.cmd,
        args = _findExecutableOrGues.args;


    d(`Running ${cmd} ${JSON.stringify(args)}`);
    yield (0, _spawnRx.spawnPromise)(cmd, args, { cwd: _path2.default.join(appDir, '..') });
    _rimraf2.default.sync(_path2.default.join(appDir));
  });

  return function runAsarArchive(_x5, _x6) {
    return _ref4.apply(this, arguments);
  };
})();

let packagerMain = exports.packagerMain = (() => {
  var _ref5 = _asyncToGenerator(function* (argv) {
    d(`argv: ${JSON.stringify(argv)}`);
    argv = argv.splice(2);

    var _splitOutAsarArgument = splitOutAsarArguments(argv);

    let packagerArgs = _splitOutAsarArgument.packagerArgs,
        asarArgs = _splitOutAsarArgument.asarArgs;

    var _findExecutableOrGues2 = findExecutableOrGuess(electronPackager, packagerArgs);

    let cmd = _findExecutableOrGues2.cmd,
        args = _findExecutableOrGues2.args;


    d(`Spawning electron-packager: ${JSON.stringify(args)}`);
    let packagerOutput = yield (0, _spawnRx.spawnPromise)(cmd, args);
    let packageDirs = parsePackagerOutput(packagerOutput);

    d(`Starting compilation for ${JSON.stringify(packageDirs)}`);
    for (let packageDir of packageDirs) {
      yield compileAndShim(packageDir);

      if (!asarArgs) continue;

      d('Starting ASAR packaging');
      let asarUnpackDir = null;
      if (asarArgs.length === 2) {
        asarUnpackDir = asarArgs[1];
      }

      yield runAsarArchive(packageDir, asarUnpackDir);
    }
  });

  return function packagerMain(_x7) {
    return _ref5.apply(this, arguments);
  };
})();

exports.splitOutAsarArguments = splitOutAsarArguments;
exports.parsePackagerOutput = parsePackagerOutput;
exports.findExecutableOrGuess = findExecutableOrGuess;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

var _promise = require('./promise');

var _cli = require('./cli');

var _spawnRx = require('spawn-rx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:packager');
const electronPackager = 'electron-packager';

function splitOutAsarArguments(argv) {
  if (argv.find(x => x.match(/^--asar-unpack$/))) {
    throw new Error("electron-compile doesn't support --asar-unpack at the moment, use asar-unpack-dir");
  }

  // Strip --asar altogether
  let ret = argv.filter(x => !x.match(/^--asar/));

  if (ret.length === argv.length) {
    return { packagerArgs: ret, asarArgs: null };
  }

  let indexOfUnpack = ret.findIndex(x => x.match(/^--asar-unpack-dir$/));
  if (indexOfUnpack < 0) {
    return { packagerArgs: ret, asarArgs: [] };
  }

  let unpackArgs = ret.slice(indexOfUnpack, indexOfUnpack + 1);
  let notUnpackArgs = ret.slice(0, indexOfUnpack).concat(ret.slice(indexOfUnpack + 2));

  return { packagerArgs: notUnpackArgs, asarArgs: unpackArgs };
}

function parsePackagerOutput(output) {
  // NB: Yes, this is fragile as fuck. :-/
  console.log(output);
  let lines = output.split('\n');

  let idx = lines.findIndex(x => x.match(/Wrote new app/i));
  if (idx < 1) throw new Error(`Packager output is invalid: ${output}`);
  lines = lines.splice(idx);

  // Multi-platform case
  if (lines[0].match(/Wrote new apps/)) {
    return lines.splice(1).filter(x => x.length > 1);
  } else {
    return [lines[0].replace(/^.*new app to /, '')];
  }
}

function findExecutableOrGuess(cmdToFind, argsToUse) {
  var _findActualExecutable = (0, _spawnRx.findActualExecutable)(cmdToFind, argsToUse);

  let cmd = _findActualExecutable.cmd,
      args = _findActualExecutable.args;

  if (cmd === electronPackager) {
    d(`Can't find ${cmdToFind}, falling back to where it should be as a guess!`);
    let cmdSuffix = process.platform === 'win32' ? '.cmd' : '';
    return (0, _spawnRx.findActualExecutable)(_path2.default.resolve(__dirname, '..', '..', '.bin', `${cmdToFind}${cmdSuffix}`), argsToUse);
  }

  return { cmd, args };
}

if (process.mainModule === module) {
  packagerMain(process.argv).then(() => process.exit(0)).catch(e => {
    console.error(e.message || e);
    d(e.stack);

    process.exit(-1);
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYWNrYWdlci1jbGkuanMiXSwibmFtZXMiOlsicGFja2FnZURpciIsImFwcERpciIsInJlYWRkaXIiLCJmaW5kIiwieCIsIm1hdGNoIiwiam9pbiIsInBhY2thZ2VEaXJUb1Jlc291cmNlc0RpciIsImZyb20iLCJ0byIsImQiLCJidWYiLCJyZWFkRmlsZSIsIndyaXRlRmlsZSIsImNvcHlTbWFsbEZpbGUiLCJlbnRyeSIsImZ1bGxQYXRoIiwic3RhdCIsImlzRGlyZWN0b3J5IiwicGFja2FnZUpzb24iLCJKU09OIiwicGFyc2UiLCJpbmRleCIsIm1haW4iLCJvcmlnaW5hbE1haW4iLCJfX2Rpcm5hbWUiLCJzdHJpbmdpZnkiLCJjb21waWxlQW5kU2hpbSIsImFzYXJVbnBhY2tEaXIiLCJhc2FyQXJncyIsInB1c2giLCJmaW5kRXhlY3V0YWJsZU9yR3Vlc3MiLCJjbWQiLCJhcmdzIiwiY3dkIiwic3luYyIsInJ1bkFzYXJBcmNoaXZlIiwiYXJndiIsInNwbGljZSIsInNwbGl0T3V0QXNhckFyZ3VtZW50cyIsInBhY2thZ2VyQXJncyIsImVsZWN0cm9uUGFja2FnZXIiLCJwYWNrYWdlck91dHB1dCIsInBhY2thZ2VEaXJzIiwicGFyc2VQYWNrYWdlck91dHB1dCIsImxlbmd0aCIsInBhY2thZ2VyTWFpbiIsInJlcXVpcmUiLCJFcnJvciIsInJldCIsImZpbHRlciIsImluZGV4T2ZVbnBhY2siLCJmaW5kSW5kZXgiLCJ1bnBhY2tBcmdzIiwic2xpY2UiLCJub3RVbnBhY2tBcmdzIiwiY29uY2F0Iiwib3V0cHV0IiwiY29uc29sZSIsImxvZyIsImxpbmVzIiwic3BsaXQiLCJpZHgiLCJyZXBsYWNlIiwiY21kVG9GaW5kIiwiYXJnc1RvVXNlIiwiY21kU3VmZml4IiwicHJvY2VzcyIsInBsYXRmb3JtIiwicmVzb2x2ZSIsIm1haW5Nb2R1bGUiLCJtb2R1bGUiLCJ0aGVuIiwiZXhpdCIsImNhdGNoIiwiZSIsImVycm9yIiwibWVzc2FnZSIsInN0YWNr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LG1DQUFxQkQsU0FBckIsRUFBZ0NDLFNBQWhDLENBRHNDOztBQUFBLE1BQ3BEakMsR0FEb0QseUJBQ3BEQSxHQURvRDtBQUFBLE1BQy9DQyxJQUQrQyx5QkFDL0NBLElBRCtDOztBQUUxRCxNQUFJRCxRQUFRUyxnQkFBWixFQUE4QjtBQUM1Qi9CLE1BQUcsY0FBYXNELFNBQVUsa0RBQTFCO0FBQ0EsUUFBSUUsWUFBWUMsUUFBUUMsUUFBUixLQUFxQixPQUFyQixHQUErQixNQUEvQixHQUF3QyxFQUF4RDtBQUNBLFdBQU8sbUNBQXFCLGVBQUtDLE9BQUwsQ0FBYTVDLFNBQWIsRUFBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsTUFBcEMsRUFBNkMsR0FBRXVDLFNBQVUsR0FBRUUsU0FBVSxFQUFyRSxDQUFyQixFQUE4RkQsU0FBOUYsQ0FBUDtBQUNEOztBQUVELFNBQU8sRUFBRWpDLEdBQUYsRUFBT0MsSUFBUCxFQUFQO0FBQ0Q7O0FBNkJELElBQUlrQyxRQUFRRyxVQUFSLEtBQXVCQyxNQUEzQixFQUFtQztBQUNqQ3pCLGVBQWFxQixRQUFROUIsSUFBckIsRUFDR21DLElBREgsQ0FDUSxNQUFNTCxRQUFRTSxJQUFSLENBQWEsQ0FBYixDQURkLEVBRUdDLEtBRkgsQ0FFVUMsQ0FBRCxJQUFPO0FBQ1pqQixZQUFRa0IsS0FBUixDQUFjRCxFQUFFRSxPQUFGLElBQWFGLENBQTNCO0FBQ0FqRSxNQUFFaUUsRUFBRUcsS0FBSjs7QUFFQVgsWUFBUU0sSUFBUixDQUFhLENBQUMsQ0FBZDtBQUNELEdBUEg7QUFRRCIsImZpbGUiOiJwYWNrYWdlci1jbGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgcmltcmFmIGZyb20gJ3JpbXJhZic7XHJcblxyXG5pbXBvcnQge3Bmc30gZnJvbSAnLi9wcm9taXNlJztcclxuaW1wb3J0IHttYWlufSBmcm9tICcuL2NsaSc7XHJcblxyXG5pbXBvcnQge3NwYXduUHJvbWlzZSwgZmluZEFjdHVhbEV4ZWN1dGFibGV9IGZyb20gJ3NwYXduLXJ4JztcclxuXHJcbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOnBhY2thZ2VyJyk7XHJcbmNvbnN0IGVsZWN0cm9uUGFja2FnZXIgPSAnZWxlY3Ryb24tcGFja2FnZXInO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhY2thZ2VEaXJUb1Jlc291cmNlc0RpcihwYWNrYWdlRGlyKSB7XHJcbiAgbGV0IGFwcERpciA9IChhd2FpdCBwZnMucmVhZGRpcihwYWNrYWdlRGlyKSkuZmluZCgoeCkgPT4geC5tYXRjaCgvXFwuYXBwJC9pKSk7XHJcbiAgaWYgKGFwcERpcikge1xyXG4gICAgcmV0dXJuIHBhdGguam9pbihwYWNrYWdlRGlyLCBhcHBEaXIsICdDb250ZW50cycsICdSZXNvdXJjZXMnLCAnYXBwJyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBwYXRoLmpvaW4ocGFja2FnZURpciwgJ3Jlc291cmNlcycsICdhcHAnKTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGNvcHlTbWFsbEZpbGUoZnJvbSwgdG8pIHtcclxuICBkKGBDb3B5aW5nICR7ZnJvbX0gPT4gJHt0b31gKTtcclxuXHJcbiAgbGV0IGJ1ZiA9IGF3YWl0IHBmcy5yZWFkRmlsZShmcm9tKTtcclxuICBhd2FpdCBwZnMud3JpdGVGaWxlKHRvLCBidWYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRPdXRBc2FyQXJndW1lbnRzKGFyZ3YpIHtcclxuICBpZiAoYXJndi5maW5kKCh4KSA9PiB4Lm1hdGNoKC9eLS1hc2FyLXVucGFjayQvKSkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcImVsZWN0cm9uLWNvbXBpbGUgZG9lc24ndCBzdXBwb3J0IC0tYXNhci11bnBhY2sgYXQgdGhlIG1vbWVudCwgdXNlIGFzYXItdW5wYWNrLWRpclwiKTtcclxuICB9XHJcblxyXG4gIC8vIFN0cmlwIC0tYXNhciBhbHRvZ2V0aGVyXHJcbiAgbGV0IHJldCA9IGFyZ3YuZmlsdGVyKCh4KSA9PiAheC5tYXRjaCgvXi0tYXNhci8pKTtcclxuXHJcbiAgaWYgKHJldC5sZW5ndGggPT09IGFyZ3YubGVuZ3RoKSB7IHJldHVybiB7IHBhY2thZ2VyQXJnczogcmV0LCBhc2FyQXJnczogbnVsbCB9OyB9XHJcblxyXG4gIGxldCBpbmRleE9mVW5wYWNrID0gcmV0LmZpbmRJbmRleCgoeCkgPT4geC5tYXRjaCgvXi0tYXNhci11bnBhY2stZGlyJC8pKTtcclxuICBpZiAoaW5kZXhPZlVucGFjayA8IDApIHtcclxuICAgIHJldHVybiB7IHBhY2thZ2VyQXJnczogcmV0LCBhc2FyQXJnczogW10gfTtcclxuICB9XHJcblxyXG4gIGxldCB1bnBhY2tBcmdzID0gcmV0LnNsaWNlKGluZGV4T2ZVbnBhY2ssIGluZGV4T2ZVbnBhY2srMSk7XHJcbiAgbGV0IG5vdFVucGFja0FyZ3MgPSByZXQuc2xpY2UoMCwgaW5kZXhPZlVucGFjaykuY29uY2F0KHJldC5zbGljZShpbmRleE9mVW5wYWNrKzIpKTtcclxuXHJcbiAgcmV0dXJuIHsgcGFja2FnZXJBcmdzOiBub3RVbnBhY2tBcmdzLCBhc2FyQXJnczogdW5wYWNrQXJncyB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VQYWNrYWdlck91dHB1dChvdXRwdXQpIHtcclxuICAvLyBOQjogWWVzLCB0aGlzIGlzIGZyYWdpbGUgYXMgZnVjay4gOi0vXHJcbiAgY29uc29sZS5sb2cob3V0cHV0KTtcclxuICBsZXQgbGluZXMgPSBvdXRwdXQuc3BsaXQoJ1xcbicpO1xyXG5cclxuICBsZXQgaWR4ID0gbGluZXMuZmluZEluZGV4KCh4KSA9PiB4Lm1hdGNoKC9Xcm90ZSBuZXcgYXBwL2kpKTtcclxuICBpZiAoaWR4IDwgMSkgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlciBvdXRwdXQgaXMgaW52YWxpZDogJHtvdXRwdXR9YCk7XHJcbiAgbGluZXMgPSBsaW5lcy5zcGxpY2UoaWR4KTtcclxuXHJcbiAgLy8gTXVsdGktcGxhdGZvcm0gY2FzZVxyXG4gIGlmIChsaW5lc1swXS5tYXRjaCgvV3JvdGUgbmV3IGFwcHMvKSkge1xyXG4gICAgcmV0dXJuIGxpbmVzLnNwbGljZSgxKS5maWx0ZXIoKHgpID0+IHgubGVuZ3RoID4gMSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBbbGluZXNbMF0ucmVwbGFjZSgvXi4qbmV3IGFwcCB0byAvLCAnJyldO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gY29tcGlsZUFuZFNoaW0ocGFja2FnZURpcikge1xyXG4gIGxldCBhcHBEaXIgPSBhd2FpdCBwYWNrYWdlRGlyVG9SZXNvdXJjZXNEaXIocGFja2FnZURpcik7XHJcblxyXG4gIGQoYExvb2tpbmcgaW4gJHthcHBEaXJ9YCk7XHJcbiAgZm9yIChsZXQgZW50cnkgb2YgYXdhaXQgcGZzLnJlYWRkaXIoYXBwRGlyKSkge1xyXG4gICAgaWYgKGVudHJ5Lm1hdGNoKC9eKG5vZGVfbW9kdWxlc3xib3dlcl9jb21wb25lbnRzKSQvKSkgY29udGludWU7XHJcblxyXG4gICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGFwcERpciwgZW50cnkpO1xyXG4gICAgbGV0IHN0YXQgPSBhd2FpdCBwZnMuc3RhdChmdWxsUGF0aCk7XHJcblxyXG4gICAgaWYgKCFzdGF0LmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xyXG5cclxuICAgIGQoYEV4ZWN1dGluZyBlbGVjdHJvbi1jb21waWxlOiAke2FwcERpcn0gPT4gJHtlbnRyeX1gKTtcclxuICAgIGF3YWl0IG1haW4oYXBwRGlyLCBbZnVsbFBhdGhdKTtcclxuICB9XHJcblxyXG4gIGQoJ0NvcHlpbmcgaW4gZXM2LXNoaW0nKTtcclxuICBsZXQgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKFxyXG4gICAgYXdhaXQgcGZzLnJlYWRGaWxlKHBhdGguam9pbihhcHBEaXIsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKSk7XHJcblxyXG4gIGxldCBpbmRleCA9IHBhY2thZ2VKc29uLm1haW4gfHwgJ2luZGV4LmpzJztcclxuICBwYWNrYWdlSnNvbi5vcmlnaW5hbE1haW4gPSBpbmRleDtcclxuICBwYWNrYWdlSnNvbi5tYWluID0gJ2VzNi1zaGltLmpzJztcclxuXHJcbiAgYXdhaXQgY29weVNtYWxsRmlsZShcclxuICAgIHBhdGguam9pbihfX2Rpcm5hbWUsICdlczYtc2hpbS5qcycpLFxyXG4gICAgcGF0aC5qb2luKGFwcERpciwgJ2VzNi1zaGltLmpzJykpO1xyXG5cclxuICBhd2FpdCBwZnMud3JpdGVGaWxlKFxyXG4gICAgcGF0aC5qb2luKGFwcERpciwgJ3BhY2thZ2UuanNvbicpLFxyXG4gICAgSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkFzYXJBcmNoaXZlKHBhY2thZ2VEaXIsIGFzYXJVbnBhY2tEaXIpIHtcclxuICBsZXQgYXBwRGlyID0gYXdhaXQgcGFja2FnZURpclRvUmVzb3VyY2VzRGlyKHBhY2thZ2VEaXIpO1xyXG5cclxuICBsZXQgYXNhckFyZ3MgPSBbJ3BhY2snLCAnYXBwJywgJ2FwcC5hc2FyJ107XHJcbiAgaWYgKGFzYXJVbnBhY2tEaXIpIHtcclxuICAgIGFzYXJBcmdzLnB1c2goJy0tdW5wYWNrLWRpcicsIGFzYXJVbnBhY2tEaXIpO1xyXG4gIH1cclxuXHJcbiAgbGV0IHsgY21kLCBhcmdzIH0gPSBmaW5kRXhlY3V0YWJsZU9yR3Vlc3MoJ2FzYXInLCBhc2FyQXJncyk7XHJcblxyXG4gIGQoYFJ1bm5pbmcgJHtjbWR9ICR7SlNPTi5zdHJpbmdpZnkoYXJncyl9YCk7XHJcbiAgYXdhaXQgc3Bhd25Qcm9taXNlKGNtZCwgYXJncywgeyBjd2Q6IHBhdGguam9pbihhcHBEaXIsICcuLicpIH0pO1xyXG4gIHJpbXJhZi5zeW5jKHBhdGguam9pbihhcHBEaXIpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRFeGVjdXRhYmxlT3JHdWVzcyhjbWRUb0ZpbmQsIGFyZ3NUb1VzZSkge1xyXG4gIGxldCB7IGNtZCwgYXJncyB9ID0gZmluZEFjdHVhbEV4ZWN1dGFibGUoY21kVG9GaW5kLCBhcmdzVG9Vc2UpO1xyXG4gIGlmIChjbWQgPT09IGVsZWN0cm9uUGFja2FnZXIpIHtcclxuICAgIGQoYENhbid0IGZpbmQgJHtjbWRUb0ZpbmR9LCBmYWxsaW5nIGJhY2sgdG8gd2hlcmUgaXQgc2hvdWxkIGJlIGFzIGEgZ3Vlc3MhYCk7XHJcbiAgICBsZXQgY21kU3VmZml4ID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyA/ICcuY21kJyA6ICcnO1xyXG4gICAgcmV0dXJuIGZpbmRBY3R1YWxFeGVjdXRhYmxlKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicsICcuYmluJywgYCR7Y21kVG9GaW5kfSR7Y21kU3VmZml4fWApLCBhcmdzVG9Vc2UpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHsgY21kLCBhcmdzIH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrYWdlck1haW4oYXJndikge1xyXG4gIGQoYGFyZ3Y6ICR7SlNPTi5zdHJpbmdpZnkoYXJndil9YCk7XHJcbiAgYXJndiA9IGFyZ3Yuc3BsaWNlKDIpO1xyXG5cclxuICBsZXQgeyBwYWNrYWdlckFyZ3MsIGFzYXJBcmdzIH0gPSBzcGxpdE91dEFzYXJBcmd1bWVudHMoYXJndik7XHJcbiAgbGV0IHsgY21kLCBhcmdzIH0gPSBmaW5kRXhlY3V0YWJsZU9yR3Vlc3MoZWxlY3Ryb25QYWNrYWdlciwgcGFja2FnZXJBcmdzKTtcclxuXHJcbiAgZChgU3Bhd25pbmcgZWxlY3Ryb24tcGFja2FnZXI6ICR7SlNPTi5zdHJpbmdpZnkoYXJncyl9YCk7XHJcbiAgbGV0IHBhY2thZ2VyT3V0cHV0ID0gYXdhaXQgc3Bhd25Qcm9taXNlKGNtZCwgYXJncyk7XHJcbiAgbGV0IHBhY2thZ2VEaXJzID0gcGFyc2VQYWNrYWdlck91dHB1dChwYWNrYWdlck91dHB1dCk7XHJcblxyXG4gIGQoYFN0YXJ0aW5nIGNvbXBpbGF0aW9uIGZvciAke0pTT04uc3RyaW5naWZ5KHBhY2thZ2VEaXJzKX1gKTtcclxuICBmb3IgKGxldCBwYWNrYWdlRGlyIG9mIHBhY2thZ2VEaXJzKSB7XHJcbiAgICBhd2FpdCBjb21waWxlQW5kU2hpbShwYWNrYWdlRGlyKTtcclxuXHJcbiAgICBpZiAoIWFzYXJBcmdzKSBjb250aW51ZTtcclxuXHJcbiAgICBkKCdTdGFydGluZyBBU0FSIHBhY2thZ2luZycpO1xyXG4gICAgbGV0IGFzYXJVbnBhY2tEaXIgPSBudWxsO1xyXG4gICAgaWYgKGFzYXJBcmdzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICBhc2FyVW5wYWNrRGlyID0gYXNhckFyZ3NbMV07XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgcnVuQXNhckFyY2hpdmUocGFja2FnZURpciwgYXNhclVucGFja0Rpcik7XHJcbiAgfVxyXG59XHJcblxyXG5pZiAocHJvY2Vzcy5tYWluTW9kdWxlID09PSBtb2R1bGUpIHtcclxuICBwYWNrYWdlck1haW4ocHJvY2Vzcy5hcmd2KVxyXG4gICAgLnRoZW4oKCkgPT4gcHJvY2Vzcy5leGl0KDApKVxyXG4gICAgLmNhdGNoKChlKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlIHx8IGUpO1xyXG4gICAgICBkKGUuc3RhY2spO1xyXG5cclxuICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgIH0pO1xyXG59XHJcbiJdfQ==