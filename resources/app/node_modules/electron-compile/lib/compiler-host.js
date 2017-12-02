'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promise = require('./promise');

var _forAllFiles = require('./for-all-files');

var _compileCache = require('./compile-cache');

var _compileCache2 = _interopRequireDefault(_compileCache);

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _readOnlyCompiler = require('./read-only-compiler');

var _readOnlyCompiler2 = _interopRequireDefault(_readOnlyCompiler);

var _browserSignal = require('./browser-signal');

require('rxjs/add/operator/map');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:compiler-host');

require('./rig-mime-types').init();

// This isn't even my
const finalForms = {
  'text/javascript': true,
  'application/javascript': true,
  'text/html': true,
  'text/css': true,
  'image/svg+xml': true,
  'application/json': true
};

/**
 * This class is the top-level class that encapsulates all of the logic of
 * compiling and caching application code. If you're looking for a "Main class",
 * this is it.
 *
 * This class can be created directly but it is usually created via the methods
 * in config-parser, which will among other things, set up the compiler options
 * given a project root.
 *
 * CompilerHost is also the top-level class that knows how to serialize all of the
 * information necessary to recreate itself, either as a development host (i.e.
 * will allow cache misses and actual compilation), or as a read-only version of
 * itself for production.
 */
class CompilerHost {
  /**
   * Creates an instance of CompilerHost. You probably want to use the methods
   * in config-parser for development, or {@link createReadonlyFromConfiguration}
   * for production instead.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache
   *
   * @param  {Object} compilers  an Object whose keys are input MIME types and
   *                             whose values are instances of CompilerBase. Create
   *                             this via the {@link createCompilers} method in
   *                             config-parser.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  If True, cache misses will fail and
   *                                 compilation will not be attempted.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
   *                               if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   */
  constructor(rootCacheDir, compilers, fileChangeCache, readOnlyMode) {
    let fallbackCompiler = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    let sourceMapPath = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    let mimeTypesToRegister = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

    let compilersByMimeType = Object.assign({}, compilers);
    Object.assign(this, { rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode, fallbackCompiler });
    this.appRoot = this.fileChangeCache.appRoot;

    this.cachesForCompilers = Object.keys(compilersByMimeType).reduce((acc, x) => {
      let compiler = compilersByMimeType[x];
      if (acc.has(compiler)) return acc;

      acc.set(compiler, _compileCache2.default.createFromCompiler(rootCacheDir, compiler, fileChangeCache, readOnlyMode, sourceMapPath));
      return acc;
    }, new Map());

    this.mimeTypesToRegister = mimeTypesToRegister || {};
  }

  /**
   * Creates a production-mode CompilerHost from the previously saved
   * configuration
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static createReadonlyFromConfiguration(rootCacheDir, appRoot) {
    let fallbackCompiler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    return _asyncToGenerator(function* () {
      let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pfs.readFile(target);
      let info = JSON.parse((yield _promise.pzlib.gunzip(buf)));

      let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, true);

      let compilers = Object.keys(info.compilers).reduce(function (acc, x) {
        let cur = info.compilers[x];
        acc[x] = new _readOnlyCompiler2.default(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

        return acc;
      }, {});

      return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler, null, info.mimeTypesToRegister);
    })();
  }

  /**
   * Creates a development-mode CompilerHost from the previously saved
   * configuration.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {Object} compilersByMimeType  an Object whose keys are input MIME
   *                                       types and whose values are instances
   *                                       of CompilerBase. Create this via the
   *                                       {@link createCompilers} method in
   *                                       config-parser.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static createFromConfiguration(rootCacheDir, appRoot, compilersByMimeType) {
    let fallbackCompiler = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    return _asyncToGenerator(function* () {
      let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pfs.readFile(target);
      let info = JSON.parse((yield _promise.pzlib.gunzip(buf)));

      let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, false);

      Object.keys(info.compilers).forEach(function (x) {
        let cur = info.compilers[x];
        compilersByMimeType[x].compilerOptions = cur.compilerOptions;
      });

      return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler, null, info.mimeTypesToRegister);
    })();
  }

  /**
   * Saves the current compiler configuration to a file that
   * {@link createReadonlyFromConfiguration} can use to recreate the current
   * compiler environment
   *
   * @return {Promise}  Completion
   */
  saveConfiguration() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let serializedCompilerOpts = Object.keys(_this.compilersByMimeType).reduce(function (acc, x) {
        let compiler = _this.compilersByMimeType[x];
        let Klass = Object.getPrototypeOf(compiler).constructor;

        let val = {
          name: Klass.name,
          inputMimeTypes: Klass.getInputMimeTypes(),
          compilerOptions: compiler.compilerOptions,
          compilerVersion: compiler.getCompilerVersion()
        };

        acc[x] = val;
        return acc;
      }, {});

      let info = {
        fileChangeCache: _this.fileChangeCache.getSavedData(),
        compilers: serializedCompilerOpts,
        mimeTypesToRegister: _this.mimeTypesToRegister
      };

      let target = _path2.default.join(_this.rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify(info)));
      yield _promise.pfs.writeFile(target, buf);
    })();
  }

  /**
   * Compiles a file and returns the compiled result.
   *
   * @param  {string} filePath  The path to the file to compile
   *
   * @return {Promise<object>}  An Object with the compiled result
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  compile(filePath) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let ret = yield _this2.readOnlyMode ? _this2.compileReadOnly(filePath) : _this2.fullCompile(filePath);

      if (ret.mimeType === 'application/javascript') {
        _this2.mimeTypesToRegister[_mimeTypes2.default.lookup(filePath)] = true;
      }

      return ret;
    })();
  }

  /**
   * Handles compilation in read-only mode
   *
   * @private
   */
  compileReadOnly(filePath) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // We guarantee that node_modules are always shipped directly
      let type = _mimeTypes2.default.lookup(filePath);
      if (_fileChangeCache2.default.isInNodeModules(filePath)) {
        return {
          mimeType: type || 'application/javascript',
          code: yield _promise.pfs.readFile(filePath, 'utf8')
        };
      }

      let hashInfo = yield _this3.fileChangeCache.getHashForPath(filePath);

      // NB: Here, we're basically only using the compiler here to find
      // the appropriate CompileCache
      let compiler = CompilerHost.shouldPassthrough(hashInfo) ? _this3.getPassthroughCompiler() : _this3.compilersByMimeType[type || '__lolnothere'];

      // NB: We don't put this into shouldPassthrough because Inline HTML
      // compiler is technically of type finalForms (i.e. a browser can
      // natively handle this content), yet its compiler is
      // InlineHtmlCompiler. However, we still want to catch standard CSS files
      // which will be processed by PassthroughCompiler.
      if (finalForms[type] && !compiler) {
        compiler = _this3.getPassthroughCompiler();
      }

      if (!compiler) {
        compiler = _this3.fallbackCompiler;

        var _ref = yield compiler.get(filePath);

        let code = _ref.code,
            binaryData = _ref.binaryData,
            mimeType = _ref.mimeType;

        return { code: code || binaryData, mimeType };
      }

      let cache = _this3.cachesForCompilers.get(compiler);

      var _ref2 = yield cache.get(filePath);

      let code = _ref2.code,
          binaryData = _ref2.binaryData,
          mimeType = _ref2.mimeType;


      code = code || binaryData;
      if (!code || !mimeType) {
        throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
      }

      return { code, mimeType };
    })();
  }

  /**
   * Handles compilation in read-write mode
   *
   * @private
   */
  fullCompile(filePath) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      d(`Compiling ${filePath}`);
      let type = _mimeTypes2.default.lookup(filePath);

      (0, _browserSignal.send)('electron-compile-compiled-file', { filePath, mimeType: type });

      let hashInfo = yield _this4.fileChangeCache.getHashForPath(filePath);

      if (hashInfo.isInNodeModules) {
        let code = hashInfo.sourceCode || (yield _promise.pfs.readFile(filePath, 'utf8'));
        code = yield CompilerHost.fixNodeModulesSourceMapping(code, filePath, _this4.fileChangeCache.appRoot);
        return { code, mimeType: type };
      }

      let compiler = CompilerHost.shouldPassthrough(hashInfo) ? _this4.getPassthroughCompiler() : _this4.compilersByMimeType[type || '__lolnothere'];

      if (!compiler) {
        d(`Falling back to passthrough compiler for ${filePath}`);
        compiler = _this4.fallbackCompiler;
      }

      if (!compiler) {
        throw new Error(`Couldn't find a compiler for ${filePath}`);
      }

      let cache = _this4.cachesForCompilers.get(compiler);
      return yield cache.getOrFetch(filePath, function (filePath, hashInfo) {
        return _this4.compileUncached(filePath, hashInfo, compiler);
      });
    })();
  }

  /**
   * Handles invoking compilers independent of caching
   *
   * @private
   */
  compileUncached(filePath, hashInfo, compiler) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let inputMimeType = _mimeTypes2.default.lookup(filePath);

      if (hashInfo.isFileBinary) {
        return {
          binaryData: hashInfo.binaryData || (yield _promise.pfs.readFile(filePath)),
          mimeType: inputMimeType,
          dependentFiles: []
        };
      }

      let ctx = {};
      let code = hashInfo.sourceCode || (yield _promise.pfs.readFile(filePath, 'utf8'));

      if (!(yield compiler.shouldCompileFile(code, ctx))) {
        d(`Compiler returned false for shouldCompileFile: ${filePath}`);
        return { code, mimeType: _mimeTypes2.default.lookup(filePath), dependentFiles: [] };
      }

      let dependentFiles = yield compiler.determineDependentFiles(code, filePath, ctx);

      d(`Using compiler options: ${JSON.stringify(compiler.compilerOptions)}`);
      let result = yield compiler.compile(code, filePath, ctx);

      let shouldInlineHtmlify = inputMimeType !== 'text/html' && result.mimeType === 'text/html';

      let isPassthrough = result.mimeType === 'text/plain' || !result.mimeType || CompilerHost.shouldPassthrough(hashInfo);

      if (finalForms[result.mimeType] && !shouldInlineHtmlify || isPassthrough) {
        // Got something we can use in-browser, let's return it
        return Object.assign(result, { dependentFiles });
      } else {
        d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

        hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
        compiler = _this5.compilersByMimeType[result.mimeType || '__lolnothere'];

        if (!compiler) {
          d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

          throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
        }

        return yield _this5.compileUncached(`${filePath}.${_mimeTypes2.default.extension(result.mimeType || 'txt')}`, hashInfo, compiler);
      }
    })();
  }

  /**
   * Pre-caches an entire directory of files recursively. Usually used for
   * building custom compiler tooling.
   *
   * @param  {string} rootDirectory  The top-level directory to compile
   *
   * @param  {Function} shouldCompile (optional)  A Function which allows the
   *                                  caller to disable compiling certain files.
   *                                  It takes a fully-qualified path to a file,
   *                                  and should return a Boolean.
   *
   * @return {Promise}  Completion.
   */
  compileAll(rootDirectory) {
    var _this6 = this;

    let shouldCompile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    return _asyncToGenerator(function* () {
      let should = shouldCompile || function () {
        return true;
      };

      yield (0, _forAllFiles.forAllFiles)(rootDirectory, function (f) {
        if (!should(f)) return;

        d(`Compiling ${f}`);
        return _this6.compile(f, _this6.compilersByMimeType);
      });
    })();
  }

  listenToCompileEvents() {
    return (0, _browserSignal.listen)('electron-compile-compiled-file').map((_ref3) => {
      var _ref4 = _slicedToArray(_ref3, 1);

      let x = _ref4[0];
      return x;
    });
  }

  /*
   * Sync Methods
   */

  compileSync(filePath) {
    let ret = this.readOnlyMode ? this.compileReadOnlySync(filePath) : this.fullCompileSync(filePath);

    if (ret.mimeType === 'application/javascript') {
      this.mimeTypesToRegister[_mimeTypes2.default.lookup(filePath)] = true;
    }

    return ret;
  }

  static createReadonlyFromConfigurationSync(rootCacheDir, appRoot) {
    let fallbackCompiler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = _fs2.default.readFileSync(target);
    let info = JSON.parse(_zlib2.default.gunzipSync(buf));

    let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, true);

    let compilers = Object.keys(info.compilers).reduce((acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new _readOnlyCompiler2.default(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

      return acc;
    }, {});

    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler, null, info.mimeTypesToRegister);
  }

  static createFromConfigurationSync(rootCacheDir, appRoot, compilersByMimeType) {
    let fallbackCompiler = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = _fs2.default.readFileSync(target);
    let info = JSON.parse(_zlib2.default.gunzipSync(buf));

    let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, false);

    Object.keys(info.compilers).forEach(x => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });

    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler, null, info.mimeTypesToRegister);
  }

  saveConfigurationSync() {
    let serializedCompilerOpts = Object.keys(this.compilersByMimeType).reduce((acc, x) => {
      let compiler = this.compilersByMimeType[x];
      let Klass = Object.getPrototypeOf(compiler).constructor;

      let val = {
        name: Klass.name,
        inputMimeTypes: Klass.getInputMimeTypes(),
        compilerOptions: compiler.compilerOptions,
        compilerVersion: compiler.getCompilerVersion()
      };

      acc[x] = val;
      return acc;
    }, {});

    let info = {
      fileChangeCache: this.fileChangeCache.getSavedData(),
      compilers: serializedCompilerOpts,
      mimeTypesToRegister: this.mimeTypesToRegister
    };

    let target = _path2.default.join(this.rootCacheDir, 'compiler-info.json.gz');
    let buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify(info)));
    _fs2.default.writeFileSync(target, buf);
  }

  compileReadOnlySync(filePath) {
    // We guarantee that node_modules are always shipped directly
    let type = _mimeTypes2.default.lookup(filePath);
    if (_fileChangeCache2.default.isInNodeModules(filePath)) {
      return {
        mimeType: type || 'application/javascript',
        code: _fs2.default.readFileSync(filePath, 'utf8')
      };
    }

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);

    // We guarantee that node_modules are always shipped directly
    if (hashInfo.isInNodeModules) {
      return {
        mimeType: type,
        code: hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8')
      };
    }

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ? this.getPassthroughCompiler() : this.compilersByMimeType[type || '__lolnothere'];

    // NB: We don't put this into shouldPassthrough because Inline HTML
    // compiler is technically of type finalForms (i.e. a browser can
    // natively handle this content), yet its compiler is
    // InlineHtmlCompiler. However, we still want to catch standard CSS files
    // which will be processed by PassthroughCompiler.
    if (finalForms[type] && !compiler) {
      compiler = this.getPassthroughCompiler();
    }

    if (!compiler) {
      compiler = this.fallbackCompiler;

      var _compiler$getSync = compiler.getSync(filePath);

      let code = _compiler$getSync.code,
          binaryData = _compiler$getSync.binaryData,
          mimeType = _compiler$getSync.mimeType;

      return { code: code || binaryData, mimeType };
    }

    let cache = this.cachesForCompilers.get(compiler);

    var _cache$getSync = cache.getSync(filePath);

    let code = _cache$getSync.code,
        binaryData = _cache$getSync.binaryData,
        mimeType = _cache$getSync.mimeType;


    code = code || binaryData;
    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  fullCompileSync(filePath) {
    d(`Compiling ${filePath}`);

    let type = _mimeTypes2.default.lookup(filePath);

    (0, _browserSignal.send)('electron-compile-compiled-file', { filePath, mimeType: type });

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);

    if (hashInfo.isInNodeModules) {
      let code = hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8');
      code = CompilerHost.fixNodeModulesSourceMappingSync(code, filePath, this.fileChangeCache.appRoot);
      return { code, mimeType: type };
    }

    let compiler = CompilerHost.shouldPassthrough(hashInfo) ? this.getPassthroughCompiler() : this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) {
      d(`Falling back to passthrough compiler for ${filePath}`);
      compiler = this.fallbackCompiler;
    }

    if (!compiler) {
      throw new Error(`Couldn't find a compiler for ${filePath}`);
    }

    let cache = this.cachesForCompilers.get(compiler);
    return cache.getOrFetchSync(filePath, (filePath, hashInfo) => this.compileUncachedSync(filePath, hashInfo, compiler));
  }

  compileUncachedSync(filePath, hashInfo, compiler) {
    let inputMimeType = _mimeTypes2.default.lookup(filePath);

    if (hashInfo.isFileBinary) {
      return {
        binaryData: hashInfo.binaryData || _fs2.default.readFileSync(filePath),
        mimeType: inputMimeType,
        dependentFiles: []
      };
    }

    let ctx = {};
    let code = hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8');

    if (!compiler.shouldCompileFileSync(code, ctx)) {
      d(`Compiler returned false for shouldCompileFile: ${filePath}`);
      return { code, mimeType: _mimeTypes2.default.lookup(filePath), dependentFiles: [] };
    }

    let dependentFiles = compiler.determineDependentFilesSync(code, filePath, ctx);

    let result = compiler.compileSync(code, filePath, ctx);

    let shouldInlineHtmlify = inputMimeType !== 'text/html' && result.mimeType === 'text/html';

    let isPassthrough = result.mimeType === 'text/plain' || !result.mimeType || CompilerHost.shouldPassthrough(hashInfo);

    if (finalForms[result.mimeType] && !shouldInlineHtmlify || isPassthrough) {
      // Got something we can use in-browser, let's return it
      return Object.assign(result, { dependentFiles });
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
      compiler = this.compilersByMimeType[result.mimeType || '__lolnothere'];

      if (!compiler) {
        d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

        throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
      }

      return this.compileUncachedSync(`${filePath}.${_mimeTypes2.default.extension(result.mimeType || 'txt')}`, hashInfo, compiler);
    }
  }

  compileAllSync(rootDirectory) {
    let shouldCompile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    let should = shouldCompile || function () {
      return true;
    };

    (0, _forAllFiles.forAllFilesSync)(rootDirectory, f => {
      if (!should(f)) return;
      return this.compileSync(f, this.compilersByMimeType);
    });
  }

  /*
   * Other stuff
   */

  /**
   * Returns the passthrough compiler
   *
   * @private
   */
  getPassthroughCompiler() {
    return this.compilersByMimeType['text/plain'];
  }

  /**
   * Determines whether we should even try to compile the content. Note that in
   * some cases, content will still be in cache even if this returns true, and
   * in other cases (isInNodeModules), we'll know explicitly to not even bother
   * looking in the cache.
   *
   * @private
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }

  /**
   * Look at the code of a node modules and see the sourceMapping path.
   * If there is any, check the path and try to fix it with and
   * root relative path.
   * @private
   */
  static fixNodeModulesSourceMapping(sourceCode, sourcePath, appRoot) {
    return _asyncToGenerator(function* () {
      let regexSourceMapping = /\/\/#.*sourceMappingURL=(?!data:)([^"'].*)/i;
      let sourceMappingCheck = sourceCode.match(regexSourceMapping);

      if (sourceMappingCheck && sourceMappingCheck[1] && sourceMappingCheck[1] !== '') {
        let sourceMapPath = sourceMappingCheck[1];

        try {
          yield _promise.pfs.stat(sourceMapPath);
        } catch (error) {
          let normRoot = _path2.default.normalize(appRoot);
          let absPathToModule = _path2.default.dirname(sourcePath.replace(normRoot, '').substring(1));
          let newMapPath = _path2.default.join(absPathToModule, sourceMapPath);

          return sourceCode.replace(regexSourceMapping, `//# sourceMappingURL=${newMapPath}`);
        }
      }

      return sourceCode;
    })();
  }

  /**
   * Look at the code of a node modules and see the sourceMapping path.
   * If there is any, check the path and try to fix it with and
   * root relative path.
   * @private
   */
  static fixNodeModulesSourceMappingSync(sourceCode, sourcePath, appRoot) {
    let regexSourceMapping = /\/\/#.*sourceMappingURL=(?!data:)([^"'].*)/i;
    let sourceMappingCheck = sourceCode.match(regexSourceMapping);

    if (sourceMappingCheck && sourceMappingCheck[1] && sourceMappingCheck[1] !== '') {
      let sourceMapPath = sourceMappingCheck[1];

      try {
        _fs2.default.statSync(sourceMapPath);
      } catch (error) {
        let normRoot = _path2.default.normalize(appRoot);
        let absPathToModule = _path2.default.dirname(sourcePath.replace(normRoot, '').substring(1));
        let newMapPath = _path2.default.join(absPathToModule, sourceMapPath);

        return sourceCode.replace(regexSourceMapping, `//# sourceMappingURL=${newMapPath}`);
      }
    }

    return sourceCode;
  }
}
exports.default = CompilerHost;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21waWxlci1ob3N0LmpzIl0sIm5hbWVzIjpbImQiLCJyZXF1aXJlIiwiaW5pdCIsImZpbmFsRm9ybXMiLCJDb21waWxlckhvc3QiLCJjb25zdHJ1Y3RvciIsInJvb3RDYWNoZURpciIsImNvbXBpbGVycyIsImZpbGVDaGFuZ2VDYWNoZSIsInJlYWRPbmx5TW9kZSIsImZhbGxiYWNrQ29tcGlsZXIiLCJzb3VyY2VNYXBQYXRoIiwibWltZVR5cGVzVG9SZWdpc3RlciIsImNvbXBpbGVyc0J5TWltZVR5cGUiLCJPYmplY3QiLCJhc3NpZ24iLCJhcHBSb290IiwiY2FjaGVzRm9yQ29tcGlsZXJzIiwia2V5cyIsInJlZHVjZSIsImFjYyIsIngiLCJjb21waWxlciIsImhhcyIsInNldCIsImNyZWF0ZUZyb21Db21waWxlciIsIk1hcCIsImNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb24iLCJ0YXJnZXQiLCJqb2luIiwiYnVmIiwicmVhZEZpbGUiLCJpbmZvIiwiSlNPTiIsInBhcnNlIiwiZ3VuemlwIiwibG9hZEZyb21EYXRhIiwiY3VyIiwibmFtZSIsImNvbXBpbGVyVmVyc2lvbiIsImNvbXBpbGVyT3B0aW9ucyIsImlucHV0TWltZVR5cGVzIiwiY3JlYXRlRnJvbUNvbmZpZ3VyYXRpb24iLCJmb3JFYWNoIiwic2F2ZUNvbmZpZ3VyYXRpb24iLCJzZXJpYWxpemVkQ29tcGlsZXJPcHRzIiwiS2xhc3MiLCJnZXRQcm90b3R5cGVPZiIsInZhbCIsImdldElucHV0TWltZVR5cGVzIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIiwiZ2V0U2F2ZWREYXRhIiwiZ3ppcCIsIkJ1ZmZlciIsInN0cmluZ2lmeSIsIndyaXRlRmlsZSIsImNvbXBpbGUiLCJmaWxlUGF0aCIsInJldCIsImNvbXBpbGVSZWFkT25seSIsImZ1bGxDb21waWxlIiwibWltZVR5cGUiLCJsb29rdXAiLCJ0eXBlIiwiaXNJbk5vZGVNb2R1bGVzIiwiY29kZSIsImhhc2hJbmZvIiwiZ2V0SGFzaEZvclBhdGgiLCJzaG91bGRQYXNzdGhyb3VnaCIsImdldFBhc3N0aHJvdWdoQ29tcGlsZXIiLCJnZXQiLCJiaW5hcnlEYXRhIiwiY2FjaGUiLCJFcnJvciIsInNvdXJjZUNvZGUiLCJmaXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmciLCJnZXRPckZldGNoIiwiY29tcGlsZVVuY2FjaGVkIiwiaW5wdXRNaW1lVHlwZSIsImlzRmlsZUJpbmFyeSIsImRlcGVuZGVudEZpbGVzIiwiY3R4Iiwic2hvdWxkQ29tcGlsZUZpbGUiLCJkZXRlcm1pbmVEZXBlbmRlbnRGaWxlcyIsInJlc3VsdCIsInNob3VsZElubGluZUh0bWxpZnkiLCJpc1Bhc3N0aHJvdWdoIiwiZXh0ZW5zaW9uIiwiY29tcGlsZUFsbCIsInJvb3REaXJlY3RvcnkiLCJzaG91bGRDb21waWxlIiwic2hvdWxkIiwiZiIsImxpc3RlblRvQ29tcGlsZUV2ZW50cyIsIm1hcCIsImNvbXBpbGVTeW5jIiwiY29tcGlsZVJlYWRPbmx5U3luYyIsImZ1bGxDb21waWxlU3luYyIsImNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb25TeW5jIiwicmVhZEZpbGVTeW5jIiwiZ3VuemlwU3luYyIsImNyZWF0ZUZyb21Db25maWd1cmF0aW9uU3luYyIsInNhdmVDb25maWd1cmF0aW9uU3luYyIsImd6aXBTeW5jIiwid3JpdGVGaWxlU3luYyIsImdldEhhc2hGb3JQYXRoU3luYyIsImdldFN5bmMiLCJmaXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmdTeW5jIiwiZ2V0T3JGZXRjaFN5bmMiLCJjb21waWxlVW5jYWNoZWRTeW5jIiwic2hvdWxkQ29tcGlsZUZpbGVTeW5jIiwiZGV0ZXJtaW5lRGVwZW5kZW50RmlsZXNTeW5jIiwiY29tcGlsZUFsbFN5bmMiLCJpc01pbmlmaWVkIiwiaGFzU291cmNlTWFwIiwic291cmNlUGF0aCIsInJlZ2V4U291cmNlTWFwcGluZyIsInNvdXJjZU1hcHBpbmdDaGVjayIsIm1hdGNoIiwic3RhdCIsImVycm9yIiwibm9ybVJvb3QiLCJub3JtYWxpemUiLCJhYnNQYXRoVG9Nb2R1bGUiLCJkaXJuYW1lIiwicmVwbGFjZSIsInN1YnN0cmluZyIsIm5ld01hcFBhdGgiLCJzdGF0U3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUVBOztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUlBOzs7Ozs7QUFGQSxNQUFNQSxJQUFJQyxRQUFRLE9BQVIsRUFBaUIsZ0NBQWpCLENBQVY7O0FBSUFBLFFBQVEsa0JBQVIsRUFBNEJDLElBQTVCOztBQUVBO0FBQ0EsTUFBTUMsYUFBYTtBQUNqQixxQkFBbUIsSUFERjtBQUVqQiw0QkFBMEIsSUFGVDtBQUdqQixlQUFhLElBSEk7QUFJakIsY0FBWSxJQUpLO0FBS2pCLG1CQUFpQixJQUxBO0FBTWpCLHNCQUFvQjtBQU5ILENBQW5COztBQVNBOzs7Ozs7Ozs7Ozs7OztBQWNlLE1BQU1DLFlBQU4sQ0FBbUI7QUFDaEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThCQUMsY0FBWUMsWUFBWixFQUEwQkMsU0FBMUIsRUFBcUNDLGVBQXJDLEVBQXNEQyxZQUF0RCxFQUErSTtBQUFBLFFBQTNFQyxnQkFBMkUsdUVBQXhELElBQXdEO0FBQUEsUUFBbERDLGFBQWtELHVFQUFsQyxJQUFrQztBQUFBLFFBQTVCQyxtQkFBNEIsdUVBQU4sSUFBTTs7QUFDN0ksUUFBSUMsc0JBQXNCQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQlIsU0FBbEIsQ0FBMUI7QUFDQU8sV0FBT0MsTUFBUCxDQUFjLElBQWQsRUFBb0IsRUFBQ1QsWUFBRCxFQUFlTyxtQkFBZixFQUFvQ0wsZUFBcEMsRUFBcURDLFlBQXJELEVBQW1FQyxnQkFBbkUsRUFBcEI7QUFDQSxTQUFLTSxPQUFMLEdBQWUsS0FBS1IsZUFBTCxDQUFxQlEsT0FBcEM7O0FBRUEsU0FBS0Msa0JBQUwsR0FBMEJILE9BQU9JLElBQVAsQ0FBWUwsbUJBQVosRUFBaUNN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LEVBQTdCLEVBQWlDSyxTQUFqQyxDQUEyQyxDQUEzQyxDQUFiLENBQXRCO0FBQ0EsWUFBSUMsYUFBYSxlQUFLbEcsSUFBTCxDQUFVOEYsZUFBVixFQUEyQmhILGFBQTNCLENBQWpCOztBQUVBLGVBQU8rRCxXQUFXbUQsT0FBWCxDQUFtQlQsa0JBQW5CLEVBQXdDLHdCQUF1QlcsVUFBVyxFQUExRSxDQUFQO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPckQsVUFBUDtBQUNEO0FBNXBCK0I7a0JBQWJ0RSxZIiwiZmlsZSI6ImNvbXBpbGVyLWhvc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbWltZVR5cGVzIGZyb20gJ0BwYXVsY2JldHRzL21pbWUtdHlwZXMnO1xyXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7cGZzLCBwemxpYn0gZnJvbSAnLi9wcm9taXNlJztcclxuXHJcbmltcG9ydCB7Zm9yQWxsRmlsZXMsIGZvckFsbEZpbGVzU3luY30gZnJvbSAnLi9mb3ItYWxsLWZpbGVzJztcclxuaW1wb3J0IENvbXBpbGVDYWNoZSBmcm9tICcuL2NvbXBpbGUtY2FjaGUnO1xyXG5pbXBvcnQgRmlsZUNoYW5nZWRDYWNoZSBmcm9tICcuL2ZpbGUtY2hhbmdlLWNhY2hlJztcclxuaW1wb3J0IFJlYWRPbmx5Q29tcGlsZXIgZnJvbSAnLi9yZWFkLW9ubHktY29tcGlsZXInO1xyXG5pbXBvcnQge2xpc3Rlbiwgc2VuZH0gZnJvbSAnLi9icm93c2VyLXNpZ25hbCc7XHJcblxyXG5jb25zdCBkID0gcmVxdWlyZSgnZGVidWcnKSgnZWxlY3Ryb24tY29tcGlsZTpjb21waWxlci1ob3N0Jyk7XHJcblxyXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL21hcCc7XHJcblxyXG5yZXF1aXJlKCcuL3JpZy1taW1lLXR5cGVzJykuaW5pdCgpO1xyXG5cclxuLy8gVGhpcyBpc24ndCBldmVuIG15XHJcbmNvbnN0IGZpbmFsRm9ybXMgPSB7XHJcbiAgJ3RleHQvamF2YXNjcmlwdCc6IHRydWUsXHJcbiAgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnOiB0cnVlLFxyXG4gICd0ZXh0L2h0bWwnOiB0cnVlLFxyXG4gICd0ZXh0L2Nzcyc6IHRydWUsXHJcbiAgJ2ltYWdlL3N2Zyt4bWwnOiB0cnVlLFxyXG4gICdhcHBsaWNhdGlvbi9qc29uJzogdHJ1ZVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgY2xhc3MgaXMgdGhlIHRvcC1sZXZlbCBjbGFzcyB0aGF0IGVuY2Fwc3VsYXRlcyBhbGwgb2YgdGhlIGxvZ2ljIG9mXHJcbiAqIGNvbXBpbGluZyBhbmQgY2FjaGluZyBhcHBsaWNhdGlvbiBjb2RlLiBJZiB5b3UncmUgbG9va2luZyBmb3IgYSBcIk1haW4gY2xhc3NcIixcclxuICogdGhpcyBpcyBpdC5cclxuICpcclxuICogVGhpcyBjbGFzcyBjYW4gYmUgY3JlYXRlZCBkaXJlY3RseSBidXQgaXQgaXMgdXN1YWxseSBjcmVhdGVkIHZpYSB0aGUgbWV0aG9kc1xyXG4gKiBpbiBjb25maWctcGFyc2VyLCB3aGljaCB3aWxsIGFtb25nIG90aGVyIHRoaW5ncywgc2V0IHVwIHRoZSBjb21waWxlciBvcHRpb25zXHJcbiAqIGdpdmVuIGEgcHJvamVjdCByb290LlxyXG4gKlxyXG4gKiBDb21waWxlckhvc3QgaXMgYWxzbyB0aGUgdG9wLWxldmVsIGNsYXNzIHRoYXQga25vd3MgaG93IHRvIHNlcmlhbGl6ZSBhbGwgb2YgdGhlXHJcbiAqIGluZm9ybWF0aW9uIG5lY2Vzc2FyeSB0byByZWNyZWF0ZSBpdHNlbGYsIGVpdGhlciBhcyBhIGRldmVsb3BtZW50IGhvc3QgKGkuZS5cclxuICogd2lsbCBhbGxvdyBjYWNoZSBtaXNzZXMgYW5kIGFjdHVhbCBjb21waWxhdGlvbiksIG9yIGFzIGEgcmVhZC1vbmx5IHZlcnNpb24gb2ZcclxuICogaXRzZWxmIGZvciBwcm9kdWN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGlsZXJIb3N0IHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIENvbXBpbGVySG9zdC4gWW91IHByb2JhYmx5IHdhbnQgdG8gdXNlIHRoZSBtZXRob2RzXHJcbiAgICogaW4gY29uZmlnLXBhcnNlciBmb3IgZGV2ZWxvcG1lbnQsIG9yIHtAbGluayBjcmVhdGVSZWFkb25seUZyb21Db25maWd1cmF0aW9ufVxyXG4gICAqIGZvciBwcm9kdWN0aW9uIGluc3RlYWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAgVGhlIHJvb3QgZGlyZWN0b3J5IHRvIHVzZSBmb3IgdGhlIGNhY2hlXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbXBpbGVycyAgYW4gT2JqZWN0IHdob3NlIGtleXMgYXJlIGlucHV0IE1JTUUgdHlwZXMgYW5kXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdob3NlIHZhbHVlcyBhcmUgaW5zdGFuY2VzIG9mIENvbXBpbGVyQmFzZS4gQ3JlYXRlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgdmlhIHRoZSB7QGxpbmsgY3JlYXRlQ29tcGlsZXJzfSBtZXRob2QgaW5cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLXBhcnNlci5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0ZpbGVDaGFuZ2VkQ2FjaGV9IGZpbGVDaGFuZ2VDYWNoZSAgQSBmaWxlLWNoYW5nZSBjYWNoZSB0aGF0IGlzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25hbGx5IHByZS1sb2FkZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtib29sZWFufSByZWFkT25seU1vZGUgIElmIFRydWUsIGNhY2hlIG1pc3NlcyB3aWxsIGZhaWwgYW5kXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxhdGlvbiB3aWxsIG5vdCBiZSBhdHRlbXB0ZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtDb21waWxlckJhc2V9IGZhbGxiYWNrQ29tcGlsZXIgKG9wdGlvbmFsKSAgV2hlbiBhIGZpbGUgaXMgY29tcGlsZWRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggZG9lc24ndCBoYXZlIGEgbWF0Y2hpbmcgY29tcGlsZXIsXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgY29tcGlsZXIgd2lsbCBiZSB1c2VkIGluc3RlYWQuIElmXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsIHdpbGwgZmFpbCBjb21waWxhdGlvbi4gQSBnb29kXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSBmYWxsYmFjayBpcyB0aGUgY29tcGlsZXIgZm9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0L3BsYWluJywgd2hpY2ggaXMgZ3VhcmFudGVlZCB0byBiZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZW50LlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZU1hcFBhdGggKG9wdGlvbmFsKSBUaGUgZGlyZWN0b3J5IHRvIHN0b3JlIHNvdXJjZW1hcCBzZXBhcmF0ZWx5XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgY29tcGlsZXIgb3B0aW9uIGVuYWJsZWQgdG8gZW1pdC5cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IHRvIGNhY2hlUGF0aCBpZiBub3Qgc3BlY2lmaWVkLlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKHJvb3RDYWNoZURpciwgY29tcGlsZXJzLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSwgZmFsbGJhY2tDb21waWxlciA9IG51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsLCBtaW1lVHlwZXNUb1JlZ2lzdGVyID0gbnVsbCkge1xyXG4gICAgbGV0IGNvbXBpbGVyc0J5TWltZVR5cGUgPSBPYmplY3QuYXNzaWduKHt9LCBjb21waWxlcnMpO1xyXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7cm9vdENhY2hlRGlyLCBjb21waWxlcnNCeU1pbWVUeXBlLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSwgZmFsbGJhY2tDb21waWxlcn0pO1xyXG4gICAgdGhpcy5hcHBSb290ID0gdGhpcy5maWxlQ2hhbmdlQ2FjaGUuYXBwUm9vdDtcclxuXHJcbiAgICB0aGlzLmNhY2hlc0ZvckNvbXBpbGVycyA9IE9iamVjdC5rZXlzKGNvbXBpbGVyc0J5TWltZVR5cGUpLnJlZHVjZSgoYWNjLCB4KSA9PiB7XHJcbiAgICAgIGxldCBjb21waWxlciA9IGNvbXBpbGVyc0J5TWltZVR5cGVbeF07XHJcbiAgICAgIGlmIChhY2MuaGFzKGNvbXBpbGVyKSkgcmV0dXJuIGFjYztcclxuXHJcbiAgICAgIGFjYy5zZXQoXHJcbiAgICAgICAgY29tcGlsZXIsXHJcbiAgICAgICAgQ29tcGlsZUNhY2hlLmNyZWF0ZUZyb21Db21waWxlcihyb290Q2FjaGVEaXIsIGNvbXBpbGVyLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSwgc291cmNlTWFwUGF0aCkpO1xyXG4gICAgICByZXR1cm4gYWNjO1xyXG4gICAgfSwgbmV3IE1hcCgpKTtcclxuXHJcbiAgICB0aGlzLm1pbWVUeXBlc1RvUmVnaXN0ZXIgPSBtaW1lVHlwZXNUb1JlZ2lzdGVyIHx8IHt9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIHByb2R1Y3Rpb24tbW9kZSBDb21waWxlckhvc3QgZnJvbSB0aGUgcHJldmlvdXNseSBzYXZlZFxyXG4gICAqIGNvbmZpZ3VyYXRpb25cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcm9vdENhY2hlRGlyICBUaGUgcm9vdCBkaXJlY3RvcnkgdG8gdXNlIGZvciB0aGUgY2FjaGUuIFRoaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGUgbXVzdCBoYXZlIGNhY2hlIGluZm9ybWF0aW9uIHNhdmVkIHZpYVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7QGxpbmsgc2F2ZUNvbmZpZ3VyYXRpb259XHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgb25lIHdoaWNoIGhhcyB5b3VyIHBhY2thZ2UuanNvbikuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtDb21waWxlckJhc2V9IGZhbGxiYWNrQ29tcGlsZXIgKG9wdGlvbmFsKSAgV2hlbiBhIGZpbGUgaXMgY29tcGlsZWRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggZG9lc24ndCBoYXZlIGEgbWF0Y2hpbmcgY29tcGlsZXIsXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgY29tcGlsZXIgd2lsbCBiZSB1c2VkIGluc3RlYWQuIElmXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsIHdpbGwgZmFpbCBjb21waWxhdGlvbi4gQSBnb29kXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSBmYWxsYmFjayBpcyB0aGUgY29tcGlsZXIgZm9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0L3BsYWluJywgd2hpY2ggaXMgZ3VhcmFudGVlZCB0byBiZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZW50LlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZTxDb21waWxlckhvc3Q+fSAgQSByZWFkLW9ubHkgQ29tcGlsZXJIb3N0XHJcbiAgICovXHJcbiAgc3RhdGljIGFzeW5jIGNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb24ocm9vdENhY2hlRGlyLCBhcHBSb290LCBmYWxsYmFja0NvbXBpbGVyPW51bGwpIHtcclxuICAgIGxldCB0YXJnZXQgPSBwYXRoLmpvaW4ocm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XHJcbiAgICBsZXQgYnVmID0gYXdhaXQgcGZzLnJlYWRGaWxlKHRhcmdldCk7XHJcbiAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoYXdhaXQgcHpsaWIuZ3VuemlwKGJ1ZikpO1xyXG5cclxuICAgIGxldCBmaWxlQ2hhbmdlQ2FjaGUgPSBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShpbmZvLmZpbGVDaGFuZ2VDYWNoZSwgYXBwUm9vdCwgdHJ1ZSk7XHJcblxyXG4gICAgbGV0IGNvbXBpbGVycyA9IE9iamVjdC5rZXlzKGluZm8uY29tcGlsZXJzKS5yZWR1Y2UoKGFjYywgeCkgPT4ge1xyXG4gICAgICBsZXQgY3VyID0gaW5mby5jb21waWxlcnNbeF07XHJcbiAgICAgIGFjY1t4XSA9IG5ldyBSZWFkT25seUNvbXBpbGVyKGN1ci5uYW1lLCBjdXIuY29tcGlsZXJWZXJzaW9uLCBjdXIuY29tcGlsZXJPcHRpb25zLCBjdXIuaW5wdXRNaW1lVHlwZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIGFjYztcclxuICAgIH0sIHt9KTtcclxuXHJcbiAgICByZXR1cm4gbmV3IENvbXBpbGVySG9zdChyb290Q2FjaGVEaXIsIGNvbXBpbGVycywgZmlsZUNoYW5nZUNhY2hlLCB0cnVlLCBmYWxsYmFja0NvbXBpbGVyLCBudWxsLCBpbmZvLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRldmVsb3BtZW50LW1vZGUgQ29tcGlsZXJIb3N0IGZyb20gdGhlIHByZXZpb3VzbHkgc2F2ZWRcclxuICAgKiBjb25maWd1cmF0aW9uLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7c3RyaW5nfSByb290Q2FjaGVEaXIgIFRoZSByb290IGRpcmVjdG9yeSB0byB1c2UgZm9yIHRoZSBjYWNoZS4gVGhpc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZSBtdXN0IGhhdmUgY2FjaGUgaW5mb3JtYXRpb24gc2F2ZWQgdmlhXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtAbGluayBzYXZlQ29uZmlndXJhdGlvbn1cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge3N0cmluZ30gYXBwUm9vdCAgVGhlIHRvcC1sZXZlbCBkaXJlY3RvcnkgZm9yIHlvdXIgYXBwbGljYXRpb24gKGkuZS5cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBvbmUgd2hpY2ggaGFzIHlvdXIgcGFja2FnZS5qc29uKS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29tcGlsZXJzQnlNaW1lVHlwZSAgYW4gT2JqZWN0IHdob3NlIGtleXMgYXJlIGlucHV0IE1JTUVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGluc3RhbmNlc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgQ29tcGlsZXJCYXNlLiBDcmVhdGUgdGhpcyB2aWEgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7QGxpbmsgY3JlYXRlQ29tcGlsZXJzfSBtZXRob2QgaW5cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy1wYXJzZXIuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtDb21waWxlckJhc2V9IGZhbGxiYWNrQ29tcGlsZXIgKG9wdGlvbmFsKSAgV2hlbiBhIGZpbGUgaXMgY29tcGlsZWRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggZG9lc24ndCBoYXZlIGEgbWF0Y2hpbmcgY29tcGlsZXIsXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgY29tcGlsZXIgd2lsbCBiZSB1c2VkIGluc3RlYWQuIElmXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsIHdpbGwgZmFpbCBjb21waWxhdGlvbi4gQSBnb29kXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSBmYWxsYmFjayBpcyB0aGUgY29tcGlsZXIgZm9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0L3BsYWluJywgd2hpY2ggaXMgZ3VhcmFudGVlZCB0byBiZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZW50LlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZTxDb21waWxlckhvc3Q+fSAgQSByZWFkLW9ubHkgQ29tcGlsZXJIb3N0XHJcbiAgICovXHJcbiAgc3RhdGljIGFzeW5jIGNyZWF0ZUZyb21Db25maWd1cmF0aW9uKHJvb3RDYWNoZURpciwgYXBwUm9vdCwgY29tcGlsZXJzQnlNaW1lVHlwZSwgZmFsbGJhY2tDb21waWxlcj1udWxsKSB7XHJcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xyXG4gICAgbGV0IGJ1ZiA9IGF3YWl0IHBmcy5yZWFkRmlsZSh0YXJnZXQpO1xyXG4gICAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHB6bGliLmd1bnppcChidWYpKTtcclxuXHJcbiAgICBsZXQgZmlsZUNoYW5nZUNhY2hlID0gRmlsZUNoYW5nZWRDYWNoZS5sb2FkRnJvbURhdGEoaW5mby5maWxlQ2hhbmdlQ2FjaGUsIGFwcFJvb3QsIGZhbHNlKTtcclxuXHJcbiAgICBPYmplY3Qua2V5cyhpbmZvLmNvbXBpbGVycykuZm9yRWFjaCgoeCkgPT4ge1xyXG4gICAgICBsZXQgY3VyID0gaW5mby5jb21waWxlcnNbeF07XHJcbiAgICAgIGNvbXBpbGVyc0J5TWltZVR5cGVbeF0uY29tcGlsZXJPcHRpb25zID0gY3VyLmNvbXBpbGVyT3B0aW9ucztcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBuZXcgQ29tcGlsZXJIb3N0KHJvb3RDYWNoZURpciwgY29tcGlsZXJzQnlNaW1lVHlwZSwgZmlsZUNoYW5nZUNhY2hlLCBmYWxzZSwgZmFsbGJhY2tDb21waWxlciwgbnVsbCwgaW5mby5taW1lVHlwZXNUb1JlZ2lzdGVyKTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBTYXZlcyB0aGUgY3VycmVudCBjb21waWxlciBjb25maWd1cmF0aW9uIHRvIGEgZmlsZSB0aGF0XHJcbiAgICoge0BsaW5rIGNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb259IGNhbiB1c2UgdG8gcmVjcmVhdGUgdGhlIGN1cnJlbnRcclxuICAgKiBjb21waWxlciBlbnZpcm9ubWVudFxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZX0gIENvbXBsZXRpb25cclxuICAgKi9cclxuICBhc3luYyBzYXZlQ29uZmlndXJhdGlvbigpIHtcclxuICAgIGxldCBzZXJpYWxpemVkQ29tcGlsZXJPcHRzID0gT2JqZWN0LmtleXModGhpcy5jb21waWxlcnNCeU1pbWVUeXBlKS5yZWR1Y2UoKGFjYywgeCkgPT4ge1xyXG4gICAgICBsZXQgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbeF07XHJcbiAgICAgIGxldCBLbGFzcyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihjb21waWxlcikuY29uc3RydWN0b3I7XHJcblxyXG4gICAgICBsZXQgdmFsID0ge1xyXG4gICAgICAgIG5hbWU6IEtsYXNzLm5hbWUsXHJcbiAgICAgICAgaW5wdXRNaW1lVHlwZXM6IEtsYXNzLmdldElucHV0TWltZVR5cGVzKCksXHJcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiBjb21waWxlci5jb21waWxlck9wdGlvbnMsXHJcbiAgICAgICAgY29tcGlsZXJWZXJzaW9uOiBjb21waWxlci5nZXRDb21waWxlclZlcnNpb24oKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgYWNjW3hdID0gdmFsO1xyXG4gICAgICByZXR1cm4gYWNjO1xyXG4gICAgfSwge30pO1xyXG5cclxuICAgIGxldCBpbmZvID0ge1xyXG4gICAgICBmaWxlQ2hhbmdlQ2FjaGU6IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmdldFNhdmVkRGF0YSgpLFxyXG4gICAgICBjb21waWxlcnM6IHNlcmlhbGl6ZWRDb21waWxlck9wdHMsXHJcbiAgICAgIG1pbWVUeXBlc1RvUmVnaXN0ZXI6IHRoaXMubWltZVR5cGVzVG9SZWdpc3RlclxyXG4gICAgfTtcclxuXHJcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHRoaXMucm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XHJcbiAgICBsZXQgYnVmID0gYXdhaXQgcHpsaWIuZ3ppcChuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KGluZm8pKSk7XHJcbiAgICBhd2FpdCBwZnMud3JpdGVGaWxlKHRhcmdldCwgYnVmKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbXBpbGVzIGEgZmlsZSBhbmQgcmV0dXJucyB0aGUgY29tcGlsZWQgcmVzdWx0LlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7c3RyaW5nfSBmaWxlUGF0aCAgVGhlIHBhdGggdG8gdGhlIGZpbGUgdG8gY29tcGlsZVxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZTxvYmplY3Q+fSAgQW4gT2JqZWN0IHdpdGggdGhlIGNvbXBpbGVkIHJlc3VsdFxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtPYmplY3R9IGhhc2hJbmZvICBUaGUgaGFzaCBpbmZvcm1hdGlvbiByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXHJcbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IGNvZGUgIFRoZSBzb3VyY2UgY29kZSBpZiB0aGUgZmlsZSB3YXMgYSB0ZXh0IGZpbGVcclxuICAgKiBAcHJvcGVydHkge0J1ZmZlcn0gYmluYXJ5RGF0YSAgVGhlIGZpbGUgaWYgaXQgd2FzIGEgYmluYXJ5IGZpbGVcclxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gbWltZVR5cGUgIFRoZSBNSU1FIHR5cGUgc2F2ZWQgaW4gdGhlIGNhY2hlLlxyXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nW119IGRlcGVuZGVudEZpbGVzICBUaGUgZGVwZW5kZW50IGZpbGVzIHJldHVybmVkIGZyb21cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsaW5nIHRoZSBmaWxlLCBpZiBhbnkuXHJcbiAgICovXHJcbiAgYXN5bmMgY29tcGlsZShmaWxlUGF0aCkge1xyXG4gICAgbGV0IHJldCA9IGF3YWl0ICh0aGlzLnJlYWRPbmx5TW9kZSA/IHRoaXMuY29tcGlsZVJlYWRPbmx5KGZpbGVQYXRoKSA6IHRoaXMuZnVsbENvbXBpbGUoZmlsZVBhdGgpKTtcclxuXHJcbiAgICBpZiAocmV0Lm1pbWVUeXBlID09PSAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcpIHtcclxuICAgICAgdGhpcy5taW1lVHlwZXNUb1JlZ2lzdGVyW21pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpXSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGVzIGNvbXBpbGF0aW9uIGluIHJlYWQtb25seSBtb2RlXHJcbiAgICpcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIGFzeW5jIGNvbXBpbGVSZWFkT25seShmaWxlUGF0aCkge1xyXG4gICAgLy8gV2UgZ3VhcmFudGVlIHRoYXQgbm9kZV9tb2R1bGVzIGFyZSBhbHdheXMgc2hpcHBlZCBkaXJlY3RseVxyXG4gICAgbGV0IHR5cGUgPSBtaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKTtcclxuICAgIGlmIChGaWxlQ2hhbmdlZENhY2hlLmlzSW5Ob2RlTW9kdWxlcyhmaWxlUGF0aCkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBtaW1lVHlwZTogdHlwZSB8fCAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcsXHJcbiAgICAgICAgY29kZTogYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGVQYXRoLCAndXRmOCcpXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGhhc2hJbmZvID0gYXdhaXQgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuZ2V0SGFzaEZvclBhdGgoZmlsZVBhdGgpO1xyXG5cclxuICAgIC8vIE5COiBIZXJlLCB3ZSdyZSBiYXNpY2FsbHkgb25seSB1c2luZyB0aGUgY29tcGlsZXIgaGVyZSB0byBmaW5kXHJcbiAgICAvLyB0aGUgYXBwcm9wcmlhdGUgQ29tcGlsZUNhY2hlXHJcbiAgICBsZXQgY29tcGlsZXIgPSBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pID9cclxuICAgICAgdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCkgOlxyXG4gICAgICB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbdHlwZSB8fCAnX19sb2xub3RoZXJlJ107XHJcblxyXG5cclxuICAgIC8vIE5COiBXZSBkb24ndCBwdXQgdGhpcyBpbnRvIHNob3VsZFBhc3N0aHJvdWdoIGJlY2F1c2UgSW5saW5lIEhUTUxcclxuICAgIC8vIGNvbXBpbGVyIGlzIHRlY2huaWNhbGx5IG9mIHR5cGUgZmluYWxGb3JtcyAoaS5lLiBhIGJyb3dzZXIgY2FuXHJcbiAgICAvLyBuYXRpdmVseSBoYW5kbGUgdGhpcyBjb250ZW50KSwgeWV0IGl0cyBjb21waWxlciBpc1xyXG4gICAgLy8gSW5saW5lSHRtbENvbXBpbGVyLiBIb3dldmVyLCB3ZSBzdGlsbCB3YW50IHRvIGNhdGNoIHN0YW5kYXJkIENTUyBmaWxlc1xyXG4gICAgLy8gd2hpY2ggd2lsbCBiZSBwcm9jZXNzZWQgYnkgUGFzc3Rocm91Z2hDb21waWxlci5cclxuICAgIGlmIChmaW5hbEZvcm1zW3R5cGVdICYmICFjb21waWxlcikge1xyXG4gICAgICBjb21waWxlciA9IHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghY29tcGlsZXIpIHtcclxuICAgICAgY29tcGlsZXIgPSB0aGlzLmZhbGxiYWNrQ29tcGlsZXI7XHJcblxyXG4gICAgICBsZXQgeyBjb2RlLCBiaW5hcnlEYXRhLCBtaW1lVHlwZSB9ID0gYXdhaXQgY29tcGlsZXIuZ2V0KGZpbGVQYXRoKTtcclxuICAgICAgcmV0dXJuIHsgY29kZTogY29kZSB8fCBiaW5hcnlEYXRhLCBtaW1lVHlwZSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjYWNoZSA9IHRoaXMuY2FjaGVzRm9yQ29tcGlsZXJzLmdldChjb21waWxlcik7XHJcbiAgICBsZXQge2NvZGUsIGJpbmFyeURhdGEsIG1pbWVUeXBlfSA9IGF3YWl0IGNhY2hlLmdldChmaWxlUGF0aCk7XHJcblxyXG4gICAgY29kZSA9IGNvZGUgfHwgYmluYXJ5RGF0YTtcclxuICAgIGlmICghY29kZSB8fCAhbWltZVR5cGUpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc2tlZCB0byBjb21waWxlICR7ZmlsZVBhdGh9IGluIHByb2R1Y3Rpb24sIGlzIHRoaXMgZmlsZSBub3QgcHJlY29tcGlsZWQ/YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgY29kZSwgbWltZVR5cGUgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZXMgY29tcGlsYXRpb24gaW4gcmVhZC13cml0ZSBtb2RlXHJcbiAgICpcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIGFzeW5jIGZ1bGxDb21waWxlKGZpbGVQYXRoKSB7XHJcbiAgICBkKGBDb21waWxpbmcgJHtmaWxlUGF0aH1gKTtcclxuICAgIGxldCB0eXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XHJcblxyXG4gICAgc2VuZCgnZWxlY3Ryb24tY29tcGlsZS1jb21waWxlZC1maWxlJywgeyBmaWxlUGF0aCwgbWltZVR5cGU6IHR5cGUgfSk7XHJcblxyXG4gICAgbGV0IGhhc2hJbmZvID0gYXdhaXQgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuZ2V0SGFzaEZvclBhdGgoZmlsZVBhdGgpO1xyXG5cclxuICAgIGlmIChoYXNoSW5mby5pc0luTm9kZU1vZHVsZXMpIHtcclxuICAgICAgbGV0IGNvZGUgPSBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlUGF0aCwgJ3V0ZjgnKTtcclxuICAgICAgY29kZSA9IGF3YWl0IENvbXBpbGVySG9zdC5maXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmcoY29kZSwgZmlsZVBhdGgsIHRoaXMuZmlsZUNoYW5nZUNhY2hlLmFwcFJvb3QpO1xyXG4gICAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZTogdHlwZSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjb21waWxlciA9IENvbXBpbGVySG9zdC5zaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbykgP1xyXG4gICAgICB0aGlzLmdldFBhc3N0aHJvdWdoQ29tcGlsZXIoKSA6XHJcbiAgICAgIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVt0eXBlIHx8ICdfX2xvbG5vdGhlcmUnXTtcclxuXHJcbiAgICBpZiAoIWNvbXBpbGVyKSB7XHJcbiAgICAgIGQoYEZhbGxpbmcgYmFjayB0byBwYXNzdGhyb3VnaCBjb21waWxlciBmb3IgJHtmaWxlUGF0aH1gKTtcclxuICAgICAgY29tcGlsZXIgPSB0aGlzLmZhbGxiYWNrQ29tcGlsZXI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFjb21waWxlcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkbid0IGZpbmQgYSBjb21waWxlciBmb3IgJHtmaWxlUGF0aH1gKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgY2FjaGUgPSB0aGlzLmNhY2hlc0ZvckNvbXBpbGVycy5nZXQoY29tcGlsZXIpO1xyXG4gICAgcmV0dXJuIGF3YWl0IGNhY2hlLmdldE9yRmV0Y2goXHJcbiAgICAgIGZpbGVQYXRoLFxyXG4gICAgICAoZmlsZVBhdGgsIGhhc2hJbmZvKSA9PiB0aGlzLmNvbXBpbGVVbmNhY2hlZChmaWxlUGF0aCwgaGFzaEluZm8sIGNvbXBpbGVyKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGVzIGludm9raW5nIGNvbXBpbGVycyBpbmRlcGVuZGVudCBvZiBjYWNoaW5nXHJcbiAgICpcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIGFzeW5jIGNvbXBpbGVVbmNhY2hlZChmaWxlUGF0aCwgaGFzaEluZm8sIGNvbXBpbGVyKSB7XHJcbiAgICBsZXQgaW5wdXRNaW1lVHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xyXG5cclxuICAgIGlmIChoYXNoSW5mby5pc0ZpbGVCaW5hcnkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBiaW5hcnlEYXRhOiBoYXNoSW5mby5iaW5hcnlEYXRhIHx8IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlUGF0aCksXHJcbiAgICAgICAgbWltZVR5cGU6IGlucHV0TWltZVR5cGUsXHJcbiAgICAgICAgZGVwZW5kZW50RmlsZXM6IFtdXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGN0eCA9IHt9O1xyXG4gICAgbGV0IGNvZGUgPSBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlUGF0aCwgJ3V0ZjgnKTtcclxuXHJcbiAgICBpZiAoIShhd2FpdCBjb21waWxlci5zaG91bGRDb21waWxlRmlsZShjb2RlLCBjdHgpKSkge1xyXG4gICAgICBkKGBDb21waWxlciByZXR1cm5lZCBmYWxzZSBmb3Igc2hvdWxkQ29tcGlsZUZpbGU6ICR7ZmlsZVBhdGh9YCk7XHJcbiAgICAgIHJldHVybiB7IGNvZGUsIG1pbWVUeXBlOiBtaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKSwgZGVwZW5kZW50RmlsZXM6IFtdIH07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGRlcGVuZGVudEZpbGVzID0gYXdhaXQgY29tcGlsZXIuZGV0ZXJtaW5lRGVwZW5kZW50RmlsZXMoY29kZSwgZmlsZVBhdGgsIGN0eCk7XHJcblxyXG4gICAgZChgVXNpbmcgY29tcGlsZXIgb3B0aW9uczogJHtKU09OLnN0cmluZ2lmeShjb21waWxlci5jb21waWxlck9wdGlvbnMpfWApO1xyXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IGNvbXBpbGVyLmNvbXBpbGUoY29kZSwgZmlsZVBhdGgsIGN0eCk7XHJcblxyXG4gICAgbGV0IHNob3VsZElubGluZUh0bWxpZnkgPVxyXG4gICAgICBpbnB1dE1pbWVUeXBlICE9PSAndGV4dC9odG1sJyAmJlxyXG4gICAgICByZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L2h0bWwnO1xyXG5cclxuICAgIGxldCBpc1Bhc3N0aHJvdWdoID1cclxuICAgICAgcmVzdWx0Lm1pbWVUeXBlID09PSAndGV4dC9wbGFpbicgfHxcclxuICAgICAgIXJlc3VsdC5taW1lVHlwZSB8fFxyXG4gICAgICBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pO1xyXG5cclxuICAgIGlmICgoZmluYWxGb3Jtc1tyZXN1bHQubWltZVR5cGVdICYmICFzaG91bGRJbmxpbmVIdG1saWZ5KSB8fCBpc1Bhc3N0aHJvdWdoKSB7XHJcbiAgICAgIC8vIEdvdCBzb21ldGhpbmcgd2UgY2FuIHVzZSBpbi1icm93c2VyLCBsZXQncyByZXR1cm4gaXRcclxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB7ZGVwZW5kZW50RmlsZXN9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGQoYFJlY3Vyc2l2ZWx5IGNvbXBpbGluZyByZXN1bHQgb2YgJHtmaWxlUGF0aH0gd2l0aCBub24tZmluYWwgTUlNRSB0eXBlICR7cmVzdWx0Lm1pbWVUeXBlfSwgaW5wdXQgd2FzICR7aW5wdXRNaW1lVHlwZX1gKTtcclxuXHJcbiAgICAgIGhhc2hJbmZvID0gT2JqZWN0LmFzc2lnbih7IHNvdXJjZUNvZGU6IHJlc3VsdC5jb2RlLCBtaW1lVHlwZTogcmVzdWx0Lm1pbWVUeXBlIH0sIGhhc2hJbmZvKTtcclxuICAgICAgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbcmVzdWx0Lm1pbWVUeXBlIHx8ICdfX2xvbG5vdGhlcmUnXTtcclxuXHJcbiAgICAgIGlmICghY29tcGlsZXIpIHtcclxuICAgICAgICBkKGBSZWN1cnNpdmUgY29tcGlsZSBmYWlsZWQgLSBpbnRlcm1lZGlhdGUgcmVzdWx0OiAke0pTT04uc3RyaW5naWZ5KHJlc3VsdCl9YCk7XHJcblxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsaW5nICR7ZmlsZVBhdGh9IHJlc3VsdGVkIGluIGEgTUlNRSB0eXBlIG9mICR7cmVzdWx0Lm1pbWVUeXBlfSwgd2hpY2ggd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbXBpbGVVbmNhY2hlZChcclxuICAgICAgICBgJHtmaWxlUGF0aH0uJHttaW1lVHlwZXMuZXh0ZW5zaW9uKHJlc3VsdC5taW1lVHlwZSB8fCAndHh0Jyl9YCxcclxuICAgICAgICBoYXNoSW5mbywgY29tcGlsZXIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHJlLWNhY2hlcyBhbiBlbnRpcmUgZGlyZWN0b3J5IG9mIGZpbGVzIHJlY3Vyc2l2ZWx5LiBVc3VhbGx5IHVzZWQgZm9yXHJcbiAgICogYnVpbGRpbmcgY3VzdG9tIGNvbXBpbGVyIHRvb2xpbmcuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3REaXJlY3RvcnkgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IHRvIGNvbXBpbGVcclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBzaG91bGRDb21waWxlIChvcHRpb25hbCkgIEEgRnVuY3Rpb24gd2hpY2ggYWxsb3dzIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxlciB0byBkaXNhYmxlIGNvbXBpbGluZyBjZXJ0YWluIGZpbGVzLlxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHRha2VzIGEgZnVsbHktcXVhbGlmaWVkIHBhdGggdG8gYSBmaWxlLFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZCBzaG91bGQgcmV0dXJuIGEgQm9vbGVhbi5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICBDb21wbGV0aW9uLlxyXG4gICAqL1xyXG4gIGFzeW5jIGNvbXBpbGVBbGwocm9vdERpcmVjdG9yeSwgc2hvdWxkQ29tcGlsZT1udWxsKSB7XHJcbiAgICBsZXQgc2hvdWxkID0gc2hvdWxkQ29tcGlsZSB8fCBmdW5jdGlvbigpIHtyZXR1cm4gdHJ1ZTt9O1xyXG5cclxuICAgIGF3YWl0IGZvckFsbEZpbGVzKHJvb3REaXJlY3RvcnksIChmKSA9PiB7XHJcbiAgICAgIGlmICghc2hvdWxkKGYpKSByZXR1cm47XHJcblxyXG4gICAgICBkKGBDb21waWxpbmcgJHtmfWApO1xyXG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlKGYsIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGxpc3RlblRvQ29tcGlsZUV2ZW50cygpIHtcclxuICAgIHJldHVybiBsaXN0ZW4oJ2VsZWN0cm9uLWNvbXBpbGUtY29tcGlsZWQtZmlsZScpLm1hcCgoW3hdKSA9PiB4KTtcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgICogU3luYyBNZXRob2RzXHJcbiAgICovXHJcblxyXG4gIGNvbXBpbGVTeW5jKGZpbGVQYXRoKSB7XHJcbiAgICBsZXQgcmV0ID0gKHRoaXMucmVhZE9ubHlNb2RlID9cclxuICAgICAgdGhpcy5jb21waWxlUmVhZE9ubHlTeW5jKGZpbGVQYXRoKSA6XHJcbiAgICAgIHRoaXMuZnVsbENvbXBpbGVTeW5jKGZpbGVQYXRoKSk7XHJcblxyXG4gICAgaWYgKHJldC5taW1lVHlwZSA9PT0gJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnKSB7XHJcbiAgICAgIHRoaXMubWltZVR5cGVzVG9SZWdpc3RlclttaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKV0gPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMocm9vdENhY2hlRGlyLCBhcHBSb290LCBmYWxsYmFja0NvbXBpbGVyPW51bGwpIHtcclxuICAgIGxldCB0YXJnZXQgPSBwYXRoLmpvaW4ocm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XHJcbiAgICBsZXQgYnVmID0gZnMucmVhZEZpbGVTeW5jKHRhcmdldCk7XHJcbiAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoemxpYi5ndW56aXBTeW5jKGJ1ZikpO1xyXG5cclxuICAgIGxldCBmaWxlQ2hhbmdlQ2FjaGUgPSBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShpbmZvLmZpbGVDaGFuZ2VDYWNoZSwgYXBwUm9vdCwgdHJ1ZSk7XHJcblxyXG4gICAgbGV0IGNvbXBpbGVycyA9IE9iamVjdC5rZXlzKGluZm8uY29tcGlsZXJzKS5yZWR1Y2UoKGFjYywgeCkgPT4ge1xyXG4gICAgICBsZXQgY3VyID0gaW5mby5jb21waWxlcnNbeF07XHJcbiAgICAgIGFjY1t4XSA9IG5ldyBSZWFkT25seUNvbXBpbGVyKGN1ci5uYW1lLCBjdXIuY29tcGlsZXJWZXJzaW9uLCBjdXIuY29tcGlsZXJPcHRpb25zLCBjdXIuaW5wdXRNaW1lVHlwZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIGFjYztcclxuICAgIH0sIHt9KTtcclxuXHJcbiAgICByZXR1cm4gbmV3IENvbXBpbGVySG9zdChyb290Q2FjaGVEaXIsIGNvbXBpbGVycywgZmlsZUNoYW5nZUNhY2hlLCB0cnVlLCBmYWxsYmFja0NvbXBpbGVyLCBudWxsLCBpbmZvLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGNyZWF0ZUZyb21Db25maWd1cmF0aW9uU3luYyhyb290Q2FjaGVEaXIsIGFwcFJvb3QsIGNvbXBpbGVyc0J5TWltZVR5cGUsIGZhbGxiYWNrQ29tcGlsZXI9bnVsbCkge1xyXG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbihyb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcclxuICAgIGxldCBidWYgPSBmcy5yZWFkRmlsZVN5bmModGFyZ2V0KTtcclxuICAgIGxldCBpbmZvID0gSlNPTi5wYXJzZSh6bGliLmd1bnppcFN5bmMoYnVmKSk7XHJcblxyXG4gICAgbGV0IGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGluZm8uZmlsZUNoYW5nZUNhY2hlLCBhcHBSb290LCBmYWxzZSk7XHJcblxyXG4gICAgT2JqZWN0LmtleXMoaW5mby5jb21waWxlcnMpLmZvckVhY2goKHgpID0+IHtcclxuICAgICAgbGV0IGN1ciA9IGluZm8uY29tcGlsZXJzW3hdO1xyXG4gICAgICBjb21waWxlcnNCeU1pbWVUeXBlW3hdLmNvbXBpbGVyT3B0aW9ucyA9IGN1ci5jb21waWxlck9wdGlvbnM7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gbmV3IENvbXBpbGVySG9zdChyb290Q2FjaGVEaXIsIGNvbXBpbGVyc0J5TWltZVR5cGUsIGZpbGVDaGFuZ2VDYWNoZSwgZmFsc2UsIGZhbGxiYWNrQ29tcGlsZXIsIG51bGwsIGluZm8ubWltZVR5cGVzVG9SZWdpc3Rlcik7XHJcbiAgfVxyXG5cclxuICBzYXZlQ29uZmlndXJhdGlvblN5bmMoKSB7XHJcbiAgICBsZXQgc2VyaWFsaXplZENvbXBpbGVyT3B0cyA9IE9iamVjdC5rZXlzKHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZSkucmVkdWNlKChhY2MsIHgpID0+IHtcclxuICAgICAgbGV0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3hdO1xyXG4gICAgICBsZXQgS2xhc3MgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29tcGlsZXIpLmNvbnN0cnVjdG9yO1xyXG5cclxuICAgICAgbGV0IHZhbCA9IHtcclxuICAgICAgICBuYW1lOiBLbGFzcy5uYW1lLFxyXG4gICAgICAgIGlucHV0TWltZVR5cGVzOiBLbGFzcy5nZXRJbnB1dE1pbWVUeXBlcygpLFxyXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogY29tcGlsZXIuY29tcGlsZXJPcHRpb25zLFxyXG4gICAgICAgIGNvbXBpbGVyVmVyc2lvbjogY29tcGlsZXIuZ2V0Q29tcGlsZXJWZXJzaW9uKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFjY1t4XSA9IHZhbDtcclxuICAgICAgcmV0dXJuIGFjYztcclxuICAgIH0sIHt9KTtcclxuXHJcbiAgICBsZXQgaW5mbyA9IHtcclxuICAgICAgZmlsZUNoYW5nZUNhY2hlOiB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRTYXZlZERhdGEoKSxcclxuICAgICAgY29tcGlsZXJzOiBzZXJpYWxpemVkQ29tcGlsZXJPcHRzLFxyXG4gICAgICBtaW1lVHlwZXNUb1JlZ2lzdGVyOiB0aGlzLm1pbWVUeXBlc1RvUmVnaXN0ZXJcclxuICAgIH07XHJcblxyXG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbih0aGlzLnJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xyXG4gICAgbGV0IGJ1ZiA9IHpsaWIuZ3ppcFN5bmMobmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShpbmZvKSkpO1xyXG4gICAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsIGJ1Zik7XHJcbiAgfVxyXG5cclxuICBjb21waWxlUmVhZE9ubHlTeW5jKGZpbGVQYXRoKSB7XHJcbiAgICAvLyBXZSBndWFyYW50ZWUgdGhhdCBub2RlX21vZHVsZXMgYXJlIGFsd2F5cyBzaGlwcGVkIGRpcmVjdGx5XHJcbiAgICBsZXQgdHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xyXG4gICAgaWYgKEZpbGVDaGFuZ2VkQ2FjaGUuaXNJbk5vZGVNb2R1bGVzKGZpbGVQYXRoKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIG1pbWVUeXBlOiB0eXBlIHx8ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JyxcclxuICAgICAgICBjb2RlOiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JylcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgaGFzaEluZm8gPSB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aFN5bmMoZmlsZVBhdGgpO1xyXG5cclxuICAgIC8vIFdlIGd1YXJhbnRlZSB0aGF0IG5vZGVfbW9kdWxlcyBhcmUgYWx3YXlzIHNoaXBwZWQgZGlyZWN0bHlcclxuICAgIGlmIChoYXNoSW5mby5pc0luTm9kZU1vZHVsZXMpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBtaW1lVHlwZTogdHlwZSxcclxuICAgICAgICBjb2RlOiBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5COiBIZXJlLCB3ZSdyZSBiYXNpY2FsbHkgb25seSB1c2luZyB0aGUgY29tcGlsZXIgaGVyZSB0byBmaW5kXHJcbiAgICAvLyB0aGUgYXBwcm9wcmlhdGUgQ29tcGlsZUNhY2hlXHJcbiAgICBsZXQgY29tcGlsZXIgPSBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pID9cclxuICAgICAgdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCkgOlxyXG4gICAgICB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbdHlwZSB8fCAnX19sb2xub3RoZXJlJ107XHJcblxyXG4gICAgLy8gTkI6IFdlIGRvbid0IHB1dCB0aGlzIGludG8gc2hvdWxkUGFzc3Rocm91Z2ggYmVjYXVzZSBJbmxpbmUgSFRNTFxyXG4gICAgLy8gY29tcGlsZXIgaXMgdGVjaG5pY2FsbHkgb2YgdHlwZSBmaW5hbEZvcm1zIChpLmUuIGEgYnJvd3NlciBjYW5cclxuICAgIC8vIG5hdGl2ZWx5IGhhbmRsZSB0aGlzIGNvbnRlbnQpLCB5ZXQgaXRzIGNvbXBpbGVyIGlzXHJcbiAgICAvLyBJbmxpbmVIdG1sQ29tcGlsZXIuIEhvd2V2ZXIsIHdlIHN0aWxsIHdhbnQgdG8gY2F0Y2ggc3RhbmRhcmQgQ1NTIGZpbGVzXHJcbiAgICAvLyB3aGljaCB3aWxsIGJlIHByb2Nlc3NlZCBieSBQYXNzdGhyb3VnaENvbXBpbGVyLlxyXG4gICAgaWYgKGZpbmFsRm9ybXNbdHlwZV0gJiYgIWNvbXBpbGVyKSB7XHJcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFjb21waWxlcikge1xyXG4gICAgICBjb21waWxlciA9IHRoaXMuZmFsbGJhY2tDb21waWxlcjtcclxuXHJcbiAgICAgIGxldCB7IGNvZGUsIGJpbmFyeURhdGEsIG1pbWVUeXBlIH0gPSBjb21waWxlci5nZXRTeW5jKGZpbGVQYXRoKTtcclxuICAgICAgcmV0dXJuIHsgY29kZTogY29kZSB8fCBiaW5hcnlEYXRhLCBtaW1lVHlwZSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjYWNoZSA9IHRoaXMuY2FjaGVzRm9yQ29tcGlsZXJzLmdldChjb21waWxlcik7XHJcbiAgICBsZXQge2NvZGUsIGJpbmFyeURhdGEsIG1pbWVUeXBlfSA9IGNhY2hlLmdldFN5bmMoZmlsZVBhdGgpO1xyXG5cclxuICAgIGNvZGUgPSBjb2RlIHx8IGJpbmFyeURhdGE7XHJcbiAgICBpZiAoIWNvZGUgfHwgIW1pbWVUeXBlKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNrZWQgdG8gY29tcGlsZSAke2ZpbGVQYXRofSBpbiBwcm9kdWN0aW9uLCBpcyB0aGlzIGZpbGUgbm90IHByZWNvbXBpbGVkP2ApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IGNvZGUsIG1pbWVUeXBlIH07XHJcbiAgfVxyXG5cclxuICBmdWxsQ29tcGlsZVN5bmMoZmlsZVBhdGgpIHtcclxuICAgIGQoYENvbXBpbGluZyAke2ZpbGVQYXRofWApO1xyXG5cclxuICAgIGxldCB0eXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XHJcblxyXG4gICAgc2VuZCgnZWxlY3Ryb24tY29tcGlsZS1jb21waWxlZC1maWxlJywgeyBmaWxlUGF0aCwgbWltZVR5cGU6IHR5cGUgfSk7XHJcblxyXG4gICAgbGV0IGhhc2hJbmZvID0gdGhpcy5maWxlQ2hhbmdlQ2FjaGUuZ2V0SGFzaEZvclBhdGhTeW5jKGZpbGVQYXRoKTtcclxuXHJcbiAgICBpZiAoaGFzaEluZm8uaXNJbk5vZGVNb2R1bGVzKSB7XHJcbiAgICAgIGxldCBjb2RlID0gaGFzaEluZm8uc291cmNlQ29kZSB8fCBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XHJcbiAgICAgIGNvZGUgPSBDb21waWxlckhvc3QuZml4Tm9kZU1vZHVsZXNTb3VyY2VNYXBwaW5nU3luYyhjb2RlLCBmaWxlUGF0aCwgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuYXBwUm9vdCk7XHJcbiAgICAgIHJldHVybiB7IGNvZGUsIG1pbWVUeXBlOiB0eXBlIH07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGNvbXBpbGVyID0gQ29tcGlsZXJIb3N0LnNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKSA/XHJcbiAgICAgIHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpIDpcclxuICAgICAgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3R5cGUgfHwgJ19fbG9sbm90aGVyZSddO1xyXG5cclxuICAgIGlmICghY29tcGlsZXIpIHtcclxuICAgICAgZChgRmFsbGluZyBiYWNrIHRvIHBhc3N0aHJvdWdoIGNvbXBpbGVyIGZvciAke2ZpbGVQYXRofWApO1xyXG4gICAgICBjb21waWxlciA9IHRoaXMuZmFsbGJhY2tDb21waWxlcjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNvbXBpbGVyKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGRuJ3QgZmluZCBhIGNvbXBpbGVyIGZvciAke2ZpbGVQYXRofWApO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjYWNoZSA9IHRoaXMuY2FjaGVzRm9yQ29tcGlsZXJzLmdldChjb21waWxlcik7XHJcbiAgICByZXR1cm4gY2FjaGUuZ2V0T3JGZXRjaFN5bmMoXHJcbiAgICAgIGZpbGVQYXRoLFxyXG4gICAgICAoZmlsZVBhdGgsIGhhc2hJbmZvKSA9PiB0aGlzLmNvbXBpbGVVbmNhY2hlZFN5bmMoZmlsZVBhdGgsIGhhc2hJbmZvLCBjb21waWxlcikpO1xyXG4gIH1cclxuXHJcbiAgY29tcGlsZVVuY2FjaGVkU3luYyhmaWxlUGF0aCwgaGFzaEluZm8sIGNvbXBpbGVyKSB7XHJcbiAgICBsZXQgaW5wdXRNaW1lVHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xyXG5cclxuICAgIGlmIChoYXNoSW5mby5pc0ZpbGVCaW5hcnkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBiaW5hcnlEYXRhOiBoYXNoSW5mby5iaW5hcnlEYXRhIHx8IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCksXHJcbiAgICAgICAgbWltZVR5cGU6IGlucHV0TWltZVR5cGUsXHJcbiAgICAgICAgZGVwZW5kZW50RmlsZXM6IFtdXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGN0eCA9IHt9O1xyXG4gICAgbGV0IGNvZGUgPSBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcclxuXHJcbiAgICBpZiAoIShjb21waWxlci5zaG91bGRDb21waWxlRmlsZVN5bmMoY29kZSwgY3R4KSkpIHtcclxuICAgICAgZChgQ29tcGlsZXIgcmV0dXJuZWQgZmFsc2UgZm9yIHNob3VsZENvbXBpbGVGaWxlOiAke2ZpbGVQYXRofWApO1xyXG4gICAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZTogbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCksIGRlcGVuZGVudEZpbGVzOiBbXSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBkZXBlbmRlbnRGaWxlcyA9IGNvbXBpbGVyLmRldGVybWluZURlcGVuZGVudEZpbGVzU3luYyhjb2RlLCBmaWxlUGF0aCwgY3R4KTtcclxuXHJcbiAgICBsZXQgcmVzdWx0ID0gY29tcGlsZXIuY29tcGlsZVN5bmMoY29kZSwgZmlsZVBhdGgsIGN0eCk7XHJcblxyXG4gICAgbGV0IHNob3VsZElubGluZUh0bWxpZnkgPVxyXG4gICAgICBpbnB1dE1pbWVUeXBlICE9PSAndGV4dC9odG1sJyAmJlxyXG4gICAgICByZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L2h0bWwnO1xyXG5cclxuICAgIGxldCBpc1Bhc3N0aHJvdWdoID1cclxuICAgICAgcmVzdWx0Lm1pbWVUeXBlID09PSAndGV4dC9wbGFpbicgfHxcclxuICAgICAgIXJlc3VsdC5taW1lVHlwZSB8fFxyXG4gICAgICBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pO1xyXG5cclxuICAgIGlmICgoZmluYWxGb3Jtc1tyZXN1bHQubWltZVR5cGVdICYmICFzaG91bGRJbmxpbmVIdG1saWZ5KSB8fCBpc1Bhc3N0aHJvdWdoKSB7XHJcbiAgICAgIC8vIEdvdCBzb21ldGhpbmcgd2UgY2FuIHVzZSBpbi1icm93c2VyLCBsZXQncyByZXR1cm4gaXRcclxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB7ZGVwZW5kZW50RmlsZXN9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGQoYFJlY3Vyc2l2ZWx5IGNvbXBpbGluZyByZXN1bHQgb2YgJHtmaWxlUGF0aH0gd2l0aCBub24tZmluYWwgTUlNRSB0eXBlICR7cmVzdWx0Lm1pbWVUeXBlfSwgaW5wdXQgd2FzICR7aW5wdXRNaW1lVHlwZX1gKTtcclxuXHJcbiAgICAgIGhhc2hJbmZvID0gT2JqZWN0LmFzc2lnbih7IHNvdXJjZUNvZGU6IHJlc3VsdC5jb2RlLCBtaW1lVHlwZTogcmVzdWx0Lm1pbWVUeXBlIH0sIGhhc2hJbmZvKTtcclxuICAgICAgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbcmVzdWx0Lm1pbWVUeXBlIHx8ICdfX2xvbG5vdGhlcmUnXTtcclxuXHJcbiAgICAgIGlmICghY29tcGlsZXIpIHtcclxuICAgICAgICBkKGBSZWN1cnNpdmUgY29tcGlsZSBmYWlsZWQgLSBpbnRlcm1lZGlhdGUgcmVzdWx0OiAke0pTT04uc3RyaW5naWZ5KHJlc3VsdCl9YCk7XHJcblxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsaW5nICR7ZmlsZVBhdGh9IHJlc3VsdGVkIGluIGEgTUlNRSB0eXBlIG9mICR7cmVzdWx0Lm1pbWVUeXBlfSwgd2hpY2ggd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVVbmNhY2hlZFN5bmMoXHJcbiAgICAgICAgYCR7ZmlsZVBhdGh9LiR7bWltZVR5cGVzLmV4dGVuc2lvbihyZXN1bHQubWltZVR5cGUgfHwgJ3R4dCcpfWAsXHJcbiAgICAgICAgaGFzaEluZm8sIGNvbXBpbGVyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbXBpbGVBbGxTeW5jKHJvb3REaXJlY3RvcnksIHNob3VsZENvbXBpbGU9bnVsbCkge1xyXG4gICAgbGV0IHNob3VsZCA9IHNob3VsZENvbXBpbGUgfHwgZnVuY3Rpb24oKSB7cmV0dXJuIHRydWU7fTtcclxuXHJcbiAgICBmb3JBbGxGaWxlc1N5bmMocm9vdERpcmVjdG9yeSwgKGYpID0+IHtcclxuICAgICAgaWYgKCFzaG91bGQoZikpIHJldHVybjtcclxuICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVN5bmMoZiwgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLypcclxuICAgKiBPdGhlciBzdHVmZlxyXG4gICAqL1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJucyB0aGUgcGFzc3Rocm91Z2ggY29tcGlsZXJcclxuICAgKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpIHtcclxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbJ3RleHQvcGxhaW4nXTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgd2Ugc2hvdWxkIGV2ZW4gdHJ5IHRvIGNvbXBpbGUgdGhlIGNvbnRlbnQuIE5vdGUgdGhhdCBpblxyXG4gICAqIHNvbWUgY2FzZXMsIGNvbnRlbnQgd2lsbCBzdGlsbCBiZSBpbiBjYWNoZSBldmVuIGlmIHRoaXMgcmV0dXJucyB0cnVlLCBhbmRcclxuICAgKiBpbiBvdGhlciBjYXNlcyAoaXNJbk5vZGVNb2R1bGVzKSwgd2UnbGwga25vdyBleHBsaWNpdGx5IHRvIG5vdCBldmVuIGJvdGhlclxyXG4gICAqIGxvb2tpbmcgaW4gdGhlIGNhY2hlLlxyXG4gICAqXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBzdGF0aWMgc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pIHtcclxuICAgIHJldHVybiBoYXNoSW5mby5pc01pbmlmaWVkIHx8IGhhc2hJbmZvLmlzSW5Ob2RlTW9kdWxlcyB8fCBoYXNoSW5mby5oYXNTb3VyY2VNYXAgfHwgaGFzaEluZm8uaXNGaWxlQmluYXJ5O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9vayBhdCB0aGUgY29kZSBvZiBhIG5vZGUgbW9kdWxlcyBhbmQgc2VlIHRoZSBzb3VyY2VNYXBwaW5nIHBhdGguXHJcbiAgICogSWYgdGhlcmUgaXMgYW55LCBjaGVjayB0aGUgcGF0aCBhbmQgdHJ5IHRvIGZpeCBpdCB3aXRoIGFuZFxyXG4gICAqIHJvb3QgcmVsYXRpdmUgcGF0aC5cclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqL1xyXG4gIHN0YXRpYyBhc3luYyBmaXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmcoc291cmNlQ29kZSwgc291cmNlUGF0aCwgYXBwUm9vdCkge1xyXG4gICAgbGV0IHJlZ2V4U291cmNlTWFwcGluZyA9IC9cXC9cXC8jLipzb3VyY2VNYXBwaW5nVVJMPSg/IWRhdGE6KShbXlwiJ10uKikvaTtcclxuICAgIGxldCBzb3VyY2VNYXBwaW5nQ2hlY2sgPSBzb3VyY2VDb2RlLm1hdGNoKHJlZ2V4U291cmNlTWFwcGluZyk7XHJcblxyXG4gICAgaWYgKHNvdXJjZU1hcHBpbmdDaGVjayAmJiBzb3VyY2VNYXBwaW5nQ2hlY2tbMV0gJiYgc291cmNlTWFwcGluZ0NoZWNrWzFdICE9PSAnJyl7XHJcbiAgICAgIGxldCBzb3VyY2VNYXBQYXRoID0gc291cmNlTWFwcGluZ0NoZWNrWzFdO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBwZnMuc3RhdChzb3VyY2VNYXBQYXRoKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBsZXQgbm9ybVJvb3QgPSBwYXRoLm5vcm1hbGl6ZShhcHBSb290KTtcclxuICAgICAgICBsZXQgYWJzUGF0aFRvTW9kdWxlID0gcGF0aC5kaXJuYW1lKHNvdXJjZVBhdGgucmVwbGFjZShub3JtUm9vdCwgJycpLnN1YnN0cmluZygxKSk7XHJcbiAgICAgICAgbGV0IG5ld01hcFBhdGggPSBwYXRoLmpvaW4oYWJzUGF0aFRvTW9kdWxlLCBzb3VyY2VNYXBQYXRoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNvdXJjZUNvZGUucmVwbGFjZShyZWdleFNvdXJjZU1hcHBpbmcsIGAvLyMgc291cmNlTWFwcGluZ1VSTD0ke25ld01hcFBhdGh9YCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc291cmNlQ29kZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvb2sgYXQgdGhlIGNvZGUgb2YgYSBub2RlIG1vZHVsZXMgYW5kIHNlZSB0aGUgc291cmNlTWFwcGluZyBwYXRoLlxyXG4gICAqIElmIHRoZXJlIGlzIGFueSwgY2hlY2sgdGhlIHBhdGggYW5kIHRyeSB0byBmaXggaXQgd2l0aCBhbmRcclxuICAgKiByb290IHJlbGF0aXZlIHBhdGguXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBzdGF0aWMgZml4Tm9kZU1vZHVsZXNTb3VyY2VNYXBwaW5nU3luYyhzb3VyY2VDb2RlLCBzb3VyY2VQYXRoLCBhcHBSb290KSB7XHJcbiAgICBsZXQgcmVnZXhTb3VyY2VNYXBwaW5nID0gL1xcL1xcLyMuKnNvdXJjZU1hcHBpbmdVUkw9KD8hZGF0YTopKFteXCInXS4qKS9pO1xyXG4gICAgbGV0IHNvdXJjZU1hcHBpbmdDaGVjayA9IHNvdXJjZUNvZGUubWF0Y2gocmVnZXhTb3VyY2VNYXBwaW5nKTtcclxuXHJcbiAgICBpZiAoc291cmNlTWFwcGluZ0NoZWNrICYmIHNvdXJjZU1hcHBpbmdDaGVja1sxXSAmJiBzb3VyY2VNYXBwaW5nQ2hlY2tbMV0gIT09ICcnKXtcclxuICAgICAgbGV0IHNvdXJjZU1hcFBhdGggPSBzb3VyY2VNYXBwaW5nQ2hlY2tbMV07XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGZzLnN0YXRTeW5jKHNvdXJjZU1hcFBhdGgpO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGxldCBub3JtUm9vdCA9IHBhdGgubm9ybWFsaXplKGFwcFJvb3QpO1xyXG4gICAgICAgIGxldCBhYnNQYXRoVG9Nb2R1bGUgPSBwYXRoLmRpcm5hbWUoc291cmNlUGF0aC5yZXBsYWNlKG5vcm1Sb290LCAnJykuc3Vic3RyaW5nKDEpKTtcclxuICAgICAgICBsZXQgbmV3TWFwUGF0aCA9IHBhdGguam9pbihhYnNQYXRoVG9Nb2R1bGUsIHNvdXJjZU1hcFBhdGgpO1xyXG5cclxuICAgICAgICByZXR1cm4gc291cmNlQ29kZS5yZXBsYWNlKHJlZ2V4U291cmNlTWFwcGluZywgYC8vIyBzb3VyY2VNYXBwaW5nVVJMPSR7bmV3TWFwUGF0aH1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzb3VyY2VDb2RlO1xyXG4gIH1cclxufVxyXG4iXX0=