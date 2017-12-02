'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _digestForObject = require('./digest-for-object');

var _digestForObject2 = _interopRequireDefault(_digestForObject);

var _promise = require('./promise');

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:compile-cache');

/**
 * CompileCache manages getting and setting entries for a single compiler; each
 * in-use compiler will have an instance of this class, usually created via
 * {@link createFromCompiler}.
 *
 * You usually will not use this class directly, it is an implementation class
 * for {@link CompileHost}.
 */
class CompileCache {
  /**
   * Creates an instance, usually used for testing only.
   *
   * @param  {string} cachePath  The root directory to use as a cache path
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   * @param {string} sourceMapPath The directory to store sourcemap separately if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   */
  constructor(cachePath, fileChangeCache) {
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    this.cachePath = cachePath;
    this.fileChangeCache = fileChangeCache;
    this.sourceMapPath = sourceMapPath || this.cachePath;
  }

  /**
   * Creates a CompileCache from a class compatible with the CompilerBase
   * interface. This method uses the compiler name / version / options to
   * generate a unique directory name for cached results
   *
   * @param  {string} cachePath  The root path to use for the cache, a directory
   *                             representing the hash of the compiler parameters
   *                             will be created here.
   *
   * @param  {CompilerBase} compiler  The compiler to use for version / option
   *                                  information.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  Don't attempt to create the cache directory.
   *
   * @param {string} sourceMapPath The directory to store sourcemap separately if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   *
   * @return {CompileCache}  A configured CompileCache instance.
   */
  static createFromCompiler(cachePath, compiler, fileChangeCache) {
    let readOnlyMode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    let sourceMapPath = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    let newCachePath = null;
    let getCachePath = () => {
      if (newCachePath) return newCachePath;

      const digestObj = {
        name: compiler.name || Object.getPrototypeOf(compiler).constructor.name,
        version: compiler.getCompilerVersion(),
        options: compiler.compilerOptions
      };

      newCachePath = _path2.default.join(cachePath, (0, _digestForObject2.default)(digestObj));

      d(`Path for ${digestObj.name}: ${newCachePath}`);
      d(`Set up with parameters: ${JSON.stringify(digestObj)}`);

      if (!readOnlyMode) _mkdirp2.default.sync(newCachePath);
      return newCachePath;
    };

    let ret = new CompileCache('', fileChangeCache);
    ret.getCachePath = getCachePath;

    const newSourceMapPath = sourceMapPath;
    ret.getSourceMapPath = () => newSourceMapPath || getCachePath();

    return ret;
  }

  /**
   * Returns a file's compiled contents from the cache.
   *
   * @param  {string} filePath  The path to the file. FileChangedCache will look
   *                            up the hash and use that as the key in the cache.
   *
   * @return {Promise<Object>}  An object with all kinds of information
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  get(filePath) {
    var _this = this;

    return _asyncToGenerator(function* () {
      d(`Fetching ${filePath} from cache`);
      let hashInfo = yield _this.fileChangeCache.getHashForPath(_path2.default.resolve(filePath));

      let code = null;
      let mimeType = null;
      let binaryData = null;
      let dependentFiles = null;

      let cacheFile = null;
      try {
        cacheFile = _path2.default.join(_this.getCachePath(), hashInfo.hash);
        let result = null;

        if (hashInfo.isFileBinary) {
          d("File is binary, reading out info");
          let info = JSON.parse((yield _promise.pfs.readFile(cacheFile + '.info')));
          mimeType = info.mimeType;
          dependentFiles = info.dependentFiles;

          binaryData = hashInfo.binaryData;
          if (!binaryData) {
            binaryData = yield _promise.pfs.readFile(cacheFile);
            binaryData = yield _promise.pzlib.gunzip(binaryData);
          }
        } else {
          let buf = yield _promise.pfs.readFile(cacheFile);
          let str = (yield _promise.pzlib.gunzip(buf)).toString('utf8');

          result = JSON.parse(str);
          code = result.code;
          mimeType = result.mimeType;
          dependentFiles = result.dependentFiles;
        }
      } catch (e) {
        d(`Failed to read cache for ${filePath}, looked in ${cacheFile}: ${e.message}`);
      }

      return { hashInfo, code, mimeType, binaryData, dependentFiles };
    })();
  }

  /**
   * Saves a compiled result to cache
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @param  {string / Buffer} codeOrBinaryData   The file's contents, either as
   *                                              a string or a Buffer.
   * @param  {string} mimeType  The MIME type returned by the compiler.
   *
   * @param  {string[]} dependentFiles  The list of dependent files returned by
   *                                    the compiler.
   * @return {Promise}  Completion.
   */
  save(hashInfo, codeOrBinaryData, mimeType, dependentFiles) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let buf = null;
      let target = _path2.default.join(_this2.getCachePath(), hashInfo.hash);
      d(`Saving to ${target}`);

      if (hashInfo.isFileBinary) {
        buf = yield _promise.pzlib.gzip(codeOrBinaryData);
        yield _promise.pfs.writeFile(target + '.info', JSON.stringify({ mimeType, dependentFiles }), 'utf8');
      } else {
        buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify({ code: codeOrBinaryData, mimeType, dependentFiles })));
      }

      yield _promise.pfs.writeFile(target, buf);
    })();
  }

  /**
   * Attempts to first get a key via {@link get}, then if it fails, call a method
   * to retrieve the contents, then save the result to cache.
   *
   * The fetcher parameter is expected to have the signature:
   *
   * Promise<Object> fetcher(filePath : string, hashInfo : Object);
   *
   * hashInfo is a value returned from getHashForPath
   * The return value of fetcher must be an Object with the properties:
   *
   * mimeType - the MIME type of the data to save
   * code (optional) - the source code as a string, if file is text
   * binaryData (optional) - the file contents as a Buffer, if file is binary
   * dependentFiles - the dependent files returned by the compiler.
   *
   * @param  {string} filePath  The path to the file. FileChangedCache will look
   *                            up the hash and use that as the key in the cache.
   *
   * @param  {Function} fetcher  A method which conforms to the description above.
   *
   * @return {Promise<Object>}  An Object which has the same fields as the
   *                            {@link get} method return result.
   */
  getOrFetch(filePath, fetcher) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let cacheResult = yield _this3.get(filePath);
      let anyDependenciesChanged = yield _this3.haveAnyDependentFilesChanged(cacheResult);

      if ((cacheResult.code || cacheResult.binaryData) && !anyDependenciesChanged) {
        return cacheResult;
      }

      let result = (yield fetcher(filePath, cacheResult.hashInfo)) || { hashInfo: cacheResult.hashInfo };

      if (result.mimeType && !cacheResult.hashInfo.isInNodeModules) {
        d(`Cache miss: saving out info for ${filePath}`);
        yield _this3.save(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);

        const map = result.sourceMaps;
        if (map) {
          d(`source map for ${filePath} found, saving it to ${_this3.getSourceMapPath()}`);
          yield _this3.saveSourceMap(cacheResult.hashInfo, filePath, map);
        }
      }

      result.hashInfo = cacheResult.hashInfo;
      return result;
    })();
  }

  /**
   * @private Check if any of a file's dependencies have changed
   */
  haveAnyDependentFilesChanged(cacheResult) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (!cacheResult.code || !cacheResult.dependentFiles.length) return false;

      for (let dependentFile of cacheResult.dependentFiles) {
        let hasFileChanged = yield _this4.fileChangeCache.hasFileChanged(dependentFile);
        if (hasFileChanged) {
          return true;
        }

        let dependentFileCacheResult = yield _this4.get(dependentFile);
        if (dependentFileCacheResult.dependentFiles && dependentFileCacheResult.dependentFiles.length) {
          let anySubdependentFilesChanged = yield _this4.haveAnyDependentFilesChanged(dependentFileCacheResult);
          if (anySubdependentFilesChanged) return true;
        }
      }

      return false;
    })();
  }

  getSync(filePath) {
    d(`Fetching ${filePath} from cache`);
    let hashInfo = this.fileChangeCache.getHashForPathSync(_path2.default.resolve(filePath));

    let code = null;
    let mimeType = null;
    let binaryData = null;
    let dependentFiles = null;

    try {
      let cacheFile = _path2.default.join(this.getCachePath(), hashInfo.hash);

      let result = null;
      if (hashInfo.isFileBinary) {
        d("File is binary, reading out info");
        let info = JSON.parse(_fs2.default.readFileSync(cacheFile + '.info'));
        mimeType = info.mimeType;
        dependentFiles = info.dependentFiles;

        binaryData = hashInfo.binaryData;
        if (!binaryData) {
          binaryData = _fs2.default.readFileSync(cacheFile);
          binaryData = _zlib2.default.gunzipSync(binaryData);
        }
      } else {
        let buf = _fs2.default.readFileSync(cacheFile);
        let str = _zlib2.default.gunzipSync(buf).toString('utf8');

        result = JSON.parse(str);
        code = result.code;
        mimeType = result.mimeType;
        dependentFiles = result.dependentFiles;
      }
    } catch (e) {
      d(`Failed to read cache for ${filePath}`);
    }

    return { hashInfo, code, mimeType, binaryData, dependentFiles };
  }

  saveSync(hashInfo, codeOrBinaryData, mimeType, dependentFiles) {
    let buf = null;
    let target = _path2.default.join(this.getCachePath(), hashInfo.hash);
    d(`Saving to ${target}`);

    if (hashInfo.isFileBinary) {
      buf = _zlib2.default.gzipSync(codeOrBinaryData);
      _fs2.default.writeFileSync(target + '.info', JSON.stringify({ mimeType, dependentFiles }), 'utf8');
    } else {
      buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify({ code: codeOrBinaryData, mimeType, dependentFiles })));
    }

    _fs2.default.writeFileSync(target, buf);
  }

  getOrFetchSync(filePath, fetcher) {
    let cacheResult = this.getSync(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;

    let result = fetcher(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };

    if (result.mimeType && !cacheResult.hashInfo.isInNodeModules) {
      d(`Cache miss: saving out info for ${filePath}`);
      this.saveSync(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);
    }

    const map = result.sourceMaps;
    if (map) {
      d(`source map for ${filePath} found, saving it to ${this.getSourceMapPath()}`);
      this.saveSourceMapSync(cacheResult.hashInfo, filePath, map);
    }

    result.hashInfo = cacheResult.hashInfo;
    return result;
  }

  buildSourceMapTarget(hashInfo, filePath) {
    const fileName = _path2.default.basename(filePath);
    const mapFileName = fileName.replace(_path2.default.extname(fileName), '.js.map');

    const target = _path2.default.join(this.getSourceMapPath(), mapFileName);
    d(`Sourcemap target is: ${target}`);

    return target;
  }

  /**
   * Saves sourcemap string into cache, or specified separate dir
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @param  {string} filePath Path to original file to construct sourcemap file name
     * @param  {string} sourceMap Sourcemap data as string
   *
   * @memberOf CompileCache
   */
  saveSourceMap(hashInfo, filePath, sourceMap) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const target = _this5.buildSourceMapTarget(hashInfo, filePath);
      yield _promise.pfs.writeFile(target, sourceMap, 'utf-8');
    })();
  }

  saveSourceMapSync(hashInfo, filePath, sourceMap) {
    const target = this.buildSourceMapTarget(hashInfo, filePath);
    _fs2.default.writeFileSync(target, sourceMap, 'utf-8');
  }

  /**
   * @private
   */
  getCachePath() {
    // NB: This is an evil hack so that createFromCompiler can stomp it
    // at will
    return this.cachePath;
  }

  /**
   * @private
   */
  getSourceMapPath() {
    return this.sourceMapPath;
  }

  /**
   * Returns whether a file should not be compiled. Note that this doesn't
   * necessarily mean it won't end up in the cache, only that its contents are
   * saved verbatim instead of trying to find an appropriate compiler.
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @return {boolean}  True if a file should be ignored
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }
}
exports.default = CompileCache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21waWxlLWNhY2hlLmpzIl0sIm5hbWVzIjpbImQiLCJyZXF1aXJlIiwiQ29tcGlsZUNhY2hlIiwiY29uc3RydWN0b3IiLCJjYWNoZVBhdGgiLCJmaWxlQ2hhbmdlQ2FjaGUiLCJzb3VyY2VNYXBQYXRoIiwiY3JlYXRlRnJvbUNvbXBpbGVyIiwiY29tcGlsZXIiLCJyZWFkT25seU1vZGUiLCJuZXdDYWNoZVBhdGgiLCJnZXRDYWNoZVBhdGgiLCJkaWdlc3RPYmoiLCJuYW1lIiwiT2JqZWN0IiwiZ2V0UHJvdG90eXBlT2YiLCJ2ZXJzaW9uIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIiwib3B0aW9ucyIsImNvbXBpbGVyT3B0aW9ucyIsImpvaW4iLCJKU09OIiwic3RyaW5naWZ5Iiwic3luYyIsInJldCIsIm5ld1NvdXJjZU1hcFBhdGgiLCJnZXRTb3VyY2VNYXBQYXRoIiwiZ2V0IiwiZmlsZVBhdGgiLCJoYXNoSW5mbyIsImdldEhhc2hGb3JQYXRoIiwicmVzb2x2ZSIsImNvZGUiLCJtaW1lVHlwZSIsImJpbmFyeURhdGEiLCJkZXBlbmRlbnRGaWxlcyIsImNhY2hlRmlsZSIsImhhc2giLCJyZXN1bHQiLCJpc0ZpbGVCaW5hcnkiLCJpbmZvIiwicGFyc2UiLCJyZWFkRmlsZSIsImd1bnppcCIsImJ1ZiIsInN0ciIsInRvU3RyaW5nIiwiZSIsIm1lc3NhZ2UiLCJzYXZlIiwiY29kZU9yQmluYXJ5RGF0YSIsInRhcmdldCIsImd6aXAiLCJ3cml0ZUZpbGUiLCJCdWZmZXIiLCJnZXRPckZldGNoIiwiZmV0Y2hlciIsImNhY2hlUmVzdWx0IiwiYW55RGVwZW5kZW5jaWVzQ2hhbmdlZCIsImhhdmVBbnlEZXBlbmRlbnRGaWxlc0NoYW5nZWQiLCJpc0luTm9kZU1vZHVsZXMiLCJtYXAiLCJzb3VyY2VNYXBzIiwic2F2ZVNvdXJjZU1hcCIsImxlbmd0aCIsImRlcGVuZGVudEZpbGUiLCJoYXNGaWxlQ2hhbmdlZCIsImRlcGVuZGVudEZpbGVDYWNoZVJlc3VsdCIsImFueVN1YmRlcGVuZGVudEZpbGVzQ2hhbmdlZCIsImdldFN5bmMiLCJnZXRIYXNoRm9yUGF0aFN5bmMiLCJyZWFkRmlsZVN5bmMiLCJndW56aXBTeW5jIiwic2F2ZVN5bmMiLCJnemlwU3luYyIsIndyaXRlRmlsZVN5bmMiLCJnZXRPckZldGNoU3luYyIsInNhdmVTb3VyY2VNYXBTeW5jIiwiYnVpbGRTb3VyY2VNYXBUYXJnZXQiLCJmaWxlTmFtZSIsImJhc2VuYW1lIiwibWFwRmlsZU5hbWUiLCJyZXBsYWNlIiwiZXh0bmFtZSIsInNvdXJjZU1hcCIsInNob3VsZFBhc3N0aHJvdWdoIiwiaXNNaW5pZmllZCIsImhhc1NvdXJjZU1hcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNQSxJQUFJQyxRQUFRLE9BQVIsRUFBaUIsZ0NBQWpCLENBQVY7O0FBRUE7Ozs7Ozs7O0FBUWUsTUFBTUMsWUFBTixDQUFtQjtBQUNoQzs7Ozs7Ozs7OztBQVVBQyxjQUFZQyxTQUFaLEVBQXVCQyxlQUF2QixFQUE4RDtBQUFBLFFBQXRCQyxhQUFzQix1RUFBTixJQUFNOztBQUM1RCxTQUFLRixTQUFMLEdBQWlCQSxTQUFqQjtBQUNBLFNBQUtDLGVBQUwsR0FBdUJBLGVBQXZCO0FBQ0EsU0FBS0MsYUFBTCxHQUFxQkEsaUJBQWlCLEtBQUtGLFNBQTNDO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQkEsU0FBT0csa0JBQVAsQ0FBMEJILFNBQTFCLEVBQXFDSSxRQUFyQyxFQUErQ0gsZUFBL0MsRUFBNEc7QUFBQSxRQUE1Q0ksWUFBNEMsdUVBQTdCLEtBQTZCO0FBQUEsUUFBdEJILGFBQXNCLHVFQUFOLElBQU07O0FBQzFHLFFBQUlJLGVBQWUsSUFBbkI7QUFDQSxRQUFJQyxlQUFlLE1BQU07QUFDdkIsVUFBSUQsWUFBSixFQUFrQixPQUFPQSxZQUFQOztBQUVsQixZQUFNRSxZQUFZO0FBQ2hCQyxjQUFN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QXpDLENBQXBCOztBQUVBLFVBQU01QixTQUFTLGVBQUsvQixJQUFMLENBQVUsS0FBS00sZ0JBQUwsRUFBVixFQUFtQ3VELFdBQW5DLENBQWY7QUFDQWpGLE1BQUcsd0JBQXVCbUQsTUFBTyxFQUFqQzs7QUFFQSxXQUFPQSxNQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7QUFXTVksZUFBTixDQUFvQmxDLFFBQXBCLEVBQThCRCxRQUE5QixFQUF3Q3dELFNBQXhDLEVBQW1EO0FBQUE7O0FBQUE7QUFDakQsWUFBTWpDLFNBQVMsT0FBSzJCLG9CQUFMLENBQTBCakQsUUFBMUIsRUFBb0NELFFBQXBDLENBQWY7QUFDQSxZQUFNLGFBQUl5QixTQUFKLENBQWNGLE1BQWQsRUFBc0JpQyxTQUF0QixFQUFpQyxPQUFqQyxDQUFOO0FBRmlEO0FBR2xEOztBQUVEUCxvQkFBa0JoRCxRQUFsQixFQUE0QkQsUUFBNUIsRUFBc0N3RCxTQUF0QyxFQUFpRDtBQUMvQyxVQUFNakMsU0FBUyxLQUFLMkIsb0JBQUwsQ0FBMEJqRCxRQUExQixFQUFvQ0QsUUFBcEMsQ0FBZjtBQUNBLGlCQUFHK0MsYUFBSCxDQUFpQnhCLE1BQWpCLEVBQXlCaUMsU0FBekIsRUFBb0MsT0FBcEM7QUFDRDs7QUFFRDs7O0FBR0F6RSxpQkFBZTtBQUNiO0FBQ0E7QUFDQSxXQUFPLEtBQUtQLFNBQVo7QUFDRDs7QUFFRDs7O0FBR0FzQixxQkFBbUI7QUFDakIsV0FBTyxLQUFLcEIsYUFBWjtBQUNEOztBQUVEOzs7Ozs7Ozs7QUFTQSxTQUFPK0UsaUJBQVAsQ0FBeUJ4RCxRQUF6QixFQUFtQztBQUNqQyxXQUFPQSxTQUFTeUQsVUFBVCxJQUF1QnpELFNBQVMrQixlQUFoQyxJQUFtRC9CLFNBQVMwRCxZQUE1RCxJQUE0RTFELFNBQVNVLFlBQTVGO0FBQ0Q7QUF2VytCO2tCQUFickMsWSIsImZpbGUiOiJjb21waWxlLWNhY2hlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB6bGliIGZyb20gJ3psaWInO1xyXG5pbXBvcnQgY3JlYXRlRGlnZXN0Rm9yT2JqZWN0IGZyb20gJy4vZGlnZXN0LWZvci1vYmplY3QnO1xyXG5pbXBvcnQge3BmcywgcHpsaWJ9IGZyb20gJy4vcHJvbWlzZSc7XHJcbmltcG9ydCBta2RpcnAgZnJvbSAnbWtkaXJwJztcclxuXHJcbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOmNvbXBpbGUtY2FjaGUnKTtcclxuXHJcbi8qKlxyXG4gKiBDb21waWxlQ2FjaGUgbWFuYWdlcyBnZXR0aW5nIGFuZCBzZXR0aW5nIGVudHJpZXMgZm9yIGEgc2luZ2xlIGNvbXBpbGVyOyBlYWNoXHJcbiAqIGluLXVzZSBjb21waWxlciB3aWxsIGhhdmUgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgdXN1YWxseSBjcmVhdGVkIHZpYVxyXG4gKiB7QGxpbmsgY3JlYXRlRnJvbUNvbXBpbGVyfS5cclxuICpcclxuICogWW91IHVzdWFsbHkgd2lsbCBub3QgdXNlIHRoaXMgY2xhc3MgZGlyZWN0bHksIGl0IGlzIGFuIGltcGxlbWVudGF0aW9uIGNsYXNzXHJcbiAqIGZvciB7QGxpbmsgQ29tcGlsZUhvc3R9LlxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGlsZUNhY2hlIHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlLCB1c3VhbGx5IHVzZWQgZm9yIHRlc3Rpbmcgb25seS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge3N0cmluZ30gY2FjaGVQYXRoICBUaGUgcm9vdCBkaXJlY3RvcnkgdG8gdXNlIGFzIGEgY2FjaGUgcGF0aFxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7RmlsZUNoYW5nZWRDYWNoZX0gZmlsZUNoYW5nZUNhY2hlICBBIGZpbGUtY2hhbmdlIGNhY2hlIHRoYXQgaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsbHkgcHJlLWxvYWRlZC5cclxuICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlTWFwUGF0aCBUaGUgZGlyZWN0b3J5IHRvIHN0b3JlIHNvdXJjZW1hcCBzZXBhcmF0ZWx5IGlmIGNvbXBpbGVyIG9wdGlvbiBlbmFibGVkIHRvIGVtaXQuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCB0byBjYWNoZVBhdGggaWYgbm90IHNwZWNpZmllZC5cclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihjYWNoZVBhdGgsIGZpbGVDaGFuZ2VDYWNoZSwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcclxuICAgIHRoaXMuY2FjaGVQYXRoID0gY2FjaGVQYXRoO1xyXG4gICAgdGhpcy5maWxlQ2hhbmdlQ2FjaGUgPSBmaWxlQ2hhbmdlQ2FjaGU7XHJcbiAgICB0aGlzLnNvdXJjZU1hcFBhdGggPSBzb3VyY2VNYXBQYXRoIHx8IHRoaXMuY2FjaGVQYXRoO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIENvbXBpbGVDYWNoZSBmcm9tIGEgY2xhc3MgY29tcGF0aWJsZSB3aXRoIHRoZSBDb21waWxlckJhc2VcclxuICAgKiBpbnRlcmZhY2UuIFRoaXMgbWV0aG9kIHVzZXMgdGhlIGNvbXBpbGVyIG5hbWUgLyB2ZXJzaW9uIC8gb3B0aW9ucyB0b1xyXG4gICAqIGdlbmVyYXRlIGEgdW5pcXVlIGRpcmVjdG9yeSBuYW1lIGZvciBjYWNoZWQgcmVzdWx0c1xyXG4gICAqXHJcbiAgICogQHBhcmFtICB7c3RyaW5nfSBjYWNoZVBhdGggIFRoZSByb290IHBhdGggdG8gdXNlIGZvciB0aGUgY2FjaGUsIGEgZGlyZWN0b3J5XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcHJlc2VudGluZyB0aGUgaGFzaCBvZiB0aGUgY29tcGlsZXIgcGFyYW1ldGVyc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGJlIGNyZWF0ZWQgaGVyZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0NvbXBpbGVyQmFzZX0gY29tcGlsZXIgIFRoZSBjb21waWxlciB0byB1c2UgZm9yIHZlcnNpb24gLyBvcHRpb25cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvcm1hdGlvbi5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0ZpbGVDaGFuZ2VkQ2FjaGV9IGZpbGVDaGFuZ2VDYWNoZSAgQSBmaWxlLWNoYW5nZSBjYWNoZSB0aGF0IGlzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25hbGx5IHByZS1sb2FkZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtib29sZWFufSByZWFkT25seU1vZGUgIERvbid0IGF0dGVtcHQgdG8gY3JlYXRlIHRoZSBjYWNoZSBkaXJlY3RvcnkuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlTWFwUGF0aCBUaGUgZGlyZWN0b3J5IHRvIHN0b3JlIHNvdXJjZW1hcCBzZXBhcmF0ZWx5IGlmIGNvbXBpbGVyIG9wdGlvbiBlbmFibGVkIHRvIGVtaXQuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCB0byBjYWNoZVBhdGggaWYgbm90IHNwZWNpZmllZC5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge0NvbXBpbGVDYWNoZX0gIEEgY29uZmlndXJlZCBDb21waWxlQ2FjaGUgaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgc3RhdGljIGNyZWF0ZUZyb21Db21waWxlcihjYWNoZVBhdGgsIGNvbXBpbGVyLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSA9IGZhbHNlLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xyXG4gICAgbGV0IG5ld0NhY2hlUGF0aCA9IG51bGw7XHJcbiAgICBsZXQgZ2V0Q2FjaGVQYXRoID0gKCkgPT4ge1xyXG4gICAgICBpZiAobmV3Q2FjaGVQYXRoKSByZXR1cm4gbmV3Q2FjaGVQYXRoO1xyXG5cclxuICAgICAgY29uc3QgZGlnZXN0T2JqID0ge1xyXG4gICAgICAgIG5hbWU6IGNvbXBpbGVyLm5hbWUgfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbXBpbGVyKS5jb25zdHJ1Y3Rvci5uYW1lLFxyXG4gICAgICAgIHZlcnNpb246IGNvbXBpbGVyLmdldENvbXBpbGVyVmVyc2lvbigpLFxyXG4gICAgICAgIG9wdGlvbnM6IGNvbXBpbGVyLmNvbXBpbGVyT3B0aW9uc1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgbmV3Q2FjaGVQYXRoID0gcGF0aC5qb2luKGNhY2hlUGF0aCwgY3JlYXRlRGlnZXN0Rm9yT2JqZWN0KGRpZ2VzdE9iaikpO1xyXG5cclxuICAgICAgZChgUGF0aCBmb3IgJHtkaWdlc3RPYmoubmFtZX06ICR7bmV3Q2FjaGVQYXRofWApO1xyXG4gICAgICBkKGBTZXQgdXAgd2l0aCBwYXJhbWV0ZXJzOiAke0pTT04uc3RyaW5naWZ5KGRpZ2VzdE9iail9YCk7XHJcblxyXG4gICAgICBpZiAoIXJlYWRPbmx5TW9kZSkgbWtkaXJwLnN5bmMobmV3Q2FjaGVQYXRoKTtcclxuICAgICAgcmV0dXJuIG5ld0NhY2hlUGF0aDtcclxuICAgIH07XHJcblxyXG4gICAgbGV0IHJldCA9IG5ldyBDb21waWxlQ2FjaGUoJycsIGZpbGVDaGFuZ2VDYWNoZSk7XHJcbiAgICByZXQuZ2V0Q2FjaGVQYXRoID0gZ2V0Q2FjaGVQYXRoO1xyXG5cclxuICAgIGNvbnN0IG5ld1NvdXJjZU1hcFBhdGggPSBzb3VyY2VNYXBQYXRoO1xyXG4gICAgcmV0LmdldFNvdXJjZU1hcFBhdGggPSAoKSA9PiBuZXdTb3VyY2VNYXBQYXRoIHx8IGdldENhY2hlUGF0aCgpO1xyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXR1cm5zIGEgZmlsZSdzIGNvbXBpbGVkIGNvbnRlbnRzIGZyb20gdGhlIGNhY2hlLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7c3RyaW5nfSBmaWxlUGF0aCAgVGhlIHBhdGggdG8gdGhlIGZpbGUuIEZpbGVDaGFuZ2VkQ2FjaGUgd2lsbCBsb29rXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgdXAgdGhlIGhhc2ggYW5kIHVzZSB0aGF0IGFzIHRoZSBrZXkgaW4gdGhlIGNhY2hlLlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZTxPYmplY3Q+fSAgQW4gb2JqZWN0IHdpdGggYWxsIGtpbmRzIG9mIGluZm9ybWF0aW9uXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge09iamVjdH0gaGFzaEluZm8gIFRoZSBoYXNoIGluZm9ybWF0aW9uIHJldHVybmVkIGZyb20gZ2V0SGFzaEZvclBhdGhcclxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gY29kZSAgVGhlIHNvdXJjZSBjb2RlIGlmIHRoZSBmaWxlIHdhcyBhIHRleHQgZmlsZVxyXG4gICAqIEBwcm9wZXJ0eSB7QnVmZmVyfSBiaW5hcnlEYXRhICBUaGUgZmlsZSBpZiBpdCB3YXMgYSBiaW5hcnkgZmlsZVxyXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBtaW1lVHlwZSAgVGhlIE1JTUUgdHlwZSBzYXZlZCBpbiB0aGUgY2FjaGUuXHJcbiAgICogQHByb3BlcnR5IHtzdHJpbmdbXX0gZGVwZW5kZW50RmlsZXMgIFRoZSBkZXBlbmRlbnQgZmlsZXMgcmV0dXJuZWQgZnJvbVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxpbmcgdGhlIGZpbGUsIGlmIGFueS5cclxuICAgKi9cclxuICBhc3luYyBnZXQoZmlsZVBhdGgpIHtcclxuICAgIGQoYEZldGNoaW5nICR7ZmlsZVBhdGh9IGZyb20gY2FjaGVgKTtcclxuICAgIGxldCBoYXNoSW5mbyA9IGF3YWl0IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmdldEhhc2hGb3JQYXRoKHBhdGgucmVzb2x2ZShmaWxlUGF0aCkpO1xyXG5cclxuICAgIGxldCBjb2RlID0gbnVsbDtcclxuICAgIGxldCBtaW1lVHlwZSA9IG51bGw7XHJcbiAgICBsZXQgYmluYXJ5RGF0YSA9IG51bGw7XHJcbiAgICBsZXQgZGVwZW5kZW50RmlsZXMgPSBudWxsO1xyXG5cclxuICAgIGxldCBjYWNoZUZpbGUgPSBudWxsO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY2FjaGVGaWxlID0gcGF0aC5qb2luKHRoaXMuZ2V0Q2FjaGVQYXRoKCksIGhhc2hJbmZvLmhhc2gpO1xyXG4gICAgICBsZXQgcmVzdWx0ID0gbnVsbDtcclxuXHJcbiAgICAgIGlmIChoYXNoSW5mby5pc0ZpbGVCaW5hcnkpIHtcclxuICAgICAgICBkKFwiRmlsZSBpcyBiaW5hcnksIHJlYWRpbmcgb3V0IGluZm9cIik7XHJcbiAgICAgICAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHBmcy5yZWFkRmlsZShjYWNoZUZpbGUgKyAnLmluZm8nKSk7XHJcbiAgICAgICAgbWltZVR5cGUgPSBpbmZvLm1pbWVUeXBlO1xyXG4gICAgICAgIGRlcGVuZGVudEZpbGVzID0gaW5mby5kZXBlbmRlbnRGaWxlcztcclxuXHJcbiAgICAgICAgYmluYXJ5RGF0YSA9IGhhc2hJbmZvLmJpbmFyeURhdGE7XHJcbiAgICAgICAgaWYgKCFiaW5hcnlEYXRhKSB7XHJcbiAgICAgICAgICBiaW5hcnlEYXRhID0gYXdhaXQgcGZzLnJlYWRGaWxlKGNhY2hlRmlsZSk7XHJcbiAgICAgICAgICBiaW5hcnlEYXRhID0gYXdhaXQgcHpsaWIuZ3VuemlwKGJpbmFyeURhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgYnVmID0gYXdhaXQgcGZzLnJlYWRGaWxlKGNhY2hlRmlsZSk7XHJcbiAgICAgICAgbGV0IHN0ciA9IChhd2FpdCBwemxpYi5ndW56aXAoYnVmKSkudG9TdHJpbmcoJ3V0ZjgnKTtcclxuXHJcbiAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShzdHIpO1xyXG4gICAgICAgIGNvZGUgPSByZXN1bHQuY29kZTtcclxuICAgICAgICBtaW1lVHlwZSA9IHJlc3VsdC5taW1lVHlwZTtcclxuICAgICAgICBkZXBlbmRlbnRGaWxlcyA9IHJlc3VsdC5kZXBlbmRlbnRGaWxlcztcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBkKGBGYWlsZWQgdG8gcmVhZCBjYWNoZSBmb3IgJHtmaWxlUGF0aH0sIGxvb2tlZCBpbiAke2NhY2hlRmlsZX06ICR7ZS5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IGhhc2hJbmZvLCBjb2RlLCBtaW1lVHlwZSwgYmluYXJ5RGF0YSwgZGVwZW5kZW50RmlsZXMgfTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBTYXZlcyBhIGNvbXBpbGVkIHJlc3VsdCB0byBjYWNoZVxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7T2JqZWN0fSBoYXNoSW5mbyAgVGhlIGhhc2ggaW5mb3JtYXRpb24gcmV0dXJuZWQgZnJvbSBnZXRIYXNoRm9yUGF0aFxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7c3RyaW5nIC8gQnVmZmVyfSBjb2RlT3JCaW5hcnlEYXRhICAgVGhlIGZpbGUncyBjb250ZW50cywgZWl0aGVyIGFzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSBzdHJpbmcgb3IgYSBCdWZmZXIuXHJcbiAgICogQHBhcmFtICB7c3RyaW5nfSBtaW1lVHlwZSAgVGhlIE1JTUUgdHlwZSByZXR1cm5lZCBieSB0aGUgY29tcGlsZXIuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmdbXX0gZGVwZW5kZW50RmlsZXMgIFRoZSBsaXN0IG9mIGRlcGVuZGVudCBmaWxlcyByZXR1cm5lZCBieVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGNvbXBpbGVyLlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICBDb21wbGV0aW9uLlxyXG4gICAqL1xyXG4gIGFzeW5jIHNhdmUoaGFzaEluZm8sIGNvZGVPckJpbmFyeURhdGEsIG1pbWVUeXBlLCBkZXBlbmRlbnRGaWxlcykge1xyXG4gICAgbGV0IGJ1ZiA9IG51bGw7XHJcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHRoaXMuZ2V0Q2FjaGVQYXRoKCksIGhhc2hJbmZvLmhhc2gpO1xyXG4gICAgZChgU2F2aW5nIHRvICR7dGFyZ2V0fWApO1xyXG5cclxuICAgIGlmIChoYXNoSW5mby5pc0ZpbGVCaW5hcnkpIHtcclxuICAgICAgYnVmID0gYXdhaXQgcHpsaWIuZ3ppcChjb2RlT3JCaW5hcnlEYXRhKTtcclxuICAgICAgYXdhaXQgcGZzLndyaXRlRmlsZSh0YXJnZXQgKyAnLmluZm8nLCBKU09OLnN0cmluZ2lmeSh7bWltZVR5cGUsIGRlcGVuZGVudEZpbGVzfSksICd1dGY4Jyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBidWYgPSBhd2FpdCBwemxpYi5nemlwKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkoe2NvZGU6IGNvZGVPckJpbmFyeURhdGEsIG1pbWVUeXBlLCBkZXBlbmRlbnRGaWxlc30pKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgcGZzLndyaXRlRmlsZSh0YXJnZXQsIGJ1Zik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBdHRlbXB0cyB0byBmaXJzdCBnZXQgYSBrZXkgdmlhIHtAbGluayBnZXR9LCB0aGVuIGlmIGl0IGZhaWxzLCBjYWxsIGEgbWV0aG9kXHJcbiAgICogdG8gcmV0cmlldmUgdGhlIGNvbnRlbnRzLCB0aGVuIHNhdmUgdGhlIHJlc3VsdCB0byBjYWNoZS5cclxuICAgKlxyXG4gICAqIFRoZSBmZXRjaGVyIHBhcmFtZXRlciBpcyBleHBlY3RlZCB0byBoYXZlIHRoZSBzaWduYXR1cmU6XHJcbiAgICpcclxuICAgKiBQcm9taXNlPE9iamVjdD4gZmV0Y2hlcihmaWxlUGF0aCA6IHN0cmluZywgaGFzaEluZm8gOiBPYmplY3QpO1xyXG4gICAqXHJcbiAgICogaGFzaEluZm8gaXMgYSB2YWx1ZSByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXHJcbiAgICogVGhlIHJldHVybiB2YWx1ZSBvZiBmZXRjaGVyIG11c3QgYmUgYW4gT2JqZWN0IHdpdGggdGhlIHByb3BlcnRpZXM6XHJcbiAgICpcclxuICAgKiBtaW1lVHlwZSAtIHRoZSBNSU1FIHR5cGUgb2YgdGhlIGRhdGEgdG8gc2F2ZVxyXG4gICAqIGNvZGUgKG9wdGlvbmFsKSAtIHRoZSBzb3VyY2UgY29kZSBhcyBhIHN0cmluZywgaWYgZmlsZSBpcyB0ZXh0XHJcbiAgICogYmluYXJ5RGF0YSAob3B0aW9uYWwpIC0gdGhlIGZpbGUgY29udGVudHMgYXMgYSBCdWZmZXIsIGlmIGZpbGUgaXMgYmluYXJ5XHJcbiAgICogZGVwZW5kZW50RmlsZXMgLSB0aGUgZGVwZW5kZW50IGZpbGVzIHJldHVybmVkIGJ5IHRoZSBjb21waWxlci5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge3N0cmluZ30gZmlsZVBhdGggIFRoZSBwYXRoIHRvIHRoZSBmaWxlLiBGaWxlQ2hhbmdlZENhY2hlIHdpbGwgbG9va1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwIHRoZSBoYXNoIGFuZCB1c2UgdGhhdCBhcyB0aGUga2V5IGluIHRoZSBjYWNoZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmZXRjaGVyICBBIG1ldGhvZCB3aGljaCBjb25mb3JtcyB0byB0aGUgZGVzY3JpcHRpb24gYWJvdmUuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtQcm9taXNlPE9iamVjdD59ICBBbiBPYmplY3Qgd2hpY2ggaGFzIHRoZSBzYW1lIGZpZWxkcyBhcyB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7QGxpbmsgZ2V0fSBtZXRob2QgcmV0dXJuIHJlc3VsdC5cclxuICAgKi9cclxuICBhc3luYyBnZXRPckZldGNoKGZpbGVQYXRoLCBmZXRjaGVyKSB7XHJcbiAgICBsZXQgY2FjaGVSZXN1bHQgPSBhd2FpdCB0aGlzLmdldChmaWxlUGF0aCk7XHJcbiAgICBsZXQgYW55RGVwZW5kZW5jaWVzQ2hhbmdlZCA9IGF3YWl0IHRoaXMuaGF2ZUFueURlcGVuZGVudEZpbGVzQ2hhbmdlZChjYWNoZVJlc3VsdCk7XHJcblxyXG4gICAgaWYgKChjYWNoZVJlc3VsdC5jb2RlIHx8IGNhY2hlUmVzdWx0LmJpbmFyeURhdGEpICYmICFhbnlEZXBlbmRlbmNpZXNDaGFuZ2VkKSB7XHJcbiAgICAgIHJldHVybiBjYWNoZVJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgZmV0Y2hlcihmaWxlUGF0aCwgY2FjaGVSZXN1bHQuaGFzaEluZm8pIHx8IHsgaGFzaEluZm86IGNhY2hlUmVzdWx0Lmhhc2hJbmZvIH07XHJcblxyXG4gICAgaWYgKHJlc3VsdC5taW1lVHlwZSAmJiAhY2FjaGVSZXN1bHQuaGFzaEluZm8uaXNJbk5vZGVNb2R1bGVzKSB7XHJcbiAgICAgIGQoYENhY2hlIG1pc3M6IHNhdmluZyBvdXQgaW5mbyBmb3IgJHtmaWxlUGF0aH1gKTtcclxuICAgICAgYXdhaXQgdGhpcy5zYXZlKGNhY2hlUmVzdWx0Lmhhc2hJbmZvLCByZXN1bHQuY29kZSB8fCByZXN1bHQuYmluYXJ5RGF0YSwgcmVzdWx0Lm1pbWVUeXBlLCByZXN1bHQuZGVwZW5kZW50RmlsZXMpO1xyXG5cclxuICAgICAgY29uc3QgbWFwID0gcmVzdWx0LnNvdXJjZU1hcHM7XHJcbiAgICAgIGlmIChtYXApIHtcclxuICAgICAgICBkKGBzb3VyY2UgbWFwIGZvciAke2ZpbGVQYXRofSBmb3VuZCwgc2F2aW5nIGl0IHRvICR7dGhpcy5nZXRTb3VyY2VNYXBQYXRoKCl9YCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlU291cmNlTWFwKGNhY2hlUmVzdWx0Lmhhc2hJbmZvLCBmaWxlUGF0aCwgbWFwKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlc3VsdC5oYXNoSW5mbyA9IGNhY2hlUmVzdWx0Lmhhc2hJbmZvO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwcml2YXRlIENoZWNrIGlmIGFueSBvZiBhIGZpbGUncyBkZXBlbmRlbmNpZXMgaGF2ZSBjaGFuZ2VkXHJcbiAgICovXHJcbiAgYXN5bmMgaGF2ZUFueURlcGVuZGVudEZpbGVzQ2hhbmdlZChjYWNoZVJlc3VsdCkge1xyXG4gICAgaWYgKCFjYWNoZVJlc3VsdC5jb2RlIHx8ICFjYWNoZVJlc3VsdC5kZXBlbmRlbnRGaWxlcy5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBmb3IgKGxldCBkZXBlbmRlbnRGaWxlIG9mIGNhY2hlUmVzdWx0LmRlcGVuZGVudEZpbGVzKSB7XHJcbiAgICAgIGxldCBoYXNGaWxlQ2hhbmdlZCA9IGF3YWl0IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmhhc0ZpbGVDaGFuZ2VkKGRlcGVuZGVudEZpbGUpO1xyXG4gICAgICBpZiAoaGFzRmlsZUNoYW5nZWQpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IGRlcGVuZGVudEZpbGVDYWNoZVJlc3VsdCA9IGF3YWl0IHRoaXMuZ2V0KGRlcGVuZGVudEZpbGUpO1xyXG4gICAgICBpZiAoZGVwZW5kZW50RmlsZUNhY2hlUmVzdWx0LmRlcGVuZGVudEZpbGVzICYmIGRlcGVuZGVudEZpbGVDYWNoZVJlc3VsdC5kZXBlbmRlbnRGaWxlcy5sZW5ndGgpIHtcclxuICAgICAgICBsZXQgYW55U3ViZGVwZW5kZW50RmlsZXNDaGFuZ2VkID0gYXdhaXQgdGhpcy5oYXZlQW55RGVwZW5kZW50RmlsZXNDaGFuZ2VkKGRlcGVuZGVudEZpbGVDYWNoZVJlc3VsdCk7XHJcbiAgICAgICAgaWYgKGFueVN1YmRlcGVuZGVudEZpbGVzQ2hhbmdlZCkgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuXHJcbiAgZ2V0U3luYyhmaWxlUGF0aCkge1xyXG4gICAgZChgRmV0Y2hpbmcgJHtmaWxlUGF0aH0gZnJvbSBjYWNoZWApO1xyXG4gICAgbGV0IGhhc2hJbmZvID0gdGhpcy5maWxlQ2hhbmdlQ2FjaGUuZ2V0SGFzaEZvclBhdGhTeW5jKHBhdGgucmVzb2x2ZShmaWxlUGF0aCkpO1xyXG5cclxuICAgIGxldCBjb2RlID0gbnVsbDtcclxuICAgIGxldCBtaW1lVHlwZSA9IG51bGw7XHJcbiAgICBsZXQgYmluYXJ5RGF0YSA9IG51bGw7XHJcbiAgICBsZXQgZGVwZW5kZW50RmlsZXMgPSBudWxsO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGxldCBjYWNoZUZpbGUgPSBwYXRoLmpvaW4odGhpcy5nZXRDYWNoZVBhdGgoKSwgaGFzaEluZm8uaGFzaCk7XHJcblxyXG4gICAgICBsZXQgcmVzdWx0ID0gbnVsbDtcclxuICAgICAgaWYgKGhhc2hJbmZvLmlzRmlsZUJpbmFyeSkge1xyXG4gICAgICAgIGQoXCJGaWxlIGlzIGJpbmFyeSwgcmVhZGluZyBvdXQgaW5mb1wiKTtcclxuICAgICAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNhY2hlRmlsZSArICcuaW5mbycpKTtcclxuICAgICAgICBtaW1lVHlwZSA9IGluZm8ubWltZVR5cGU7XHJcbiAgICAgICAgZGVwZW5kZW50RmlsZXMgPSBpbmZvLmRlcGVuZGVudEZpbGVzO1xyXG5cclxuICAgICAgICBiaW5hcnlEYXRhID0gaGFzaEluZm8uYmluYXJ5RGF0YTtcclxuICAgICAgICBpZiAoIWJpbmFyeURhdGEpIHtcclxuICAgICAgICAgIGJpbmFyeURhdGEgPSBmcy5yZWFkRmlsZVN5bmMoY2FjaGVGaWxlKTtcclxuICAgICAgICAgIGJpbmFyeURhdGEgPSB6bGliLmd1bnppcFN5bmMoYmluYXJ5RGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoY2FjaGVGaWxlKTtcclxuICAgICAgICBsZXQgc3RyID0gKHpsaWIuZ3VuemlwU3luYyhidWYpKS50b1N0cmluZygndXRmOCcpO1xyXG5cclxuICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHN0cik7XHJcbiAgICAgICAgY29kZSA9IHJlc3VsdC5jb2RlO1xyXG4gICAgICAgIG1pbWVUeXBlID0gcmVzdWx0Lm1pbWVUeXBlO1xyXG4gICAgICAgIGRlcGVuZGVudEZpbGVzID0gcmVzdWx0LmRlcGVuZGVudEZpbGVzO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGQoYEZhaWxlZCB0byByZWFkIGNhY2hlIGZvciAke2ZpbGVQYXRofWApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IGhhc2hJbmZvLCBjb2RlLCBtaW1lVHlwZSwgYmluYXJ5RGF0YSwgZGVwZW5kZW50RmlsZXMgfTtcclxuICB9XHJcblxyXG4gIHNhdmVTeW5jKGhhc2hJbmZvLCBjb2RlT3JCaW5hcnlEYXRhLCBtaW1lVHlwZSwgZGVwZW5kZW50RmlsZXMpIHtcclxuICAgIGxldCBidWYgPSBudWxsO1xyXG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbih0aGlzLmdldENhY2hlUGF0aCgpLCBoYXNoSW5mby5oYXNoKTtcclxuICAgIGQoYFNhdmluZyB0byAke3RhcmdldH1gKTtcclxuXHJcbiAgICBpZiAoaGFzaEluZm8uaXNGaWxlQmluYXJ5KSB7XHJcbiAgICAgIGJ1ZiA9IHpsaWIuZ3ppcFN5bmMoY29kZU9yQmluYXJ5RGF0YSk7XHJcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0ICsgJy5pbmZvJywgSlNPTi5zdHJpbmdpZnkoe21pbWVUeXBlLCBkZXBlbmRlbnRGaWxlc30pLCAndXRmOCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYnVmID0gemxpYi5nemlwU3luYyhuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KHtjb2RlOiBjb2RlT3JCaW5hcnlEYXRhLCBtaW1lVHlwZSwgZGVwZW5kZW50RmlsZXN9KSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0LCBidWYpO1xyXG4gIH1cclxuXHJcbiAgZ2V0T3JGZXRjaFN5bmMoZmlsZVBhdGgsIGZldGNoZXIpIHtcclxuICAgIGxldCBjYWNoZVJlc3VsdCA9IHRoaXMuZ2V0U3luYyhmaWxlUGF0aCk7XHJcbiAgICBpZiAoY2FjaGVSZXN1bHQuY29kZSB8fCBjYWNoZVJlc3VsdC5iaW5hcnlEYXRhKSByZXR1cm4gY2FjaGVSZXN1bHQ7XHJcblxyXG4gICAgbGV0IHJlc3VsdCA9IGZldGNoZXIoZmlsZVBhdGgsIGNhY2hlUmVzdWx0Lmhhc2hJbmZvKSB8fCB7IGhhc2hJbmZvOiBjYWNoZVJlc3VsdC5oYXNoSW5mbyB9O1xyXG5cclxuICAgIGlmIChyZXN1bHQubWltZVR5cGUgJiYgIWNhY2hlUmVzdWx0Lmhhc2hJbmZvLmlzSW5Ob2RlTW9kdWxlcykge1xyXG4gICAgICBkKGBDYWNoZSBtaXNzOiBzYXZpbmcgb3V0IGluZm8gZm9yICR7ZmlsZVBhdGh9YCk7XHJcbiAgICAgIHRoaXMuc2F2ZVN5bmMoY2FjaGVSZXN1bHQuaGFzaEluZm8sIHJlc3VsdC5jb2RlIHx8IHJlc3VsdC5iaW5hcnlEYXRhLCByZXN1bHQubWltZVR5cGUsIHJlc3VsdC5kZXBlbmRlbnRGaWxlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWFwID0gcmVzdWx0LnNvdXJjZU1hcHM7XHJcbiAgICBpZiAobWFwKSB7XHJcbiAgICAgIGQoYHNvdXJjZSBtYXAgZm9yICR7ZmlsZVBhdGh9IGZvdW5kLCBzYXZpbmcgaXQgdG8gJHt0aGlzLmdldFNvdXJjZU1hcFBhdGgoKX1gKTtcclxuICAgICAgdGhpcy5zYXZlU291cmNlTWFwU3luYyhjYWNoZVJlc3VsdC5oYXNoSW5mbywgZmlsZVBhdGgsIG1hcCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzdWx0Lmhhc2hJbmZvID0gY2FjaGVSZXN1bHQuaGFzaEluZm87XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgYnVpbGRTb3VyY2VNYXBUYXJnZXQoaGFzaEluZm8sIGZpbGVQYXRoKSB7XHJcbiAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xyXG4gICAgY29uc3QgbWFwRmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKHBhdGguZXh0bmFtZShmaWxlTmFtZSksICcuanMubWFwJyk7XHJcblxyXG4gICAgY29uc3QgdGFyZ2V0ID0gcGF0aC5qb2luKHRoaXMuZ2V0U291cmNlTWFwUGF0aCgpLCBtYXBGaWxlTmFtZSk7XHJcbiAgICBkKGBTb3VyY2VtYXAgdGFyZ2V0IGlzOiAke3RhcmdldH1gKTtcclxuXHJcbiAgICByZXR1cm4gdGFyZ2V0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2F2ZXMgc291cmNlbWFwIHN0cmluZyBpbnRvIGNhY2hlLCBvciBzcGVjaWZpZWQgc2VwYXJhdGUgZGlyXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGhhc2hJbmZvICBUaGUgaGFzaCBpbmZvcm1hdGlvbiByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGZpbGVQYXRoIFBhdGggdG8gb3JpZ2luYWwgZmlsZSB0byBjb25zdHJ1Y3Qgc291cmNlbWFwIGZpbGUgbmFtZVxyXG5cclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNvdXJjZU1hcCBTb3VyY2VtYXAgZGF0YSBhcyBzdHJpbmdcclxuICAgKlxyXG4gICAqIEBtZW1iZXJPZiBDb21waWxlQ2FjaGVcclxuICAgKi9cclxuICBhc3luYyBzYXZlU291cmNlTWFwKGhhc2hJbmZvLCBmaWxlUGF0aCwgc291cmNlTWFwKSB7XHJcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmJ1aWxkU291cmNlTWFwVGFyZ2V0KGhhc2hJbmZvLCBmaWxlUGF0aCk7XHJcbiAgICBhd2FpdCBwZnMud3JpdGVGaWxlKHRhcmdldCwgc291cmNlTWFwLCAndXRmLTgnKTtcclxuICB9XHJcblxyXG4gIHNhdmVTb3VyY2VNYXBTeW5jKGhhc2hJbmZvLCBmaWxlUGF0aCwgc291cmNlTWFwKSB7XHJcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmJ1aWxkU291cmNlTWFwVGFyZ2V0KGhhc2hJbmZvLCBmaWxlUGF0aCk7XHJcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldCwgc291cmNlTWFwLCAndXRmLTgnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgZ2V0Q2FjaGVQYXRoKCkge1xyXG4gICAgLy8gTkI6IFRoaXMgaXMgYW4gZXZpbCBoYWNrIHNvIHRoYXQgY3JlYXRlRnJvbUNvbXBpbGVyIGNhbiBzdG9tcCBpdFxyXG4gICAgLy8gYXQgd2lsbFxyXG4gICAgcmV0dXJuIHRoaXMuY2FjaGVQYXRoO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBnZXRTb3VyY2VNYXBQYXRoKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuc291cmNlTWFwUGF0aDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybnMgd2hldGhlciBhIGZpbGUgc2hvdWxkIG5vdCBiZSBjb21waWxlZC4gTm90ZSB0aGF0IHRoaXMgZG9lc24ndFxyXG4gICAqIG5lY2Vzc2FyaWx5IG1lYW4gaXQgd29uJ3QgZW5kIHVwIGluIHRoZSBjYWNoZSwgb25seSB0aGF0IGl0cyBjb250ZW50cyBhcmVcclxuICAgKiBzYXZlZCB2ZXJiYXRpbSBpbnN0ZWFkIG9mIHRyeWluZyB0byBmaW5kIGFuIGFwcHJvcHJpYXRlIGNvbXBpbGVyLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7T2JqZWN0fSBoYXNoSW5mbyAgVGhlIGhhc2ggaW5mb3JtYXRpb24gcmV0dXJuZWQgZnJvbSBnZXRIYXNoRm9yUGF0aFxyXG4gICAqXHJcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gIFRydWUgaWYgYSBmaWxlIHNob3VsZCBiZSBpZ25vcmVkXHJcbiAgICovXHJcbiAgc3RhdGljIHNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKSB7XHJcbiAgICByZXR1cm4gaGFzaEluZm8uaXNNaW5pZmllZCB8fCBoYXNoSW5mby5pc0luTm9kZU1vZHVsZXMgfHwgaGFzaEluZm8uaGFzU291cmNlTWFwIHx8IGhhc2hJbmZvLmlzRmlsZUJpbmFyeTtcclxuICB9XHJcbn1cclxuIl19