#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = undefined;

let main = exports.main = (() => {
  var _ref = _asyncToGenerator(function* (appDir, sourceDirs, cacheDir, sourceMapDir) {
    let compilerHost = null;
    if (!cacheDir || cacheDir.length < 1) {
      cacheDir = '.cache';
    }

    let rootCacheDir = _path2.default.join(appDir, cacheDir);
    _mkdirp2.default.sync(rootCacheDir);
    let mapDir = rootCacheDir;

    if (sourceMapDir) {
      mapDir = _path2.default.join(appDir, sourceMapDir);
      d(`specifed separate source map dir at ${mapDir}, creating it`);
      _mkdirp2.default.sync(mapDir);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Using NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
    }

    d(`main: ${appDir}, ${JSON.stringify(sourceDirs)}`);
    try {
      compilerHost = yield (0, _configParser.createCompilerHostFromProjectRoot)(appDir, rootCacheDir, sourceMapDir);
    } catch (e) {
      console.error(`Couldn't set up compilers: ${e.message}`);
      d(e.stack);

      throw e;
    }

    yield Promise.all(sourceDirs.map(function (dir) {
      return (0, _forAllFiles.forAllFiles)(dir, (() => {
        var _ref2 = _asyncToGenerator(function* (f) {
          try {
            d(`Starting compilation for ${f}`);
            yield compilerHost.compile(f);
          } catch (e) {
            console.error(`Failed to compile file: ${f}`);
            console.error(e.message);

            d(e.stack);
          }
        });

        return function (_x5) {
          return _ref2.apply(this, arguments);
        };
      })());
    }));

    d('Saving out configuration');
    yield compilerHost.saveConfiguration();
  });

  return function main(_x, _x2, _x3, _x4) {
    return _ref.apply(this, arguments);
  };
})();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _configParser = require('./config-parser');

var _forAllFiles = require('./for-all-files');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

process.on('unhandledRejection', e => {
  d(e.message || e);
  d(e.stack || '');
});

process.on('uncaughtException', e => {
  d(e.message || e);
  d(e.stack || '');
});

const d = require('debug')('electron-compile');

const yargs = require('yargs').usage('Usage: electron-compile --appdir [root-app-dir] paths...').alias('a', 'appdir').describe('a', 'The top-level application directory (i.e. where your package.json is)').default('a', process.cwd()).alias('c', 'cachedir').describe('c', 'The directory to put the cache').alias('s', 'sourcemapdir').describe('s', 'The directory to store sourcemap if compiler configured to have sourcemap file. Default to cachedir if not specified.').help('h').alias('h', 'help').epilog('Copyright 2015');

if (process.mainModule === module) {
  const argv = yargs.argv;

  if (!argv._ || argv._.length < 1) {
    yargs.showHelp();
    process.exit(-1);
  }

  const sourceDirs = argv._;
  const appDir = argv.a;
  const cacheDir = argv.c;
  const sourceMapDir = argv.s;

  main(appDir, sourceDirs, cacheDir, sourceMapDir).then(() => process.exit(0)).catch(e => {
    console.error(e.message || e);
    d(e.stack);

    console.error("Compilation failed!\nFor extra information, set the DEBUG environment variable to '*'");
    process.exit(-1);
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiYXBwRGlyIiwic291cmNlRGlycyIsImNhY2hlRGlyIiwic291cmNlTWFwRGlyIiwiY29tcGlsZXJIb3N0IiwibGVuZ3RoIiwicm9vdENhY2hlRGlyIiwiam9pbiIsInN5bmMiLCJtYXBEaXIiLCJkIiwicHJvY2VzcyIsImVudiIsIk5PREVfRU5WIiwiY29uc29sZSIsImxvZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJlIiwiZXJyb3IiLCJtZXNzYWdlIiwic3RhY2siLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiZGlyIiwiZiIsImNvbXBpbGUiLCJzYXZlQ29uZmlndXJhdGlvbiIsIm1haW4iLCJvbiIsInJlcXVpcmUiLCJ5YXJncyIsInVzYWdlIiwiYWxpYXMiLCJkZXNjcmliZSIsImRlZmF1bHQiLCJjd2QiLCJoZWxwIiwiZXBpbG9nIiwibWFpbk1vZHVsZSIsIm1vZHVsZSIsImFyZ3YiLCJfIiwic2hvd0hlbHAiLCJleGl0IiwiYSIsImMiLCJzIiwidGhlbiIsImNhdGNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OzsrQkFrQk8sV0FBb0JBLE1BQXBCLEVBQTRCQyxVQUE1QixFQUF3Q0MsUUFBeEMsRUFBa0RDLFlBQWxELEVBQWdFO0FBQ3JFLFFBQUlDLGVBQWUsSUFBbkI7QUFDQSxRQUFJLENBQUNGLFFBQUQsSUFBYUEsU0FBU0csTUFBVCxHQUFrQixDQUFuQyxFQUFzQztBQUNwQ0gsaUJBQVcsUUFBWDtBQUNEOztBQUVELFFBQUlJLGVBQWUsZUFBS0MsSUFBTCxDQUFVUCxNQUFWLEVBQWtCRSxRQUFsQixDQUFuQjtBQUNBLHFCQUFPTSxJQUFQLENBQVlGLFlBQVo7QUFDQSxRQUFJRyxTQUFTSCxZQUFiOztBQUVBLFFBQUlILFlBQUosRUFBa0I7QUFDaEJNLGVBQVMsZUFBS0YsSUFBTCxDQUFVUCxNQUFWLEVBQWtCRyxZQUFsQixDQUFUO0FBQ0FPLFFBQUcsdUNBQXNDRCxNQUFPLGVBQWhEO0FBQ0EsdUJBQU9ELElB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QUFDQSxRQUFNM0MsU0FBUzBDLEtBQUtJLENBQXBCO0FBQ0EsUUFBTTVDLFdBQVd3QyxLQUFLSyxDQUF0QjtBQUNBLFFBQU01QyxlQUFldUMsS0FBS00sQ0FBMUI7O0FBRUFuQixPQUFLN0IsTUFBTCxFQUFhQyxVQUFiLEVBQXlCQyxRQUF6QixFQUFtQ0MsWUFBbkMsRUFDRzhDLElBREgsQ0FDUSxNQUFNdEMsUUFBUWtDLElBQVIsQ0FBYSxDQUFiLENBRGQsRUFFR0ssS0FGSCxDQUVVaEMsQ0FBRCxJQUFPO0FBQ1pKLFlBQVFLLEtBQVIsQ0FBY0QsRUFBRUUsT0FBRixJQUFhRixDQUEzQjtBQUNBUixNQUFFUSxFQUFFRyxLQUFKOztBQUVBUCxZQUFRSyxLQUFSLENBQWMsdUZBQWQ7QUFDQVIsWUFBUWtDLElBQVIsQ0FBYSxDQUFDLENBQWQ7QUFDRCxHQVJIO0FBU0QiLCJmaWxlIjoiY2xpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IG1rZGlycCBmcm9tICdta2RpcnAnO1xyXG5cclxuaW1wb3J0IHtjcmVhdGVDb21waWxlckhvc3RGcm9tUHJvamVjdFJvb3R9IGZyb20gJy4vY29uZmlnLXBhcnNlcic7XHJcbmltcG9ydCB7Zm9yQWxsRmlsZXN9IGZyb20gJy4vZm9yLWFsbC1maWxlcyc7XHJcblxyXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCAoZSkgPT4ge1xyXG4gIGQoZS5tZXNzYWdlIHx8IGUpO1xyXG4gIGQoZS5zdGFjayB8fCAnJyk7XHJcbn0pO1xyXG5cclxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCAoZSkgPT4ge1xyXG4gIGQoZS5tZXNzYWdlIHx8IGUpO1xyXG4gIGQoZS5zdGFjayB8fCAnJyk7XHJcbn0pO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXBwRGlyLCBzb3VyY2VEaXJzLCBjYWNoZURpciwgc291cmNlTWFwRGlyKSB7XHJcbiAgbGV0IGNvbXBpbGVySG9zdCA9IG51bGw7XHJcbiAgaWYgKCFjYWNoZURpciB8fCBjYWNoZURpci5sZW5ndGggPCAxKSB7XHJcbiAgICBjYWNoZURpciA9ICcuY2FjaGUnO1xyXG4gIH1cclxuXHJcbiAgbGV0IHJvb3RDYWNoZURpciA9IHBhdGguam9pbihhcHBEaXIsIGNhY2hlRGlyKTtcclxuICBta2RpcnAuc3luYyhyb290Q2FjaGVEaXIpO1xyXG4gIGxldCBtYXBEaXIgPSByb290Q2FjaGVEaXI7XHJcblxyXG4gIGlmIChzb3VyY2VNYXBEaXIpIHtcclxuICAgIG1hcERpciA9IHBhdGguam9pbihhcHBEaXIsIHNvdXJjZU1hcERpcik7XHJcbiAgICBkKGBzcGVjaWZlZCBzZXBhcmF0ZSBzb3VyY2UgbWFwIGRpciBhdCAke21hcERpcn0sIGNyZWF0aW5nIGl0YCk7XHJcbiAgICBta2RpcnAuc3luYyhtYXBEaXIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcclxuICAgIGNvbnNvbGUubG9nKGBVc2luZyBOT0RFX0VOViA9ICR7cHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50J31gKTtcclxuICB9XHJcblxyXG4gIGQoYG1haW46ICR7YXBwRGlyfSwgJHtKU09OLnN0cmluZ2lmeShzb3VyY2VEaXJzKX1gKTtcclxuICB0cnkge1xyXG4gICAgY29tcGlsZXJIb3N0ID0gYXdhaXQgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290KGFwcERpciwgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBEaXIpO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoYENvdWxkbid0IHNldCB1cCBjb21waWxlcnM6ICR7ZS5tZXNzYWdlfWApO1xyXG4gICAgZChlLnN0YWNrKTtcclxuXHJcbiAgICB0aHJvdyBlO1xyXG4gIH1cclxuXHJcbiAgYXdhaXQgUHJvbWlzZS5hbGwoc291cmNlRGlycy5tYXAoKGRpcikgPT4gZm9yQWxsRmlsZXMoZGlyLCBhc3luYyAoZikgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgZChgU3RhcnRpbmcgY29tcGlsYXRpb24gZm9yICR7Zn1gKTtcclxuICAgICAgYXdhaXQgY29tcGlsZXJIb3N0LmNvbXBpbGUoZik7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBjb21waWxlIGZpbGU6ICR7Zn1gKTtcclxuICAgICAgY29uc29sZS5lcnJvcihlLm1lc3NhZ2UpO1xyXG5cclxuICAgICAgZChlLnN0YWNrKTtcclxuICAgIH1cclxuICB9KSkpO1xyXG5cclxuICBkKCdTYXZpbmcgb3V0IGNvbmZpZ3VyYXRpb24nKTtcclxuICBhd2FpdCBjb21waWxlckhvc3Quc2F2ZUNvbmZpZ3VyYXRpb24oKTtcclxufVxyXG5cclxuY29uc3QgZCA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VsZWN0cm9uLWNvbXBpbGUnKTtcclxuXHJcbmNvbnN0IHlhcmdzID0gcmVxdWlyZSgneWFyZ3MnKVxyXG4gIC51c2FnZSgnVXNhZ2U6IGVsZWN0cm9uLWNvbXBpbGUgLS1hcHBkaXIgW3Jvb3QtYXBwLWRpcl0gcGF0aHMuLi4nKVxyXG4gIC5hbGlhcygnYScsICdhcHBkaXInKVxyXG4gIC5kZXNjcmliZSgnYScsICdUaGUgdG9wLWxldmVsIGFwcGxpY2F0aW9uIGRpcmVjdG9yeSAoaS5lLiB3aGVyZSB5b3VyIHBhY2thZ2UuanNvbiBpcyknKVxyXG4gIC5kZWZhdWx0KCdhJywgcHJvY2Vzcy5jd2QoKSlcclxuICAuYWxpYXMoJ2MnLCAnY2FjaGVkaXInKVxyXG4gIC5kZXNjcmliZSgnYycsICdUaGUgZGlyZWN0b3J5IHRvIHB1dCB0aGUgY2FjaGUnKVxyXG4gIC5hbGlhcygncycsICdzb3VyY2VtYXBkaXInKVxyXG4gIC5kZXNjcmliZSgncycsICdUaGUgZGlyZWN0b3J5IHRvIHN0b3JlIHNvdXJjZW1hcCBpZiBjb21waWxlciBjb25maWd1cmVkIHRvIGhhdmUgc291cmNlbWFwIGZpbGUuIERlZmF1bHQgdG8gY2FjaGVkaXIgaWYgbm90IHNwZWNpZmllZC4nKVxyXG4gIC5oZWxwKCdoJylcclxuICAuYWxpYXMoJ2gnLCAnaGVscCcpXHJcbiAgLmVwaWxvZygnQ29weXJpZ2h0IDIwMTUnKTtcclxuXHJcbmlmIChwcm9jZXNzLm1haW5Nb2R1bGUgPT09IG1vZHVsZSkge1xyXG4gIGNvbnN0IGFyZ3YgPSB5YXJncy5hcmd2O1xyXG5cclxuICBpZiAoIWFyZ3YuXyB8fCBhcmd2Ll8ubGVuZ3RoIDwgMSkge1xyXG4gICAgeWFyZ3Muc2hvd0hlbHAoKTtcclxuICAgIHByb2Nlc3MuZXhpdCgtMSk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBzb3VyY2VEaXJzID0gYXJndi5fO1xyXG4gIGNvbnN0IGFwcERpciA9IGFyZ3YuYTtcclxuICBjb25zdCBjYWNoZURpciA9IGFyZ3YuYztcclxuICBjb25zdCBzb3VyY2VNYXBEaXIgPSBhcmd2LnM7XHJcblxyXG4gIG1haW4oYXBwRGlyLCBzb3VyY2VEaXJzLCBjYWNoZURpciwgc291cmNlTWFwRGlyKVxyXG4gICAgLnRoZW4oKCkgPT4gcHJvY2Vzcy5leGl0KDApKVxyXG4gICAgLmNhdGNoKChlKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlIHx8IGUpO1xyXG4gICAgICBkKGUuc3RhY2spO1xyXG5cclxuICAgICAgY29uc29sZS5lcnJvcihcIkNvbXBpbGF0aW9uIGZhaWxlZCFcXG5Gb3IgZXh0cmEgaW5mb3JtYXRpb24sIHNldCB0aGUgREVCVUcgZW52aXJvbm1lbnQgdmFyaWFibGUgdG8gJyonXCIpO1xyXG4gICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgfSk7XHJcbn1cclxuIl19