'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCompilerHostFromProjectRoot = exports.createCompilerHostFromConfigFile = exports.createCompilerHostFromBabelRc = undefined;

/**
 * Creates a compiler host from a .babelrc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .babelrc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */
let createCompilerHostFromBabelRc = exports.createCompilerHostFromBabelRc = (() => {
  var _ref = _asyncToGenerator(function* (file) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let info = JSON.parse((yield _promise.pfs.readFile(file, 'utf8')));

    // package.json
    if ('babel' in info) {
      info = info.babel;
    }

    if ('env' in info) {
      let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
      info = info.env[ourEnv];
    }

    // Are we still package.json (i.e. is there no babel info whatsoever?)
    if ('name' in info && 'version' in info) {
      let appRoot = _path2.default.dirname(file);
      return createCompilerHostFromConfiguration({
        appRoot: appRoot,
        options: getDefaultConfiguration(appRoot),
        rootCacheDir,
        sourceMapPath
      });
    }

    return createCompilerHostFromConfiguration({
      appRoot: _path2.default.dirname(file),
      options: {
        'application/javascript': info
      },
      rootCacheDir,
      sourceMapPath
    });
  });

  return function createCompilerHostFromBabelRc(_x5) {
    return _ref.apply(this, arguments);
  };
})();

/**
 * Creates a compiler host from a .compilerc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .compilerc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */


let createCompilerHostFromConfigFile = exports.createCompilerHostFromConfigFile = (() => {
  var _ref2 = _asyncToGenerator(function* (file) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let info = JSON.parse((yield _promise.pfs.readFile(file, 'utf8')));

    if ('env' in info) {
      let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
      info = info.env[ourEnv];
    }

    return createCompilerHostFromConfiguration({
      appRoot: _path2.default.dirname(file),
      options: info,
      rootCacheDir,
      sourceMapPath
    });
  });

  return function createCompilerHostFromConfigFile(_x8) {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Creates a configured {@link CompilerHost} instance from the project root
 * directory. This method first searches for a .compilerc (or .compilerc.json), then falls back to the
 * default locations for Babel configuration info. If neither are found, defaults
 * to standard settings
 *
 * @param  {string} rootDir  The root application directory (i.e. the directory
 *                           that has the app's package.json)
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
 *                               if compiler option enabled to emit.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */


let createCompilerHostFromProjectRoot = exports.createCompilerHostFromProjectRoot = (() => {
  var _ref3 = _asyncToGenerator(function* (rootDir) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let compilerc = _path2.default.join(rootDir, '.compilerc');
    if (statSyncNoException(compilerc)) {
      d(`Found a .compilerc at ${compilerc}, using it`);
      return yield createCompilerHostFromConfigFile(compilerc, rootCacheDir, sourceMapPath);
    }
    compilerc += '.json';
    if (statSyncNoException(compilerc)) {
      d(`Found a .compilerc at ${compilerc}, using it`);
      return yield createCompilerHostFromConfigFile(compilerc, rootCacheDir, sourceMapPath);
    }

    let babelrc = _path2.default.join(rootDir, '.babelrc');
    if (statSyncNoException(babelrc)) {
      d(`Found a .babelrc at ${babelrc}, using it`);
      return yield createCompilerHostFromBabelRc(babelrc, rootCacheDir, sourceMapPath);
    }

    d(`Using package.json or default parameters at ${rootDir}`);
    return yield createCompilerHostFromBabelRc(_path2.default.join(rootDir, 'package.json'), rootCacheDir, sourceMapPath);
  });

  return function createCompilerHostFromProjectRoot(_x11) {
    return _ref3.apply(this, arguments);
  };
})();

exports.initializeGlobalHooks = initializeGlobalHooks;
exports.init = init;
exports.createCompilerHostFromConfiguration = createCompilerHostFromConfiguration;
exports.createCompilerHostFromBabelRcSync = createCompilerHostFromBabelRcSync;
exports.createCompilerHostFromConfigFileSync = createCompilerHostFromConfigFileSync;
exports.createCompilerHostFromProjectRootSync = createCompilerHostFromProjectRootSync;
exports.calculateDefaultCompileCacheDirectory = calculateDefaultCompileCacheDirectory;
exports.getDefaultConfiguration = getDefaultConfiguration;
exports.createCompilers = createCompilers;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _promise = require('./promise');

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _compilerHost = require('./compiler-host');

var _compilerHost2 = _interopRequireDefault(_compilerHost);

var _requireHook = require('./require-hook');

var _requireHook2 = _interopRequireDefault(_requireHook);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:config-parser');

// NB: We intentionally delay-load this so that in production, you can create
// cache-only versions of these compilers
let allCompilerClasses = null;

function statSyncNoException(fsPath) {
  if ('statSyncNoException' in _fs2.default) {
    return _fs2.default.statSyncNoException(fsPath);
  }

  try {
    return _fs2.default.statSync(fsPath);
  } catch (e) {
    return null;
  }
}

/**
 * Initialize the global hooks (protocol hook for file:, node.js hook)
 * independent of initializing the compiler. This method is usually called by
 * init instead of directly
 *
 * @param {CompilerHost} compilerHost  The compiler host to use.
 *
 */
function initializeGlobalHooks(compilerHost) {
  let isProduction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  let globalVar = global || window;
  globalVar.globalCompilerHost = compilerHost;

  (0, _requireHook2.default)(compilerHost, isProduction);

  if ('type' in process && process.type === 'browser') {
    var _require = require('electron');

    const app = _require.app;

    var _require2 = require('./protocol-hook');

    const initializeProtocolHook = _require2.initializeProtocolHook;


    let protoify = function () {
      initializeProtocolHook(compilerHost);
    };
    if (app.isReady()) {
      protoify();
    } else {
      app.on('ready', protoify);
    }
  }
}

/**
 * Initialize electron-compile and set it up, either for development or
 * production use. This is almost always the only method you need to use in order
 * to use electron-compile.
 *
 * @param  {string} appRoot  The top-level directory for your application (i.e.
 *                           the one which has your package.json).
 *
 * @param  {string} mainModule  The module to require in, relative to the module
 *                              calling init, that will start your app. Write this
 *                              as if you were writing a require call from here.
 *
 * @param  {bool} productionMode   If explicitly True/False, will set read-only
 *                                 mode to be disabled/enabled. If not, we'll
 *                                 guess based on the presence of a production
 *                                 cache.
 *
 * @param  {string} cacheDir  If not passed in, read-only will look in
 *                            `appRoot/.cache` and dev mode will compile to a
 *                            temporary directory. If it is passed in, both modes
 *                            will cache to/from `appRoot/{cacheDir}`
 *
 * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
 *                               if compiler option enabled to emit.
 *                               Default to cachePath if not specified, will be ignored for read-only mode.
 */
function init(appRoot, mainModule) {
  let productionMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  let cacheDir = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  let sourceMapPath = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

  let compilerHost = null;
  let rootCacheDir = _path2.default.join(appRoot, cacheDir || '.cache');

  if (productionMode === null) {
    productionMode = !!statSyncNoException(rootCacheDir);
  }

  if (productionMode) {
    compilerHost = _compilerHost2.default.createReadonlyFromConfigurationSync(rootCacheDir, appRoot);
  } else {
    // if cacheDir was passed in, pass it along. Otherwise, default to a tempdir.
    const cachePath = cacheDir ? rootCacheDir : null;
    const mapPath = sourceMapPath ? _path2.default.join(appRoot, sourceMapPath) : cachePath;
    compilerHost = createCompilerHostFromProjectRootSync(appRoot, cachePath, mapPath);
  }

  initializeGlobalHooks(compilerHost, productionMode);
  require.main.require(mainModule);
}

/**
 * Creates a {@link CompilerHost} with the given information. This method is
 * usually called by {@link createCompilerHostFromProjectRoot}.
 *
 * @private
 */
function createCompilerHostFromConfiguration(info) {
  let compilers = createCompilers();
  let rootCacheDir = info.rootCacheDir || calculateDefaultCompileCacheDirectory();
  const sourceMapPath = info.sourceMapPath || info.rootCacheDir;

  if (info.sourceMapPath) {
    createSourceMapDirectory(sourceMapPath);
  }

  d(`Creating CompilerHost: ${JSON.stringify(info)}, rootCacheDir = ${rootCacheDir}, sourceMapPath = ${sourceMapPath}`);
  let fileChangeCache = new _fileChangeCache2.default(info.appRoot);

  let compilerInfo = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
  let json = {};
  if (_fs2.default.existsSync(compilerInfo)) {
    let buf = _fs2.default.readFileSync(compilerInfo);
    json = JSON.parse(_zlib2.default.gunzipSync(buf));
    fileChangeCache = _fileChangeCache2.default.loadFromData(json.fileChangeCache, info.appRoot, false);
  }

  Object.keys(info.options || {}).forEach(x => {
    let opts = info.options[x];
    if (!(x in compilers)) {
      throw new Error(`Found compiler settings for missing compiler: ${x}`);
    }

    // NB: Let's hope this isn't a valid compiler option...
    if (opts.passthrough) {
      compilers[x] = compilers['text/plain'];
      delete opts.passthrough;
    }

    d(`Setting options for ${x}: ${JSON.stringify(opts)}`);
    compilers[x].compilerOptions = opts;
  });

  let ret = new _compilerHost2.default(rootCacheDir, compilers, fileChangeCache, false, compilers['text/plain'], null, json.mimeTypesToRegister);

  // NB: It's super important that we guarantee that the configuration is saved
  // out, because we'll need to re-read it in the renderer process
  d(`Created compiler host with options: ${JSON.stringify(info)}`);
  ret.saveConfigurationSync();
  return ret;
}function createCompilerHostFromBabelRcSync(file) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let info = JSON.parse(_fs2.default.readFileSync(file, 'utf8'));

  // package.json
  if ('babel' in info) {
    info = info.babel;
  }

  if ('env' in info) {
    let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  // Are we still package.json (i.e. is there no babel info whatsoever?)
  if ('name' in info && 'version' in info) {
    let appRoot = _path2.default.dirname(file);
    return createCompilerHostFromConfiguration({
      appRoot: appRoot,
      options: getDefaultConfiguration(appRoot),
      rootCacheDir,
      sourceMapPath
    });
  }

  return createCompilerHostFromConfiguration({
    appRoot: _path2.default.dirname(file),
    options: {
      'application/javascript': info
    },
    rootCacheDir,
    sourceMapPath
  });
}

function createCompilerHostFromConfigFileSync(file) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let info = JSON.parse(_fs2.default.readFileSync(file, 'utf8'));

  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  return createCompilerHostFromConfiguration({
    appRoot: _path2.default.dirname(file),
    options: info,
    rootCacheDir,
    sourceMapPath
  });
}

function createCompilerHostFromProjectRootSync(rootDir) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let compilerc = _path2.default.join(rootDir, '.compilerc');
  if (statSyncNoException(compilerc)) {
    d(`Found a .compilerc at ${compilerc}, using it`);
    return createCompilerHostFromConfigFileSync(compilerc, rootCacheDir, sourceMapPath);
  }

  let babelrc = _path2.default.join(rootDir, '.babelrc');
  if (statSyncNoException(babelrc)) {
    d(`Found a .babelrc at ${babelrc}, using it`);
    return createCompilerHostFromBabelRcSync(babelrc, rootCacheDir, sourceMapPath);
  }

  d(`Using package.json or default parameters at ${rootDir}`);
  return createCompilerHostFromBabelRcSync(_path2.default.join(rootDir, 'package.json'), rootCacheDir, sourceMapPath);
}

/**
 * Returns what electron-compile would use as a default rootCacheDir. Usually only
 * used for debugging purposes
 *
 * @return {string}  A path that may or may not exist where electron-compile would
 *                   set up a development mode cache.
 */
function calculateDefaultCompileCacheDirectory() {
  let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

  let cacheDir = _path2.default.join(tmpDir, `compileCache_${hash}`);
  _mkdirp2.default.sync(cacheDir);

  d(`Using default cache directory: ${cacheDir}`);
  return cacheDir;
}

function createSourceMapDirectory(sourceMapPath) {
  _mkdirp2.default.sync(sourceMapPath);
  d(`Using separate sourcemap path at ${sourceMapPath}`);
}

function getElectronVersion(rootDir) {
  if (process.versions.electron) {
    return process.versions.electron;
  }

  let ourPkgJson = require(_path2.default.join(rootDir, 'package.json'));

  let version = ['electron-prebuilt-compile', 'electron'].map(mod => {
    if (ourPkgJson.devDependencies && ourPkgJson.devDependencies[mod]) {
      // NB: lol this code
      let verRange = ourPkgJson.devDependencies[mod];
      let m = verRange.match(/(\d+\.\d+\.\d+)/);
      if (m && m[1]) return m[1];
    }

    try {
      return process.mainModule.require(`${mod}/package.json`).version;
    } catch (e) {
      // NB: This usually doesn't work, but sometimes maybe?
    }

    try {
      let p = _path2.default.join(rootDir, mod, 'package.json');
      return require(p).version;
    } catch (e) {
      return null;
    }
  }).find(x => !!x);

  if (!version) {
    throw new Error("Can't automatically discover the version of Electron, you probably need a .compilerc file");
  }

  return version;
}

/**
 * Returns the default .configrc if no configuration information can be found.
 *
 * @return {Object}  A list of default config settings for electron-compiler.
 */
function getDefaultConfiguration(rootDir) {
  return {
    'application/javascript': {
      "presets": [["env", {
        "targets": {
          "electron": getElectronVersion(rootDir)
        }
      }], "react"],
      "sourceMaps": "inline"
    }
  };
}

/**
 * Allows you to create new instances of all compilers that are supported by
 * electron-compile and use them directly. Currently supports Babel, CoffeeScript,
 * TypeScript, Less, and Jade.
 *
 * @return {Object}  An Object whose Keys are MIME types, and whose values
 * are instances of @{link CompilerBase}.
 */
function createCompilers() {
  if (!allCompilerClasses) {
    // First we want to see if electron-compilers itself has been installed with
    // devDependencies. If that's not the case, check to see if
    // electron-compilers is installed as a peer dependency (probably as a
    // devDependency of the root project).
    const locations = ['electron-compilers', '../../electron-compilers'];

    for (let location of locations) {
      try {
        allCompilerClasses = require(location);
      } catch (e) {
        // Yolo
      }
    }

    if (!allCompilerClasses) {
      throw new Error("Electron compilers not found but were requested to be loaded");
    }
  }

  // NB: Note that this code is carefully set up so that InlineHtmlCompiler
  // (i.e. classes with `createFromCompilers`) initially get an empty object,
  // but will have a reference to the final result of what we return, which
  // resolves the circular dependency we'd otherwise have here.
  let ret = {};
  let instantiatedClasses = allCompilerClasses.map(Klass => {
    if ('createFromCompilers' in Klass) {
      return Klass.createFromCompilers(ret);
    } else {
      return new Klass();
    }
  });

  instantiatedClasses.reduce((acc, x) => {
    let Klass = Object.getPrototypeOf(x).constructor;

    for (let type of Klass.getInputMimeTypes()) {
      acc[type] = x;
    }
    return acc;
  }, ret);

  return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25maWctcGFyc2VyLmpzIl0sIm5hbWVzIjpbImZpbGUiLCJyb290Q2FjaGVEaXIiLCJzb3VyY2VNYXBQYXRoIiwiaW5mbyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlIiwiYmFiZWwiLCJvdXJFbnYiLCJwcm9jZXNzIiwiZW52IiwiQkFCRUxfRU5WIiwiTk9ERV9FTlYiLCJhcHBSb290IiwiZGlybmFtZSIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uIiwib3B0aW9ucyIsImdldERlZmF1bHRDb25maWd1cmF0aW9uIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmMiLCJFTEVDVFJPTl9DT01QSUxFX0VOViIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlIiwicm9vdERpciIsImNvbXBpbGVyYyIsImpvaW4iLCJzdGF0U3luY05vRXhjZXB0aW9uIiwiZCIsImJhYmVscmMiLCJjcmVhdGVDb21waWxlckhvc3RGcm9tUHJvamVjdFJvb3QiLCJpbml0aWFsaXplR2xvYmFsSG9va3MiLCJpbml0IiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmNTeW5jIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ0ZpbGVTeW5jIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290U3luYyIsImNhbGN1bGF0ZURlZmF1bHRDb21waWxlQ2FjaGVEaXJlY3RvcnkiLCJjcmVhdGVDb21waWxlcnMiLCJyZXF1aXJlIiwiYWxsQ29tcGlsZXJDbGFzc2VzIiwiZnNQYXRoIiwic3RhdFN5bmMiLCJlIiwiY29tcGlsZXJIb3N0IiwiaXNQcm9kdWN0aW9uIiwiZ2xvYmFsVmFyIiwiZ2xvYmFsIiwid2luZG93IiwiZ2xvYmFsQ29tcGlsZXJIb3N0IiwidHlwZSIsImFwcCIsImluaXRpYWxpemVQcm90b2NvbEhvb2siLCJwcm90b2lmeSIsImlzUmVhZHkiLCJvbiIsIm1haW5Nb2R1bGUiLCJwcm9kdWN0aW9uTW9kZSIsImNhY2hlRGlyIiwiY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMiLCJjYWNoZVBhdGgiLCJtYXBQYXRoIiwibWFpbiIsImNvbXBpbGVycyIsImNyZWF0ZVNvdXJjZU1hcERpcmVjdG9yeSIsInN0cmluZ2lmeSIsImZpbGVDaGFuZ2VDYWNoZSIsImNvbXBpbGVySW5mbyIsImpzb24iLCJleGlzdHNTeW5jIiwiYnVmIiwicmVhZEZpbGVTeW5jIiwiZ3VuemlwU3luYyIsImxvYWRGcm9tRGF0YSIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwieCIsIm9wdHMiLCJFcnJvciIsInBhc3N0aHJvdWdoIiwiY29tcGlsZXJPcHRpb25zIiwicmV0IiwibWltZVR5cGVzVG9SZWdpc3RlciIsInNhdmVDb25maWd1cmF0aW9uU3luYyIsInRtcERpciIsIlRFTVAiLCJUTVBESVIiLCJoYXNoIiwiY3JlYXRlSGFzaCIsInVwZGF0ZSIsImV4ZWNQYXRoIiwiZGlnZXN0Iiwic3luYyIsImdldEVsZWN0cm9uVmVyc2lvbiIsInZlcnNpb25zIiwiZWxlY3Ryb24iLCJvdXJQa2dKc29uIiwidmVyc2lvbiIsIm1hcCIsIm1vZCIsImRldkRlcGVuZGVuY2llcyIsInZlclJhbmdlIiwibSIsIm1hdGNoIiwicCIsImZpbmQiLCJsb2NhdGlvbnMiLCJsb2NhdGlvbiIsImluc3RhbnRpYXRlZENsYXNzZXMiLCJLbGFzcyIsImNyZWF0ZUZyb21Db21waWxlcnMiLCJyZWR1Y2UiLCJhY2MiLCJnZXRQcm90b3R5cGVPZiIsImNvbnN0cnVjdG9yIiwiZ2V0SW5wdXRNaW1lVHlwZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUE0SkE7Ozs7Ozs7Ozs7OytCQVVPLFdBQTZDQSxJQUE3QyxFQUE0RjtBQUFBLFFBQXpDQyxZQUF5Qyx1RUFBNUIsSUFBNEI7QUFBQSxRQUF0QkMsYUFBc0IsdUVBQU4sSUFBTTs7QUFDakcsUUFBSUMsT0FBT0MsS0FBS0MsS0FBTCxFQUFXLE1BQU0sYUFBSUMsUUFBSixDQUFhTixJQUFi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UDtBQUNELEtBRkQsTUFFTztBQUNMLGFBQU8sSUFBSTRCLEtBQUosRUFBUDtBQUNEO0FBQ0YsR0FOeUIsQ0FBMUI7O0FBUUFELHNCQUFvQkcsTUFBcEIsQ0FBMkIsQ0FBQ0MsR0FBRCxFQUFLcEMsQ0FBTCxLQUFXO0FBQ3BDLFFBQUlpQyxRQUFRcEMsT0FBT3dDLGNBQVAsQ0FBc0JyQyxDQUF0QixFQUF5QnNDLFdBQXJDOztBQUVBLFNBQUssSUFBSWpFLElBQVQsSUFBaUI0RCxNQUFNTSxpQkFBTixFQUFqQixFQUE0QztBQUFFSCxVQUFJL0QsSUFBSixJQUFZMkIsQ0FBWjtBQUFnQjtBQUM5RCxXQUFPb0MsR0FBUDtBQUNELEdBTEQsRUFLRy9CLEdBTEg7O0FBT0EsU0FBT0EsR0FBUDtBQUNEIiwiZmlsZSI6ImNvbmZpZy1wYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XHJcbmltcG9ydCBta2RpcnAgZnJvbSAnbWtkaXJwJztcclxuaW1wb3J0IHtwZnN9IGZyb20gJy4vcHJvbWlzZSc7XHJcblxyXG5pbXBvcnQgRmlsZUNoYW5nZWRDYWNoZSBmcm9tICcuL2ZpbGUtY2hhbmdlLWNhY2hlJztcclxuaW1wb3J0IENvbXBpbGVySG9zdCBmcm9tICcuL2NvbXBpbGVyLWhvc3QnO1xyXG5pbXBvcnQgcmVnaXN0ZXJSZXF1aXJlRXh0ZW5zaW9uIGZyb20gJy4vcmVxdWlyZS1ob29rJztcclxuXHJcbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOmNvbmZpZy1wYXJzZXInKTtcclxuXHJcbi8vIE5COiBXZSBpbnRlbnRpb25hbGx5IGRlbGF5LWxvYWQgdGhpcyBzbyB0aGF0IGluIHByb2R1Y3Rpb24sIHlvdSBjYW4gY3JlYXRlXHJcbi8vIGNhY2hlLW9ubHkgdmVyc2lvbnMgb2YgdGhlc2UgY29tcGlsZXJzXHJcbmxldCBhbGxDb21waWxlckNsYXNzZXMgPSBudWxsO1xyXG5cclxuZnVuY3Rpb24gc3RhdFN5bmNOb0V4Y2VwdGlvbihmc1BhdGgpIHtcclxuICBpZiAoJ3N0YXRTeW5jTm9FeGNlcHRpb24nIGluIGZzKSB7XHJcbiAgICByZXR1cm4gZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihmc1BhdGgpO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIHJldHVybiBmcy5zdGF0U3luYyhmc1BhdGgpO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIHRoZSBnbG9iYWwgaG9va3MgKHByb3RvY29sIGhvb2sgZm9yIGZpbGU6LCBub2RlLmpzIGhvb2spXHJcbiAqIGluZGVwZW5kZW50IG9mIGluaXRpYWxpemluZyB0aGUgY29tcGlsZXIuIFRoaXMgbWV0aG9kIGlzIHVzdWFsbHkgY2FsbGVkIGJ5XHJcbiAqIGluaXQgaW5zdGVhZCBvZiBkaXJlY3RseVxyXG4gKlxyXG4gKiBAcGFyYW0ge0NvbXBpbGVySG9zdH0gY29tcGlsZXJIb3N0ICBUaGUgY29tcGlsZXIgaG9zdCB0byB1c2UuXHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5pdGlhbGl6ZUdsb2JhbEhvb2tzKGNvbXBpbGVySG9zdCwgaXNQcm9kdWN0aW9uPWZhbHNlKSB7XHJcbiAgbGV0IGdsb2JhbFZhciA9IChnbG9iYWwgfHwgd2luZG93KTtcclxuICBnbG9iYWxWYXIuZ2xvYmFsQ29tcGlsZXJIb3N0ID0gY29tcGlsZXJIb3N0O1xyXG5cclxuICByZWdpc3RlclJlcXVpcmVFeHRlbnNpb24oY29tcGlsZXJIb3N0LCBpc1Byb2R1Y3Rpb24pO1xyXG5cclxuICBpZiAoJ3R5cGUnIGluIHByb2Nlc3MgJiYgcHJvY2Vzcy50eXBlID09PSAnYnJvd3NlcicpIHtcclxuICAgIGNvbnN0IHsgYXBwIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xyXG4gICAgY29uc3QgeyBpbml0aWFsaXplUHJvdG9jb2xIb29rIH0gPSByZXF1aXJlKCcuL3Byb3RvY29sLWhvb2snKTtcclxuXHJcbiAgICBsZXQgcHJvdG9pZnkgPSBmdW5jdGlvbigpIHsgaW5pdGlhbGl6ZVByb3RvY29sSG9vayhjb21waWxlckhvc3QpOyB9O1xyXG4gICAgaWYgKGFwcC5pc1JlYWR5KCkpIHtcclxuICAgICAgcHJvdG9pZnkoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFwcC5vbigncmVhZHknLCBwcm90b2lmeSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgZWxlY3Ryb24tY29tcGlsZSBhbmQgc2V0IGl0IHVwLCBlaXRoZXIgZm9yIGRldmVsb3BtZW50IG9yXHJcbiAqIHByb2R1Y3Rpb24gdXNlLiBUaGlzIGlzIGFsbW9zdCBhbHdheXMgdGhlIG9ubHkgbWV0aG9kIHlvdSBuZWVkIHRvIHVzZSBpbiBvcmRlclxyXG4gKiB0byB1c2UgZWxlY3Ryb24tY29tcGlsZS5cclxuICpcclxuICogQHBhcmFtICB7c3RyaW5nfSBhcHBSb290ICBUaGUgdG9wLWxldmVsIGRpcmVjdG9yeSBmb3IgeW91ciBhcHBsaWNhdGlvbiAoaS5lLlxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBvbmUgd2hpY2ggaGFzIHlvdXIgcGFja2FnZS5qc29uKS5cclxuICpcclxuICogQHBhcmFtICB7c3RyaW5nfSBtYWluTW9kdWxlICBUaGUgbW9kdWxlIHRvIHJlcXVpcmUgaW4sIHJlbGF0aXZlIHRvIHRoZSBtb2R1bGVcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsaW5nIGluaXQsIHRoYXQgd2lsbCBzdGFydCB5b3VyIGFwcC4gV3JpdGUgdGhpc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzIGlmIHlvdSB3ZXJlIHdyaXRpbmcgYSByZXF1aXJlIGNhbGwgZnJvbSBoZXJlLlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtib29sfSBwcm9kdWN0aW9uTW9kZSAgIElmIGV4cGxpY2l0bHkgVHJ1ZS9GYWxzZSwgd2lsbCBzZXQgcmVhZC1vbmx5XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZSB0byBiZSBkaXNhYmxlZC9lbmFibGVkLiBJZiBub3QsIHdlJ2xsXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3Vlc3MgYmFzZWQgb24gdGhlIHByZXNlbmNlIG9mIGEgcHJvZHVjdGlvblxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlLlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNhY2hlRGlyICBJZiBub3QgcGFzc2VkIGluLCByZWFkLW9ubHkgd2lsbCBsb29rIGluXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBhcHBSb290Ly5jYWNoZWAgYW5kIGRldiBtb2RlIHdpbGwgY29tcGlsZSB0byBhXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBvcmFyeSBkaXJlY3RvcnkuIElmIGl0IGlzIHBhc3NlZCBpbiwgYm90aCBtb2Rlc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGNhY2hlIHRvL2Zyb20gYGFwcFJvb3Qve2NhY2hlRGlyfWBcclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZU1hcFBhdGggKG9wdGlvbmFsKSBUaGUgZGlyZWN0b3J5IHRvIHN0b3JlIHNvdXJjZW1hcCBzZXBhcmF0ZWx5XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGNvbXBpbGVyIG9wdGlvbiBlbmFibGVkIHRvIGVtaXQuXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgdG8gY2FjaGVQYXRoIGlmIG5vdCBzcGVjaWZpZWQsIHdpbGwgYmUgaWdub3JlZCBmb3IgcmVhZC1vbmx5IG1vZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5pdChhcHBSb290LCBtYWluTW9kdWxlLCBwcm9kdWN0aW9uTW9kZSA9IG51bGwsIGNhY2hlRGlyID0gbnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcclxuICBsZXQgY29tcGlsZXJIb3N0ID0gbnVsbDtcclxuICBsZXQgcm9vdENhY2hlRGlyID0gcGF0aC5qb2luKGFwcFJvb3QsIGNhY2hlRGlyIHx8ICcuY2FjaGUnKTtcclxuXHJcbiAgaWYgKHByb2R1Y3Rpb25Nb2RlID09PSBudWxsKSB7XHJcbiAgICBwcm9kdWN0aW9uTW9kZSA9ICEhc3RhdFN5bmNOb0V4Y2VwdGlvbihyb290Q2FjaGVEaXIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHByb2R1Y3Rpb25Nb2RlKSB7XHJcbiAgICBjb21waWxlckhvc3QgPSBDb21waWxlckhvc3QuY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMocm9vdENhY2hlRGlyLCBhcHBSb290KTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gaWYgY2FjaGVEaXIgd2FzIHBhc3NlZCBpbiwgcGFzcyBpdCBhbG9uZy4gT3RoZXJ3aXNlLCBkZWZhdWx0IHRvIGEgdGVtcGRpci5cclxuICAgIGNvbnN0IGNhY2hlUGF0aCA9IGNhY2hlRGlyID8gcm9vdENhY2hlRGlyIDogbnVsbDtcclxuICAgIGNvbnN0IG1hcFBhdGggPSBzb3VyY2VNYXBQYXRoID8gcGF0aC5qb2luKGFwcFJvb3QsIHNvdXJjZU1hcFBhdGgpIDogY2FjaGVQYXRoO1xyXG4gICAgY29tcGlsZXJIb3N0ID0gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290U3luYyhhcHBSb290LCBjYWNoZVBhdGgsIG1hcFBhdGgpO1xyXG4gIH1cclxuXHJcbiAgaW5pdGlhbGl6ZUdsb2JhbEhvb2tzKGNvbXBpbGVySG9zdCwgcHJvZHVjdGlvbk1vZGUpO1xyXG4gIHJlcXVpcmUubWFpbi5yZXF1aXJlKG1haW5Nb2R1bGUpO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSB7QGxpbmsgQ29tcGlsZXJIb3N0fSB3aXRoIHRoZSBnaXZlbiBpbmZvcm1hdGlvbi4gVGhpcyBtZXRob2QgaXNcclxuICogdXN1YWxseSBjYWxsZWQgYnkge0BsaW5rIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0uXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ3VyYXRpb24oaW5mbykge1xyXG4gIGxldCBjb21waWxlcnMgPSBjcmVhdGVDb21waWxlcnMoKTtcclxuICBsZXQgcm9vdENhY2hlRGlyID0gaW5mby5yb290Q2FjaGVEaXIgfHwgY2FsY3VsYXRlRGVmYXVsdENvbXBpbGVDYWNoZURpcmVjdG9yeSgpO1xyXG4gIGNvbnN0IHNvdXJjZU1hcFBhdGggPSBpbmZvLnNvdXJjZU1hcFBhdGggfHwgaW5mby5yb290Q2FjaGVEaXI7XHJcblxyXG4gIGlmIChpbmZvLnNvdXJjZU1hcFBhdGgpIHtcclxuICAgIGNyZWF0ZVNvdXJjZU1hcERpcmVjdG9yeShzb3VyY2VNYXBQYXRoKTtcclxuICB9XHJcblxyXG4gIGQoYENyZWF0aW5nIENvbXBpbGVySG9zdDogJHtKU09OLnN0cmluZ2lmeShpbmZvKX0sIHJvb3RDYWNoZURpciA9ICR7cm9vdENhY2hlRGlyfSwgc291cmNlTWFwUGF0aCA9ICR7c291cmNlTWFwUGF0aH1gKTtcclxuICBsZXQgZmlsZUNoYW5nZUNhY2hlID0gbmV3IEZpbGVDaGFuZ2VkQ2FjaGUoaW5mby5hcHBSb290KTtcclxuXHJcbiAgbGV0IGNvbXBpbGVySW5mbyA9IHBhdGguam9pbihyb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcclxuICBsZXQganNvbiA9IHt9O1xyXG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbXBpbGVySW5mbykpIHtcclxuICAgIGxldCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoY29tcGlsZXJJbmZvKTtcclxuICAgIGpzb24gPSBKU09OLnBhcnNlKHpsaWIuZ3VuemlwU3luYyhidWYpKTtcclxuICAgIGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGpzb24uZmlsZUNoYW5nZUNhY2hlLCBpbmZvLmFwcFJvb3QsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIE9iamVjdC5rZXlzKGluZm8ub3B0aW9ucyB8fCB7fSkuZm9yRWFjaCgoeCkgPT4ge1xyXG4gICAgbGV0IG9wdHMgPSBpbmZvLm9wdGlvbnNbeF07XHJcbiAgICBpZiAoISh4IGluIGNvbXBpbGVycykpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGb3VuZCBjb21waWxlciBzZXR0aW5ncyBmb3IgbWlzc2luZyBjb21waWxlcjogJHt4fWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5COiBMZXQncyBob3BlIHRoaXMgaXNuJ3QgYSB2YWxpZCBjb21waWxlciBvcHRpb24uLi5cclxuICAgIGlmIChvcHRzLnBhc3N0aHJvdWdoKSB7XHJcbiAgICAgIGNvbXBpbGVyc1t4XSA9IGNvbXBpbGVyc1sndGV4dC9wbGFpbiddO1xyXG4gICAgICBkZWxldGUgb3B0cy5wYXNzdGhyb3VnaDtcclxuICAgIH1cclxuXHJcbiAgICBkKGBTZXR0aW5nIG9wdGlvbnMgZm9yICR7eH06ICR7SlNPTi5zdHJpbmdpZnkob3B0cyl9YCk7XHJcbiAgICBjb21waWxlcnNbeF0uY29tcGlsZXJPcHRpb25zID0gb3B0cztcclxuICB9KTtcclxuXHJcbiAgbGV0IHJldCA9IG5ldyBDb21waWxlckhvc3Qocm9vdENhY2hlRGlyLCBjb21waWxlcnMsIGZpbGVDaGFuZ2VDYWNoZSwgZmFsc2UsIGNvbXBpbGVyc1sndGV4dC9wbGFpbiddLCBudWxsLCBqc29uLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xyXG5cclxuICAvLyBOQjogSXQncyBzdXBlciBpbXBvcnRhbnQgdGhhdCB3ZSBndWFyYW50ZWUgdGhhdCB0aGUgY29uZmlndXJhdGlvbiBpcyBzYXZlZFxyXG4gIC8vIG91dCwgYmVjYXVzZSB3ZSdsbCBuZWVkIHRvIHJlLXJlYWQgaXQgaW4gdGhlIHJlbmRlcmVyIHByb2Nlc3NcclxuICBkKGBDcmVhdGVkIGNvbXBpbGVyIGhvc3Qgd2l0aCBvcHRpb25zOiAke0pTT04uc3RyaW5naWZ5KGluZm8pfWApO1xyXG4gIHJldC5zYXZlQ29uZmlndXJhdGlvblN5bmMoKTtcclxuICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIGNvbXBpbGVyIGhvc3QgZnJvbSBhIC5iYWJlbHJjIGZpbGUuIFRoaXMgbWV0aG9kIGlzIHVzdWFsbHkgY2FsbGVkXHJcbiAqIGZyb20ge0BsaW5rIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0gaW5zdGVhZCBvZiB1c2VkIGRpcmVjdGx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGZpbGUgIFRoZSBwYXRoIHRvIGEgLmJhYmVscmMgZmlsZVxyXG4gKlxyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAob3B0aW9uYWwpICBUaGUgZGlyZWN0b3J5IHRvIHVzZSBhcyBhIGNhY2hlLlxyXG4gKlxyXG4gKiBAcmV0dXJuIHtQcm9taXNlPENvbXBpbGVySG9zdD59ICBBIHNldC11cCBjb21waWxlciBob3N0XHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmMoZmlsZSwgcm9vdENhY2hlRGlyPW51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsKSB7XHJcbiAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlLCAndXRmOCcpKTtcclxuXHJcbiAgLy8gcGFja2FnZS5qc29uXHJcbiAgaWYgKCdiYWJlbCcgaW4gaW5mbykge1xyXG4gICAgaW5mbyA9IGluZm8uYmFiZWw7XHJcbiAgfVxyXG5cclxuICBpZiAoJ2VudicgaW4gaW5mbykge1xyXG4gICAgbGV0IG91ckVudiA9IHByb2Nlc3MuZW52LkJBQkVMX0VOViB8fCBwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAnZGV2ZWxvcG1lbnQnO1xyXG4gICAgaW5mbyA9IGluZm8uZW52W291ckVudl07XHJcbiAgfVxyXG5cclxuICAvLyBBcmUgd2Ugc3RpbGwgcGFja2FnZS5qc29uIChpLmUuIGlzIHRoZXJlIG5vIGJhYmVsIGluZm8gd2hhdHNvZXZlcj8pXHJcbiAgaWYgKCduYW1lJyBpbiBpbmZvICYmICd2ZXJzaW9uJyBpbiBpbmZvKSB7XHJcbiAgICBsZXQgYXBwUm9vdCA9IHBhdGguZGlybmFtZShmaWxlKTtcclxuICAgIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XHJcbiAgICAgIGFwcFJvb3Q6IGFwcFJvb3QsXHJcbiAgICAgIG9wdGlvbnM6IGdldERlZmF1bHRDb25maWd1cmF0aW9uKGFwcFJvb3QpLFxyXG4gICAgICByb290Q2FjaGVEaXIsXHJcbiAgICAgIHNvdXJjZU1hcFBhdGhcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uKHtcclxuICAgIGFwcFJvb3Q6IHBhdGguZGlybmFtZShmaWxlKSxcclxuICAgIG9wdGlvbnM6IHtcclxuICAgICAgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnOiBpbmZvXHJcbiAgICB9LFxyXG4gICAgcm9vdENhY2hlRGlyLFxyXG4gICAgc291cmNlTWFwUGF0aFxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBjb21waWxlciBob3N0IGZyb20gYSAuY29tcGlsZXJjIGZpbGUuIFRoaXMgbWV0aG9kIGlzIHVzdWFsbHkgY2FsbGVkXHJcbiAqIGZyb20ge0BsaW5rIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0gaW5zdGVhZCBvZiB1c2VkIGRpcmVjdGx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGZpbGUgIFRoZSBwYXRoIHRvIGEgLmNvbXBpbGVyYyBmaWxlXHJcbiAqXHJcbiAqIEBwYXJhbSAge3N0cmluZ30gcm9vdENhY2hlRGlyIChvcHRpb25hbCkgIFRoZSBkaXJlY3RvcnkgdG8gdXNlIGFzIGEgY2FjaGUuXHJcbiAqXHJcbiAqIEByZXR1cm4ge1Byb21pc2U8Q29tcGlsZXJIb3N0Pn0gIEEgc2V0LXVwIGNvbXBpbGVyIGhvc3RcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlnRmlsZShmaWxlLCByb290Q2FjaGVEaXI9bnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcclxuICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGUsICd1dGY4JykpO1xyXG5cclxuICBpZiAoJ2VudicgaW4gaW5mbykge1xyXG4gICAgbGV0IG91ckVudiA9IHByb2Nlc3MuZW52LkVMRUNUUk9OX0NPTVBJTEVfRU5WIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdkZXZlbG9wbWVudCc7XHJcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XHJcbiAgICBhcHBSb290OiBwYXRoLmRpcm5hbWUoZmlsZSksXHJcbiAgICBvcHRpb25zOiBpbmZvLFxyXG4gICAgcm9vdENhY2hlRGlyLFxyXG4gICAgc291cmNlTWFwUGF0aFxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBjb25maWd1cmVkIHtAbGluayBDb21waWxlckhvc3R9IGluc3RhbmNlIGZyb20gdGhlIHByb2plY3Qgcm9vdFxyXG4gKiBkaXJlY3RvcnkuIFRoaXMgbWV0aG9kIGZpcnN0IHNlYXJjaGVzIGZvciBhIC5jb21waWxlcmMgKG9yIC5jb21waWxlcmMuanNvbiksIHRoZW4gZmFsbHMgYmFjayB0byB0aGVcclxuICogZGVmYXVsdCBsb2NhdGlvbnMgZm9yIEJhYmVsIGNvbmZpZ3VyYXRpb24gaW5mby4gSWYgbmVpdGhlciBhcmUgZm91bmQsIGRlZmF1bHRzXHJcbiAqIHRvIHN0YW5kYXJkIHNldHRpbmdzXHJcbiAqXHJcbiAqIEBwYXJhbSAge3N0cmluZ30gcm9vdERpciAgVGhlIHJvb3QgYXBwbGljYXRpb24gZGlyZWN0b3J5IChpLmUuIHRoZSBkaXJlY3RvcnlcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0IGhhcyB0aGUgYXBwJ3MgcGFja2FnZS5qc29uKVxyXG4gKlxyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAob3B0aW9uYWwpICBUaGUgZGlyZWN0b3J5IHRvIHVzZSBhcyBhIGNhY2hlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlTWFwUGF0aCAob3B0aW9uYWwpIFRoZSBkaXJlY3RvcnkgdG8gc3RvcmUgc291cmNlbWFwIHNlcGFyYXRlbHlcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgY29tcGlsZXIgb3B0aW9uIGVuYWJsZWQgdG8gZW1pdC5cclxuICpcclxuICogQHJldHVybiB7UHJvbWlzZTxDb21waWxlckhvc3Q+fSAgQSBzZXQtdXAgY29tcGlsZXIgaG9zdFxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdChyb290RGlyLCByb290Q2FjaGVEaXIgPSBudWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xyXG4gIGxldCBjb21waWxlcmMgPSBwYXRoLmpvaW4ocm9vdERpciwgJy5jb21waWxlcmMnKTtcclxuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihjb21waWxlcmMpKSB7XHJcbiAgICBkKGBGb3VuZCBhIC5jb21waWxlcmMgYXQgJHtjb21waWxlcmN9LCB1c2luZyBpdGApO1xyXG4gICAgcmV0dXJuIGF3YWl0IGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlKGNvbXBpbGVyYywgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcclxuICB9XHJcbiAgY29tcGlsZXJjICs9ICcuanNvbic7XHJcbiAgaWYgKHN0YXRTeW5jTm9FeGNlcHRpb24oY29tcGlsZXJjKSkge1xyXG4gICAgZChgRm91bmQgYSAuY29tcGlsZXJjIGF0ICR7Y29tcGlsZXJjfSwgdXNpbmcgaXRgKTtcclxuICAgIHJldHVybiBhd2FpdCBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlnRmlsZShjb21waWxlcmMsIHJvb3RDYWNoZURpciwgc291cmNlTWFwUGF0aCk7XHJcbiAgfVxyXG5cclxuICBsZXQgYmFiZWxyYyA9IHBhdGguam9pbihyb290RGlyLCAnLmJhYmVscmMnKTtcclxuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihiYWJlbHJjKSkge1xyXG4gICAgZChgRm91bmQgYSAuYmFiZWxyYyBhdCAke2JhYmVscmN9LCB1c2luZyBpdGApO1xyXG4gICAgcmV0dXJuIGF3YWl0IGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjKGJhYmVscmMsIHJvb3RDYWNoZURpciwgc291cmNlTWFwUGF0aCk7XHJcbiAgfVxyXG5cclxuICBkKGBVc2luZyBwYWNrYWdlLmpzb24gb3IgZGVmYXVsdCBwYXJhbWV0ZXJzIGF0ICR7cm9vdERpcn1gKTtcclxuICByZXR1cm4gYXdhaXQgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmMocGF0aC5qb2luKHJvb3REaXIsICdwYWNrYWdlLmpzb24nKSwgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyhmaWxlLCByb290Q2FjaGVEaXI9bnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcclxuICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JykpO1xyXG5cclxuICAvLyBwYWNrYWdlLmpzb25cclxuICBpZiAoJ2JhYmVsJyBpbiBpbmZvKSB7XHJcbiAgICBpbmZvID0gaW5mby5iYWJlbDtcclxuICB9XHJcblxyXG4gIGlmICgnZW52JyBpbiBpbmZvKSB7XHJcbiAgICBsZXQgb3VyRW52ID0gcHJvY2Vzcy5lbnYuQkFCRUxfRU5WIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdkZXZlbG9wbWVudCc7XHJcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcclxuICB9XHJcblxyXG4gIC8vIEFyZSB3ZSBzdGlsbCBwYWNrYWdlLmpzb24gKGkuZS4gaXMgdGhlcmUgbm8gYmFiZWwgaW5mbyB3aGF0c29ldmVyPylcclxuICBpZiAoJ25hbWUnIGluIGluZm8gJiYgJ3ZlcnNpb24nIGluIGluZm8pIHtcclxuICAgIGxldCBhcHBSb290ID0gcGF0aC5kaXJuYW1lKGZpbGUpXHJcbiAgICByZXR1cm4gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ3VyYXRpb24oe1xyXG4gICAgICBhcHBSb290OiBhcHBSb290LFxyXG4gICAgICBvcHRpb25zOiBnZXREZWZhdWx0Q29uZmlndXJhdGlvbihhcHBSb290KSxcclxuICAgICAgcm9vdENhY2hlRGlyLFxyXG4gICAgICBzb3VyY2VNYXBQYXRoXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XHJcbiAgICBhcHBSb290OiBwYXRoLmRpcm5hbWUoZmlsZSksXHJcbiAgICBvcHRpb25zOiB7XHJcbiAgICAgICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JzogaW5mb1xyXG4gICAgfSxcclxuICAgIHJvb3RDYWNoZURpcixcclxuICAgIHNvdXJjZU1hcFBhdGhcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlU3luYyhmaWxlLCByb290Q2FjaGVEaXI9bnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcclxuICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JykpO1xyXG5cclxuICBpZiAoJ2VudicgaW4gaW5mbykge1xyXG4gICAgbGV0IG91ckVudiA9IHByb2Nlc3MuZW52LkVMRUNUUk9OX0NPTVBJTEVfRU5WIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdkZXZlbG9wbWVudCc7XHJcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XHJcbiAgICBhcHBSb290OiBwYXRoLmRpcm5hbWUoZmlsZSksXHJcbiAgICBvcHRpb25zOiBpbmZvLFxyXG4gICAgcm9vdENhY2hlRGlyLFxyXG4gICAgc291cmNlTWFwUGF0aFxyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290U3luYyhyb290RGlyLCByb290Q2FjaGVEaXIgPSBudWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xyXG4gIGxldCBjb21waWxlcmMgPSBwYXRoLmpvaW4ocm9vdERpciwgJy5jb21waWxlcmMnKTtcclxuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihjb21waWxlcmMpKSB7XHJcbiAgICBkKGBGb3VuZCBhIC5jb21waWxlcmMgYXQgJHtjb21waWxlcmN9LCB1c2luZyBpdGApO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlU3luYyhjb21waWxlcmMsIHJvb3RDYWNoZURpciwgc291cmNlTWFwUGF0aCk7XHJcbiAgfVxyXG5cclxuICBsZXQgYmFiZWxyYyA9IHBhdGguam9pbihyb290RGlyLCAnLmJhYmVscmMnKTtcclxuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihiYWJlbHJjKSkge1xyXG4gICAgZChgRm91bmQgYSAuYmFiZWxyYyBhdCAke2JhYmVscmN9LCB1c2luZyBpdGApO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyhiYWJlbHJjLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xyXG4gIH1cclxuXHJcbiAgZChgVXNpbmcgcGFja2FnZS5qc29uIG9yIGRlZmF1bHQgcGFyYW1ldGVycyBhdCAke3Jvb3REaXJ9YCk7XHJcbiAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyhwYXRoLmpvaW4ocm9vdERpciwgJ3BhY2thZ2UuanNvbicpLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xyXG59XHJcblxyXG4vKipcclxuICogUmV0dXJucyB3aGF0IGVsZWN0cm9uLWNvbXBpbGUgd291bGQgdXNlIGFzIGEgZGVmYXVsdCByb290Q2FjaGVEaXIuIFVzdWFsbHkgb25seVxyXG4gKiB1c2VkIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXNcclxuICpcclxuICogQHJldHVybiB7c3RyaW5nfSAgQSBwYXRoIHRoYXQgbWF5IG9yIG1heSBub3QgZXhpc3Qgd2hlcmUgZWxlY3Ryb24tY29tcGlsZSB3b3VsZFxyXG4gKiAgICAgICAgICAgICAgICAgICBzZXQgdXAgYSBkZXZlbG9wbWVudCBtb2RlIGNhY2hlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZURlZmF1bHRDb21waWxlQ2FjaGVEaXJlY3RvcnkoKSB7XHJcbiAgbGV0IHRtcERpciA9IHByb2Nlc3MuZW52LlRFTVAgfHwgcHJvY2Vzcy5lbnYuVE1QRElSIHx8ICcvdG1wJztcclxuICBsZXQgaGFzaCA9IHJlcXVpcmUoJ2NyeXB0bycpLmNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShwcm9jZXNzLmV4ZWNQYXRoKS5kaWdlc3QoJ2hleCcpO1xyXG5cclxuICBsZXQgY2FjaGVEaXIgPSBwYXRoLmpvaW4odG1wRGlyLCBgY29tcGlsZUNhY2hlXyR7aGFzaH1gKTtcclxuICBta2RpcnAuc3luYyhjYWNoZURpcik7XHJcblxyXG4gIGQoYFVzaW5nIGRlZmF1bHQgY2FjaGUgZGlyZWN0b3J5OiAke2NhY2hlRGlyfWApO1xyXG4gIHJldHVybiBjYWNoZURpcjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU291cmNlTWFwRGlyZWN0b3J5KHNvdXJjZU1hcFBhdGgpIHtcclxuICBta2RpcnAuc3luYyhzb3VyY2VNYXBQYXRoKTtcclxuICBkKGBVc2luZyBzZXBhcmF0ZSBzb3VyY2VtYXAgcGF0aCBhdCAke3NvdXJjZU1hcFBhdGh9YCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEVsZWN0cm9uVmVyc2lvbihyb290RGlyKSB7XHJcbiAgaWYgKHByb2Nlc3MudmVyc2lvbnMuZWxlY3Ryb24pIHtcclxuICAgIHJldHVybiBwcm9jZXNzLnZlcnNpb25zLmVsZWN0cm9uO1xyXG4gIH1cclxuXHJcbiAgbGV0IG91clBrZ0pzb24gPSByZXF1aXJlKHBhdGguam9pbihyb290RGlyLCAncGFja2FnZS5qc29uJykpO1xyXG5cclxuICBsZXQgdmVyc2lvbiA9IFsnZWxlY3Ryb24tcHJlYnVpbHQtY29tcGlsZScsICdlbGVjdHJvbiddLm1hcChtb2QgPT4ge1xyXG4gICAgaWYgKG91clBrZ0pzb24uZGV2RGVwZW5kZW5jaWVzICYmIG91clBrZ0pzb24uZGV2RGVwZW5kZW5jaWVzW21vZF0pIHtcclxuICAgICAgLy8gTkI6IGxvbCB0aGlzIGNvZGVcclxuICAgICAgbGV0IHZlclJhbmdlID0gb3VyUGtnSnNvbi5kZXZEZXBlbmRlbmNpZXNbbW9kXTtcclxuICAgICAgbGV0IG0gPSB2ZXJSYW5nZS5tYXRjaCgvKFxcZCtcXC5cXGQrXFwuXFxkKykvKTtcclxuICAgICAgaWYgKG0gJiYgbVsxXSkgcmV0dXJuIG1bMV07XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIHByb2Nlc3MubWFpbk1vZHVsZS5yZXF1aXJlKGAke21vZH0vcGFja2FnZS5qc29uYCkudmVyc2lvbjtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgLy8gTkI6IFRoaXMgdXN1YWxseSBkb2Vzbid0IHdvcmssIGJ1dCBzb21ldGltZXMgbWF5YmU/XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgbGV0IHAgPSBwYXRoLmpvaW4ocm9vdERpciwgbW9kLCAncGFja2FnZS5qc29uJyk7XHJcbiAgICAgIHJldHVybiByZXF1aXJlKHApLnZlcnNpb247XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH0pLmZpbmQoeCA9PiAhIXgpO1xyXG5cclxuICBpZiAoIXZlcnNpb24pIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGF1dG9tYXRpY2FsbHkgZGlzY292ZXIgdGhlIHZlcnNpb24gb2YgRWxlY3Ryb24sIHlvdSBwcm9iYWJseSBuZWVkIGEgLmNvbXBpbGVyYyBmaWxlXCIpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHZlcnNpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBkZWZhdWx0IC5jb25maWdyYyBpZiBubyBjb25maWd1cmF0aW9uIGluZm9ybWF0aW9uIGNhbiBiZSBmb3VuZC5cclxuICpcclxuICogQHJldHVybiB7T2JqZWN0fSAgQSBsaXN0IG9mIGRlZmF1bHQgY29uZmlnIHNldHRpbmdzIGZvciBlbGVjdHJvbi1jb21waWxlci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0Q29uZmlndXJhdGlvbihyb290RGlyKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0Jzoge1xyXG4gICAgICBcInByZXNldHNcIjogW1xyXG4gICAgICAgIFtcImVudlwiLCB7XHJcbiAgICAgICAgICBcInRhcmdldHNcIjoge1xyXG4gICAgICAgICAgICBcImVsZWN0cm9uXCI6IGdldEVsZWN0cm9uVmVyc2lvbihyb290RGlyKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIFwicmVhY3RcIlxyXG4gICAgICBdLFxyXG4gICAgICBcInNvdXJjZU1hcHNcIjogXCJpbmxpbmVcIlxyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBbGxvd3MgeW91IHRvIGNyZWF0ZSBuZXcgaW5zdGFuY2VzIG9mIGFsbCBjb21waWxlcnMgdGhhdCBhcmUgc3VwcG9ydGVkIGJ5XHJcbiAqIGVsZWN0cm9uLWNvbXBpbGUgYW5kIHVzZSB0aGVtIGRpcmVjdGx5LiBDdXJyZW50bHkgc3VwcG9ydHMgQmFiZWwsIENvZmZlZVNjcmlwdCxcclxuICogVHlwZVNjcmlwdCwgTGVzcywgYW5kIEphZGUuXHJcbiAqXHJcbiAqIEByZXR1cm4ge09iamVjdH0gIEFuIE9iamVjdCB3aG9zZSBLZXlzIGFyZSBNSU1FIHR5cGVzLCBhbmQgd2hvc2UgdmFsdWVzXHJcbiAqIGFyZSBpbnN0YW5jZXMgb2YgQHtsaW5rIENvbXBpbGVyQmFzZX0uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJzKCkge1xyXG4gIGlmICghYWxsQ29tcGlsZXJDbGFzc2VzKSB7XHJcbiAgICAvLyBGaXJzdCB3ZSB3YW50IHRvIHNlZSBpZiBlbGVjdHJvbi1jb21waWxlcnMgaXRzZWxmIGhhcyBiZWVuIGluc3RhbGxlZCB3aXRoXHJcbiAgICAvLyBkZXZEZXBlbmRlbmNpZXMuIElmIHRoYXQncyBub3QgdGhlIGNhc2UsIGNoZWNrIHRvIHNlZSBpZlxyXG4gICAgLy8gZWxlY3Ryb24tY29tcGlsZXJzIGlzIGluc3RhbGxlZCBhcyBhIHBlZXIgZGVwZW5kZW5jeSAocHJvYmFibHkgYXMgYVxyXG4gICAgLy8gZGV2RGVwZW5kZW5jeSBvZiB0aGUgcm9vdCBwcm9qZWN0KS5cclxuICAgIGNvbnN0IGxvY2F0aW9ucyA9IFsnZWxlY3Ryb24tY29tcGlsZXJzJywgJy4uLy4uL2VsZWN0cm9uLWNvbXBpbGVycyddO1xyXG5cclxuICAgIGZvciAobGV0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGFsbENvbXBpbGVyQ2xhc3NlcyA9IHJlcXVpcmUobG9jYXRpb24pO1xyXG4gICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgLy8gWW9sb1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFhbGxDb21waWxlckNsYXNzZXMpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWxlY3Ryb24gY29tcGlsZXJzIG5vdCBmb3VuZCBidXQgd2VyZSByZXF1ZXN0ZWQgdG8gYmUgbG9hZGVkXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTkI6IE5vdGUgdGhhdCB0aGlzIGNvZGUgaXMgY2FyZWZ1bGx5IHNldCB1cCBzbyB0aGF0IElubGluZUh0bWxDb21waWxlclxyXG4gIC8vIChpLmUuIGNsYXNzZXMgd2l0aCBgY3JlYXRlRnJvbUNvbXBpbGVyc2ApIGluaXRpYWxseSBnZXQgYW4gZW1wdHkgb2JqZWN0LFxyXG4gIC8vIGJ1dCB3aWxsIGhhdmUgYSByZWZlcmVuY2UgdG8gdGhlIGZpbmFsIHJlc3VsdCBvZiB3aGF0IHdlIHJldHVybiwgd2hpY2hcclxuICAvLyByZXNvbHZlcyB0aGUgY2lyY3VsYXIgZGVwZW5kZW5jeSB3ZSdkIG90aGVyd2lzZSBoYXZlIGhlcmUuXHJcbiAgbGV0IHJldCA9IHt9O1xyXG4gIGxldCBpbnN0YW50aWF0ZWRDbGFzc2VzID0gYWxsQ29tcGlsZXJDbGFzc2VzLm1hcCgoS2xhc3MpID0+IHtcclxuICAgIGlmICgnY3JlYXRlRnJvbUNvbXBpbGVycycgaW4gS2xhc3MpIHtcclxuICAgICAgcmV0dXJuIEtsYXNzLmNyZWF0ZUZyb21Db21waWxlcnMocmV0KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBuZXcgS2xhc3MoKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgaW5zdGFudGlhdGVkQ2xhc3Nlcy5yZWR1Y2UoKGFjYyx4KSA9PiB7XHJcbiAgICBsZXQgS2xhc3MgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkuY29uc3RydWN0b3I7XHJcblxyXG4gICAgZm9yIChsZXQgdHlwZSBvZiBLbGFzcy5nZXRJbnB1dE1pbWVUeXBlcygpKSB7IGFjY1t0eXBlXSA9IHg7IH1cclxuICAgIHJldHVybiBhY2M7XHJcbiAgfSwgcmV0KTtcclxuXHJcbiAgcmV0dXJuIHJldDtcclxufVxyXG4iXX0=